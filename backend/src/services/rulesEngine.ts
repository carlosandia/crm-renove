/**
 * Business Rules Engine - Core automation system
 * Handles rule evaluation, trigger processing, and action execution
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { getCache } from './cacheService';

// Types and Interfaces
export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  trigger: TriggerDefinition;
  conditions: ConditionGroup;
  actions: ActionDefinition[];
  priority: number;
  isActive: boolean;
  tenantId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: RuleMetadata;
}

export interface TriggerDefinition {
  type: 'event' | 'schedule' | 'condition';
  event?: string; // 'lead.created', 'lead.updated', 'deal.stage_changed'
  schedule?: string; // Cron expression
  condition?: ConditionExpression;
  entityType?: string; // 'lead', 'deal', 'contact'
}

export interface ConditionGroup {
  operator: 'AND' | 'OR';
  conditions: Condition[];
  groups?: ConditionGroup[];
}

export interface Condition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'is_null' | 'is_not_null';
  value: any;
  valueType: 'static' | 'dynamic' | 'field_reference';
}

export interface ActionDefinition {
  id: string;
  type: 'email' | 'task' | 'notification' | 'webhook' | 'update_field' | 'change_stage';
  parameters: Record<string, any>;
  delay?: number; // milliseconds
  retryCount?: number;
  retryDelay?: number;
}

export interface RuleMetadata {
  executionCount: number;
  successCount: number;
  failureCount: number;
  lastExecuted?: Date;
  averageExecutionTime: number;
  tags: string[];
}

export interface AutomationEvent {
  id: string;
  type: string;
  entityType: string;
  entityId: string;
  data: Record<string, any>;
  timestamp: Date;
  userId?: string;
  tenantId: string;
  changes?: Record<string, { old: any; new: any }>;
}

export interface RuleExecution {
  id: string;
  ruleId: string;
  eventId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  executionTime?: number;
  result?: any;
  error?: string;
  actionsExecuted: ActionExecution[];
}

export interface ActionExecution {
  id: string;
  actionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  retryCount: number;
}

export interface ConditionExpression {
  field: string;
  operator: string;
  value: any;
}

// Rule Engine Configuration
export interface RulesEngineConfig {
  maxConcurrentExecutions: number;
  defaultTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCaching: boolean;
  cacheTimeout: number;
  enableMetrics: boolean;
  enableAuditLog: boolean;
}

class RulesEngine extends EventEmitter {
  private config: RulesEngineConfig;
  private supabase: any;
  private activeExecutions: Map<string, RuleExecution> = new Map();
  private executionQueue: AutomationEvent[] = [];
  private isProcessing: boolean = false;
  private metrics: Map<string, any> = new Map();

  constructor(config: RulesEngineConfig) {
    super();
    this.config = config;
    this.supabase = createClient(
      process.env.SUPABASE_URL || 'https://marajvabdwkpgopytvhh.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU'
    );
    this.initializeEngine();
  }

  private async initializeEngine(): Promise<void> {
    try {
      // Initialize metrics
      this.metrics.set('totalExecutions', 0);
      this.metrics.set('successfulExecutions', 0);
      this.metrics.set('failedExecutions', 0);
      this.metrics.set('averageExecutionTime', 0);

      // Start processing queue
      this.startQueueProcessor();

      console.log('Rules Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Rules Engine:', error);
      throw error;
    }
  }

  /**
   * Process event through rules engine
   */
  async processEvent(event: any): Promise<void> {
    try {
      performanceService.recordMetric(Date.now()); // Record start time
      
      // Get rules that match this event
      const matchingRules = await this.getMatchingRules(event);
      
      // Process each matching rule
      for (const rule of matchingRules) {
        await this.executeRule(rule, event);
      }
      
      performanceService.recordMetric(Date.now()); // Record end time
    } catch (error) {
      console.error('Error processing event:', error);
      throw error;
    }
  }

  private async getMatchingRules(event: AutomationEvent): Promise<BusinessRule[]> {
    const cacheKey = `rules_for_event_${event.type}_${event.entityType}`;
    
    // Try cache first
    if (this.config.enableCaching) {
      const cache = getCache();
      const cachedRules = await cache.get<BusinessRule[]>(cacheKey);
      if (cachedRules) {
        return cachedRules.filter((rule: BusinessRule) => 
          rule.isActive && rule.tenantId === event.tenantId
        );
      }
    }

    try {
      const { data: rules, error } = await this.supabase
        .from('business_rules')
        .select('*')
        .eq('is_active', true)
        .eq('tenant_id', event.tenantId)
        .or(`trigger->event.eq.${event.type},trigger->event.eq.${event.entityType}.*`);

      if (error) throw error;

      // Filter rules that match the trigger
      const applicableRules = rules.filter((rule: any) => 
        this.isRuleApplicable(rule, event)
      );

      // Cache the results
      if (this.config.enableCaching) {
        const cache = getCache();
        await cache.set(cacheKey, applicableRules, { ttl: this.config.cacheTimeout });
      }

      return applicableRules;
    } catch (error) {
      console.error('Error fetching applicable rules:', error);
      return [];
    }
  }

  private isRuleApplicable(rule: BusinessRule, event: AutomationEvent): boolean {
    const trigger = rule.trigger;

    switch (trigger.type) {
      case 'event':
        return trigger.event === event.type || 
               trigger.event === `${event.entityType}.*` ||
               (trigger.entityType === event.entityType);
      
      case 'condition':
        return trigger.condition ? 
               this.evaluateCondition(trigger.condition, event.data) : false;
      
      case 'schedule':
        // Schedule-based rules are handled separately
        return false;
      
      default:
        return false;
    }
  }

  // Rule Execution
  private async executeRule(rule: BusinessRule, event: AutomationEvent): Promise<RuleExecution> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const execution: RuleExecution = {
      id: executionId,
      ruleId: rule.id,
      eventId: event.id,
      status: 'pending',
      startTime: new Date(),
      actionsExecuted: []
    };

    this.activeExecutions.set(executionId, execution);

    try {
      execution.status = 'running';
      
      // Evaluate conditions
      const conditionsMatch = await this.evaluateConditions(rule.conditions, event);
      
      if (!conditionsMatch) {
        execution.status = 'completed';
        execution.endTime = new Date();
        execution.executionTime = execution.endTime.getTime() - execution.startTime.getTime();
        return execution;
      }

      // Execute actions
      for (const action of rule.actions) {
        const actionExecution = await this.executeAction(action, event, rule);
        execution.actionsExecuted.push(actionExecution);
      }

      execution.status = 'completed';
      execution.endTime = new Date();
      execution.executionTime = execution.endTime.getTime() - execution.startTime.getTime();

      // Update rule metadata
      await this.updateRuleMetadata(rule.id, execution);

      // Log successful execution
      await this.logExecution(execution);

      this.emit('ruleExecuted', { rule, event, execution });

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.endTime = new Date();
      execution.executionTime = execution.endTime.getTime() - execution.startTime.getTime();

      console.error(`Rule execution failed for rule ${rule.id}:`, error);
      
      // Log failed execution
      await this.logExecution(execution);

      this.emit('ruleExecutionFailed', { rule, event, execution, error });
    } finally {
      this.activeExecutions.delete(executionId);
    }

    return execution;
  }

  // Condition Evaluation
  private async evaluateConditions(conditionGroup: ConditionGroup, event: AutomationEvent): Promise<boolean> {
    const results: boolean[] = [];

    // Evaluate individual conditions
    for (const condition of conditionGroup.conditions) {
      const result = await this.evaluateCondition(condition, event.data);
      results.push(result);
    }

    // Evaluate nested groups
    if (conditionGroup.groups) {
      for (const group of conditionGroup.groups) {
        const result = await this.evaluateConditions(group, event);
        results.push(result);
      }
    }

    // Apply logical operator
    if (conditionGroup.operator === 'AND') {
      return results.every(result => result);
    } else {
      return results.some(result => result);
    }
  }

  private evaluateCondition(condition: Condition | ConditionExpression, data: Record<string, any>): boolean {
    let fieldValue: any;
    let compareValue: any;

    // Handle both Condition and ConditionExpression interfaces
    if ('valueType' in condition) {
      // Full Condition interface
      fieldValue = this.getFieldValue(condition.field, data);
      compareValue = condition.valueType === 'field_reference' 
        ? this.getFieldValue(condition.value, data)
        : condition.value;
    } else {
      // Simple ConditionExpression interface
      fieldValue = this.getFieldValue(condition.field, data);
      compareValue = condition.value;
    }

    const operator = condition.operator;

    switch (operator) {
      case 'equals':
        return fieldValue === compareValue;
      case 'not_equals':
        return fieldValue !== compareValue;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(compareValue);
      case 'less_than':
        return Number(fieldValue) < Number(compareValue);
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue);
      case 'not_in':
        return Array.isArray(compareValue) && !compareValue.includes(fieldValue);
      case 'is_null':
        return fieldValue === null || fieldValue === undefined;
      case 'is_not_null':
        return fieldValue !== null && fieldValue !== undefined;
      default:
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  private getFieldValue(field: string, data: Record<string, any>): any {
    // Support nested field access with dot notation
    const fieldParts = field.split('.');
    let value = data;

    for (const part of fieldParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  // Action Execution
  private async executeAction(action: ActionDefinition, event: AutomationEvent, rule: BusinessRule): Promise<ActionExecution> {
    const actionExecution: ActionExecution = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      actionId: action.id,
      status: 'pending',
      startTime: new Date(),
      retryCount: 0
    };

    try {
      // Apply delay if specified
      if (action.delay && action.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, action.delay));
      }

      actionExecution.status = 'running';

      // Execute action based on type
      switch (action.type) {
        case 'email':
          actionExecution.result = await this.executeEmailAction(action, event);
          break;
        case 'task':
          actionExecution.result = await this.executeTaskAction(action, event);
          break;
        case 'notification':
          actionExecution.result = await this.executeNotificationAction(action, event);
          break;
        case 'webhook':
          actionExecution.result = await this.executeWebhookAction(action, event);
          break;
        case 'update_field':
          actionExecution.result = await this.executeUpdateFieldAction(action, event);
          break;
        case 'change_stage':
          actionExecution.result = await this.executeChangeStageAction(action, event);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      actionExecution.status = 'completed';
      actionExecution.endTime = new Date();

    } catch (error) {
      actionExecution.status = 'failed';
      actionExecution.error = error instanceof Error ? error.message : String(error);
      actionExecution.endTime = new Date();

      // Retry logic
      if (actionExecution.retryCount < (action.retryCount || this.config.retryAttempts)) {
        actionExecution.retryCount++;
        
        // Wait before retry
        if (action.retryDelay || this.config.retryDelay) {
          await new Promise(resolve => 
            setTimeout(resolve, action.retryDelay || this.config.retryDelay)
          );
        }

        // Retry the action
        return this.executeAction(action, event, rule);
      }

      console.error(`Action execution failed: ${action.type}`, error);
    }

    return actionExecution;
  }

  // Action Executors
  private async executeEmailAction(action: ActionDefinition, event: AutomationEvent): Promise<any> {
    // Email action implementation
    const { template, recipient, subject, variables } = action.parameters;
    
    // This would integrate with email service
    console.log(`Executing email action: ${template} to ${recipient}`);
    
    return {
      type: 'email',
      template,
      recipient,
      subject,
      sentAt: new Date(),
      status: 'sent'
    };
  }

  private async executeTaskAction(action: ActionDefinition, event: AutomationEvent): Promise<any> {
    // Task creation action
    const { title, description, assigneeId, dueDate, priority } = action.parameters;
    
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .insert({
          title,
          description,
          assignee_id: assigneeId,
          due_date: dueDate,
          priority: priority || 'medium',
          entity_type: event.entityType,
          entity_id: event.entityId,
          tenant_id: event.tenantId,
          created_by: 'system',
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        type: 'task',
        taskId: data.id,
        createdAt: new Date(),
        status: 'created'
      };
    } catch (error) {
      throw new Error(`Failed to create task: ${error}`);
    }
  }

  private async executeNotificationAction(action: ActionDefinition, event: AutomationEvent): Promise<any> {
    // Notification action
    const { type, title, message, userId, channel } = action.parameters;
    
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert({
          type,
          title,
          message,
          user_id: userId,
          channel: channel || 'system',
          entity_type: event.entityType,
          entity_id: event.entityId,
          tenant_id: event.tenantId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        type: 'notification',
        notificationId: data.id,
        createdAt: new Date(),
        status: 'created'
      };
    } catch (error) {
      throw new Error(`Failed to create notification: ${error}`);
    }
  }

  private async executeWebhookAction(action: ActionDefinition, event: AutomationEvent): Promise<any> {
    // Webhook action
    const { url, method, headers, payload } = action.parameters;
    
    try {
      const response = await fetch(url, {
        method: method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          event,
          payload
        })
      });

      const result = await response.json();

      return {
        type: 'webhook',
        url,
        status: response.status,
        response: result,
        executedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Webhook execution failed: ${error}`);
    }
  }

  private async executeUpdateFieldAction(action: ActionDefinition, event: AutomationEvent): Promise<any> {
    // Update field action
    const { field, value, table } = action.parameters;
    
    try {
      const tableName = table || this.getTableFromEntityType(event.entityType);
      
      const { data, error } = await this.supabase
        .from(tableName)
        .update({ [field]: value })
        .eq('id', event.entityId)
        .eq('tenant_id', event.tenantId)
        .select()
        .single();

      if (error) throw error;

      return {
        type: 'update_field',
        table: tableName,
        field,
        value,
        updatedAt: new Date(),
        status: 'updated'
      };
    } catch (error) {
      throw new Error(`Failed to update field: ${error}`);
    }
  }

  private async executeChangeStageAction(action: ActionDefinition, event: AutomationEvent): Promise<any> {
    // Change stage action (for deals/leads)
    const { stageId, reason } = action.parameters;
    
    try {
      const tableName = this.getTableFromEntityType(event.entityType);
      
      const { data, error } = await this.supabase
        .from(tableName)
        .update({ 
          stage_id: stageId,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.entityId)
        .eq('tenant_id', event.tenantId)
        .select()
        .single();

      if (error) throw error;

      // Log stage change
      await this.supabase
        .from('stage_changes')
        .insert({
          entity_type: event.entityType,
          entity_id: event.entityId,
          from_stage_id: event.data.stage_id,
          to_stage_id: stageId,
          reason: reason || 'Automated by rule',
          changed_by: 'system',
          tenant_id: event.tenantId
        });

      return {
        type: 'change_stage',
        fromStageId: event.data.stage_id,
        toStageId: stageId,
        reason,
        changedAt: new Date(),
        status: 'changed'
      };
    } catch (error) {
      throw new Error(`Failed to change stage: ${error}`);
    }
  }

  private getTableFromEntityType(entityType: string): string {
    const tableMap: Record<string, string> = {
      'lead': 'leads',
      'deal': 'deals',
      'contact': 'contacts',
      'company': 'companies',
      'task': 'tasks'
    };
    
    return tableMap[entityType] || entityType;
  }

  // Queue Processing
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.executionQueue.length === 0) {
        return;
      }

      if (this.activeExecutions.size >= this.config.maxConcurrentExecutions) {
        return;
      }

      this.isProcessing = true;

      try {
        const event = this.executionQueue.shift();
        if (event) {
          await this.processEvent(event);
        }
      } catch (error) {
        console.error('Error processing queued event:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Process queue every second
  }

  // Metrics and Logging
  private async updateMetrics(type: string, executionTime: number): Promise<void> {
    if (!this.config.enableMetrics) return;

    try {
      const currentTotal = this.metrics.get('totalExecutions') || 0;
      const currentSuccessful = this.metrics.get('successfulExecutions') || 0;
      const currentFailed = this.metrics.get('failedExecutions') || 0;
      const currentAvgTime = this.metrics.get('averageExecutionTime') || 0;

      this.metrics.set('totalExecutions', currentTotal + 1);
      
      if (type === 'event_processed') {
        this.metrics.set('successfulExecutions', currentSuccessful + 1);
      } else if (type === 'event_failed') {
        this.metrics.set('failedExecutions', currentFailed + 1);
      }

      // Calculate new average execution time
      const newAvgTime = ((currentAvgTime * currentTotal) + executionTime) / (currentTotal + 1);
      this.metrics.set('averageExecutionTime', newAvgTime);

    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }

  private async updateRuleMetadata(ruleId: string, execution: RuleExecution): Promise<void> {
    try {
      const { data: rule, error: fetchError } = await this.supabase
        .from('business_rules')
        .select('metadata')
        .eq('id', ruleId)
        .single();

      if (fetchError) throw fetchError;

      const metadata = rule.metadata || {
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        averageExecutionTime: 0,
        tags: []
      };

      metadata.executionCount++;
      metadata.lastExecuted = execution.endTime;

      if (execution.status === 'completed') {
        metadata.successCount++;
      } else if (execution.status === 'failed') {
        metadata.failureCount++;
      }

      // Update average execution time
      if (execution.executionTime) {
        metadata.averageExecutionTime = 
          ((metadata.averageExecutionTime * (metadata.executionCount - 1)) + execution.executionTime) / 
          metadata.executionCount;
      }

      const { error: updateError } = await this.supabase
        .from('business_rules')
        .update({ metadata })
        .eq('id', ruleId);

      if (updateError) throw updateError;

    } catch (error) {
      console.error(`Error updating rule metadata for rule ${ruleId}:`, error);
    }
  }

  private async logExecution(execution: RuleExecution): Promise<void> {
    if (!this.config.enableAuditLog) return;

    try {
      await this.supabase
        .from('rule_execution_log')
        .insert({
          execution_id: execution.id,
          rule_id: execution.ruleId,
          event_id: execution.eventId,
          status: execution.status,
          start_time: execution.startTime,
          end_time: execution.endTime,
          execution_time: execution.executionTime,
          result: execution.result,
          error: execution.error,
          actions_executed: execution.actionsExecuted
        });
    } catch (error) {
      console.error('Error logging execution:', error);
    }
  }

  // Public API
  public async createRule(rule: Omit<BusinessRule, 'id' | 'createdAt' | 'updatedAt' | 'metadata'>): Promise<BusinessRule> {
    try {
      const newRule = {
        ...rule,
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          executionCount: 0,
          successCount: 0,
          failureCount: 0,
          averageExecutionTime: 0,
          tags: []
        }
      };

      const { data, error } = await this.supabase
        .from('business_rules')
        .insert([newRule])
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      if (this.config.enableCaching) {
        const cache = getCache();
        await cache.deletePattern(`rules_for_event_*`);
      }

      return data;
    } catch (error) {
      console.error('Error creating rule:', error);
      throw error;
    }
  }

  public async updateRule(ruleId: string, updates: Partial<BusinessRule>): Promise<BusinessRule> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('business_rules')
        .update(updateData)
        .eq('id', ruleId)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      if (this.config.enableCaching) {
        const cache = getCache();
        await cache.deletePattern(`rules_for_event_*`);
      }

      return data;
    } catch (error) {
      console.error('Error updating rule:', error);
      throw error;
    }
  }

  public async deleteRule(ruleId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('business_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      // Invalidate cache
      if (this.config.enableCaching) {
        const cache = getCache();
        await cache.deletePattern(`rules_for_event_*`);
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      throw error;
    }
  }

  public async getRules(tenantId: string, filters?: any): Promise<BusinessRule[]> {
    try {
      let query = this.supabase
        .from('business_rules')
        .select('*')
        .eq('tenant_id', tenantId);

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.type) {
        query = query.contains('trigger', { type: filters.type });
      }

      const { data, error } = await query.order('priority', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      throw new Error(`Failed to fetch rules: ${error}`);
    }
  }

  public getMetrics(): Record<string, any> {
    return Object.fromEntries(this.metrics);
  }

  public getActiveExecutions(): RuleExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  public async testRule(rule: BusinessRule, testData: Record<string, any>): Promise<any> {
    const mockEvent: AutomationEvent = {
      id: `test_${Date.now()}`,
      type: 'test',
      entityType: 'test',
      entityId: 'test',
      data: testData,
      timestamp: new Date(),
      tenantId: rule.tenantId
    };

    // Test condition evaluation
    const conditionsMatch = await this.evaluateConditions(rule.conditions, mockEvent);
    
    return {
      conditionsMatch,
      testData,
      rule: {
        id: rule.id,
        name: rule.name,
        conditions: rule.conditions,
        actions: rule.actions
      }
    };
  }
}

// Export singleton instance
const defaultConfig: RulesEngineConfig = {
  maxConcurrentExecutions: 10,
  defaultTimeout: 30000,
  retryAttempts: 3,
  retryDelay: 5000,
  enableCaching: true,
  cacheTimeout: 300, // 5 minutes
  enableMetrics: true,
  enableAuditLog: true
};

export const rulesEngine = new RulesEngine(defaultConfig);
export default rulesEngine; 
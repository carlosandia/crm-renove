/**
 * Event Service - Captures and distributes system events
 * Integrates with Rules Engine for automation triggers
 */

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';
import { rulesEngine, AutomationEvent } from './rulesEngine';
import { performanceService } from './performanceService';

export interface EventDefinition {
  type: string;
  entityType: string;
  description: string;
  schema: Record<string, any>;
  isActive: boolean;
}

export interface EventSubscription {
  id: string;
  eventType: string;
  subscriberId: string;
  endpoint?: string;
  isActive: boolean;
  filters?: Record<string, any>;
}

export interface EventLog {
  id: string;
  eventId: string;
  type: string;
  entityType: string;
  entityId: string;
  data: Record<string, any>;
  timestamp: Date;
  userId?: string;
  tenantId: string;
  processed: boolean;
  processingTime?: number;
  error?: string;
}

class EventService extends EventEmitter {
  private supabase: any;
  private eventQueue: AutomationEvent[] = [];
  private isProcessing: boolean = false;
  private subscribers: Map<string, EventSubscription[]> = new Map();
  private eventDefinitions: Map<string, EventDefinition> = new Map();

  constructor() {
    super();
    this.supabase = createClient(
      process.env.SUPABASE_URL || 'https://marajvabdwkpgopytvhh.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU'
    );
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      // Load event definitions
      await this.loadEventDefinitions();
      
      // Load subscriptions
      await this.loadSubscriptions();
      
      // Start queue processor
      this.startQueueProcessor();
      
      console.log('Event Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Event Service:', error);
      throw error;
    }
  }

  private async loadEventDefinitions(): Promise<void> {
    try {
      const { data: definitions, error } = await this.supabase
        .from('event_definitions')
        .select('*')
        .eq('is_active', true);

      if (error && error.code !== 'PGRST116') { // Table doesn't exist
        throw error;
      }

      if (definitions) {
        definitions.forEach((def: any) => {
          this.eventDefinitions.set(def.type, def);
        });
      }

      // Register default event definitions if table doesn't exist
      if (!definitions || definitions.length === 0) {
        this.registerDefaultEventDefinitions();
      }
    } catch (error) {
      console.warn('Could not load event definitions, using defaults:', error);
      this.registerDefaultEventDefinitions();
    }
  }

  private registerDefaultEventDefinitions(): void {
    const defaultEvents: EventDefinition[] = [
      {
        type: 'lead.created',
        entityType: 'lead',
        description: 'New lead created',
        schema: {
          id: 'string',
          name: 'string',
          email: 'string',
          phone: 'string',
          source: 'string',
          temperature: 'string'
        },
        isActive: true
      },
      {
        type: 'lead.updated',
        entityType: 'lead',
        description: 'Lead information updated',
        schema: {
          id: 'string',
          changes: 'object'
        },
        isActive: true
      },
      {
        type: 'lead.stage_changed',
        entityType: 'lead',
        description: 'Lead moved to different stage',
        schema: {
          id: 'string',
          fromStageId: 'string',
          toStageId: 'string'
        },
        isActive: true
      },
      {
        type: 'deal.created',
        entityType: 'deal',
        description: 'New deal created',
        schema: {
          id: 'string',
          title: 'string',
          value: 'number',
          stageId: 'string'
        },
        isActive: true
      },
      {
        type: 'deal.stage_changed',
        entityType: 'deal',
        description: 'Deal moved to different stage',
        schema: {
          id: 'string',
          fromStageId: 'string',
          toStageId: 'string'
        },
        isActive: true
      },
      {
        type: 'deal.won',
        entityType: 'deal',
        description: 'Deal marked as won',
        schema: {
          id: 'string',
          value: 'number',
          wonDate: 'string'
        },
        isActive: true
      },
      {
        type: 'deal.lost',
        entityType: 'deal',
        description: 'Deal marked as lost',
        schema: {
          id: 'string',
          reason: 'string',
          lostDate: 'string'
        },
        isActive: true
      },
      {
        type: 'contact.created',
        entityType: 'contact',
        description: 'New contact created',
        schema: {
          id: 'string',
          name: 'string',
          email: 'string',
          company: 'string'
        },
        isActive: true
      },
      {
        type: 'task.created',
        entityType: 'task',
        description: 'New task created',
        schema: {
          id: 'string',
          title: 'string',
          assigneeId: 'string',
          dueDate: 'string'
        },
        isActive: true
      },
      {
        type: 'task.completed',
        entityType: 'task',
        description: 'Task marked as completed',
        schema: {
          id: 'string',
          completedDate: 'string',
          completedBy: 'string'
        },
        isActive: true
      },
      {
        type: 'task.overdue',
        entityType: 'task',
        description: 'Task is overdue',
        schema: {
          id: 'string',
          dueDate: 'string',
          daysOverdue: 'number'
        },
        isActive: true
      }
    ];

    defaultEvents.forEach(event => {
      this.eventDefinitions.set(event.type, event);
    });
  }

  private async loadSubscriptions(): Promise<void> {
    try {
      const { data: subscriptions, error } = await this.supabase
        .from('event_subscriptions')
        .select('*')
        .eq('is_active', true);

      if (error && error.code !== 'PGRST116') { // Table doesn't exist
        throw error;
      }

      if (subscriptions) {
        subscriptions.forEach((sub: any) => {
          const eventSubs = this.subscribers.get(sub.event_type) || [];
          eventSubs.push(sub);
          this.subscribers.set(sub.event_type, eventSubs);
        });
      }
    } catch (error) {
      console.warn('Could not load event subscriptions:', error);
    }
  }

  // Public API - Event Emission
  public async emitEvent(
    type: string,
    entityType: string,
    entityId: string,
    data: Record<string, any>,
    userId?: string,
    tenantId?: string
  ): Promise<string> {
    const startTime = Date.now();
    
    try {
      performanceService.recordMetric(startTime); // Record start time

      // Validate event type
      const eventDef = this.eventDefinitions.get(type);
      if (!eventDef) {
        console.warn(`Unknown event type: ${type}`);
      }

      // Create event
      const event: AutomationEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        entityType,
        entityId,
        data,
        timestamp: new Date(),
        userId,
        tenantId: tenantId || data.tenantId || data.tenant_id
      };

      // Log event
      await this.logEvent(event);

      // Add to processing queue
      this.eventQueue.push(event);

      // Emit to local listeners
      this.emit(type, event);
      this.emit('*', event);

      console.log(`Event emitted: ${type} for ${entityType}:${entityId}`);

      return event.id;
    } catch (error) {
      console.error(`Error emitting event ${type}:`, error);
      throw error;
    } finally {
      const endTime = Date.now();
      performanceService.recordMetric(endTime - startTime); // Record execution time
    }
  }

  // Specific event emitters for common use cases
  public async emitLeadCreated(lead: any, userId?: string): Promise<string> {
    return this.emitEvent(
      'lead.created',
      'lead',
      lead.id,
      {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        temperature: lead.temperature,
        stageId: lead.stage_id,
        assignedTo: lead.assigned_to,
        tenantId: lead.tenant_id
      },
      userId,
      lead.tenant_id
    );
  }

  public async emitLeadUpdated(
    leadId: string,
    changes: Record<string, { old: any; new: any }>,
    tenantId: string,
    userId?: string
  ): Promise<string> {
    return this.emitEvent(
      'lead.updated',
      'lead',
      leadId,
      {
        id: leadId,
        changes,
        tenantId
      },
      userId,
      tenantId
    );
  }

  public async emitLeadStageChanged(
    leadId: string,
    fromStageId: string,
    toStageId: string,
    tenantId: string,
    userId?: string
  ): Promise<string> {
    return this.emitEvent(
      'lead.stage_changed',
      'lead',
      leadId,
      {
        id: leadId,
        fromStageId,
        toStageId,
        tenantId
      },
      userId,
      tenantId
    );
  }

  public async emitDealCreated(deal: any, userId?: string): Promise<string> {
    return this.emitEvent(
      'deal.created',
      'deal',
      deal.id,
      {
        id: deal.id,
        title: deal.title,
        value: deal.value,
        stageId: deal.stage_id,
        assignedTo: deal.assigned_to,
        tenantId: deal.tenant_id
      },
      userId,
      deal.tenant_id
    );
  }

  public async emitDealStageChanged(
    dealId: string,
    fromStageId: string,
    toStageId: string,
    tenantId: string,
    userId?: string
  ): Promise<string> {
    return this.emitEvent(
      'deal.stage_changed',
      'deal',
      dealId,
      {
        id: dealId,
        fromStageId,
        toStageId,
        tenantId
      },
      userId,
      tenantId
    );
  }

  public async emitDealWon(deal: any, userId?: string): Promise<string> {
    return this.emitEvent(
      'deal.won',
      'deal',
      deal.id,
      {
        id: deal.id,
        value: deal.value,
        wonDate: new Date().toISOString(),
        tenantId: deal.tenant_id
      },
      userId,
      deal.tenant_id
    );
  }

  public async emitDealLost(deal: any, reason: string, userId?: string): Promise<string> {
    return this.emitEvent(
      'deal.lost',
      'deal',
      deal.id,
      {
        id: deal.id,
        reason,
        lostDate: new Date().toISOString(),
        tenantId: deal.tenant_id
      },
      userId,
      deal.tenant_id
    );
  }

  public async emitTaskCreated(task: any, userId?: string): Promise<string> {
    return this.emitEvent(
      'task.created',
      'task',
      task.id,
      {
        id: task.id,
        title: task.title,
        assigneeId: task.assignee_id,
        dueDate: task.due_date,
        priority: task.priority,
        tenantId: task.tenant_id
      },
      userId,
      task.tenant_id
    );
  }

  public async emitTaskCompleted(taskId: string, tenantId: string, userId?: string): Promise<string> {
    return this.emitEvent(
      'task.completed',
      'task',
      taskId,
      {
        id: taskId,
        completedDate: new Date().toISOString(),
        completedBy: userId,
        tenantId
      },
      userId,
      tenantId
    );
  }

  public async emitTaskOverdue(task: any): Promise<string> {
    const dueDate = new Date(task.due_date);
    const now = new Date();
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    return this.emitEvent(
      'task.overdue',
      'task',
      task.id,
      {
        id: task.id,
        dueDate: task.due_date,
        daysOverdue,
        tenantId: task.tenant_id
      },
      undefined,
      task.tenant_id
    );
  }

  // Queue Processing
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.eventQueue.length === 0) {
        return;
      }

      this.isProcessing = true;

      try {
        const event = this.eventQueue.shift();
        if (event) {
          await this.processEvent(event);
        }
      } catch (error) {
        console.error('Error processing event queue:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 100); // Process events every 100ms for near real-time processing
  }

  private async processEvent(event: AutomationEvent): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Process with Rules Engine
      await rulesEngine.processEvent(event);

      // Notify subscribers
      await this.notifySubscribers(event);

      // Update event log
      await this.updateEventLog(event.id, {
        processed: true,
        processingTime: Date.now() - startTime
      });

    } catch (error) {
      console.error(`Error processing event ${event.id}:`, error);
      
      // Update event log with error
      await this.updateEventLog(event.id, {
        processed: false,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async notifySubscribers(event: AutomationEvent): Promise<void> {
    const subscribers = this.subscribers.get(event.type) || [];
    
    for (const subscriber of subscribers) {
      try {
        if (subscriber.endpoint) {
          // HTTP webhook notification
          await fetch(subscriber.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Event-Type': event.type,
              'X-Event-Id': event.id
            },
            body: JSON.stringify(event)
          });
        }
      } catch (error) {
        console.error(`Error notifying subscriber ${subscriber.id}:`, error);
      }
    }
  }

  // Event Logging
  private async logEvent(event: AutomationEvent): Promise<void> {
    try {
      await this.supabase
        .from('event_log')
        .insert({
          event_id: event.id,
          type: event.type,
          entity_type: event.entityType,
          entity_id: event.entityId,
          data: event.data,
          timestamp: event.timestamp,
          user_id: event.userId,
          tenant_id: event.tenantId,
          processed: false
        });
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }

  private async updateEventLog(eventId: string, updates: Partial<EventLog>): Promise<void> {
    try {
      await this.supabase
        .from('event_log')
        .update(updates)
        .eq('event_id', eventId);
    } catch (error) {
      console.error('Error updating event log:', error);
    }
  }

  // Management API
  public async createEventDefinition(definition: Omit<EventDefinition, 'isActive'>): Promise<EventDefinition> {
    try {
      const newDefinition = { ...definition, isActive: true };
      
      const { data, error } = await this.supabase
        .from('event_definitions')
        .insert(newDefinition)
        .select()
        .single();

      if (error) throw error;

      this.eventDefinitions.set(definition.type, newDefinition);
      
      return data;
    } catch (error) {
      throw new Error(`Failed to create event definition: ${error}`);
    }
  }

  public async subscribe(
    eventType: string,
    subscriberId: string,
    endpoint?: string,
    filters?: Record<string, any>
  ): Promise<EventSubscription> {
    try {
      const subscription: EventSubscription = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventType,
        subscriberId,
        endpoint,
        isActive: true,
        filters
      };

      const { data, error } = await this.supabase
        .from('event_subscriptions')
        .insert({
          id: subscription.id,
          event_type: subscription.eventType,
          subscriber_id: subscription.subscriberId,
          endpoint: subscription.endpoint,
          is_active: subscription.isActive,
          filters: subscription.filters
        })
        .select()
        .single();

      if (error) throw error;

      // Update local cache
      const eventSubs = this.subscribers.get(eventType) || [];
      eventSubs.push(subscription);
      this.subscribers.set(eventType, eventSubs);

      return subscription;
    } catch (error) {
      throw new Error(`Failed to create subscription: ${error}`);
    }
  }

  public async unsubscribe(subscriptionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('event_subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;

      // Update local cache
      for (const [eventType, subs] of this.subscribers.entries()) {
        const filtered = subs.filter(sub => sub.id !== subscriptionId);
        this.subscribers.set(eventType, filtered);
      }
    } catch (error) {
      throw new Error(`Failed to unsubscribe: ${error}`);
    }
  }

  public getEventDefinitions(): EventDefinition[] {
    return Array.from(this.eventDefinitions.values());
  }

  public getSubscriptions(eventType?: string): EventSubscription[] {
    if (eventType) {
      return this.subscribers.get(eventType) || [];
    }
    
    const allSubs: EventSubscription[] = [];
    for (const subs of this.subscribers.values()) {
      allSubs.push(...subs);
    }
    return allSubs;
  }

  public async getEventLog(filters?: {
    eventType?: string;
    entityType?: string;
    entityId?: string;
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<EventLog[]> {
    try {
      let query = this.supabase
        .from('event_log')
        .select('*');

      if (filters?.eventType) {
        query = query.eq('type', filters.eventType);
      }

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      if (filters?.entityId) {
        query = query.eq('entity_id', filters.entityId);
      }

      if (filters?.tenantId) {
        query = query.eq('tenant_id', filters.tenantId);
      }

      if (filters?.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString());
      }

      query = query
        .order('timestamp', { ascending: false })
        .limit(filters?.limit || 100);

      const { data, error } = await query;

      if (error) throw error;

      return data;
    } catch (error) {
      throw new Error(`Failed to fetch event log: ${error}`);
    }
  }

  // Utility methods
  public async scheduleEvent(
    type: string,
    entityType: string,
    entityId: string,
    data: Record<string, any>,
    scheduleTime: Date,
    userId?: string,
    tenantId?: string
  ): Promise<string> {
    const delay = scheduleTime.getTime() - Date.now();
    
    if (delay <= 0) {
      // Emit immediately if schedule time is in the past
      return this.emitEvent(type, entityType, entityId, data, userId, tenantId);
    }

    // Schedule for future emission
    setTimeout(async () => {
      try {
        await this.emitEvent(type, entityType, entityId, data, userId, tenantId);
      } catch (error) {
        console.error(`Error emitting scheduled event ${type}:`, error);
      }
    }, delay);

    return `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getQueueSize(): number {
    return this.eventQueue.length;
  }

  public getMetrics(): Record<string, any> {
    return {
      queueSize: this.eventQueue.length,
      isProcessing: this.isProcessing,
      eventDefinitions: this.eventDefinitions.size,
      totalSubscriptions: Array.from(this.subscribers.values()).reduce((total, subs) => total + subs.length, 0)
    };
  }
}

// Export singleton instance
export const eventService = new EventService();
export default eventService; 
/**
 * Hook para gerenciar o sistema de automação
 */

import { useState, useEffect, useCallback } from 'react';

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'event' | 'schedule' | 'condition';
    event?: string;
    schedule?: string;
    entityType?: string;
  };
  conditions: {
    operator: 'AND' | 'OR';
    conditions: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };
  actions: Array<{
    id: string;
    type: 'email' | 'task' | 'notification' | 'webhook' | 'update_field' | 'change_stage';
    parameters: Record<string, any>;
  }>;
  priority: number;
  isActive: boolean;
  tenantId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metadata: {
    executionCount: number;
    successCount: number;
    failureCount: number;
    averageExecutionTime: number;
    tags: string[];
  };
}

export interface AutomationMetrics {
  rules: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  };
  events: {
    queueSize: number;
    isProcessing: boolean;
    eventDefinitions: number;
    totalSubscriptions: number;
  };
  activeExecutions: {
    count: number;
    executions: any[];
  };
  performance: {
    timestamp: string;
    uptime: number;
  };
}

export interface EventDefinition {
  type: string;
  entityType: string;
  description: string;
  schema: Record<string, any>;
  isActive: boolean;
}

export interface EventLog {
  id: string;
  eventId: string;
  type: string;
  entityType: string;
  entityId: string;
  data: Record<string, any>;
  timestamp: string;
  userId?: string;
  tenantId: string;
  processed: boolean;
  processingTime?: number;
  error?: string;
}

/**
 * ✅ CATEGORIA 5.2: Tipo para retorno da função testRule
 */
export interface TestRuleResult {
  success: boolean;
  ruleId: string;
  testData: Record<string, any>;
  
  // Resultados da execução do teste
  conditionsResult: {
    passed: boolean;
    evaluations: Array<{
      field: string;
      operator: string;
      expected: any;
      actual: any;
      passed: boolean;
    }>;
  };
  
  // Ações que seriam executadas
  actionsToExecute: Array<{
    id: string;
    type: 'email' | 'task' | 'notification' | 'webhook' | 'update_field' | 'change_stage';
    parameters: Record<string, any>;
    wouldExecute: boolean;
    simulatedResult?: any;
  }>;
  
  // Métricas de execução
  executionMetrics: {
    executionTime: number;
    conditionsEvaluationTime: number;
    actionsSimulationTime: number;
  };
  
  // Logs de depuração
  debugLogs: Array<{
    timestamp: string;
    level: 'info' | 'warning' | 'error';
    message: string;
    context?: Record<string, any>;
  }>;
  
  // Recomendações de otimização
  recommendations?: string[];
}

interface UseAutomationReturn {
  // Rules
  rules: BusinessRule[];
  loadingRules: boolean;
  errorRules: string | null;
  
  // Metrics
  metrics: AutomationMetrics | null;
  loadingMetrics: boolean;
  
  // Event Definitions
  eventDefinitions: EventDefinition[];
  loadingEvents: boolean;
  
  // Event Log
  eventLog: EventLog[];
  loadingEventLog: boolean;
  
  // Actions
  createRule: (rule: Omit<BusinessRule, 'id' | 'createdAt' | 'updatedAt' | 'metadata'>) => Promise<BusinessRule>;
  updateRule: (ruleId: string, updates: Partial<BusinessRule>) => Promise<BusinessRule>;
  deleteRule: (ruleId: string) => Promise<void>;
  testRule: (ruleId: string, testData: Record<string, any>) => Promise<TestRuleResult>;
  toggleRuleStatus: (ruleId: string, isActive: boolean) => Promise<void>;
  
  emitEvent: (type: string, entityType: string, entityId: string, data: Record<string, any>) => Promise<string>;
  loadRules: () => Promise<void>;
  loadMetrics: () => Promise<void>;
  loadEventDefinitions: () => Promise<void>;
  loadEventLog: (filters?: any) => Promise<void>;
}

export const useAutomation = (): UseAutomationReturn => {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [errorRules, setErrorRules] = useState<string | null>(null);
  
  const [metrics, setMetrics] = useState<AutomationMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  
  const [eventDefinitions, setEventDefinitions] = useState<EventDefinition[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  const [eventLog, setEventLog] = useState<EventLog[]>([]);
  const [loadingEventLog, setLoadingEventLog] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const handleApiError = (error: any, operation: string) => {
    console.error(`Error in ${operation}:`, error);
    const message = error instanceof Error ? error.message : `Failed to ${operation}`;
    setErrorRules(message);
    throw error;
  };

  // Load Rules
  const loadRules = useCallback(async () => {
    try {
      setLoadingRules(true);
      setErrorRules(null);
      
      const response = await fetch('http://127.0.0.1:3001/api/automation/rules', {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load rules`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load rules');
      }

      setRules(data.data || []);
    } catch (error) {
      handleApiError(error, 'load rules');
    } finally {
      setLoadingRules(false);
    }
  }, []);

  // Load Metrics
  const loadMetrics = useCallback(async () => {
    try {
      setLoadingMetrics(true);
      
      const response = await fetch('http://127.0.0.1:3001/api/automation/metrics', {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load metrics`);
      }

      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // Load Event Definitions
  const loadEventDefinitions = useCallback(async () => {
    try {
      setLoadingEvents(true);
      
      const response = await fetch('http://127.0.0.1:3001/api/automation/events/definitions', {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load event definitions`);
      }

      const data = await response.json();
      
      if (data.success) {
        setEventDefinitions(data.data || []);
      }
    } catch (error) {
      console.error('Error loading event definitions:', error);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  // Load Event Log
  const loadEventLog = useCallback(async (filters?: any) => {
    try {
      setLoadingEventLog(true);
      
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }
      
      const response = await fetch(`http://127.0.0.1:3001/api/automation/events/log?${queryParams}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load event log`);
      }

      const data = await response.json();
      
      if (data.success) {
        setEventLog(data.data || []);
      }
    } catch (error) {
      console.error('Error loading event log:', error);
    } finally {
      setLoadingEventLog(false);
    }
  }, []);

  // Create Rule
  const createRule = useCallback(async (rule: Omit<BusinessRule, 'id' | 'createdAt' | 'updatedAt' | 'metadata'>): Promise<BusinessRule> => {
    try {
      const response = await fetch('http://127.0.0.1:3001/api/automation/rules', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(rule)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to create rule`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create rule');
      }

      await loadRules();
      return data.data;
    } catch (error) {
      handleApiError(error, 'create rule');
      throw error;
    }
  }, [loadRules]);

  // Update Rule
  const updateRule = useCallback(async (ruleId: string, updates: Partial<BusinessRule>): Promise<BusinessRule> => {
    try {
      const response = await fetch(`http://127.0.0.1:3001/api/automation/rules/${ruleId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to update rule`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update rule');
      }

      await loadRules();
      return data.data;
    } catch (error) {
      handleApiError(error, 'update rule');
      throw error;
    }
  }, [loadRules]);

  // Delete Rule
  const deleteRule = useCallback(async (ruleId: string): Promise<void> => {
    try {
      const response = await fetch(`http://127.0.0.1:3001/api/automation/rules/${ruleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to delete rule`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete rule');
      }

      await loadRules();
    } catch (error) {
      handleApiError(error, 'delete rule');
    }
  }, [loadRules]);

  // Test Rule
  const testRule = useCallback(async (ruleId: string, testData: Record<string, any>): Promise<TestRuleResult> => {
    try {
      const response = await fetch(`http://127.0.0.1:3001/api/automation/rules/${ruleId}/test`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ testData })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to test rule`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to test rule');
      }

      return data.data;
    } catch (error) {
      handleApiError(error, 'test rule');
      // AIDEV-NOTE: Garantir retorno em caso de erro para satisfazer Promise<TestRuleResult>
      throw error; // Re-throw para manter comportamento de erro
    }
  }, []);

  // Toggle Rule Status
  const toggleRuleStatus = useCallback(async (ruleId: string, isActive: boolean): Promise<void> => {
    try {
      await updateRule(ruleId, { isActive: !isActive });
    } catch (error) {
      handleApiError(error, 'toggle rule status');
    }
  }, [updateRule]);

  // Emit Event
  const emitEvent = useCallback(async (
    type: string, 
    entityType: string, 
    entityId: string, 
    data: Record<string, any>
  ): Promise<string> => {
    try {
      const response = await fetch('http://127.0.0.1:3001/api/automation/events', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type,
          entityType,
          entityId,
          data
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to emit event`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to emit event');
      }

      return result.data.eventId;
    } catch (error) {
      handleApiError(error, 'emit event');
      throw error;
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadRules();
    loadEventDefinitions();
  }, [loadRules, loadEventDefinitions]);

  // Auto-refresh metrics
  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadMetrics]);

  return {
    // Rules
    rules,
    loadingRules,
    errorRules,
    
    // Metrics
    metrics,
    loadingMetrics,
    
    // Event Definitions
    eventDefinitions,
    loadingEvents,
    
    // Event Log
    eventLog,
    loadingEventLog,
    
    // Actions
    createRule,
    updateRule,
    deleteRule,
    testRule,
    toggleRuleStatus,
    emitEvent,
    loadRules,
    loadMetrics,
    loadEventDefinitions,
    loadEventLog
  };
}; 
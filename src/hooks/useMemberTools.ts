import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface MemberTask {
  id: string;
  tenant_id: string;
  member_id: string;
  lead_id?: string;
  task_type: 'follow_up' | 'call' | 'email' | 'meeting' | 'demo' | 'proposal' | 'contract' | 'other';
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string;
  estimated_duration?: number;
  actual_duration?: number;
  completion_notes?: string;
  task_data?: any;
  recurring_config?: any;
  parent_task_id?: string;
  automation_triggered: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CalendarIntegration {
  id: string;
  tenant_id: string;
  user_id: string;
  provider: 'google' | 'outlook' | 'apple';
  provider_user_id: string;
  provider_email: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  calendar_id: string;
  calendar_name: string;
  sync_enabled: boolean;
  sync_direction: 'import' | 'export' | 'bidirectional';
  last_sync_at?: string;
  integration_metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  tenant_id: string;
  template_name: string;
  template_type: 'follow_up' | 'welcome' | 'proposal' | 'contract' | 'thank_you' | 'reminder' | 'custom';
  subject: string;
  html_content: string;
  text_content?: string;
  template_variables: string[];
  is_active: boolean;
  usage_count: number;
  template_metadata?: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppIntegration {
  id: string;
  tenant_id: string;
  business_account_id: string;
  phone_number_id: string;
  phone_number: string;
  display_name: string;
  access_token: string;
  webhook_verify_token: string;
  webhook_url?: string;
  is_active: boolean;
  integration_metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface MemberPerformance {
  id: string;
  tenant_id: string;
  member_id: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  tasks_completed: number;
  tasks_overdue: number;
  avg_completion_time: number;
  productivity_score: number;
  quality_score: number;
  total_activities: number;
  leads_contacted: number;
  meetings_scheduled: number;
  deals_advanced: number;
  revenue_influenced: number;
  performance_grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  performance_metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface MemberDashboardConfig {
  id: string;
  tenant_id: string;
  member_id: string;
  layout_config: any;
  widget_preferences: any;
  theme: 'light' | 'dark' | 'auto';
  timezone: string;
  date_format: string;
  notification_settings: any;
  auto_refresh_enabled: boolean;
  refresh_interval: number;
  config_metadata: any;
  created_at: string;
  updated_at: string;
}

export interface TaskSummary {
  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  urgent_tasks: number;
  today_tasks: number;
  this_week_tasks: number;
}

interface UseMemberToolsResult {
  // Data
  tasks: MemberTask[];
  taskSummary: TaskSummary | null;
  calendarIntegrations: CalendarIntegration[];
  emailTemplates: EmailTemplate[];
  whatsappIntegrations: WhatsAppIntegration[];
  memberPerformance: MemberPerformance | null;
  dashboardConfig: MemberDashboardConfig | null;
  
  // States
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refreshData: () => Promise<void>;
  
  // Task Management
  createTask: (task: Omit<MemberTask, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateTask: (taskId: string, updates: Partial<MemberTask>) => Promise<boolean>;
  completeTask: (taskId: string, completionNotes?: string) => Promise<boolean>;
  
  // Calendar Integration
  createCalendarIntegration: (integration: Omit<CalendarIntegration, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  syncCalendarEvent: (integrationId: string, eventData: any) => Promise<boolean>;
  
  // Email Templates
  createEmailTemplate: (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>) => Promise<boolean>;
  updateEmailTemplate: (templateId: string, updates: Partial<EmailTemplate>) => Promise<boolean>;
  sendEmail: (templateId: string, recipientEmail: string, variables: Record<string, string>) => Promise<boolean>;
  
  // WhatsApp Integration
  createWhatsAppIntegration: (integration: Omit<WhatsAppIntegration, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  
  // Performance
  calculatePerformance: (periodStart: string, periodEnd: string, periodType: string) => Promise<boolean>;
  
  // Dashboard Configuration
  updateDashboardConfig: (config: Partial<MemberDashboardConfig>) => Promise<boolean>;
  
  // Activity Recording
  recordActivity: (activityData: any) => Promise<boolean>;
}

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export function useMemberTools(): UseMemberToolsResult {
  const { user } = useAuth();
  
  // States
  const [tasks, setTasks] = useState<MemberTask[]>([]);
  const [taskSummary, setTaskSummary] = useState<TaskSummary | null>(null);
  const [calendarIntegrations, setCalendarIntegrations] = useState<CalendarIntegration[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [whatsappIntegrations, setWhatsappIntegrations] = useState<WhatsAppIntegration[]>([]);
  const [memberPerformance, setMemberPerformance] = useState<MemberPerformance | null>(null);
  const [dashboardConfig, setDashboardConfig] = useState<MemberDashboardConfig | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get auth headers
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }, []);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/tasks`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setTasks(result.data || []);
      } else {
        throw new Error(result.error || 'Erro ao buscar tarefas');
      }

    } catch (err) {
      console.error('Erro ao buscar tarefas:', err);
    }
  }, [getAuthHeaders]);

  // Fetch task summary
  const fetchTaskSummary = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/tasks/summary`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setTaskSummary(result.data || null);
      } else {
        throw new Error(result.error || 'Erro ao buscar resumo de tarefas');
      }

    } catch (err) {
      console.error('Erro ao buscar resumo:', err);
    }
  }, [getAuthHeaders]);

  // Fetch calendar integrations
  const fetchCalendarIntegrations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/calendar/integrations`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setCalendarIntegrations(result.data || []);
      } else {
        throw new Error(result.error || 'Erro ao buscar integrações de calendário');
      }

    } catch (err) {
      console.error('Erro ao buscar integrações:', err);
    }
  }, [getAuthHeaders]);

  // Fetch email templates
  const fetchEmailTemplates = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/email/templates`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setEmailTemplates(result.data || []);
      } else {
        throw new Error(result.error || 'Erro ao buscar templates de email');
      }

    } catch (err) {
      console.error('Erro ao buscar templates:', err);
    }
  }, [getAuthHeaders]);

  // Fetch WhatsApp integrations
  const fetchWhatsAppIntegrations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/whatsapp/integrations`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setWhatsappIntegrations(result.data || []);
      } else {
        throw new Error(result.error || 'Erro ao buscar integrações WhatsApp');
      }

    } catch (err) {
      console.error('Erro ao buscar WhatsApp:', err);
    }
  }, [getAuthHeaders]);

  // Fetch member performance
  const fetchMemberPerformance = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/performance`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setMemberPerformance(result.data || null);
      } else {
        throw new Error(result.error || 'Erro ao buscar performance');
      }

    } catch (err) {
      console.error('Erro ao buscar performance:', err);
    }
  }, [getAuthHeaders]);

  // Fetch dashboard config
  const fetchDashboardConfig = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/dashboard/config`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setDashboardConfig(result.data || null);
      } else {
        throw new Error(result.error || 'Erro ao buscar configuração do dashboard');
      }

    } catch (err) {
      console.error('Erro ao buscar configuração:', err);
    }
  }, [getAuthHeaders]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchTasks(),
        fetchTaskSummary(),
        fetchCalendarIntegrations(),
        fetchEmailTemplates(),
        fetchWhatsAppIntegrations(),
        fetchMemberPerformance(),
        fetchDashboardConfig()
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    fetchTasks,
    fetchTaskSummary,
    fetchCalendarIntegrations,
    fetchEmailTemplates,
    fetchWhatsAppIntegrations,
    fetchMemberPerformance,
    fetchDashboardConfig
  ]);

  // Create task
  const createTask = useCallback(async (task: Omit<MemberTask, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(task),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        await fetchTasks();
        await fetchTaskSummary();
        return true;
      } else {
        throw new Error(result.error || 'Erro ao criar tarefa');
      }

    } catch (err) {
      console.error('Erro ao criar tarefa:', err);
      return false;
    }
  }, [getAuthHeaders, fetchTasks, fetchTaskSummary]);

  // Update task
  const updateTask = useCallback(async (taskId: string, updates: Partial<MemberTask>): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/tasks/${taskId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        await fetchTasks();
        await fetchTaskSummary();
        return true;
      } else {
        throw new Error(result.error || 'Erro ao atualizar tarefa');
      }

    } catch (err) {
      console.error('Erro ao atualizar tarefa:', err);
      return false;
    }
  }, [getAuthHeaders, fetchTasks, fetchTaskSummary]);

  // Complete task
  const completeTask = useCallback(async (taskId: string, completionNotes?: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ completion_notes: completionNotes }),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        await fetchTasks();
        await fetchTaskSummary();
        return true;
      } else {
        throw new Error(result.error || 'Erro ao completar tarefa');
      }

    } catch (err) {
      console.error('Erro ao completar tarefa:', err);
      return false;
    }
  }, [getAuthHeaders, fetchTasks, fetchTaskSummary]);

  // Create calendar integration
  const createCalendarIntegration = useCallback(async (integration: Omit<CalendarIntegration, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/calendar/integrations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(integration),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        await fetchCalendarIntegrations();
        return true;
      } else {
        throw new Error(result.error || 'Erro ao criar integração de calendário');
      }

    } catch (err) {
      console.error('Erro ao criar integração:', err);
      return false;
    }
  }, [getAuthHeaders, fetchCalendarIntegrations]);

  // Sync calendar event
  const syncCalendarEvent = useCallback(async (integrationId: string, eventData: any): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/calendar/integrations/${integrationId}/sync-event`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return true;
      } else {
        throw new Error(result.error || 'Erro ao sincronizar evento');
      }

    } catch (err) {
      console.error('Erro ao sincronizar evento:', err);
      return false;
    }
  }, [getAuthHeaders]);

  // Create email template
  const createEmailTemplate = useCallback(async (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/email/templates`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        await fetchEmailTemplates();
        return true;
      } else {
        throw new Error(result.error || 'Erro ao criar template de email');
      }

    } catch (err) {
      console.error('Erro ao criar template:', err);
      return false;
    }
  }, [getAuthHeaders, fetchEmailTemplates]);

  // Update email template
  const updateEmailTemplate = useCallback(async (templateId: string, updates: Partial<EmailTemplate>): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/email/templates/${templateId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        await fetchEmailTemplates();
        return true;
      } else {
        throw new Error(result.error || 'Erro ao atualizar template');
      }

    } catch (err) {
      console.error('Erro ao atualizar template:', err);
      return false;
    }
  }, [getAuthHeaders, fetchEmailTemplates]);

  // Send email
  const sendEmail = useCallback(async (templateId: string, recipientEmail: string, variables: Record<string, string>): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/email/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          template_id: templateId,
          recipient_email: recipientEmail,
          template_variables: variables
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return true;
      } else {
        throw new Error(result.error || 'Erro ao enviar email');
      }

    } catch (err) {
      console.error('Erro ao enviar email:', err);
      return false;
    }
  }, [getAuthHeaders]);

  // Create WhatsApp integration
  const createWhatsAppIntegration = useCallback(async (integration: Omit<WhatsAppIntegration, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/whatsapp/integrations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(integration),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        await fetchWhatsAppIntegrations();
        return true;
      } else {
        throw new Error(result.error || 'Erro ao criar integração WhatsApp');
      }

    } catch (err) {
      console.error('Erro ao criar integração WhatsApp:', err);
      return false;
    }
  }, [getAuthHeaders, fetchWhatsAppIntegrations]);

  // Calculate performance
  const calculatePerformance = useCallback(async (periodStart: string, periodEnd: string, periodType: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/performance/${user?.id}/calculate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          period_start: periodStart,
          period_end: periodEnd,
          period_type: periodType
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        await fetchMemberPerformance();
        return true;
      } else {
        throw new Error(result.error || 'Erro ao calcular performance');
      }

    } catch (err) {
      console.error('Erro ao calcular performance:', err);
      return false;
    }
  }, [getAuthHeaders, fetchMemberPerformance, user?.id]);

  // Update dashboard config
  const updateDashboardConfig = useCallback(async (config: Partial<MemberDashboardConfig>): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/dashboard/config`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        await fetchDashboardConfig();
        return true;
      } else {
        throw new Error(result.error || 'Erro ao atualizar configuração');
      }

    } catch (err) {
      console.error('Erro ao atualizar configuração:', err);
      return false;
    }
  }, [getAuthHeaders, fetchDashboardConfig]);

  // Record activity
  const recordActivity = useCallback(async (activityData: any): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/member-tools/activity/record`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(activityData),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return true;
      } else {
        throw new Error(result.error || 'Erro ao registrar atividade');
      }

    } catch (err) {
      console.error('Erro ao registrar atividade:', err);
      return false;
    }
  }, [getAuthHeaders]);

  // Initial load
  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user, refreshData]);

  return {
    // Data
    tasks,
    taskSummary,
    calendarIntegrations,
    emailTemplates,
    whatsappIntegrations,
    memberPerformance,
    dashboardConfig,
    
    // States
    isLoading,
    error,
    
    // Actions
    refreshData,
    
    // Task Management
    createTask,
    updateTask,
    completeTask,
    
    // Calendar Integration
    createCalendarIntegration,
    syncCalendarEvent,
    
    // Email Templates
    createEmailTemplate,
    updateEmailTemplate,
    sendEmail,
    
    // WhatsApp Integration
    createWhatsAppIntegration,
    
    // Performance
    calculatePerformance,
    
    // Dashboard Configuration
    updateDashboardConfig,
    
    // Activity Recording
    recordActivity,
  };
} 
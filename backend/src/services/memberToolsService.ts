import { supabase } from '../config/supabase';
import { getCache } from './cacheService';
import { logger } from '../utils/logger';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface MemberTask {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  task_type: 'follow_up' | 'call' | 'email' | 'meeting' | 'custom';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  assigned_to: string;
  assigned_by?: string;
  lead_id?: string;
  pipeline_id?: string;
  due_date?: string;
  scheduled_for?: string;
  estimated_duration?: number;
  completed_at?: string;
  completion_notes?: string;
  is_automated: boolean;
  automation_rule_id?: string;
  auto_created_from?: string;
  is_recurring: boolean;
  recurrence_pattern?: any;
  parent_task_id?: string;
  tags: string[];
  custom_fields: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CalendarIntegration {
  id: string;
  tenant_id: string;
  user_id: string;
  provider: 'google' | 'outlook' | 'apple';
  provider_user_id: string;
  calendar_id?: string;
  calendar_name?: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  sync_enabled: boolean;
  sync_direction: 'read_only' | 'write_only' | 'bidirectional';
  last_sync_at?: string;
  sync_status: 'active' | 'error' | 'disconnected';
  sync_error_message?: string;
  default_calendar: boolean;
  auto_create_tasks: boolean;
  notification_preferences: any;
  integration_metadata: any;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  category?: string;
  subject: string;
  body_html: string;
  body_text?: string;
  available_variables: any[];
  is_active: boolean;
  is_system_template: boolean;
  usage_count: number;
  personalization_enabled: boolean;
  auto_personalization: any;
  created_by?: string;
  shared_with_team: boolean;
  allowed_roles: string[];
  tags: string[];
  template_metadata: any;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
}

export interface WhatsAppIntegration {
  id: string;
  tenant_id: string;
  business_account_id: string;
  phone_number_id: string;
  phone_number: string;
  display_name?: string;
  access_token: string;
  webhook_verify_token: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  account_status: 'active' | 'suspended' | 'disabled';
  messaging_limit: 'tier_1' | 'tier_2' | 'tier_3' | 'unlimited';
  templates_approved: number;
  templates_pending: number;
  templates_rejected: number;
  webhook_url?: string;
  webhook_events: string[];
  auto_reply_enabled: boolean;
  auto_reply_message?: string;
  business_hours?: any;
  integration_metadata: any;
  created_at: string;
  updated_at: string;
  last_sync_at?: string;
}

export interface MemberPerformanceSnapshot {
  id: string;
  tenant_id: string;
  member_id: string;
  snapshot_date: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  period_start: string;
  period_end: string;
  tasks_assigned: number;
  tasks_completed: number;
  tasks_overdue: number;
  avg_task_completion_time?: string;
  leads_assigned: number;
  leads_contacted: number;
  leads_converted: number;
  conversion_rate: number;
  emails_sent: number;
  calls_made: number;
  whatsapp_messages: number;
  meetings_scheduled: number;
  login_days: number;
  active_hours: number;
  pipeline_actions: number;
  productivity_score: number;
  quality_score: number;
  engagement_score: number;
  overall_score: number;
  team_rank?: number;
  team_size?: number;
  percentile?: number;
  monthly_target?: number;
  target_achievement: number;
  calculation_metadata: any;
  created_at: string;
  calculated_at: string;
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

// =====================================================
// MEMBER TOOLS SERVICE CLASS
// =====================================================

export class MemberToolsService {
  private static instance: MemberToolsService;
  private readonly CACHE_TTL = {
    TASKS: 300, // 5 minutes
    PERFORMANCE: 900, // 15 minutes
    TEMPLATES: 1800, // 30 minutes
    DASHBOARD: 600, // 10 minutes
  };

  public static getInstance(): MemberToolsService {
    if (!MemberToolsService.instance) {
      MemberToolsService.instance = new MemberToolsService();
    }
    return MemberToolsService.instance;
  }

  // =====================================================
  // TASK MANAGEMENT METHODS
  // =====================================================

  async getMemberTasks(
    tenantId: string,
    memberId: string,
    filters?: {
      status?: string[];
      priority?: string[];
      task_type?: string[];
      due_date_from?: string;
      due_date_to?: string;
      lead_id?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ tasks: MemberTask[]; total: number }> {
    try {
      const cacheKey = `member_tasks:${tenantId}:${memberId}:${JSON.stringify(filters)}`;
      const cached = await getCache().get<{ tasks: MemberTask[]; total: number }>(cacheKey);
      if (cached && cached.tasks && Array.isArray(cached.tasks)) return cached;

      let query = supabase
        .from('member_tasks')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('assigned_to', memberId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters?.priority?.length) {
        query = query.in('priority', filters.priority);
      }
      if (filters?.task_type?.length) {
        query = query.in('task_type', filters.task_type);
      }
      if (filters?.due_date_from) {
        query = query.gte('due_date', filters.due_date_from);
      }
      if (filters?.due_date_to) {
        query = query.lte('due_date', filters.due_date_to);
      }
      if (filters?.lead_id) {
        query = query.eq('lead_id', filters.lead_id);
      }

      // Apply pagination
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error fetching member tasks:', error);
        throw error;
      }

      const result = {
        tasks: data || [],
        total: count || 0
      };

      await getCache().set(cacheKey, result, { ttl: this.CACHE_TTL.TASKS });
      return result;
    } catch (error) {
      logger.error('Error in getMemberTasks:', error);
      throw error;
    }
  }

  async createTask(
    tenantId: string,
    taskData: Partial<MemberTask>,
    createdBy?: string
  ): Promise<MemberTask> {
    try {
      const { data, error } = await supabase
        .from('member_tasks')
        .insert({
          ...taskData,
          tenant_id: tenantId,
          created_by: createdBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating task:', error);
        throw error;
      }

      // Clear cache
      await this.clearMemberTasksCache(tenantId, taskData.assigned_to!);

      return data;
    } catch (error) {
      logger.error('Error in createTask:', error);
      throw error;
    }
  }

  async updateTask(
    tenantId: string,
    taskId: string,
    updates: Partial<MemberTask>,
    updatedBy?: string
  ): Promise<MemberTask> {
    try {
      const { data, error } = await supabase
        .from('member_tasks')
        .update({
          ...updates,
          updated_by: updatedBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating task:', error);
        throw error;
      }

      // Clear cache
      await this.clearMemberTasksCache(tenantId, data.assigned_to);

      return data;
    } catch (error) {
      logger.error('Error in updateTask:', error);
      throw error;
    }
  }

  async completeTask(
    tenantId: string,
    taskId: string,
    completionNotes?: string,
    completedBy?: string
  ): Promise<MemberTask> {
    try {
      const { data, error } = await supabase
        .from('member_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_notes: completionNotes,
          updated_by: completedBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        logger.error('Error completing task:', error);
        throw error;
      }

      // Clear cache
      await this.clearMemberTasksCache(tenantId, data.assigned_to);

      return data;
    } catch (error) {
      logger.error('Error in completeTask:', error);
      throw error;
    }
  }

  async createAutomatedTask(
    tenantId: string,
    title: string,
    description: string,
    taskType: string,
    assignedTo: string,
    leadId?: string,
    dueDate?: string,
    automationRuleId?: string,
    createdBy?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_automated_task', {
        p_tenant_id: tenantId,
        p_title: title,
        p_description: description,
        p_task_type: taskType,
        p_assigned_to: assignedTo,
        p_lead_id: leadId,
        p_due_date: dueDate,
        p_automation_rule_id: automationRuleId,
        p_created_by: createdBy
      });

      if (error) {
        logger.error('Error creating automated task:', error);
        throw error;
      }

      // Clear cache
      await this.clearMemberTasksCache(tenantId, assignedTo);

      return data;
    } catch (error) {
      logger.error('Error in createAutomatedTask:', error);
      throw error;
    }
  }

  // =====================================================
  // CALENDAR INTEGRATION METHODS
  // =====================================================

  async getCalendarIntegrations(
    tenantId: string,
    userId: string
  ): Promise<CalendarIntegration[]> {
    try {
      const cacheKey = `calendar_integrations:${tenantId}:${userId}`;
      const cached = await getCache().get<CalendarIntegration[]>(cacheKey);
      if (cached && Array.isArray(cached)) return cached;

      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching calendar integrations:', error);
        throw error;
      }

      await getCache().set(cacheKey, data || [], { ttl: this.CACHE_TTL.DASHBOARD });
      return data || [];
    } catch (error) {
      logger.error('Error in getCalendarIntegrations:', error);
      throw error;
    }
  }

  async createCalendarIntegration(
    tenantId: string,
    integrationData: Partial<CalendarIntegration>
  ): Promise<CalendarIntegration> {
    try {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .insert({
          ...integrationData,
          tenant_id: tenantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating calendar integration:', error);
        throw error;
      }

      // Clear cache
      await getCache().delete(`calendar_integrations:${tenantId}:${integrationData.user_id}`);

      return data;
    } catch (error) {
      logger.error('Error in createCalendarIntegration:', error);
      throw error;
    }
  }

  async syncCalendarEvent(
    integrationId: string,
    externalEventId: string,
    title: string,
    startTime: string,
    endTime: string,
    description?: string,
    location?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('sync_calendar_event', {
        p_integration_id: integrationId,
        p_external_event_id: externalEventId,
        p_title: title,
        p_start_time: startTime,
        p_end_time: endTime,
        p_description: description,
        p_location: location
      });

      if (error) {
        logger.error('Error syncing calendar event:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error in syncCalendarEvent:', error);
      throw error;
    }
  }

  // =====================================================
  // EMAIL TEMPLATE METHODS
  // =====================================================

  async getEmailTemplates(
    tenantId: string,
    filters?: {
      category?: string;
      is_active?: boolean;
      created_by?: string;
      search?: string;
    }
  ): Promise<EmailTemplate[]> {
    try {
      const cacheKey = `email_templates:${tenantId}:${JSON.stringify(filters)}`;
      const cached = await getCache().get(cacheKey);
      if (cached && Array.isArray(cached)) return cached;

      let query = supabase
        .from('email_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('usage_count', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters?.created_by) {
        query = query.eq('created_by', filters.created_by);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching email templates:', error);
        throw error;
      }

      await getCache().set(cacheKey, data || [], { ttl: this.CACHE_TTL.TEMPLATES });
      return data || [];
    } catch (error) {
      logger.error('Error in getEmailTemplates:', error);
      throw error;
    }
  }

  async createEmailTemplate(
    tenantId: string,
    templateData: Partial<EmailTemplate>,
    createdBy?: string
  ): Promise<EmailTemplate> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          ...templateData,
          tenant_id: tenantId,
          created_by: createdBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating email template:', error);
        throw error;
      }

      // Clear cache
      await this.clearEmailTemplatesCache(tenantId);

      return data;
    } catch (error) {
      logger.error('Error in createEmailTemplate:', error);
      throw error;
    }
  }

  async updateEmailTemplate(
    tenantId: string,
    templateId: string,
    updates: Partial<EmailTemplate>
  ): Promise<EmailTemplate> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating email template:', error);
        throw error;
      }

      // Clear cache
      await this.clearEmailTemplatesCache(tenantId);

      return data;
    } catch (error) {
      logger.error('Error in updateEmailTemplate:', error);
      throw error;
    }
  }

  async sendEmailFromTemplate(
    tenantId: string,
    templateId: string,
    fromEmail: string,
    toEmail: string,
    variables: Record<string, any>,
    leadId?: string,
    taskId?: string,
    sentBy?: string
  ): Promise<string> {
    try {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .eq('tenant_id', tenantId)
        .single();

      if (templateError) {
        logger.error('Error fetching email template:', templateError);
        throw templateError;
      }

      // Replace variables in subject and body
      let subject = template.subject;
      let bodyHtml = template.body_html;
      let bodyText = template.body_text;

      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
        bodyHtml = bodyHtml.replace(new RegExp(placeholder, 'g'), value);
        if (bodyText) {
          bodyText = bodyText.replace(new RegExp(placeholder, 'g'), value);
        }
      });

      // Log email send
      const { data, error } = await supabase
        .from('email_sends')
        .insert({
          tenant_id: tenantId,
          template_id: templateId,
          from_email: fromEmail,
          to_email: toEmail,
          subject,
          body_html: bodyHtml,
          body_text: bodyText,
          lead_id: leadId,
          task_id: taskId,
          sent_by: sentBy,
          status: 'queued',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        logger.error('Error logging email send:', error);
        throw error;
      }

      // Update template usage count
      await supabase
        .from('email_templates')
        .update({
          usage_count: template.usage_count + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .eq('tenant_id', tenantId);

      return data.id;
    } catch (error) {
      logger.error('Error in sendEmailFromTemplate:', error);
      throw error;
    }
  }

  // =====================================================
  // WHATSAPP INTEGRATION METHODS
  // =====================================================

  async getWhatsAppIntegrations(tenantId: string): Promise<WhatsAppIntegration[]> {
    try {
      const cacheKey = `whatsapp_integrations:${tenantId}`;
      const cached = await getCache().get(cacheKey);
      if (cached && Array.isArray(cached)) return cached;

      const { data, error } = await supabase
        .from('whatsapp_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching WhatsApp integrations:', error);
        throw error;
      }

      await getCache().set(cacheKey, data || [], { ttl: this.CACHE_TTL.DASHBOARD });
      return data || [];
    } catch (error) {
      logger.error('Error in getWhatsAppIntegrations:', error);
      throw error;
    }
  }

  async createWhatsAppIntegration(
    tenantId: string,
    integrationData: Partial<WhatsAppIntegration>
  ): Promise<WhatsAppIntegration> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_integrations')
        .insert({
          ...integrationData,
          tenant_id: tenantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating WhatsApp integration:', error);
        throw error;
      }

      // Clear cache
      await getCache().delete(`whatsapp_integrations:${tenantId}`);

      return data;
    } catch (error) {
      logger.error('Error in createWhatsAppIntegration:', error);
      throw error;
    }
  }

  // =====================================================
  // MEMBER PERFORMANCE METHODS
  // =====================================================

  async getMemberPerformance(
    tenantId: string,
    memberId: string,
    periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' = 'monthly',
    periodStart?: string,
    periodEnd?: string
  ): Promise<MemberPerformanceSnapshot[]> {
    try {
      const cacheKey = `member_performance:${tenantId}:${memberId}:${periodType}:${periodStart}:${periodEnd}`;
      const cached = await getCache().get(cacheKey);
      if (cached && Array.isArray(cached)) return cached;

      let query = supabase
        .from('member_performance_snapshots')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('member_id', memberId)
        .eq('period_type', periodType)
        .order('snapshot_date', { ascending: false });

      if (periodStart) {
        query = query.gte('snapshot_date', periodStart);
      }
      if (periodEnd) {
        query = query.lte('snapshot_date', periodEnd);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching member performance:', error);
        throw error;
      }

      await getCache().set(cacheKey, data || [], { ttl: this.CACHE_TTL.PERFORMANCE });
      return data || [];
    } catch (error) {
      logger.error('Error in getMemberPerformance:', error);
      throw error;
    }
  }

  async calculateMemberPerformance(
    tenantId: string,
    memberId: string,
    periodStart: string,
    periodEnd: string,
    periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('calculate_member_performance', {
        p_tenant_id: tenantId,
        p_member_id: memberId,
        p_period_start: periodStart,
        p_period_end: periodEnd,
        p_period_type: periodType
      });

      if (error) {
        logger.error('Error calculating member performance:', error);
        throw error;
      }

      // Clear cache
      await this.clearMemberPerformanceCache(tenantId, memberId);
    } catch (error) {
      logger.error('Error in calculateMemberPerformance:', error);
      throw error;
    }
  }

  // =====================================================
  // MEMBER DASHBOARD METHODS
  // =====================================================

  async getMemberDashboardConfig(
    tenantId: string,
    memberId: string
  ): Promise<MemberDashboardConfig | null> {
    try {
      const cacheKey = `member_dashboard_config:${tenantId}:${memberId}`;
      const cached = await getCache().get(cacheKey);
      if (cached && typeof cached === 'object' && cached.id !== undefined) return cached;

      const { data, error } = await supabase
        .from('member_dashboard_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('member_id', memberId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error fetching member dashboard config:', error);
        throw error;
      }

      await getCache().set(cacheKey, data, { ttl: this.CACHE_TTL.DASHBOARD });
      return data;
    } catch (error) {
      logger.error('Error in getMemberDashboardConfig:', error);
      throw error;
    }
  }

  async updateMemberDashboardConfig(
    tenantId: string,
    memberId: string,
    config: Partial<MemberDashboardConfig>
  ): Promise<MemberDashboardConfig> {
    try {
      const { data, error } = await supabase
        .from('member_dashboard_configs')
        .upsert({
          tenant_id: tenantId,
          member_id: memberId,
          ...config,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Error updating member dashboard config:', error);
        throw error;
      }

      // Clear cache
      await getCache().delete(`member_dashboard_config:${tenantId}:${memberId}`);

      return data;
    } catch (error) {
      logger.error('Error in updateMemberDashboardConfig:', error);
      throw error;
    }
  }

  // =====================================================
  // MEMBER ACTIVITY TRACKING
  // =====================================================

  async recordMemberActivity(
    tenantId: string,
    memberId: string,
    activityType: string,
    activityDescription: string,
    entityType?: string,
    entityId?: string,
    activityData?: any,
    productivityPoints: number = 0,
    qualityPoints: number = 0
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('member_activities')
        .insert({
          tenant_id: tenantId,
          member_id: memberId,
          activity_type: activityType,
          activity_description: activityDescription,
          entity_type: entityType,
          entity_id: entityId,
          activity_data: activityData,
          productivity_points: productivityPoints,
          quality_points: qualityPoints,
          occurred_at: new Date().toISOString(),
          recorded_at: new Date().toISOString()
        });

      if (error) {
        logger.error('Error recording member activity:', error);
        throw error;
      }
    } catch (error) {
      logger.error('Error in recordMemberActivity:', error);
      throw error;
    }
  }

  // =====================================================
  // CACHE MANAGEMENT METHODS
  // =====================================================

  private async clearMemberTasksCache(tenantId: string, memberId: string): Promise<void> {
    const pattern = `member_tasks:${tenantId}:${memberId}:*`;
    await getCache().deletePattern(pattern);
  }

  private async clearEmailTemplatesCache(tenantId: string): Promise<void> {
    const pattern = `email_templates:${tenantId}:*`;
    await getCache().deletePattern(pattern);
  }

  private async clearMemberPerformanceCache(tenantId: string, memberId: string): Promise<void> {
    const pattern = `member_performance:${tenantId}:${memberId}:*`;
    await getCache().deletePattern(pattern);
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  async getOverdueTasks(tenantId: string): Promise<MemberTask[]> {
    try {
      const { data, error } = await supabase
        .from('member_tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('status', ['pending', 'in_progress'])
        .lt('due_date', new Date().toISOString())
        .order('due_date', { ascending: true });

      if (error) {
        logger.error('Error fetching overdue tasks:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getOverdueTasks:', error);
      throw error;
    }
  }

  async getMemberTaskSummary(
    tenantId: string,
    memberId: string
  ): Promise<{
    total: number;
    pending: number;
    in_progress: number;
    completed_today: number;
    overdue: number;
    due_today: number;
  }> {
    try {
      const cacheKey = `member_task_summary:${tenantId}:${memberId}`;
      const cached = await getCache().get(cacheKey);
      if (cached) return cached;

      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('member_tasks')
        .select('status, due_date, completed_at')
        .eq('tenant_id', tenantId)
        .eq('assigned_to', memberId);

      if (error) {
        logger.error('Error fetching member task summary:', error);
        throw error;
      }

      const summary = {
        total: data.length,
        pending: data.filter(t => t.status === 'pending').length,
        in_progress: data.filter(t => t.status === 'in_progress').length,
        completed_today: data.filter(t => 
          t.status === 'completed' && 
          t.completed_at && 
          t.completed_at.startsWith(today)
        ).length,
        overdue: data.filter(t => 
          ['pending', 'in_progress'].includes(t.status) && 
          t.due_date && 
          t.due_date < now
        ).length,
        due_today: data.filter(t => 
          ['pending', 'in_progress'].includes(t.status) && 
          t.due_date && 
          t.due_date.startsWith(today)
        ).length
      };

      await getCache().set(cacheKey, summary, { ttl: this.CACHE_TTL.TASKS });
      return summary;
    } catch (error) {
      logger.error('Error in getMemberTaskSummary:', error);
      throw error;
    }
  }
}

export const memberToolsService = MemberToolsService.getInstance(); 
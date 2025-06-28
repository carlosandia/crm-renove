import { Request, Response } from 'express';
import { memberToolsService } from '../services/memberToolsService';
import { logger } from '../utils/logger';
import { z } from 'zod';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const TaskFiltersSchema = z.object({
  status: z.array(z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'overdue'])).optional(),
  priority: z.array(z.enum(['low', 'medium', 'high', 'urgent'])).optional(),
  task_type: z.array(z.enum(['follow_up', 'call', 'email', 'meeting', 'custom'])).optional(),
  due_date_from: z.string().optional(),
  due_date_to: z.string().optional(),
  lead_id: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
});

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  task_type: z.enum(['follow_up', 'call', 'email', 'meeting', 'custom']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigned_to: z.string().uuid(),
  lead_id: z.string().uuid().optional(),
  pipeline_id: z.string().uuid().optional(),
  due_date: z.string().datetime().optional(),
  scheduled_for: z.string().datetime().optional(),
  estimated_duration: z.number().min(1).optional(),
  tags: z.array(z.string()).default([]),
  custom_fields: z.record(z.any()).default({})
});

const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  task_type: z.enum(['follow_up', 'call', 'email', 'meeting', 'custom']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'overdue']).optional(),
  due_date: z.string().datetime().optional(),
  scheduled_for: z.string().datetime().optional(),
  estimated_duration: z.number().min(1).optional(),
  completion_notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.any()).optional()
});

const CalendarIntegrationSchema = z.object({
  user_id: z.string().uuid(),
  provider: z.enum(['google', 'outlook', 'apple']),
  provider_user_id: z.string(),
  calendar_id: z.string().optional(),
  calendar_name: z.string().optional(),
  access_token: z.string(),
  refresh_token: z.string().optional(),
  token_expires_at: z.string().datetime().optional(),
  sync_enabled: z.boolean().default(true),
  sync_direction: z.enum(['read_only', 'write_only', 'bidirectional']).default('bidirectional'),
  default_calendar: z.boolean().default(false),
  auto_create_tasks: z.boolean().default(true),
  notification_preferences: z.record(z.any()).default({})
});

const EmailTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.string().optional(),
  subject: z.string().min(1).max(500),
  body_html: z.string().min(1),
  body_text: z.string().optional(),
  available_variables: z.array(z.record(z.any())).default([]),
  is_active: z.boolean().default(true),
  personalization_enabled: z.boolean().default(true),
  shared_with_team: z.boolean().default(false),
  allowed_roles: z.array(z.string()).default(['member', 'admin']),
  tags: z.array(z.string()).default([])
});

const SendEmailSchema = z.object({
  template_id: z.string().uuid(),
  from_email: z.string().email(),
  to_email: z.string().email(),
  variables: z.record(z.any()),
  lead_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional()
});

const WhatsAppIntegrationSchema = z.object({
  business_account_id: z.string(),
  phone_number_id: z.string(),
  phone_number: z.string(),
  display_name: z.string().optional(),
  access_token: z.string(),
  webhook_verify_token: z.string(),
  webhook_url: z.string().url().optional(),
  webhook_events: z.array(z.string()).default(['messages', 'message_deliveries']),
  auto_reply_enabled: z.boolean().default(false),
  auto_reply_message: z.string().optional(),
  business_hours: z.record(z.any()).optional()
});

const DashboardConfigSchema = z.object({
  layout_config: z.record(z.any()),
  widget_preferences: z.record(z.any()).default({}),
  theme: z.enum(['light', 'dark', 'auto']).default('light'),
  timezone: z.string().default('UTC'),
  date_format: z.string().default('DD/MM/YYYY'),
  notification_settings: z.record(z.any()).default({}),
  auto_refresh_enabled: z.boolean().default(true),
  refresh_interval: z.number().min(30).max(3600).default(300)
});

// =====================================================
// MEMBER TOOLS CONTROLLER CLASS
// =====================================================

export class MemberToolsController {
  
  // =====================================================
  // TASK MANAGEMENT ENDPOINTS
  // =====================================================

  async getMemberTasks(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const memberId = req.params.memberId || req.user?.id;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Validate query parameters
      const filters = TaskFiltersSchema.parse(req.query);

      if (!memberId) {
        res.status(400).json({ error: 'Member ID is required' });
        return;
      }

      const result = await memberToolsService.getMemberTasks(tenantId, memberId, filters);

      res.json({
        success: true,
        data: result,
        message: 'Member tasks retrieved successfully'
      });
    } catch (error) {
      logger.error('Error in getMemberTasks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve member tasks',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const createdBy = req.user?.id;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Validate request body
      const taskData = CreateTaskSchema.parse(req.body);

      const task = await memberToolsService.createTask(tenantId, taskData, createdBy);

      res.status(201).json({
        success: true,
        data: task,
        message: 'Task created successfully'
      });
    } catch (error) {
      logger.error('Error in createTask:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Failed to create task',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const taskId = req.params.taskId;
      const updatedBy = req.user?.id;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Validate request body
      const updates = UpdateTaskSchema.parse(req.body);

      const task = await memberToolsService.updateTask(tenantId, taskId, updates, updatedBy);

      res.json({
        success: true,
        data: task,
        message: 'Task updated successfully'
      });
    } catch (error) {
      logger.error('Error in updateTask:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Failed to update task',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async completeTask(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const taskId = req.params.taskId;
      const completedBy = req.user?.id;
      const { completion_notes } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const task = await memberToolsService.completeTask(
        tenantId, 
        taskId, 
        completion_notes, 
        completedBy
      );

      res.json({
        success: true,
        data: task,
        message: 'Task completed successfully'
      });
    } catch (error) {
      logger.error('Error in completeTask:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete task',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getMemberTaskSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const memberId = req.params.memberId || req.user?.id;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      if (!memberId) {
        res.status(400).json({ error: 'Member ID is required' });
        return;
      }

      const summary = await memberToolsService.getMemberTaskSummary(tenantId, memberId);

      res.json({
        success: true,
        data: summary,
        message: 'Task summary retrieved successfully'
      });
    } catch (error) {
      logger.error('Error in getMemberTaskSummary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve task summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getOverdueTasks(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const tasks = await memberToolsService.getOverdueTasks(tenantId);

      res.json({
        success: true,
        data: tasks,
        message: 'Overdue tasks retrieved successfully'
      });
    } catch (error) {
      logger.error('Error in getOverdueTasks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve overdue tasks',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // =====================================================
  // CALENDAR INTEGRATION ENDPOINTS
  // =====================================================

  async getCalendarIntegrations(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const userId = req.params.userId || req.user?.id;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const integrations = await memberToolsService.getCalendarIntegrations(tenantId, userId);

      res.json({
        success: true,
        data: integrations,
        message: 'Calendar integrations retrieved successfully'
      });
    } catch (error) {
      logger.error('Error in getCalendarIntegrations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve calendar integrations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createCalendarIntegration(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Validate request body
      const integrationData = CalendarIntegrationSchema.parse(req.body);

      const integration = await memberToolsService.createCalendarIntegration(
        tenantId, 
        integrationData
      );

      res.status(201).json({
        success: true,
        data: integration,
        message: 'Calendar integration created successfully'
      });
    } catch (error) {
      logger.error('Error in createCalendarIntegration:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Failed to create calendar integration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async syncCalendarEvent(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;
      const { 
        external_event_id, 
        title, 
        start_time, 
        end_time, 
        description, 
        location 
      } = req.body;

      if (!external_event_id || !title || !start_time || !end_time) {
        res.status(400).json({ 
          error: 'Missing required fields: external_event_id, title, start_time, end_time' 
        });
        return;
      }

      const eventId = await memberToolsService.syncCalendarEvent(
        integrationId,
        external_event_id,
        title,
        start_time,
        end_time,
        description,
        location
      );

      res.json({
        success: true,
        data: { event_id: eventId },
        message: 'Calendar event synced successfully'
      });
    } catch (error) {
      logger.error('Error in syncCalendarEvent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync calendar event',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // =====================================================
  // EMAIL TEMPLATE ENDPOINTS
  // =====================================================

  async getEmailTemplates(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const filters = {
        category: req.query.category as string,
        is_active: req.query.is_active === 'true',
        created_by: req.query.created_by as string,
        search: req.query.search as string
      };

      const templates = await memberToolsService.getEmailTemplates(tenantId, filters);

      res.json({
        success: true,
        data: templates,
        message: 'Email templates retrieved successfully'
      });
    } catch (error) {
      logger.error('Error in getEmailTemplates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve email templates',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createEmailTemplate(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const createdBy = req.user?.id;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Validate request body
      const templateData = EmailTemplateSchema.parse(req.body);

      const template = await memberToolsService.createEmailTemplate(
        tenantId, 
        templateData, 
        createdBy
      );

      res.status(201).json({
        success: true,
        data: template,
        message: 'Email template created successfully'
      });
    } catch (error) {
      logger.error('Error in createEmailTemplate:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Failed to create email template',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateEmailTemplate(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const templateId = req.params.templateId;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Validate request body
      const updates = EmailTemplateSchema.partial().parse(req.body);

      const template = await memberToolsService.updateEmailTemplate(
        tenantId, 
        templateId, 
        updates
      );

      res.json({
        success: true,
        data: template,
        message: 'Email template updated successfully'
      });
    } catch (error) {
      logger.error('Error in updateEmailTemplate:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Failed to update email template',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async sendEmailFromTemplate(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const sentBy = req.user?.id;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Validate request body
      const emailData = SendEmailSchema.parse(req.body);

      const emailId = await memberToolsService.sendEmailFromTemplate(
        tenantId,
        emailData.template_id,
        emailData.from_email,
        emailData.to_email,
        emailData.variables,
        emailData.lead_id,
        emailData.task_id,
        sentBy
      );

      res.json({
        success: true,
        data: { email_id: emailId },
        message: 'Email sent successfully'
      });
    } catch (error) {
      logger.error('Error in sendEmailFromTemplate:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // =====================================================
  // WHATSAPP INTEGRATION ENDPOINTS
  // =====================================================

  async getWhatsAppIntegrations(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const integrations = await memberToolsService.getWhatsAppIntegrations(tenantId);

      res.json({
        success: true,
        data: integrations,
        message: 'WhatsApp integrations retrieved successfully'
      });
    } catch (error) {
      logger.error('Error in getWhatsAppIntegrations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve WhatsApp integrations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createWhatsAppIntegration(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Validate request body
      const integrationData = WhatsAppIntegrationSchema.parse(req.body);

      const integration = await memberToolsService.createWhatsAppIntegration(
        tenantId, 
        integrationData
      );

      res.status(201).json({
        success: true,
        data: integration,
        message: 'WhatsApp integration created successfully'
      });
    } catch (error) {
      logger.error('Error in createWhatsAppIntegration:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Failed to create WhatsApp integration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // =====================================================
  // MEMBER PERFORMANCE ENDPOINTS
  // =====================================================

  async getMemberPerformance(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const memberId = req.params.memberId || req.user?.id;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const periodType = (req.query.period_type as string) || 'monthly';
      const periodStart = req.query.period_start as string;
      const periodEnd = req.query.period_end as string;

      if (!memberId) {
        res.status(400).json({ error: 'Member ID is required' });
        return;
      }

      const performance = await memberToolsService.getMemberPerformance(
        tenantId,
        memberId,
        periodType as any,
        periodStart,
        periodEnd
      );

      res.json({
        success: true,
        data: performance,
        message: 'Member performance retrieved successfully'
      });
    } catch (error) {
      logger.error('Error in getMemberPerformance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve member performance',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async calculateMemberPerformance(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const memberId = req.params.memberId;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { period_start, period_end, period_type } = req.body;

      if (!period_start || !period_end || !period_type) {
        res.status(400).json({ 
          error: 'Missing required fields: period_start, period_end, period_type' 
        });
        return;
      }

      await memberToolsService.calculateMemberPerformance(
        tenantId,
        memberId,
        period_start,
        period_end,
        period_type
      );

      res.json({
        success: true,
        message: 'Member performance calculated successfully'
      });
    } catch (error) {
      logger.error('Error in calculateMemberPerformance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate member performance',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // =====================================================
  // MEMBER DASHBOARD ENDPOINTS
  // =====================================================

  async getMemberDashboardConfig(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const memberId = req.params.memberId || req.user?.id;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      if (!memberId) {
        res.status(400).json({ error: 'Member ID is required' });
        return;
      }

      const config = await memberToolsService.getMemberDashboardConfig(tenantId, memberId);

      res.json({
        success: true,
        data: config,
        message: 'Dashboard configuration retrieved successfully'
      });
    } catch (error) {
      logger.error('Error in getMemberDashboardConfig:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateMemberDashboardConfig(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const memberId = req.params.memberId || req.user?.id;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Validate request body
      const configData = DashboardConfigSchema.parse(req.body);

      if (!memberId) {
        res.status(400).json({ error: 'Member ID is required' });
        return;
      }

      const config = await memberToolsService.updateMemberDashboardConfig(
        tenantId, 
        memberId, 
        configData
      );

      res.json({
        success: true,
        data: config,
        message: 'Dashboard configuration updated successfully'
      });
    } catch (error) {
      logger.error('Error in updateMemberDashboardConfig:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Failed to update dashboard configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // =====================================================
  // MEMBER ACTIVITY ENDPOINTS
  // =====================================================

  async recordMemberActivity(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const memberId = req.user?.id;

      if (!tenantId || !memberId) {
        res.status(400).json({ error: 'Tenant ID and Member ID are required' });
        return;
      }

      const {
        activity_type,
        activity_description,
        entity_type,
        entity_id,
        activity_data,
        productivity_points,
        quality_points
      } = req.body;

      if (!activity_type || !activity_description) {
        res.status(400).json({ 
          error: 'Missing required fields: activity_type, activity_description' 
        });
        return;
      }

      await memberToolsService.recordMemberActivity(
        tenantId,
        memberId,
        activity_type,
        activity_description,
        entity_type,
        entity_id,
        activity_data,
        productivity_points || 0,
        quality_points || 0
      );

      res.json({
        success: true,
        message: 'Member activity recorded successfully'
      });
    } catch (error) {
      logger.error('Error in recordMemberActivity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record member activity',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const memberToolsController = new MemberToolsController(); 
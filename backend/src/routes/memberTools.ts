import { Router } from 'express';
import { memberToolsController } from '../controllers/memberToolsController';
import { authMiddleware, requireRole } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// =====================================================
// RATE LIMITING CONFIGURATION
// =====================================================

// General rate limiting for member tools
const memberToolsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for create/update operations
const createUpdateRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 create/update requests per windowMs
  message: {
    error: 'Too many create/update requests, please slow down.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
router.use(memberToolsRateLimit);

// Apply authentication to all routes
router.use(authMiddleware);

// =====================================================
// TASK MANAGEMENT ROUTES
// =====================================================

/**
 * @route GET /api/member-tools/tasks
 * @desc Get member tasks with filtering and pagination
 * @access Member, Admin, Super Admin
 * @query status, priority, task_type, due_date_from, due_date_to, lead_id, limit, offset
 */
router.get('/tasks', 
  requireRole(['member', 'admin', 'super_admin']),
  memberToolsController.getMemberTasks
);

/**
 * @route GET /api/member-tools/tasks/:memberId
 * @desc Get specific member's tasks (Admin/Super Admin only)
 * @access Admin, Super Admin
 * @query status, priority, task_type, due_date_from, due_date_to, lead_id, limit, offset
 */
router.get('/tasks/:memberId', 
  requireRole(['admin', 'super_admin']),
  memberToolsController.getMemberTasks
);

/**
 * @route POST /api/member-tools/tasks
 * @desc Create a new task
 * @access Member, Admin, Super Admin
 * @body title, description, task_type, priority, assigned_to, lead_id, due_date, etc.
 */
router.post('/tasks',
  createUpdateRateLimit,
  requireRole(['member', 'admin', 'super_admin']),
  memberToolsController.createTask
);

/**
 * @route PUT /api/member-tools/tasks/:taskId
 * @desc Update an existing task
 * @access Member, Admin, Super Admin
 * @body title, description, task_type, priority, status, due_date, etc.
 */
router.put('/tasks/:taskId',
  createUpdateRateLimit,
  requireRole(['member', 'admin', 'super_admin']),
  memberToolsController.updateTask
);

/**
 * @route POST /api/member-tools/tasks/:taskId/complete
 * @desc Mark a task as completed
 * @access Member, Admin, Super Admin
 * @body completion_notes (optional)
 */
router.post('/tasks/:taskId/complete',
  requireRole(['member', 'admin', 'super_admin']),
  memberToolsController.completeTask
);

/**
 * @route GET /api/member-tools/tasks/summary
 * @desc Get task summary for current member
 * @access Member, Admin, Super Admin
 */
router.get('/tasks/summary',
  requireRole(['member', 'admin', 'super_admin']),
  memberToolsController.getMemberTaskSummary
);

/**
 * @route GET /api/member-tools/tasks/summary/:memberId
 * @desc Get task summary for specific member (Admin/Super Admin only)
 * @access Admin, Super Admin
 */
router.get('/tasks/summary/:memberId',
  requireRole(['admin', 'super_admin']),
  memberToolsController.getMemberTaskSummary
);

/**
 * @route GET /api/member-tools/tasks/overdue
 * @desc Get all overdue tasks for the tenant
 * @access Admin, Super Admin
 */
router.get('/tasks/overdue',
  requireRole(['admin', 'super_admin']),
  memberToolsController.getOverdueTasks
);

// =====================================================
// CALENDAR INTEGRATION ROUTES
// =====================================================

/**
 * @route GET /api/member-tools/calendar/integrations
 * @desc Get calendar integrations for current user
 * @access Member, Admin, Super Admin
 */
router.get('/calendar/integrations',
  requireRole(['member', 'admin', 'super_admin']),
  memberToolsController.getCalendarIntegrations
);

/**
 * @route GET /api/member-tools/calendar/integrations/:userId
 * @desc Get calendar integrations for specific user (Admin/Super Admin only)
 * @access Admin, Super Admin
 */
router.get('/calendar/integrations/:userId',
  requireRole(['admin', 'super_admin']),
  memberToolsController.getCalendarIntegrations
);

/**
 * @route POST /api/member-tools/calendar/integrations
 * @desc Create a new calendar integration
 * @access Member, Admin, Super Admin
 * @body user_id, provider, provider_user_id, access_token, etc.
 */
router.post('/calendar/integrations',
  createUpdateRateLimit,
  requireRole(['member', 'admin', 'super_admin']),
  memberToolsController.createCalendarIntegration
);

/**
 * @route POST /api/member-tools/calendar/integrations/:integrationId/sync-event
 * @desc Sync a calendar event from external provider
 * @access Member, Admin, Super Admin
 * @body external_event_id, title, start_time, end_time, description, location
 */
router.post('/calendar/integrations/:integrationId/sync-event',
  requireRole(['member', 'admin', 'super_admin']),
  memberToolsController.syncCalendarEvent
);

// =====================================================
// EMAIL TEMPLATE ROUTES
// =====================================================

/**
 * @route GET /api/member-tools/email/templates
 * @desc Get email templates
 * @access Member, Admin, Super Admin
 * @query category, is_active, created_by, search
 */
router.get('/email/templates',
  requireRole(['member', 'admin', 'super_admin']),
  memberToolsController.getEmailTemplates
);

/**
 * @route POST /api/member-tools/email/templates
 * @desc Create a new email template
 * @access Member, Admin, Super Admin
 * @body name, description, category, subject, body_html, body_text, etc.
 */
router.post('/email/templates',
  createUpdateRateLimit,
  requireRole(['member', 'admin', 'super_admin']),
  memberToolsController.createEmailTemplate
);

/**
 * @route PUT /api/member-tools/email/templates/:templateId
 * @desc Update an existing email template
 * @access Member, Admin, Super Admin
 * @body name, description, category, subject, body_html, body_text, etc.
 */
router.put('/email/templates/:templateId',
  createUpdateRateLimit,
  requireRole(['member', 'admin', 'super_admin']),
  memberToolsController.updateEmailTemplate
);

/**
 * @route POST /api/member-tools/email/send
 * @desc Send email using a template
 * @access Member, Admin, Super Admin
 * @body template_id, from_email, to_email, variables, lead_id, task_id
 */
router.post('/email/send',
  createUpdateRateLimit,
  requireRole(['member', 'admin', 'super_admin']),
  memberToolsController.sendEmailFromTemplate
);

// =====================================================
// WHATSAPP INTEGRATION ROUTES
// =====================================================

/**
 * @route GET /api/member-tools/whatsapp/integrations
 * @desc Get WhatsApp integrations
 * @access Member, Admin, Super Admin
 */
router.get('/whatsapp/integrations',
  requireRole(['member', 'admin', 'super_admin']),
  memberToolsController.getWhatsAppIntegrations
);

/**
 * @route POST /api/member-tools/whatsapp/integrations
 * @desc Create a new WhatsApp integration
 * @access Admin, Super Admin
 * @body business_account_id, phone_number_id, phone_number, access_token, etc.
 */
router.post('/whatsapp/integrations',
  createUpdateRateLimit,
  requireRole(['admin', 'super_admin']),
  memberToolsController.createWhatsAppIntegration
);

// =====================================================
// MEMBER PERFORMANCE ROUTES
// =====================================================

/**
 * @route GET /api/member-tools/performance
 * @desc Get performance metrics for current member
 * @access Member, Admin, Super Admin
 * @query period_type, period_start, period_end
 */
router.get('/performance',
  requireRole(['member', 'admin', 'super_admin']),
  memberToolsController.getMemberPerformance
);

/**
 * @route GET /api/member-tools/performance/:memberId
 * @desc Get performance metrics for specific member (Admin/Super Admin only)
 * @access Admin, Super Admin
 * @query period_type, period_start, period_end
 */
router.get('/performance/:memberId',
  requireRole(['admin', 'super_admin']),
  memberToolsController.getMemberPerformance
);

/**
 * @route POST /api/member-tools/performance/:memberId/calculate
 * @desc Calculate performance metrics for a member
 * @access Admin, Super Admin
 * @body period_start, period_end, period_type
 */
router.post('/performance/:memberId/calculate',
  createUpdateRateLimit,
  requireRole(['admin', 'super_admin']),
  memberToolsController.calculateMemberPerformance
);

// =====================================================
// MEMBER DASHBOARD ROUTES
// =====================================================

/**
 * @route GET /api/member-tools/dashboard/config
 * @desc Get dashboard configuration for current member
 * @access Member, Admin, Super Admin
 */
router.get('/dashboard/config',
  requireRole(['member', 'admin', 'super_admin']),
  memberToolsController.getMemberDashboardConfig
);

/**
 * @route GET /api/member-tools/dashboard/config/:memberId
 * @desc Get dashboard configuration for specific member (Admin/Super Admin only)
 * @access Admin, Super Admin
 */
router.get('/dashboard/config/:memberId',
  requireRole(['admin', 'super_admin']),
  memberToolsController.getMemberDashboardConfig
);

/**
 * @route PUT /api/member-tools/dashboard/config
 * @desc Update dashboard configuration for current member
 * @access Member, Admin, Super Admin
 * @body layout_config, widget_preferences, theme, timezone, etc.
 */
router.put('/dashboard/config',
  createUpdateRateLimit,
  requireRole(['member', 'admin', 'super_admin']),
  memberToolsController.updateMemberDashboardConfig
);

/**
 * @route PUT /api/member-tools/dashboard/config/:memberId
 * @desc Update dashboard configuration for specific member (Admin/Super Admin only)
 * @access Admin, Super Admin
 * @body layout_config, widget_preferences, theme, timezone, etc.
 */
router.put('/dashboard/config/:memberId',
  createUpdateRateLimit,
  requireRole(['admin', 'super_admin']),
  memberToolsController.updateMemberDashboardConfig
);

// =====================================================
// MEMBER ACTIVITY ROUTES
// =====================================================

/**
 * @route POST /api/member-tools/activity/record
 * @desc Record a member activity
 * @access Member, Admin, Super Admin
 * @body activity_type, activity_description, entity_type, entity_id, activity_data, productivity_points, quality_points
 */
router.post('/activity/record',
  requireRole(['member', 'admin', 'super_admin']),
  memberToolsController.recordMemberActivity
);

// =====================================================
// HEALTH CHECK ROUTE
// =====================================================

/**
 * @route GET /api/member-tools/health
 * @desc Health check endpoint for member tools
 * @access Public (for monitoring)
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Member Tools API',
    version: '4B.1.0',
    timestamp: new Date().toISOString(),
    features: [
      'Task Management',
      'Calendar Integration',
      'Email Templates',
      'WhatsApp Integration',
      'Performance Tracking',
      'Dashboard Configuration',
      'Activity Monitoring'
    ]
  });
});

export { router as memberToolsRoutes }; 
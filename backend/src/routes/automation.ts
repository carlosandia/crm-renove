/**
 * Automation Routes - API endpoints for business rules and automation
 */

import express from 'express';
import { AutomationController } from '../controllers/automationController';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimiter';
import cacheMiddleware from '../middleware/cacheMiddleware';

const router = express.Router();
const automationController = new AutomationController();

// Apply authentication and rate limiting to all routes
router.use(authMiddleware);
router.use(rateLimiter);

// Business Rules Management
router.post('/rules',
  validateRequest({
    body: {
      name: { type: 'string', required: true, minLength: 1, maxLength: 255 },
      description: { type: 'string', required: false, maxLength: 1000 },
      trigger: { type: 'object', required: true },
      conditions: { type: 'object', required: true },
      actions: { type: 'array', required: true, minItems: 1 },
      priority: { type: 'number', required: false, min: 1, max: 100 },
      isActive: { type: 'boolean', required: false }
    }
  }),
  automationController.createRule.bind(automationController)
);

router.get('/rules',
  cacheMiddleware(),
  automationController.getRules.bind(automationController)
);

router.get('/rules/:ruleId',
  cacheMiddleware(),
  validateRequest({
    params: {
      ruleId: { type: 'string', required: true, pattern: /^rule_/ }
    }
  }),
  automationController.getRule.bind(automationController)
);

router.put('/rules/:ruleId',
  validateRequest({
    params: {
      ruleId: { type: 'string', required: true, pattern: /^rule_/ }
    },
    body: {
      name: { type: 'string', required: false, minLength: 1, maxLength: 255 },
      description: { type: 'string', required: false, maxLength: 1000 },
      trigger: { type: 'object', required: false },
      conditions: { type: 'object', required: false },
      actions: { type: 'array', required: false },
      priority: { type: 'number', required: false, min: 1, max: 100 },
      isActive: { type: 'boolean', required: false }
    }
  }),
  automationController.updateRule.bind(automationController)
);

router.delete('/rules/:ruleId',
  validateRequest({
    params: {
      ruleId: { type: 'string', required: true, pattern: /^rule_/ }
    }
  }),
  automationController.deleteRule.bind(automationController)
);

router.post('/rules/:ruleId/test',
  validateRequest({
    params: {
      ruleId: { type: 'string', required: true, pattern: /^rule_/ }
    },
    body: {
      testData: { type: 'object', required: true }
    }
  }),
  automationController.testRule.bind(automationController)
);

// Bulk operations
router.post('/rules/bulk',
  validateRequest({
    body: {
      rules: { type: 'array', required: true, minItems: 1, maxItems: 50 }
    }
  }),
  automationController.bulkCreateRules.bind(automationController)
);

router.get('/rules/export',
  validateRequest({
    query: {
      format: { type: 'string', required: false, enum: ['json', 'csv'] }
    }
  }),
  automationController.exportRules.bind(automationController)
);

// Event Management
router.post('/events',
  validateRequest({
    body: {
      type: { type: 'string', required: true, minLength: 1, maxLength: 100 },
      entityType: { type: 'string', required: true, minLength: 1, maxLength: 50 },
      entityId: { type: 'string', required: true, minLength: 1, maxLength: 100 },
      data: { type: 'object', required: true }
    }
  }),
  automationController.emitEvent.bind(automationController)
);

router.post('/events/schedule',
  validateRequest({
    body: {
      type: { type: 'string', required: true, minLength: 1, maxLength: 100 },
      entityType: { type: 'string', required: true, minLength: 1, maxLength: 50 },
      entityId: { type: 'string', required: true, minLength: 1, maxLength: 100 },
      data: { type: 'object', required: true },
      scheduleTime: { type: 'string', required: true, format: 'date-time' }
    }
  }),
  automationController.scheduleEvent.bind(automationController)
);

router.get('/events/definitions',
  cacheMiddleware(),
  automationController.getEventDefinitions.bind(automationController)
);

router.post('/events/definitions',
  validateRequest({
    body: {
      type: { type: 'string', required: true, minLength: 1, maxLength: 100 },
      entityType: { type: 'string', required: true, minLength: 1, maxLength: 50 },
      description: { type: 'string', required: true, minLength: 1, maxLength: 500 },
      schema: { type: 'object', required: true }
    }
  }),
  automationController.createEventDefinition.bind(automationController)
);

router.get('/events/log',
  validateRequest({
    query: {
      eventType: { type: 'string', required: false, maxLength: 100 },
      entityType: { type: 'string', required: false, maxLength: 50 },
      entityId: { type: 'string', required: false, maxLength: 100 },
      startDate: { type: 'string', required: false, format: 'date' },
      endDate: { type: 'string', required: false, format: 'date' },
      limit: { type: 'number', required: false, min: 1, max: 1000 }
    }
  }),
  automationController.getEventLog.bind(automationController)
);

// Subscriptions Management
router.post('/subscriptions',
  validateRequest({
    body: {
      eventType: { type: 'string', required: true, minLength: 1, maxLength: 100 },
      endpoint: { type: 'string', required: false, format: 'url' },
      filters: { type: 'object', required: false }
    }
  }),
  automationController.createSubscription.bind(automationController)
);

router.get('/subscriptions',
  validateRequest({
    query: {
      eventType: { type: 'string', required: false, maxLength: 100 }
    }
  }),
  automationController.getSubscriptions.bind(automationController)
);

router.delete('/subscriptions/:subscriptionId',
  validateRequest({
    params: {
      subscriptionId: { type: 'string', required: true, pattern: /^sub_/ }
    }
  }),
  automationController.deleteSubscription.bind(automationController)
);

// Metrics and Monitoring
router.get('/metrics',
  cacheMiddleware(),
  automationController.getRulesMetrics.bind(automationController)
);

router.get('/health',
  automationController.getAutomationHealth.bind(automationController)
);

// Integration endpoints for existing CRM modules
router.post('/events/lead/created',
  validateRequest({
    body: {
      lead: { type: 'object', required: true },
      userId: { type: 'string', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { eventService } = await import('../services/eventService');
      const { lead, userId } = req.body;
      
      const eventId = await eventService.emitLeadCreated(lead, userId);
      
      res.status(201).json({
        success: true,
        data: { eventId, type: 'lead.created', leadId: lead.id }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.post('/events/lead/updated',
  validateRequest({
    body: {
      leadId: { type: 'string', required: true },
      changes: { type: 'object', required: true },
      tenantId: { type: 'string', required: true },
      userId: { type: 'string', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { eventService } = await import('../services/eventService');
      const { leadId, changes, tenantId, userId } = req.body;
      
      const eventId = await eventService.emitLeadUpdated(leadId, changes, tenantId, userId);
      
      res.status(201).json({
        success: true,
        data: { eventId, type: 'lead.updated', leadId }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.post('/events/lead/stage-changed',
  validateRequest({
    body: {
      leadId: { type: 'string', required: true },
      fromStageId: { type: 'string', required: true },
      toStageId: { type: 'string', required: true },
      tenantId: { type: 'string', required: true },
      userId: { type: 'string', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { eventService } = await import('../services/eventService');
      const { leadId, fromStageId, toStageId, tenantId, userId } = req.body;
      
      const eventId = await eventService.emitLeadStageChanged(leadId, fromStageId, toStageId, tenantId, userId);
      
      res.status(201).json({
        success: true,
        data: { eventId, type: 'lead.stage_changed', leadId, fromStageId, toStageId }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.post('/events/deal/created',
  validateRequest({
    body: {
      deal: { type: 'object', required: true },
      userId: { type: 'string', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { eventService } = await import('../services/eventService');
      const { deal, userId } = req.body;
      
      const eventId = await eventService.emitDealCreated(deal, userId);
      
      res.status(201).json({
        success: true,
        data: { eventId, type: 'deal.created', dealId: deal.id }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.post('/events/deal/stage-changed',
  validateRequest({
    body: {
      dealId: { type: 'string', required: true },
      fromStageId: { type: 'string', required: true },
      toStageId: { type: 'string', required: true },
      tenantId: { type: 'string', required: true },
      userId: { type: 'string', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { eventService } = await import('../services/eventService');
      const { dealId, fromStageId, toStageId, tenantId, userId } = req.body;
      
      const eventId = await eventService.emitDealStageChanged(dealId, fromStageId, toStageId, tenantId, userId);
      
      res.status(201).json({
        success: true,
        data: { eventId, type: 'deal.stage_changed', dealId, fromStageId, toStageId }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.post('/events/deal/won',
  validateRequest({
    body: {
      deal: { type: 'object', required: true },
      userId: { type: 'string', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { eventService } = await import('../services/eventService');
      const { deal, userId } = req.body;
      
      const eventId = await eventService.emitDealWon(deal, userId);
      
      res.status(201).json({
        success: true,
        data: { eventId, type: 'deal.won', dealId: deal.id }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.post('/events/deal/lost',
  validateRequest({
    body: {
      deal: { type: 'object', required: true },
      reason: { type: 'string', required: true },
      userId: { type: 'string', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { eventService } = await import('../services/eventService');
      const { deal, reason, userId } = req.body;
      
      const eventId = await eventService.emitDealLost(deal, reason, userId);
      
      res.status(201).json({
        success: true,
        data: { eventId, type: 'deal.lost', dealId: deal.id, reason }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.post('/events/task/created',
  validateRequest({
    body: {
      task: { type: 'object', required: true },
      userId: { type: 'string', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { eventService } = await import('../services/eventService');
      const { task, userId } = req.body;
      
      const eventId = await eventService.emitTaskCreated(task, userId);
      
      res.status(201).json({
        success: true,
        data: { eventId, type: 'task.created', taskId: task.id }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.post('/events/task/completed',
  validateRequest({
    body: {
      taskId: { type: 'string', required: true },
      tenantId: { type: 'string', required: true },
      userId: { type: 'string', required: false }
    }
  }),
  async (req, res) => {
    try {
      const { eventService } = await import('../services/eventService');
      const { taskId, tenantId, userId } = req.body;
      
      const eventId = await eventService.emitTaskCompleted(taskId, tenantId, userId);
      
      res.status(201).json({
        success: true,
        data: { eventId, type: 'task.completed', taskId }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

export default router; 
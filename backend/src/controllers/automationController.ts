/**
 * Automation Controller - API endpoints for business rules and automation
 */

import { Request, Response } from 'express';
import { rulesEngine } from '../services/rulesEngine';
import { eventService } from '../services/eventService';

export class AutomationController {
  // Business Rules Management
  public async createRule(req: Request, res: Response): Promise<void> {
    try {
      const ruleData = req.body;
      const tenantId = req.user?.tenant_id || req.body.tenantId;
      const userId = req.user?.id;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      // Validate required fields
      const requiredFields = ['name', 'trigger', 'conditions', 'actions'];
      for (const field of requiredFields) {
        if (!ruleData[field]) {
          res.status(400).json({
            success: false,
            error: `Field '${field}' is required`
          });
          return;
        }
      }

      // Create rule
      const rule = await rulesEngine.createRule({
        ...ruleData,
        tenantId,
        createdBy: userId,
        priority: ruleData.priority || 1,
        isActive: ruleData.isActive !== false
      });

      res.status(201).json({
        success: true,
        data: rule
      });

    } catch (error) {
      console.error('Error creating rule:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  public async updateRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const updates = req.body;
      const userId = req.user?.id;

      if (!ruleId) {
        res.status(400).json({
          success: false,
          error: 'Rule ID is required'
        });
        return;
      }

      // Add updated metadata
      updates.updatedBy = userId;
      updates.updatedAt = new Date();

      const rule = await rulesEngine.updateRule(ruleId, updates);

      res.json({
        success: true,
        data: rule
      });

    } catch (error) {
      console.error('Error updating rule:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  public async deleteRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;

      if (!ruleId) {
        res.status(400).json({
          success: false,
          error: 'Rule ID is required'
        });
        return;
      }

      await rulesEngine.deleteRule(ruleId);

      res.json({
        success: true,
        message: 'Rule deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting rule:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  public async getRules(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      const rules = await rulesEngine.getRules(tenantId);

      res.json({
        success: true,
        data: rules,
        total: rules.length
      });

    } catch (error) {
      console.error('Error fetching rules:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  public async getRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      if (!ruleId) {
        res.status(400).json({
          success: false,
          error: 'Rule ID is required'
        });
        return;
      }

      const rules = await rulesEngine.getRules(tenantId);
      const rule = rules.find(r => r.id === ruleId);

      if (!rule) {
        res.status(404).json({
          success: false,
          error: 'Rule not found'
        });
        return;
      }

      res.json({
        success: true,
        data: rule
      });

    } catch (error) {
      console.error('Error fetching rule:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  public async testRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const { testData } = req.body;
      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      if (!ruleId || !testData) {
        res.status(400).json({
          success: false,
          error: 'Rule ID and test data are required'
        });
        return;
      }

      const rules = await rulesEngine.getRules(tenantId);
      const rule = rules.find(r => r.id === ruleId);

      if (!rule) {
        res.status(404).json({
          success: false,
          error: 'Rule not found'
        });
        return;
      }

      const result = await rulesEngine.testRule(rule, testData);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error testing rule:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  // Event Management
  public async emitEvent(req: Request, res: Response): Promise<void> {
    try {
      const { type, entityType, entityId, data } = req.body;
      const userId = req.user?.id;
      const tenantId = req.user?.tenant_id || data?.tenantId;

      if (!type || !entityType || !entityId || !data) {
        res.status(400).json({
          success: false,
          error: 'Type, entityType, entityId, and data are required'
        });
        return;
      }

      const eventId = await eventService.emitEvent(
        type,
        entityType,
        entityId,
        data,
        userId,
        tenantId
      );

      res.status(201).json({
        success: true,
        data: {
          eventId,
          type,
          entityType,
          entityId,
          timestamp: new Date()
        }
      });

    } catch (error) {
      console.error('Error emitting event:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  public async getEventDefinitions(req: Request, res: Response): Promise<void> {
    try {
      const definitions = eventService.getEventDefinitions();

      res.json({
        success: true,
        data: definitions,
        total: definitions.length
      });

    } catch (error) {
      console.error('Error fetching event definitions:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  public async createEventDefinition(req: Request, res: Response): Promise<void> {
    try {
      const definitionData = req.body;

      const requiredFields = ['type', 'entityType', 'description', 'schema'];
      for (const field of requiredFields) {
        if (!definitionData[field]) {
          res.status(400).json({
            success: false,
            error: `Field '${field}' is required`
          });
          return;
        }
      }

      const definition = await eventService.createEventDefinition(definitionData);

      res.status(201).json({
        success: true,
        data: definition
      });

    } catch (error) {
      console.error('Error creating event definition:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  public async getEventLog(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const filters: any = {
        ...req.query,
        tenantId,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100
      };

      if (filters.startDate) {
        filters.startDate = new Date(filters.startDate as string);
      }

      if (filters.endDate) {
        filters.endDate = new Date(filters.endDate as string);
      }

      const events = await eventService.getEventLog(filters);

      res.json({
        success: true,
        data: events,
        total: events.length
      });

    } catch (error) {
      console.error('Error fetching event log:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  // Subscriptions Management
  public async createSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { eventType, endpoint, filters } = req.body;
      const subscriberId = req.user?.id;

      if (!eventType || !subscriberId) {
        res.status(400).json({
          success: false,
          error: 'Event type and subscriber ID are required'
        });
        return;
      }

      const subscription = await eventService.subscribe(
        eventType,
        subscriberId,
        endpoint,
        filters
      );

      res.status(201).json({
        success: true,
        data: subscription
      });

    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  public async deleteSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;

      if (!subscriptionId) {
        res.status(400).json({
          success: false,
          error: 'Subscription ID is required'
        });
        return;
      }

      await eventService.unsubscribe(subscriptionId);

      res.json({
        success: true,
        message: 'Subscription deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting subscription:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  public async getSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const { eventType } = req.query;
      const subscriptions = eventService.getSubscriptions(eventType as string);

      res.json({
        success: true,
        data: subscriptions,
        total: subscriptions.length
      });

    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  // Metrics and Monitoring
  public async getRulesMetrics(req: Request, res: Response): Promise<void> {
    try {
      const rulesMetrics = rulesEngine.getMetrics();
      const eventMetrics = eventService.getMetrics();
      const activeExecutions = rulesEngine.getActiveExecutions();

      res.json({
        success: true,
        data: {
          rules: rulesMetrics,
          events: eventMetrics,
          activeExecutions: {
            count: activeExecutions.length,
            executions: activeExecutions
          },
          performance: {
            timestamp: new Date(),
            uptime: process.uptime()
          }
        }
      });

    } catch (error) {
      console.error('Error fetching automation metrics:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  public async getAutomationHealth(req: Request, res: Response): Promise<void> {
    try {
      const rulesMetrics = rulesEngine.getMetrics();
      const eventMetrics = eventService.getMetrics();
      const activeExecutions = rulesEngine.getActiveExecutions();

      // Calculate health scores
      const totalExecutions = rulesMetrics.totalExecutions || 0;
      const successfulExecutions = rulesMetrics.successfulExecutions || 0;
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 100;
      
      const avgExecutionTime = rulesMetrics.averageExecutionTime || 0;
      const performanceScore = avgExecutionTime < 500 ? 100 : Math.max(0, 100 - ((avgExecutionTime - 500) / 10));

      const queueSize = eventMetrics.queueSize || 0;
      const queueScore = queueSize < 10 ? 100 : Math.max(0, 100 - ((queueSize - 10) * 5));

      const overallHealth = (successRate + performanceScore + queueScore) / 3;

      res.json({
        success: true,
        data: {
          overall: {
            score: Math.round(overallHealth),
            status: overallHealth >= 90 ? 'excellent' : overallHealth >= 70 ? 'good' : overallHealth >= 50 ? 'fair' : 'poor'
          },
          components: {
            rules: {
              score: Math.round(successRate),
              totalExecutions,
              successfulExecutions,
              failedExecutions: rulesMetrics.failedExecutions || 0,
              averageExecutionTime: avgExecutionTime
            },
            events: {
              score: Math.round(queueScore),
              queueSize,
              isProcessing: eventMetrics.isProcessing,
              eventDefinitions: eventMetrics.eventDefinitions,
              totalSubscriptions: eventMetrics.totalSubscriptions
            },
            performance: {
              score: Math.round(performanceScore),
              averageExecutionTime: avgExecutionTime,
              activeExecutions: activeExecutions.length,
              uptime: process.uptime()
            }
          },
          timestamp: new Date()
        }
      });

    } catch (error) {
      console.error('Error fetching automation health:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  // Utility endpoints
  public async scheduleEvent(req: Request, res: Response): Promise<void> {
    try {
      const { type, entityType, entityId, data, scheduleTime } = req.body;
      const userId = req.user?.id;
      const tenantId = req.user?.tenant_id || data?.tenantId;

      if (!type || !entityType || !entityId || !data || !scheduleTime) {
        res.status(400).json({
          success: false,
          error: 'Type, entityType, entityId, data, and scheduleTime are required'
        });
        return;
      }

      const scheduledEventId = await eventService.scheduleEvent(
        type,
        entityType,
        entityId,
        data,
        new Date(scheduleTime),
        userId,
        tenantId
      );

      res.status(201).json({
        success: true,
        data: {
          scheduledEventId,
          type,
          entityType,
          entityId,
          scheduleTime: new Date(scheduleTime)
        }
      });

    } catch (error) {
      console.error('Error scheduling event:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  // Bulk operations
  public async bulkCreateRules(req: Request, res: Response): Promise<void> {
    try {
      const { rules } = req.body;
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.id;

      if (!Array.isArray(rules) || rules.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Rules array is required and must not be empty'
        });
        return;
      }

      const createdRules = [];
      const errors = [];

      for (let i = 0; i < rules.length; i++) {
        try {
          const rule = await rulesEngine.createRule({
            ...rules[i],
            tenantId,
            createdBy: userId,
            priority: rules[i].priority || 1,
            isActive: rules[i].isActive !== false
          });
          createdRules.push(rule);
        } catch (error) {
          errors.push({
            index: i,
            rule: rules[i],
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      res.status(201).json({
        success: true,
        data: {
          created: createdRules,
          errors,
          summary: {
            total: rules.length,
            successful: createdRules.length,
            failed: errors.length
          }
        }
      });

    } catch (error) {
      console.error('Error bulk creating rules:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  public async exportRules(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const { format = 'json' } = req.query;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      const rules = await rulesEngine.getRules(tenantId);

      if (format === 'csv') {
        // Convert to CSV format
        const csvHeaders = 'ID,Name,Description,Type,Priority,Active,Created At\n';
        const csvRows = rules.map(rule => 
          `"${rule.id}","${rule.name}","${rule.description}","${rule.trigger.type}",${rule.priority},${rule.isActive},"${rule.createdAt}"`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="rules-${tenantId}-${Date.now()}.csv"`);
        res.send(csvHeaders + csvRows);
      } else {
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="rules-${tenantId}-${Date.now()}.json"`);
        res.json({
          export: {
            tenantId,
            timestamp: new Date(),
            version: '1.0',
            count: rules.length
          },
          rules
        });
      }

    } catch (error) {
      console.error('Error exporting rules:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}

export const automationController = new AutomationController(); 
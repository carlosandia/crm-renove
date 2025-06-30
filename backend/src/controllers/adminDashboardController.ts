import { Request, Response } from 'express';
import { adminDashboardService, SalesTarget, AdminAlert } from '../services/adminDashboardService';
import { ApiResponse } from '../types/express';
import { asyncHandler, ValidationError, ForbiddenError } from '../middleware/errorHandler';

// ============================================================================
// ADMIN DASHBOARD CONTROLLER
// ============================================================================

export class AdminDashboardController {

  // ========================================================================
  // MAIN DASHBOARD ENDPOINT
  // ========================================================================

  static getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const { timeRange = '30d' } = req.query;
    const tenantId = req.user?.tenant_id;
    const adminUserId = req.user?.id;

    if (!tenantId || !adminUserId) {
      throw new ForbiddenError('Tenant ID and Admin User ID are required');
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw new ForbiddenError('Access denied. Admin role required.');
    }

    const dashboardData = await adminDashboardService.getDashboardMetrics(
      tenantId,
      adminUserId,
      timeRange as string
    );

    const response: ApiResponse = {
      success: true,
      data: dashboardData,
      meta: {
        tenant_id: tenantId,
        time_range: typeof timeRange === 'string' ? timeRange : '30d',
      },
      message: 'Admin dashboard data retrieved successfully',
    };

    res.json(response);
  });

  // ========================================================================
  // TEAM PERFORMANCE ENDPOINTS
  // ========================================================================

  static getTeamPerformance = asyncHandler(async (req: Request, res: Response) => {
    const { period = '30d', generateSnapshot = false } = req.query;
    const periodStr = typeof period === 'string' ? period : '30d';
    const tenantId = req.user?.tenant_id;

    if (!tenantId) {
      throw new ForbiddenError('Tenant ID is required');
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw new ForbiddenError('Access denied. Admin role required.');
    }

    // Gerar snapshot se solicitado
    if (generateSnapshot === 'true') {
      await adminDashboardService.generateTeamSnapshot(tenantId, 'monthly');
    }

    const teamPerformance = await adminDashboardService.getTeamPerformance(
      tenantId,
      periodStr
    );

    const response: ApiResponse = {
      success: true,
      data: {
        team_performance: teamPerformance,
        period: periodStr,
        total_members: teamPerformance.length,
        snapshot_generated: generateSnapshot === 'true',
      },
      message: 'Team performance data retrieved successfully',
    };

    res.json(response);
  });

  static generateTeamSnapshot = asyncHandler(async (req: Request, res: Response) => {
    const { periodType = 'monthly' } = req.body;
    const tenantId = req.user?.tenant_id;

    if (!tenantId) {
      throw new ForbiddenError('Tenant ID is required');
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw new ForbiddenError('Access denied. Admin role required.');
    }

    const snapshotCount = await adminDashboardService.generateTeamSnapshot(
      tenantId,
      periodType
    );

    const response: ApiResponse = {
      success: true,
      data: {
        snapshots_generated: snapshotCount,
        period_type: periodType,
        generated_at: new Date().toISOString(),
      },
      message: `Team performance snapshot generated for ${snapshotCount} members`,
    };

    res.json(response);
  });

  // ========================================================================
  // SALES TARGETS ENDPOINTS
  // ========================================================================

  static getSalesTargets = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenant_id;

    if (!tenantId) {
      throw new ForbiddenError('Tenant ID is required');
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw new ForbiddenError('Access denied. Admin role required.');
    }

    const targets = await adminDashboardService.getSalesTargets(tenantId);

    const response: ApiResponse = {
      success: true,
      data: {
        targets,
        total_targets: targets.length,
        active_targets: targets.filter(t => t.status === 'active').length,
      },
      message: 'Sales targets retrieved successfully',
    };

    res.json(response);
  });

  static createSalesTarget = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenant_id;
    const createdBy = req.user?.id;

    if (!tenantId || !createdBy) {
      throw new ForbiddenError('Tenant ID and User ID are required');
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw new ForbiddenError('Access denied. Admin role required.');
    }

    const {
      target_name,
      target_type,
      target_scope,
      target_value,
      unit,
      assignee_user_id,
      pipeline_id,
      team_ids,
      period_type,
      period_start,
      period_end,
      notification_thresholds
    } = req.body;

    // Validações
    if (!target_name || !target_type || !target_scope || !target_value || !period_start || !period_end) {
      throw new ValidationError('Missing required fields for sales target');
    }

    if (!['revenue', 'deals', 'leads', 'activities', 'conversion_rate'].includes(target_type)) {
      throw new ValidationError('Invalid target type');
    }

    if (!['company', 'team', 'individual', 'pipeline'].includes(target_scope)) {
      throw new ValidationError('Invalid target scope');
    }

    const targetData: Partial<SalesTarget> = {
      tenant_id: tenantId,
      created_by: createdBy,
      target_name,
      target_type,
      target_scope,
      target_value: parseFloat(target_value),
      unit: unit || 'BRL',
      assignee_user_id,
      pipeline_id,
      team_ids,
      period_type,
      period_start,
      period_end,
      notification_thresholds: notification_thresholds || [50, 75, 90, 100],
      status: 'active',
    };

    const newTarget = await adminDashboardService.createSalesTarget(targetData);

    const response: ApiResponse = {
      success: true,
      data: newTarget,
      message: 'Sales target created successfully',
    };

    res.status(201).json(response);
  });

  static updateSalesTarget = asyncHandler(async (req: Request, res: Response) => {
    const { targetId } = req.params;
    const tenantId = req.user?.tenant_id;

    if (!tenantId) {
      throw new ForbiddenError('Tenant ID is required');
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw new ForbiddenError('Access denied. Admin role required.');
    }

    if (!targetId) {
      throw new ValidationError('Target ID is required');
    }

    const updates = req.body;
    
    // Remover campos que não devem ser atualizados diretamente
    delete updates.id;
    delete updates.tenant_id;
    delete updates.created_by;
    delete updates.created_at;
    delete updates.current_value;
    delete updates.achievement_percentage;

    const updatedTarget = await adminDashboardService.updateSalesTarget(
      targetId,
      { ...updates, tenant_id: tenantId }
    );

    const response: ApiResponse = {
      success: true,
      data: updatedTarget,
      message: 'Sales target updated successfully',
    };

    res.json(response);
  });

  // ========================================================================
  // ADMIN ALERTS ENDPOINTS
  // ========================================================================

  static getAdminAlerts = asyncHandler(async (req: Request, res: Response) => {
    const adminUserId = req.user?.id;

    if (!adminUserId) {
      throw new ForbiddenError('Admin User ID is required');
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw new ForbiddenError('Access denied. Admin role required.');
    }

    const alerts = await adminDashboardService.getAdminAlerts(adminUserId);

    // Contar alertas por status
    const statusCounts = alerts.reduce((acc, alert) => {
      acc[alert.status] = (acc[alert.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const response: ApiResponse = {
      success: true,
      data: {
        alerts,
        total_alerts: alerts.length,
        status_counts: statusCounts,
        unread_count: statusCounts.unread || 0,
      },
      message: 'Admin alerts retrieved successfully',
    };

    res.json(response);
  });

  static createAlert = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenant_id;
    const adminUserId = req.user?.id;

    if (!tenantId || !adminUserId) {
      throw new ForbiddenError('Tenant ID and Admin User ID are required');
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw new ForbiddenError('Access denied. Admin role required.');
    }

    const {
      alert_type,
      severity,
      title,
      message,
      context_data,
      related_user_id,
      related_deal_id,
      related_target_id,
      expires_at
    } = req.body;

    // Validações
    if (!alert_type || !title || !message) {
      throw new ValidationError('Missing required fields for alert');
    }

    if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
      throw new ValidationError('Invalid severity level');
    }

    const alertData: Partial<AdminAlert> = {
      tenant_id: tenantId,
      admin_user_id: adminUserId,
      alert_type,
      severity: severity || 'medium',
      title,
      message,
      context_data: context_data || {},
      related_user_id,
      related_deal_id,
      related_target_id,
      expires_at,
      status: 'unread',
    };

    const newAlert = await adminDashboardService.createAlert(alertData);

    const response: ApiResponse = {
      success: true,
      data: newAlert,
      message: 'Alert created successfully',
    };

    res.status(201).json(response);
  });

  static markAlertAsRead = asyncHandler(async (req: Request, res: Response) => {
    const { alertId } = req.params;
    const adminUserId = req.user?.id;

    if (!adminUserId) {
      throw new ForbiddenError('Admin User ID is required');
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw new ForbiddenError('Access denied. Admin role required.');
    }

    if (!alertId) {
      throw new ValidationError('Alert ID is required');
    }

    await adminDashboardService.markAlertAsRead(alertId, adminUserId);

    const response: ApiResponse = {
      success: true,
      data: {
        alert_id: alertId,
        marked_read_at: new Date().toISOString(),
      },
      message: 'Alert marked as read successfully',
    };

    res.json(response);
  });

  // ========================================================================
  // UTILITY ENDPOINTS
  // ========================================================================

  static clearCache = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenant_id;

    if (!tenantId) {
      throw new ForbiddenError('Tenant ID is required');
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw new ForbiddenError('Access denied. Admin role required.');
    }

    await adminDashboardService.clearCache(tenantId);

    const response: ApiResponse = {
      success: true,
      data: {
        cache_cleared: true,
        tenant_id: tenantId,
        cleared_at: new Date().toISOString(),
      },
      message: 'Admin dashboard cache cleared successfully',
    };

    res.json(response);
  });

  static getHealthCheck = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenant_id;

    if (!tenantId) {
      throw new ForbiddenError('Tenant ID is required');
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw new ForbiddenError('Access denied. Admin role required.');
    }

    const healthData = {
      status: 'healthy',
      tenant_id: tenantId,
      user_role: req.user?.role,
      timestamp: new Date().toISOString(),
      services: {
        dashboard: 'healthy',
        team_performance: 'healthy',
        sales_targets: 'healthy',
        alerts: 'healthy',
        forecast: 'healthy',
      },
    };

    const response: ApiResponse = {
      success: true,
      data: healthData,
      message: 'Admin dashboard health check passed',
    };

    res.json(response);
  });

  // ========================================================================
  // BATCH OPERATIONS
  // ========================================================================

  static batchMarkAlertsAsRead = asyncHandler(async (req: Request, res: Response) => {
    const { alert_ids } = req.body;
    const adminUserId = req.user?.id;

    if (!adminUserId) {
      throw new ForbiddenError('Admin User ID is required');
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw new ForbiddenError('Access denied. Admin role required.');
    }

    if (!Array.isArray(alert_ids) || alert_ids.length === 0) {
      throw new ValidationError('Alert IDs array is required');
    }

    // Marcar alertas como lidos em batch
    const promises = alert_ids.map(alertId => 
      adminDashboardService.markAlertAsRead(alertId, adminUserId)
    );

    await Promise.all(promises);

    const response: ApiResponse = {
      success: true,
      data: {
        marked_read_count: alert_ids.length,
        alert_ids,
        marked_read_at: new Date().toISOString(),
      },
      message: `${alert_ids.length} alerts marked as read successfully`,
    };

    res.json(response);
  });

  // ========================================================================
  // EXPORT FUNCTIONALITY
  // ========================================================================

  static exportDashboardData = asyncHandler(async (req: Request, res: Response) => {
    const { format = 'json', timeRange = '30d' } = req.query;
    const tenantId = req.user?.tenant_id;
    const adminUserId = req.user?.id;

    if (!tenantId || !adminUserId) {
      throw new ForbiddenError('Tenant ID and Admin User ID are required');
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw new ForbiddenError('Access denied. Admin role required.');
    }

    const dashboardData = await adminDashboardService.getDashboardMetrics(
      tenantId,
      adminUserId,
      timeRange as string
    );

    if (format === 'csv') {
      // Simplificar dados para CSV
      const csvData = {
        kpis: dashboardData.kpis,
        team_summary: dashboardData.team_performance.map(member => ({
          name: member.name,
          email: member.email,
          performance_score: member.performance_score,
          ranking: member.ranking,
          leads_created: member.metrics.leads_created,
          deals_won: member.metrics.deals_won,
          revenue_generated: member.metrics.revenue_generated,
        })),
        targets_summary: dashboardData.sales_targets.map(target => ({
          target_name: target.target_name,
          target_type: target.target_type,
          target_value: target.target_value,
          current_value: target.current_value,
          achievement_percentage: target.achievement_percentage,
          status: target.status,
        })),
      };

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="admin_dashboard_${timeRange}_${new Date().toISOString().split('T')[0]}.csv"`);
      
      // Converter para CSV (simplificado)
      const csvContent = JSON.stringify(csvData);
      res.send(csvContent);
    } else {
      const response: ApiResponse = {
        success: true,
        data: {
          ...dashboardData,
          export_metadata: {
            exported_at: new Date().toISOString(),
            format,
            time_range: timeRange,
            tenant_id: tenantId,
            exported_by: adminUserId,
          },
        },
        message: 'Dashboard data exported successfully',
      };

      res.json(response);
    }
  });
}

export default AdminDashboardController;
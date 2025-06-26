import { Router } from 'express';
import { AdminDashboardController } from '../controllers/adminDashboardController';
import { requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import rateLimit from 'express-rate-limit';

const router = Router();

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Rate limiting para endpoints administrativos
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por janela
  message: 'Too many admin requests, please try again later'
});

// Rate limiting para operações que consomem mais recursos
const heavyOperationLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // 10 requests por janela
  message: 'Too many heavy operations, please try again later'
});

// ============================================================================
// MAIN DASHBOARD ROUTES
// ============================================================================

/**
 * GET /api/admin-dashboard - Dashboard principal do admin
 * Retorna métricas completas incluindo KPIs, trends, team performance, metas e alertas
 */
router.get('/',
  adminRateLimit,
  requireRole(['admin', 'super_admin']),
  AdminDashboardController.getDashboard
);

/**
 * GET /api/admin-dashboard/health - Health check do dashboard
 */
router.get('/health',
  requireRole(['admin', 'super_admin']),
  AdminDashboardController.getHealthCheck
);

/**
 * POST /api/admin-dashboard/cache/clear - Limpar cache do dashboard
 */
router.post('/cache/clear',
  requireRole(['admin', 'super_admin']),
  AdminDashboardController.clearCache
);

/**
 * GET /api/admin-dashboard/export - Exportar dados do dashboard
 */
router.get('/export',
  heavyOperationLimit,
  requireRole(['admin', 'super_admin']),
  AdminDashboardController.exportDashboardData
);

// ============================================================================
// TEAM PERFORMANCE ROUTES
// ============================================================================

/**
 * GET /api/admin-dashboard/team-performance - Performance da equipe
 */
router.get('/team-performance',
  adminRateLimit,
  requireRole(['admin', 'super_admin']),
  AdminDashboardController.getTeamPerformance
);

/**
 * POST /api/admin-dashboard/team-performance/snapshot - Gerar snapshot de performance
 */
router.post('/team-performance/snapshot',
  heavyOperationLimit,
  requireRole(['admin', 'super_admin']),
  AdminDashboardController.generateTeamSnapshot
);

// ============================================================================
// SALES TARGETS ROUTES
// ============================================================================

/**
 * GET /api/admin-dashboard/sales-targets - Listar metas de vendas
 */
router.get('/sales-targets',
  adminRateLimit,
  requireRole(['admin', 'super_admin']),
  AdminDashboardController.getSalesTargets
);

/**
 * POST /api/admin-dashboard/sales-targets - Criar nova meta de vendas
 */
router.post('/sales-targets',
  adminRateLimit,
  requireRole(['admin', 'super_admin']),
  AdminDashboardController.createSalesTarget
);

/**
 * PUT /api/admin-dashboard/sales-targets/:targetId - Atualizar meta de vendas
 */
router.put('/sales-targets/:targetId',
  adminRateLimit,
  requireRole(['admin', 'super_admin']),
  AdminDashboardController.updateSalesTarget
);

// ============================================================================
// ADMIN ALERTS ROUTES
// ============================================================================

/**
 * GET /api/admin-dashboard/alerts - Listar alertas do admin
 */
router.get('/alerts',
  adminRateLimit,
  requireRole(['admin', 'super_admin']),
  AdminDashboardController.getAdminAlerts
);

/**
 * POST /api/admin-dashboard/alerts - Criar novo alerta
 */
router.post('/alerts',
  adminRateLimit,
  requireRole(['admin', 'super_admin']),
  AdminDashboardController.createAlert
);

/**
 * PUT /api/admin-dashboard/alerts/:alertId/read - Marcar alerta como lido
 */
router.put('/alerts/:alertId/read',
  adminRateLimit,
  requireRole(['admin', 'super_admin']),
  AdminDashboardController.markAlertAsRead
);

/**
 * POST /api/admin-dashboard/alerts/batch/read - Marcar múltiplos alertas como lidos
 */
router.post('/alerts/batch/read',
  adminRateLimit,
  requireRole(['admin', 'super_admin']),
  AdminDashboardController.batchMarkAlertsAsRead
);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Middleware para tratar erros específicos das rotas administrativas
router.use((error: any, req: any, res: any, next: any) => {
  // Log detalhado para erros administrativos
  console.error('Admin Dashboard Route Error:', {
    url: req.url,
    method: req.method,
    user: req.user?.id,
    tenant: req.user?.tenant_id,
    error: error.message,
    stack: error.stack
  });

  // Passar para o handler geral de erros
  next(error);
});

export default router; 
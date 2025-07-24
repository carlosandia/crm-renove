/**
 * FASE 3: ANALYTICS & REPORTING SYSTEM
 * Analytics Routes - Rotas para APIs de analytics enterprise-grade
 * 
 * Endpoints REST comparáveis ao:
 * - HubSpot Analytics API
 * - Salesforce Analytics API  
 * - Pipedrive Insights API
 */

import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
// import { authMiddleware } from '../middleware/authMiddleware'; // Temporarily disabled
import { cacheMiddleware } from '../middleware/cacheMiddleware';

const router = Router();

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Aplicar autenticação a todas as rotas de analytics
// router.use(authMiddleware); // Temporarily disabled

// ============================================================================
// CORE ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/analytics/dashboard
 * Retorna métricas completas do dashboard executivo
 * 
 * Query Parameters:
 * - start_date: string (YYYY-MM-DD) - Data de início
 * - end_date: string (YYYY-MM-DD) - Data de fim  
 * - period_type: 'day' | 'week' | 'month' | 'quarter' | 'year'
 * - comparison_period: 'previous' | 'year_ago'
 * 
 * Response: DashboardMetrics com KPIs, trends, comparações e team performance
 */
router.get('/dashboard', 
  // cacheMiddleware.dashboardCache,
  analyticsController.getDashboard
);

/**
 * GET /api/analytics/forecast
 * Gera previsões de vendas baseadas em algoritmos ML
 * 
 * Query Parameters:
 * - forecast_type: 'linear' | 'exponential' | 'seasonal' (default: 'linear')
 * - periods: number (1-24, default: 6) - Número de períodos para prever
 * 
 * Response: ForecastData com previsões, métricas de precisão e dados históricos
 */
router.get('/forecast',
  // cacheMiddleware.forecastCache,
  analyticsController.getForecast
);

/**
 * GET /api/analytics/funnel
 * Análise detalhada do funil de conversão
 * 
 * Query Parameters:
 * - start_date: string (YYYY-MM-DD) - Data de início
 * - end_date: string (YYYY-MM-DD) - Data de fim
 * 
 * Response: ConversionFunnel com estágios, métricas e recomendações
 */
router.get('/funnel',
  // cacheMiddleware.funnelCache,
  analyticsController.getConversionFunnel
);

/**
 * GET /api/analytics/team
 * Performance detalhada da equipe de vendas
 * 
 * Query Parameters:
 * - start_date: string (YYYY-MM-DD) - Data de início
 * - end_date: string (YYYY-MM-DD) - Data de fim
 * 
 * Response: Array de TeamMember com métricas individuais e ranking
 */
router.get('/team',
  // cacheMiddleware.teamCache,
  analyticsController.getTeamPerformance
);

/**
 * GET /api/analytics/realtime
 * Métricas em tempo real para dashboards live
 * 
 * Response: Métricas do dia atual com timestamp de atualização
 */
router.get('/realtime',
  analyticsController.getRealTimeMetrics
);

// ============================================================================
// ADVANCED ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/analytics/lead-sources
 * Análise de fontes de leads e performance por canal
 */
router.get('/lead-sources', async (req, res) => {
  try {
    // Mock data para demonstração
    const leadSources = {
      channels: [
        { name: 'Website', leads: 150, conversions: 23, conversion_rate: 15.3, cost_per_lead: 45 },
        { name: 'Facebook Ads', leads: 89, conversions: 12, conversion_rate: 13.5, cost_per_lead: 67 },
        { name: 'Google Ads', leads: 67, conversions: 15, conversion_rate: 22.4, cost_per_lead: 89 },
        { name: 'Referral', leads: 34, conversions: 8, conversion_rate: 23.5, cost_per_lead: 0 },
        { name: 'Email Marketing', leads: 45, conversions: 6, conversion_rate: 13.3, cost_per_lead: 12 },
      ],
      summary: {
        total_leads: 385,
        total_conversions: 64,
        overall_conversion_rate: 16.6,
        best_performing_channel: 'Referral',
        most_cost_effective: 'Email Marketing'
      }
    };

    res.json({
      success: true,
      data: leadSources,
      message: 'Lead sources analysis retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve lead sources analysis'
    });
  }
});

/**
 * GET /api/analytics/pipeline
 * Análise detalhada do pipeline de vendas
 */
router.get('/pipeline', async (req, res) => {
  try {
    // Mock data para demonstração
    const pipelineAnalysis = {
      stages: [
        { name: 'Lead', count: 150, value: 750000, avg_time_days: 2 },
        { name: 'Qualified', count: 89, value: 445000, avg_time_days: 5 },
        { name: 'Proposal', count: 45, value: 225000, avg_time_days: 8 },
        { name: 'Negotiation', count: 23, value: 115000, avg_time_days: 12 },
        { name: 'Ganho', count: 12, value: 60000, avg_time_days: 0 }
      ],
      metrics: {
        total_pipeline_value: 1595000,
        weighted_pipeline_value: 478500,
        avg_deal_size: 5000,
        avg_sales_cycle: 27,
        win_rate: 13.5,
        velocity: 1851 // deals per day
      },
      trends: {
        pipeline_growth: 12.5,
        velocity_change: 8.3,
        win_rate_change: -2.1
      }
    };

    res.json({
      success: true,
      data: pipelineAnalysis,
      message: 'Pipeline analysis retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pipeline analysis'
    });
  }
});

/**
 * GET /api/analytics/revenue
 * Análise detalhada de receita e atribuição
 */
router.get('/revenue', async (req, res) => {
  try {
    // Mock data para demonstração
    const revenueAnalysis = {
      current_period: {
        total_revenue: 125000,
        recurring_revenue: 89000,
        new_revenue: 36000,
        growth_rate: 15.2
      },
      attribution: [
        { channel: 'Direct Sales', revenue: 45000, percentage: 36 },
        { channel: 'Inbound Marketing', revenue: 35000, percentage: 28 },
        { channel: 'Partner Referrals', revenue: 25000, percentage: 20 },
        { channel: 'Outbound Sales', revenue: 20000, percentage: 16 }
      ],
      forecasted_revenue: {
        next_month: 138000,
        next_quarter: 425000,
        confidence_level: 82
      },
      trends: [
        { month: '2024-10', revenue: 98000 },
        { month: '2024-11', revenue: 108000 },
        { month: '2024-12', revenue: 115000 },
        { month: '2025-01', revenue: 125000 }
      ]
    };

    res.json({
      success: true,
      data: revenueAnalysis,
      message: 'Revenue analysis retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve revenue analysis'
    });
  }
});

/**
 * GET /api/analytics/activities
 * Análise de atividades de vendas e produtividade
 */
router.get('/activities', async (req, res) => {
  try {
    // Mock data para demonstração
    const activitiesAnalysis = {
      summary: {
        total_activities: 1247,
        calls_made: 456,
        emails_sent: 523,
        meetings_held: 89,
        tasks_completed: 179
      },
      productivity: {
        activities_per_rep: 156,
        conversion_rate_by_activity: {
          calls: 8.5,
          emails: 3.2,
          meetings: 45.6,
          tasks: 12.3
        }
      },
      trends: {
        activity_growth: 23.4,
        quality_score: 78,
        best_performing_activity: 'meetings'
      },
      by_team_member: [
        { name: 'João Silva', activities: 234, conversion_rate: 18.5 },
        { name: 'Maria Santos', activities: 198, conversion_rate: 22.1 },
        { name: 'Pedro Costa', activities: 187, conversion_rate: 15.8 }
      ]
    };

    res.json({
      success: true,
      data: activitiesAnalysis,
      message: 'Activities analysis retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve activities analysis'
    });
  }
});

// ============================================================================
// EXPORT & REPORTING ENDPOINTS
// ============================================================================

/**
 * POST /api/analytics/export
 * Gera e exporta relatórios em múltiplos formatos
 * 
 * Body:
 * - format: 'csv' | 'pdf' | 'excel'
 * - report_type: 'dashboard' | 'forecast' | 'funnel' | 'team'
 * - filters: object (opcional)
 */
router.post('/export',
  analyticsController.exportReport
);

/**
 * GET /api/analytics/download/:exportId
 * Download de relatórios exportados
 */
router.get('/download/:exportId', async (req, res) => {
  try {
    const { exportId } = req.params;
    
    // Mock response para demonstração
    // Em produção, buscaria o arquivo real do storage
    res.json({
      success: true,
      data: {
        export_id: exportId,
        status: 'ready',
        download_url: `/files/exports/${exportId}.csv`,
        file_size: 2048,
        created_at: new Date().toISOString()
      },
      message: 'Export file ready for download'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve export file'
    });
  }
});

// ============================================================================
// SYSTEM & HEALTH ENDPOINTS
// ============================================================================

/**
 * GET /api/analytics/health
 * Health check do sistema de analytics
 */
router.get('/health',
  analyticsController.getHealthCheck
);

/**
 * GET /api/analytics/config
 * Configurações disponíveis do sistema de analytics
 */
router.get('/config', async (req, res) => {
  try {
    const config = {
      available_metrics: [
        'total_leads', 'qualified_leads', 'converted_leads', 'conversion_rate',
        'avg_deal_value', 'pipeline_value', 'monthly_revenue', 'pipeline_velocity'
      ],
      forecast_types: ['linear', 'exponential', 'seasonal'],
      export_formats: ['csv', 'pdf', 'excel'],
      max_forecast_periods: 24,
      cache_ttl: {
        dashboard: 300,
        forecast: 1800,
        funnel: 300,
        team: 300
      },
      rate_limits: {
        dashboard: 100,
        forecast: 20,
        export: 10
      }
    };

    res.json({
      success: true,
      data: config,
      message: 'Analytics configuration retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics configuration'
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Middleware de tratamento de erros específico para analytics
router.use((error: any, req: any, res: any, next: any) => {
  console.error('Analytics API Error:', error);

  // Erros específicos de analytics
  if (error.message.includes('insufficient data')) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient data for analytics calculation',
      error_code: 'INSUFFICIENT_DATA',
      suggestion: 'Try a different time range or ensure you have enough lead data'
    });
  }

  if (error.message.includes('cache')) {
    return res.status(503).json({
      success: false,
      message: 'Analytics caching service temporarily unavailable',
      error_code: 'CACHE_UNAVAILABLE',
      suggestion: 'Please try again in a few moments'
    });
  }

  // Erro genérico
  return res.status(500).json({
    success: false,
    message: 'Internal analytics service error',
    error_code: 'ANALYTICS_ERROR',
    suggestion: 'Please contact support if the issue persists'
  });
});

export default router; 
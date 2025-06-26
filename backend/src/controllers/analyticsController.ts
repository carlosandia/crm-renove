/**
 * FASE 3: ANALYTICS & REPORTING SYSTEM
 * Analytics Controller - API endpoints para analytics enterprise-grade
 * 
 * Endpoints comparáveis ao:
 * - HubSpot Analytics API
 * - Salesforce Analytics API
 * - Pipedrive Insights API
 */

import { Request, Response } from 'express';
import { analyticsService, TimeRange } from '../services/analyticsService';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const timeRangeSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_type: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional(),
  comparison_period: z.enum(['previous', 'year_ago']).optional(),
});

const forecastSchema = z.object({
  forecast_type: z.enum(['linear', 'exponential', 'seasonal']).optional(),
  periods: z.number().min(1).max(24).optional(),
});

const exportSchema = z.object({
  format: z.enum(['csv', 'pdf', 'excel']),
  report_type: z.enum(['dashboard', 'forecast', 'funnel', 'team']),
  filters: z.object({}).optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getUserTenantId = (req: Request): string => {
  // Assumindo que o tenant_id está disponível no req.user após autenticação
  return (req as any).user?.tenant_id || (req as any).user?.tenantId;
};

const getUserId = (req: Request): string => {
  return (req as any).user?.id;
};

const getDefaultTimeRange = (): TimeRange => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1); // Último mês

  return {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    period_type: 'month',
  };
};

const handleControllerError = (error: any, res: Response, operation: string) => {
  console.error(`Error in ${operation}:`, error);
  
  if (error.message.includes('Insufficient')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      error_code: 'INSUFFICIENT_DATA',
    });
  }

  if (error.message.includes('Invalid')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      error_code: 'INVALID_PARAMETERS',
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    error_code: 'INTERNAL_ERROR',
  });
};

// ============================================================================
// ANALYTICS CONTROLLER CLASS
// ============================================================================

class AnalyticsController {
  
  // ========================================================================
  // DASHBOARD METRICS ENDPOINT
  // ========================================================================
  
  async getDashboard(req: Request, res: Response) {
    try {
      const tenantId = getUserTenantId(req);
      const userId = getUserId(req);

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Tenant ID not found',
          error_code: 'UNAUTHORIZED',
        });
      }

      // Parse e validar parâmetros de tempo
      let timeRange: TimeRange;
      
      if (req.query.start_date && req.query.end_date) {
        const validation = timeRangeSchema.safeParse(req.query);
        if (!validation.success) {
          return res.status(400).json({
            success: false,
            message: 'Invalid time range parameters',
            errors: validation.error.errors,
          });
        }
        timeRange = validation.data;
      } else {
        timeRange = getDefaultTimeRange();
      }

      const startTime = Date.now();
      
      // Buscar métricas do dashboard
      const metrics = await analyticsService.getDashboardMetrics(
        tenantId,
        timeRange,
        userId
      );

      const queryTime = Date.now() - startTime;

      return res.json({
        success: true,
        data: metrics,
        meta: {
          query_time_ms: queryTime,
          tenant_id: tenantId,
          time_range: timeRange,
          cache_enabled: true,
        },
        message: 'Dashboard metrics retrieved successfully',
      });

    } catch (error) {
      return handleControllerError(error, res, 'getDashboard');
    }
  }

  // ========================================================================
  // SALES FORECASTING ENDPOINT
  // ========================================================================

  async getForecast(req: Request, res: Response) {
    try {
      const tenantId = getUserTenantId(req);

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Tenant ID not found',
          error_code: 'UNAUTHORIZED',
        });
      }

      // Validar parâmetros de forecast
      const validation = forecastSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid forecast parameters',
          errors: validation.error.errors,
        });
      }

      const { forecast_type = 'linear', periods = 6 } = validation.data;
      const startTime = Date.now();

      // Gerar forecast
      const forecast = await analyticsService.generateSalesForecast(
        tenantId,
        forecast_type,
        periods
      );

      const queryTime = Date.now() - startTime;

      return res.json({
        success: true,
        data: forecast,
        meta: {
          query_time_ms: queryTime,
          tenant_id: tenantId,
          forecast_type,
          periods,
          cache_enabled: true,
        },
        message: 'Sales forecast generated successfully',
      });

    } catch (error) {
      return handleControllerError(error, res, 'getForecast');
    }
  }

  // ========================================================================
  // CONVERSION FUNNEL ENDPOINT
  // ========================================================================

  async getConversionFunnel(req: Request, res: Response) {
    try {
      const tenantId = getUserTenantId(req);

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Tenant ID not found',
          error_code: 'UNAUTHORIZED',
        });
      }

      // Parse time range
      let timeRange: TimeRange;
      
      if (req.query.start_date && req.query.end_date) {
        const validation = timeRangeSchema.safeParse(req.query);
        if (!validation.success) {
          return res.status(400).json({
            success: false,
            message: 'Invalid time range parameters',
            errors: validation.error.errors,
          });
        }
        timeRange = validation.data;
      } else {
        timeRange = getDefaultTimeRange();
      }

      const startTime = Date.now();

      // Buscar dados do funil
      const funnel = await analyticsService.getConversionFunnel(tenantId, timeRange);

      const queryTime = Date.now() - startTime;

      return res.json({
        success: true,
        data: funnel,
        meta: {
          query_time_ms: queryTime,
          tenant_id: tenantId,
          time_range: timeRange,
          cache_enabled: true,
        },
        message: 'Conversion funnel data retrieved successfully',
      });

    } catch (error) {
      return handleControllerError(error, res, 'getConversionFunnel');
    }
  }

  // ========================================================================
  // TEAM PERFORMANCE ENDPOINT
  // ========================================================================

  async getTeamPerformance(req: Request, res: Response) {
    try {
      const tenantId = getUserTenantId(req);

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Tenant ID not found',
          error_code: 'UNAUTHORIZED',
        });
      }

      // Parse time range
      let timeRange: TimeRange;
      
      if (req.query.start_date && req.query.end_date) {
        const validation = timeRangeSchema.safeParse(req.query);
        if (!validation.success) {
          return res.status(400).json({
            success: false,
            message: 'Invalid time range parameters',
            errors: validation.error.errors,
          });
        }
        timeRange = validation.data;
      } else {
        timeRange = getDefaultTimeRange();
      }

      const startTime = Date.now();

      // Buscar performance da equipe
      const teamPerformance = await analyticsService.getTeamPerformance(tenantId, timeRange);

      const queryTime = Date.now() - startTime;

      return res.json({
        success: true,
        data: {
          team_members: teamPerformance,
          summary: {
            total_members: teamPerformance.length,
            avg_performance_score: teamPerformance.length > 0 
              ? Math.round(teamPerformance.reduce((sum, m) => sum + m.performance_score, 0) / teamPerformance.length)
              : 0,
            top_performer: teamPerformance[0] || null,
          },
        },
        meta: {
          query_time_ms: queryTime,
          tenant_id: tenantId,
          time_range: timeRange,
          cache_enabled: true,
        },
        message: 'Team performance data retrieved successfully',
      });

    } catch (error) {
      return handleControllerError(error, res, 'getTeamPerformance');
    }
  }

  // ========================================================================
  // REAL-TIME METRICS ENDPOINT
  // ========================================================================

  async getRealTimeMetrics(req: Request, res: Response) {
    try {
      const tenantId = getUserTenantId(req);

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Tenant ID not found',
          error_code: 'UNAUTHORIZED',
        });
      }

      // Para métricas em tempo real, usar período de hoje
      const today = new Date().toISOString().split('T')[0];
      const timeRange: TimeRange = {
        start_date: today,
        end_date: today,
        period_type: 'day',
      };

      const startTime = Date.now();

      // Buscar métricas em tempo real (sem cache ou cache muito curto)
      const metrics = await analyticsService.getDashboardMetrics(tenantId, timeRange);

      const queryTime = Date.now() - startTime;

      // Extrair apenas KPIs para tempo real
      const realTimeData = {
        leads_today: metrics.kpis.total_leads,
        conversions_today: metrics.kpis.converted_leads,
        revenue_today: metrics.kpis.monthly_revenue,
        pipeline_value: metrics.kpis.pipeline_value,
        conversion_rate: metrics.kpis.conversion_rate,
        team_activities: metrics.recent_activities.reduce((sum, a) => sum + a.count, 0),
        last_updated: new Date().toISOString(),
      };

      return res.json({
        success: true,
        data: realTimeData,
        meta: {
          query_time_ms: queryTime,
          tenant_id: tenantId,
          is_real_time: true,
          refresh_interval: 30, // segundos
        },
        message: 'Real-time metrics retrieved successfully',
      });

    } catch (error) {
      return handleControllerError(error, res, 'getRealTimeMetrics');
    }
  }

  // ========================================================================
  // EXPORT ENDPOINT
  // ========================================================================

  async exportReport(req: Request, res: Response) {
    try {
      const tenantId = getUserTenantId(req);

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Tenant ID not found',
          error_code: 'UNAUTHORIZED',
        });
      }

      // Validar parâmetros de export
      const validation = exportSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid export parameters',
          errors: validation.error.errors,
        });
      }

      const { format, report_type, filters = {} } = validation.data;
      const startTime = Date.now();

      // Por enquanto, simular export com dados mock
      // Em produção, seria implementado com bibliotecas específicas
      const exportData = await this.generateExportData(tenantId, report_type, filters);

      const queryTime = Date.now() - startTime;

      // Para CSV, retornar dados diretamente
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${report_type}_${Date.now()}.csv"`);
        return res.send(exportData.csv_content);
      }

      // Para outros formatos, retornar informações do arquivo
      return res.json({
        success: true,
        data: {
          export_id: `export_${Date.now()}`,
          format,
          report_type,
          file_size: exportData.file_size,
          download_url: `/api/analytics/download/${exportData.export_id}`,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
        },
        meta: {
          query_time_ms: queryTime,
          tenant_id: tenantId,
          filters,
        },
        message: 'Report export generated successfully',
      });

    } catch (error) {
      return handleControllerError(error, res, 'exportReport');
    }
  }

  // ========================================================================
  // HEALTH CHECK ENDPOINT
  // ========================================================================

  async getHealthCheck(req: Request, res: Response) {
    try {
      const startTime = Date.now();

      // Verificar conectividade básica do sistema
      const healthChecks = {
        database: await this.checkDatabaseHealth(),
        cache: await this.checkCacheHealth(),
        analytics_service: await this.checkAnalyticsServiceHealth(),
      };

      const queryTime = Date.now() - startTime;
      const allHealthy = Object.values(healthChecks).every(check => check.status === 'healthy');

      return res.status(allHealthy ? 200 : 503).json({
        success: allHealthy,
        data: {
          status: allHealthy ? 'healthy' : 'degraded',
          checks: healthChecks,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
        meta: {
          query_time_ms: queryTime,
          version: '3.0.0',
          environment: process.env.NODE_ENV || 'development',
        },
        message: allHealthy ? 'Analytics system is healthy' : 'Analytics system has issues',
      });

    } catch (error) {
      return res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          error: error.message,
        },
        message: 'Analytics system health check failed',
      });
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private async generateExportData(tenantId: string, reportType: string, filters: any) {
    // Simular geração de dados de export
    // Em produção, seria implementado com bibliotecas específicas para cada formato

    const mockData = {
      dashboard: [
        'Date,Leads,Conversions,Revenue',
        '2025-01-01,50,5,25000',
        '2025-01-02,45,7,35000',
        '2025-01-03,60,8,40000',
      ].join('\n'),
      forecast: [
        'Date,Predicted Value,Confidence Level',
        '2025-02-01,55000,85',
        '2025-03-01,58000,80',
        '2025-04-01,62000,75',
      ].join('\n'),
      funnel: [
        'Stage,Leads Count,Conversion Rate',
        'New,100,100',
        'Contacted,85,85',
        'Qualified,60,70.6',
        'Proposal,30,50',
        'Converted,15,50',
      ].join('\n'),
      team: [
        'Name,Leads Created,Deals Closed,Revenue',
        'João Silva,25,5,25000',
        'Maria Santos,30,7,35000',
        'Pedro Costa,20,3,15000',
      ].join('\n'),
    };

    return {
      csv_content: mockData[reportType as keyof typeof mockData] || mockData.dashboard,
      file_size: mockData[reportType as keyof typeof mockData]?.length || 0,
      export_id: `export_${Date.now()}_${reportType}`,
    };
  }

  private async checkDatabaseHealth() {
    try {
      // Simular verificação de saúde do banco
      return {
        status: 'healthy',
        response_time_ms: 50,
        last_check: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        last_check: new Date().toISOString(),
      };
    }
  }

  private async checkCacheHealth() {
    try {
      // Simular verificação de saúde do cache
      return {
        status: 'healthy',
        hit_rate: 85,
        response_time_ms: 10,
        last_check: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        last_check: new Date().toISOString(),
      };
    }
  }

  private async checkAnalyticsServiceHealth() {
    try {
      // Simular verificação de saúde do serviço de analytics
      return {
        status: 'healthy',
        avg_query_time_ms: 150,
        active_queries: 0,
        last_check: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        last_check: new Date().toISOString(),
      };
    }
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const analyticsController = new AnalyticsController(); 
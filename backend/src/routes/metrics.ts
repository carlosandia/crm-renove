/**
 * METRICS ROUTES - Rotas para APIs de métricas enterprise
 * 
 * Endpoints para suporte aos hooks useEnterpriseMetrics:
 * - GET /api/metrics/enterprise - Métricas básicas enterprise
 * - GET /api/metrics/filters - Filtros disponíveis para métricas
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';

const router = Router();

// ============================================================================
// SCHEMAS DE VALIDAÇÃO
// ============================================================================

const MetricsFiltersSchema = z.object({
  tenant_id: z.string().uuid('Tenant ID deve ser um UUID válido'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  pipeline_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  stage: z.string().optional()
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Obter dados de métricas básicas do Supabase
 */
async function getBasicMetrics(filters: any) {
  const { tenant_id, start_date, end_date, pipeline_id } = filters;

  try {
    // Query base para leads
    let leadsQuery = supabase
      .from('pipeline_leads')
      .select('*')
      .eq('tenant_id', tenant_id);

    // Aplicar filtros de data se fornecidos
    if (start_date) {
      leadsQuery = leadsQuery.gte('created_at', start_date);
    }
    if (end_date) {
      leadsQuery = leadsQuery.lte('created_at', end_date);
    }
    if (pipeline_id) {
      leadsQuery = leadsQuery.eq('pipeline_id', pipeline_id);
    }

    const { data: leads, error: leadsError } = await leadsQuery;

    if (leadsError) {
      throw new Error(`Erro ao buscar leads: ${leadsError.message}`);
    }

    // Calcular métricas básicas
    const totalLeads = leads?.length || 0;
    const convertedLeads = leads?.filter(lead => lead.stage === 'Ganho')?.length || 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Calcular receita total
    const totalRevenue = leads
      ?.filter(lead => lead.stage === 'Ganho')
      ?.reduce((sum, lead) => sum + (parseFloat(lead.deal_value || '0')), 0) || 0;

    // Métricas por pipeline
    const pipelineBreakdown = {};
    if (leads) {
      leads.forEach(lead => {
        const pipelineId = lead.pipeline_id;
        if (!pipelineBreakdown[pipelineId]) {
          pipelineBreakdown[pipelineId] = {
            total: 0,
            converted: 0,
            revenue: 0
          };
        }
        pipelineBreakdown[pipelineId].total++;
        if (lead.stage === 'Ganho') {
          pipelineBreakdown[pipelineId].converted++;
          pipelineBreakdown[pipelineId].revenue += parseFloat(lead.deal_value || '0');
        }
      });
    }

    return {
      success: true,
      data: {
        summary: {
          total_leads: totalLeads,
          converted_leads: convertedLeads,
          conversion_rate: conversionRate,
          total_revenue: totalRevenue,
          period: {
            start_date: start_date || null,
            end_date: end_date || null
          }
        },
        pipeline_breakdown: pipelineBreakdown,
        last_updated: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ [getBasicMetrics] Erro:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Obter filtros disponíveis para o tenant
 */
async function getAvailableFilters(tenantId: string) {
  try {
    // Buscar pipelines disponíveis
    const { data: pipelines, error: pipelinesError } = await supabase
      .from('pipelines')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (pipelinesError) {
      throw new Error(`Erro ao buscar pipelines: ${pipelinesError.message}`);
    }

    // Buscar usuários do tenant
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('tenant_id', tenantId);

    if (usersError) {
      console.warn('⚠️ [getAvailableFilters] Erro ao buscar usuários:', usersError.message);
    }

    // Estágios padrão
    const stages = [
      { value: 'Lead', label: 'Lead' },
      { value: 'Ganho', label: 'Ganho' },
      { value: 'Perdido', label: 'Perdido' }
    ];

    return {
      success: true,
      data: {
        pipelines: pipelines?.map(p => ({ value: p.id, label: p.name })) || [],
        users: users?.map(u => ({ value: u.id, label: u.full_name })) || [],
        stages,
        date_ranges: [
          { value: 'last_7_days', label: 'Últimos 7 dias' },
          { value: 'last_30_days', label: 'Últimos 30 dias' },
          { value: 'last_90_days', label: 'Últimos 90 dias' },
          { value: 'this_month', label: 'Este mês' },
          { value: 'last_month', label: 'Mês passado' }
        ]
      }
    };

  } catch (error) {
    console.error('❌ [getAvailableFilters] Erro:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// ============================================================================
// ENDPOINTS
// ============================================================================

/**
 * GET /api/metrics/enterprise
 * Retorna métricas básicas enterprise
 */
router.get('/enterprise', async (req: Request, res: Response) => {
  try {
    console.log('📊 [GET /api/metrics/enterprise] Query params:', req.query);

    // Validar query parameters
    const validation = MetricsFiltersSchema.safeParse(req.query);
    
    if (!validation.success) {
      console.error('❌ [GET /api/metrics/enterprise] Validação falhou:', validation.error.issues);
      return res.status(400).json({
        success: false,
        error: 'Parâmetros inválidos',
        details: validation.error.issues
      });
    }

    const filters = validation.data;
    console.log('✅ [GET /api/metrics/enterprise] Filtros validados:', filters);

    // Buscar métricas
    const result = await getBasicMetrics(filters);

    if (!result.success) {
      return res.status(500).json(result);
    }

    console.log('✅ [GET /api/metrics/enterprise] Métricas calculadas com sucesso');
    return res.json(result);

  } catch (error) {
    console.error('❌ [GET /api/metrics/enterprise] Erro:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * GET /api/metrics/filters
 * Retorna filtros disponíveis para métricas
 */
router.get('/filters', async (req: Request, res: Response) => {
  try {
    const { tenant_id } = req.query;

    console.log('📊 [GET /api/metrics/filters] Tenant ID:', tenant_id);

    if (!tenant_id || typeof tenant_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'tenant_id é obrigatório'
      });
    }

    // Validar UUID
    const uuidValidation = z.string().uuid().safeParse(tenant_id);
    if (!uuidValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id deve ser um UUID válido'
      });
    }

    // Buscar filtros disponíveis
    const result = await getAvailableFilters(tenant_id);

    if (!result.success) {
      return res.status(500).json(result);
    }

    console.log('✅ [GET /api/metrics/filters] Filtros carregados com sucesso');
    return res.json(result);

  } catch (error) {
    console.error('❌ [GET /api/metrics/filters] Erro:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;
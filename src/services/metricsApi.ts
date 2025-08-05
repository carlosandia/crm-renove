/**
 * ENTERPRISE METRICS API SERVICE
 * Service para buscar métricas enterprise do Supabase
 * 
 * Conecta com as tabelas leads_master e pipeline_leads para calcular métricas
 */

import { supabase } from '../lib/supabase';
import type {
  EnterpriseMetrics,
  DetailedMetrics,
  MetricsFilters,
  FiltersResponse,
  PipelineBreakdown,
  StageBreakdown,
  ApiResponse,
  PredefinedPeriod
} from '../types/EnterpriseMetrics';
import { PREDEFINED_PERIODS } from '../types/EnterpriseMetrics';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converte período predefinido para datas
 */
function getPeriodDates(period: PredefinedPeriod): { start_date: string; end_date: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case 'today':
      return {
        start_date: today.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      };
      
    case '7days':
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return {
        start_date: sevenDaysAgo.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      };
      
    case '30days':
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return {
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      };
      
    case '90days':
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      return {
        start_date: ninetyDaysAgo.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      };
      
    case 'current_month':
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start_date: firstDay.toISOString().split('T')[0],
        end_date: lastDay.toISOString().split('T')[0]
      };
      
    default:
      return {
        start_date: today.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      };
  }
}

/**
 * Aplica filtros à query do Supabase
 * AIDEV-NOTE: Diferentes tabelas têm diferentes colunas, pipeline_id só existe em pipeline_leads
 */
function applyFilters(query: any, filters: MetricsFilters, tableName?: string) {
  // Filtro obrigatório por tenant
  query = query.eq('tenant_id', filters.tenant_id);
  
  // Filtro por período
  if (filters.start_date && filters.end_date) {
    query = query.gte('created_at', filters.start_date).lte('created_at', filters.end_date + 'T23:59:59.999Z');
  }
  
  // Filtro por pipeline - só aplicar se a tabela suportar
  if (filters.pipeline_id && tableName === 'pipeline_leads') {
    query = query.eq('pipeline_id', filters.pipeline_id);
  }
  
  // Filtro por criador
  if (filters.created_by) {
    query = query.eq('created_by', filters.created_by);
  }
  
  // Filtro por responsável
  if (filters.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to);
  }
  
  return query;
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class EnterpriseMetricsService {
  
  /**
   * Busca métricas enterprise básicas
   */
  static async getMetrics(filters: MetricsFilters): Promise<EnterpriseMetrics> {
    try {
      // ✅ OTIMIZADO: Log apenas em DEV e com throttling
      if (import.meta.env.DEV && !window.__metricsLogThrottled) {
        console.log('🔍 [EnterpriseMetricsService] Buscando métricas');
        window.__metricsLogThrottled = true;
        setTimeout(() => { window.__metricsLogThrottled = false; }, 5000);
      }
      
      // 1. Buscar leads únicos no período
      let leadsQuery = supabase
        .from('leads_master')
        .select('id, created_at, tenant_id');
      
      leadsQuery = applyFilters(leadsQuery, filters, 'leads_master');
      
      const { data: leadsData, error: leadsError } = await leadsQuery;
      
      if (leadsError) {
        console.error('❌ Erro ao buscar leads:', leadsError);
        throw new Error(`Erro ao buscar leads: ${leadsError.message}`);
      }
      
      // 2. Buscar oportunidades (pipeline_leads)
      let opportunitiesQuery = supabase
        .from('pipeline_leads')
        .select(`
          id,
          stage_id,
          custom_data,
          created_at,
          tenant_id,
          pipeline_id,
          lead_master_id,
          pipeline_stages!inner(name, pipeline_id)
        `);
      
      opportunitiesQuery = applyFilters(opportunitiesQuery, filters, 'pipeline_leads');
      
      // 🔍 DEBUG: Log da query final para identificar problema
      console.log('🔍 [DEBUG] Query de oportunidades:', {
        tenant_id: filters.tenant_id,
        pipeline_id: filters.pipeline_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
        hasFilters: !!(filters.start_date || filters.end_date)
      });
      
      const { data: opportunitiesData, error: opportunitiesError } = await opportunitiesQuery;
      
      // 🔍 DEBUG: Log do resultado
      console.log('🔍 [DEBUG] Resultado oportunidades:', {
        count: opportunitiesData?.length || 0,
        error: opportunitiesError?.message,
        firstRecord: opportunitiesData?.[0]?.id?.substring(0, 8)
      });
      
      if (opportunitiesError) {
        console.error('❌ Erro ao buscar oportunidades:', opportunitiesError);
        throw new Error(`Erro ao buscar oportunidades: ${opportunitiesError.message}`);
      }
      
      // 3. Calcular métricas
      const totalUniqueLeads = leadsData?.length || 0;
      const totalOpportunities = opportunitiesData?.length || 0;
      
      // Identificar oportunidades ganhas (Ganho, Won, Closed Won)
      const wonOpportunities = opportunitiesData?.filter(opp => {
        const stage = opp.pipeline_stages;
        const stageName = (stage && typeof stage === 'object' && 'name' in stage) 
          ? (typeof stage.name === 'string' ? stage.name.toLowerCase() : '') 
          : '';
        return stageName.includes('ganho') || stageName.includes('won') || stageName === 'closed won';
      }) || [];
      
      const salesCount = wonOpportunities.length;
      
      // Calcular valor total das vendas
      let totalSalesValue = 0;
      wonOpportunities.forEach(opp => {
        const customData = opp.custom_data || {};
        // Tentar vários campos de valor
        const valueFields = ['valor_numerico', 'valor', 'value', 'price', 'amount'];
        
        for (const field of valueFields) {
          const fieldValue = customData[field];
          if (fieldValue && typeof fieldValue === 'number' && fieldValue > 0) {
            totalSalesValue += fieldValue;
            break;
          } else if (fieldValue && typeof fieldValue === 'string') {
            const numericValue = parseFloat(fieldValue.replace(/[R$\s,]/g, '').replace(',', '.'));
            if (!isNaN(numericValue) && numericValue > 0) {
              totalSalesValue += numericValue;
              break;
            }
          }
        }
      });
      
      // Calcular métricas derivadas
      const conversionRate = totalUniqueLeads > 0 ? (salesCount / totalUniqueLeads) * 100 : 0;
      const averageDealSize = salesCount > 0 ? totalSalesValue / salesCount : 0;
      const opportunitiesPerLead = totalUniqueLeads > 0 ? totalOpportunities / totalUniqueLeads : 0;
      
      const metrics: EnterpriseMetrics = {
        total_unique_leads: totalUniqueLeads,
        total_opportunities: totalOpportunities,
        conversion_rate: conversionRate,
        total_sales_value: totalSalesValue,
        sales_count: salesCount,
        average_deal_size: averageDealSize,
        opportunities_per_lead: opportunitiesPerLead,
        period_start: filters.start_date,
        period_end: filters.end_date,
        tenant_id: filters.tenant_id,
        last_updated: new Date().toISOString()
      };
      
      console.log('✅ [EnterpriseMetricsService] Métricas calculadas:', metrics);
      return metrics;
      
    } catch (error: any) {
      console.error('❌ [EnterpriseMetricsService] Erro:', error);
      throw new Error(`Falha ao buscar métricas: ${error.message}`);
    }
  }
  
  /**
   * Busca métricas detalhadas com breakdown
   */
  static async getDetailedMetrics(filters: MetricsFilters): Promise<DetailedMetrics> {
    try {
      // ✅ OTIMIZADO: Log apenas em DEV
      if (import.meta.env.DEV) {
        console.log('🔍 [EnterpriseMetricsService] Buscando métricas detalhadas');
      }
      
      // 1. Buscar métricas básicas
      const basicMetrics = await this.getMetrics(filters);
      
      // 2. Buscar breakdown por pipeline
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('tenant_id', filters.tenant_id)
        .eq('is_active', true);
      
      if (pipelinesError) {
        throw new Error(`Erro ao buscar pipelines: ${pipelinesError.message}`);
      }
      
      const pipelineBreakdowns: PipelineBreakdown[] = [];
      
      for (const pipeline of pipelinesData || []) {
        const pipelineFilters = { ...filters, pipeline_id: pipeline.id };
        const pipelineMetrics = await this.getMetrics(pipelineFilters);
        
        pipelineBreakdowns.push({
          pipeline_id: pipeline.id,
          pipeline_name: pipeline.name,
          metrics: pipelineMetrics
        });
      }
      
      // 3. Buscar breakdown por etapa
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select(`
          id,
          name,
          pipeline_id,
          pipelines!inner(tenant_id)
        `)
        .eq('pipelines.tenant_id', filters.tenant_id);
      
      if (stagesError) {
        throw new Error(`Erro ao buscar etapas: ${stagesError.message}`);
      }
      
      const stageBreakdowns: StageBreakdown[] = [];
      
      for (const stage of stagesData || []) {
        // Buscar oportunidades por etapa
        let stageOppsQuery = supabase
          .from('pipeline_leads')
          .select('id, custom_data')
          .eq('stage_id', stage.id);
        
        stageOppsQuery = applyFilters(stageOppsQuery, filters, 'pipeline_leads');
        
        const { data: stageOpps } = await stageOppsQuery;
        
        // Calcular valor total da etapa
        let stageValue = 0;
        stageOpps?.forEach(opp => {
          const customData = opp.custom_data || {};
          const valueFields = ['valor_numerico', 'valor', 'value', 'price', 'amount'];
          
          for (const field of valueFields) {
            const fieldValue = customData[field];
            if (fieldValue && typeof fieldValue === 'number' && fieldValue > 0) {
              stageValue += fieldValue;
              break;
            } else if (fieldValue && typeof fieldValue === 'string') {
              const numericValue = parseFloat(fieldValue.replace(/[R$\s,]/g, '').replace(',', '.'));
              if (!isNaN(numericValue) && numericValue > 0) {
                stageValue += numericValue;
                break;
              }
            }
          }
        });
        
        stageBreakdowns.push({
          stage_id: stage.id,
          stage_name: stage.name,
          stage_type: 'custom', // Podemos melhorar isso depois
          opportunities_count: stageOpps?.length || 0,
          total_value: stageValue
        });
      }
      
      const detailedMetrics: DetailedMetrics = {
        ...basicMetrics,
        by_pipeline: pipelineBreakdowns,
        by_stage: stageBreakdowns
      };
      
      console.log('✅ [EnterpriseMetricsService] Métricas detalhadas calculadas');
      return detailedMetrics;
      
    } catch (error: any) {
      console.error('❌ [EnterpriseMetricsService] Erro:', error);
      throw new Error(`Falha ao buscar métricas detalhadas: ${error.message}`);
    }
  }
  
  /**
   * Busca filtros disponíveis
   */
  static async getFilters(tenantId: string): Promise<FiltersResponse> {
    try {
      // ✅ OTIMIZADO: Log apenas em DEV e com throttling
      if (import.meta.env.DEV && !window.__filtersLogThrottled) {
        console.log('🔍 [EnterpriseMetricsService] Buscando filtros');
        window.__filtersLogThrottled = true;
        setTimeout(() => { window.__filtersLogThrottled = false; }, 10000);
      }
      
      // 1. Buscar pipelines
      const { data: pipelines, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');
      
      if (pipelinesError) {
        throw new Error(`Erro ao buscar pipelines: ${pipelinesError.message}`);
      }
      
      // 2. Buscar usuários (admins e members)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('tenant_id', tenantId)
        .in('role', ['admin', 'member'])
        .order('first_name');
      
      if (usersError) {
        throw new Error(`Erro ao buscar usuários: ${usersError.message}`);
      }
      
      // 3. Preparar resposta
      const currentMonth = getPeriodDates('current_month');
      
      const filtersResponse: FiltersResponse = {
        periods: PREDEFINED_PERIODS,
        pipelines: pipelines?.map(p => ({ id: p.id, name: p.name })) || [],
        users: users?.map(u => ({
          id: u.id,
          name: `${u.first_name} ${u.last_name}`.trim(),
          email: u.email
        })) || [],
        current_defaults: {
          period: 'current_month',
          start_date: currentMonth.start_date,
          end_date: currentMonth.end_date
        }
      };
      
      console.log('✅ [EnterpriseMetricsService] Filtros carregados');
      return filtersResponse;
      
    } catch (error: any) {
      console.error('❌ [EnterpriseMetricsService] Erro:', error);
      throw new Error(`Falha ao buscar filtros: ${error.message}`);
    }
  }
  
  /**
   * Wrapper para conversão de período
   */
  static getPeriodDates = getPeriodDates;
  
  /**
   * Invalidar cache (placeholder para futura implementação)
   */
  static async invalidateCache(tenantId: string): Promise<void> {
    console.log('🔄 [EnterpriseMetricsService] Cache invalidado para tenant:', tenantId);
    // Implementar invalidação de cache se necessário
  }
}

// ============================================================================
// QUERY KEYS PARA TANSTACK QUERY
// ============================================================================

export const metricsQueryKeys = {
  all: ['enterprise-metrics'] as const,
  lists: () => [...metricsQueryKeys.all, 'list'] as const,
  list: (filters: MetricsFilters) => [...metricsQueryKeys.lists(), filters] as const,
  details: () => [...metricsQueryKeys.all, 'detail'] as const,
  detail: (filters: MetricsFilters) => [...metricsQueryKeys.details(), filters] as const,
  filters: (tenantId: string) => [...metricsQueryKeys.all, 'filters', tenantId] as const,
};

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default EnterpriseMetricsService;
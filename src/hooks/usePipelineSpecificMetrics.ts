// =====================================================================================
// HOOK: usePipelineSpecificMetrics
// Autor: Claude (Arquiteto Sênior)
// Descrição: Hook para métricas específicas por pipeline com real-time updates
// =====================================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { api } from '../lib/api';
import { logger, LogContext } from '../utils/loggerOptimized';

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface PipelineMetrics {
  pipeline_id: string;
  pipeline_name: string;
  total_leads: number;
  unique_leads_count: number; // ✅ CORREÇÃO: Contagem real de leads únicos (leads_master)
  total_opportunity_cards: number; // ✅ CORREÇÃO: Contagem real de cards/oportunidades (pipeline_leads)
  qualified_leads: number;
  won_deals: number;
  lost_deals: number;
  total_revenue: number;
  average_deal_size: number;
  conversion_rate: number;
  win_rate: number;
  loss_rate: number;
  average_cycle_time: number; // em dias
  active_opportunities: number;
  pending_follow_ups: number;
  overdue_tasks: number;
  // ✅ CORREÇÃO CRÍTICA: Adicionar métricas de reuniões
  meetings_scheduled: number;
  meetings_attended: number;
  meetings_noshow: number;
  meetings_noshow_rate: number;
  updated_at: string;
}

export interface PipelineSpecificMetricsOptions {
  pipelineId: string;
  enableRealTime?: boolean;
  refreshInterval?: number;
  enableNotifications?: boolean;
}

// ============================================
// QUERY KEYS
// ============================================

export const pipelineSpecificMetricsKeys = {
  all: ['pipeline-specific-metrics'] as const,
  pipeline: (pipelineId: string) => [...pipelineSpecificMetricsKeys.all, pipelineId] as const,
  metrics: (pipelineId: string, tenantId: string) => 
    [...pipelineSpecificMetricsKeys.pipeline(pipelineId), tenantId] as const,
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export const usePipelineSpecificMetrics = ({
  pipelineId,
  enableRealTime = true,
  refreshInterval = 30000, // 30 segundos
  enableNotifications = false
}: PipelineSpecificMetricsOptions) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Estados locais para controle
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRealTimeActive, setIsRealTimeActive] = useState(enableRealTime);

  // ============================================
  // QUERY PRINCIPAL: MÉTRICAS DA PIPELINE
  // ============================================
  
  const {
    data: metrics,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: pipelineSpecificMetricsKeys.metrics(pipelineId, user?.tenant_id || ''),
    queryFn: async (): Promise<PipelineMetrics> => {
      if (!user?.tenant_id) {
        throw new Error('Usuário não autenticado');
      }

      logger.debug('Buscando métricas específicas da pipeline', LogContext.PIPELINE, {
        pipelineId: pipelineId.substring(0, 8) + '...',
        tenantId: user.tenant_id.substring(0, 8) + '...',
        realTime: isRealTimeActive
      });

      try {
        // ✅ CORREÇÃO: Usar endpoint específico para métricas por pipeline
        const response = await api.get(`/pipelines/${pipelineId}/metrics`, {
          params: {
            tenant_id: user.tenant_id
          }
        });

        if (!response.data || !response.data.success) {
          throw new Error('Resposta inválida do servidor');
        }

        const pipelineMetrics: PipelineMetrics = {
          pipeline_id: pipelineId,
          pipeline_name: response.data.data.pipeline_name || 'Pipeline',
          total_leads: response.data.data.total_leads || 0,
          unique_leads_count: response.data.data.unique_leads_count || 0, // ✅ CORREÇÃO: Campo do backend
          total_opportunity_cards: response.data.data.total_opportunity_cards || 0, // ✅ CORREÇÃO: Campo do backend
          qualified_leads: response.data.data.qualified_leads || 0,
          won_deals: response.data.data.won_deals || 0,
          lost_deals: response.data.data.lost_deals || 0,
          total_revenue: response.data.data.total_revenue || 0,
          average_deal_size: response.data.data.average_deal_size || 0,
          conversion_rate: response.data.data.conversion_rate || 0,
          win_rate: response.data.data.win_rate || 0,
          loss_rate: response.data.data.loss_rate || 0,
          average_cycle_time: response.data.data.average_cycle_time || 0,
          active_opportunities: response.data.data.active_opportunities || 0,
          pending_follow_ups: response.data.data.pending_follow_ups || 0,
          overdue_tasks: response.data.data.overdue_tasks || 0,
          // ✅ CORREÇÃO CRÍTICA: Campos de reuniões do backend
          meetings_scheduled: response.data.data.meetings_scheduled || 0,
          meetings_attended: response.data.data.meetings_attended || 0,
          meetings_noshow: response.data.data.meetings_noshow || 0,
          meetings_noshow_rate: response.data.data.meetings_noshow_rate || 0,
          updated_at: new Date().toISOString()
        };

        logger.debug('Métricas da pipeline carregadas', LogContext.PIPELINE, {
          pipelineId: pipelineId.substring(0, 8) + '...',
          totalLeads: pipelineMetrics.total_leads,
          totalRevenue: pipelineMetrics.total_revenue,
          conversionRate: pipelineMetrics.conversion_rate
        });

        return pipelineMetrics;
      } catch (error: any) {
        logger.error('Erro ao buscar métricas da pipeline', LogContext.PIPELINE, error);
        
        // ✅ FALLBACK: Retornar métricas vazias para manter UI funcionando
        return {
          pipeline_id: pipelineId,
          pipeline_name: 'Pipeline',
          total_leads: 0,
          unique_leads_count: 0, // ✅ CORREÇÃO: Fallback para novos campos
          total_opportunity_cards: 0, // ✅ CORREÇÃO: Fallback para novos campos
          qualified_leads: 0,
          won_deals: 0,
          lost_deals: 0,
          total_revenue: 0,
          average_deal_size: 0,
          conversion_rate: 0,
          win_rate: 0,
          loss_rate: 0,
          average_cycle_time: 0,
          active_opportunities: 0,
          pending_follow_ups: 0,
          overdue_tasks: 0,
          // ✅ FALLBACK: Reuniões vazias
          meetings_scheduled: 0,
          meetings_attended: 0,
          meetings_noshow: 0,
          meetings_noshow_rate: 0,
          updated_at: new Date().toISOString()
        };
      }
    },
    enabled: !!pipelineId && !!user?.tenant_id,
    staleTime: refreshInterval / 2, // Metade do intervalo de refresh
    gcTime: refreshInterval * 2, // Duas vezes o intervalo de refresh
    refetchInterval: isRealTimeActive ? refreshInterval : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      // Não tentar novamente para erros de autenticação
      if (error && 'status' in error && (error.status === 401 || error.status === 403)) {
        return false;
      }
      return failureCount < 2;
    }
  });

  // ============================================
  // REAL-TIME LISTENERS
  // ============================================

  // ✅ CORREÇÃO: Listener para eventos de mudança de pipeline
  useEffect(() => {
    const handlePipelineChanged = (event: CustomEvent) => {
      const { pipeline } = event.detail;
      
      if (pipeline && pipeline.id === pipelineId) {
        logger.debug('Pipeline alterada, atualizando métricas', LogContext.PIPELINE, {
          pipelineId: pipelineId.substring(0, 8) + '...',
          source: 'pipeline-change-event'
        });
        
        // Refetch imediato para capturar mudanças
        refetch();
        setLastUpdate(new Date());
      }
    };

    const handleLeadMoved = (event: CustomEvent) => {
      const { pipelineId: eventPipelineId } = event.detail;
      
      if (eventPipelineId === pipelineId) {
        logger.debug('Lead movido na pipeline, atualizando métricas', LogContext.PIPELINE, {
          pipelineId: pipelineId.substring(0, 8) + '...',
          source: 'lead-move-event'
        });
        
        // Delay pequeno para permitir que o backend processe a mudança
        setTimeout(() => {
          refetch();
          setLastUpdate(new Date());
        }, 1000);
      }
    };

    const handleLeadCreated = (event: CustomEvent) => {
      const { pipelineId: eventPipelineId } = event.detail;
      
      if (eventPipelineId === pipelineId) {
        logger.debug('Lead criado na pipeline, atualizando métricas', LogContext.PIPELINE, {
          pipelineId: pipelineId.substring(0, 8) + '...',
          source: 'lead-create-event'
        });
        
        setTimeout(() => {
          refetch();
          setLastUpdate(new Date());
        }, 500);
      }
    };

    if (isRealTimeActive) {
      window.addEventListener('pipeline-view-changed', handlePipelineChanged as EventListener);
      window.addEventListener('lead-moved', handleLeadMoved as EventListener);
      window.addEventListener('lead-created', handleLeadCreated as EventListener);

      return () => {
        window.removeEventListener('pipeline-view-changed', handlePipelineChanged as EventListener);
        window.removeEventListener('lead-moved', handleLeadMoved as EventListener);
        window.removeEventListener('lead-created', handleLeadCreated as EventListener);
      };
    }
    return undefined; // ✅ CORREÇÃO TS7030: Retorno explícito para todos os caminhos
  }, [pipelineId, isRealTimeActive, refetch]);

  // ============================================
  // MÉTODOS DE CONTROLE
  // ============================================

  const toggleRealTime = useCallback(() => {
    setIsRealTimeActive(prev => !prev);
    logger.debug('Real-time toggled', LogContext.PIPELINE, {
      pipelineId: pipelineId.substring(0, 8) + '...',
      isActive: !isRealTimeActive
    });
  }, [pipelineId, isRealTimeActive]);

  const forceRefresh = useCallback(() => {
    logger.debug('Forçando refresh de métricas', LogContext.PIPELINE, {
      pipelineId: pipelineId.substring(0, 8) + '...',
      source: 'manual-refresh'
    });
    
    refetch();
    setLastUpdate(new Date());
  }, [pipelineId, refetch]);

  // Invalidar cache quando pipeline mudar
  useEffect(() => {
    if (pipelineId) {
      // Invalidar métricas da pipeline anterior se existir
      queryClient.invalidateQueries({
        queryKey: pipelineSpecificMetricsKeys.all
      });
    }
  }, [pipelineId, queryClient]);

  // ============================================
  // MÉTRICAS DERIVADAS (MEMOIZADAS)
  // ============================================

  const derivedMetrics = useMemo(() => {
    if (!metrics) {
      return {
        hasData: false,
        performanceScore: 0,
        healthStatus: 'unknown' as 'healthy' | 'warning' | 'critical' | 'unknown',
        trendsIndicator: 'neutral' as 'positive' | 'negative' | 'neutral'
      };
    }

    // Calcular score de performance (0-100)
    const performanceScore = Math.min(100, (metrics.conversion_rate * 0.4 + metrics.win_rate * 0.6));
    
    // Determinar status de saúde da pipeline
    let healthStatus: 'healthy' | 'warning' | 'critical' | 'unknown' = 'healthy';
    if (metrics.conversion_rate < 10) healthStatus = 'critical';
    else if (metrics.conversion_rate < 25) healthStatus = 'warning';
    
    // Indicador de tendência (baseado em métricas ativas vs inativas)
    const activeRatio = metrics.active_opportunities / (metrics.won_deals + metrics.lost_deals + metrics.active_opportunities || 1);
    const trendsIndicator: 'positive' | 'negative' | 'neutral' = 
      activeRatio > 0.6 ? 'positive' : 
      activeRatio < 0.3 ? 'negative' : 'neutral';

    return {
      hasData: true,
      performanceScore,
      healthStatus,
      trendsIndicator
    };
  }, [metrics]);

  // ============================================
  // RETORNO DO HOOK
  // ============================================

  return {
    // Dados principais
    metrics,
    derivedMetrics,
    lastUpdate,
    
    // Estados
    isLoading,
    isRefetching,
    error,
    
    // Controles real-time
    isRealTimeActive,
    toggleRealTime,
    
    // Ações
    refetch: forceRefresh,
    
    // Configurações
    refreshInterval,
    
    // Debug info
    debugInfo: {
      pipelineId: pipelineId.substring(0, 8) + '...',
      tenantId: user?.tenant_id?.substring(0, 8) + '...' || 'unknown',
      queryKey: pipelineSpecificMetricsKeys.metrics(pipelineId, user?.tenant_id || ''),
      lastRefresh: lastUpdate?.toISOString() || 'never',
      realTimeEnabled: isRealTimeActive
    }
  };
};

// ============================================
// HOOK AUXILIAR: COMPARAÇÃO DE MÉTRICAS
// ============================================

/**
 * Hook para comparar métricas entre pipelines
 */
export const usePipelineMetricsComparison = (pipelineIds: string[]) => {
  const { user } = useAuth();
  
  const metricsQueries = pipelineIds.map(pipelineId => ({
    pipelineId,
    ...usePipelineSpecificMetrics({ pipelineId, enableRealTime: false })
  }));

  const comparison = useMemo(() => {
    const validMetrics = metricsQueries.filter(query => query.metrics).map(query => query.metrics!);
    
    if (validMetrics.length === 0) return null;

    // Calcular médias e comparações
    const avgConversion = validMetrics.reduce((sum, m) => sum + m.conversion_rate, 0) / validMetrics.length;
    const avgRevenue = validMetrics.reduce((sum, m) => sum + m.total_revenue, 0) / validMetrics.length;
    const avgCycleTime = validMetrics.reduce((sum, m) => sum + m.average_cycle_time, 0) / validMetrics.length;

    return {
      totalPipelines: validMetrics.length,
      averages: {
        conversion_rate: avgConversion,
        total_revenue: avgRevenue,
        average_cycle_time: avgCycleTime
      },
      best: {
        conversion: validMetrics.reduce((best, current) => 
          current.conversion_rate > best.conversion_rate ? current : best
        ),
        revenue: validMetrics.reduce((best, current) => 
          current.total_revenue > best.total_revenue ? current : best
        )
      }
    };
  }, [metricsQueries]);

  return {
    metrics: metricsQueries,
    comparison,
    isLoading: metricsQueries.some(query => query.isLoading),
    error: metricsQueries.find(query => query.error)?.error
  };
};

export default usePipelineSpecificMetrics;
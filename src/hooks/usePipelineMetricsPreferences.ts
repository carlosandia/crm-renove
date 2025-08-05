// =====================================================================================
// HOOK: usePipelineMetricsPreferences
// Autor: Claude (Arquiteto Sênior)
// Descrição: Hook para gerenciar preferências de métricas específicas por pipeline
// =====================================================================================

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { api } from '../lib/api';
import { logger, LogContext } from '../utils/loggerOptimized';

// Schemas e tipos
import {
  PipelineMetricsPreferences,
  UpdatePipelineMetricsPreferences,
  PipelineMetricsPreferencesResponse,
  pipelineMetricsPreferencesKeys,
  createDefaultPipelineMetricsPreferences,
  hasMetricsPreferencesChanged,
  validateMetricsSelection,
  MAX_SELECTED_METRICS,
  MIN_SELECTED_METRICS,
  DEFAULT_PIPELINE_METRICS
} from '../shared/schemas/pipeline-metrics-preferences';

import { MetricId } from '../shared/schemas/metrics-preferences';

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface UsePipelineMetricsPreferencesOptions {
  pipelineId: string;
  enabled?: boolean;
  onSuccess?: (preferences: PipelineMetricsPreferences) => void;
  onError?: (error: Error) => void;
  enableOptimisticUpdates?: boolean;
}

export interface PipelineMetricsPreferencesState {
  preferences: PipelineMetricsPreferences | null;
  visibleMetrics: MetricId[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isUpdating: boolean;
  hasUnsavedChanges: boolean;
  canSelectMore: boolean;
  selectedCount: number;
  maxSelectable: number;
  minSelectable: number;
}

export interface PipelineMetricsPreferencesActions {
  updateMetrics: (metrics: MetricId[]) => Promise<void>;
  toggleMetric: (metricId: MetricId) => Promise<void>;
  resetToDefault: () => Promise<void>;
  refetch: () => Promise<any>;
  isMetricSelected: (metricId: MetricId) => boolean;
  canAddMetric: () => boolean;
  canRemoveMetric: () => boolean;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export const usePipelineMetricsPreferences = ({
  pipelineId,
  enabled = true,
  onSuccess,
  onError,
  enableOptimisticUpdates = true
}: UsePipelineMetricsPreferencesOptions) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ============================================
  // QUERY: BUSCAR PREFERÊNCIAS
  // ============================================
  
  const {
    data: preferencesData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: pipelineMetricsPreferencesKeys.pipeline(pipelineId),
    queryFn: async (): Promise<PipelineMetricsPreferencesResponse> => {
      if (!user?.tenant_id) {
        throw new Error('Usuário não autenticado');
      }

      logger.debug('Buscando preferências de métricas da pipeline', LogContext.PIPELINE, {
        pipelineId: pipelineId.substring(0, 8) + '...',
        tenantId: user.tenant_id.substring(0, 8) + '...'
      });

      try {
        const response = await api.get(`/pipeline-metrics-preferences/${pipelineId}`, {
          params: {
            tenant_id: user.tenant_id
          }
        });

        if (!response.data || !response.data.success) {
          throw new Error('Resposta inválida do servidor');
        }

        logger.debug('Preferências de métricas carregadas', LogContext.PIPELINE, {
          pipelineId: pipelineId.substring(0, 8) + '...',
          metricsCount: response.data.data.visible_metrics.length,
          metrics: response.data.data.visible_metrics
        });

        return response.data;
      } catch (error: any) {
        // Se não existem preferências, retornar padrão
        if (error.status === 404) {
          logger.debug('Preferências não encontradas, usando padrão', LogContext.PIPELINE, {
            pipelineId: pipelineId.substring(0, 8) + '...'
          });
          
          const defaultPrefs = createDefaultPipelineMetricsPreferences(pipelineId);
          return {
            success: true,
            data: defaultPrefs,
            message: 'Preferências padrão',
            updated_at: defaultPrefs.updated_at
          };
        }

        logger.error('Erro ao buscar preferências de métricas', LogContext.PIPELINE, error);
        throw error;
      }
    },
    enabled: !!pipelineId && !!user?.tenant_id && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: (failureCount, error) => {
      if (error && 'status' in error && (error.status === 401 || error.status === 403)) {
        return false;
      }
      return failureCount < 2;
    }
  });

  // ============================================
  // MUTATION: ATUALIZAR PREFERÊNCIAS
  // ============================================

  const updateMutation = useMutation({
    mutationFn: async (updateData: UpdatePipelineMetricsPreferences): Promise<PipelineMetricsPreferencesResponse> => {
      if (!user?.tenant_id) {
        throw new Error('Usuário não autenticado');
      }

      logger.debug('Atualizando preferências de métricas', LogContext.PIPELINE, {
        pipelineId: pipelineId.substring(0, 8) + '...',
        metricsCount: updateData.visible_metrics.length,
        metrics: updateData.visible_metrics
      });

      const response = await api.put(`/pipeline-metrics-preferences/${pipelineId}`, updateData, {
        params: {
          tenant_id: user.tenant_id
        }
      });

      if (!response.data || !response.data.success) {
        throw new Error('Falha ao atualizar preferências');
      }

      return response.data;
    },
    onMutate: async (updateData) => {
      if (!enableOptimisticUpdates) return;

      // Cancel queries to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: pipelineMetricsPreferencesKeys.pipeline(pipelineId)
      });

      // Snapshot previous data
      const previousData = queryClient.getQueryData(
        pipelineMetricsPreferencesKeys.pipeline(pipelineId)
      );

      // Optimistically update
      if (previousData) {
        queryClient.setQueryData(
          pipelineMetricsPreferencesKeys.pipeline(pipelineId),
          (old: PipelineMetricsPreferencesResponse | undefined) => {
            if (!old) return old;
            
            return {
              ...old,
              data: {
                ...old.data,
                visible_metrics: updateData.visible_metrics,
                metrics_order: updateData.metrics_order,
                updated_at: new Date().toISOString()
              }
            };
          }
        );
      }

      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousData && enableOptimisticUpdates) {
        queryClient.setQueryData(
          pipelineMetricsPreferencesKeys.pipeline(pipelineId),
          context.previousData
        );
      }

      logger.error('Erro ao atualizar preferências de métricas', LogContext.PIPELINE, error);
      onError?.(error as Error);
    },
    onSuccess: (data) => {
      logger.debug('Preferências atualizadas com sucesso', LogContext.PIPELINE, {
        pipelineId: pipelineId.substring(0, 8) + '...',
        metricsCount: data.data.visible_metrics.length
      });

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: pipelineMetricsPreferencesKeys.tenant(user?.tenant_id || '')
      });

      onSuccess?.(data.data);
    },
    onSettled: () => {
      // Sempre refetch após sucesso ou erro para garantir consistência
      queryClient.invalidateQueries({
        queryKey: pipelineMetricsPreferencesKeys.pipeline(pipelineId)
      });
    }
  });

  // ============================================
  // ESTADOS COMPUTADOS
  // ============================================

  const preferences = preferencesData?.data || null;
  const visibleMetrics = preferences?.visible_metrics || [...DEFAULT_PIPELINE_METRICS];
  const selectedCount = visibleMetrics.length;
  const canSelectMore = selectedCount < MAX_SELECTED_METRICS;
  const canSelectLess = selectedCount > MIN_SELECTED_METRICS;

  const state: PipelineMetricsPreferencesState = useMemo(() => ({
    preferences,
    visibleMetrics,
    isLoading,
    isError,
    error: error as Error | null,
    isUpdating: updateMutation.isPending,
    hasUnsavedChanges: false, // Implementar se necessário
    canSelectMore,
    selectedCount,
    maxSelectable: MAX_SELECTED_METRICS,
    minSelectable: MIN_SELECTED_METRICS
  }), [preferences, visibleMetrics, isLoading, isError, error, updateMutation.isPending, canSelectMore, selectedCount]);

  // ============================================
  // AÇÕES
  // ============================================

  const updateMetrics = useCallback(async (metrics: MetricId[]) => {
    // Validações
    if (!validateMetricsSelection(metrics)) {
      throw new Error(`Seleção inválida: deve ter entre ${MIN_SELECTED_METRICS} e ${MAX_SELECTED_METRICS} métricas`);
    }

    // Verificar se houve mudanças
    if (!hasMetricsPreferencesChanged(metrics, visibleMetrics)) {
      logger.debug('Nenhuma mudança detectada, ignorando atualização', LogContext.PIPELINE);
      return;
    }

    await updateMutation.mutateAsync({
      visible_metrics: metrics,
      metrics_order: metrics // Usar mesma ordem por enquanto
    });
  }, [visibleMetrics, updateMutation]);

  const toggleMetric = useCallback(async (metricId: MetricId) => {
    const currentMetrics = [...visibleMetrics];
    const isSelected = currentMetrics.includes(metricId);

    if (isSelected) {
      // Remover métrica
      if (currentMetrics.length <= MIN_SELECTED_METRICS) {
        throw new Error(`Mínimo de ${MIN_SELECTED_METRICS} métrica${MIN_SELECTED_METRICS > 1 ? 's' : ''} deve${MIN_SELECTED_METRICS > 1 ? 'm' : ''} estar selecionada${MIN_SELECTED_METRICS > 1 ? 's' : ''}`);
      }
      
      const newMetrics = currentMetrics.filter(id => id !== metricId);
      await updateMetrics(newMetrics);
    } else {
      // Adicionar métrica
      if (currentMetrics.length >= MAX_SELECTED_METRICS) {
        throw new Error(`Máximo de ${MAX_SELECTED_METRICS} métricas podem estar selecionadas`);
      }
      
      const newMetrics = [...currentMetrics, metricId];
      await updateMetrics(newMetrics);
    }
  }, [visibleMetrics, updateMetrics]);

  const resetToDefault = useCallback(async () => {
    await updateMetrics([...DEFAULT_PIPELINE_METRICS]);
  }, [updateMetrics]);

  const isMetricSelected = useCallback((metricId: MetricId): boolean => {
    return visibleMetrics.includes(metricId);
  }, [visibleMetrics]);

  const canAddMetric = useCallback((): boolean => {
    return selectedCount < MAX_SELECTED_METRICS;
  }, [selectedCount]);

  const canRemoveMetric = useCallback((): boolean => {
    return selectedCount > MIN_SELECTED_METRICS;
  }, [selectedCount]);

  const actions: PipelineMetricsPreferencesActions = useMemo(() => ({
    updateMetrics,
    toggleMetric,
    resetToDefault,
    refetch,
    isMetricSelected,
    canAddMetric,
    canRemoveMetric
  }), [updateMetrics, toggleMetric, resetToDefault, refetch, isMetricSelected, canAddMetric, canRemoveMetric]);

  // ============================================
  // DEBUG INFO
  // ============================================

  const debugInfo = useMemo(() => ({
    pipelineId: pipelineId.substring(0, 8) + '...',
    tenantId: user?.tenant_id?.substring(0, 8) + '...' || 'unknown',
    queryKey: pipelineMetricsPreferencesKeys.pipeline(pipelineId),
    selectedMetrics: visibleMetrics,
    canSelectMore,
    canSelectLess,
    isOptimisticUpdatesEnabled: enableOptimisticUpdates,
    mutationStatus: updateMutation.status
  }), [pipelineId, user?.tenant_id, visibleMetrics, canSelectMore, canSelectLess, enableOptimisticUpdates, updateMutation.status]);

  return {
    ...state,
    ...actions,
    debugInfo
  };
};

// ============================================
// HOOK PARA MÚLTIPLAS PIPELINES (FUTURO)
// ============================================

export const useMultiplePipelineMetricsPreferences = (pipelineIds: string[]) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: pipelineMetricsPreferencesKeys.multiple(pipelineIds, user?.tenant_id || ''),
    queryFn: async () => {
      if (!user?.tenant_id) {
        throw new Error('Usuário não autenticado');
      }

      const response = await api.post('/pipeline-metrics-preferences/multiple', {
        pipeline_ids: pipelineIds,
        tenant_id: user.tenant_id
      });

      return response.data;
    },
    enabled: !!user?.tenant_id && pipelineIds.length > 0,
    staleTime: 5 * 60 * 1000
  });
};

export default usePipelineMetricsPreferences;
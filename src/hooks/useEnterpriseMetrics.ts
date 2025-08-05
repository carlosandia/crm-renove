/**
 * ENTERPRISE METRICS HOOK
 * Hook TanStack Query para métricas enterprise
 * 
 * Integra com o EnterpriseMetricsService e gerencia cache automático
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { 
  EnterpriseMetrics, 
  DetailedMetrics,
  MetricsFilters,
  FiltersResponse,
  UseEnterpriseMetricsOptions,
  UseEnterpriseMetricsReturn,
  PredefinedPeriod,
  CACHE_CONFIG,
  DEFAULT_PERIOD,
  isValidPeriod
} from '../types/EnterpriseMetrics';
import { EnterpriseMetricsService, metricsQueryKeys } from '../services/metricsApi';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formatar valores para exibição
 */
const formatValue = (value: number, type: 'currency' | 'percentage' | 'number'): string => {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'number':
      return new Intl.NumberFormat('pt-BR').format(value);
    default:
      return value.toString();
  }
};

/**
 * Verificar se dados estão obsoletos
 */
const isDataStale = (lastUpdated: string | null, staleTime: number): boolean => {
  if (!lastUpdated) return true;
  const lastUpdateTime = new Date(lastUpdated).getTime();
  const now = Date.now();
  return (now - lastUpdateTime) > staleTime;
};

// ============================================================================
// MAIN HOOK
// ============================================================================

export const useEnterpriseMetrics = (
  options: UseEnterpriseMetricsOptions = {}
): UseEnterpriseMetricsReturn => {
  
  // ============================================================================
  // CONFIGURAÇÃO E ESTADO
  // ============================================================================
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const {
    initialFilters = {},
    initialPeriod = DEFAULT_PERIOD,
    enableAutoRefresh = true,
    autoRefreshInterval = 5 * 60 * 1000, // 5 minutos
    cacheTime = CACHE_CONFIG.BASIC_METRICS.cacheTime,
    staleTime = CACHE_CONFIG.BASIC_METRICS.staleTime,
    enabled = true,
    loadDetailed = false,
    loadFilters = true,
    onSuccess,
    onError
  } = options;
  
  // Estado local para filtros
  const [currentFilters, setCurrentFilters] = useState<MetricsFilters>(() => {
    if (!user?.tenant_id) {
      return {
        tenant_id: '',
        start_date: '',
        end_date: ''
      };
    }
    
    const periodDates = EnterpriseMetricsService.getPeriodDates(initialPeriod);
    return {
      tenant_id: user.tenant_id,
      start_date: periodDates.start_date,
      end_date: periodDates.end_date,
      ...initialFilters
    };
  });
  
  // ============================================================================
  // QUERIES TANSTACK
  // ============================================================================
  
  // Query para métricas básicas
  const metricsQuery = useQuery({
    queryKey: metricsQueryKeys.list(currentFilters),
    queryFn: () => EnterpriseMetricsService.getMetrics(currentFilters),
    enabled: Boolean(enabled && !!currentFilters.tenant_id),
    staleTime,
    gcTime: cacheTime,
    refetchInterval: enableAutoRefresh ? autoRefreshInterval : false,
    retry: (failureCount, error: any) => {
      // AIDEV-NOTE: Não retry para ERR_CONNECTION_REFUSED ou Network Error
      if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error' || error?.code === 'ECONNREFUSED' || error?.code === 'ERR_CONNECTION_REFUSED') {
        return false;
      }
      return failureCount < 2; // Máximo 2 retries para outros erros
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000)
  });
  
  // Query para métricas detalhadas (opcional)
  const detailedQuery = useQuery({
    queryKey: metricsQueryKeys.detail(currentFilters),
    queryFn: () => EnterpriseMetricsService.getDetailedMetrics(currentFilters),
    enabled: Boolean(enabled && loadDetailed && !!currentFilters.tenant_id),
    staleTime: CACHE_CONFIG.DETAILED_METRICS.staleTime,
    gcTime: CACHE_CONFIG.DETAILED_METRICS.cacheTime,
    retry: (failureCount, error: any) => {
      // AIDEV-NOTE: Não retry para ERR_CONNECTION_REFUSED ou Network Error
      if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error' || error?.code === 'ECONNREFUSED' || error?.code === 'ERR_CONNECTION_REFUSED') {
        return false;
      }
      return failureCount < 1; // Máximo 1 retry para outros erros
    }
  });
  
  // Query para filtros disponíveis
  const filtersQuery = useQuery({
    queryKey: metricsQueryKeys.filters(currentFilters.tenant_id),
    queryFn: () => EnterpriseMetricsService.getFilters(currentFilters.tenant_id),
    enabled: Boolean(enabled && loadFilters && !!currentFilters.tenant_id),
    staleTime: CACHE_CONFIG.FILTERS.staleTime,
    gcTime: CACHE_CONFIG.FILTERS.cacheTime,
    retry: (failureCount, error: any) => {
      // AIDEV-NOTE: Não retry para ERR_CONNECTION_REFUSED ou Network Error
      if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error' || error?.code === 'ECONNREFUSED' || error?.code === 'ERR_CONNECTION_REFUSED') {
        return false;
      }
      return failureCount < 1; // Máximo 1 retry para outros erros
    }
  });
  
  // ============================================================================
  // MUTATIONS PARA INVALIDAÇÃO
  // ============================================================================
  
  const invalidateMutation = useMutation({
    mutationFn: async () => {
      await EnterpriseMetricsService.invalidateCache(currentFilters.tenant_id);
    },
    onSuccess: () => {
      // Invalidar todas queries relacionadas
      queryClient.invalidateQueries({ queryKey: metricsQueryKeys.all });
      console.log('🔄 [useEnterpriseMetrics] Cache invalidado');
    }
  });
  
  // ============================================================================
  // FUNÇÕES DE CONTROLE
  // ============================================================================
  
  const refetch = useCallback(async () => {
    console.log('🔄 [useEnterpriseMetrics] Refetch manual');
    await metricsQuery.refetch();
  }, [metricsQuery]);
  
  const refetchDetailed = useCallback(async () => {
    if (loadDetailed) {
      console.log('🔄 [useEnterpriseMetrics] Refetch detailed');
      await detailedQuery.refetch();
    }
  }, [detailedQuery, loadDetailed]);
  
  const refetchFilters = useCallback(async () => {
    if (loadFilters) {
      console.log('🔄 [useEnterpriseMetrics] Refetch filters');
      await filtersQuery.refetch();
    }
  }, [filtersQuery, loadFilters]);
  
  const clearCache = useCallback(() => {
    console.log('🗑️ [useEnterpriseMetrics] Limpando cache');
    queryClient.removeQueries({ queryKey: metricsQueryKeys.all });
    invalidateMutation.mutate();
  }, [queryClient, invalidateMutation]);
  
  // ============================================================================
  // FUNÇÕES DE FILTRO
  // ============================================================================
  
  const updateFilters = useCallback((newFilters: Partial<MetricsFilters>) => {
    console.log('📊 [useEnterpriseMetrics] Atualizando filtros:', newFilters);
    setCurrentFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);
  
  const setPeriod = useCallback((period: PredefinedPeriod) => {
    if (!isValidPeriod(period)) {
      console.warn('⚠️ [useEnterpriseMetrics] Período inválido:', period);
      return;
    }
    
    console.log('📅 [useEnterpriseMetrics] Definindo período:', period);
    const dates = EnterpriseMetricsService.getPeriodDates(period);
    setCurrentFilters(prev => ({
      ...prev,
      start_date: dates.start_date,
      end_date: dates.end_date
    }));
  }, []);
  
  const setDateRange = useCallback((start: string, end: string) => {
    console.log('📅 [useEnterpriseMetrics] Definindo range:', { start, end });
    setCurrentFilters(prev => ({
      ...prev,
      start_date: start,
      end_date: end
    }));
  }, []);
  
  const getCurrentFilters = useCallback(() => currentFilters, [currentFilters]);
  
  const isDataStaleCheck = useCallback(() => {
    return isDataStale((metricsQuery.data as EnterpriseMetrics)?.last_updated || null, staleTime);
  }, [metricsQuery.data, staleTime]);
  
  // ============================================================================
  // EFEITOS
  // ============================================================================
  
  // Callbacks de sucesso e erro
  useEffect(() => {
    if (metricsQuery.isSuccess && metricsQuery.data) {
      console.log('✅ [useEnterpriseMetrics] Métricas carregadas:', metricsQuery.data);
      onSuccess?.(metricsQuery.data);
    }
  }, [metricsQuery.isSuccess, metricsQuery.data, onSuccess]);
  
  useEffect(() => {
    if (metricsQuery.isError && metricsQuery.error) {
      console.error('❌ [useEnterpriseMetrics] Erro:', metricsQuery.error);
      onError?.(metricsQuery.error.message);
    }
  }, [metricsQuery.isError, metricsQuery.error, onError]);
  
  useEffect(() => {
    if (detailedQuery.isError && detailedQuery.error) {
      console.error('❌ [useEnterpriseMetrics] Erro detalhado:', detailedQuery.error);
      onError?.(detailedQuery.error.message);
    }
  }, [detailedQuery.isError, detailedQuery.error, onError]);
  
  useEffect(() => {
    if (filtersQuery.isError && filtersQuery.error) {
      console.error('❌ [useEnterpriseMetrics] Erro filtros:', filtersQuery.error);
    }
  }, [filtersQuery.isError, filtersQuery.error]);
  
  // Atualizar tenant_id quando usuário muda
  useEffect(() => {
    if (user?.tenant_id && currentFilters.tenant_id !== user.tenant_id) {
      console.log('👤 [useEnterpriseMetrics] Atualizando tenant_id:', user.tenant_id);
      setCurrentFilters(prev => ({
        ...prev,
        tenant_id: user.tenant_id
      }));
    }
  }, [user?.tenant_id, currentFilters.tenant_id]);
  
  // Auto refresh quando habilitado
  useEffect(() => {
    if (!enableAutoRefresh || !autoRefreshInterval) return;
    
    const interval = setInterval(() => {
      if (isDataStaleCheck()) {
        console.log('🔄 [useEnterpriseMetrics] Auto refresh triggered');
        refetch();
      }
    }, autoRefreshInterval);
    
    return () => clearInterval(interval);
  }, [enableAutoRefresh, autoRefreshInterval, isDataStaleCheck, refetch]);
  
  // ============================================================================
  // RETURN OBJECT
  // ============================================================================
  
  return {
    // Dados
    metrics: metricsQuery.data as EnterpriseMetrics | null,
    detailedMetrics: detailedQuery.data as DetailedMetrics | null,
    availableFilters: filtersQuery.data as FiltersResponse | null,
    
    // Estados de carregamento
    isLoading: metricsQuery.isLoading || metricsQuery.isFetching,
    isLoadingDetailed: detailedQuery.isLoading || detailedQuery.isFetching,
    isLoadingFilters: filtersQuery.isLoading || filtersQuery.isFetching,
    
    // Estados de erro
    error: metricsQuery.error?.message || null,
    detailedError: detailedQuery.error?.message || null,
    filtersError: filtersQuery.error?.message || null,
    
    // Cache e metadata
    lastUpdated: (metricsQuery.data as EnterpriseMetrics)?.last_updated || null,
    isCached: !metricsQuery.isStale,
    
    // Funções de controle
    refetch,
    refetchDetailed,
    refetchFilters,
    
    // Funções de filtro
    updateFilters,
    setPeriod,
    setDateRange,
    
    // Funções de cache
    clearCache,
    
    // Utilities
    getCurrentFilters,
    isDataStale: isDataStaleCheck,
    formatValue
  };
};

// ============================================================================
// HOOKS ESPECIALIZADOS
// ============================================================================

/**
 * Hook simplificado para métricas básicas
 */
export const useBasicMetrics = (tenantId?: string) => {
  return useEnterpriseMetrics({
    enabled: !!tenantId,
    loadDetailed: false,
    loadFilters: false,
    cacheTime: CACHE_CONFIG.BASIC_METRICS.cacheTime,
    staleTime: CACHE_CONFIG.BASIC_METRICS.staleTime
  });
};

/**
 * Hook para métricas com breakdown
 */
export const useDetailedMetrics = (tenantId?: string) => {
  return useEnterpriseMetrics({
    enabled: !!tenantId,
    loadDetailed: true,
    loadFilters: true,
    cacheTime: CACHE_CONFIG.DETAILED_METRICS.cacheTime,
    staleTime: CACHE_CONFIG.DETAILED_METRICS.staleTime
  });
};

/**
 * Hook somente para filtros
 */
export const useMetricsFilters = (tenantId?: string) => {
  return useEnterpriseMetrics({
    enabled: !!tenantId,
    loadDetailed: false,
    loadFilters: true,
    cacheTime: CACHE_CONFIG.FILTERS.cacheTime,
    staleTime: CACHE_CONFIG.FILTERS.staleTime
  });
};

export default useEnterpriseMetrics;
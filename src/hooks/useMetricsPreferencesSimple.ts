// =====================================================================================
// HOOK: useMetricsPreferencesSimple
// Autor: Claude (Arquiteto Sênior)
// Descrição: Versão simplificada para teste da persistência de métricas
// =====================================================================================

import { useState, useEffect, useCallback } from 'react';
import { 
  MetricsPreferences, 
  UpdateMetricsPreferences,
  DEFAULT_VISIBLE_METRICS,
  validateMetricsSelection,
  type MetricId
} from '../shared/schemas/metrics-preferences';

const STORAGE_KEY = 'crm_metrics_preferences_simple';

interface SimpleMetricsData {
  visible_metrics: MetricId[];
  updated_at: string;
  user_id: string;
}

// =====================================================================================
// Hook Simplificado para Teste
// =====================================================================================

export function useMetricsPreferencesSimple() {
  const [visibleMetrics, setVisibleMetrics] = useState<MetricId[]>(DEFAULT_VISIBLE_METRICS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock user - em produção seria obtido do useAuth
  const currentUser = {
    id: 'test-user-simple',
    tenant_id: 'test-tenant-simple'
  };

  // ============================================
  // FUNÇÕES DE PERSISTÊNCIA SIMPLIFICADAS
  // ============================================

  const saveToLocalStorage = useCallback((metrics: MetricId[]) => {
    try {
      const data: SimpleMetricsData = {
        visible_metrics: validateMetricsSelection(metrics),
        updated_at: new Date().toISOString(),
        user_id: currentUser.id
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('💾 [Simple] Métricas salvas:', {
        count: data.visible_metrics.length,
        metrics: data.visible_metrics
      });
      return true;
    } catch (error) {
      console.error('❌ [Simple] Erro ao salvar:', error);
      setError('Erro ao salvar preferências');
      return false;
    }
  }, [currentUser.id]);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const rawData = localStorage.getItem(STORAGE_KEY);
      if (!rawData) {
        console.log('📂 [Simple] Nenhum dado encontrado, usando padrões');
        return DEFAULT_VISIBLE_METRICS;
      }

      const data: SimpleMetricsData = JSON.parse(rawData);
      console.log('📖 [Simple] Métricas carregadas:', {
        count: data.visible_metrics.length,
        metrics: data.visible_metrics,
        age: Date.now() - new Date(data.updated_at).getTime()
      });

      return validateMetricsSelection(data.visible_metrics);
    } catch (error) {
      console.error('❌ [Simple] Erro ao carregar:', error);
      setError('Erro ao carregar preferências');
      return DEFAULT_VISIBLE_METRICS;
    }
  }, []);

  // ============================================
  // EFEITO DE INICIALIZAÇÃO
  // ============================================

  useEffect(() => {
    console.log('🚀 [Simple] Inicializando hook simplificado');
    setIsLoading(true);
    
    // Simular delay de carregamento
    setTimeout(() => {
      const loadedMetrics = loadFromLocalStorage();
      setVisibleMetrics(loadedMetrics);
      setIsLoading(false);
      console.log('✅ [Simple] Hook inicializado com', loadedMetrics.length, 'métricas');
    }, 100);
  }, [loadFromLocalStorage]);

  // ============================================
  // MÉTODOS PÚBLICOS
  // ============================================

  const updateVisibleMetrics = useCallback(async (newMetrics: MetricId[]) => {
    console.log('🔄 [Simple] Atualizando métricas:', newMetrics);
    
    const validatedMetrics = validateMetricsSelection(newMetrics);
    
    // Salvar imediatamente no localStorage
    const saved = saveToLocalStorage(validatedMetrics);
    
    if (saved) {
      // Atualizar estado local
      setVisibleMetrics(validatedMetrics);
      console.log('✅ [Simple] Métricas atualizadas com sucesso');
    }
  }, [saveToLocalStorage]);

  const toggleMetric = useCallback(async (metricId: MetricId) => {
    console.log(`🔄 [Simple] Alternando métrica: ${metricId}`);
    
    const currentMetrics = visibleMetrics;
    const isVisible = currentMetrics.includes(metricId);
    
    let newMetrics: MetricId[];
    if (isVisible) {
      newMetrics = currentMetrics.filter(id => id !== metricId);
      console.log(`➖ [Simple] Removendo métrica: ${metricId}`);
    } else {
      newMetrics = [...currentMetrics, metricId];
      console.log(`➕ [Simple] Adicionando métrica: ${metricId}`);
    }
    
    await updateVisibleMetrics(newMetrics);
  }, [visibleMetrics, updateVisibleMetrics]);

  const showAllMetrics = useCallback(async () => {
    console.log('👁️ [Simple] Mostrando todas as métricas');
    await updateVisibleMetrics(DEFAULT_VISIBLE_METRICS);
  }, [updateVisibleMetrics]);

  const hideAllMetrics = useCallback(async () => {
    console.log('🙈 [Simple] Ocultando todas as métricas');
    await updateVisibleMetrics([]);
  }, [updateVisibleMetrics]);

  const resetToDefault = useCallback(async () => {
    console.log('🔄 [Simple] Resetando para padrão');
    await updateVisibleMetrics(DEFAULT_VISIBLE_METRICS);
  }, [updateVisibleMetrics]);

  const isMetricVisible = useCallback((metricId: MetricId): boolean => {
    return visibleMetrics.includes(metricId);
  }, [visibleMetrics]);

  // ============================================
  // ESTATÍSTICAS
  // ============================================

  const statistics = {
    totalVisible: visibleMetrics.length,
    totalAvailable: DEFAULT_VISIBLE_METRICS.length,
    isDefault: JSON.stringify(visibleMetrics.sort()) === JSON.stringify(DEFAULT_VISIBLE_METRICS.sort()),
    hasChanges: JSON.stringify(visibleMetrics.sort()) !== JSON.stringify(DEFAULT_VISIBLE_METRICS.sort())
  };

  // ============================================
  // DEBUG INFO
  // ============================================

  const debugInfo = {
    storageKey: STORAGE_KEY,
    rawData: localStorage.getItem(STORAGE_KEY),
    currentUser: currentUser,
    visibleMetrics: visibleMetrics,
    statistics: statistics
  };

  // ============================================
  // RETORNO DO HOOK
  // ============================================

  return {
    // Dados
    visibleMetrics,
    statistics,
    
    // Estados
    isLoading,
    isUpdating: false, // Simplificado - sem API calls
    error,
    
    // Métodos
    updateVisibleMetrics,
    showAllMetrics,
    hideAllMetrics,
    toggleMetric,
    isMetricVisible,
    resetToDefault,
    
    // Debug
    debugInfo
  };
}
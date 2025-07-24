// =====================================================================================
// HOOK: useMetricsPreferences
// Autor: Claude (Arquiteto Sênior)
// Descrição: Hook para gerenciamento de preferências de métricas do usuário
// =====================================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext'; // ✅ CORREÇÃO: Usar AuthContext ao invés de parsing manual
import { 
  MetricsPreferences, 
  UpdateMetricsPreferences,
  DEFAULT_VISIBLE_METRICS,
  validateMetricsSelection,
  type MetricId
} from '../shared/schemas/metrics-preferences';
import { metricsStorageService } from '../services/metricsStorageService';
import { logIfEnabled, LogContext, debouncedLog } from '../utils/loggerOptimized';

// AIDEV-NOTE: Interface para resposta da API de preferências
interface UserPreferencesResponse {
  success: boolean;
  data: {
    id: string | null;
    user_id: string;
    tenant_id: string;
    preferences: {
      metrics_visibility?: {
        visible_metrics: string[];
        updated_at: string;
      };
    };
    theme: string;
    language: string;
    timezone: string;
    email_notifications: boolean;
    push_notifications: boolean;
    created_at: string;
    updated_at: string;
  };
  timestamp: string;
}

// AIDEV-NOTE: Interface para resposta de atualização de métricas
interface UpdateMetricsResponse {
  success: boolean;
  data: {
    id: string | null;
    user_id: string;
    tenant_id: string;
    preferences: {
      metrics_visibility?: {
        visible_metrics: string[];
        updated_at: string;
      };
    };
    theme: string;
    language: string;
    timezone: string;
    email_notifications: boolean;
    push_notifications: boolean;
    created_at: string;
    updated_at: string;
  };
  message: string;
  timestamp: string;
}

// AIDEV-NOTE: Query keys para cache management
export const metricsPreferencesQueryKeys = {
  all: ['metrics-preferences'] as const,
  user: () => [...metricsPreferencesQueryKeys.all, 'user'] as const,
};

// =====================================================================================
// Hook Principal: useMetricsPreferences
// =====================================================================================

export function useMetricsPreferences() {
  const queryClient = useQueryClient();
  const isInitialized = useRef(false);
  
  // ✅ CORREÇÃO CRÍTICA: Usar AuthContext ao invés de parsing manual de tokens
  const { user } = useAuth();
  
  // Log otimizado apenas quando há mudanças no usuário
  useEffect(() => {
    if (user) {
      debouncedLog('metrics-preferences-user-auth', 'debug', 
        'Usuário autenticado no hook', LogContext.HOOKS, {
          id: user.id ? user.id.substring(0, 8) + '...' : 'unknown',
          role: user.role,
          email: user.email,
          source: 'AuthContext'
        }, 2000);
    }
  }, [user?.id]); // Só logar quando user.id mudar

  // ============================================
  // QUERY: Buscar preferências do usuário
  // ============================================
  const {
    data: preferencesData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: metricsPreferencesQueryKeys.user(),
    queryFn: async (): Promise<UserPreferencesResponse> => {
      logIfEnabled('ENABLE_HOOK_DEBUGGING', 'debug', 
        'Buscando preferências do usuário', LogContext.HOOKS);
      
      // AIDEV-NOTE: ✅ CORREÇÃO - Primeiro verificar localStorage para resposta imediata
      if (user?.id) {
        const localData = metricsStorageService.loadLocal(user.id);
        if (localData && localData.source === 'server') {
          debouncedLog('metrics-preferences-cache-hit', 'debug', 
            'Usando dados locais como cache rápido', LogContext.HOOKS, 
            { metricsCount: localData.visible_metrics.length }, 3000);
          // Simular estrutura da API para compatibilidade
          const cachedResponse: UserPreferencesResponse = {
            success: true,
            data: {
              id: localData.user_id,
              user_id: localData.user_id,
              tenant_id: localData.tenant_id,
              preferences: {
                metrics_visibility: {
                  visible_metrics: localData.visible_metrics,
                  updated_at: localData.updated_at
                }
              },
              theme: 'light',
              language: 'pt-BR',
              timezone: 'America/Sao_Paulo',
              email_notifications: true,
              push_notifications: true,
              created_at: localData.updated_at,
              updated_at: localData.updated_at
            },
            timestamp: localData.updated_at
          };
          
          // Buscar dados atualizados em background
          setTimeout(() => {
            api.get<UserPreferencesResponse>('/user-preferences')
              .then(response => {
                if (response.data.success) {
                  logIfEnabled('ENABLE_HOOK_DEBUGGING', 'debug', 
                    'Sincronizando dados do servidor em background', LogContext.HOOKS);
                  queryClient.setQueryData(metricsPreferencesQueryKeys.user(), response.data);
                  
                  // Salvar dados atualizados localmente
                  const serverMetrics = response.data.data.preferences?.metrics_visibility?.visible_metrics || [];
                  metricsStorageService.saveLocal(
                    validateMetricsSelection(serverMetrics),
                    response.data.data.user_id,
                    response.data.data.tenant_id,
                    'server'
                  );
                }
              })
              .catch(error => {
                logIfEnabled('ENABLE_HOOK_DEBUGGING', 'warn', 
                  'Falha na sincronização em background', LogContext.HOOKS, error);
              });
          }, 100);
          
          return cachedResponse;
        }
      }
      
      try {
        const response = await api.get<UserPreferencesResponse>('/user-preferences');
        
        logIfEnabled('ENABLE_HOOK_DEBUGGING', 'info', 
          'Resposta da API recebida', LogContext.HOOKS, {
            success: response.data.success,
            hasData: !!response.data.data,
            timestamp: response.data.timestamp
          });
        
        if (!response.data.success) {
          throw new Error('Erro ao buscar preferências do usuário');
        }
        
        // AIDEV-NOTE: ✅ Salvar dados do servidor no localStorage para próximas consultas
        if (user?.id && response.data.data) {
          const serverMetrics = response.data.data.preferences?.metrics_visibility?.visible_metrics || [];
          metricsStorageService.saveLocal(
            validateMetricsSelection(serverMetrics),
            response.data.data.user_id,
            response.data.data.tenant_id,
            'server'
          );
        }
        
        return response.data;
      } catch (error: any) {
        logIfEnabled('ENABLE_HOOK_DEBUGGING', 'error', 
          'Erro na requisição de preferências', LogContext.HOOKS, error);
        
        // AIDEV-NOTE: ✅ FALLBACK - Se API falhar, tentar localStorage
        if (user?.id) {
          const fallbackData = metricsStorageService.getWithFallback(user.id);
          if (fallbackData.length > 0) {
            logIfEnabled('ENABLE_HOOK_DEBUGGING', 'info', 
              'Usando fallback do localStorage', LogContext.HOOKS, 
              { metricsCount: fallbackData.length });
            const fallbackResponse: UserPreferencesResponse = {
              success: true,
              data: {
                id: user.id,
                user_id: user.id,
                tenant_id: user.tenant_id || '',
                preferences: {
                  metrics_visibility: {
                    visible_metrics: fallbackData,
                    updated_at: new Date().toISOString()
                  }
                },
                theme: 'light',
                language: 'pt-BR',
                timezone: 'America/Sao_Paulo',
                email_notifications: true,
                push_notifications: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              timestamp: new Date().toISOString()
            };
            return fallbackResponse;
          }
        }
        
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,  // 5 minutos
    gcTime: 10 * 60 * 1000,     // 10 minutos
    retry: (failureCount, error) => {
      logIfEnabled('ENABLE_HOOK_DEBUGGING', 'info', 
        `Tentativa ${failureCount + 1} de buscar preferências`, LogContext.HOOKS);
      
      // Não tentar para erros 401/403
      if (error && 'status' in error && (error.status === 401 || error.status === 403)) {
        return false;
      }
      
      // ✅ SIMPLIFICADO: Retry padrão limitado
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
    throwOnError: false  // Não propagar erros para Error Boundary
  });

  // ============================================
  // MUTATION: Atualizar preferências de métricas
  // ✅ CORREÇÃO DEFINITIVA: Padrão TanStack Query oficial
  // ============================================
  const updateMetricsMutation = useMutation({
    mutationFn: async (visibleMetrics: MetricId[]): Promise<UpdateMetricsResponse> => {
      logIfEnabled('ENABLE_HOOK_DEBUGGING', 'info', 
        'Atualizando preferências de métricas', LogContext.HOOKS, 
        { metricsCount: visibleMetrics.length });
      
      // AIDEV-NOTE: ✅ CORREÇÃO - Salvamento otimístico no localStorage primeiro
      if (user?.id && user?.tenant_id) {
        metricsStorageService.saveOptimistic(visibleMetrics, user.id, user.tenant_id);
      }
      
      const payload: UpdateMetricsPreferences = {
        visible_metrics: visibleMetrics
      };
      
      try {
        const response = await api.patch<UpdateMetricsResponse>('/user-preferences/metrics', payload);
        
        logIfEnabled('ENABLE_HOOK_DEBUGGING', 'info', 
          'Resposta da mutation recebida', LogContext.HOOKS, {
            success: response.data.success,
            message: response.data.message,
            timestamp: response.data.timestamp,
            metricsCount: response.data.data?.preferences?.metrics_visibility?.visible_metrics?.length || 0
          });
        
        if (!response.data.success) {
          throw new Error(response.data.message || 'Erro ao atualizar preferências');
        }
        
        // AIDEV-NOTE: ✅ Salvar dados confirmados pelo servidor
        if (user?.id && user?.tenant_id && response.data.data.preferences.metrics_visibility) {
          metricsStorageService.saveLocal(
            validateMetricsSelection(response.data.data.preferences.metrics_visibility.visible_metrics),
            user.id,
            user.tenant_id,
            'server'
          );
          metricsStorageService.markSynced();
        }
        
        return response.data;
      } catch (error: any) {
        logIfEnabled('ENABLE_HOOK_DEBUGGING', 'error', 
          'Erro na mutation de preferências', LogContext.HOOKS, error);
        
        // AIDEV-NOTE: ✅ FALLBACK - Se API falhar, manter dados locais (já salvos otimisticamente)
        logIfEnabled('ENABLE_HOOK_DEBUGGING', 'warn', 
          'API falhou, mantendo dados locais temporariamente', LogContext.HOOKS);
        
        // Simular resposta de sucesso para continuar operação local
        const fallbackResponse: UpdateMetricsResponse = {
          success: true,
          data: {
            id: null,
            user_id: user?.id || '',
            tenant_id: user?.tenant_id || '',
            preferences: {
              metrics_visibility: {
                visible_metrics: visibleMetrics,
                updated_at: new Date().toISOString()
              }
            },
            theme: 'light',
            language: 'pt-BR',
            timezone: 'America/Sao_Paulo',
            email_notifications: true,
            push_notifications: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          message: 'Salvo localmente (aguardando sincronização)',
          timestamp: new Date().toISOString()
        };
        
        return fallbackResponse;
      }
    },
    onMutate: async (visibleMetrics: MetricId[]) => {
      logIfEnabled('ENABLE_HOOK_DEBUGGING', 'debug', 
        'Aplicando update otimístico', LogContext.HOOKS, 
        { metricsCount: visibleMetrics.length });
      
      // ✅ PADRÃO OFICIAL: Cancelar queries para evitar conflitos
      await queryClient.cancelQueries({ queryKey: metricsPreferencesQueryKeys.user() });
      
      // Snapshot para rollback
      const previousData = queryClient.getQueryData<UserPreferencesResponse>(
        metricsPreferencesQueryKeys.user()
      );
      
      // ✅ PADRÃO OFICIAL: Update otimístico imediato
      if (previousData) {
        const optimisticData: UserPreferencesResponse = {
          ...previousData,
          data: {
            ...previousData.data,
            preferences: {
              ...previousData.data.preferences,
              metrics_visibility: {
                visible_metrics: visibleMetrics,
                updated_at: new Date().toISOString()
              }
            },
            updated_at: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        };
        
        queryClient.setQueryData<UserPreferencesResponse>(
          metricsPreferencesQueryKeys.user(),
          optimisticData
        );
      }
      
      return { previousData };
    },
    onSuccess: (responseData, variables) => {
      logIfEnabled('ENABLE_HOOK_DEBUGGING', 'info', 
        'Mutation bem-sucedida, atualizando cache', LogContext.HOOKS, {
          success: responseData.success,
          timestamp: responseData.timestamp,
          metricsCount: responseData.data?.preferences?.metrics_visibility?.visible_metrics?.length || 0
        });
      
      // ✅ CORREÇÃO DEFINITIVA: Usar dados completos retornados pela mutation
      // Backend agora retorna estrutura completa - usar diretamente
      const updatedData: UserPreferencesResponse = {
        success: true,
        data: responseData.data, // Backend já retorna estrutura completa
        timestamp: responseData.timestamp
      };
      
      debouncedLog('metrics-preferences-cache-update', 'debug', 
        'Cache atualizado com dados completos da mutation', LogContext.HOOKS, {
          metricsCount: updatedData.data.preferences.metrics_visibility?.visible_metrics.length,
          dataStructure: 'complete_from_backend'
        }, 1000);
      
      queryClient.setQueryData<UserPreferencesResponse>(
        metricsPreferencesQueryKeys.user(),
        updatedData
      );
    },
    onError: (error, variables, context) => {
      logIfEnabled('ENABLE_HOOK_DEBUGGING', 'error', 
        'Erro ao atualizar preferências', LogContext.HOOKS, error);
      
      // ✅ PADRÃO OFICIAL: Rollback usando dados do contexto
      if (context?.previousData) {
        logIfEnabled('ENABLE_HOOK_DEBUGGING', 'warn', 
          'Fazendo rollback do update otimístico', LogContext.HOOKS);
        queryClient.setQueryData(
          metricsPreferencesQueryKeys.user(),
          context.previousData
        );
      }
    }
    // ✅ CORREÇÃO CRÍTICA: REMOVER onSettled + invalidateQueries
    // Isso elimina race conditions e conflitos com setQueryData
  });

  // ============================================
  // DADOS PROCESSADOS
  // ============================================
  
  // AIDEV-NOTE: ✅ CORREÇÃO CRÍTICA - Usar estado React em vez de getter computado
  const [localVisibleMetrics, setLocalVisibleMetrics] = useState<MetricId[]>(() => {
    // Inicialização - tentar carregar do localStorage
    try {
      if (user?.id) {
        const localData = metricsStorageService.loadLocal(user.id);
        if (localData && localData.visible_metrics && localData.visible_metrics.length >= 0) {
          debouncedLog('metrics-preferences-init-local', 'debug', 
            'Inicialização com dados locais', LogContext.HOOKS, {
              total: localData.visible_metrics.length
            }, 2000);
          return validateMetricsSelection(localData.visible_metrics);
        }
      }
    } catch (error) {
      logIfEnabled('ENABLE_HOOK_DEBUGGING', 'error', 
        'Erro na inicialização', LogContext.HOOKS, error);
    }
    return DEFAULT_VISIBLE_METRICS;
  });

  // Estado final das métricas visíveis
  const visibleMetrics: MetricId[] = localVisibleMetrics;

  // ============================================
  // SINCRONIZAÇÃO AUTOMÁTICA
  // ============================================
  
  // AIDEV-NOTE: ✅ Sincronização quando aba ganha foco
  useEffect(() => {
    const handleFocus = () => {
      if (user?.id && metricsStorageService.needsSync()) {
        debouncedLog('metrics-preferences-focus-sync', 'debug', 
          'Sincronizando ao ganhar foco', LogContext.HOOKS, {}, 1000);
        refetch();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('crm_metrics') && e.newValue !== e.oldValue) {
        debouncedLog('metrics-preferences-storage-change', 'debug', 
          'Mudança detectada no localStorage de outra aba', LogContext.HOOKS, {}, 2000);
        refetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user?.id, refetch]);

  // AIDEV-NOTE: ✅ Sincronização com dados da API quando carregarem
  useEffect(() => {
    if (preferencesData?.data?.preferences?.metrics_visibility && user?.id) {
      const serverMetrics = preferencesData.data.preferences.metrics_visibility.visible_metrics;
      if (Array.isArray(serverMetrics)) {
        const validatedMetrics = validateMetricsSelection(serverMetrics);
        
        // Verificar se os dados locais estão desatualizados
        const localData = metricsStorageService.loadLocal(user.id);
        const shouldUpdate = !localData || 
          JSON.stringify(localData.visible_metrics) !== JSON.stringify(validatedMetrics);
        
        if (shouldUpdate) {
          debouncedLog('metrics-preferences-api-sync', 'debug', 
            'Sincronizando com API', LogContext.HOOKS, {
              server: validatedMetrics.length,
              local: localData?.visible_metrics?.length || 0
            }, 2000);
          
          setLocalVisibleMetrics(validatedMetrics);
          
          // Salvar dados do servidor localmente
          metricsStorageService.saveLocal(
            validatedMetrics,
            user.id,
            user.tenant_id,
            'server'
          );
        }
      }
    }
  }, [preferencesData, user?.id, user?.tenant_id]);

  // AIDEV-NOTE: ✅ Inicialização com dados locais se não houver dados da API
  useEffect(() => {
    if (!isInitialized.current && user?.id && !isLoading && !preferencesData) {
      const localData = metricsStorageService.loadLocal(user.id);
      if (localData) {
        logIfEnabled('ENABLE_HOOK_DEBUGGING', 'debug', 
          'Inicializando com dados locais (fallback)', LogContext.HOOKS, 
          { metricsCount: localData.visible_metrics.length });
        setLocalVisibleMetrics(validateMetricsSelection(localData.visible_metrics));
      }
      isInitialized.current = true;
    }
  }, [user?.id, isLoading, preferencesData]);

  // Status das operações
  const isUpdating = updateMetricsMutation.isPending;
  const updateError = updateMetricsMutation.error;

  // ============================================
  // MÉTODOS PÚBLICOS
  // ============================================
  
  /**
   * Atualizar métricas visíveis
   */
  const updateVisibleMetrics = async (newMetrics: MetricId[]) => {
    const validatedMetrics = validateMetricsSelection(newMetrics);
    
    debouncedLog('metrics-preferences-update', 'debug', 
      'Atualizando métricas visíveis', LogContext.HOOKS, {
        prev: localVisibleMetrics.length,
        new: validatedMetrics.length
      }, 500);
    
    // AIDEV-NOTE: ✅ CORREÇÃO CRÍTICA - Atualizar estado React imediatamente
    setLocalVisibleMetrics(validatedMetrics);
    
    // AIDEV-NOTE: ✅ Salvar no localStorage imediatamente
    if (user?.id && user?.tenant_id) {
      const saved = metricsStorageService.saveLocal(
        validatedMetrics, 
        user.id, 
        user.tenant_id, 
        'local'
      );
      logIfEnabled('ENABLE_HOOK_DEBUGGING', 'debug', 
        'Salvamento imediato no localStorage', LogContext.HOOKS, { saved });
    }
    
    // Tentar sincronizar com servidor em background (sem aguardar)
    updateMetricsMutation.mutate(validatedMetrics);
  };

  /**
   * Mostrar todas as métricas
   */
  const showAllMetrics = async () => {
    updateVisibleMetrics(DEFAULT_VISIBLE_METRICS);
  };

  /**
   * Ocultar todas as métricas
   */
  const hideAllMetrics = async () => {
    updateVisibleMetrics([]);
  };

  /**
   * Alternar visibilidade de uma métrica específica
   */
  const toggleMetric = async (metricId: MetricId) => {
    const currentMetrics = visibleMetrics;
    const isVisible = currentMetrics.includes(metricId);
    
    let newMetrics: MetricId[];
    if (isVisible) {
      // Remover métrica
      newMetrics = currentMetrics.filter(id => id !== metricId);
    } else {
      // Adicionar métrica
      newMetrics = [...currentMetrics, metricId];
    }
    
    updateVisibleMetrics(newMetrics);
  };

  /**
   * Verificar se uma métrica está visível
   */
  const isMetricVisible = (metricId: MetricId): boolean => {
    return visibleMetrics.includes(metricId);
  };

  /**
   * Resetar para configuração padrão
   */
  const resetToDefault = async () => {
    updateVisibleMetrics(DEFAULT_VISIBLE_METRICS);
  };

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
  // RETORNO DO HOOK
  // ============================================
  
  return {
    // Dados
    visibleMetrics,
    statistics,
    
    // Estados
    isLoading,
    isUpdating,
    error: error || updateError,
    
    // Métodos
    updateVisibleMetrics,
    showAllMetrics,
    hideAllMetrics,
    toggleMetric,
    isMetricVisible,
    resetToDefault,
    refetch,
    
    // Raw data para debugging
    rawData: preferencesData?.data,
    
    // AIDEV-NOTE: ✅ Informações de debug do sistema híbrido
    debugInfo: {
      localStorage: metricsStorageService.getDebugInfo(),
      hasLocalData: !!metricsStorageService.loadLocal(user?.id),
      needsSync: metricsStorageService.needsSync(),
      lastSync: metricsStorageService.getLastSyncTime(),
      userId: user?.id ? user.id.substring(0, 8) + '...' : 'none'
    }
  };
}

// =====================================================================================
// Hook Auxiliar: useMetricsVisibility  
// =====================================================================================

/**
 * Hook simplificado que retorna apenas a visibilidade das métricas
 * Útil para componentes que só precisam saber quais métricas mostrar
 */
export function useMetricsVisibility() {
  const { visibleMetrics, isLoading, error } = useMetricsPreferences();
  
  return {
    visibleMetrics,
    isLoading,
    error,
    isMetricVisible: (metricId: MetricId) => visibleMetrics.includes(metricId)
  };
}

// =====================================================================================
// Hook para Estatísticas
// =====================================================================================

/**
 * Hook que retorna estatísticas sobre as preferências de métricas
 */
export function useMetricsStatistics() {
  const { statistics, isLoading } = useMetricsPreferences();
  
  return {
    ...statistics,
    isLoading
  };
}
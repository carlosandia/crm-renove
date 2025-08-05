import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { logIfEnabled, LogContext, debouncedLog } from '../utils/loggerOptimized';

interface TemperatureConfig {
  id?: string;
  pipeline_id: string;
  tenant_id: string;
  hot_threshold: number;
  warm_threshold: number;
  cold_threshold: number;
  hot_color: string;
  warm_color: string;
  cold_color: string;
  frozen_color: string;
  hot_icon: string;
  warm_icon: string;
  cold_icon: string;
  frozen_icon: string;
  created_at?: string;
  updated_at?: string;
}

// AIDEV-NOTE: Query keys para cache management - evita 15 chamadas duplicadas
export const temperatureQueryKeys = {
  all: ['temperature-config'] as const,
  pipeline: (pipelineId: string) => [...temperatureQueryKeys.all, 'pipeline', pipelineId] as const,
};

// API functions - separadas para melhor testabilidade
const temperatureAPI = {
  async getConfig(pipelineId: string): Promise<TemperatureConfig | null> {
    if (!pipelineId) throw new Error('Pipeline ID é obrigatório');

    try {
      const response = await api.get(`/pipelines/${pipelineId}/temperature-config`);
      
      if (response.data?.success) {
        return response.data.data;
      } else {
        throw new Error(response.data?.error || 'Erro ao carregar configuração');
      }
    } catch (err: any) {
      // Se erro 404, retornar configuração padrão
      if (err.response?.status === 404) {
        return {
          pipeline_id: pipelineId,
          tenant_id: '',
          hot_threshold: 24,
          warm_threshold: 72,
          cold_threshold: 168,
          hot_color: '#ef4444',
          warm_color: '#f97316',
          cold_color: '#3b82f6',
          frozen_color: '#6b7280',
          hot_icon: '🔥',
          warm_icon: '🌡️',
          cold_icon: '❄️',
          frozen_icon: '🧊'
        };
      }
      throw err;
    }
  },

  async saveConfig(pipelineId: string, configData: Partial<TemperatureConfig>): Promise<TemperatureConfig> {
    if (!pipelineId) throw new Error('Pipeline ID é obrigatório');

    const response = await api.post(`/pipelines/${pipelineId}/temperature-config`, configData);
    
    if (response.data?.success) {
      return response.data.data;
    } else {
      throw new Error(response.data?.error || 'Erro ao salvar configuração');
    }
  },

  async deleteConfig(pipelineId: string): Promise<void> {
    if (!pipelineId) throw new Error('Pipeline ID é obrigatório');

    const response = await api.delete(`/pipelines/${pipelineId}/temperature-config`);
    
    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Erro ao deletar configuração');
    }
  }
};

interface UseTemperatureAPIProps {
  pipelineId: string;
  autoLoad?: boolean;
}

// ✅ LOGGER GLOBAL - Sistema centralizado otimizado com feature flags

export function useTemperatureAPI({ pipelineId, autoLoad = true }: UseTemperatureAPIProps) {
  const queryClient = useQueryClient();

  // ✅ CACHE COMPARTILHADO - Uma chamada para múltiplos cards
  const {
    data: config,
    isLoading: loading,
    error: queryError,
    refetch: loadConfig
  } = useQuery({
    queryKey: temperatureQueryKeys.pipeline(pipelineId),
    queryFn: async () => {
      // Log throttleado usando sistema global otimizado
      debouncedLog(`temp-load-${pipelineId}`, 'debug', 
        `Carregando configuração de temperatura para pipeline`, LogContext.HOOKS, 
        { pipelineId: pipelineId.substring(0, 8) + '...' }, 3000);
      
      const result = await temperatureAPI.getConfig(pipelineId);
      
      // Log de sucesso throttleado
      if (result) {
        debouncedLog(`temp-success-${pipelineId}`, 'debug', 
          'Configuração de temperatura carregada com sucesso', LogContext.HOOKS, 
          { pipelineId: pipelineId.substring(0, 8) + '...' }, 5000);
      }
      
      return result;
    },
    enabled: Boolean(!!pipelineId && autoLoad),
    staleTime: 10 * 60 * 1000, // 10 minutos - configs de temperatura mudam raramente
    gcTime: 15 * 60 * 1000,    // 15 minutos - cache longo
    retry: 2,
    refetchOnWindowFocus: false // Evitar refetch desnecessário
  });

  // ✅ MUTATION PARA SALVAR - Com invalidação automática de cache
  const saveMutation = useMutation({
    mutationFn: (configData: Partial<TemperatureConfig>) => 
      temperatureAPI.saveConfig(pipelineId, configData),
    onSuccess: (data) => {
      // Invalidar e atualizar cache automaticamente
      queryClient.setQueryData(temperatureQueryKeys.pipeline(pipelineId), data);
      queryClient.invalidateQueries({ queryKey: temperatureQueryKeys.pipeline(pipelineId) });
      
      logIfEnabled('ENABLE_HOOK_DEBUGGING', 'info', 
        'Configuração de temperatura salva', LogContext.HOOKS, 
        { pipelineId: pipelineId.substring(0, 8) + '...' });
    },
    onError: (error: any) => {
      logIfEnabled('ENABLE_HOOK_DEBUGGING', 'error', 
        'Erro ao salvar configuração de temperatura', LogContext.HOOKS, 
        { error: error.message, pipelineId: pipelineId.substring(0, 8) + '...' });
    }
  });

  // ✅ MUTATION PARA DELETAR - Com invalidação automática de cache
  const deleteMutation = useMutation({
    mutationFn: () => temperatureAPI.deleteConfig(pipelineId),
    onSuccess: () => {
      // Remover do cache
      queryClient.setQueryData(temperatureQueryKeys.pipeline(pipelineId), null);
      queryClient.invalidateQueries({ queryKey: temperatureQueryKeys.pipeline(pipelineId) });
      
      logIfEnabled('ENABLE_HOOK_DEBUGGING', 'info', 
        'Configuração de temperatura deletada', LogContext.HOOKS, 
        { pipelineId: pipelineId.substring(0, 8) + '...' });
    },
    onError: (error: any) => {
      logIfEnabled('ENABLE_HOOK_DEBUGGING', 'error', 
        'Erro ao deletar configuração de temperatura', LogContext.HOOKS, 
        { error: error.message, pipelineId: pipelineId.substring(0, 8) + '...' });
    }
  });

  // Helper functions para manter compatibilidade com interface atual
  const saveConfig = async (configData: Partial<TemperatureConfig>) => {
    try {
      await saveMutation.mutateAsync(configData);
      return true;
    } catch (error) {
      return false;
    }
  };

  const deleteConfig = async () => {
    try {
      await deleteMutation.mutateAsync();
      return true;
    } catch (error) {
      return false;
    }
  };

  // ✅ INTERFACE COMPATÍVEL - Zero breaking changes
  return {
    config,
    loading,
    saving: saveMutation.isPending || deleteMutation.isPending,
    error: queryError?.message || saveMutation.error?.message || deleteMutation.error?.message || null,
    loadConfig,
    saveConfig,
    deleteConfig,
    setConfig: (newConfig: TemperatureConfig | null) => {
      // Atualizar cache diretamente - útil para otimistic updates
      queryClient.setQueryData(temperatureQueryKeys.pipeline(pipelineId), newConfig);
    },
    setError: () => {
      // Limpar erros - para compatibilidade
      saveMutation.reset();
      deleteMutation.reset();
    }
  };
}

export type { TemperatureConfig };
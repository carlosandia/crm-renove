/**
 * ============================================
 * 🪝 HOOK: USE OUTCOME REASONS
 * ============================================
 * 
 * Hook TanStack Query para gestão de motivos de ganho/perda
 * AIDEV-NOTE: Centraliza lógica de data fetching e cache
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { outcomeReasonsApi } from '../services/outcomeReasonsApi';
import { 
  UseOutcomeReasonsParams,
  CreateOutcomeReasonRequest,
  UpdateOutcomeReasonRequest
} from '../types';

// ============================================
// QUERY KEYS
// ============================================

export const outcomeReasonsKeys = {
  all: ['outcome-reasons'] as const,
  pipeline: (pipelineId: string) => [...outcomeReasonsKeys.all, 'pipeline', pipelineId] as const,
  reasons: (params: UseOutcomeReasonsParams) => [...outcomeReasonsKeys.pipeline(params.pipelineId), 'reasons', params] as const,
  defaults: () => [...outcomeReasonsKeys.all, 'defaults'] as const
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export const useOutcomeReasons = (params: UseOutcomeReasonsParams) => {
  const queryClient = useQueryClient();

  // ✅ Query para buscar motivos com fallback inteligente
  const query = useQuery({
    queryKey: outcomeReasonsKeys.reasons(params),
    queryFn: async () => {
      try {
        const result = await outcomeReasonsApi.getReasons({
          pipeline_id: params.pipelineId,
          reason_type: params.reasonType || 'all',
          active_only: params.activeOnly ?? true
        });
        
        // ✅ FALLBACK INTELIGENTE: Se não há motivos configurados, usar motivos padrão
        if (!result || result.length === 0) {
          console.log('🔄 [useOutcomeReasons] Nenhum motivo configurado, buscando padrões...');
          
          try {
            const defaultReasons = await outcomeReasonsApi.getDefaultReasons();
            const fallbackReasons = [];
            
            // Transformar motivos padrão em formato esperado
            if (params.reasonType === 'won' || params.reasonType === 'all') {
              (defaultReasons.won || []).forEach((reasonText: string, index: number) => {
                fallbackReasons.push({
                  id: `default-won-${index}`,
                  pipeline_id: params.pipelineId,
                  tenant_id: '',
                  reason_type: 'won' as const,
                  reason_text: reasonText,
                  is_active: true,
                  display_order: index,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  is_default: true // Marcador para identificar motivos padrão
                });
              });
            }
            
            if (params.reasonType === 'lost' || params.reasonType === 'all') {
              (defaultReasons.lost || []).forEach((reasonText: string, index: number) => {
                fallbackReasons.push({
                  id: `default-lost-${index}`,
                  pipeline_id: params.pipelineId,
                  tenant_id: '',
                  reason_type: 'lost' as const,
                  reason_text: reasonText,
                  is_active: true,
                  display_order: index,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  is_default: true // Marcador para identificar motivos padrão
                });
              });
            }
            
            console.log('✅ [useOutcomeReasons] Usando motivos padrão:', fallbackReasons.length);
            return fallbackReasons;
            
          } catch (fallbackError) {
            console.error('❌ [useOutcomeReasons] Erro ao buscar padrões:', fallbackError);
            return []; // Retorna array vazio se até o fallback falhar
          }
        }
        
        console.log('✅ [useOutcomeReasons] Motivos configurados encontrados:', result.length);
        return result;
        
      } catch (error: any) {
        console.error('❌ [useOutcomeReasons] Erro detalhado:', {
          error,
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
          params: {
            pipeline_id: params.pipelineId,
            reason_type: params.reasonType || 'all',
            active_only: params.activeOnly ?? true
          }
        });
        
        // ✅ FALLBACK DE EMERGÊNCIA: Se erro na API, tentar motivos padrão do sistema
        if (error?.response?.status === 404 || error?.response?.status >= 500) {
          console.log('🔄 [useOutcomeReasons] Erro na API, tentando fallback de emergência...');
          return [
            {
              id: 'emergency-won-1',
              pipeline_id: params.pipelineId,
              tenant_id: '',
              reason_type: 'won' as const,
              reason_text: 'Proposta aceita',
              is_active: true,
              display_order: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_default: true,
              is_emergency: true
            },
            {
              id: 'emergency-lost-1',
              pipeline_id: params.pipelineId,
              tenant_id: '',
              reason_type: 'lost' as const,
              reason_text: 'Não converteu',
              is_active: true,
              display_order: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_default: true,
              is_emergency: true
            }
          ].filter(reason => 
            params.reasonType === 'all' || reason.reason_type === params.reasonType
          );
        }
        
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: (failureCount, error: any) => {
      console.log(`🔄 [useOutcomeReasons] Retry ${failureCount}:`, error?.response?.status);
      // Não tentar novamente se for erro de autenticação
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 2;
    }
  });

  // ✅ Mutation para criar motivo
  const createMutation = useMutation({
    mutationFn: (data: CreateOutcomeReasonRequest) => outcomeReasonsApi.createReason(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outcomeReasonsKeys.pipeline(params.pipelineId) });
      toast.success('Motivo criado com sucesso');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao criar motivo');
    }
  });

  // ✅ Mutation para atualizar motivo
  const updateMutation = useMutation({
    mutationFn: (data: UpdateOutcomeReasonRequest & { id: string }) => outcomeReasonsApi.updateReason(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outcomeReasonsKeys.pipeline(params.pipelineId) });
      toast.success('Motivo atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao atualizar motivo');
    }
  });

  // ✅ Mutation para deletar motivo
  const deleteMutation = useMutation({
    mutationFn: (reasonId: string) => outcomeReasonsApi.deleteReason(reasonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outcomeReasonsKeys.pipeline(params.pipelineId) });
      toast.success('Motivo removido com sucesso');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao remover motivo');
    }
  });

  // ✅ Mutation para reordenar motivos
  const reorderMutation = useMutation({
    mutationFn: (reasonIds: string[]) => outcomeReasonsApi.reorderReasons(params.pipelineId, reasonIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outcomeReasonsKeys.pipeline(params.pipelineId) });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao reordenar motivos');
    }
  });

  // ✅ Mutation para criar motivos padrão
  const createDefaultsMutation = useMutation({
    mutationFn: () => outcomeReasonsApi.createDefaultReasons(params.pipelineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outcomeReasonsKeys.pipeline(params.pipelineId) });
      toast.success('Motivos padrão criados com sucesso');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao criar motivos padrão');
    }
  });

  return {
    // Data
    reasons: query.data || [],
    
    // States
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    
    // Actions
    createReason: createMutation.mutate,
    updateReason: updateMutation.mutate,
    deleteReason: deleteMutation.mutate,
    reorderReasons: reorderMutation.mutate,
    createDefaultReasons: createDefaultsMutation.mutate,
    
    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: reorderMutation.isPending,
    isCreatingDefaults: createDefaultsMutation.isPending,
    
    // Refetch
    refetch: query.refetch
  };
};

// ============================================
// HOOK PARA MOTIVOS PADRÃO DO SISTEMA
// ============================================

export const useDefaultReasons = () => {
  return useQuery({
    queryKey: outcomeReasonsKeys.defaults(),
    queryFn: () => outcomeReasonsApi.getDefaultReasons(),
    staleTime: 60 * 60 * 1000, // 1 hora
  });
};
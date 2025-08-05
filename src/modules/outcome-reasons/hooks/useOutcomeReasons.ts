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

  // ✅ Query para buscar motivos
  const query = useQuery({
    queryKey: outcomeReasonsKeys.reasons(params),
    queryFn: async () => {
      try {
        const result = await outcomeReasonsApi.getReasons({
          pipeline_id: params.pipelineId,
          reason_type: params.reasonType || 'all',
          active_only: params.activeOnly ?? true
        });
        
        console.log('✅ [useOutcomeReasons] Sucesso:', result);
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
/**
 * ============================================
 * 🪝 HOOK: USE OUTCOME REASONS
 * ============================================
 * 
 * Hook TanStack Query para gestão de motivos de ganho/perdido
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

  // ✅ Query para buscar motivos (agora com fallback automático na API)
  const query = useQuery({
    queryKey: outcomeReasonsKeys.reasons(params),
    queryFn: async () => {
      const result = await outcomeReasonsApi.getReasons({
        pipeline_id: params.pipelineId,
        reason_type: params.reasonType || 'all',
        active_only: params.activeOnly ?? true
      });
      
      // ✅ LOGS OBRIGATÓRIOS PADRÃO CLAUDE.MD - ETAPA 1: ANALISAR FILTROS
      console.log('🔍 [FILTER-DEBUG] useOutcomeReasons - Dados recebidos da API:', {
        pipelineId: params.pipelineId?.substring(0, 8) || 'undefined',
        reasonType: params.reasonType || 'all',
        rawDataCount: result?.length || 0,
        filteredDataCount: result?.length || 0, // API já faz filtro
        apiSuccessful: !!result,
        hasFromJson: result?.some(r => r.is_from_json) || false,
        filterCondition: `reasonType: ${params.reasonType || 'all'}, activeOnly: ${params.activeOnly ?? true}`,
        sampleRawItem: result?.[0] ? {
          id: result[0].id?.substring(0, 8),
          type: result[0].reason_type,
          text: result[0].reason_text?.substring(0, 30)
        } : null
      });
      
      // ✅ LOGS OBRIGATÓRIOS PADRÃO CLAUDE.MD - ETAPA 2: VALIDAÇÃO ZOD
      console.log('🔍 [ZOD-DEBUG] useOutcomeReasons - Validação dos dados:', {
        rawCount: result?.length || 0,
        validatedCount: result?.length || 0, // API já validou com schemas
        validationPassed: (result?.length || 0) > 0,
        hasNullFields: result?.some(r => 
          r.tenant_id === null || 
          r.is_active === null || 
          r.display_order === null
        ) || false,
        sampleData: result?.[0] ? {
          id: result[0].id?.substring(0, 8) || 'undefined',
          pipeline_id: result[0].pipeline_id?.substring(0, 8) || 'undefined',
          tenant_id: result[0].tenant_id?.substring(0, 8) || 'null/undefined',
          reason_type: result[0].reason_type || 'undefined',
          reason_text: result[0].reason_text?.substring(0, 30) || 'undefined',
          is_active: result[0].is_active ?? 'null',
          display_order: result[0].display_order ?? 'null',
          is_from_json: result[0].is_from_json || false
        } : null
      });
      
      // ✅ LOGS OBRIGATÓRIOS PADRÃO CLAUDE.MD - ETAPA 3: RENDERIZAÇÃO UI
      console.log('🔍 [RENDER-DEBUG] useOutcomeReasons - Dados preparados para componente:', {
        propsData_length: result?.length || 0,
        componentWillRender: (result?.length || 0) > 0,
        reasonsByType: {
          ganho: result?.filter(r => r.reason_type === 'ganho').length || 0,
          perdido: result?.filter(r => r.reason_type === 'perdido').length || 0,
          won: result?.filter(r => r.reason_type === 'won').length || 0,
          lost: result?.filter(r => r.reason_type === 'lost').length || 0
        },
        dataOrigin: {
          fromDatabase: result?.filter(r => !r.is_from_json).length || 0,
          fromJsonFallback: result?.filter(r => r.is_from_json).length || 0
        }
      });
      
      return result || [];
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
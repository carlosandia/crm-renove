/**
 * ============================================
 * 🪝 HOOK: USE OUTCOME HISTORY
 * ============================================
 * 
 * Hook TanStack Query para histórico de motivos aplicados
 * AIDEV-NOTE: Separado do hook principal para performance
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { outcomeReasonsApi } from '../services/outcomeReasonsApi';
import { UseOutcomeHistoryParams, ApplyOutcomeRequest, UseApplyOutcomeParams } from '../types';

// ============================================
// QUERY KEYS
// ============================================

export const outcomeHistoryKeys = {
  all: ['outcome-history'] as const,
  lead: (leadId: string) => [...outcomeHistoryKeys.all, 'lead', leadId] as const
};

// ============================================
// HOOK PARA HISTÓRICO DE UM LEAD
// ============================================

export const useOutcomeHistory = (params: UseOutcomeHistoryParams) => {
  // ✅ CORREÇÃO CRÍTICA: Validar leadId antes de executar query
  const isValidLeadId = params.leadId && 
                       params.leadId.trim().length > 0 && 
                       params.leadId !== 'undefined' && 
                       params.leadId !== 'null';

  const query = useQuery({
    queryKey: outcomeHistoryKeys.lead(params.leadId),
    queryFn: () => outcomeReasonsApi.getLeadHistory(params.leadId),
    enabled: Boolean((params.enabled ?? true) && isValidLeadId), // ✅ GUARD: Só executar se leadId for válido
    staleTime: 15 * 60 * 1000, // ✅ CORREÇÃO CRÍTICA: 15 minutos (era 2)
    gcTime: 30 * 60 * 1000,    // ✅ CORREÇÃO: 30 minutos cache
    retry: (failureCount, error: any) => {
      // ✅ CORREÇÃO: Não retry em erros 429 (rate limit)
      if (error?.status === 429) return false;
      return failureCount < 1; // Apenas 1 retry
    },
    refetchOnWindowFocus: false, // ✅ CORREÇÃO: Não refetch ao focar janela
    refetchOnMount: false,       // ✅ CORREÇÃO: Não refetch ao montar se já tem cache
  });

  return {
    // Data - ✅ CORREÇÃO CRÍTICA: Garantir que history é sempre um array
    history: Array.isArray(query.data) ? query.data : [],
    
    // States
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    
    // Actions
    refetch: query.refetch
  };
};

// ============================================
// HOOK PARA APLICAR MOTIVO
// ============================================

export const useApplyOutcome = (params: UseApplyOutcomeParams = {}) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: ApplyOutcomeRequest) => outcomeReasonsApi.applyOutcome(data),
    onSuccess: (result, variables) => {
      // ✅ Invalidar cache do histórico do lead
      queryClient.invalidateQueries({ 
        queryKey: outcomeHistoryKeys.lead(variables.lead_id) 
      });
      
      // ✅ Invalidar cache dos leads do pipeline
      queryClient.invalidateQueries({ 
        queryKey: ['pipeline-leads'] 
      });
      
      toast.success('Motivo aplicado com sucesso');
      params.onSuccess?.();
    },
    onError: (error: any, variables) => {
      // ✅ HANDLING ESPECÍFICO PARA ERRO 400 (validação Zod)
      console.error('❌ [useApplyOutcome] Erro ao aplicar motivo:', {
        error: error?.response?.data || error.message,
        status: error?.response?.status,
        variables,
        errorType: error?.response?.status === 400 ? 'VALIDATION_ERROR' : 'GENERAL_ERROR'
      });

      let message = 'Erro ao aplicar motivo';
      
      if (error?.response?.status === 400) {
        // Erro de validação Zod - mensagem mais específica
        const zodErrors = error?.response?.data?.zodErrors;
        const errorDetails = error?.response?.data?.errorDetails;
        
        if (zodErrors && Array.isArray(zodErrors)) {
          console.error('🔍 [useApplyOutcome] Detalhes dos erros Zod:', zodErrors);
          
          // Encontrar erro mais específico para mostrar ao usuário
          const specificError = zodErrors.find(err => 
            err.path?.length > 0 && err.message
          );
          
          if (specificError) {
            const fieldName = specificError.path[0];
            message = `Campo "${fieldName}": ${specificError.message}`;
          } else {
            message = 'Dados inválidos. Verifique os campos obrigatórios.';
          }
        } else {
          message = error?.response?.data?.message || 'Erro de validação dos dados';
        }
      } else {
        message = error?.response?.data?.message || 'Erro interno do servidor';
      }
      
      toast.error(message);
      params.onError?.(error);
    }
  });

  return {
    // Action
    applyOutcome: mutation.mutate,
    
    // States
    isApplying: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error
  };
};
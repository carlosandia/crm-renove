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
  const query = useQuery({
    queryKey: outcomeHistoryKeys.lead(params.leadId),
    queryFn: () => outcomeReasonsApi.getLeadHistory(params.leadId),
    enabled: params.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  return {
    // Data
    history: query.data || [],
    
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
      const message = error?.response?.data?.message || 'Erro ao aplicar motivo';
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
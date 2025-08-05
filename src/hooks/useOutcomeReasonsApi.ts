/**
 * ============================================
 * 🪝 HOOK: OUTCOME REASONS API
 * ============================================
 * 
 * Hook para gerenciar motivos com integração direta à API
 * AIDEV-NOTE: Conecta OutcomeReasonsConfiguration com backend
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { outcomeReasonsApi } from '../modules/outcome-reasons/services/outcomeReasonsApi';
import { OutcomeReason, CreateOutcomeReasonRequest } from '../modules/outcome-reasons/types';
import { toast } from 'sonner';

// ============================================
// TYPES E INTERFACES
// ============================================

interface OutcomeReasonsData {
  ganho_reasons: OutcomeReason[];
  perdido_reasons: OutcomeReason[];
  // ✅ COMPATIBILIDADE: Manter campos antigos durante transição
  won_reasons: OutcomeReason[];
  lost_reasons: OutcomeReason[];
}

interface UseOutcomeReasonsApiParams {
  pipelineId: string;
  enabled?: boolean;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export const useOutcomeReasonsApi = ({ pipelineId, enabled = true }: UseOutcomeReasonsApiParams) => {
  const queryClient = useQueryClient();
  
  // ============================================
  // QUERIES
  // ============================================
  
  const { 
    data: reasonsData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['outcome-reasons', pipelineId],
    queryFn: () => outcomeReasonsApi.getReasons({ 
      pipeline_id: pipelineId,
      reason_type: 'all',
      active_only: false 
    }),
    enabled: Boolean(enabled && !!pipelineId),
    staleTime: 1000 * 60 * 15, // ✅ CORREÇÃO: 15 minutos (era 5)
    gcTime: 1000 * 60 * 30,    // ✅ CORREÇÃO: 30 minutos cache
    retry: (failureCount, error: any) => {
      // ✅ CORREÇÃO: Não retry em erros 429 (rate limit)
      if (error?.status === 429) return false;
      return failureCount < 1; // Apenas 1 retry
    },
  });

  // ============================================
  // MUTATIONS
  // ============================================
  
  const createReasonMutation = useMutation({
    mutationFn: (data: CreateOutcomeReasonRequest) => 
      outcomeReasonsApi.createReason(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outcome-reasons', pipelineId] });
      toast.success('Motivo criado com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao criar motivo:', error);
      toast.error('Erro ao criar motivo');
    }
  });

  const updateReasonMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<OutcomeReason>) => 
      outcomeReasonsApi.updateReason({ id, ...data } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outcome-reasons', pipelineId] });
      toast.success('Motivo atualizado com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar motivo:', error);
      toast.error('Erro ao atualizar motivo');
    }
  });

  const deleteReasonMutation = useMutation({
    mutationFn: (reasonId: string) => 
      outcomeReasonsApi.deleteReason(reasonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outcome-reasons', pipelineId] });
      toast.success('Motivo removido com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao remover motivo:', error);
      toast.error('Erro ao remover motivo');
    }
  });

  const reorderReasonsMutation = useMutation({
    mutationFn: (reasonIds: string[]) => 
      outcomeReasonsApi.reorderReasons(pipelineId, reasonIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outcome-reasons', pipelineId] });
    },
    onError: (error: any) => {
      console.error('Erro ao reordenar motivos:', error);
      toast.error('Erro ao reordenar motivos');
    }
  });

  // ============================================
  // COMPUTED DATA
  // ============================================
  
  const formattedData: OutcomeReasonsData = {
    // ✅ BUGFIX CRÍTICO: Corrigir nomenclatura para compatibilidade com componente
    ganho_reasons: reasonsData?.filter(r => r.reason_type === 'won' || r.reason_type === 'ganho') || [],
    perdido_reasons: reasonsData?.filter(r => r.reason_type === 'lost' || r.reason_type === 'perdido') || [],
    // ✅ COMPATIBILIDADE: Manter campos antigos para transição
    won_reasons: reasonsData?.filter(r => r.reason_type === 'won' || r.reason_type === 'ganho') || [],
    lost_reasons: reasonsData?.filter(r => r.reason_type === 'lost' || r.reason_type === 'perdido') || []
  };

  // ============================================
  // HANDLERS
  // ============================================
  
  const handleCreateReason = useCallback(async (
    reason_type: 'won' | 'lost',
    reason_text: string,
    display_order?: number
  ) => {
    if (!pipelineId) return;
    
    await createReasonMutation.mutateAsync({
      pipeline_id: pipelineId,
      reason_type,
      reason_text: reason_text.trim(),
      display_order: display_order ?? formattedData[`${reason_type}_reasons`].length
    });
  }, [pipelineId, createReasonMutation, formattedData]);

  const handleUpdateReason = useCallback(async (
    reasonId: string,
    updates: Partial<Pick<OutcomeReason, 'reason_text' | 'display_order' | 'is_active'>>
  ) => {
    await updateReasonMutation.mutateAsync({ id: reasonId, ...updates });
  }, [updateReasonMutation]);

  const handleDeleteReason = useCallback(async (reasonId: string) => {
    await deleteReasonMutation.mutateAsync(reasonId);
  }, [deleteReasonMutation]);

  const handleReorderReasons = useCallback(async (reasonIds: string[]) => {
    await reorderReasonsMutation.mutateAsync(reasonIds);
  }, [reorderReasonsMutation]);

  // ============================================
  // BULK OPERATIONS
  // ============================================
  
  const handleBulkSave = useCallback(async (data: OutcomeReasonsData) => {
    if (!pipelineId) return;

    try {
      // Separar operações de criação e atualização
      const createPromises: Promise<any>[] = [];
      const updatePromises: Promise<any>[] = [];

      // Processar motivos de ganho
      (data.ganho_reasons || data.won_reasons || []).forEach((reason, index) => {
        if (reason.id) {
          // Atualizar existente
          updatePromises.push(
            updateReasonMutation.mutateAsync({
              id: reason.id,
              reason_text: reason.reason_text.trim(),
              display_order: index,
              is_active: reason.is_active
            })
          );
        } else {
          // Criar novo
          createPromises.push(
            createReasonMutation.mutateAsync({
              pipeline_id: pipelineId,
              reason_type: 'won',
              reason_text: reason.reason_text.trim(),
              display_order: index
            })
          );
        }
      });

      // Processar motivos de perda  
      (data.perdido_reasons || data.lost_reasons || []).forEach((reason, index) => {
        if (reason.id) {
          // Atualizar existente
          updatePromises.push(
            updateReasonMutation.mutateAsync({
              id: reason.id,
              reason_text: reason.reason_text.trim(),
              display_order: index,
              is_active: reason.is_active
            })
          );
        } else {
          // Criar novo
          createPromises.push(
            createReasonMutation.mutateAsync({
              pipeline_id: pipelineId,
              reason_type: 'lost',
              reason_text: reason.reason_text.trim(),
              display_order: index
            })
          );
        }
      });

      // Executar todas as operações
      await Promise.all([...createPromises, ...updatePromises]);
      
      toast.success('Motivos salvos com sucesso');
    } catch (error) {
      console.error('Erro no salvamento em lote:', error);
      toast.error('Erro ao salvar motivos');
    }
  }, [pipelineId, createReasonMutation, updateReasonMutation]);

  // ============================================
  // COMPUTED PROPERTIES
  // ============================================
  
  const hasReasons = formattedData.ganho_reasons.length > 0 || formattedData.perdido_reasons.length > 0;
  const totalReasons = formattedData.ganho_reasons.length + formattedData.perdido_reasons.length;
  const isMutating = createReasonMutation.isPending || 
                    updateReasonMutation.isPending || 
                    deleteReasonMutation.isPending ||
                    reorderReasonsMutation.isPending;

  // ============================================
  // RETURN
  // ============================================
  
  return {
    // Data
    data: formattedData,
    rawData: reasonsData,
    hasReasons,
    totalReasons,
    
    // Loading states
    isLoading,
    isMutating,
    error,
    
    // Single operations
    createReason: handleCreateReason,
    updateReason: handleUpdateReason,
    deleteReason: handleDeleteReason,
    reorderReasons: handleReorderReasons,
    
    // Bulk operations
    bulkSave: handleBulkSave,
    
    // Utilities
    refetch,
    isEnabled: enabled && !!pipelineId
  };
};

export default useOutcomeReasonsApi;
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../providers/AuthProvider';
import { showSuccessToast, showErrorToast } from '../lib/toast';
import { Pipeline } from '../types/Pipeline';
import { QueryKeys } from '../lib/queryKeys';
import { api } from '../lib/api';

interface ArchivePipelineVariables {
  pipelineId: string;
  shouldArchive: boolean;
  pipelineName?: string;
}

interface OptimisticPipelineUpdate {
  is_archived: boolean;
  archived_at: string | null;
  is_active: boolean;
}

/**
 * 🚀 ENTERPRISE-GRADE MUTATION HOOK
 * 
 * Features:
 * - ✅ Optimistic Updates (UI instantânea)
 * - ✅ Rollback Automático em erro
 * - ✅ Cache Invalidation Inteligente
 * - ✅ Toast Notifications
 * - ✅ Error Handling Robusto
 * 
 * Inspirado em: Salesforce Lightning, HubSpot, Linear
 */
export const useArchivePipelineMutation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, ArchivePipelineVariables>({
    // 🔥 OPTIMISTIC UPDATE: UI atualiza IMEDIATAMENTE (antes da API)
    onMutate: async (variables) => {
      const { pipelineId, shouldArchive, pipelineName } = variables;
      
      console.log(`⚡ [OPTIMISTIC] ${shouldArchive ? 'Arquivando' : 'Desarquivando'} pipeline:`, {
        pipelineId: pipelineId.substring(0, 8),
        pipelineName,
        shouldArchive,
        timestamp: new Date().toISOString()
      });

      // ✅ CANCELAR queries em andamento para evitar race conditions
      const queryKey = QueryKeys.pipelines.byTenant(user?.tenant_id!);
      await queryClient.cancelQueries({ queryKey });

      // ✅ SALVAR estado anterior para rollback
      const previousPipelines = queryClient.getQueryData<Pipeline[]>(queryKey);

      // ✅ UPDATE OPTIMISTIC: Atualizar cache imediatamente
      if (previousPipelines) {
        const optimisticUpdate: OptimisticPipelineUpdate = {
          is_archived: shouldArchive,
          archived_at: shouldArchive ? new Date().toISOString() : null,
          is_active: !shouldArchive
        };

        const updatedPipelines = previousPipelines.map(pipeline => 
          pipeline.id === pipelineId 
            ? { ...pipeline, ...optimisticUpdate }
            : pipeline
        );

        queryClient.setQueryData(queryKey, updatedPipelines);

        console.log(`✨ [OPTIMISTIC] Cache atualizado instantaneamente:`, {
          pipelineId: pipelineId.substring(0, 8),
          newState: optimisticUpdate,
          cacheUpdated: true
        });
      }

      // ✅ DISPARAR evento para outros componentes (AppDashboard)
      window.dispatchEvent(new CustomEvent('pipeline-archive-updated', {
        detail: { 
          pipelineId,
          is_archived: shouldArchive,
          archived_at: shouldArchive ? new Date().toISOString() : null,
          updateSource: 'optimistic-update'
        }
      }));

      // ✅ RETORNAR contexto para rollback
      return {
        previousPipelines,
        queryKey,
        pipelineId,
        shouldArchive
      };
    },

    // 🎯 API CALL: Executar operação real no backend
    mutationFn: async (variables) => {
      const { pipelineId, shouldArchive } = variables;
      
      const endpoint = shouldArchive ? 'archive' : 'unarchive';
      const response = await api.post(`/pipelines/${pipelineId}/${endpoint}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Operação falhou no servidor');
      }

      console.log(`✅ [API] ${shouldArchive ? 'Arquivamento' : 'Desarquivamento'} confirmado pelo backend:`, {
        pipelineId: pipelineId.substring(0, 8),
        success: true
      });
    },

    // ✅ SUCCESS: API confirmou - apenas toast (cache já atualizado)
    onSuccess: (_, variables) => {
      const { shouldArchive, pipelineName } = variables;
      const actionText = shouldArchive ? 'arquivada' : 'desarquivada';
      
      showSuccessToast(
        'Operação concluída', 
        `Pipeline ${pipelineName ? `"${pipelineName}"` : ''} ${actionText} com sucesso!`
      );

      console.log(`🎉 [SUCCESS] Operação confirmada pelo servidor:`, {
        action: shouldArchive ? 'archive' : 'unarchive',
        pipelineName,
        optimisticUpdateConfirmed: true
      });
    },

    // 🔄 ERROR: Rollback automático + toast de erro
    onError: (error, variables, context) => {
      const { shouldArchive, pipelineName } = variables;
      const actionText = shouldArchive ? 'arquivar' : 'desarquivar';
      
      console.error(`❌ [ROLLBACK] Erro ao ${actionText} pipeline:`, {
        error: error.message,
        pipelineName,
        willRollback: !!context
      });

      // ✅ ROLLBACK: Restaurar estado anterior
      if (context) {
        const { previousPipelines, queryKey, pipelineId } = context as any;
        
        if (previousPipelines) {
          queryClient.setQueryData(queryKey, previousPipelines);
          
          // ✅ REVERTER evento customizado
          const originalPipeline = previousPipelines.find((p: any) => p.id === pipelineId);
          if (originalPipeline) {
            window.dispatchEvent(new CustomEvent('pipeline-archive-updated', {
              detail: { 
                pipelineId,
                is_archived: originalPipeline.is_archived,
                archived_at: originalPipeline.archived_at,
                updateSource: 'rollback'
              }
            }));
          }

          console.log(`🔄 [ROLLBACK] Estado restaurado com sucesso:`, {
            pipelineId: pipelineId.substring(0, 8),
            rollbackComplete: true
          });
        }
      }

      // ✅ TOAST DE ERRO com contexto
      showErrorToast(
        `Erro ao ${actionText}`,
        `Não foi possível ${actionText} a pipeline${pipelineName ? ` "${pipelineName}"` : ''}. ${error.message}`
      );
    },

    // ⚡ ALWAYS: Executar após success ou error
    onSettled: (_, __, variables) => {
      const { pipelineId } = variables;
      
      // ✅ INVALIDATE cache para garantir consistência futura
      const queryKey = QueryKeys.pipelines.byTenant(user?.tenant_id!);
      queryClient.invalidateQueries({ queryKey });

      console.log(`🔄 [SETTLED] Cache invalidated para sincronização futura:`, {
        pipelineId: pipelineId.substring(0, 8),
        queryKey: queryKey.join('/')
      });
    }
  });
};

export default useArchivePipelineMutation;
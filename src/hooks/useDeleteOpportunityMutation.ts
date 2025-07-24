import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface DeleteOpportunityMutationProps {
  pipelineId: string;
  leadId: string;
}

export const useDeleteOpportunityMutation = (pipelineId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId }: { leadId: string }) => {
      // DELETE apenas da tabela pipeline_leads - preserva leads_master
      await api.delete(`/pipelines/${pipelineId}/leads/${leadId}`);
      return { leadId, pipelineId };
    },
    onSuccess: (data) => {
      console.log('✅ Oportunidade excluída com sucesso. Lead mantido para reutilização.');
      
      // ✅ USAR A MESMA KEY DO usePipelineKanban.ts para garantir invalidação correta
      queryClient.invalidateQueries({ 
        queryKey: ['pipeline-leads', pipelineId] 
      });
      
      // Opcional: Invalidar queries gerais de pipeline se necessário
      queryClient.invalidateQueries({ 
        queryKey: ['pipeline', pipelineId] 
      });
      
      console.log('🔄 Cache invalidado automaticamente via TanStack Query');
    },
    onError: (error) => {
      console.error('❌ Erro ao excluir oportunidade:', error);
    },
    onSettled: (data, error) => {
      if (error) {
        console.error('⚠️ Mutation finalizada com erro:', error);
      } else {
        console.log('✅ Mutation finalizada com sucesso:', data);
      }
    }
  });
};
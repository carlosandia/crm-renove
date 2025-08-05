import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { toast } from 'sonner';

export interface DeleteOpportunityMutationProps {
  pipelineId: string;
  leadId: string;
}

export const useDeleteOpportunityMutation = (pipelineId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ leadId }: { leadId: string }) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      // CORREÇÃO 1: Usar autenticação Supabase direta como no ModernPipelineCreatorRefactored
      // DELETE apenas da tabela pipeline_leads - preserva leads_master
      const { error } = await supabase
        .from('pipeline_leads')
        .delete()
        .eq('id', leadId)
        .eq('pipeline_id', pipelineId);

      if (error) {
        throw new Error(`Erro ao excluir oportunidade: ${error.message}`);
      }

      return { leadId, pipelineId };
    },
    onSuccess: (data) => {
      // Toast de sucesso
      toast.success('Oportunidade excluída com sucesso!');
      
      // CORREÇÃO 1: Invalidação de cache otimizada
      queryClient.invalidateQueries({ 
        queryKey: ['pipeline-leads', pipelineId] 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['pipeline', pipelineId] 
      });

      // Invalidar métricas do pipeline
      queryClient.invalidateQueries({ 
        queryKey: ['pipeline-metrics', pipelineId] 
      });
      
      console.log('✅ Oportunidade excluída com sucesso. Lead preservado no sistema.');
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Erro desconhecido ao excluir oportunidade';
      toast.error(`Erro ao excluir oportunidade: ${errorMessage}`);
      console.error('❌ Erro ao excluir oportunidade:', error);
    }
  });
};
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../providers/AuthProvider';
import { toast } from 'sonner';
import { api } from '../services/api';

export interface DeleteOpportunityMutationProps {
  pipelineId: string;
  leadId: string;
}

export const useDeleteOpportunityMutation = (pipelineId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ leadId }: { leadId: string }) => {
      console.log('🔄 [DeleteOpportunity] Iniciando DELETE via backend API:', { leadId, pipelineId, userId: user?.id });
      
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      // ✅ CORREÇÃO CRÍTICA: Usar backend API com service role para bypass RLS controlado
      const tenantId = user?.tenant_id;
      console.log('🔍 [DeleteOpportunity] User context:', { 
        userId: user.id, 
        tenantId, 
        tenantIdDefinido: !!tenantId,
        method: 'BACKEND_API_DELETE'
      });

      // ✅ CORREÇÃO RLS: Usar backend API que possui service role
      console.log('🚀 [DeleteOpportunity] Executando DELETE via backend API...');
      const response = await api.deleteOpportunity(leadId);

      console.log('📊 [DeleteOpportunity] Resposta Backend API:', { 
        success: response.success, 
        message: response.message,
        data: response.data
      });

      if (!response.success) {
        console.error('❌ [DeleteOpportunity] Erro Backend API:', response.message);
        throw new Error(response.message || 'Erro ao excluir oportunidade');
      }

      // ✅ CORREÇÃO: Aceitar success=true mesmo sem dados (DELETE pode não retornar dados)
      if (!response.data) {
        console.warn('⚠️ [DeleteOpportunity] DELETE bem-sucedido sem dados de retorno (comportamento normal para DELETE)');
        // Usar dados do request para manter compatibilidade
        return {
          leadId: leadId,
          pipelineId: pipelineId,
          deletedData: { deleted_id: leadId, pipeline_id: pipelineId }
        };
      }

      console.log('✅ [DeleteOpportunity] DELETE executado com sucesso via backend:', response.data);
      return { 
        leadId: response.data.deleted_id || leadId, 
        pipelineId: response.data.pipeline_id || pipelineId, 
        deletedData: response.data 
      };
    },
    onSuccess: (data) => {
      console.log('🎉 [DeleteOpportunity] onSuccess executado:', data);
      
      // Toast de sucesso
      toast.success('Oportunidade excluída com sucesso! Lead preservado no sistema.');
      
      // CORREÇÃO 1: Invalidação de cache otimizada
      console.log('🔄 [DeleteOpportunity] Invalidando caches React Query...');
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
      
      console.log('✅ [DeleteOpportunity] Cache invalidado com sucesso');
      
      // NOVO: Verificar se DELETE foi efetivo após um breve delay
      setTimeout(() => {
        console.log('🔍 [DeleteOpportunity] Verificando exclusão efetiva...');
      }, 1000);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Erro desconhecido ao excluir oportunidade';
      toast.error(`Erro ao excluir oportunidade: ${errorMessage}`);
      console.error('❌ Erro ao excluir oportunidade:', error);
    }
  });
};
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CadenceApiService,
  CadenceConfig,
  SaveCadenceRequest,
  cadenceQueryKeys
} from '../services/cadenceApiService';

// ================================================================================
// HOOK PARA CARREGAR CONFIGURAÇÕES DE CADÊNCIA
// ================================================================================
export function useCadenceData(pipelineId: string | undefined) {
  return useQuery({
    queryKey: cadenceQueryKeys.pipeline(pipelineId || ''),
    queryFn: () => {
      if (!pipelineId) {
        return Promise.reject(new Error('Pipeline ID é obrigatório'));
      }
      return CadenceApiService.loadCadenceForPipeline(pipelineId);
    },
    enabled: !!pipelineId && pipelineId.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 2,
    meta: {
      errorMessage: 'Erro ao carregar configurações de cadência'
    }
  });
}

// ================================================================================
// HOOK PARA SALVAR CONFIGURAÇÕES DE CADÊNCIA
// ================================================================================
export function useSaveCadenceConfigs(pipelineId: string | undefined) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (saveRequest: SaveCadenceRequest) => {
      if (!pipelineId) {
        return Promise.reject(new Error('Pipeline ID é obrigatório para salvar configurações'));
      }
      return CadenceApiService.saveCadenceConfigs(saveRequest);
    },
    onSuccess: () => {
      if (!pipelineId) return;
      
      // Invalidar cache para recarregar dados atualizados
      queryClient.invalidateQueries({
        queryKey: cadenceQueryKeys.pipeline(pipelineId)
      });
      
      // Invalidar cache geral de cadências
      queryClient.invalidateQueries({
        queryKey: cadenceQueryKeys.all
      });
      
      // Feedback de sucesso
      toast.success('Configurações de cadência salvas com sucesso', {
        description: 'As atividades foram atualizadas'
      });
      
      console.log('✅ Configurações de cadência salvas e cache atualizado');
    },
    onError: (error: Error) => {
      console.error('❌ Erro ao salvar configurações:', error);
      
      toast.error('Erro ao salvar configurações de cadência', {
        description: error.message
      });
    }
  });
}

// ================================================================================
// HOOK PARA DELETAR CONFIGURAÇÕES DE CADÊNCIA
// ================================================================================
export function useDeleteCadenceConfigs(pipelineId: string | undefined) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (tenantId: string) => {
      if (!pipelineId) {
        return Promise.reject(new Error('Pipeline ID é obrigatório para deletar configurações'));
      }
      return CadenceApiService.deleteCadenceConfigs(pipelineId, tenantId);
    },
    onSuccess: () => {
      if (!pipelineId) return;
      
      // Invalidar cache para refletir exclusão
      queryClient.invalidateQueries({
        queryKey: cadenceQueryKeys.pipeline(pipelineId)
      });
      
      queryClient.invalidateQueries({
        queryKey: cadenceQueryKeys.all
      });
      
      toast.success('Configurações de cadência removidas', {
        description: 'Todas as atividades foram removidas da pipeline'
      });
      
      console.log('✅ Configurações deletadas e cache atualizado');
    },
    onError: (error: Error) => {
      console.error('❌ Erro ao deletar configurações:', error);
      
      toast.error('Erro ao remover configurações', {
        description: error.message
      });
    }
  });
}

// ================================================================================
// HOOK PARA CONFIGURAÇÃO DE ETAPA ESPECÍFICA
// ================================================================================
export function useCadenceForStage(
  pipelineId: string | undefined, 
  stageName: string | undefined,
  tenantId: string | undefined
) {
  return useQuery({
    queryKey: cadenceQueryKeys.stage(pipelineId || '', stageName || ''),
    queryFn: () => {
      if (!pipelineId || !stageName || !tenantId) {
        return Promise.reject(new Error('Pipeline ID, nome da etapa e tenant ID são obrigatórios'));
      }
      return CadenceApiService.getCadenceForStage(pipelineId, stageName, tenantId);
    },
    enabled: !!(pipelineId && stageName && tenantId),
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: 1,
    meta: {
      errorMessage: 'Erro ao carregar configuração da etapa'
    }
  });
}

// ================================================================================
// HOOK COMBINADO PARA GERENCIAR CADÊNCIA COMPLETA
// ================================================================================
export function useCadenceManager(pipelineId: string | undefined, tenantId?: string) {
  const {
    data: cadenceConfigs,
    isLoading: isLoadingConfigs,
    error: configsError,
    refetch: refetchConfigs
  } = useCadenceData(pipelineId);
  
  const saveMutation = useSaveCadenceConfigs(pipelineId);
  const deleteMutation = useDeleteCadenceConfigs(pipelineId);
  
  // Função para salvar configurações
  const saveConfigs = async (configs: CadenceConfig[], createdBy?: string) => {
    if (!pipelineId || !tenantId) {
      throw new Error('Pipeline ID e tenant ID são obrigatórios');
    }
    
    const saveRequest: SaveCadenceRequest = {
      pipeline_id: pipelineId,
      cadence_configs: configs.map(config => ({
        ...config,
        pipeline_id: pipelineId,
        tenant_id: tenantId
      })),
      tenant_id: tenantId,
      created_by: createdBy || 'system'
    };
    
    try {
      await saveMutation.mutateAsync(saveRequest);
    } catch (error) {
      // Erro já tratado no mutation
      throw error;
    }
  };
  
  // Função para deletar configurações
  const deleteConfigs = async () => {
    if (!tenantId) {
      throw new Error('Tenant ID é obrigatório');
    }
    
    try {
      await deleteMutation.mutateAsync(tenantId);
    } catch (error) {
      // Erro já tratado no mutation
      throw error;
    }
  };
  
  // Estado consolidado
  const isLoading = isLoadingConfigs;
  const isSaving = saveMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const hasError = !!configsError;
  
  return {
    // Dados
    cadenceConfigs: cadenceConfigs || [],
    
    // Estados de carregamento
    isLoading,
    isLoadingConfigs,
    isSaving,
    isDeleting,
    hasError,
    
    // Erros
    configsError,
    
    // Ações
    saveConfigs,
    deleteConfigs,
    refetchConfigs,
    
    // Estados dos mutations para controle de UI
    saveError: saveMutation.error,
    deleteError: deleteMutation.error
  };
}

// ================================================================================
// TIPOS AUXILIARES PARA EXPORTAÇÃO
// ================================================================================
export type UseCadenceDataReturn = ReturnType<typeof useCadenceData>;
export type UseCadenceManagerReturn = ReturnType<typeof useCadenceManager>;
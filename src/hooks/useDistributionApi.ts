import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  DistributionApiService,
  DistributionRule,
  DistributionStats,
  SaveDistributionRuleRequest,
  distributionQueryKeys
} from '../services/distributionApi';

// ================================================================================
// HOOK PARA BUSCAR REGRA DE DISTRIBUIÇÃO
// ================================================================================
export function useDistributionRule(pipelineId: string | undefined) {
  return useQuery({
    queryKey: distributionQueryKeys.rule(pipelineId || ''),
    queryFn: () => {
      if (!pipelineId) {
        return Promise.reject(new Error('Pipeline ID é obrigatório'));
      }
      return DistributionApiService.getDistributionRule(pipelineId);
    },
    enabled: !!pipelineId && pipelineId.length > 0, // ✅ CORREÇÃO: Verificar se não é string vazia
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 2,
    meta: {
      errorMessage: 'Erro ao carregar regra de distribuição'
    }
  });
}

// ================================================================================
// HOOK PARA SALVAR REGRA DE DISTRIBUIÇÃO
// ================================================================================
export function useSaveDistributionRule(pipelineId: string | undefined) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (rule: SaveDistributionRuleRequest) => {
      if (!pipelineId) {
        return Promise.reject(new Error('Pipeline ID é obrigatório para salvar regra'));
      }
      return DistributionApiService.saveDistributionRule(pipelineId, rule);
    },
    onSuccess: (savedRule) => {
      if (!pipelineId) return;
      
      // Atualizar cache da regra
      queryClient.setQueryData(
        distributionQueryKeys.rule(pipelineId),
        savedRule
      );
      
      // Invalidar estatísticas para atualizar
      queryClient.invalidateQueries({
        queryKey: distributionQueryKeys.stat(pipelineId)
      });
      
      // Mostrar feedback de sucesso
      toast.success('Regra de distribuição salva com sucesso', {
        description: `Modo ${savedRule.mode} ativado`
      });
      
      console.log('✅ Regra de distribuição salva e cache atualizado');
    },
    onError: (error: Error) => {
      console.error('❌ Erro ao salvar regra:', error);
      
      toast.error('Erro ao salvar regra de distribuição', {
        description: error.message
      });
    }
  });
}

// ================================================================================
// HOOK PARA BUSCAR ESTATÍSTICAS DE DISTRIBUIÇÃO
// ================================================================================
export function useDistributionStats(pipelineId: string | undefined) {
  return useQuery({
    queryKey: distributionQueryKeys.stat(pipelineId || ''),
    queryFn: () => {
      if (!pipelineId) {
        return Promise.reject(new Error('Pipeline ID é obrigatório'));
      }
      return DistributionApiService.getDistributionStats(pipelineId);
    },
    enabled: !!pipelineId && pipelineId.length > 0, // ✅ CORREÇÃO: Verificar se não é string vazia
    staleTime: 2 * 60 * 1000, // 2 minutos (estatísticas podem mudar mais frequentemente)
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: 1,
    meta: {
      errorMessage: 'Erro ao carregar estatísticas de distribuição'
    }
  });
}

// ================================================================================
// HOOK PARA TESTAR DISTRIBUIÇÃO
// ================================================================================
export function useTestDistribution(pipelineId: string | undefined) {
  return useMutation({
    mutationFn: () => {
      if (!pipelineId) {
        return Promise.reject(new Error('Pipeline ID é obrigatório para testar distribuição'));
      }
      return DistributionApiService.testDistribution(pipelineId);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Teste de distribuição realizado', {
          description: result.message
        });
      } else {
        toast.warning('Teste não disponível', {
          description: result.message
        });
      }
    },
    onError: (error: Error) => {
      console.error('❌ Erro no teste de distribuição:', error);
      
      toast.error('Erro ao testar distribuição', {
        description: error.message
      });
    }
  });
}

// ================================================================================
// HOOK PARA RESETAR DISTRIBUIÇÃO
// ================================================================================
export function useResetDistribution(pipelineId: string | undefined) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => {
      if (!pipelineId) {
        return Promise.reject(new Error('Pipeline ID é obrigatório para resetar distribuição'));
      }
      return DistributionApiService.resetDistribution(pipelineId);
    },
    onSuccess: () => {
      if (!pipelineId) return;
      
      // Invalidar dados para atualizar após reset
      queryClient.invalidateQueries({
        queryKey: distributionQueryKeys.rule(pipelineId)
      });
      
      queryClient.invalidateQueries({
        queryKey: distributionQueryKeys.stat(pipelineId)
      });
      
      toast.success('Distribuição resetada', {
        description: 'Rodízio reiniciado com sucesso'
      });
      
      console.log('✅ Distribuição resetada e cache invalidado');
    },
    onError: (error: Error) => {
      console.error('❌ Erro ao resetar distribuição:', error);
      
      toast.error('Erro ao resetar distribuição', {
        description: error.message
      });
    }
  });
}

// ================================================================================
// HOOK COMBINADO PARA GERENCIAR DISTRIBUIÇÃO COMPLETA
// ================================================================================
export function useDistributionManager(pipelineId: string | undefined) {
  const {
    data: rule,
    isLoading: isLoadingRule,
    error: ruleError,
    refetch: refetchRule
  } = useDistributionRule(pipelineId);
  
  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats
  } = useDistributionStats(pipelineId);
  
  const saveRuleMutation = useSaveDistributionRule(pipelineId);
  const testDistributionMutation = useTestDistribution(pipelineId);
  const resetDistributionMutation = useResetDistribution(pipelineId);
  
  // Função para salvar regra
  const saveRule = async (ruleData: SaveDistributionRuleRequest) => {
    try {
      await saveRuleMutation.mutateAsync(ruleData);
    } catch (error) {
      // Erro já tratado no mutation
      throw error;
    }
  };
  
  // Função para testar distribuição
  const testDistribution = async () => {
    try {
      return await testDistributionMutation.mutateAsync();
    } catch (error) {
      // Erro já tratado no mutation
      throw error;
    }
  };
  
  // Função para resetar distribuição
  const resetDistribution = async () => {
    try {
      await resetDistributionMutation.mutateAsync();
    } catch (error) {
      // Erro já tratado no mutation
      throw error;
    }
  };
  
  // Estado consolidado
  const isLoading = isLoadingRule || isLoadingStats;
  const isSaving = saveRuleMutation.isPending;
  const isTesting = testDistributionMutation.isPending;
  const isResetting = resetDistributionMutation.isPending;
  const hasError = !!ruleError || !!statsError;
  
  return {
    // Dados
    rule,
    stats,
    
    // Estados de carregamento
    isLoading,
    isLoadingRule,
    isLoadingStats,
    isSaving,
    isTesting,
    isResetting,
    hasError,
    
    // Erros
    ruleError,
    statsError,
    
    // Ações
    saveRule,
    testDistribution,
    resetDistribution,
    refetchRule,
    refetchStats,
    
    // Estados dos mutations para controle de UI
    saveRuleError: saveRuleMutation.error,
    testDistributionError: testDistributionMutation.error,
    resetDistributionError: resetDistributionMutation.error
  };
}

// ================================================================================
// TIPOS AUXILIARES PARA EXPORTAÇÃO
// ================================================================================
export type UseDistributionManagerReturn = ReturnType<typeof useDistributionManager>;
export type UseDistributionRuleReturn = ReturnType<typeof useDistributionRule>;
export type UseDistributionStatsReturn = ReturnType<typeof useDistributionStats>;
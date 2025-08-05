// =====================================================================================
// HOOK: useFlexibleValues
// Autor: Claude (Arquiteto Sênior)
// Descrição: Hook para gerenciar valores flexíveis de leads (único, recorrente, híbrido)
// =====================================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { logger, LogContext } from '../utils/loggerOptimized';
import { useAuth } from '../providers/AuthProvider';

// Interface para valores flexíveis
export interface FlexibleValues {
  valor_unico?: number;
  valor_recorrente?: number;
  recorrencia_periodo?: number;
  recorrencia_unidade?: 'mes' | 'ano';
  tipo_venda?: 'unico' | 'recorrente' | 'hibrido';
}

// Interface para resposta da API
export interface FlexibleValuesResponse {
  message: string;
  lead: {
    id: string;
    valor_unico?: number;
    valor_recorrente?: number;
    recorrencia_periodo?: number;
    recorrencia_unidade?: 'mes' | 'ano';
    tipo_venda: 'unico' | 'recorrente' | 'hibrido';
    valor_total_calculado: number;
    updated_at: string;
  };
}

// Hook principal
export const useFlexibleValues = (pipelineId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Mutation para atualizar valores flexíveis
  const updateFlexibleValuesMutation = useMutation({
    mutationFn: async ({ leadId, values }: { leadId: string; values: FlexibleValues }) => {
      logger.debug('Atualizando valores flexíveis', LogContext.LEADS, {
        leadId: leadId.substring(0, 8),
        pipelineId: pipelineId.substring(0, 8),
        values
      });

      if (!pipelineId || !leadId) {
        throw new Error('Pipeline ID e Lead ID são obrigatórios');
      }

      // Chamar o endpoint específico de valores flexíveis
      const response = await api.put(
        `/pipelines/${pipelineId}/leads/${leadId}/flexible-values`,
        values
      );

      logger.debug('Valores flexíveis atualizados com sucesso', LogContext.LEADS, {
        leadId: leadId.substring(0, 8),
        valorTotal: response.data.lead?.valor_total_calculado,
        tipoVenda: response.data.lead?.tipo_venda
      });

      return response.data as FlexibleValuesResponse;
    },
    onSuccess: (data, variables) => {
      // Invalidar cache das queries relacionadas
      queryClient.invalidateQueries({ 
        queryKey: ['leads', pipelineId, user?.tenant_id] 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['pipelines', user?.tenant_id] 
      });

      logger.info('Cache invalidado após atualização de valores flexíveis', LogContext.LEADS, {
        leadId: variables.leadId.substring(0, 8),
        valorTotal: data.lead.valor_total_calculado
      });
    },
    onError: (error, variables) => {
      logger.error('Erro ao atualizar valores flexíveis', LogContext.LEADS, {
        leadId: variables.leadId.substring(0, 8),
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // Função auxiliar para atualizar valores
  const updateValues = async (leadId: string, values: FlexibleValues) => {
    try {
      return await updateFlexibleValuesMutation.mutateAsync({ leadId, values });
    } catch (error) {
      logger.error('Falha ao atualizar valores flexíveis', LogContext.LEADS, {
        leadId: leadId.substring(0, 8),
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw error;
    }
  };

  // Função para formatar valor como moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para calcular valor total
  const calculateTotal = (values: FlexibleValues) => {
    const unico = values.valor_unico || 0;
    const recorrente = (values.valor_recorrente || 0) * (values.recorrencia_periodo || 0);
    return unico + recorrente;
  };

  // Função para determinar tipo de venda
  const determineSaleType = (values: FlexibleValues): 'unico' | 'recorrente' | 'hibrido' => {
    const hasUnico = (values.valor_unico || 0) > 0;
    const hasRecorrente = (values.valor_recorrente || 0) > 0 && (values.recorrencia_periodo || 0) > 0;

    if (hasUnico && hasRecorrente) {
      return 'hibrido';
    } else if (hasRecorrente) {
      return 'recorrente';
    } else {
      return 'unico';
    }
  };

  return {
    // Mutations
    updateValues,
    updateFlexibleValuesMutation,
    
    // Utilitários
    formatCurrency,
    calculateTotal,
    determineSaleType,
    
    // Estados
    isUpdating: updateFlexibleValuesMutation.isPending,
    error: updateFlexibleValuesMutation.error,
    isError: updateFlexibleValuesMutation.isError,
    isSuccess: updateFlexibleValuesMutation.isSuccess
  };
};

export default useFlexibleValues;
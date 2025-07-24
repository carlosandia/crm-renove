import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface QualificationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_empty' | 'empty' | 'greater_than' | 'less_than';
  value: string;
}

interface QualificationRule {
  id?: string;
  name: string;
  description?: string;
  conditions: QualificationCondition[];
  is_active: boolean;
}

interface QualificationRules {
  mql: QualificationRule[];
  sql: QualificationRule[];
}

interface QualificationEvaluationResult {
  should_update: boolean;
  new_stage: 'lead' | 'mql' | 'sql';
  rule_matched?: string;
}

interface QualificationStats {
  total_leads: number;
  leads_count: number;
  mql_count: number;
  sql_count: number;
  mql_conversion_rate: number;
  sql_conversion_rate: number;
}

export const useQualificationApi = () => {
  const queryClient = useQueryClient();

  // Buscar regras de qualificação
  const useQualificationRules = (pipelineId: string) => {
    return useQuery({
      queryKey: ['qualification-rules', pipelineId],
      queryFn: async (): Promise<QualificationRules> => {
        const response = await api.get(`/qualification/rules/${pipelineId}`);
        return response.data.qualification_rules || { mql: [], sql: [] };
      },
      enabled: !!pipelineId,
      staleTime: 5 * 60 * 1000, // 5 minutos
    });
  };

  // Salvar regras de qualificação
  const useSaveQualificationRules = () => {
    return useMutation({
      mutationFn: async ({ pipelineId, rules }: { pipelineId: string; rules: QualificationRules }) => {
        const response = await api.put(`/qualification/rules/${pipelineId}`, {
          qualification_rules: rules
        });
        return response.data;
      },
      onSuccess: (_, variables) => {
        // Invalidar cache das regras
        queryClient.invalidateQueries({
          queryKey: ['qualification-rules', variables.pipelineId]
        });
        
        // Invalidar cache de estatísticas
        queryClient.invalidateQueries({
          queryKey: ['qualification-stats']
        });
      },
    });
  };

  // Avaliar regras de qualificação
  const useEvaluateQualificationRules = () => {
    return useMutation({
      mutationFn: async ({ 
        pipelineLeadId, 
        customData 
      }: { 
        pipelineLeadId: string; 
        customData: Record<string, any> 
      }): Promise<QualificationEvaluationResult> => {
        const response = await api.post(`/qualification/evaluate/${pipelineLeadId}`, {
          custom_data: customData
        });
        return response.data.evaluation;
      },
      onSuccess: () => {
        // Invalidar cache de leads para refletir mudanças
        queryClient.invalidateQueries({
          queryKey: ['pipeline-leads']
        });
      },
    });
  };

  // Buscar estatísticas de qualificação
  const useQualificationStats = (pipelineId?: string) => {
    return useQuery({
      queryKey: ['qualification-stats', pipelineId],
      queryFn: async (): Promise<QualificationStats> => {
        const params = pipelineId ? `?pipeline_id=${pipelineId}` : '';
        const response = await api.get(`/qualification/stats${params}`);
        return response.data.stats;
      },
      staleTime: 2 * 60 * 1000, // 2 minutos
    });
  };

  // Aplicar qualificação manual
  const useManualQualification = () => {
    return useMutation({
      mutationFn: async ({ 
        pipelineLeadId, 
        lifecycleStage, 
        reason 
      }: { 
        pipelineLeadId: string; 
        lifecycleStage: 'lead' | 'mql' | 'sql';
        reason?: string;
      }) => {
        const response = await api.put(`/qualification/manual/${pipelineLeadId}`, {
          lifecycle_stage: lifecycleStage,
          reason
        });
        return response.data;
      },
      onSuccess: () => {
        // Invalidar cache de leads
        queryClient.invalidateQueries({
          queryKey: ['pipeline-leads']
        });
        
        // Invalidar cache de estatísticas
        queryClient.invalidateQueries({
          queryKey: ['qualification-stats']
        });
      },
    });
  };

  return {
    useQualificationRules,
    useSaveQualificationRules,
    useEvaluateQualificationRules,
    useQualificationStats,
    useManualQualification,
  };
};

export type {
  QualificationCondition,
  QualificationRule,
  QualificationRules,
  QualificationEvaluationResult,
  QualificationStats,
};
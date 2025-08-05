import { api } from '../lib/api';

// ================================================================================
// TIPOS E INTERFACES
// ================================================================================
export interface DistributionRule {
  pipeline_id: string;
  mode: 'manual' | 'rodizio';
  is_active: boolean;
  working_hours_only: boolean;
  skip_inactive_members: boolean;
  fallback_to_manual: boolean;
  last_assigned_member_id?: string;
  total_assignments?: number;
  successful_assignments?: number;
  failed_assignments?: number;
  last_assignment_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DistributionStats {
  rule: DistributionRule | null;
  total_assignments: number;
  successful_assignments: number;
  failed_assignments: number;
  last_assignment_at: string | null;
  recent_assignments: AssignmentHistory[];
  assignment_success_rate: number;
}

export interface AssignmentHistory {
  id: string;
  assigned_to: string;
  assignment_method: string;
  round_robin_position?: number;
  total_eligible_members?: number;
  status: string;
  created_at: string;
  users?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface SaveDistributionRuleRequest {
  mode: 'manual' | 'rodizio';
  is_active?: boolean;
  working_hours_only?: boolean;
  skip_inactive_members?: boolean;
  fallback_to_manual?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: string;
}

// ================================================================================
// SERVIÇO DE API PARA DISTRIBUIÇÃO
// ================================================================================
export class DistributionApiService {
  
  /**
   * Buscar regra de distribuição da pipeline
   */
  static async getDistributionRule(pipelineId: string): Promise<DistributionRule> {
    try {
      console.log('🔍 [DistributionApiService] Buscando regra para pipeline:', {
        pipelineId,
        timestamp: new Date().toISOString()
      });
      
      const response = await api.get<ApiResponse<DistributionRule>>(
        `/pipelines/${pipelineId}/distribution-rule`
      );
      
      console.log('📡 [DistributionApiService] Resposta de carregamento:', {
        success: response.data.success,
        hasData: !!response.data.data,
        statusCode: response.status
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao buscar regra de distribuição');
      }
      
      const rule = response.data.data!;
      console.log('✅ [DistributionApiService] Regra carregada:', {
        mode: rule.mode,
        is_active: rule.is_active,
        pipelineId,
        timestamp: new Date().toISOString()
      });
      
      return rule;
    } catch (error: any) {
      console.error('❌ [DistributionApiService] Erro ao buscar regra:', {
        pipelineId,
        error: error.message,
        status: error.response?.status
      });
      
      // Retornar regra padrão em caso de erro
      const defaultRule: DistributionRule = {
        pipeline_id: pipelineId,
        mode: 'manual',
        is_active: true,
        working_hours_only: false,
        skip_inactive_members: true,
        fallback_to_manual: true
      };
      
      console.log('📋 [DistributionApiService] Usando regra padrão devido ao erro:', defaultRule);
      return defaultRule;
    }
  }
  
  /**
   * Salvar regra de distribuição
   */
  static async saveDistributionRule(
    pipelineId: string, 
    rule: SaveDistributionRuleRequest
  ): Promise<DistributionRule> {
    try {
      console.log('💾 [DistributionApiService] Iniciando salvamento:', {
        pipelineId,
        rule,
        timestamp: new Date().toISOString()
      });
      
      const response = await api.post<ApiResponse<DistributionRule>>(
        `/pipelines/${pipelineId}/distribution-rule`,
        rule
      );
      
      console.log('📡 [DistributionApiService] Resposta da API recebida:', {
        success: response.data.success,
        hasData: !!response.data.data,
        statusCode: response.status
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao salvar regra de distribuição');
      }
      
      const savedRule = response.data.data!;
      console.log('✅ [DistributionApiService] Regra salva com sucesso:', {
        savedMode: savedRule.mode,
        savedIsActive: savedRule.is_active,
        originalMode: rule.mode,
        pipelineId,
        timestamp: new Date().toISOString()
      });
      
      return savedRule;
    } catch (error: any) {
      console.error('❌ [DistributionApiService] Erro ao salvar regra:', {
        pipelineId,
        rule,
        error: error.message,
        status: error.response?.status,
        apiError: error.response?.data?.error
      });
      throw new Error(
        error.response?.data?.error || 
        error.message || 
        'Erro ao salvar regra de distribuição'
      );
    }
  }
  
  /**
   * Buscar estatísticas de distribuição
   */
  static async getDistributionStats(pipelineId: string): Promise<DistributionStats> {
    try {
      console.log('📊 Buscando estatísticas de distribuição para pipeline:', pipelineId);
      
      const response = await api.get<ApiResponse<DistributionStats>>(
        `/pipelines/${pipelineId}/distribution-stats`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao buscar estatísticas');
      }
      
      const stats = response.data.data!;
      console.log('✅ Estatísticas carregadas:', {
        totalAssignments: stats.total_assignments,
        successRate: stats.assignment_success_rate
      });
      
      return stats;
    } catch (error: any) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      
      // Retornar estatísticas vazias em caso de erro
      const emptyStats: DistributionStats = {
        rule: null,
        total_assignments: 0,
        successful_assignments: 0,
        failed_assignments: 0,
        last_assignment_at: null,
        recent_assignments: [],
        assignment_success_rate: 0
      };
      
      return emptyStats;
    }
  }
  
  /**
   * Testar distribuição (modo de teste para validar configuração)
   */
  static async testDistribution(pipelineId: string): Promise<{
    success: boolean;
    assigned_to?: string;
    member_name?: string;
    message: string;
  }> {
    try {
      console.log('🧪 Testando distribuição para pipeline:', pipelineId);
      
      // Esta rota pode ser implementada no backend posteriormente
      const response = await api.post<ApiResponse<any>>(
        `/pipelines/${pipelineId}/distribution-test`,
        {}
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao testar distribuição');
      }
      
      console.log('✅ Teste de distribuição realizado com sucesso');
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Erro ao testar distribuição:', error);
      
      // Retornar resultado de teste simulado
      return {
        success: false,
        message: 'Teste de distribuição não disponível no momento'
      };
    }
  }
  
  /**
   * Resetar distribuição (limpar último membro atribuído)
   */
  static async resetDistribution(pipelineId: string): Promise<void> {
    try {
      console.log('🔄 Resetando distribuição para pipeline:', pipelineId);
      
      // Salvar regra mantendo configurações mas resetando último membro
      const currentRule = await this.getDistributionRule(pipelineId);
      
      await this.saveDistributionRule(pipelineId, {
        mode: currentRule.mode,
        is_active: currentRule.is_active,
        working_hours_only: currentRule.working_hours_only,
        skip_inactive_members: currentRule.skip_inactive_members,
        fallback_to_manual: currentRule.fallback_to_manual
      });
      
      console.log('✅ Distribuição resetada com sucesso');
    } catch (error: any) {
      console.error('❌ Erro ao resetar distribuição:', error);
      throw new Error('Erro ao resetar distribuição');
    }
  }
}

// ================================================================================
// HOOKS REACT QUERY PARA DISTRIBUIÇÃO
// ================================================================================
export const distributionQueryKeys = {
  all: ['distribution'] as const,
  rules: () => [...distributionQueryKeys.all, 'rules'] as const,
  rule: (pipelineId: string) => [...distributionQueryKeys.rules(), pipelineId] as const,
  stats: () => [...distributionQueryKeys.all, 'stats'] as const,
  stat: (pipelineId: string) => [...distributionQueryKeys.stats(), pipelineId] as const,
};

// Re-exportar tipos para uso no componente
export type {
  DistributionRule as DistributionRuleType,
  DistributionStats as DistributionStatsType,
  SaveDistributionRuleRequest as SaveDistributionRuleRequestType
};
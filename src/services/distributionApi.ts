import { api } from '../lib/api';

// ================================================================================
// TIPOS E INTERFACES
// ================================================================================
export interface DistributionRule {
  pipeline_id: string;
  mode: 'manual' | 'rodizio';
  is_active: boolean;
  working_hours_only: boolean;
  // ✅ NOVOS CAMPOS: Horários específicos
  working_hours_start?: string; // Formato "HH:MM:SS"
  working_hours_end?: string;   // Formato "HH:MM:SS"
  working_days?: number[];      // Array de dias da semana (1=Domingo, 2=Segunda...)
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
  // ✅ NOVOS CAMPOS: Horários específicos para salvamento
  working_hours_start?: string; // Formato "HH:MM:SS"
  working_hours_end?: string;   // Formato "HH:MM:SS" 
  working_days?: number[];      // Array de dias da semana (1=Domingo, 2=Segunda...)
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
      // ✅ PERFORMANCE: Log consolidado sem dados técnicos desnecessários
      console.log('🔍 [DistributionApi] Carregando regra:', pipelineId.substring(0, 8));
      
      const response = await api.get<ApiResponse<DistributionRule>>(
        `/pipelines/${pipelineId}/distribution-rule`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao buscar regra de distribuição');
      }
      
      const rule = response.data.data!;
      // ✅ PERFORMANCE: Log consolidado com informações essenciais
      console.log('✅ [DistributionApi] Regra carregada:', `${rule.mode} (${rule.is_active ? 'ativa' : 'inativa'})`);
      
      return rule;
    } catch (error: any) {
      console.error('❌ [DistributionApiService] Erro ao buscar regra:', {
        pipelineId,
        error: error.message,
        status: error.response?.status
      });
      
      // ✅ CORREÇÃO: Não mascarar erros de autenticação - propagar para React Query
      if (error.response?.status === 401) {
        throw new Error('Usuário não autenticado');
      }
      
      if (error.response?.status === 403) {
        throw new Error('Acesso negado para esta pipeline');
      }
      
      // ✅ CORREÇÃO: Só usar fallback para erro de "não encontrado" (404)
      if (error.response?.status === 404) {
        // AIDEV-NOTE: SEMPRE usar modo 'manual' como padrão para novas pipelines
        const defaultRule: DistributionRule = {
          pipeline_id: pipelineId,
          mode: 'manual', // ✅ PADRÃO OBRIGATÓRIO: sempre manual inicialmente
          is_active: true,
          working_hours_only: false,
          skip_inactive_members: true,
          fallback_to_manual: true
        };
        
        console.log('📋 [DistributionApiService] Usando regra padrão MANUAL para pipeline nova:', {
          pipelineId: pipelineId.substring(0, 8),
          mode: defaultRule.mode,
          is_active: defaultRule.is_active
        });
        return defaultRule;
      }
      
      // Para outros erros, propagar
      throw error;
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
      // ✅ PERFORMANCE: Log consolidado
      console.log('💾 [DistributionApi] Salvando regra:', `${rule.mode} (${rule.is_active ? 'ativa' : 'inativa'})`);
      
      const response = await api.post<ApiResponse<DistributionRule>>(
        `/pipelines/${pipelineId}/distribution-rule`,
        rule
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao salvar regra de distribuição');
      }
      
      const savedRule = response.data.data!;
      // ✅ PERFORMANCE: Log consolidado e essencial
      console.log('✅ [DistributionApi] Regra salva:', `${savedRule.mode} (${savedRule.is_active ? 'ativa' : 'inativa'})`);
      
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
      
      // ✅ CORREÇÃO: Não mascarar erros de autenticação - propagar para React Query
      if (error.response?.status === 401) {
        throw new Error('Usuário não autenticado');
      }
      
      if (error.response?.status === 403) {
        throw new Error('Acesso negado para estatísticas desta pipeline');
      }
      
      // ✅ CORREÇÃO: Só usar fallback para erro de "não encontrado" (404)
      if (error.response?.status === 404) {
        const emptyStats: DistributionStats = {
          rule: null,
          total_assignments: 0,
          successful_assignments: 0,
          failed_assignments: 0,
          last_assignment_at: null,
          recent_assignments: [],
          assignment_success_rate: 0
        };
        
        console.log('📋 [DistributionApiService] Usando stats vazias para pipeline nova:', {
          pipelineId: pipelineId.substring(0, 8),
          total_assignments: emptyStats.total_assignments,
          success_rate: emptyStats.assignment_success_rate
        });
        return emptyStats;
      }
      
      // Para outros erros, propagar
      throw error;
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
      
      // ✅ CORREÇÃO: Não mascarar erros de autenticação
      if (error.response?.status === 401) {
        throw new Error('Usuário não autenticado');
      }
      
      if (error.response?.status === 403) {
        throw new Error('Acesso negado para testar distribuição');
      }
      
      // ✅ CORREÇÃO: Para funcionalidade não implementada (404), retornar simulado
      if (error.response?.status === 404) {
        return {
          success: false,
          message: 'Funcionalidade de teste ainda não implementada no backend'
        };
      }
      
      // Para outros erros, propagar
      throw error;
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
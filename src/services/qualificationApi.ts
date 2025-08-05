import { api } from '../lib/api';
import { withApiRetry, withCriticalRetry } from '../utils/supabaseRetry';

// ================================================================================
// TIPOS E INTERFACES
// ================================================================================
export interface QualificationRule {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'not_empty' | 'in_list';
  value: string;
  description: string;
}

export interface QualificationRules {
  mql: QualificationRule[];
  sql: QualificationRule[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

interface SaveQualificationRulesResponse {
  pipeline_id: string;
  qualification_rules: QualificationRules;
  inserted_count: number;
}

interface LoadQualificationRulesResponse {
  pipeline_id: string;
  qualification_rules: QualificationRules;
}

// ================================================================================
// QUERY KEYS PARA REACT QUERY
// ================================================================================
export const qualificationQueryKeys = {
  rules: (pipelineId: string) => ['qualification-rules', pipelineId],
} as const;

// ================================================================================
// SERVIÇO DE API PARA REGRAS DE QUALIFICAÇÃO
// ================================================================================
export class QualificationApiService {
  /**
   * Salvar regras de qualificação
   */
  static async saveQualificationRules(
    pipelineId: string, 
    qualificationRules: QualificationRules
  ): Promise<SaveQualificationRulesResponse> {
    console.log('💾 [QualificationApiService] Iniciando salvamento com retry logic:', {
      pipelineId,
      mqlCount: qualificationRules.mql.length,
      sqlCount: qualificationRules.sql.length,
      timestamp: new Date().toISOString()
    });

    // ✅ NOVO: Usar retry crítico para operações de salvamento
    return await withCriticalRetry(async () => {
      console.log('🔄 [QualificationApiService] Executando salvamento via backend API...');
      
      const response = await api.post<ApiResponse<SaveQualificationRulesResponse>>(
        `/pipelines/${pipelineId}/qualification-rules`,
        { qualification_rules: qualificationRules }
      );
      
      console.log('📡 [QualificationApiService] Resposta da API recebida:', {
        success: response.data.success,
        hasData: !!response.data.data,
        statusCode: response.status
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao salvar regras de qualificação');
      }
      
      const savedRules = response.data.data!;
      console.log('✅ [QualificationApiService] Regras salvas com sucesso:', {
        pipelineId,
        insertedCount: savedRules.inserted_count,
        mqlCount: savedRules.qualification_rules.mql.length,
        sqlCount: savedRules.qualification_rules.sql.length,
        timestamp: new Date().toISOString()
      });
      
      return savedRules;
    }, `Salvar Regras de Qualificação [${pipelineId}]`);
  }
  
  /**
   * Carregar regras de qualificação
   */
  static async loadQualificationRules(pipelineId: string): Promise<QualificationRules> {
    console.log('🔍 [QualificationApiService] Iniciando carregamento com retry logic:', {
      pipelineId,
      timestamp: new Date().toISOString()
    });

    try {
      // ✅ NOVO: Usar retry básico para operações de leitura
      return await withApiRetry(async () => {
        console.log('🔄 [QualificationApiService] Executando carregamento via backend API...');
        
        const response = await api.get<ApiResponse<LoadQualificationRulesResponse>>(
          `/pipelines/${pipelineId}/qualification-rules`
        );
        
        console.log('📡 [QualificationApiService] Resposta de carregamento recebida:', {
          success: response.data.success,
          hasData: !!response.data.data,
          statusCode: response.status
        });
        
        if (!response.data.success) {
          throw new Error(response.data.error || 'Erro ao carregar regras de qualificação');
        }
        
        const qualificationRules = response.data.data!.qualification_rules;
        console.log('✅ [QualificationApiService] Regras carregadas com sucesso:', {
          pipelineId,
          mqlCount: qualificationRules.mql.length,
          sqlCount: qualificationRules.sql.length,
          timestamp: new Date().toISOString()
        });
        
        return qualificationRules;
      }, `Carregar Regras de Qualificação [${pipelineId}]`);
      
    } catch (error: any) {
      console.error('❌ [QualificationApiService] Erro ao carregar regras após retry:', {
        pipelineId,
        error: error.message,
        status: error.response?.status,
        apiError: error.response?.data?.error
      });
      
      // Em caso de erro após retry, retornar estrutura vazia
      console.warn('⚠️ [QualificationApiService] Retornando regras vazias devido ao erro');
      return { mql: [], sql: [] };
    }
  }
  
  /**
   * Resetar regras de qualificação (remover todas)
   */
  static async resetQualificationRules(pipelineId: string): Promise<void> {
    try {
      console.log('🗑️ [QualificationApiService] Resetando regras de qualificação:', {
        pipelineId,
        timestamp: new Date().toISOString()
      });
      
      // Salvar regras vazias para resetar
      await this.saveQualificationRules(pipelineId, { mql: [], sql: [] });
      
      console.log('✅ [QualificationApiService] Regras resetadas com sucesso:', {
        pipelineId
      });
      
    } catch (error: any) {
      console.error('❌ [QualificationApiService] Erro ao resetar regras:', {
        pipelineId,
        error: error.message
      });
      
      throw new Error('Erro ao resetar regras de qualificação');
    }
  }
}
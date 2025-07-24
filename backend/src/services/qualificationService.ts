import { supabase } from '../config/supabase';

// AIDEV-NOTE: Tipos para regras de qualificação
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

export interface QualificationEvaluationResult {
  should_update: boolean;
  new_stage: 'lead' | 'mql' | 'sql';
  rule_matched?: string;
}

export class QualificationService {
  /**
   * Salvar regras de qualificação para uma pipeline
   */
  static async saveQualificationRules(
    pipelineId: string,
    rules: QualificationRules,
    tenantId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 [QualificationService] Salvando regras de qualificação:', {
        pipelineId,
        tenantId,
        mqlRules: rules.mql?.length || 0,
        sqlRules: rules.sql?.length || 0
      });

      // Validar dados de entrada
      if (!pipelineId || !tenantId) {
        throw new Error('Pipeline ID e Tenant ID são obrigatórios');
      }

      // Validar estrutura das regras
      if (!rules || typeof rules !== 'object') {
        throw new Error('Regras de qualificação devem ser um objeto válido');
      }

      // Validar se pipeline existe e pertence ao tenant
      const { data: pipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .select('id, tenant_id')
        .eq('id', pipelineId)
        .eq('tenant_id', tenantId)
        .single();

      if (pipelineError || !pipeline) {
        throw new Error('Pipeline não encontrada ou não pertence ao tenant especificado');
      }

      // Preparar dados para salvar
      const qualificationRulesData = {
        mql: Array.isArray(rules.mql) ? rules.mql : [],
        sql: Array.isArray(rules.sql) ? rules.sql : []
      };

      // Validar regras individuais
      [...qualificationRulesData.mql, ...qualificationRulesData.sql].forEach((rule, index) => {
        if (!rule.name || typeof rule.name !== 'string') {
          throw new Error(`Regra ${index + 1}: Nome é obrigatório`);
        }
        if (!Array.isArray(rule.conditions) || rule.conditions.length === 0) {
          throw new Error(`Regra "${rule.name}": Pelo menos uma condição é obrigatória`);
        }
        rule.conditions.forEach((condition, condIndex) => {
          if (!condition.field || !condition.operator) {
            throw new Error(`Regra "${rule.name}", Condição ${condIndex + 1}: Campo e operador são obrigatórios`);
          }
          if (!['not_empty', 'empty'].includes(condition.operator) && !condition.value) {
            throw new Error(`Regra "${rule.name}", Condição ${condIndex + 1}: Valor é obrigatório para este operador`);
          }
        });
      });

      // Atualizar pipeline com as regras
      const { error: updateError } = await supabase
        .from('pipelines')
        .update({ 
          qualification_rules: qualificationRulesData,
          updated_at: new Date().toISOString()
        })
        .eq('id', pipelineId)
        .eq('tenant_id', tenantId);

      if (updateError) {
        console.error('❌ [QualificationService] Erro ao salvar regras:', updateError);
        throw new Error(`Erro ao salvar regras: ${updateError.message}`);
      }

      console.log('✅ [QualificationService] Regras de qualificação salvas com sucesso:', {
        pipelineId,
        mqlRules: qualificationRulesData.mql.length,
        sqlRules: qualificationRulesData.sql.length
      });

      return {
        success: true,
        message: `Regras de qualificação salvas com sucesso. ${qualificationRulesData.mql.length} regras MQL e ${qualificationRulesData.sql.length} regras SQL configuradas.`
      };

    } catch (error: any) {
      console.error('❌ [QualificationService] Erro ao salvar regras:', error);
      return {
        success: false,
        message: error.message || 'Erro interno ao salvar regras de qualificação'
      };
    }
  }

  /**
   * Buscar regras de qualificação de uma pipeline
   */
  static async getQualificationRules(
    pipelineId: string,
    tenantId: string
  ): Promise<{ success: boolean; rules?: QualificationRules; message: string }> {
    try {
      console.log('🔍 [QualificationService] Buscando regras de qualificação:', {
        pipelineId,
        tenantId
      });

      // Validar dados de entrada
      if (!pipelineId || !tenantId) {
        throw new Error('Pipeline ID e Tenant ID são obrigatórios');
      }

      // Buscar pipeline e suas regras
      const { data: pipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .select('id, qualification_rules')
        .eq('id', pipelineId)
        .eq('tenant_id', tenantId)
        .single();

      if (pipelineError) {
        throw new Error(`Erro ao buscar pipeline: ${pipelineError.message}`);
      }

      if (!pipeline) {
        throw new Error('Pipeline não encontrada');
      }

      // Processar regras
      let rules: QualificationRules = { mql: [], sql: [] };
      
      if (pipeline.qualification_rules) {
        if (typeof pipeline.qualification_rules === 'string') {
          rules = JSON.parse(pipeline.qualification_rules);
        } else {
          rules = pipeline.qualification_rules as QualificationRules;
        }
      }

      // Garantir estrutura válida
      rules.mql = Array.isArray(rules.mql) ? rules.mql : [];
      rules.sql = Array.isArray(rules.sql) ? rules.sql : [];

      console.log('✅ [QualificationService] Regras encontradas:', {
        pipelineId,
        mqlRules: rules.mql.length,
        sqlRules: rules.sql.length
      });

      return {
        success: true,
        rules,
        message: 'Regras de qualificação carregadas com sucesso'
      };

    } catch (error: any) {
      console.error('❌ [QualificationService] Erro ao buscar regras:', error);
      return {
        success: false,
        message: error.message || 'Erro interno ao buscar regras de qualificação'
      };
    }
  }

  /**
   * Avaliar regras de qualificação para um lead específico
   */
  static async evaluateQualificationRules(
    pipelineLeadId: string,
    customData: Record<string, any>
  ): Promise<QualificationEvaluationResult> {
    try {
      console.log('🔍 [QualificationService] Avaliando regras de qualificação:', {
        pipelineLeadId,
        customDataKeys: Object.keys(customData)
      });

      // Usar função PostgreSQL para avaliação
      const { data, error } = await supabase.rpc('evaluate_qualification_rules', {
        p_pipeline_lead_id: pipelineLeadId,
        p_custom_data: customData
      });

      if (error) {
        console.warn('⚠️ [QualificationService] Função PostgreSQL não disponível, usando avaliação manual:', error.message);
        return this.evaluateRulesManually(pipelineLeadId, customData);
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        return {
          should_update: false,
          new_stage: 'lead'
        };
      }

      const result = data[0];
      return {
        should_update: result.should_update || false,
        new_stage: result.new_stage || 'lead',
        rule_matched: result.rule_matched || undefined
      };

    } catch (error: any) {
      console.error('❌ [QualificationService] Erro na avaliação:', error);
      return {
        should_update: false,
        new_stage: 'lead'
      };
    }
  }

  /**
   * Avaliação manual das regras (fallback)
   */
  private static async evaluateRulesManually(
    pipelineLeadId: string,
    customData: Record<string, any>
  ): Promise<QualificationEvaluationResult> {
    try {
      // Buscar pipeline_lead e suas regras
      const { data: pipelineLead, error: leadError } = await supabase
        .from('pipeline_leads')
        .select(`
          id,
          lifecycle_stage,
          pipeline_id,
          pipelines!inner(
            qualification_rules
          )
        `)
        .eq('id', pipelineLeadId)
        .single();

      if (leadError || !pipelineLead) {
        throw new Error('Pipeline lead não encontrado');
      }

      const pipeline = Array.isArray(pipelineLead.pipelines) 
        ? pipelineLead.pipelines[0] 
        : pipelineLead.pipelines;

      if (!pipeline?.qualification_rules) {
        return {
          should_update: false,
          new_stage: pipelineLead.lifecycle_stage || 'lead'
        };
      }

      const rules: QualificationRules = pipeline.qualification_rules;
      const currentStage = pipelineLead.lifecycle_stage || 'lead';

      // Avaliar regras SQL primeiro (maior prioridade)
      if (currentStage !== 'sql' && rules.sql?.length > 0) {
        for (const rule of rules.sql) {
          if (!rule.is_active) continue;
          
          if (this.evaluateRule(rule, customData)) {
            return {
              should_update: true,
              new_stage: 'sql',
              rule_matched: rule.name
            };
          }
        }
      }

      // Avaliar regras MQL se não qualificou para SQL
      if (currentStage === 'lead' && rules.mql?.length > 0) {
        for (const rule of rules.mql) {
          if (!rule.is_active) continue;
          
          if (this.evaluateRule(rule, customData)) {
            return {
              should_update: true,
              new_stage: 'mql',
              rule_matched: rule.name
            };
          }
        }
      }

      return {
        should_update: false,
        new_stage: currentStage
      };

    } catch (error: any) {
      console.error('❌ [QualificationService] Erro na avaliação manual:', error);
      return {
        should_update: false,
        new_stage: 'lead'
      };
    }
  }

  /**
   * Avaliar uma regra individual
   */
  private static evaluateRule(rule: QualificationRule, customData: Record<string, any>): boolean {
    try {
      if (!rule.conditions || rule.conditions.length === 0) {
        return false;
      }

      // Todas as condições devem ser verdadeiras (AND)
      for (const condition of rule.conditions) {
        if (!this.evaluateCondition(condition, customData)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ [QualificationService] Erro ao avaliar regra:', error);
      return false;
    }
  }

  /**
   * Avaliar uma condição individual
   */
  private static evaluateCondition(condition: QualificationCondition, customData: Record<string, any>): boolean {
    try {
      const actualValue = customData[condition.field];
      const expectedValue = condition.value;

      switch (condition.operator) {
        case 'equals':
          return String(actualValue || '') === String(expectedValue || '');
        
        case 'not_equals':
          return String(actualValue || '') !== String(expectedValue || '');
        
        case 'contains':
          return String(actualValue || '').toLowerCase().includes(String(expectedValue || '').toLowerCase());
        
        case 'not_empty':
          return actualValue !== null && actualValue !== undefined && String(actualValue).trim() !== '';
        
        case 'empty':
          return actualValue === null || actualValue === undefined || String(actualValue).trim() === '';
        
        case 'greater_than':
          const actualNum = parseFloat(String(actualValue || '0'));
          const expectedNum = parseFloat(String(expectedValue || '0'));
          return !isNaN(actualNum) && !isNaN(expectedNum) && actualNum > expectedNum;
        
        case 'less_than':
          const actualNumLess = parseFloat(String(actualValue || '0'));
          const expectedNumLess = parseFloat(String(expectedValue || '0'));
          return !isNaN(actualNumLess) && !isNaN(expectedNumLess) && actualNumLess < expectedNumLess;
        
        default:
          return false;
      }
    } catch (error) {
      console.error('❌ [QualificationService] Erro ao avaliar condição:', error);
      return false;
    }
  }

  /**
   * Obter estatísticas de qualificação
   */
  static async getQualificationStats(
    tenantId: string,
    pipelineId?: string
  ): Promise<{
    success: boolean;
    stats?: {
      total_leads: number;
      leads_count: number;
      mql_count: number;
      sql_count: number;
      mql_conversion_rate: number;
      sql_conversion_rate: number;
    };
    message: string;
  }> {
    try {
      console.log('📊 [QualificationService] Buscando estatísticas de qualificação:', {
        tenantId,
        pipelineId
      });

      // Usar função PostgreSQL para estatísticas
      const { data, error } = await supabase.rpc('get_qualification_stats', {
        p_tenant_id: tenantId,
        p_pipeline_id: pipelineId || null
      });

      if (error) {
        throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        return {
          success: true,
          stats: {
            total_leads: 0,
            leads_count: 0,
            mql_count: 0,
            sql_count: 0,
            mql_conversion_rate: 0,
            sql_conversion_rate: 0
          },
          message: 'Nenhum dado encontrado'
        };
      }

      const stats = data[0];
      return {
        success: true,
        stats: {
          total_leads: parseInt(stats.total_leads) || 0,
          leads_count: parseInt(stats.leads_count) || 0,
          mql_count: parseInt(stats.mql_count) || 0,
          sql_count: parseInt(stats.sql_count) || 0,
          mql_conversion_rate: parseFloat(stats.mql_conversion_rate) || 0,
          sql_conversion_rate: parseFloat(stats.sql_conversion_rate) || 0
        },
        message: 'Estatísticas carregadas com sucesso'
      };

    } catch (error: any) {
      console.error('❌ [QualificationService] Erro ao buscar estatísticas:', error);
      return {
        success: false,
        message: error.message || 'Erro interno ao buscar estatísticas'
      };
    }
  }
}
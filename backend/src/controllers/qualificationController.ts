import { Request, Response } from 'express';
import { QualificationService } from '../services/qualificationService';
import { supabase } from '../config/supabase';

export class QualificationController {
  /**
   * Salvar regras de qualificação para uma pipeline
   */
  static async saveQualificationRules(req: Request, res: Response) {
    try {
      const { pipeline_id } = req.params;
      const { qualification_rules } = req.body;
      const user = (req as any).user;

      console.log('🔄 [QualificationController] Salvando regras de qualificação:', {
        pipeline_id,
        tenant_id: user?.tenant_id,
        user_id: user?.id,
        rulesReceived: !!qualification_rules
      });

      // Validar autenticação
      if (!user?.tenant_id) {
        return res.status(400).json({
          success: false,
          error: 'Usuário deve pertencer a uma empresa'
        });
      }

      // Validar permissões (apenas admins podem configurar regras)
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Apenas administradores podem configurar regras de qualificação'
        });
      }

      // Validar dados de entrada
      if (!pipeline_id) {
        return res.status(400).json({
          success: false,
          error: 'Pipeline ID é obrigatório'
        });
      }

      if (!qualification_rules) {
        return res.status(400).json({
          success: false,
          error: 'Regras de qualificação são obrigatórias'
        });
      }

      // Salvar regras
      const result = await QualificationService.saveQualificationRules(
        pipeline_id,
        qualification_rules,
        user.tenant_id
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.message
        });
      }

      console.log('✅ [QualificationController] Regras salvas com sucesso:', {
        pipeline_id,
        tenant_id: user.tenant_id
      });

      res.json({
        success: true,
        message: result.message
      });

    } catch (error: any) {
      console.error('❌ [QualificationController] Erro ao salvar regras:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Buscar regras de qualificação de uma pipeline
   */
  static async getQualificationRules(req: Request, res: Response) {
    try {
      const { pipeline_id } = req.params;
      const user = (req as any).user;

      console.log('🔍 [QualificationController] Buscando regras de qualificação:', {
        pipeline_id,
        tenant_id: user?.tenant_id,
        user_id: user?.id
      });

      // Validar autenticação
      if (!user?.tenant_id) {
        return res.status(400).json({
          success: false,
          error: 'Usuário deve pertencer a uma empresa'
        });
      }

      // Validar dados de entrada
      if (!pipeline_id) {
        return res.status(400).json({
          success: false,
          error: 'Pipeline ID é obrigatório'
        });
      }

      // Buscar regras
      const result = await QualificationService.getQualificationRules(
        pipeline_id,
        user.tenant_id
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.message
        });
      }

      console.log('✅ [QualificationController] Regras encontradas:', {
        pipeline_id,
        mqlRules: result.rules?.mql?.length || 0,
        sqlRules: result.rules?.sql?.length || 0
      });

      res.json({
        success: true,
        qualification_rules: result.rules,
        message: result.message
      });

    } catch (error: any) {
      console.error('❌ [QualificationController] Erro ao buscar regras:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Avaliar regras de qualificação para um lead específico
   */
  static async evaluateQualificationRules(req: Request, res: Response) {
    try {
      const { pipeline_lead_id } = req.params;
      const { custom_data } = req.body;
      const user = (req as any).user;

      console.log('🔍 [QualificationController] Avaliando regras de qualificação:', {
        pipeline_lead_id,
        tenant_id: user?.tenant_id,
        user_id: user?.id,
        customDataKeys: custom_data ? Object.keys(custom_data) : []
      });

      // Validar autenticação
      if (!user?.tenant_id) {
        return res.status(400).json({
          success: false,
          error: 'Usuário deve pertencer a uma empresa'
        });
      }

      // Validar dados de entrada
      if (!pipeline_lead_id) {
        return res.status(400).json({
          success: false,
          error: 'Pipeline Lead ID é obrigatório'
        });
      }

      if (!custom_data || typeof custom_data !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Dados customizados são obrigatórios'
        });
      }

      // Avaliar regras
      const result = await QualificationService.evaluateQualificationRules(
        pipeline_lead_id,
        custom_data
      );

      console.log('✅ [QualificationController] Avaliação concluída:', {
        pipeline_lead_id,
        should_update: result.should_update,
        new_stage: result.new_stage,
        rule_matched: result.rule_matched
      });

      res.json({
        success: true,
        evaluation: result
      });

    } catch (error: any) {
      console.error('❌ [QualificationController] Erro na avaliação:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Obter estatísticas de qualificação
   */
  static async getQualificationStats(req: Request, res: Response) {
    try {
      const { pipeline_id } = req.query;
      const user = (req as any).user;

      console.log('📊 [QualificationController] Buscando estatísticas de qualificação:', {
        pipeline_id: pipeline_id || 'all',
        tenant_id: user?.tenant_id,
        user_id: user?.id
      });

      // Validar autenticação
      if (!user?.tenant_id) {
        return res.status(400).json({
          success: false,
          error: 'Usuário deve pertencer a uma empresa'
        });
      }

      // Buscar estatísticas
      const result = await QualificationService.getQualificationStats(
        user.tenant_id,
        pipeline_id as string | undefined
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.message
        });
      }

      console.log('✅ [QualificationController] Estatísticas encontradas:', {
        tenant_id: user.tenant_id,
        pipeline_id: pipeline_id || 'all',
        stats: result.stats
      });

      res.json({
        success: true,
        stats: result.stats,
        message: result.message
      });

    } catch (error: any) {
      console.error('❌ [QualificationController] Erro ao buscar estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Aplicar qualificação manual a um lead
   */
  static async applyManualQualification(req: Request, res: Response) {
    try {
      const { pipeline_lead_id } = req.params;
      const { lifecycle_stage, reason } = req.body;
      const user = (req as any).user;

      console.log('🔄 [QualificationController] Aplicando qualificação manual:', {
        pipeline_lead_id,
        lifecycle_stage,
        reason,
        tenant_id: user?.tenant_id,
        user_id: user?.id
      });

      // Validar autenticação
      if (!user?.tenant_id) {
        return res.status(400).json({
          success: false,
          error: 'Usuário deve pertencer a uma empresa'
        });
      }

      // Validar dados de entrada
      if (!pipeline_lead_id) {
        return res.status(400).json({
          success: false,
          error: 'Pipeline Lead ID é obrigatório'
        });
      }

      if (!lifecycle_stage || !['lead', 'mql', 'sql'].includes(lifecycle_stage)) {
        return res.status(400).json({
          success: false,
          error: 'Lifecycle stage deve ser: lead, mql ou sql'
        });
      }

      // Verificar se o lead existe e pertence ao tenant
      const { data: pipelineLead, error: leadError } = await supabase
        .from('pipeline_leads')
        .select('id, lifecycle_stage, tenant_id')
        .eq('id', pipeline_lead_id)
        .eq('tenant_id', user.tenant_id)
        .single();

      if (leadError || !pipelineLead) {
        return res.status(404).json({
          success: false,
          error: 'Lead não encontrado'
        });
      }

      const previousStage = pipelineLead.lifecycle_stage;

      // Atualizar lifecycle_stage
      const { error: updateError } = await supabase
        .from('pipeline_leads')
        .update({ 
          lifecycle_stage,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', pipeline_lead_id);

      if (updateError) {
        throw new Error(`Erro ao atualizar lead: ${updateError.message}`);
      }

      // Registrar no histórico
      const { error: historyError } = await supabase
        .from('lead_lifecycle_history')
        .insert({
          pipeline_lead_id,
          tenant_id: user.tenant_id,
          from_stage: previousStage,
          to_stage: lifecycle_stage,
          changed_by: user.id,
          automation_triggered: false,
          rule_matched: reason || 'Qualificação manual',
          metadata: {
            manual_qualification: true,
            changed_by_user: user.email,
            changed_at: new Date().toISOString()
          }
        });

      if (historyError) {
        console.warn('⚠️ Erro ao registrar histórico (não crítico):', historyError);
      }

      console.log('✅ [QualificationController] Qualificação manual aplicada:', {
        pipeline_lead_id,
        from_stage: previousStage,
        to_stage: lifecycle_stage,
        changed_by: user.id
      });

      res.json({
        success: true,
        message: `Lead qualificado como ${lifecycle_stage.toUpperCase()} com sucesso`,
        previous_stage: previousStage,
        new_stage: lifecycle_stage
      });

    } catch (error: any) {
      console.error('❌ [QualificationController] Erro na qualificação manual:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }
}
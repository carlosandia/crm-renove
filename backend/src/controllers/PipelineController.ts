import { Request, Response } from 'express';
import { PipelineService } from '../services/pipelineService';
import { MemberService } from '../services/memberService';
import { CadenceService } from '../services/cadenceService'; // ✅ BUGFIX: Importar CadenceService
import { supabase as supabaseAdmin } from '../config/supabase';

// ✅ TYPES: Definições específicas para Request autenticado
interface AuthenticatedUser {
  id: string;
  email: string;
  tenant_id: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export class PipelineController {
  // ✅ NOVA ROTA: Validar nome de pipeline em tempo real
  static async validatePipelineName(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, pipeline_id } = req.query;
      const user = (req as any).user;

      if (!user?.tenant_id) {
        return res.status(400).json({ 
          error: 'Usuário deve pertencer a uma empresa' 
        });
      }

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ 
          error: 'Nome da pipeline é obrigatório' 
        });
      }

      console.log('🔍 [PipelineController] Validando nome:', {
        name,
        tenant_id: user.tenant_id,
        pipeline_id: pipeline_id || 'novo',
        user_email: user.email
      });

      const validation = await PipelineService.validatePipelineName(
        name,
        user.tenant_id,
        pipeline_id as string | undefined
      );

      console.log('✅ [PipelineController] Validação concluída:', {
        is_valid: validation.is_valid,
        has_suggestion: !!validation.suggestion,
        similar_names_count: validation.similar_names?.length || 0
      });

      res.json({
        success: true,
        validation
      });

    } catch (error) {
      console.error('❌ [PipelineController] Erro na validação:', error);
      res.status(500).json({
        error: 'Erro interno na validação',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  static async getPipelines(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      
      if (!user?.tenant_id) {
        console.error('❌ [getPipelines] Usuário sem tenant_id:', { user });
        return res.status(400).json({ error: 'Usuário deve pertencer a uma empresa' });
      }

      // ✅ THROTTLING: Log apenas em development e menos frequente
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [getPipelines] Buscando pipelines para tenant:', {
          tenant_id: user.tenant_id,
          user_role: user.role
        });
      }

      // ✅ CORREÇÃO 4: Implementar sistema de permissões baseado em role
      let pipelines;
      
      if (user.role === 'admin' || user.role === 'super_admin') {
        // Admins veem todas as pipelines do tenant
        pipelines = await PipelineService.getPipelinesByTenant(user.tenant_id);
        // ✅ CORREÇÃO: Remover log redundante - já logado acima
      } else if (user.role === 'member') {
        // Members veem apenas pipelines onde estão vinculados
        pipelines = await PipelineService.getPipelinesByMember(user.id);
        // ✅ CORREÇÃO: Log apenas se necessário em development
        if (process.env.NODE_ENV === 'development') {
          console.log('👤 [getPipelines] Member - pipelines encontradas:', pipelines?.length || 0);
        }
      } else {
        // Role desconhecida - negar acesso
        console.warn('⚠️ [getPipelines] Role desconhecida:', user.role);
        return res.status(403).json({ 
          error: 'Acesso negado',
          details: 'Role de usuário não reconhecida'
        });
      }
      
      // ✅ CORREÇÃO: Log simplificado apenas em development
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [getPipelines] Completed:', {
          count: pipelines?.length || 0,
          role: user.role
        });
      }

      res.json({ 
        success: true,
        pipelines 
      });
    } catch (error) {
      console.error('❌ [getPipelines] Erro ao buscar pipelines:', error);
      res.status(500).json({ 
        error: 'Erro ao buscar pipelines', 
        details: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    }
  }

  static async getPipelineById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      
      if (!user?.tenant_id) {
        return res.status(400).json({ error: 'Usuário deve pertencer a uma empresa' });
      }

      console.log('🔍 [getPipelineById] Buscando pipeline para tenant:', {
        tenant_id: user.tenant_id,
        user_id: user.id,
        user_email: user.email,
        user_role: user.role,
        pipeline_id: id
      });

      const pipeline = await PipelineService.getPipelineById(id);

      if (!pipeline) {
        console.warn('🚫 [getPipelineById] Pipeline não encontrada:', { id });
        return res.status(404).json({ error: 'Pipeline não encontrada' });
      }

      // ✅ DEBUG: Log da pipeline encontrada
      console.log('📋 [getPipelineById] Pipeline encontrada:', {
        id: pipeline.id,
        name: pipeline.name,
        tenant_id: pipeline.tenant_id,
        has_stages: !!pipeline.pipeline_stages,
        stages_count: pipeline.pipeline_stages?.length || 0,
        has_members: !!pipeline.pipeline_members,
        members_count: pipeline.pipeline_members?.length || 0,
        has_outcome_reasons: !!pipeline.outcome_reasons,
        won_reasons_count: pipeline.outcome_reasons?.won?.length || 0,
        lost_reasons_count: pipeline.outcome_reasons?.lost?.length || 0
      });

      // ✅ CORREÇÃO 4: Verificar permissões de acesso à pipeline específica
      if (user.role === 'member') {
        // Members só podem acessar pipelines onde estão vinculados
        const isMember = pipeline.pipeline_members?.some(
          (pm: any) => pm.member_id === user.id
        );
        
        if (!isMember) {
          console.warn('🚫 [getPipelineById] Member tentando acessar pipeline não autorizada:', {
            user_id: user.id,
            pipeline_id: id,
            pipeline_name: pipeline.name
          });
          return res.status(403).json({ 
            error: 'Acesso negado',
            details: 'Você não tem permissão para acessar esta pipeline'
          });
        }
      }

      // Verificar se pipeline pertence ao mesmo tenant
      if (pipeline.tenant_id !== user.tenant_id) {
        console.warn('🚫 [getPipelineById] Tentativa de acesso cross-tenant:', {
          user_tenant: user.tenant_id,
          pipeline_tenant: pipeline.tenant_id,
          pipeline_id: id
        });
        return res.status(403).json({ 
          error: 'Acesso negado',
          details: 'Pipeline não pertence à sua empresa'
        });
      }

      console.log('✅ [getPipelineById] Pipeline retornada com sucesso:', {
        id: pipeline.id,
        name: pipeline.name,
        stages_count: pipeline.pipeline_stages?.length || 0
      });

      // ✅ CORREÇÃO: Retornar dados diretamente para compatibilidade com frontend
      res.json(pipeline);
    } catch (error) {
      console.error('Erro ao buscar pipeline:', error);
      res.status(500).json({ 
        error: 'Erro ao buscar pipeline',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  static async createPipeline(req: Request, res: Response) {
    try {
      const { name, description, tenant_id, created_by, member_ids = [] } = req.body;
      const user = (req as any).user;
      
      // ✅ CONTROLE DE PERMISSÕES: Apenas admin pode criar pipelines
      if (!user?.tenant_id) {
        return res.status(400).json({ 
          error: 'Usuário deve pertencer a uma empresa' 
        });
      }
      
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({ 
          error: 'Apenas administradores podem criar pipelines' 
        });
      }

      if (!name || !tenant_id || !created_by) {
        return res.status(400).json({ 
          error: 'Nome, tenant_id e created_by são obrigatórios' 
        });
      }

      const pipeline = await PipelineService.createPipeline({
        name,
        description,
        tenant_id,
        created_by,
        member_ids
      });

      res.status(201).json({ 
        message: 'Pipeline criada com sucesso',
        pipeline 
      });
    } catch (error) {
      console.error('Erro ao criar pipeline:', error);
      
      // ✅ TRATAR ERROS DE VALIDAÇÃO DE FORMA AMIGÁVEL
      if (error instanceof Error && error.message.includes('Já existe uma pipeline')) {
        return res.status(409).json({ 
          error: 'Nome já existe',
          details: error.message
        });
      }

      res.status(500).json({ 
        error: 'Erro ao criar pipeline',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  static async createPipelineWithStagesAndFields(req: Request, res: Response) {
    try {
      // ✅ DIAGNÓSTICO: Logs detalhados do início da execução
      console.log('🔄 [createPipelineWithStagesAndFields] INICIADO - Recebendo requisição:', {
        url: req.url,
        method: req.method,
        body_keys: Object.keys(req.body || {}),
        body_size: JSON.stringify(req.body || {}).length,
        user_exists: !!(req as any).user,
        timestamp: new Date().toISOString()
      });

      const { 
        name, 
        description, 
        tenant_id, 
        created_by, 
        member_ids = [], 
        stages = [], 
        custom_fields = [],
        cadence_configs = [], // ✅ BUGFIX: Adicionar suporte a cadências
        outcome_reasons = { ganho_reasons: [], perdido_reasons: [] }, // ✅ NOVO: Suporte a motivos como JSONB
        qualification_rules = { mql: [], sql: [] } // ✅ CORREÇÃO: Campo obrigatório com valor padrão
      } = req.body;
      const user = (req as any).user;

      // ✅ DIAGNÓSTICO: Log detalhado do payload recebido
      console.log('📋 [createPipelineWithStagesAndFields] Payload completo recebido:', {
        name: name || '[AUSENTE]',
        description: description || '[AUSENTE]',
        tenant_id: tenant_id || '[AUSENTE]',
        created_by: created_by || '[AUSENTE]',
        member_ids_count: member_ids?.length || 0,
        stages_count: stages?.length || 0,
        custom_fields_count: custom_fields?.length || 0,
        cadence_configs_count: cadence_configs?.length || 0,
        has_outcome_reasons: !!outcome_reasons,
        has_qualification_rules: !!qualification_rules,
        qualification_rules_format: qualification_rules,
        outcome_reasons_format: outcome_reasons,
        user_email: user?.email || '[AUSENTE]',
        user_tenant_id: user?.tenant_id || '[AUSENTE]',
        user_role: user?.role || '[AUSENTE]'
      });
      
      // ✅ CONTROLE DE PERMISSÕES: Apenas admin pode criar pipelines
      if (!user?.tenant_id) {
        return res.status(400).json({ 
          error: 'Usuário deve pertencer a uma empresa' 
        });
      }
      
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({ 
          error: 'Apenas administradores podem criar pipelines' 
        });
      }

      if (!name || !tenant_id || !created_by) {
        return res.status(400).json({ 
          error: 'Nome, tenant_id e created_by são obrigatórios' 
        });
      }

      // ✅ VALIDAR NOME ANTES DE INICIAR TRANSAÇÃO
      console.log('🔍 [createPipelineWithStagesAndFields] Validando nome...');
      const validation = await PipelineService.validatePipelineName(name, tenant_id);
      
      if (!validation.is_valid) {
        console.error('❌ [createPipelineWithStagesAndFields] Nome inválido:', validation.error);
        return res.status(409).json({
          error: 'Nome já existe',
          details: validation.error,
          suggestion: validation.suggestion
        });
      }

      // Iniciar transação
      const { data: pipeline, error: pipelineError } = await supabaseAdmin
        .from('pipelines')
        .insert({
          name,
          description,
          tenant_id,
          created_by,
          outcome_reasons // ✅ NOVO: Incluir motivos como JSONB
        })
        .select()
        .single();

      if (pipelineError) {
        // ✅ TRATAR ERRO DE CONSTRAINT ÚNICO
        if (pipelineError.code === '23505' && 
            pipelineError.message.includes('idx_pipelines_unique_name_per_tenant')) {
          return res.status(409).json({
            error: 'Nome já existe',
            details: `Pipeline com nome "${name}" já existe nesta empresa`
          });
        }
        throw pipelineError;
      }

      const pipelineId = pipeline.id;

      // Adicionar membros se fornecidos
      if (member_ids.length > 0) {
        const memberInserts = member_ids.map((member_id: string) => ({
          pipeline_id: pipelineId,
          member_id,
          tenant_id: tenant_id // ✅ BUGFIX: Adicionar tenant_id obrigatório
        }));

        const { error: membersError } = await supabaseAdmin
          .from('pipeline_members')
          .insert(memberInserts);

        if (membersError) {
          console.error('Erro ao adicionar membros:', membersError);
        }
      }

      // Criar etapas se fornecidas
      if (stages.length > 0) {
        const stageInserts = stages.map((stage: any, index: number) => ({
          pipeline_id: pipelineId,
          name: stage.name,
          color: stage.color,
          order_index: stage.order_index !== undefined ? stage.order_index : index,
          tenant_id: tenant_id // ✅ BUGFIX: Adicionar tenant_id obrigatório
        }));

        const { error: stagesError } = await supabaseAdmin
          .from('pipeline_stages')
          .insert(stageInserts);

        if (stagesError) {
          console.error('Erro ao criar etapas:', stagesError);
          throw stagesError;
        }
      }

      // Criar campos customizados se fornecidos
      if (custom_fields.length > 0) {
        const fieldInserts = custom_fields.map((field: any) => ({
          pipeline_id: pipelineId,
          field_name: field.field_name,
          field_label: field.field_label,
          field_type: field.field_type,
          field_options: field.field_options,
          is_required: field.is_required,
          field_order: field.field_order,
          placeholder: field.placeholder,
          show_in_card: field.show_in_card ?? false,
          tenant_id: tenant_id // ✅ BUGFIX: Adicionar tenant_id obrigatório
        }));

        const { error: fieldsError } = await supabaseAdmin
          .from('pipeline_custom_fields')
          .insert(fieldInserts);

        if (fieldsError) {
          console.error('Erro ao criar campos customizados:', fieldsError);
          throw fieldsError;
        }
      }

      // ✅ BUGFIX CRÍTICO: Garantir criação das etapas do sistema
      console.log('🔄 [createPipelineWithStagesAndFields] Criando etapas do sistema...');
      const { error: ensureStagesError } = await supabaseAdmin.rpc('ensure_pipeline_stages', {
        pipeline_id_param: pipelineId
      });

      if (ensureStagesError) {
        console.error('❌ [createPipelineWithStagesAndFields] Erro ao criar etapas do sistema:', ensureStagesError);
        // Não falhar completamente, mas registrar o erro
      } else {
        console.log('✅ [createPipelineWithStagesAndFields] Etapas do sistema criadas');
      }

      // ✅ BUGFIX: Salvar configurações de cadência se fornecidas
      if (cadence_configs.length > 0) {
        console.log('🔄 [createPipelineWithStagesAndFields] Salvando configurações de cadência...');
        try {
          const cadenceResult = await CadenceService.saveCadenceConfig(
            pipelineId,
            cadence_configs.map((config: any) => ({
              ...config,
              pipeline_id: pipelineId,
              tenant_id: tenant_id
            })),
            tenant_id,
            created_by
          );

          if (cadenceResult.success) {
            console.log('✅ [createPipelineWithStagesAndFields] Cadências salvas:', cadenceResult.message);
          } else {
            console.error('⚠️ [createPipelineWithStagesAndFields] Erro ao salvar cadências:', cadenceResult.message);
          }
        } catch (cadenceError) {
          console.error('❌ [createPipelineWithStagesAndFields] Erro ao salvar cadências:', cadenceError);
          // Não falhar completamente, mas registrar o erro
        }
      }

      // Buscar pipeline completa com relacionamentos
      const completePipeline = await PipelineService.getPipelineById(pipelineId);

      res.status(201).json({ 
        message: `Pipeline criada com sucesso com etapas, campos${cadence_configs.length > 0 ? ' e cadências' : ''} configurados`,
        success: true, // ✅ ADICIONAR CAMPO SUCCESS PARA COMPATIBILIDADE
        pipeline: completePipeline
      });

    } catch (error) {
      console.error('Erro ao criar pipeline completa:', error);
      
      // ✅ TRATAR ERROS DE VALIDAÇÃO DE FORMA AMIGÁVEL
      if (error instanceof Error && error.message.includes('Já existe uma pipeline')) {
        return res.status(409).json({ 
          error: 'Nome já existe',
          details: error.message
        });
      }

      res.status(500).json({ 
        error: 'Erro ao criar pipeline completa',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  static async updatePipeline(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, qualification_rules, cadence_configs, outcome_reasons, member_ids, stages } = req.body;
      const user = (req as any).user;

      // ✅ VALIDAÇÃO: Verificar autenticação
      if (!user?.tenant_id) {
        console.error('❌ [updatePipeline] Usuário sem tenant_id:', { user });
        return res.status(400).json({ 
          error: 'Usuário deve pertencer a uma empresa' 
        });
      }

      // ✅ VALIDAÇÃO: Verificar permissões de role
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        console.warn('⚠️ [updatePipeline] Usuário sem permissão:', {
          user_id: user.id,
          role: user.role,
          pipeline_id: id
        });
        return res.status(403).json({ 
          error: 'Apenas administradores podem editar pipelines' 
        });
      }

      console.log('✏️ [updatePipeline] Editando pipeline:', {
        pipeline_id: id,
        tenant_id: user.tenant_id,
        user_id: user.id,
        user_email: user.email,
        updates: { 
          name, 
          description,
          hasQualificationRules: !!qualification_rules,
          hasCadenceConfigs: !!cadence_configs?.length,
          hasOutcomeReasons: !!outcome_reasons?.length,
          hasStages: !!stages?.length,
          stagesCount: stages?.length || 0
        }
      });

      // ✅ VALIDAÇÃO: Verificar se pipeline existe e pertence ao tenant
      const { data: existingPipeline, error: fetchError } = await supabaseAdmin
        .from('pipelines')
        .select('id, name, tenant_id, is_active')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('❌ [updatePipeline] Erro ao buscar pipeline:', fetchError);
        return res.status(404).json({
          error: 'Pipeline não encontrada',
          details: fetchError.message
        });
      }

      // ✅ VALIDAÇÃO: Verificar isolation de tenant (exceto super_admin)
      if (user.role !== 'super_admin' && existingPipeline.tenant_id !== user.tenant_id) {
        console.warn('🚫 [updatePipeline] Tentativa de acesso cross-tenant:', {
          user_tenant: user.tenant_id,
          pipeline_tenant: existingPipeline.tenant_id,
          pipeline_id: id,
          user_email: user.email
        });
        return res.status(403).json({
          error: 'Você não tem permissão para editar esta pipeline'
        });
      }

      // ✅ VALIDAÇÃO: Verificar se nome não está duplicado (se foi alterado)
      if (name && name !== existingPipeline.name) {
        const validation = await PipelineService.validatePipelineName(
          name,
          user.tenant_id,
          id // Excluir pipeline atual da validação
        );
        
        if (!validation.is_valid) {
          console.error('❌ [updatePipeline] Nome duplicado:', {
            pipeline_id: id,
            new_name: name,
            old_name: existingPipeline.name,
            error: validation.error
          });
          return res.status(409).json({
            error: 'Nome já existe',
            details: validation.error,
            suggestion: validation.suggestion
          });
        }
      }

      console.log('🔄 [updatePipeline] Atualizando pipeline...');

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (qualification_rules !== undefined) updateData.qualification_rules = qualification_rules;
      if (cadence_configs !== undefined) updateData.cadence_configs = cadence_configs;
      if (outcome_reasons !== undefined) updateData.outcome_reasons = outcome_reasons;
      if (stages !== undefined) updateData.stages = stages;

      const pipeline = await PipelineService.updatePipeline(id, updateData);

      // ✅ CORREÇÃO: Processar member_ids se fornecido
      if (member_ids !== undefined) {
        console.log('🔄 [BACKEND-MEMBER-TRACKING] Recebendo member_ids do frontend:', {
          pipeline_id: id.substring(0, 8),
          member_ids,
          member_ids_type: typeof member_ids,
          member_ids_count: member_ids?.length || 0,
          member_ids_isArray: Array.isArray(member_ids),
          member_ids_sample: member_ids?.slice(0, 3)?.map((id: string) => id.substring(0, 8)) || [],
          request_body_keys: Object.keys(req.body),
          timestamp: new Date().toISOString(),
          user_email: user.email,
          tenant_id: user.tenant_id?.substring(0, 8)
        });

        try {
          // Remover associações existentes
          const { error: deleteError } = await supabaseAdmin
            .from('pipeline_members')
            .delete()
            .eq('pipeline_id', id);

          if (deleteError) {
            console.warn('⚠️ [updatePipeline] Aviso ao remover membros existentes:', deleteError);
          } else {
            console.log('✅ [updatePipeline] Membros existentes removidos');
          }

          // Adicionar novas associações se houver member_ids
          if (member_ids && member_ids.length > 0) {
            const memberInserts = member_ids.map((member_id: string) => ({
              pipeline_id: id,
              member_id,
              tenant_id: user.tenant_id, // ✅ CORREÇÃO: Adicionar tenant_id obrigatório
              assigned_at: new Date().toISOString()
            }));

            const { error: insertError } = await supabaseAdmin
              .from('pipeline_members')
              .insert(memberInserts);

            if (insertError) {
              console.error('❌ [BACKEND-MEMBER-TRACKING] Erro ao inserir novos membros:', {
                error: insertError,
                member_ids_tentando_inserir: member_ids,
                count: member_ids.length,
                timestamp: new Date().toISOString()
              });
              throw new Error(`Erro ao vincular vendedores: ${insertError.message}`);
            } else {
              console.log('✅ [BACKEND-MEMBER-TRACKING] Novos membros vinculados COM SUCESSO:', {
                member_ids_inseridos: member_ids,
                count_inseridos: member_ids.length,
                member_ids_sample: member_ids.slice(0, 3).map((id: string) => id.substring(0, 8)),
                pipeline_id: id.substring(0, 8),
                timestamp: new Date().toISOString()
              });
            }
          }
        } catch (memberError) {
          console.error('❌ [updatePipeline] Erro no processamento de membros:', memberError);
          // Não falhar completamente - pipeline foi atualizada, mas membros podem ter falhado
          return res.json({
            success: true,
            message: 'Pipeline atualizada, mas houve erro ao vincular vendedores',
            pipeline,
            warning: 'Vendedores não foram vinculados devido a erro no processamento'
          });
        }
      }

      console.log('✅ [updatePipeline] Pipeline atualizada com sucesso:', {
        id: pipeline.id,
        name: pipeline.name,
        tenant_id: user.tenant_id,
        members_processed: member_ids !== undefined
      });

      res.json({ 
        success: true,
        message: 'Pipeline atualizada com sucesso',
        pipeline 
      });
    } catch (error) {
      console.error('❌ [updatePipeline] Erro ao atualizar pipeline:', error);
      
      // ✅ TRATAMENTO DE ERROS ESPECÍFICOS
      if (error instanceof Error && error.message.includes('Já existe uma pipeline')) {
        return res.status(409).json({ 
          error: 'Nome já existe',
          details: error.message
        });
      }

      res.status(500).json({ 
        error: 'Erro ao atualizar pipeline',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  static async deletePipeline(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      
      // ✅ CONTROLE DE PERMISSÕES: Apenas admin pode deletar pipelines
      if (!user?.tenant_id) {
        return res.status(400).json({ 
          error: 'Usuário deve pertencer a uma empresa' 
        });
      }
      
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({ 
          error: 'Apenas administradores podem excluir pipelines' 
        });
      }
      
      await PipelineService.deletePipeline(id);

      res.json({ message: 'Pipeline excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir pipeline:', error);
      res.status(500).json({ 
        error: 'Erro ao excluir pipeline',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  static async getPipelinesByMember(req: Request, res: Response) {
    try {
      const { member_id } = req.params;

      if (!member_id) {
        return res.status(400).json({ error: 'member_id é obrigatório' });
      }

      const pipelines = await PipelineService.getPipelinesByMember(member_id);
      res.json({ pipelines });
    } catch (error) {
      console.error('Erro ao buscar pipelines do membro:', error);
      res.status(500).json({ 
        error: 'Erro ao buscar pipelines do membro',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  static async addMember(req: Request, res: Response) {
    try {
      const { id: pipeline_id } = req.params;
      const { member_id } = req.body;

      if (!member_id) {
        return res.status(400).json({ error: 'member_id é obrigatório' });
      }

      const member = await MemberService.addMemberToPipeline(pipeline_id, member_id);

      res.status(201).json({ 
        message: 'Membro adicionado com sucesso',
        member 
      });
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      res.status(500).json({ 
        error: 'Erro ao adicionar membro',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  static async removeMember(req: Request, res: Response) {
    try {
      const { id: pipeline_id, member_id } = req.params;

      await MemberService.removeMemberFromPipeline(pipeline_id, member_id);

      res.json({ message: 'Membro removido com sucesso' });
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      res.status(500).json({ 
        error: 'Erro ao remover membro',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // ✅ NOVA FUNCIONALIDADE: Arquivar pipeline (soft delete)
  static async archivePipeline(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      if (!user?.tenant_id) {
        return res.status(400).json({ 
          error: 'Usuário deve pertencer a uma empresa' 
        });
      }
      
      // ✅ CONTROLE DE PERMISSÕES: Apenas admin pode arquivar pipelines
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({ 
          error: 'Apenas administradores podem arquivar pipelines' 
        });
      }

      console.log('📁 [PipelineController] Arquivando pipeline:', {
        pipeline_id: id,
        tenant_id: user.tenant_id,
        user_email: user.email
      });

      await PipelineService.archivePipeline(id, user.tenant_id);

      console.log('✅ [PipelineController] Pipeline arquivada com sucesso:', id);

      res.json({ 
        success: true,
        message: 'Pipeline arquivada com sucesso' 
      });

    } catch (error) {
      console.error('❌ [PipelineController] Erro ao arquivar pipeline:', error);
      res.status(500).json({ 
        error: 'Erro ao arquivar pipeline',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // ✅ NOVA FUNCIONALIDADE: Desarquivar pipeline
  static async unarchivePipeline(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      // ✅ VALIDAÇÃO: Verificar parâmetros obrigatórios
      if (!id) {
        console.error('❌ [PipelineController] ID da pipeline não fornecido');
        return res.status(400).json({ 
          error: 'ID da pipeline é obrigatório' 
        });
      }

      if (!user?.tenant_id) {
        console.error('❌ [PipelineController] Usuário sem tenant_id:', { user_email: user?.email });
        return res.status(400).json({ 
          error: 'Usuário deve pertencer a uma empresa' 
        });
      }
      
      // ✅ CONTROLE DE PERMISSÕES: Apenas admin pode desarquivar pipelines
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({ 
          error: 'Apenas administradores podem desarquivar pipelines' 
        });
      }

      console.log('📂 [PipelineController] Desarquivando pipeline:', {
        pipeline_id: id,
        tenant_id: user.tenant_id,
        user_email: user.email,
        user_role: user.role,
        timestamp: new Date().toISOString()
      });

      await PipelineService.unarchivePipeline(id, user.tenant_id);

      console.log('✅ [PipelineController] Pipeline desarquivada com sucesso:', {
        pipeline_id: id,
        tenant_id: user.tenant_id,
        user_email: user.email
      });

      res.json({ 
        success: true,
        message: 'Pipeline desarquivada com sucesso' 
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ [PipelineController] Erro ao desarquivar pipeline:', {
        pipeline_id: req.params.id,
        tenant_id: (req as any).user?.tenant_id,
        user_email: (req as any).user?.email,
        error_message: errorMessage,
        error_stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });

      // ✅ TRATAMENTO: Diferentes status codes baseados no tipo de erro
      let statusCode = 500;
      if (errorMessage.includes('não encontrada')) {
        statusCode = 404;
      } else if (errorMessage.includes('não está arquivada')) {
        statusCode = 400;
      } else if (errorMessage.includes('não pertence')) {
        statusCode = 403;
      }

      res.status(statusCode).json({ 
        error: 'Erro ao desarquivar pipeline',
        details: errorMessage
      });
    }
  }

  // ✅ NOVA FUNCIONALIDADE: Listar pipelines arquivadas
  static async getArchivedPipelines(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      if (!user?.tenant_id) {
        return res.status(400).json({ 
          error: 'Usuário deve pertencer a uma empresa' 
        });
      }

      console.log('📋 [PipelineController] Listando pipelines arquivadas:', {
        tenant_id: user.tenant_id,
        user_email: user.email
      });

      const pipelines = await PipelineService.getArchivedPipelines(user.tenant_id);

      console.log('✅ [PipelineController] Pipelines arquivadas encontradas:', pipelines.length);

      res.json({ 
        success: true,
        pipelines 
      });

    } catch (error) {
      console.error('❌ [PipelineController] Erro ao listar pipelines arquivadas:', error);
      res.status(500).json({ 
        error: 'Erro ao listar pipelines arquivadas',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // ✅ NOVA ROTA: Duplicar pipeline
  static async duplicatePipeline(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      if (!user?.tenant_id) {
        return res.status(400).json({ 
          error: 'Usuário deve pertencer a uma empresa' 
        });
      }

      if (!id) {
        return res.status(400).json({ 
          error: 'ID da pipeline é obrigatório' 
        });
      }

      console.log('🔄 [PipelineController] Duplicando pipeline:', {
        pipeline_id: id,
        tenant_id: user.tenant_id,
        user_email: user.email
      });

      const duplicatedPipeline = await PipelineService.duplicatePipeline(id, user.tenant_id, user.id);

      console.log('✅ [PipelineController] Pipeline duplicada:', {
        original_id: id,
        new_id: duplicatedPipeline.id,
        new_name: duplicatedPipeline.name
      });

      res.json({ 
        success: true,
        pipeline: duplicatedPipeline
      });

    } catch (error) {
      console.error('❌ [PipelineController] Erro ao duplicar pipeline:', error);
      res.status(500).json({ 
        error: 'Erro ao duplicar pipeline',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}
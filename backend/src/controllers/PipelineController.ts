import { Request, Response } from 'express';
import { PipelineService } from '../services/pipelineService';
import { MemberService } from '../services/memberService';
import { supabase as supabaseAdmin } from '../config/supabase';

export class PipelineController {
  // ✅ NOVA ROTA: Validar nome de pipeline em tempo real
  static async validatePipelineName(req: Request, res: Response) {
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

      console.log('🔍 [getPipelines] Buscando pipelines para tenant:', {
        tenant_id: user.tenant_id,
        user_id: user.id,
        user_email: user.email,
        user_role: user.role
      });

      const pipelines = await PipelineService.getPipelinesByTenant(user.tenant_id);
      
      console.log('✅ [getPipelines] Pipelines encontradas:', {
        count: pipelines?.length || 0,
        tenant_id: user.tenant_id
      });

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
      const pipeline = await PipelineService.getPipelineById(id);

      if (!pipeline) {
        return res.status(404).json({ error: 'Pipeline não encontrada' });
      }

      res.json({ pipeline });
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
      const { 
        name, 
        description, 
        tenant_id, 
        created_by, 
        member_ids = [], 
        stages = [], 
        custom_fields = [] 
      } = req.body;

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
          created_by
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
          member_id
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
          order_index: stage.order_index !== undefined ? stage.order_index : index
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
          placeholder: field.placeholder
        }));

        const { error: fieldsError } = await supabaseAdmin
          .from('pipeline_custom_fields')
          .insert(fieldInserts);

        if (fieldsError) {
          console.error('Erro ao criar campos customizados:', fieldsError);
          throw fieldsError;
        }
      }

      // Buscar pipeline completa com relacionamentos
      const completePipeline = await PipelineService.getPipelineById(pipelineId);

      res.status(201).json({ 
        message: 'Pipeline criada com sucesso com etapas e campos customizados',
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
      const { name, description } = req.body;

      const pipeline = await PipelineService.updatePipeline(id, { name, description });

      res.json({ 
        message: 'Pipeline atualizada com sucesso',
        pipeline 
      });
    } catch (error) {
      console.error('Erro ao atualizar pipeline:', error);
      res.status(500).json({ 
        error: 'Erro ao atualizar pipeline',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  static async deletePipeline(req: Request, res: Response) {
    try {
      const { id } = req.params;
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
}
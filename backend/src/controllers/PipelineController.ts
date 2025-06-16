import { Request, Response } from 'express';
import { PipelineService } from '../services/pipelineService';
import { MemberService } from '../services/memberService';
import { CustomFieldService } from '../services/customFieldService';
import { supabaseAdmin } from '../index';

export class PipelineController {
  static async getPipelines(req: Request, res: Response) {
    try {
      const { tenant_id } = req.query;

      if (!tenant_id) {
        return res.status(400).json({ error: 'tenant_id é obrigatório' });
      }

      const pipelines = await PipelineService.getPipelinesByTenant(tenant_id as string);
      res.json({ pipelines });
    } catch (error) {
      console.error('Erro ao buscar pipelines:', error);
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
          temperature_score: stage.temperature_score,
          max_days_allowed: stage.max_days_allowed,
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
        pipeline: completePipeline
      });

    } catch (error) {
      console.error('Erro ao criar pipeline completa:', error);
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
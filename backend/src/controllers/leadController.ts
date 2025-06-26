import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export class LeadController {
  // GET /api/pipelines/:pipeline_id/leads - Buscar leads de uma pipeline
  static async getLeadsByPipeline(req: Request, res: Response) {
    try {
      const { pipeline_id } = req.params;

      if (!pipeline_id) {
        return res.status(400).json({ error: 'pipeline_id é obrigatório' });
      }

      // Usar lead_data que é a coluna que existe na tabela
      const { data: leads, error } = await supabase
        .from('pipeline_leads')
        .select('*')
        .eq('pipeline_id', pipeline_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar leads:', error);
        return res.status(500).json({ error: 'Erro ao buscar leads', details: error.message });
      }

      // Renomear lead_data para custom_data no retorno para manter compatibilidade
      const leadsResponse = (leads || []).map(lead => ({
        ...lead,
        custom_data: lead.lead_data
      }));

      res.json({ leads: leadsResponse });
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Função auxiliar para garantir que existe uma etapa inicial ("Lead" ou "Novos Leads") na primeira posição
  static async ensureLeadStage(pipeline_id: string) {
    try {
      // Verificar se já existe uma etapa com order_index = 0
      const { data: firstStage, error: checkError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipeline_id)
        .eq('order_index', 0)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Erro ao verificar primeira etapa:', checkError);
        return null;
      }

      // Se existe uma etapa com order_index = 0, verificar se é "Lead" ou "Novos Leads" (compatibilidade)
      if (firstStage) {
        if (firstStage.name === 'Lead' || firstStage.name === 'Novos Leads') {
          return firstStage.id;
        } else {
          // Existe uma etapa no índice 0, mas não é a etapa inicial padrão
          // Vamos usar essa etapa existente
          return firstStage.id;
        }
      }

      // Se não existe etapa com order_index = 0, verificar se existe "Lead" ou "Novos Leads" em outro índice
      const { data: existingLeadStage, error: existingError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipeline_id)
        .or('name.eq.Lead,name.eq.Novos Leads')
        .single();

      if (existingLeadStage && !existingError) {
        // Existe "Lead" ou "Novos Leads" mas em outro índice, vamos atualizar para order_index = 0
        const { error: updateError } = await supabase
          .from('pipeline_stages')
          .update({ order_index: 0 })
          .eq('id', existingLeadStage.id);

        if (updateError) {
          console.error('Erro ao atualizar ordem da etapa inicial:', updateError);
        }
        
        return existingLeadStage.id;
      }

      // Não existe "Novos Leads", vamos criar uma nova etapa
      const { data: newStage, error: createError } = await supabase
        .from('pipeline_stages')
        .insert({
          pipeline_id: pipeline_id,
          name: 'Novos Leads',
          order_index: 0,
          temperature_score: 25,
          max_days_allowed: 7,
          color: '#3B82F6'
        })
        .select()
        .single();

      if (createError) {
        console.error('Erro ao criar etapa Novos Leads:', createError);
        return null;
      }

      console.log('✅ Etapa "Novos Leads" criada com sucesso:', newStage.id);
      return newStage.id;

    } catch (error) {
      console.error('Erro na função ensureNewLeadsStage:', error);
      return null;
    }
  }

  // Função auxiliar para obter a primeira etapa da pipeline
  static async getFirstStage(pipeline_id: string) {
    try {
      // Primeiro, garantir que existe uma etapa inicial
      let firstStageId = await LeadController.ensureLeadStage(pipeline_id);
      
      if (firstStageId) {
        return firstStageId;
      }

      // Se não conseguiu criar/encontrar "Novos Leads", pegar a primeira etapa disponível
      const { data: firstStage, error } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('pipeline_id', pipeline_id)
        .order('order_index', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        console.error('Erro ao buscar primeira etapa:', error);
        return null;
      }

      return firstStage?.id || null;
    } catch (error) {
      console.error('Erro na função getFirstStage:', error);
      return null;
    }
  }

  // POST /api/pipelines/:pipeline_id/leads - Criar novo lead
  static async createLead(req: Request, res: Response) {
    try {
      const { pipeline_id } = req.params;
      const { stage_id, custom_data, created_by } = req.body;

      if (!pipeline_id) {
        return res.status(400).json({ 
          error: 'pipeline_id é obrigatório' 
        });
      }

      // SEMPRE usar a primeira etapa da pipeline para novos leads
      // Ignorar o stage_id fornecido e garantir que vai para "Novos Leads"
      const firstStageId = await LeadController.getFirstStage(pipeline_id);
      
      if (!firstStageId) {
        return res.status(400).json({ 
          error: 'Pipeline não possui etapas configuradas ou não foi possível criar etapa "Novos Leads"' 
        });
      }

      // Usar lead_data que é a coluna que existe na tabela
      const { data: lead, error } = await supabase
        .from('pipeline_leads')
        .insert({
          pipeline_id,
          stage_id: firstStageId, // SEMPRE usar a primeira etapa
          lead_data: custom_data || {},
          created_by: created_by || null
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar lead:', error);
        return res.status(500).json({ error: 'Erro ao criar lead', details: error.message });
      }

      // Renomear lead_data para custom_data no retorno para manter compatibilidade
      const leadResponse = {
        ...lead,
        custom_data: lead.lead_data
      };
      delete leadResponse.lead_data;

      res.status(201).json({ 
        message: 'Lead criado com sucesso na primeira etapa "Novos Leads"',
        lead: leadResponse
      });
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor', 
        details: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    }
  }

  // PUT /api/pipelines/:pipeline_id/leads/:lead_id - Atualizar lead
  static async updateLead(req: Request, res: Response) {
    try {
      const { pipeline_id, lead_id } = req.params;
      const { stage_id, custom_data } = req.body;

      const updateData: any = {};
      if (stage_id) updateData.stage_id = stage_id;
      if (custom_data) updateData.custom_data = custom_data;

      const { data: lead, error } = await supabase
        .from('pipeline_leads')
        .update(updateData)
        .eq('id', lead_id)
        .eq('pipeline_id', pipeline_id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar lead:', error);
        return res.status(500).json({ error: 'Erro ao atualizar lead', details: error.message });
      }

      res.json({ 
        message: 'Lead atualizado com sucesso',
        lead 
      });
    } catch (error) {
      console.error('Erro ao atualizar lead:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // DELETE /api/pipelines/:pipeline_id/leads/:lead_id - Excluir lead
  static async deleteLead(req: Request, res: Response) {
    try {
      const { pipeline_id, lead_id } = req.params;

      const { error } = await supabase
        .from('pipeline_leads')
        .delete()
        .eq('id', lead_id)
        .eq('pipeline_id', pipeline_id);

      if (error) {
        console.error('Erro ao excluir lead:', error);
        return res.status(500).json({ error: 'Erro ao excluir lead', details: error.message });
      }

      res.json({ message: 'Lead excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir lead:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Função para garantir que a tabela existe
  static async ensureLeadsTableExists() {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS pipeline_leads (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
            stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
            custom_data JSONB NOT NULL DEFAULT '{}',
            created_by UUID REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_pipeline_leads_pipeline_id ON pipeline_leads(pipeline_id);
          CREATE INDEX IF NOT EXISTS idx_pipeline_leads_stage_id ON pipeline_leads(stage_id);
          CREATE INDEX IF NOT EXISTS idx_pipeline_leads_created_by ON pipeline_leads(created_by);
        `
      });

      if (error) {
        console.log('⚠️ Não foi possível criar tabela via RPC:', error.message);
        // Tentar criar via SQL direto
        const { error: directError } = await supabase
          .from('pipeline_leads')
          .select('id')
          .limit(1);
        
        if (directError && directError.message.includes('does not exist')) {
          console.log('❌ Tabela pipeline_leads não existe e não pode ser criada automaticamente');
          return false;
        }
      }
      return true;
    } catch (error) {
      console.log('❌ Erro ao verificar/criar tabela:', error);
      return false;
    }
  }
}
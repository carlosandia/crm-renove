import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { LeadDistributionService, CreateLeadPayload } from '../services/leadDistributionService';

export class LeadController {
  // GET /api/pipelines/:pipeline_id/leads - Buscar leads de uma pipeline
  static async getLeadsByPipeline(req: Request, res: Response) {
    try {
      const { pipeline_id } = req.params;
      const { tenant_id, start_date, end_date } = req.query;
      
      console.log('🔍 [getLeadsByPipeline] Buscando leads:', {
        pipeline_id,
        tenant_id,
        start_date,
        end_date,
        query: req.query
      });

      if (!pipeline_id) {
        console.warn('⚠️ [getLeadsByPipeline] pipeline_id não fornecido');
        return res.status(400).json({ error: 'pipeline_id é obrigatório' });
      }

      // ✅ Query com JOIN para pegar dados do leads_master
      let query = supabase
        .from('pipeline_leads')
        .select(`
          *,
          leads_master:lead_master_id(
            id,
            first_name,
            last_name,
            email,
            phone,
            company,
            estimated_value
          )
        `)
        .eq('pipeline_id', pipeline_id)
        .order('created_at', { ascending: false });
      
      if (tenant_id) {
        query = query.eq('tenant_id', tenant_id);
      }

      // ✅ FILTRO POR PERÍODO: Aplicar filtros de data se fornecidos
      if (start_date && end_date) {
        console.log('🗓️ [getLeadsByPipeline] Aplicando filtro de período:', { start_date, end_date });
        
        // Converter datas para formato ISO com hora para garantir comparação correta
        const startDateTime = `${start_date}T00:00:00.000Z`;
        const endDateTime = `${end_date}T23:59:59.999Z`;
        
        query = query
          .gte('created_at', startDateTime)
          .lte('created_at', endDateTime);
      }
      
      const { data: leads, error } = await query;

      if (error) {
        console.error('❌ [getLeadsByPipeline] Erro ao buscar leads:', error);
        return res.status(500).json({ error: 'Erro ao buscar leads', details: error.message });
      }

      console.log('📋 [getLeadsByPipeline] Leads encontrados:', {
        pipeline_id,
        total: leads?.length || 0,
        leads: leads?.map(l => ({
          id: l.id.substring(0, 8),
          stage_id: l.stage_id,
          has_custom_data: !!l.custom_data,
          has_lead_data: !!l.lead_data,
          has_leads_master: !!l.leads_master,
          lead_name: l.leads_master ? `${l.leads_master.first_name} ${l.leads_master.last_name}`.trim() : 'N/A'
        })) || []
      });

      // ✅ CORREÇÃO: Combinar dados do pipeline_leads e leads_master
      const leadsResponse = (leads || []).map(lead => ({
        ...lead,
        custom_data: lead.custom_data || lead.lead_data || {},
        // ✅ INCLUIR: Dados do leads_master diretamente no lead para evitar hook adicional
        first_name: lead.leads_master?.first_name || lead.custom_data?.nome_lead?.split(' ')[0] || '',
        last_name: lead.leads_master?.last_name || lead.custom_data?.nome_lead?.split(' ').slice(1).join(' ') || '',
        email: lead.leads_master?.email || lead.custom_data?.email || '',
        phone: lead.leads_master?.phone || lead.custom_data?.telefone || '',
        company: lead.leads_master?.company || lead.custom_data?.empresa || '',
        estimated_value: lead.leads_master?.estimated_value || lead.custom_data?.valor || 0,
        // Manter referência ao leads_master para compatibilidade
        lead_master_data: lead.leads_master
      }));

      console.log('✅ [getLeadsByPipeline] Resposta processada:', {
        pipeline_id,
        leads_count: leadsResponse.length,
        first_lead: leadsResponse[0] ? {
          id: leadsResponse[0].id.substring(0, 8),
          stage_id: leadsResponse[0].stage_id,
          has_custom_data: !!leadsResponse[0].custom_data,
          name: `${leadsResponse[0].first_name} ${leadsResponse[0].last_name}`.trim(),
          email: leadsResponse[0].email
        } : null
      });

      // ✅ CORREÇÃO: Retornar dados diretamente para compatibilidade com frontend
      res.json(leadsResponse);
    } catch (error) {
      console.error('❌ [getLeadsByPipeline] Erro interno:', error);
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

  // POST /api/pipelines/:pipeline_id/leads - Criar novo lead com distribuição automática
  static async createLead(req: Request, res: Response) {
    try {
      const { pipeline_id } = req.params;
      const { stage_id, custom_data, created_by } = req.body;
      const user = (req as any).user;

      if (!pipeline_id) {
        return res.status(400).json({ 
          error: 'pipeline_id é obrigatório' 
        });
      }

      // ✅ INTEGRAÇÃO COM SISTEMA DE DISTRIBUIÇÃO
      // Verificar se temos dados suficientes para usar o LeadDistributionService
      const leadData = custom_data || {};
      
      if (leadData.first_name || leadData.nome_lead || leadData.email) {
        // Temos dados suficientes, usar o sistema de distribuição completo
        console.log('🎯 Usando LeadDistributionService para criar lead com distribuição');
        
        const payload: CreateLeadPayload = {
          first_name: leadData.first_name || leadData.nome_lead || 'Lead',
          last_name: leadData.last_name || leadData.sobrenome || '',
          email: leadData.email || leadData.email_lead || '',
          phone: leadData.phone || leadData.telefone || '',
          company: leadData.company || leadData.empresa || '',
          pipeline_id,
          created_via: 'manual', // Criado via API manual
          created_by,
          additional_fields: leadData
        };

        try {
          const distributedLead = await LeadDistributionService.createLead(payload);
          
          // Formatar resposta para manter compatibilidade
          const leadResponse = {
            ...distributedLead,
            custom_data: distributedLead.custom_data || distributedLead.lead_data
          };
          
          // Remover lead_data se existir para evitar duplicação
          if (leadResponse.lead_data) {
            delete leadResponse.lead_data;
          }

          return res.status(201).json({ 
            message: 'Lead criado com sucesso e distribuído automaticamente',
            lead: leadResponse,
            distributed: true,
            assigned_to: distributedLead.assigned_to
          });
        } catch (distributionError) {
          console.warn('⚠️ Erro na distribuição, usando método tradicional:', distributionError);
          // Fallback para método tradicional se distribuição falhar
        }
      }

      // ✅ FALLBACK: Método tradicional (compatibilidade)
      console.log('📝 Usando método tradicional para criar lead');
      
      // SEMPRE usar a primeira etapa da pipeline para novos leads
      const firstStageId = await LeadController.getFirstStage(pipeline_id);
      
      if (!firstStageId) {
        return res.status(400).json({ 
          error: 'Pipeline não possui etapas configuradas ou não foi possível criar etapa "Novos Leads"' 
        });
      }

      // AIDEV-NOTE: Usar custom_data que é a coluna correta na tabela pipeline_leads
      const { data: lead, error } = await supabase
        .from('pipeline_leads')
        .insert({
          pipeline_id,
          stage_id: firstStageId, // SEMPRE usar a primeira etapa
          custom_data: custom_data || {},
          created_by: created_by || null,
          tenant_id: user?.tenant_id || null
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar lead:', error);
        return res.status(500).json({ error: 'Erro ao criar lead', details: error.message });
      }

      // AIDEV-NOTE: Compatibilidade com ambas as colunas
      const leadResponse = {
        ...lead,
        custom_data: lead.custom_data || lead.lead_data || {}
      };
      // Limpar dados desnecessários
      if (leadResponse.lead_data) {
        delete leadResponse.lead_data;
      }

      res.status(201).json({ 
        message: 'Lead criado com sucesso na primeira etapa "Novos Leads"',
        lead: leadResponse,
        distributed: false
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
      const { stage_id, custom_data, position } = req.body;

      // 🎯 SISTEMA DE POSIÇÕES: Se está movendo para nova stage com posição específica
      if (stage_id && position !== undefined) {
        console.log('🎯 [POSITION] Atualizando lead com posição específica:', {
          leadId: lead_id.substring(0, 8),
          newStageId: stage_id.substring(0, 8),
          position
        });

        // Usar função SQL para mover com posição precisa
        const { error: moveError } = await supabase.rpc('move_lead_to_position', {
          p_lead_id: lead_id,
          p_new_stage_id: stage_id,
          p_new_position: position
        });

        if (moveError) {
          console.error('❌ [POSITION] Erro ao mover lead com posição:', moveError);
          return res.status(500).json({ 
            error: 'Erro ao mover lead para posição específica', 
            details: moveError.message 
          });
        }

        // Buscar lead atualizado para retornar
        const { data: updatedLead, error: fetchError } = await supabase
          .from('pipeline_leads')
          .select()
          .eq('id', lead_id)
          .eq('pipeline_id', pipeline_id)
          .single();

        if (fetchError || !updatedLead) {
          console.error('❌ [POSITION] Erro ao buscar lead atualizado:', fetchError);
          return res.status(500).json({ 
            error: 'Erro ao buscar lead atualizado', 
            details: fetchError?.message 
          });
        }

        res.json({ 
          message: 'Lead movido com posição específica com sucesso',
          lead: updatedLead 
        });
        return;
      }

      // 🚀 LÓGICA ANTIGA: Para outras atualizações (sem posição específica)
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
import { supabase } from '../config/supabase';
import { LeadTasksService } from './leadTasksService';

export interface Lead {
  id: string;
  pipeline_id: string;
  stage_id: string;
  lead_data: { [key: string]: any }; // Dados dos campos customizados
  created_by: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  moved_at: string;
}

export interface CreateLeadData {
  pipeline_id: string;
  stage_id: string;
  lead_data: { [key: string]: any };
  created_by: string;
  assigned_to?: string;
}

export interface UpdateLeadData {
  stage_id?: string;
  lead_data?: { [key: string]: any };
  assigned_to?: string;
  moved_at?: string;
}

export class LeadService {
  static async getLeadsByPipeline(pipelineId: string): Promise<Lead[]> {
    const { data: leads, error } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar leads: ${error.message}`);
    }

    return leads || [];
  }

  static async getLeadsByStage(stageId: string): Promise<Lead[]> {
    const { data: leads, error } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('stage_id', stageId)
      .order('moved_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar leads da etapa: ${error.message}`);
    }

    return leads || [];
  }

  static async getLeadById(id: string): Promise<Lead | null> {
    const { data: lead, error } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Erro ao buscar lead: ${error.message}`);
    }

    return lead;
  }

  static async createLead(data: CreateLeadData): Promise<Lead> {
    const { data: lead, error } = await supabase
      .from('pipeline_leads')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar lead: ${error.message}`);
    }

    return lead;
  }

  static async updateLead(id: string, data: UpdateLeadData): Promise<Lead> {
    const updateData = {
      ...data,
      moved_at: data.stage_id ? new Date().toISOString() : undefined
    };

    const { data: lead, error } = await supabase
      .from('pipeline_leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar lead: ${error.message}`);
    }

    return lead;
  }

  static async deleteLead(id: string): Promise<void> {
    const { error } = await supabase
      .from('pipeline_leads')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir lead: ${error.message}`);
    }
  }

  static async moveLeadToStage(leadId: string, newStageId: string): Promise<Lead> {
    // 🚀 OTIMIZADO - Apenas atualizar o lead, sem gerar tarefas síncronas
    const updatedLead = await this.updateLead(leadId, { 
      stage_id: newStageId,
      moved_at: new Date().toISOString()
    });

    // 🔥 TAREFAS ASSÍNCRONAS - Não aguardar, executar em background
    setImmediate(() => {
      this.generateCadenceTasksForLeadAsync(updatedLead, newStageId)
        .catch(error => {
          console.warn('⚠️ Erro na geração assíncrona de tarefas:', error.message);
        });
    });

    return updatedLead;
  }

  static async getLeadsByMember(memberId: string): Promise<Lead[]> {
    const { data: leads, error } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('assigned_to', memberId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar leads do membro: ${error.message}`);
    }

    return leads || [];
  }

  /**
   * 🚀 NOVA FUNÇÃO - Gerar tarefas de forma completamente assíncrona
   * Não bloqueia o fluxo principal de movimentação
   */
  static async generateCadenceTasksForLeadAsync(lead: Lead, newStageId: string): Promise<number> {
    try {
      console.log('🔄 Iniciando geração assíncrona de tarefas para lead:', lead.id);

      // Buscar informações da etapa e pipeline em paralelo
      const [stageResult, pipelineResult] = await Promise.allSettled([
        supabase
          .from('pipeline_stages')
          .select('name, pipeline_id')
          .eq('id', newStageId)
          .single(),
        
        supabase
          .from('pipelines')
          .select('tenant_id')
          .eq('id', lead.pipeline_id)
          .single()
      ]);

      if (stageResult.status === 'rejected') {
        console.warn('⚠️ Etapa não encontrada:', newStageId);
        return 0;
      }

      if (pipelineResult.status === 'rejected') {
        console.warn('⚠️ Pipeline não encontrada:', lead.pipeline_id);
        return 0;
      }

      const stage = stageResult.value.data;
      const pipeline = pipelineResult.value.data;

      if (!stage || !pipeline) {
        console.warn('⚠️ Dados insuficientes para geração de tarefas');
        return 0;
      }

      // Gerar tarefas usando o serviço
      const tasksGenerated = await LeadTasksService.generateTasksForLeadStageEntry(
        lead.id,
        lead.pipeline_id,
        newStageId,
        stage.name,
        lead.assigned_to,
        pipeline.tenant_id
      );

      if (tasksGenerated > 0) {
        console.log(`✅ ${tasksGenerated} tarefas de cadência geradas assincronamente para lead ${lead.id}`);
      }

      return tasksGenerated;
    } catch (error: any) {
      console.warn('⚠️ Erro na geração assíncrona de tarefas:', error.message);
      return 0;
    }
  }

  /**
   * 🔥 ENDPOINT PÚBLICO - Para chamadas do frontend
   */
  static async generateCadenceTasksForLeadEndpoint(leadId: string, stageId: string): Promise<{ success: boolean; tasksGenerated: number }> {
    try {
      // Buscar o lead
      const lead = await this.getLeadById(leadId);
      if (!lead) {
        return { success: false, tasksGenerated: 0 };
      }

      // Gerar tarefas assincronamente
      const tasksGenerated = await this.generateCadenceTasksForLeadAsync(lead, stageId);
      
      return { success: true, tasksGenerated };
    } catch (error: any) {
      console.error('❌ Erro no endpoint de geração de tarefas:', error.message);
      return { success: false, tasksGenerated: 0 };
    }
  }
} 
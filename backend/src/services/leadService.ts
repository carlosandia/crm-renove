import { supabase } from '../index';

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
    return this.updateLead(leadId, { 
      stage_id: newStageId,
      moved_at: new Date().toISOString()
    });
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
} 
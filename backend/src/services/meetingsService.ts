// =====================================================================================
// SERVICE: Meetings Service
// Autor: Claude (Arquiteto Sênior)
// Descrição: Lógica de negócios para reuniões usando Supabase básico (igual atividades)
// =====================================================================================

import { supabase } from '../config/supabase';
import type {
  CreateMeeting,
  UpdateMeetingOutcome,
  UpdateMeetingData,
  ListMeetingsQuery,
  MeetingWithRelations,
  MeetingMetrics
} from '../shared/schemas/meetings';

export class MeetingsService {

  // ===================================
  // CRUD BÁSICO DE REUNIÕES
  // ===================================

  /**
   * Criar nova reunião
   */
  static async createMeeting(data: CreateMeeting & { tenant_id: string; owner_id: string }): Promise<MeetingWithRelations> {
    try {
      console.log('🔍 [MeetingsService] Criando reunião:', {
        pipeline_lead_id: data.pipeline_lead_id.substring(0, 8),
        tenant_id: data.tenant_id.substring(0, 8),
        title: data.title
      });

      // Inserir reunião na tabela meetings
      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert([{
          tenant_id: data.tenant_id,
          pipeline_lead_id: data.pipeline_lead_id,
          lead_master_id: data.lead_master_id,
          owner_id: data.owner_id,
          title: data.title,
          planned_at: data.planned_at,
          notes: data.notes || null,
          outcome: 'agendada'
        }])
        .select(`
          *,
          owner:users!meetings_owner_id_fkey(first_name, last_name),
          pipeline_lead:pipeline_leads!meetings_pipeline_lead_id_fkey(
            id,
            stage:pipeline_stages!pipeline_leads_stage_id_fkey(
              name,
              pipeline:pipelines!pipeline_stages_pipeline_id_fkey(name)
            )
          ),
          lead_master:leads_master!meetings_lead_master_id_fkey(
            id, first_name, last_name, email, company
          )
        `)
        .single();

      if (error) {
        console.error('❌ [MeetingsService] Erro ao criar reunião:', error);
        throw new Error(`Erro ao criar reunião: ${error.message}`);
      }

      if (!meeting) {
        throw new Error('Nenhuma reunião retornada após criação');
      }

      // Transformar para formato esperado
      const result: MeetingWithRelations = {
        ...meeting,
        owner_name: meeting.owner 
          ? `${meeting.owner.first_name} ${meeting.owner.last_name}`.trim()
          : 'Usuário não encontrado',
        pipeline_lead: meeting.pipeline_lead ? {
          id: meeting.pipeline_lead.id,
          stage_name: meeting.pipeline_lead.stage?.name,
          pipeline_name: meeting.pipeline_lead.stage?.pipeline?.name
        } : undefined,
        lead_master: meeting.lead_master ? {
          id: meeting.lead_master.id,
          first_name: meeting.lead_master.first_name,
          last_name: meeting.lead_master.last_name,
          email: meeting.lead_master.email,
          company: meeting.lead_master.company
        } : undefined
      };

      console.log('✅ [MeetingsService] Reunião criada com sucesso:', {
        id: result.id.substring(0, 8),
        title: result.title
      });

      return result;

    } catch (error: any) {
      console.error('❌ [MeetingsService] Erro inesperado ao criar reunião:', error);
      throw error;
    }
  }

  /**
   * Buscar reuniões de um lead
   */
  static async getLeadMeetings(
    leadId: string,
    tenantId: string,
    filters: Partial<ListMeetingsQuery> = {}
  ): Promise<{ meetings: MeetingWithRelations[]; pagination: any }> {
    try {
      console.log('🔍 [MeetingsService] Buscando reuniões do lead:', {
        leadId: leadId.substring(0, 8),
        tenantId: tenantId.substring(0, 8),
        filters
      });

      let query = supabase
        .from('meetings')
        .select(`
          *,
          owner:users!meetings_owner_id_fkey(first_name, last_name),
          pipeline_lead:pipeline_leads!meetings_pipeline_lead_id_fkey(
            id,
            stage:pipeline_stages!pipeline_leads_stage_id_fkey(
              name,
              pipeline:pipelines!pipeline_stages_pipeline_id_fkey(name)
            )
          ),
          lead_master:leads_master!meetings_lead_master_id_fkey(
            id, first_name, last_name, email, company
          )
        `)
        .eq('tenant_id', tenantId)
        .or(`pipeline_lead_id.eq.${leadId},lead_master_id.eq.${leadId}`)
        .order('planned_at', { ascending: false });

      // Aplicar filtros
      if (filters.outcome) {
        query = query.eq('outcome', filters.outcome);
      }

      if (filters.date_from) {
        query = query.gte('planned_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('planned_at', filters.date_to);
      }

      // Aplicar paginação
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100); // Max 100 por página
      const offset = (page - 1) * limit;

      query = query.range(offset, offset + limit - 1);

      const { data: meetings, error, count } = await query;

      if (error) {
        console.error('❌ [MeetingsService] Erro ao buscar reuniões:', error);
        throw new Error(`Erro ao buscar reuniões: ${error.message}`);
      }

      // Transformar dados para formato esperado
      const transformedMeetings: MeetingWithRelations[] = (meetings || []).map(meeting => ({
        ...meeting,
        owner_name: meeting.owner 
          ? `${meeting.owner.first_name} ${meeting.owner.last_name}`.trim()
          : 'Usuário não encontrado',
        pipeline_lead: meeting.pipeline_lead ? {
          id: meeting.pipeline_lead.id,
          stage_name: meeting.pipeline_lead.stage?.name,
          pipeline_name: meeting.pipeline_lead.stage?.pipeline?.name
        } : undefined,
        lead_master: meeting.lead_master ? {
          id: meeting.lead_master.id,
          first_name: meeting.lead_master.first_name,
          last_name: meeting.lead_master.last_name,
          email: meeting.lead_master.email,
          company: meeting.lead_master.company
        } : undefined
      }));

      const pagination = {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      };

      console.log('✅ [MeetingsService] Reuniões encontradas:', {
        leadId: leadId.substring(0, 8),
        total: transformedMeetings.length,
        pagination
      });

      return {
        meetings: transformedMeetings,
        pagination
      };

    } catch (error: any) {
      console.error('❌ [MeetingsService] Erro inesperado ao buscar reuniões:', error);
      throw error;
    }
  }

  /**
   * Atualizar dados básicos da reunião (título e observações)
   */
  static async updateMeetingData(
    meetingId: string,
    tenantId: string,
    updateData: UpdateMeetingData
  ): Promise<MeetingWithRelations | null> {
    try {
      console.log('🔍 [MeetingsService] Atualizando dados da reunião:', {
        meetingId: meetingId.substring(0, 8),
        tenantId: tenantId.substring(0, 8),
        updateData
      });

      const { data: meeting, error } = await supabase
        .from('meetings')
        .update({
          title: updateData.title,
          notes: updateData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId)
        .eq('tenant_id', tenantId)
        .select(`
          *,
          owner:users!meetings_owner_id_fkey(first_name, last_name),
          pipeline_lead:pipeline_leads!meetings_pipeline_lead_id_fkey(
            id,
            stage:pipeline_stages!pipeline_leads_stage_id_fkey(
              name,
              pipeline:pipelines!pipeline_stages_pipeline_id_fkey(name)
            )
          ),
          lead_master:leads_master!meetings_lead_master_id_fkey(
            id, first_name, last_name, email, company
          )
        `)
        .single();

      if (error) {
        console.error('❌ [MeetingsService] Erro ao atualizar reunião:', error);
        throw new Error(`Erro ao atualizar reunião: ${error.message}`);
      }

      if (!meeting) {
        console.warn('⚠️ [MeetingsService] Reunião não encontrada para atualização');
        return null;
      }

      // Transformar para formato esperado
      const result: MeetingWithRelations = {
        ...meeting,
        owner_name: meeting.owner 
          ? `${meeting.owner.first_name} ${meeting.owner.last_name}`.trim()
          : 'Usuário não encontrado',
        pipeline_lead: meeting.pipeline_lead ? {
          id: meeting.pipeline_lead.id,
          stage_name: meeting.pipeline_lead.stage?.name,
          pipeline_name: meeting.pipeline_lead.stage?.pipeline?.name
        } : undefined,
        lead_master: meeting.lead_master ? {
          id: meeting.lead_master.id,
          first_name: meeting.lead_master.first_name,
          last_name: meeting.lead_master.last_name,
          email: meeting.lead_master.email,
          company: meeting.lead_master.company
        } : undefined
      };

      console.log('✅ [MeetingsService] Reunião atualizada com sucesso:', {
        id: result.id.substring(0, 8),
        title: result.title
      });

      return result;

    } catch (error: any) {
      console.error('❌ [MeetingsService] Erro inesperado ao atualizar reunião:', error);
      throw error;
    }
  }

  /**
   * Atualizar status/outcome da reunião
   */
  static async updateMeetingOutcome(
    meetingId: string,
    tenantId: string,
    outcomeData: UpdateMeetingOutcome
  ): Promise<MeetingWithRelations | null> {
    try {
      console.log('🔍 [MeetingsService] Atualizando outcome da reunião:', {
        meetingId: meetingId.substring(0, 8),
        tenantId: tenantId.substring(0, 8),
        outcome: outcomeData.outcome
      });

      const updateFields: any = {
        outcome: outcomeData.outcome,
        updated_at: new Date().toISOString()
      };

      // Adicionar campos específicos baseados no outcome
      if (outcomeData.outcome === 'no_show' && outcomeData.no_show_reason) {
        updateFields.no_show_reason = outcomeData.no_show_reason;
      } else {
        updateFields.no_show_reason = null;
      }

      if (outcomeData.notes) {
        updateFields.notes = outcomeData.notes;
      }

      const { data: meeting, error } = await supabase
        .from('meetings')
        .update(updateFields)
        .eq('id', meetingId)
        .eq('tenant_id', tenantId)
        .select(`
          *,
          owner:users!meetings_owner_id_fkey(first_name, last_name),
          pipeline_lead:pipeline_leads!meetings_pipeline_lead_id_fkey(
            id,
            stage:pipeline_stages!pipeline_leads_stage_id_fkey(
              name,
              pipeline:pipelines!pipeline_stages_pipeline_id_fkey(name)
            )
          ),
          lead_master:leads_master!meetings_lead_master_id_fkey(
            id, first_name, last_name, email, company
          )
        `)
        .single();

      if (error) {
        console.error('❌ [MeetingsService] Erro ao atualizar outcome:', error);
        throw new Error(`Erro ao atualizar status da reunião: ${error.message}`);
      }

      if (!meeting) {
        console.warn('⚠️ [MeetingsService] Reunião não encontrada para atualização de status');
        return null;
      }

      // Transformar para formato esperado
      const result: MeetingWithRelations = {
        ...meeting,
        owner_name: meeting.owner 
          ? `${meeting.owner.first_name} ${meeting.owner.last_name}`.trim()
          : 'Usuário não encontrado',
        pipeline_lead: meeting.pipeline_lead ? {
          id: meeting.pipeline_lead.id,
          stage_name: meeting.pipeline_lead.stage?.name,
          pipeline_name: meeting.pipeline_lead.stage?.pipeline?.name
        } : undefined,
        lead_master: meeting.lead_master ? {
          id: meeting.lead_master.id,
          first_name: meeting.lead_master.first_name,
          last_name: meeting.lead_master.last_name,
          email: meeting.lead_master.email,
          company: meeting.lead_master.company
        } : undefined
      };

      console.log('✅ [MeetingsService] Status atualizado com sucesso:', {
        id: result.id.substring(0, 8),
        outcome: result.outcome
      });

      return result;

    } catch (error: any) {
      console.error('❌ [MeetingsService] Erro inesperado ao atualizar status:', error);
      throw error;
    }
  }

  /**
   * Excluir reunião
   */
  static async deleteMeeting(meetingId: string, tenantId: string): Promise<boolean> {
    try {
      console.log('🗑️ [MeetingsService] Excluindo reunião:', {
        meetingId: meetingId.substring(0, 8),
        tenantId: tenantId.substring(0, 8)
      });

      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('❌ [MeetingsService] Erro ao excluir reunião:', error);
        throw new Error(`Erro ao excluir reunião: ${error.message}`);
      }

      console.log('✅ [MeetingsService] Reunião excluída com sucesso:', {
        meetingId: meetingId.substring(0, 8)
      });

      return true;

    } catch (error: any) {
      console.error('❌ [MeetingsService] Erro inesperado ao excluir reunião:', error);
      throw error;
    }
  }

  // ===================================
  // MÉTRICAS E RELATÓRIOS
  // ===================================

  /**
   * Buscar métricas de reuniões para relatórios
   */
  static async getMeetingMetrics(
    tenantId: string,
    filters: {
      pipeline_id?: string;
      date_from?: string;
      date_to?: string;
      group_by?: 'day' | 'week' | 'month';
      seller_id?: string;
    } = {}
  ): Promise<{
    individual_pipelines: MeetingMetrics[];
    aggregated: MeetingMetrics | null;
  }> {
    try {
      console.log('📊 [MeetingsService] Calculando métricas:', {
        tenantId: tenantId.substring(0, 8),
        filters
      });

      // Query base para reuniões - CORRIGIDO: usar relacionamento real via stage
      let query = supabase
        .from('meetings')
        .select(`
          id,
          pipeline_lead_id,
          outcome,
          planned_at,
          pipeline_lead:pipeline_leads!meetings_pipeline_lead_id_fkey(
            id,
            stage:pipeline_stages!pipeline_leads_stage_id_fkey(
              id,
              pipeline_id,
              pipeline:pipelines!pipeline_stages_pipeline_id_fkey(id, name)
            )
          )
        `)
        .eq('tenant_id', tenantId);

      // Aplicar filtros - CORRIGIDO: usar caminho correto via stage
      if (filters.pipeline_id) {
        query = query.eq('pipeline_lead.stage.pipeline_id', filters.pipeline_id);
      }

      if (filters.date_from) {
        query = query.gte('planned_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('planned_at', filters.date_to);
      }

      if (filters.seller_id) {
        query = query.eq('owner_id', filters.seller_id);
      }

      const { data: meetings, error } = await query;

      if (error) {
        console.error('❌ [MeetingsService] Erro ao buscar dados para métricas:', error);
        throw new Error(`Erro ao calcular métricas: ${error.message}`);
      }

      // Agrupar por pipeline e calcular métricas
      const pipelineGroups = new Map<string, {
        pipeline_id: string;
        pipeline_name: string;
        meetings: any[];
      }>();

      meetings?.forEach(meeting => {
        const pipelineId = meeting.pipeline_lead?.stage?.pipeline?.id;
        const pipelineName = meeting.pipeline_lead?.stage?.pipeline?.name;

        if (pipelineId) {
          if (!pipelineGroups.has(pipelineId)) {
            pipelineGroups.set(pipelineId, {
              pipeline_id: pipelineId,
              pipeline_name: pipelineName || 'Pipeline sem nome',
              meetings: []
            });
          }
          pipelineGroups.get(pipelineId)!.meetings.push(meeting);
        } else {
          // AIDEV-NOTE: Fallback para reuniões sem pipeline associado
          const fallbackId = 'no-pipeline';
          if (!pipelineGroups.has(fallbackId)) {
            pipelineGroups.set(fallbackId, {
              pipeline_id: fallbackId,
              pipeline_name: 'Reuniões sem pipeline',
              meetings: []
            });
          }
          pipelineGroups.get(fallbackId)!.meetings.push(meeting);
        }
      });

      // Calcular métricas por pipeline
      const individualPipelines: MeetingMetrics[] = Array.from(pipelineGroups.values()).map(group => {
        const metrics = this.calculateMetricsForMeetings(group.meetings);
        return {
          pipeline_id: group.pipeline_id,
          tenant_id: tenantId,
          ...metrics
        };
      });

      // Calcular métricas agregadas
      const allMeetings = meetings || [];
      const aggregatedMetrics = allMeetings.length > 0 ? {
        pipeline_id: '', // Agregado não tem pipeline específico
        tenant_id: tenantId,
        ...this.calculateMetricsForMeetings(allMeetings)
      } : null;

      console.log('✅ [MeetingsService] Métricas calculadas:', {
        tenantId: tenantId.substring(0, 8),
        totalMeetings: allMeetings.length,
        pipelinesCount: individualPipelines.length
      });

      return {
        individual_pipelines: individualPipelines,
        aggregated: aggregatedMetrics
      };

    } catch (error: any) {
      console.error('❌ [MeetingsService] Erro inesperado ao calcular métricas:', error);
      throw error;
    }
  }

  /**
   * Calcular métricas para um conjunto de reuniões
   */
  private static calculateMetricsForMeetings(meetings: any[]): Omit<MeetingMetrics, 'pipeline_id' | 'tenant_id'> {
    const total = meetings.length;
    const scheduled = meetings.filter(m => m.outcome === 'agendada').length;
    const attended = meetings.filter(m => m.outcome === 'realizada').length;
    const noShow = meetings.filter(m => m.outcome === 'no_show').length;
    const rescheduled = meetings.filter(m => m.outcome === 'reagendada').length;
    const canceled = meetings.filter(m => m.outcome === 'cancelada').length;

    const noShowRate = total > 0 ? (noShow / total) * 100 : 0;
    const attendRate = total > 0 ? (attended / total) * 100 : 0;

    return {
      total_meetings: total,
      scheduled_count: scheduled,
      attended_count: attended,
      no_show_count: noShow,
      rescheduled_count: rescheduled,
      canceled_count: canceled,
      no_show_rate: Math.round(noShowRate * 100) / 100, // 2 casas decimais
      attend_rate: Math.round(attendRate * 100) / 100 // 2 casas decimais
    };
  }
}

export default MeetingsService;
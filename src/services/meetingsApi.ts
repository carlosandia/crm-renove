// =====================================================================================
// SERVICES: API de Reuniões (Refatorado - Autenticação Supabase Básica)
// Autor: Claude (Arquiteto Sênior)
// Descrição: Serviços para consumir API de reuniões - SEM JWT, usando padrão das atividades
// =====================================================================================

import { api } from '../lib/api';
import type {
  Meeting,
  CreateMeeting,
  UpdateMeetingOutcome,
  UpdateMeetingData,
  ListMeetingsQuery,
  MeetingMetricsQuery,
  MeetingWithRelations,
  MeetingMetrics
} from '../shared/schemas/meetings';

// AIDEV-NOTE: Interfaces para responses da API
interface CreateMeetingResponse {
  success: boolean;
  data: MeetingWithRelations;
}

interface UpdateMeetingResponse {
  success: boolean;
  data: MeetingWithRelations;
}

interface UpdateMeetingDataResponse {
  success: boolean;
  data: MeetingWithRelations;
}

interface ListMeetingsResponse {
  success: boolean;
  data: MeetingWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface MeetingMetricsResponse {
  success: boolean;
  data: {
    individual_pipelines: MeetingMetrics[];
    aggregated: MeetingMetrics | null;
  };
}

interface DeleteMeetingResponse {
  success: boolean;
  message: string;
}

// AIDEV-NOTE: Classe principal para gerenciar reuniões
export class MeetingsAPI {
  
  /**
   * Criar nova reunião
   */
  static async createMeeting(meetingData: CreateMeeting): Promise<MeetingWithRelations> {
    try {
      console.log('🔍 [MeetingsAPI] Criando reunião:', { meetingData });
      
      const response = await api.post<CreateMeetingResponse>('/meetings', meetingData);
      
      console.log('✅ [MeetingsAPI] Response de criação recebida:', { 
        status: response.status, 
        success: response.data?.success,
        hasData: !!response.data?.data
      });
      
      if (!response.data.success) {
        throw new Error('Falha ao criar reunião');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('❌ [MeetingsAPI] Erro ao criar reunião:', error);
      console.error('❌ [MeetingsAPI] Status:', error.response?.status);
      console.error('❌ [MeetingsAPI] Response data:', error.response?.data);
      
      throw new Error(error.response?.data?.error || 'Erro ao criar reunião');
    }
  }

  /**
   * Atualizar outcome da reunião
   */
  static async updateMeetingOutcome(
    meetingId: string, 
    outcomeData: UpdateMeetingOutcome
  ): Promise<MeetingWithRelations> {
    try {
      const response = await api.patch<UpdateMeetingResponse>(
        `/meetings/${meetingId}/outcome`, 
        outcomeData
      );
      
      if (!response.data.success) {
        throw new Error('Falha ao atualizar reunião');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('❌ [MeetingsAPI] Erro ao atualizar outcome:', error);
      throw new Error(error.response?.data?.error || 'Erro ao atualizar reunião');
    }
  }

  /**
   * Atualizar dados básicos da reunião (título e observações)
   */
  static async updateMeeting(
    meetingId: string, 
    updateData: UpdateMeetingData
  ): Promise<MeetingWithRelations> {
    try {
      console.log('🔍 [MeetingsAPI] Atualizando dados da reunião:', { meetingId, updateData });
      
      const response = await api.put<UpdateMeetingDataResponse>(
        `/meetings/${meetingId}`, 
        updateData
      );
      
      console.log('✅ [MeetingsAPI] Reunião atualizada:', { 
        status: response.status, 
        success: response.data?.success 
      });
      
      if (!response.data.success) {
        throw new Error('Falha ao atualizar dados da reunião');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('❌ [MeetingsAPI] Erro ao atualizar dados da reunião:', error);
      console.error('❌ [MeetingsAPI] Status:', error.response?.status);
      console.error('❌ [MeetingsAPI] Response data:', error.response?.data);
      
      throw new Error(error.response?.data?.error || 'Erro ao atualizar dados da reunião');
    }
  }

  /**
   * Listar reuniões de um lead (pipeline_lead_id ou lead_master_id)
   */
  static async getLeadMeetings(
    leadId: string, 
    query?: Partial<ListMeetingsQuery>
  ): Promise<{ meetings: MeetingWithRelations[]; pagination: any }> {
    try {
      console.log('🔍 [MeetingsAPI] Buscando reuniões para lead:', { leadId, query });
      
      const params = new URLSearchParams();
      if (query?.outcome) params.append('outcome', query.outcome);
      if (query?.date_from) params.append('date_from', query.date_from);
      if (query?.date_to) params.append('date_to', query.date_to);
      if (query?.page) params.append('page', query.page.toString());
      if (query?.limit) params.append('limit', query.limit.toString());

      const queryString = params.toString();
      const url = `/meetings/lead/${leadId}${queryString ? `?${queryString}` : ''}`;
      
      console.log('🔍 [MeetingsAPI] Fazendo chamada para:', url);
      const response = await api.get<ListMeetingsResponse>(url);
      
      console.log('✅ [MeetingsAPI] Response recebida:', { 
        status: response.status, 
        success: response.data?.success,
        hasData: !!response.data?.data,
        hasPagination: !!response.data?.pagination
      });
      
      if (!response.data.success) {
        throw new Error('Falha ao buscar reuniões');
      }
      
      return {
        meetings: response.data.data || [],
        pagination: response.data.pagination || { page: 1, limit: 20, total: 0, pages: 0 }
      };
    } catch (error: any) {
      console.error('❌ [MeetingsAPI] Erro ao buscar reuniões:', error);
      console.error('❌ [MeetingsAPI] Status:', error.response?.status);
      console.error('❌ [MeetingsAPI] Response data:', error.response?.data);
      
      throw new Error(error.response?.data?.error || 'Erro ao buscar reuniões');
    }
  }

  /**
   * Buscar métricas de reuniões para relatórios
   */
  static async getMeetingMetrics(query?: Partial<MeetingMetricsQuery>): Promise<{
    individualPipelines: MeetingMetrics[];
    aggregated: MeetingMetrics | null;
  }> {
    try {
      console.log('🔍 [MeetingsAPI] Buscando métricas:', { query });
      
      const params = new URLSearchParams();
      if (query?.pipeline_id) params.append('pipeline_id', query.pipeline_id);
      if (query?.date_from) params.append('date_from', query.date_from);
      if (query?.date_to) params.append('date_to', query.date_to);
      if (query?.group_by) params.append('group_by', query.group_by);
      if (query?.seller_id) params.append('seller_id', query.seller_id);

      const queryString = params.toString();
      const url = `/meetings/reports/metrics${queryString ? `?${queryString}` : ''}`;
      
      console.log('🔍 [MeetingsAPI] Fazendo chamada de métricas para:', url);
      const response = await api.get<MeetingMetricsResponse>(url);
      
      console.log('✅ [MeetingsAPI] Response de métricas recebida:', { 
        status: response.status, 
        success: response.data?.success,
        hasData: !!response.data?.data,
        hasAggregated: !!response.data?.data?.aggregated
      });
      
      if (!response.data.success) {
        throw new Error('Falha ao buscar métricas');
      }
      
      return {
        individualPipelines: response.data.data.individual_pipelines || [],
        aggregated: response.data.data.aggregated || null
      };
    } catch (error: any) {
      console.error('❌ [MeetingsAPI] Erro ao buscar métricas:', error);
      console.error('❌ [MeetingsAPI] Status:', error.response?.status);
      console.error('❌ [MeetingsAPI] Response data:', error.response?.data);
      
      throw new Error(error.response?.data?.error || 'Erro ao buscar métricas');
    }
  }

  /**
   * Excluir reunião
   */
  static async deleteMeeting(meetingId: string): Promise<void> {
    try {
      const response = await api.delete<DeleteMeetingResponse>(`/meetings/${meetingId}`);
      
      if (!response.data.success) {
        throw new Error('Falha ao excluir reunião');
      }
    } catch (error: any) {
      console.error('❌ [MeetingsAPI] Erro ao excluir reunião:', error);
      throw new Error(error.response?.data?.error || 'Erro ao excluir reunião');
    }
  }

  /**
   * Registrar no-show da reunião
   */
  static async registerNoShow(meetingId: string, noShowData: any): Promise<MeetingWithRelations> {
    try {
      console.log('🔍 [MeetingsAPI] Registrando no-show:', { meetingId, noShowData });
      
      const response = await api.patch<UpdateMeetingResponse>(
        `/meetings/${meetingId}/no-show`, 
        noShowData
      );
      
      if (!response.data.success) {
        throw new Error('Falha ao registrar no-show');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('❌ [MeetingsAPI] Erro ao registrar no-show:', error);
      throw new Error(error.response?.data?.error || 'Erro ao registrar no-show');
    }
  }

  /**
   * Reagendar reunião
   */
  static async rescheduleMeeting(meetingId: string, rescheduleData: any): Promise<{ original_meeting: MeetingWithRelations; new_meeting: MeetingWithRelations }> {
    try {
      console.log('🔍 [MeetingsAPI] Reagendando reunião:', { meetingId, rescheduleData });
      
      const response = await api.post<{ success: boolean; data: { original_meeting: MeetingWithRelations; new_meeting: MeetingWithRelations } }>(
        `/meetings/${meetingId}/reschedule`, 
        rescheduleData
      );
      
      if (!response.data.success) {
        throw new Error('Falha ao reagendar reunião');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('❌ [MeetingsAPI] Erro ao reagendar reunião:', error);
      throw new Error(error.response?.data?.error || 'Erro ao reagendar reunião');
    }
  }

}

// AIDEV-NOTE: Funções utilitárias para formatação
export const MeetingsUtils = {
  /**
   * Formatar data/hora para exibição
   */
  formatMeetingDateTime(datetime: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(datetime));
  },

  /**
   * Calcular duração desde agendamento
   */
  getTimeSinceScheduled(createdAt: string): string {
    const now = new Date();
    const scheduled = new Date(createdAt);
    const diffMs = now.getTime() - scheduled.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    return `${Math.floor(diffDays / 30)} meses atrás`;
  },

  /**
   * Verificar se reunião está no futuro
   */
  isFutureMeeting(plannedAt: string): boolean {
    return new Date(plannedAt) > new Date();
  },

  /**
   * Verificar se reunião está atrasada
   */
  isOverdue(plannedAt: string, outcome: string): boolean {
    return outcome === 'agendada' && new Date(plannedAt) < new Date();
  }
};

export default MeetingsAPI;
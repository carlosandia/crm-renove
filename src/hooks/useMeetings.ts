// =====================================================================================
// HOOKS: Sistema de Reuniões
// Autor: Claude (Arquiteto Sênior)
// Descrição: Hooks personalizados para gestão de reuniões com TanStack Query
// =====================================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MeetingsAPI, MeetingsUtils } from '../services/meetingsApi';
import { showSuccessToast, showErrorToast } from '../lib/toast';
import type {
  CreateMeeting,
  UpdateMeetingOutcome,
  ListMeetingsQuery,
  MeetingMetricsQuery,
  MeetingWithRelations,
  MeetingMetrics
} from '../shared/schemas/meetings';

// AIDEV-NOTE: Query keys para cache management
export const meetingsQueryKeys = {
  all: ['meetings'] as const,
  lead: (leadId: string) => [...meetingsQueryKeys.all, 'lead', leadId] as const,
  leadWithFilters: (leadId: string, filters?: Partial<ListMeetingsQuery>) => 
    [...meetingsQueryKeys.lead(leadId), filters] as const,
  metrics: (filters?: Partial<MeetingMetricsQuery>) => 
    [...meetingsQueryKeys.all, 'metrics', filters] as const,
};

// =====================================================================================
// Hook: useLeadMeetings - Buscar reuniões de um lead
// =====================================================================================
export function useLeadMeetings(
  leadId: string, 
  query?: Partial<ListMeetingsQuery>
) {
  return useQuery({
    queryKey: meetingsQueryKeys.leadWithFilters(leadId, query),
    queryFn: () => MeetingsAPI.getLeadMeetings(leadId, query),
    enabled: !!leadId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,   // 10 minutos
  });
}

// =====================================================================================
// Hook: useMeetingMetrics - Buscar métricas para relatórios
// =====================================================================================
export function useMeetingMetrics(query?: Partial<MeetingMetricsQuery>) {
  return useQuery({
    queryKey: meetingsQueryKeys.metrics(query),
    queryFn: () => MeetingsAPI.getMeetingMetrics(query),
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000,    // 5 minutos
  });
}

// =====================================================================================
// Hook: useCreateMeeting - Criar nova reunião
// =====================================================================================
export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (meetingData: CreateMeeting) => 
      MeetingsAPI.createMeeting(meetingData),
    
    onSuccess: (newMeeting) => {
      // AIDEV-NOTE: Invalidar cache relacionado
      queryClient.invalidateQueries({
        queryKey: meetingsQueryKeys.lead(newMeeting.pipeline_lead_id!)
      });
      queryClient.invalidateQueries({
        queryKey: meetingsQueryKeys.lead(newMeeting.lead_master_id!)
      });
      queryClient.invalidateQueries({
        queryKey: meetingsQueryKeys.metrics()
      });

      showSuccessToast('Reunião agendada com sucesso!');
    },
    
    onError: (error: Error) => {
      showErrorToast(`Erro ao agendar reunião: ${error.message}`);
    }
  });
}

// =====================================================================================
// Hook: useUpdateMeetingOutcome - Atualizar outcome da reunião
// =====================================================================================
export function useUpdateMeetingOutcome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ meetingId, outcomeData }: {
      meetingId: string;
      outcomeData: UpdateMeetingOutcome;
    }) => MeetingsAPI.updateMeetingOutcome(meetingId, outcomeData),
    
    onSuccess: (updatedMeeting, variables) => {
      // AIDEV-NOTE: Invalidar cache relacionado
      queryClient.invalidateQueries({
        queryKey: meetingsQueryKeys.lead(updatedMeeting.pipeline_lead_id!)
      });
      queryClient.invalidateQueries({
        queryKey: meetingsQueryKeys.lead(updatedMeeting.lead_master_id!)
      });
      queryClient.invalidateQueries({
        queryKey: meetingsQueryKeys.metrics()
      });

      // AIDEV-NOTE: Mensagem de sucesso personalizada por outcome
      const outcomeMessages = {
        realizada: 'Reunião marcada como realizada!',
        no_show: 'No-show registrado com sucesso',
        reagendada: 'Reunião reagendada com sucesso',
        cancelada: 'Reunião cancelada',
        agendada: 'Status da reunião atualizado'
      };
      
      showSuccessToast(outcomeMessages[variables.outcomeData.outcome]);
    },
    
    onError: (error: Error) => {
      showErrorToast(`Erro ao atualizar reunião: ${error.message}`);
    }
  });
}

// =====================================================================================
// Hook: useQuickStatusUpdate - Atualização rápida de status (otimizado)
// =====================================================================================
export function useQuickStatusUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      meetingId, 
      outcome, 
      noShowReason, 
      notes 
    }: {
      meetingId: string;
      outcome: UpdateMeetingOutcome['outcome'];
      noShowReason?: UpdateMeetingOutcome['no_show_reason'];
      notes?: string;
    }) => {
      const outcomeData: UpdateMeetingOutcome = {
        outcome,
        ...(noShowReason && { no_show_reason: noShowReason }),
        ...(notes && { notes })
      };
      
      return MeetingsAPI.updateMeetingOutcome(meetingId, outcomeData);
    },
    
    onSuccess: (updatedMeeting, variables) => {
      // AIDEV-NOTE: Invalidação de cache mais agressiva para UI responsiva
      queryClient.invalidateQueries({
        queryKey: meetingsQueryKeys.all
      });

      // AIDEV-NOTE: Toast discreto para não interferir na UX
      const outcomeLabels = {
        realizada: '✅ Marcada como realizada',
        no_show: '❌ No-show registrado',
        reagendada: '🔄 Reagendada',
        cancelada: '⚫ Cancelada',
        agendada: '📅 Status atualizado'
      };
      
      showSuccessToast(outcomeLabels[variables.outcome]);
    },
    
    onError: (error: Error) => {
      showErrorToast(`Falha ao atualizar status: ${error.message}`);
    }
  });
}

// =====================================================================================
// Hook: useDeleteMeeting - Excluir reunião
// =====================================================================================
export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (meetingId: string) => MeetingsAPI.deleteMeeting(meetingId),
    
    onSuccess: (_, meetingId) => {
      // AIDEV-NOTE: Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({
        queryKey: meetingsQueryKeys.all
      });

      showSuccessToast('Reunião excluída com sucesso!');
    },
    
    onError: (error: Error) => {
      showErrorToast(`Erro ao excluir reunião: ${error.message}`);
    }
  });
}

// =====================================================================================
// Hook: useMeetingStats - Estatísticas agregadas para dashboards
// =====================================================================================
export function useMeetingStats(pipelineId?: string) {
  const { data: metricsData, ...queryProps } = useMeetingMetrics({
    pipeline_id: pipelineId
  });

  // AIDEV-NOTE: Transformar dados para consumo mais fácil no UI
  const stats = metricsData ? {
    // Métricas principais
    totalMeetings: metricsData.aggregated?.total_meetings || 0,
    scheduledCount: metricsData.aggregated?.scheduled_count || 0,
    attendedCount: metricsData.aggregated?.attended_count || 0,
    noShowCount: metricsData.aggregated?.no_show_count || 0,
    
    // Percentuais
    noShowRate: metricsData.aggregated?.no_show_rate || 0,
    attendRate: metricsData.aggregated?.attend_rate || 0,
    
    // Status flags para UI
    hasHighNoShowRate: (metricsData.aggregated?.no_show_rate || 0) > 25,
    hasLowAttendRate: (metricsData.aggregated?.attend_rate || 0) < 60,
    
    // Dados individuais por pipeline
    pipelineBreakdown: metricsData.individualPipelines || []
  } : null;

  return {
    stats,
    ...queryProps
  };
}

// =====================================================================================
// Hook: useMeetingFilters - Gerenciar filtros de reuniões
// =====================================================================================
export function useMeetingFilters(leadId: string, initialFilters?: Partial<ListMeetingsQuery>) {
  const [filters, setFilters] = React.useState<Partial<ListMeetingsQuery>>(
    initialFilters || { page: 1, limit: 10 }
  );

  const { data, isLoading, error } = useLeadMeetings(leadId, filters);

  const updateFilters = (newFilters: Partial<ListMeetingsQuery>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 })); // Reset page on filter change
  };

  const resetFilters = () => {
    setFilters({ page: 1, limit: 10 });
  };

  return {
    filters,
    meetings: data?.meetings || [],
    pagination: data?.pagination,
    isLoading,
    error,
    updateFilters,
    resetFilters
  };
}

// AIDEV-NOTE: Importar React para useState
import React from 'react';

export { MeetingsUtils };
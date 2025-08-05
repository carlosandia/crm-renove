import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

// AIDEV-NOTE: Usar tipos da nova arquitetura baseada em schemas Zod
import type {
  CombinedActivityView,
  ActivityStats,
  CreateManualActivity,
  CompleteTask,
  RescheduleTask,
  SkipTask,
  UseCombinedActivitiesResult,
  UseLeadTasksForCardResult,
  ActivityFilters,
  TaskStatus,
  UrgencyLevel
} from '../shared/types/cadenceTaskInstance';

// ===================================
// INTERFACES PARA COMPATIBILIDADE
// ===================================

// AIDEV-NOTE: Manter compatibilidade temporária com código existente
export interface CombinedActivity extends CombinedActivityView {}

export interface CreateManualActivityData extends CreateManualActivity {}

// ===================================
// QUERY KEYS
// ===================================

export const activitiesQueryKeys = {
  all: ['activities'] as const,
  combined: (leadId: string) => ['activities', 'combined', leadId] as const,
  combinedWithFilters: (leadId: string, filters: ActivityFilters) => 
    ['activities', 'combined', leadId, filters] as const,
  stats: (leadId: string) => ['activities', 'stats', leadId] as const,
  upcoming: () => ['activities', 'upcoming'] as const,
  manual: (leadId: string) => ['activities', 'manual', leadId] as const,
};

// ===================================
// HOOK PRINCIPAL: ATIVIDADES COMBINADAS
// ===================================

export const useCombinedActivities = (
  leadId: string,
  filters: ActivityFilters = {},
  options: {
    enabled?: boolean;
    refetchInterval?: number;
  } = {}
) => {
  const { enabled = true, refetchInterval } = options;

  // ✅ CORREÇÃO CRÍTICA: Validação robusta de leadId
  const isValidLeadId = leadId && 
                       leadId.trim().length > 0 && 
                       leadId !== 'undefined' && 
                       leadId !== 'null';

  return useQuery({
    queryKey: activitiesQueryKeys.combinedWithFilters(leadId, filters),
    queryFn: async (): Promise<CombinedActivity[]> => {
      // ✅ GUARD: Double-check no queryFn também
      if (!isValidLeadId) {
        console.warn('⚠️ [useCombinedActivities] leadId inválido na queryFn:', leadId);
        return [];
      }

      const params = new URLSearchParams();
      
      if (filters.sourceType && filters.sourceType !== 'all') {
        params.append('source', filters.sourceType);
      }
      if (filters.status && filters.status.length > 0) {
        params.append('status', filters.status.join(','));
      }
      if (filters.activityType && filters.activityType.length > 0) {
        params.append('type', filters.activityType.join(','));
      }
      if (filters.dateRange) {
        params.append('date_from', filters.dateRange.start);
        params.append('date_to', filters.dateRange.end);
      }

      const queryString = params.toString();
      const url = `/activities/leads/${leadId}/combined${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      return response.data.data || [];
    },
    enabled: Boolean(enabled && isValidLeadId), // ✅ GUARD: Validação mais robusta
    refetchInterval,
    staleTime: 30000, // 30 segundos
    gcTime: 300000, // 5 minutos
  });
};

// ===================================
// HOOK: ESTATÍSTICAS DE ATIVIDADES
// ===================================

export const useActivityStats = (leadId: string) => {
  // ✅ CORREÇÃO CRÍTICA: Validação robusta de leadId
  const isValidLeadId = leadId && 
                       leadId.trim().length > 0 && 
                       leadId !== 'undefined' && 
                       leadId !== 'null';

  return useQuery({
    queryKey: activitiesQueryKeys.stats(leadId),
    queryFn: async (): Promise<ActivityStats> => {
      if (!isValidLeadId) {
        console.warn('⚠️ [useActivityStats] leadId inválido na queryFn:', leadId);
        return {
          total: 0,
          pending: 0,
          completed: 0,
          overdue: 0,
          manual_activities: 0,
          cadence_tasks: 0
        };
      }
      
      const response = await api.get(`/activities/leads/${leadId}/stats`);
      return response.data.data;
    },
    enabled: isValidLeadId,
    staleTime: 30000,
    gcTime: 300000,
  });
};

// ===================================
// HOOK: ATIVIDADES PRÓXIMAS (DASHBOARD)
// ===================================

export const useUpcomingActivities = (limit: number = 10) => {
  return useQuery({
    queryKey: [...activitiesQueryKeys.upcoming(), limit],
    queryFn: async (): Promise<CombinedActivity[]> => {
      const response = await api.get(`/activities/upcoming?limit=${limit}`);
      return response.data.data || [];
    },
    staleTime: 60000, // 1 minuto
    gcTime: 300000,
    refetchInterval: 60000, // Atualizar a cada minuto
  });
};

// ===================================
// HOOK: ATIVIDADES MANUAIS
// ===================================

export const useManualActivities = (leadId: string) => {
  // ✅ CORREÇÃO CRÍTICA: Validação robusta de leadId
  const isValidLeadId = leadId && 
                       leadId.trim().length > 0 && 
                       leadId !== 'undefined' && 
                       leadId !== 'null';

  return useQuery({
    queryKey: activitiesQueryKeys.manual(leadId),
    queryFn: async (): Promise<CombinedActivity[]> => {
      if (!isValidLeadId) {
        console.warn('⚠️ [useManualActivities] leadId inválido na queryFn:', leadId);
        return [];
      }
      
      const response = await api.get(`/activities/leads/${leadId}/manual`);
      return response.data.data || [];
    },
    enabled: isValidLeadId,
    staleTime: 30000,
    gcTime: 300000,
  });
};

// ===================================
// MUTATION: CRIAR ATIVIDADE MANUAL
// ===================================

export const useCreateManualActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateManualActivityData) => {
      const response = await api.post('/activities/manual', data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.combined(variables.lead_id)
      });
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.stats(variables.lead_id)
      });
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.manual(variables.lead_id)
      });
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.upcoming()
      });
    },
    onError: (error) => {
      console.error('Erro ao criar atividade manual:', error);
    }
  });
};

// ===================================
// MUTATION: ATUALIZAR ATIVIDADE MANUAL
// ===================================

export const useUpdateManualActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      activityId, 
      updates,
      leadId 
    }: { 
      activityId: string; 
      updates: Partial<Pick<CombinedActivity, 'title' | 'description' | 'outcome' | 'duration_minutes'>>;
      leadId: string;
    }) => {
      const response = await api.put(`/activities/manual/${activityId}`, updates);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.combined(variables.leadId)
      });
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.stats(variables.leadId)
      });
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.manual(variables.leadId)
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar atividade manual:', error);
    }
  });
};

// ===================================
// MUTATION: EXCLUIR ATIVIDADE MANUAL
// ===================================

export const useDeleteManualActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      activityId, 
      leadId 
    }: { 
      activityId: string; 
      leadId: string;
    }) => {
      const response = await api.delete(`/activities/manual/${activityId}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.combined(variables.leadId)
      });
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.stats(variables.leadId)
      });
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.manual(variables.leadId)
      });
    },
    onError: (error) => {
      console.error('Erro ao excluir atividade manual:', error);
    }
  });
};

// ===================================
// MUTATION: COMPLETAR TAREFA DE CADÊNCIA
// ===================================

export const useCompleteCadenceTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      notes,
      leadId 
    }: { 
      taskId: string; 
      notes?: string;
      leadId: string;
    }) => {
      const response = await api.put(`/activities/cadence/${taskId}/complete`, { notes });
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.combined(variables.leadId)
      });
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.stats(variables.leadId)
      });
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.upcoming()
      });
      
      // Invalidar também queries de tasks específicas (compatibilidade)
      queryClient.invalidateQueries({
        queryKey: ['leadTasks', variables.leadId]
      });
    },
    onError: (error) => {
      console.error('Erro ao completar tarefa de cadência:', error);
    }
  });
};

// ===================================
// NOVA ARQUITETURA: MUTATIONS BASEADAS EM SCHEMA
// ===================================

// AIDEV-NOTE: Completar tarefa usando novo schema
export const useCompleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CompleteTask & { leadId: string }) => {
      const { leadId, ...taskData } = data;
      const response = await api.put(`/activities/tasks/${taskData.task_id}/complete`, taskData);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.combined(variables.leadId)
      });
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.stats(variables.leadId)
      });
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.upcoming()
      });
    }
  });
};

// AIDEV-NOTE: Pular tarefa usando novo schema
export const useSkipTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SkipTask & { leadId: string }) => {
      const { leadId, ...taskData } = data;
      const response = await api.put(`/activities/tasks/${taskData.task_id}/skip`, taskData);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.combined(variables.leadId)
      });
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.stats(variables.leadId)
      });
    }
  });
};

// AIDEV-NOTE: Reagendar tarefa usando novo schema
export const useRescheduleTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RescheduleTask & { leadId: string }) => {
      const { leadId, ...taskData } = data;
      const response = await api.put(`/activities/tasks/${taskData.task_id}/reschedule`, taskData);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.combined(variables.leadId)
      });
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.stats(variables.leadId)
      });
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.upcoming()
      });
    }
  });
};

// ===================================
// UTILITY: INVALIDAR TODAS AS QUERIES DE ATIVIDADES
// ===================================

export const useInvalidateActivities = () => {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.all
      });
    },
    invalidateForLead: (leadId: string) => {
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.combined(leadId)
      });
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.stats(leadId)
      });
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.manual(leadId)
      });
    },
    invalidateUpcoming: () => {
      queryClient.invalidateQueries({
        queryKey: activitiesQueryKeys.upcoming()
      });
    }
  };
};
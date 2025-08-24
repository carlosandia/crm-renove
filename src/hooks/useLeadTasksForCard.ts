import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { api, apiService } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider'; // ✅ CORREÇÃO CRÍTICA: Importar useAuth
import type { CombinedActivityView } from '../shared/types/cadenceTaskInstance';
import { loggers } from '../utils/logger'; // ✅ CORREÇÃO: Importar logger estruturado
import { retrySupabaseQuery, retryFetchOperation, createRetryLogger } from '../utils/retryUtils'; // ✅ NOVO: Sistema de retry

// ✅ SIMPLIFICADO: Throttling básico sem over-engineering
const globalGenerationTracker = new Map<string, number>();
const THROTTLE_INTERVAL = 2000; // ✅ REDUZIDO: Apenas 2 segundos para evitar spam

// ✅ CORREÇÃO CRÍTICA: Mutex mais robusto com locks dedicados
function canGenerateForLead(leadId: string): boolean {
  const lastAttempt = globalGenerationTracker.get(leadId) || 0;
  const now = Date.now();
  
  return (now - lastAttempt) > THROTTLE_INTERVAL;
}

function updateLastAttempt(leadId: string): void {
  globalGenerationTracker.set(leadId, Date.now());
}

// ✅ SIMPLIFICADO: Remover delay escalonado desnecessário

export const useLeadTasksForCard = (leadId: string, isVisible: boolean = true) => {
  const queryClient = useQueryClient();
  const { user } = useAuth(); // ✅ CORREÇÃO CRÍTICA: Obter user com tenant_id
  
  // ✅ NOVO: Logger específico para retry
  const retryLogger = useMemo(() => createRetryLogger(`LeadTasks-${leadId.substring(0, 8)}`), [leadId]);


  const {
    data: tasks = [],
    isLoading: loading,
    error: queryError
  } = useQuery({
    queryKey: ['card-tasks', leadId, user?.tenant_id], // ✅ CORREÇÃO: Incluir tenant_id na queryKey
    queryFn: async (): Promise<CombinedActivityView[]> => {
      // ✅ CORREÇÃO: Usar logger throttled ao invés de random sampling
      loggers.leadTasks('Iniciando busca de atividades', {
        leadId: leadId.substring(0, 8),
        source: 'combined_activities_view'
      });

      try {
        // ✅ CORREÇÃO CORS: Tentativa 1 - Supabase Client direto
        let activities: CombinedActivityView[] = [];
        let supabaseError: any = null;
        
        // ✅ CORREÇÃO CRÍTICA: Filtrar por tenant_id para isolamento multi-tenant
        if (!user?.tenant_id) {
          throw new Error('tenant_id não disponível no contexto do usuário');
        }
        
        // ✅ NOVO: Usar retry para Supabase query
        const supabaseResult = await retrySupabaseQuery(
          () => supabase
            .from('combined_activities_view')
            .select('*')
            .eq('lead_id', leadId)
            .eq('tenant_id', user.tenant_id)
            .order('scheduled_at', { ascending: false, nullsFirst: false }),
          {
            maxAttempts: 2,
            baseDelay: 1000,
            onRetry: retryLogger.onRetry
          }
        );

        if (supabaseResult.success && supabaseResult.data) {
          activities = (Array.isArray(supabaseResult.data) ? supabaseResult.data : []) as CombinedActivityView[];
          
          if (supabaseResult.attempts > 1) {
            retryLogger.onSuccess(supabaseResult.attempts, supabaseResult.totalTime);
          }
          
          loggers.leadTasks('Supabase Client: SUCESSO', {
            leadId: leadId.substring(0, 8),
            total: activities.length,
            attempts: supabaseResult.attempts
          });
          
        } else {
          // ✅ Supabase falhou mesmo com retry, tentar backend
          retryLogger.onFinalFailure(supabaseResult.attempts, supabaseResult.totalTime, supabaseResult.error);
          
          loggers.leadTasks('Supabase Client falhou, tentando backend API', {
            leadId: leadId.substring(0, 8),
            error: supabaseResult.error?.message || 'Unknown error',
            attempts: supabaseResult.attempts,
            isCorsError: supabaseResult.error?.message?.includes('CORS') || supabaseResult.error?.message?.includes('fetch')
          });
          
          // ✅ NOVO: Usar retry também para backend API
          const backendResult = await retryFetchOperation(
            () => fetch(`${import.meta.env.VITE_API_URL}/activities/test/leads/${leadId}/for-card?tenant_id=${user.tenant_id}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            }),
            (response) => response.json(),
            {
              maxAttempts: 2,
              baseDelay: 500,
              onRetry: retryLogger.onRetry
            }
          );
          
          if (backendResult.success && backendResult.data?.success && backendResult.data?.data) {
            activities = backendResult.data.data;
            
            loggers.leadTasks('Backend API: SUCESSO', {
              leadId: leadId.substring(0, 8),
              total: activities.length,
              attempts: backendResult.attempts,
              source: 'backend_fallback'
            });
          } else {
            // Ambos falharam
            const finalError = backendResult.error || supabaseResult.error;
            retryLogger.onFinalFailure(
              supabaseResult.attempts + backendResult.attempts, 
              supabaseResult.totalTime + backendResult.totalTime, 
              finalError
            );
            throw finalError;
          }
        }
        
        // ✅ CORREÇÃO: Usar logger throttled com informações condensadas
        loggers.leadTasks('Resposta Supabase recebida', {
          leadId: leadId.substring(0, 8),
          tenantId: user.tenant_id.substring(0, 8),
          total: activities.length,
          source: 'combined_activities_view'
        });
        
        // ✅ LOGS OTIMIZADOS: Usar apenas logger estruturado, sem console.log direto
        if (activities.length > 0) {
          // Log estruturado mantido para debug quando necessário
          loggers.leadTasks('Atividades processadas com detalhes', {
            leadId: leadId.substring(0, 8),
            tenantId: user.tenant_id.substring(0, 8),
            total: activities.length,
            pending: activities.filter(a => a.status === 'pending').length,
            completed: activities.filter(a => a.status === 'completed').length,
            overdue: activities.filter(a => a.is_overdue === true).length,
            firstActivityType: activities[0]?.channel || 'unknown'
          });
        }

        return activities;
      } catch (error: any) {
        // ✅ CORREÇÃO: Usar loggers.apiError para erros de API
        loggers.apiError('useLeadTasksForCard', error, {
          leadId: leadId.substring(0, 8),
          tenantId: user?.tenant_id?.substring(0, 8) || 'N/A'
        });
        
        throw error;
      }
    },
    enabled: !!leadId && !!user?.tenant_id, // ✅ CORREÇÃO: Query só executa se tiver leadId e tenant_id
    staleTime: 120000, // ✅ CORREÇÃO: Aumentar staleTime para 2 minutos
    gcTime: 600000, // ✅ CORREÇÃO: Aumentar cache time para 10 minutos
    refetchInterval: import.meta.env.DEV ? false : 300000, // ✅ CORREÇÃO: Desabilitar em dev, 5min em prod
    refetchOnWindowFocus: false, // ✅ CORREÇÃO: Desabilitar refetch no foco
    refetchOnReconnect: true, // ✅ MANTER: Refetch só na reconexão
    retry: (failureCount, error: any) => {
      // Só tentar novamente se não for erro de autenticação
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        loggers.apiError('useLeadTasksForCard', error, { 
          operation: 'auth_error_no_retry',
          status: error?.response?.status 
        });
        return false;
      }
      return failureCount < 1; // ✅ CORREÇÃO: Reduzir tentativas para 1
    }
  });

  // ✅ SIMPLIFICADO: Remover mutation de geração - agora feito automaticamente pelo backend

  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, notes }: { taskId: string; notes?: string }) => {
      const response = await api.put(`/activities/tasks/${taskId}/complete`, {
        execution_notes: notes,
        outcome: 'neutral'
      });
      return response.data.data;
    },
    onSuccess: () => {
      // ✅ CORREÇÃO: Invalidação mais específica para complete task com tenant_id
      queryClient.invalidateQueries({ 
        queryKey: ['card-tasks', leadId, user?.tenant_id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['activities', 'combined', leadId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['leadTasks', leadId],
        refetchType: 'active'
      });
    }
  });

  // ✅ NOVO: Mutation para deletar tarefas
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await api.delete(`/activities/tasks/${taskId}`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidar as mesmas queries que completeTask
      queryClient.invalidateQueries({ 
        queryKey: ['card-tasks', leadId, user?.tenant_id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['activities', 'combined', leadId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['leadTasks', leadId],
        refetchType: 'active'
      });
    }
  });

  // ✅ CORREÇÃO: Flag estável para detectar presença de dados
  const hasTasksData = useMemo(() => {
    return !!(tasks && tasks.length > 0);
  }, [tasks]);

  // ✅ CORREÇÃO: Memoização de stats com logger throttled
  const stats = useMemo(() => {
    if (!hasTasksData) {
      return { total: 0, pendingCount: 0, overdueCount: 0, completedCount: 0 };
    }

    const pending = tasks.filter(task => task.status === 'pending');
    const overdue = tasks.filter(task => task.is_overdue === true);
    const completed = tasks.filter(task => task.status === 'completed');

    const result = {
      total: tasks.length,
      pendingCount: pending.length,
      overdueCount: overdue.length,
      completedCount: completed.length
    };

    // ✅ CORREÇÃO: Usar logger throttled para stats calculation
    loggers.leadTasks('Stats calculados', {
      leadId: leadId.substring(0, 8),
      total: result.total,
      pending: result.pendingCount,
      overdue: result.overdueCount,
      completed: result.completedCount
    });
    
    return result;
  }, [hasTasksData, tasks, leadId]); // ✅ CORREÇÃO: Usar flag estável ao invés de length

  const completeTask = useCallback(
    async (taskId: string, notes?: string): Promise<boolean> => {
      try {
        await completeTaskMutation.mutateAsync({ taskId, notes });
        return true;
      } catch (error) {
        loggers.apiError('completeTask', error, { 
          taskId: taskId.substring(0, 8),
          hasNotes: !!notes 
        });
        return false;
      }
    },
    [completeTaskMutation]
  );

  // ✅ NOVO: Função para deletar tarefa
  const deleteTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      try {
        await deleteTaskMutation.mutateAsync(taskId);
        return true;
      } catch (error) {
        loggers.apiError('deleteTask', error, { 
          taskId: taskId.substring(0, 8)
        });
        return false;
      }
    },
    [deleteTaskMutation]
  );

  // ✅ NOVO: Função para invalidar cache e forçar refresh
  const forceRefreshCache = useCallback(() => {
    loggers.leadTasks('Invalidando cache de atividades', {
      leadId: leadId.substring(0, 8),
      tenantId: user?.tenant_id?.substring(0, 8) || 'unknown'
    });
    
    // Invalidar query específica deste lead
    queryClient.invalidateQueries({ 
      queryKey: ['card-tasks', leadId, user?.tenant_id] 
    });
  }, [queryClient, leadId, user?.tenant_id]);

  // 🎯 CORREÇÃO FINAL: Se não temos user ou tenant_id, retornar dados vazios mas sem erro
  if (!user?.tenant_id) {
    return {
      tasks: [],
      loading: false, // Não é loading, é falta de contexto
      error: 'Contexto de usuário não disponível',
      pendingCount: 0,
      overdueCount: 0,
      completedCount: 0,
      completeTask,
      deleteTask, // ✅ NOVO: Incluir também aqui
      forceRefreshCache: () => {}, // ✅ NOVO: Função vazia para contexto não disponível
      isGeneratingTasks: false
    };
  }

  return {
    tasks,
    loading: loading,
    error: queryError?.message || null,
    pendingCount: stats.pendingCount,
    overdueCount: stats.overdueCount,
    completedCount: stats.completedCount,
    completeTask,
    deleteTask, // ✅ NOVO: Exportar função de deletar
    forceRefreshCache, // ✅ NOVO: Exportar função de invalidar cache
    isGeneratingTasks: false // ✅ SIMPLIFICADO: Sempre false, geração é do backend
  };
};
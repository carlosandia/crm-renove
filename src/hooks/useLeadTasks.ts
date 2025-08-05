import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';

export interface LeadTask {
  id: string;
  lead_id: string;
  pipeline_id: string;
  etapa_id: string;
  data_programada: string;
  canal: 'email' | 'whatsapp' | 'ligacao' | 'sms' | 'tarefa' | 'visita';
  tipo: 'mensagem' | 'ligacao' | 'tarefa' | 'email_followup' | 'agendamento' | 'proposta';
  descricao: string;
  status: 'pendente' | 'concluida' | 'cancelada';
  day_offset?: number;
  task_order?: number;
  template_content?: string;
  assigned_to?: string;
  executed_at?: string;
  execution_notes?: string;
  created_at: string;
  updated_at: string;
  // Dados enriquecidos
  lead_name?: string;
  lead_data?: any;
  pipeline_name?: string;
  stage_name?: string;
}

export interface TaskStats {
  total: number;
  pendentes: number;
  concluidas: number;
  canceladas: number;
  vencidas: number;
}

export const useLeadTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar tarefas do usuário atual
  const fetchTasks = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Buscar tarefas com JOIN para obter dados relacionados
      const { data: tasksData, error: tasksError } = await supabase
        .from('lead_tasks')
        .select(`
          *,
          pipeline_leads!lead_id (
            id,
            lead_data,
            pipeline_id,
            stage_id
          ),
          pipelines!pipeline_id (
            id,
            name
          ),
          pipeline_stages!etapa_id (
            id,
            name
          )
        `)
        .eq('assigned_to', user.id)
        .order('data_programada', { ascending: true });

      if (tasksError) {
        throw new Error(tasksError.message);
      }

      // Processar e enriquecer os dados
      const enrichedTasks: LeadTask[] = (tasksData || []).map(task => {
        const leadData = task.pipeline_leads;
        const pipelineData = task.pipelines;
        const stageData = task.pipeline_stages;

        return {
          id: task.id,
          lead_id: task.lead_id,
          pipeline_id: task.pipeline_id,
          etapa_id: task.etapa_id,
          data_programada: task.data_programada,
          canal: task.canal,
          tipo: task.tipo,
          descricao: task.descricao,
          status: task.status,
          day_offset: task.day_offset,
          task_order: task.task_order,
          template_content: task.template_content,
          assigned_to: task.assigned_to,
          executed_at: task.executed_at,
          execution_notes: task.execution_notes,
          created_at: task.created_at,
          updated_at: task.updated_at,
          // Dados enriquecidos
          lead_name: leadData?.lead_data?.nome || leadData?.lead_data?.name || `Lead ${task.lead_id.substring(0, 8)}`,
          lead_data: leadData?.lead_data,
          pipeline_name: pipelineData?.name || 'Pipeline',
          stage_name: stageData?.name || 'Etapa'
        };
      });

      setTasks(enrichedTasks);

    } catch (err: any) {
      console.error('Erro ao buscar tarefas:', err);
      setError(err.message || 'Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Marcar tarefa como concluída
  const completeTask = useCallback(async (taskId: string, executionNotes?: string) => {
    try {
      const { error } = await supabase
        .from('lead_tasks')
        .update({
          status: 'concluida',
          executed_at: new Date().toISOString(),
          execution_notes: executionNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) {
        throw new Error(error.message);
      }

      // Atualizar estado local
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              status: 'concluida' as const,
              executed_at: new Date().toISOString(),
              execution_notes: executionNotes
            }
          : task
      ));

      return true;
    } catch (err: any) {
      console.error('Erro ao completar tarefa:', err);
      setError(err.message || 'Erro ao completar tarefa');
      return false;
    }
  }, []);

  // Cancelar tarefa
  const cancelTask = useCallback(async (taskId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from('lead_tasks')
        .update({
          status: 'cancelada',
          execution_notes: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) {
        throw new Error(error.message);
      }

      // Atualizar estado local
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              status: 'cancelada' as const,
              execution_notes: reason
            }
          : task
      ));

      return true;
    } catch (err: any) {
      console.error('Erro ao cancelar tarefa:', err);
      setError(err.message || 'Erro ao cancelar tarefa');
      return false;
    }
  }, []);

  // Calcular estatísticas
  const getStats = useCallback((): TaskStats => {
    const now = new Date();
    const stats: TaskStats = {
      total: tasks.length,
      pendentes: 0,
      concluidas: 0,
      canceladas: 0,
      vencidas: 0
    };

    tasks.forEach(task => {
      switch (task.status) {
        case 'pendente':
          stats.pendentes++;
          if (new Date(task.data_programada) < now) {
            stats.vencidas++;
          }
          break;
        case 'concluida':
          stats.concluidas++;
          break;
        case 'cancelada':
          stats.canceladas++;
          break;
      }
    });

    return stats;
  }, [tasks]);

  // Filtrar tarefas
  const filterTasks = useCallback((filters: {
    search?: string;
    status?: string;
    canal?: string;
    data?: string;
  }) => {
    let filtered = [...tasks];

    // Filtro de busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(task => 
        task.descricao.toLowerCase().includes(searchLower) ||
        task.lead_name?.toLowerCase().includes(searchLower) ||
        task.stage_name?.toLowerCase().includes(searchLower) ||
        task.pipeline_name?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro de status
    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'vencida') {
        const now = new Date();
        filtered = filtered.filter(task => 
          task.status === 'pendente' && new Date(task.data_programada) < now
        );
      } else {
        filtered = filtered.filter(task => task.status === filters.status);
      }
    }

    // Filtro de canal
    if (filters.canal && filters.canal !== 'all') {
      filtered = filtered.filter(task => task.canal === filters.canal);
    }

    // Filtro de data
    if (filters.data && filters.data !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      filtered = filtered.filter(task => {
        const taskDate = new Date(task.data_programada);
        
        switch (filters.data) {
          case 'hoje':
            return taskDate >= today && taskDate < tomorrow;
          case 'amanha':
            return taskDate >= tomorrow && taskDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
          case 'semana':
            return taskDate >= today && taskDate <= nextWeek;
          default:
            return true;
        }
      });
    }

    // Ordenar por data programada
    filtered.sort((a, b) => new Date(a.data_programada).getTime() - new Date(b.data_programada).getTime());

    return filtered;
  }, [tasks]);

  // Buscar tarefas na montagem do componente
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    completeTask,
    cancelTask,
    getStats,
    filterTasks
  };
}; 
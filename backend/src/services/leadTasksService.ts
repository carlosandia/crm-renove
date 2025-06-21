import { supabase } from '../config/supabase';
import { CadenceService } from './cadenceService';

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
  cadence_task_id?: string;
  day_offset?: number;
  task_order?: number;
  template_content?: string;
  assigned_to?: string;
  executed_at?: string;
  execution_notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  tenant_id: string;
}

export interface CreateLeadTaskData {
  lead_id: string;
  pipeline_id: string;
  etapa_id: string;
  data_programada: string;
  canal: LeadTask['canal'];
  tipo: LeadTask['tipo'];
  descricao: string;
  cadence_task_id?: string;
  day_offset?: number;
  task_order?: number;
  template_content?: string;
  assigned_to?: string;
  tenant_id: string;
  created_by?: string;
}

export interface UpdateLeadTaskData {
  status?: LeadTask['status'];
  executed_at?: string;
  execution_notes?: string;
  data_programada?: string;
  descricao?: string;
}

export class LeadTasksService {
  /**
   * Buscar tarefas por lead
   */
  static async getTasksByLead(leadId: string): Promise<LeadTask[]> {
    const { data: tasks, error } = await supabase
      .from('lead_tasks')
      .select('*')
      .eq('lead_id', leadId)
      .order('data_programada', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar tarefas do lead: ${error.message}`);
    }

    return tasks || [];
  }

  /**
   * Buscar tarefas pendentes de um vendedor
   */
  static async getPendingTasksByUser(userId: string, tenantId?: string): Promise<LeadTask[]> {
    let query = supabase
      .from('lead_tasks')
      .select('*')
      .eq('assigned_to', userId)
      .eq('status', 'pendente')
      .lte('data_programada', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()) // Próximos 7 dias
      .order('data_programada', { ascending: true });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: tasks, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar tarefas pendentes: ${error.message}`);
    }

    return tasks || [];
  }

  /**
   * Buscar tarefas por pipeline
   */
  static async getTasksByPipeline(pipelineId: string): Promise<LeadTask[]> {
    const { data: tasks, error } = await supabase
      .from('lead_tasks')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('data_programada', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar tarefas da pipeline: ${error.message}`);
    }

    return tasks || [];
  }

  /**
   * Buscar tarefas por etapa
   */
  static async getTasksByStage(stageId: string): Promise<LeadTask[]> {
    const { data: tasks, error } = await supabase
      .from('lead_tasks')
      .select('*')
      .eq('etapa_id', stageId)
      .order('data_programada', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar tarefas da etapa: ${error.message}`);
    }

    return tasks || [];
  }

  /**
   * Criar nova tarefa
   */
  static async createTask(data: CreateLeadTaskData): Promise<LeadTask> {
    const { data: task, error } = await supabase
      .from('lead_tasks')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar tarefa: ${error.message}`);
    }

    return task;
  }

  /**
   * Atualizar tarefa
   */
  static async updateTask(id: string, data: UpdateLeadTaskData): Promise<LeadTask> {
    const { data: task, error } = await supabase
      .from('lead_tasks')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar tarefa: ${error.message}`);
    }

    return task;
  }

  /**
   * Marcar tarefa como concluída
   */
  static async completeTask(id: string, executionNotes?: string): Promise<LeadTask> {
    return this.updateTask(id, {
      status: 'concluida',
      executed_at: new Date().toISOString(),
      execution_notes: executionNotes
    });
  }

  /**
   * Cancelar tarefa
   */
  static async cancelTask(id: string, reason?: string): Promise<LeadTask> {
    return this.updateTask(id, {
      status: 'cancelada',
      execution_notes: reason
    });
  }

  /**
   * Deletar tarefa
   */
  static async deleteTask(id: string): Promise<void> {
    const { error } = await supabase
      .from('lead_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir tarefa: ${error.message}`);
    }
  }

  /**
   * Gerar tarefas automáticas quando lead muda de etapa
   * Esta função busca as configurações de cadência e cria as tarefas
   */
  static async generateTasksForLeadStageEntry(
    leadId: string,
    pipelineId: string,
    stageId: string,
    stageName: string,
    assignedTo?: string,
    tenantId?: string
  ): Promise<number> {
    try {
      if (!tenantId) {
        console.warn('Tenant ID não fornecido para geração de tarefas');
        return 0;
      }

      // Buscar configuração de cadência para esta etapa
      const cadenceResult = await CadenceService.getCadenceConfigForStage(
        pipelineId,
        stageName,
        tenantId
      );

      if (!cadenceResult.success || !cadenceResult.tasks || cadenceResult.tasks.length === 0) {
        console.log(`Nenhuma configuração de cadência encontrada para etapa "${stageName}"`);
        return 0;
      }

      const tasks = cadenceResult.tasks;
      const entryDate = new Date();
      let tasksCreated = 0;

      // Criar cada tarefa da configuração
      for (const cadenceTask of tasks) {
        try {
          // Calcular data programada baseada no day_offset
          const scheduledDate = new Date(entryDate);
          scheduledDate.setDate(scheduledDate.getDate() + cadenceTask.day_offset);

          // Criar tarefa no banco
          const taskData: CreateLeadTaskData = {
            lead_id: leadId,
            pipeline_id: pipelineId,
            etapa_id: stageId,
            data_programada: scheduledDate.toISOString(),
            canal: cadenceTask.channel,
            tipo: cadenceTask.action_type,
            descricao: cadenceTask.task_description || cadenceTask.task_title,
            cadence_task_id: cadenceTask.id,
            day_offset: cadenceTask.day_offset,
            task_order: cadenceTask.task_order,
            template_content: cadenceTask.template_content,
            assigned_to: assignedTo,
            tenant_id: tenantId,
            created_by: 'system'
          };

          await this.createTask(taskData);
          tasksCreated++;

          console.log(`✅ Tarefa criada: D+${cadenceTask.day_offset} - ${cadenceTask.task_title}`);
        } catch (taskError: any) {
          console.warn(`Erro ao criar tarefa individual:`, taskError.message);
        }
      }

      console.log(`✅ ${tasksCreated} tarefas de cadência geradas para lead ${leadId} na etapa "${stageName}"`);
      return tasksCreated;

    } catch (error: any) {
      console.warn('Erro ao gerar tarefas automáticas:', error.message);
      return 0;
    }
  }

  /**
   * Buscar estatísticas de tarefas
   */
  static async getTaskStats(userId?: string, tenantId?: string): Promise<{
    total: number;
    pendentes: number;
    concluidas: number;
    canceladas: number;
    vencidas: number;
  }> {
    let query = supabase
      .from('lead_tasks')
      .select('status, data_programada');

    if (userId) {
      query = query.eq('assigned_to', userId);
    }

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: tasks, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }

    const now = new Date();
    const stats = {
      total: tasks?.length || 0,
      pendentes: 0,
      concluidas: 0,
      canceladas: 0,
      vencidas: 0
    };

    tasks?.forEach((task: any) => {
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
  }

  /**
   * Buscar tarefas vencidas
   */
  static async getOverdueTasks(userId?: string, tenantId?: string): Promise<LeadTask[]> {
    let query = supabase
      .from('lead_tasks')
      .select('*')
      .eq('status', 'pendente')
      .lt('data_programada', new Date().toISOString())
      .order('data_programada', { ascending: true });

    if (userId) {
      query = query.eq('assigned_to', userId);
    }

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: tasks, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar tarefas vencidas: ${error.message}`);
    }

    return tasks || [];
  }

  /**
   * Buscar tarefas por período
   */
  static async getTasksByDateRange(
    startDate: string,
    endDate: string,
    userId?: string,
    tenantId?: string
  ): Promise<LeadTask[]> {
    let query = supabase
      .from('lead_tasks')
      .select('*')
      .gte('data_programada', startDate)
      .lte('data_programada', endDate)
      .order('data_programada', { ascending: true });

    if (userId) {
      query = query.eq('assigned_to', userId);
    }

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: tasks, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar tarefas por período: ${error.message}`);
    }

    return tasks || [];
  }
} 
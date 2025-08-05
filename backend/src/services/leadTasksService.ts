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
   * Criar nova tarefa na tabela cadence_task_instances
   */
  static async createTask(data: CreateLeadTaskData): Promise<LeadTask> {
    // ✅ CORREÇÃO CRÍTICA: Mapear dados para cadence_task_instances
    const taskInstanceData = {
      tenant_id: data.tenant_id,
      lead_id: data.lead_id,
      pipeline_id: data.pipeline_id,
      stage_id: data.etapa_id, // etapa_id -> stage_id
      cadence_step_id: data.cadence_task_id || null,
      day_offset: data.day_offset || 0,
      task_order: data.task_order || 1,
      title: data.descricao, // descricao -> title
      description: data.descricao,
      activity_type: data.tipo, // tipo -> activity_type
      channel: data.canal, // canal -> channel
      template_content: data.template_content,
      status: 'pending',
      scheduled_at: data.data_programada, // data_programada -> scheduled_at
      is_manual_activity: false,
      auto_generated: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: task, error } = await supabase
      .from('cadence_task_instances')
      .insert(taskInstanceData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar tarefa: ${error.message}`);
    }

    // ✅ CORREÇÃO: Mapear resposta de volta para compatibilidade
    const mappedTask: LeadTask = {
      id: task.id,
      lead_id: task.lead_id,
      pipeline_id: task.pipeline_id,
      etapa_id: task.stage_id,
      descricao: task.title,
      canal: task.channel as any,
      tipo: task.activity_type as any,
      status: task.status as any,
      data_programada: task.scheduled_at,
      executed_at: task.completed_at,
      execution_notes: task.execution_notes,
      template_content: task.template_content,
      day_offset: task.day_offset,
      stage_name: undefined, // Será preenchido pela view
      created_at: task.created_at,
      updated_at: task.updated_at
    };

    return mappedTask;
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
      console.log('🔄 [LeadTasksService] Iniciando geração de tarefas:', {
        leadId: leadId.substring(0, 8),
        pipelineId: pipelineId.substring(0, 8),
        stageId: stageId.substring(0, 8),
        stageName,
        assignedTo: assignedTo?.substring(0, 8),
        tenantId: tenantId?.substring(0, 8)
      });

      if (!tenantId) {
        console.warn('❌ [LeadTasksService] Tenant ID não fornecido para geração de tarefas');
        return 0;
      }

      console.log('🔍 [LeadTasksService] Buscando configuração de cadência...');
      
      // Buscar configuração de cadência para esta etapa
      const cadenceResult = await CadenceService.getCadenceConfigForStage(
        pipelineId,
        stageName,
        tenantId
      );

      console.log('📋 [LeadTasksService] Resultado da busca de cadência:', {
        success: cadenceResult.success,
        hasTasks: !!cadenceResult.tasks,
        tasksLength: cadenceResult.tasks?.length || 0,
        stage: stageName
      });

      if (!cadenceResult.success || !cadenceResult.tasks || cadenceResult.tasks.length === 0) {
        console.log(`⚠️ [LeadTasksService] Nenhuma configuração de cadência encontrada para etapa "${stageName}"`);
        return 0;
      }

      const tasks = cadenceResult.tasks;
      const entryDate = new Date();
      let tasksCreated = 0;

      console.log(`🔨 [LeadTasksService] Criando ${tasks.length} tarefas...`);
      
      // Criar cada tarefa da configuração
      for (const cadenceTask of tasks) {
        try {
          console.log(`🔨 [LeadTasksService] Processando tarefa:`, {
            order: cadenceTask.task_order,
            dayOffset: cadenceTask.day_offset,
            title: cadenceTask.task_title,
            channel: cadenceTask.channel
          });

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

          console.log(`💾 [LeadTasksService] Criando tarefa no banco:`, {
            lead_id: leadId.substring(0, 8),
            canal: taskData.canal,
            day_offset: taskData.day_offset,
            scheduled: scheduledDate.toISOString().substring(0, 10)
          });

          const createdTask = await this.createTask(taskData);
          tasksCreated++;

          console.log(`✅ [LeadTasksService] Tarefa criada: D+${cadenceTask.day_offset} - ${cadenceTask.task_title}`, {
            taskId: createdTask.id.substring(0, 8)
          });
        } catch (taskError: any) {
          console.error(`❌ [LeadTasksService] Erro ao criar tarefa individual:`, {
            error: taskError.message,
            task: cadenceTask.task_title,
            dayOffset: cadenceTask.day_offset
          });
        }
      }

      console.log(`🎉 [LeadTasksService] Geração concluída:`, {
        tasksCreated,
        leadId: leadId.substring(0, 8),
        stageName,
        message: `${tasksCreated} tarefas de cadência geradas com sucesso`
      });
      
      return tasksCreated;

    } catch (error: any) {
      console.error('❌ [LeadTasksService] Erro ao gerar tarefas automáticas:', {
        error: error.message,
        stack: error.stack,
        leadId: leadId?.substring(0, 8),
        stageName
      });
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
import { supabase } from '../config/supabase';

export interface CadenceTask {
  id?: string;
  day_offset: number;
  task_order: number;
  channel: 'email' | 'whatsapp' | 'ligacao' | 'sms' | 'tarefa' | 'visita';
  action_type: 'mensagem' | 'ligacao' | 'tarefa' | 'email_followup' | 'agendamento' | 'proposta';
  task_title: string;
  task_description: string;
  template_content?: string;
  is_active: boolean;
}

export interface CadenceConfig {
  id?: string;
  pipeline_id: string;
  stage_name: string;
  stage_order: number;
  tasks: CadenceTask[];
  is_active: boolean;
  tenant_id: string;
  created_by?: string;
}

export class CadenceService {
  /**
   * Salvar configuração de cadência para uma pipeline
   */
  static async saveCadenceConfig(
    pipelineId: string,
    cadenceConfigs: CadenceConfig[],
    tenantId: string,
    createdBy: string
  ): Promise<{ success: boolean; message: string; configs?: CadenceConfig[] }> {
    try {
      // Primeiro, remover configurações existentes para esta pipeline
      const { error: deleteError } = await supabase
        .from('cadence_config')
        .delete()
        .eq('pipeline_id', pipelineId)
        .eq('tenant_id', tenantId);

      if (deleteError) {
        throw new Error(`Erro ao remover configurações existentes: ${deleteError.message}`);
      }

      const savedConfigs: CadenceConfig[] = [];

      // Salvar cada configuração de cadência
      for (const config of cadenceConfigs) {
        if (config.tasks.length === 0) {
          continue; // Pular etapas sem tarefas
        }

        // Inserir configuração principal
        const { data: configData, error: configError } = await supabase
          .from('cadence_config')
          .insert({
            pipeline_id: pipelineId,
            stage_name: config.stage_name,
            stage_order: config.stage_order,
            is_active: config.is_active,
            tenant_id: tenantId,
            created_by: createdBy
          })
          .select()
          .single();

        if (configError) {
          throw new Error(`Erro ao salvar configuração para etapa "${config.stage_name}": ${configError.message}`);
        }

        // Inserir tarefas da configuração
        const tasksToInsert = config.tasks.map(task => ({
          cadence_config_id: configData.id,
          day_offset: task.day_offset,
          task_order: task.task_order,
          channel: task.channel,
          action_type: task.action_type,
          task_title: task.task_title,
          task_description: task.task_description,
          template_content: task.template_content,
          is_active: task.is_active
        }));

        const { data: tasksData, error: tasksError } = await supabase
          .from('cadence_tasks')
          .insert(tasksToInsert)
          .select();

        if (tasksError) {
          throw new Error(`Erro ao salvar tarefas para etapa "${config.stage_name}": ${tasksError.message}`);
        }

        // Montar configuração salva
        savedConfigs.push({
          id: configData.id,
          pipeline_id: pipelineId,
          stage_name: config.stage_name,
          stage_order: config.stage_order,
          tasks: tasksData.map(task => ({
            id: task.id,
            day_offset: task.day_offset,
            task_order: task.task_order,
            channel: task.channel,
            action_type: task.action_type,
            task_title: task.task_title,
            task_description: task.task_description,
            template_content: task.template_content,
            is_active: task.is_active
          })),
          is_active: config.is_active,
          tenant_id: tenantId,
          created_by: createdBy
        });
      }

      return {
        success: true,
        message: `${savedConfigs.length} configurações de cadência salvas com sucesso`,
        configs: savedConfigs
      };

    } catch (error: any) {
      console.error('Erro ao salvar configurações de cadência:', error);
      return {
        success: false,
        message: error.message || 'Erro interno do servidor'
      };
    }
  }

  /**
   * Carregar configurações de cadência de uma pipeline
   */
  static async loadCadenceConfig(
    pipelineId: string,
    tenantId: string
  ): Promise<{ success: boolean; message: string; configs?: CadenceConfig[] }> {
    try {
      // Buscar configurações com suas tarefas
      const { data: configs, error: configError } = await supabase
        .from('cadence_config')
        .select(`
          *,
          cadence_tasks (*)
        `)
        .eq('pipeline_id', pipelineId)
        .eq('tenant_id', tenantId)
        .order('stage_order', { ascending: true });

      if (configError) {
        throw new Error(`Erro ao carregar configurações: ${configError.message}`);
      }

      // Transformar dados para o formato esperado
      const cadenceConfigs: CadenceConfig[] = (configs || []).map(config => ({
        id: config.id,
        pipeline_id: config.pipeline_id,
        stage_name: config.stage_name,
        stage_order: config.stage_order,
        tasks: (config.cadence_tasks || [])
          .sort((a: any, b: any) => a.day_offset - b.day_offset || a.task_order - b.task_order)
          .map((task: any) => ({
            id: task.id,
            day_offset: task.day_offset,
            task_order: task.task_order,
            channel: task.channel,
            action_type: task.action_type,
            task_title: task.task_title,
            task_description: task.task_description,
            template_content: task.template_content,
            is_active: task.is_active
          })),
        is_active: config.is_active,
        tenant_id: config.tenant_id,
        created_by: config.created_by
      }));

      return {
        success: true,
        message: `${cadenceConfigs.length} configurações carregadas`,
        configs: cadenceConfigs
      };

    } catch (error: any) {
      console.error('Erro ao carregar configurações de cadência:', error);
      return {
        success: false,
        message: error.message || 'Erro interno do servidor'
      };
    }
  }

  /**
   * Deletar configuração de cadência de uma pipeline
   */
  static async deleteCadenceConfig(
    pipelineId: string,
    tenantId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('cadence_config')
        .delete()
        .eq('pipeline_id', pipelineId)
        .eq('tenant_id', tenantId);

      if (error) {
        throw new Error(`Erro ao deletar configurações: ${error.message}`);
      }

      return {
        success: true,
        message: 'Configurações de cadência removidas com sucesso'
      };

    } catch (error: any) {
      console.error('Erro ao deletar configurações de cadência:', error);
      return {
        success: false,
        message: error.message || 'Erro interno do servidor'
      };
    }
  }

  /**
   * Buscar configuração de cadência para uma etapa específica
   */
  static async getCadenceConfigForStage(
    pipelineId: string,
    stageName: string,
    tenantId: string
  ): Promise<{ success: boolean; config?: CadenceConfig; tasks?: CadenceTask[] }> {
    try {
      const { data: config, error } = await supabase
        .from('cadence_config')
        .select(`
          *,
          cadence_tasks (*)
        `)
        .eq('pipeline_id', pipelineId)
        .eq('stage_name', stageName)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single();

      if (error || !config) {
        return { success: false };
      }

      const tasks: CadenceTask[] = (config.cadence_tasks || [])
        .sort((a: any, b: any) => a.day_offset - b.day_offset || a.task_order - b.task_order)
        .filter((task: any) => task.is_active)
        .map((task: any) => ({
          id: task.id,
          day_offset: task.day_offset,
          task_order: task.task_order,
          channel: task.channel,
          action_type: task.action_type,
          task_title: task.task_title,
          task_description: task.task_description,
          template_content: task.template_content,
          is_active: task.is_active
        }));

      return {
        success: true,
        config: {
          id: config.id,
          pipeline_id: config.pipeline_id,
          stage_name: config.stage_name,
          stage_order: config.stage_order,
          tasks,
          is_active: config.is_active,
          tenant_id: config.tenant_id,
          created_by: config.created_by
        },
        tasks
      };

    } catch (error: any) {
      console.error('Erro ao buscar configuração de cadência para etapa:', error);
      return { success: false };
    }
  }
} 
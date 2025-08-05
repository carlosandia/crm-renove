import { supabase } from '../config/supabase';

// ===================================
// INTERFACES E TIPOS
// ===================================

export interface CombinedActivity {
  id: string;
  source_type: 'cadence' | 'manual';
  lead_id: string;
  pipeline_id: string;
  activity_type: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed' | 'overdue' | 'cancelled' | 'skipped';
  outcome?: 'positive' | 'neutral' | 'negative';
  scheduled_at?: string;
  completed_at?: string;
  executed_by?: string;
  duration_minutes?: number;
  execution_notes?: string;
  created_at: string;
  updated_at: string;
  
  // Campos específicos para compatibilidade com a view
  day_offset?: number;
  task_order?: number;
  cadence_step_id?: string;
  channel?: string;
  template_content?: string;
  is_overdue?: boolean;
  urgency_level?: string;
  hours_overdue?: string;
  
  // Campos do lead
  first_name?: string;
  last_name?: string;
  lead_name?: string;
  lead_email?: string;
  lead_phone?: string;
  lead_company?: string;
  
  // Campos da pipeline
  pipeline_name?: string;
  stage_name?: string;
  
  // Campos adicionais
  tenant_id?: string;
  stage_id?: string;
  is_manual_activity?: boolean;
  auto_generated?: boolean;
  custom_data?: any;
}

export interface ManualActivity {
  id: string;
  tenant_id: string;
  lead_id: string;
  pipeline_id: string;
  activity_type: 'call' | 'email' | 'meeting' | 'note' | 'whatsapp' | 'proposal' | 'presentation' | 'demo' | 'followup' | 'visit';
  title: string;
  description?: string;
  outcome: 'positive' | 'neutral' | 'negative';
  completed_at: string;
  duration_minutes?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface CreateManualActivityData {
  lead_id: string;
  pipeline_id: string;
  activity_type: ManualActivity['activity_type'];
  title: string;
  description?: string;
  outcome?: 'positive' | 'neutral' | 'negative';
  completed_at: string;
  duration_minutes?: number;
  tenant_id: string;
  created_by: string;
  metadata?: Record<string, any>;
}

export interface ActivityFilters {
  source_filter?: 'all' | 'cadence' | 'manual';
  status_filter?: 'all' | 'pending' | 'completed' | 'overdue';
  activity_type_filter?: string;
  outcome_filter?: 'all' | 'positive' | 'neutral' | 'negative';
  date_from?: string;
  date_to?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

// ===================================
// SERVIÇO PRINCIPAL
// ===================================

export class CombinedActivitiesService {
  
  /**
   * Buscar todas as atividades combinadas (automáticas + manuais) de um lead
   */
  static async getCombinedActivities(
    leadId: string,
    tenantId: string,
    filters: ActivityFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<CombinedActivity[]> {
    try {
      console.log('🔍 [CombinedActivitiesService] Buscando atividades:', {
        leadId: leadId.substring(0, 8),
        tenantId: tenantId.substring(0, 8),
        filters,
        pagination
      });

      // ✅ PASSO 1: Tentar buscar atividades existentes
      console.log('🔧 [CombinedActivitiesService] Usando service role para garantir acesso...');
      const activities = await this.getCombinedActivitiesWithServiceRole(
        leadId,
        tenantId,
        filters,
        pagination
      );

      console.log('📊 [CombinedActivitiesService] Resultado inicial:', {
        leadId: leadId.substring(0, 8),
        total: activities.length,
        by_status: {
          pending: activities.filter(a => a.status === 'pending').length,
          completed: activities.filter(a => a.status === 'completed').length,
          overdue: activities.filter(a => a.is_overdue === true).length
        }
      });

      // ✅ PASSO 2: AUTO-GERAÇÃO - Se não há atividades, tentar gerar automaticamente
      if (activities.length === 0) {
        console.log('🤖 [CombinedActivitiesService] Nenhuma atividade encontrada - tentando auto-geração...');
        
        try {
          const autoGenResult = await this.tryAutoGenerateTaskInstances(leadId, tenantId);
          
          if (autoGenResult.success && autoGenResult.tasks_created > 0) {
            console.log('✅ [CombinedActivitiesService] Auto-geração bem-sucedida:', autoGenResult);
            
            // Re-buscar atividades após auto-geração
            console.log('🔄 [CombinedActivitiesService] Re-buscando atividades após auto-geração...');
            const newActivities = await this.getCombinedActivitiesWithServiceRole(
              leadId,
              tenantId,
              filters,
              pagination
            );
            
            console.log('🎉 [CombinedActivitiesService] Atividades após auto-geração:', {
              leadId: leadId.substring(0, 8),
              total: newActivities.length,
              tasksCreated: autoGenResult.tasks_created
            });
            
            return newActivities;
          } else {
            console.log('⚠️ [CombinedActivitiesService] Auto-geração não criou tasks:', autoGenResult.message);
          }
        } catch (autoGenError: any) {
          console.error('❌ [CombinedActivitiesService] Erro na auto-geração:', {
            error: autoGenError.message,
            leadId: leadId.substring(0, 8)
          });
          // Continuar normalmente mesmo se auto-geração falhar
        }
      }

      return activities;
    } catch (error) {
      console.error('❌ [CombinedActivitiesService] Erro em getCombinedActivities:', {
        leadId: leadId.substring(0, 8),
        tenantId: tenantId.substring(0, 8),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Tentar auto-gerar task instances para um lead se não existirem
   */
  static async tryAutoGenerateTaskInstances(
    leadId: string,
    tenantId: string
  ): Promise<{ success: boolean; message: string; tasks_created: number }> {
    try {
      console.log('🤖 [tryAutoGenerateTaskInstances] Iniciando auto-geração:', {
        leadId: leadId.substring(0, 8),
        tenantId: tenantId.substring(0, 8)
      });

      // Buscar informações do lead para obter pipeline_id e stage_id
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      const { data: leadData, error: leadError } = await supabaseAdmin
        .from('pipeline_leads')
        .select('id, pipeline_id, stage_id, assigned_to, tenant_id')
        .eq('id', leadId)
        .eq('tenant_id', tenantId)
        .single();

      if (leadError || !leadData) {
        return {
          success: false,
          message: `Lead não encontrado: ${leadError?.message}`,
          tasks_created: 0
        };
      }

      console.log('📋 [tryAutoGenerateTaskInstances] Lead encontrado:', {
        leadId: leadData.id.substring(0, 8),
        pipelineId: leadData.pipeline_id.substring(0, 8),
        stageId: leadData.stage_id?.substring(0, 8) || 'undefined'
      });

      if (!leadData.stage_id) {
        return {
          success: false,
          message: 'Lead não possui stage_id definido',
          tasks_created: 0
        };
      }

      // Usar o CadenceService para gerar task instances
      const { CadenceService } = await import('./cadenceService');
      const generateResult = await CadenceService.generateTaskInstancesForLead(
        leadData.id,
        leadData.pipeline_id,
        leadData.stage_id,
        leadData.assigned_to || 'system',
        leadData.tenant_id
      );

      console.log('🎯 [tryAutoGenerateTaskInstances] Resultado da geração:', generateResult);

      return {
        success: generateResult.success,
        message: generateResult.message,
        tasks_created: generateResult.tasks_created || 0
      };

    } catch (error: any) {
      console.error('❌ [tryAutoGenerateTaskInstances] Erro:', {
        error: error.message,
        leadId: leadId?.substring(0, 8)
      });
      return {
        success: false,
        message: `Erro na auto-geração: ${error.message}`,
        tasks_created: 0
      };
    }
  }

  /**
   * Buscar atividades via view COMBINADA com lead_tasks usando service role (SEM RLS)
   */
  static async getCombinedActivitiesWithServiceRole(
    leadId: string,
    tenantId: string,
    filters: ActivityFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<CombinedActivity[]> {
    try {
      console.log('🔧 [getCombinedActivitiesWithServiceRole] Usando service role bypass:', {
        leadId: leadId.substring(0, 8),
        tenantId: tenantId.substring(0, 8)
      });

      // Usar service_role para bypass de RLS
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // Buscar atividades apenas da view combined_activities_view
      console.log('🔍 [getCombinedActivitiesWithServiceRole] Buscando da view combined_activities_view...');
      let viewQuery = supabaseAdmin
        .from('combined_activities_view')
        .select('*')
        .eq('lead_id', leadId)
        .eq('tenant_id', tenantId);

      // Aplicar filtros
      if (filters.status_filter && filters.status_filter !== 'all') {
        viewQuery = viewQuery.eq('status', filters.status_filter);
      }
      if (filters.activity_type_filter) {
        viewQuery = viewQuery.eq('activity_type', filters.activity_type_filter);
      }
      if (filters.date_from) {
        viewQuery = viewQuery.gte('scheduled_at', filters.date_from);
      }
      if (filters.date_to) {
        viewQuery = viewQuery.lte('scheduled_at', filters.date_to);
      }

      // Executar query
      const viewResult = await viewQuery.order('scheduled_at', { ascending: false, nullsFirst: false });

      console.log('📊 [getCombinedActivitiesWithServiceRole] Resultados:', {
        viewData: viewResult.data?.length || 0,
        viewError: !!viewResult.error
      });

      // Processar dados da view
      const combinedData: CombinedActivity[] = [];

      if (viewResult.data) {
        viewResult.data.forEach(item => {
          combinedData.push({
            ...item,
            source_type: item.source_type || 'cadence',
            is_overdue: item.is_overdue || false
          });
        });
      }

      // Ordenar e paginar
      combinedData.sort((a, b) => {
        const dateA = new Date(a.scheduled_at || a.created_at).getTime();
        const dateB = new Date(b.scheduled_at || b.created_at).getTime();
        return dateB - dateA;
      });

      const startIndex = pagination.offset || 0;
      const endIndex = startIndex + (pagination.limit || 50);
      const paginatedData = combinedData.slice(startIndex, endIndex);

      console.log('✅ [getCombinedActivitiesWithServiceRole] Dados processados:', {
        leadId: leadId.substring(0, 8),
        viewRecords: viewResult.data?.length || 0,
        totalCombined: combinedData.length,
        paginatedTotal: paginatedData.length,
        breakdown: {
          pending: combinedData.filter(a => a.status === 'pending').length,
          completed: combinedData.filter(a => a.status === 'completed').length,
          overdue: combinedData.filter(a => a.is_overdue === true).length
        }
      });

      return paginatedData;
    } catch (error) {
      console.error('❌ [getCombinedActivitiesWithServiceRole] Erro:', error);
      throw error;
    }
  }

  /**
   * Buscar atividades via view combined_activities_view (simplificado)
   */
  static async getCombinedActivitiesFromView(
    leadId: string,
    tenantId: string,
    filters: ActivityFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<CombinedActivity[]> {
    try {
      console.log('🔍 [getCombinedActivitiesFromView] Buscando atividades:', {
        leadId: leadId.substring(0, 8),
        tenantId: tenantId.substring(0, 8),
        filters,
        pagination
      });

      // Buscar apenas da view combined_activities_view
      console.log('🔍 [getCombinedActivitiesFromView] Buscando da view combined_activities_view...');
      let viewQuery = supabase
        .from('combined_activities_view')
        .select('*')
        .eq('lead_id', leadId)
        .eq('tenant_id', tenantId);

      // Aplicar filtros
      if (filters.source_filter === 'cadence') {
        viewQuery = viewQuery.eq('source_type', 'cadence');
      }
      if (filters.status_filter && filters.status_filter !== 'all') {
        viewQuery = viewQuery.eq('status', filters.status_filter);
      }
      if (filters.activity_type_filter) {
        viewQuery = viewQuery.eq('activity_type', filters.activity_type_filter);
      }
      if (filters.date_from) {
        viewQuery = viewQuery.gte('scheduled_at', filters.date_from);
      }
      if (filters.date_to) {
        viewQuery = viewQuery.lte('scheduled_at', filters.date_to);
      }

      // Executar query
      console.log('🔄 [getCombinedActivitiesFromView] Executando query...');
      const viewResult = await viewQuery.order('scheduled_at', { ascending: false, nullsFirst: false });

      console.log('📊 [getCombinedActivitiesFromView] Resultado da query:', {
        viewData: viewResult.data?.length || 0,
        viewError: !!viewResult.error
      });

      if (viewResult.error) {
        console.warn('⚠️ [getCombinedActivitiesFromView] Erro na view:', viewResult.error.message);
      }

      // Processar dados da view
      const combinedData: CombinedActivity[] = [];

      if (viewResult.data) {
        viewResult.data.forEach(item => {
          combinedData.push({
            ...item,
            source_type: item.source_type || 'cadence',
            is_overdue: item.is_overdue || false
          });
        });
      }

      // Ordenar por data programada (mais recente primeiro) e aplicar paginação
      combinedData.sort((a, b) => {
        const dateA = new Date(a.scheduled_at || a.created_at).getTime();
        const dateB = new Date(b.scheduled_at || b.created_at).getTime();
        return dateB - dateA;
      });

      // Aplicar paginação
      const startIndex = pagination.offset || 0;
      const endIndex = startIndex + (pagination.limit || 50);
      const paginatedData = combinedData.slice(startIndex, endIndex);

      console.log('✅ [getCombinedActivitiesFromView] Dados processados:', {
        leadId: leadId.substring(0, 8),
        tenantId: tenantId.substring(0, 8),
        viewRecords: viewResult.data?.length || 0,
        totalCombined: combinedData.length,
        paginatedTotal: paginatedData.length,
        breakdown: {
          pending: combinedData.filter(a => a.status === 'pending').length,
          completed: combinedData.filter(a => a.status === 'completed').length,
          overdue: combinedData.filter(a => a.is_overdue === true).length
        },
        sample: paginatedData[0] ? {
          id: paginatedData[0].id?.substring(0, 8),
          title: paginatedData[0].title,
          status: paginatedData[0].status,
          source_type: paginatedData[0].source_type,
          is_overdue: paginatedData[0].is_overdue
        } : null
      });

      return paginatedData;
    } catch (error) {
      console.error('❌ [getCombinedActivitiesFromView] Erro geral:', {
        leadId: leadId.substring(0, 8),
        tenantId: tenantId.substring(0, 8),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Criar nova atividade manual
   */
  static async createManualActivity(
    activityData: CreateManualActivityData
  ): Promise<ManualActivity> {
    try {
      const { data, error } = await supabase
        .from('manual_activities')
        .insert({
          tenant_id: activityData.tenant_id,
          lead_id: activityData.lead_id,
          pipeline_id: activityData.pipeline_id,
          activity_type: activityData.activity_type,
          title: activityData.title,
          description: activityData.description,
          outcome: activityData.outcome || 'neutral',
          completed_at: activityData.completed_at,
          duration_minutes: activityData.duration_minutes,
          created_by: activityData.created_by,
          metadata: activityData.metadata || {}
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao criar atividade manual: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Erro em createManualActivity:', error);
      throw error;
    }
  }

  /**
   * Atualizar atividade manual existente
   */
  static async updateManualActivity(
    activityId: string,
    tenantId: string,
    updates: Partial<Pick<ManualActivity, 'title' | 'description' | 'outcome' | 'duration_minutes' | 'metadata'>>
  ): Promise<ManualActivity> {
    try {
      const { data, error } = await supabase
        .from('manual_activities')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', activityId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao atualizar atividade manual: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Erro em updateManualActivity:', error);
      throw error;
    }
  }

  /**
   * Excluir atividade manual
   */
  static async deleteManualActivity(
    activityId: string,
    tenantId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('manual_activities')
        .delete()
        .eq('id', activityId)
        .eq('tenant_id', tenantId)
        .eq('created_by', userId); // Só pode excluir quem criou

      if (error) {
        throw new Error(`Erro ao excluir atividade manual: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Erro em deleteManualActivity:', error);
      throw error;
    }
  }

  /**
   * Buscar atividades manuais por lead
   */
  static async getManualActivitiesByLead(
    leadId: string,
    tenantId: string
  ): Promise<ManualActivity[]> {
    try {
      const { data, error } = await supabase
        .from('manual_activities')
        .select('*')
        .eq('lead_id', leadId)
        .eq('tenant_id', tenantId)
        .order('completed_at', { ascending: false });

      if (error) {
        throw new Error(`Erro ao buscar atividades manuais: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erro em getManualActivitiesByLead:', error);
      throw error;
    }
  }

  /**
   * Buscar estatísticas de atividades de um lead
   */
  static async getActivityStats(
    leadId: string,
    tenantId: string
  ): Promise<{
    total_count: number;
    pending_count: number;
    completed_count: number;
    overdue_count: number;
    manual_count: number;
    cadence_count: number;
    outcomes: {
      positive: number;
      neutral: number;
      negative: number;
    };
  }> {
    try {
      console.log('📊 [getActivityStats] Calculando estatísticas:', {
        leadId: leadId.substring(0, 8),
        tenantId: tenantId.substring(0, 8)
      });

      const activities = await this.getCombinedActivities(leadId, tenantId);
      
      const stats = {
        total_count: activities.length,
        pending_count: activities.filter(a => a.status === 'pending').length,
        completed_count: activities.filter(a => a.status === 'completed').length,
        overdue_count: activities.filter(a => a.is_overdue === true).length, // ✅ CORREÇÃO: Usar is_overdue da view
        manual_count: activities.filter(a => a.source_type === 'manual').length,
        cadence_count: activities.filter(a => a.source_type === 'cadence').length,
        outcomes: {
          positive: activities.filter(a => a.outcome === 'positive').length,
          neutral: activities.filter(a => a.outcome === 'neutral').length,
          negative: activities.filter(a => a.outcome === 'negative').length,
        }
      };

      console.log('✅ [getActivityStats] Estatísticas calculadas:', {
        leadId: leadId.substring(0, 8),
        stats
      });

      return stats;
    } catch (error) {
      console.error('❌ [getActivityStats] Erro ao calcular estatísticas:', {
        leadId: leadId.substring(0, 8),
        tenantId: tenantId.substring(0, 8),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Buscar próximas atividades pendentes (para dashboard)
   */
  static async getUpcomingActivities(
    tenantId: string,
    userId?: string,
    limit: number = 10
  ): Promise<CombinedActivity[]> {
    try {
      let query = supabase
        .from('combined_activities_view')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('status', ['pending', 'overdue'])
        .order('scheduled_date', { ascending: true });

      // Filtrar por usuário se especificado
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.limit(limit);

      if (error) {
        throw new Error(`Erro ao buscar atividades próximas: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erro em getUpcomingActivities:', error);
      throw error;
    }
  }

  /**
   * Marcar atividade de cadência como concluída (integração com sistema existente)
   */
  static async completeCadenceTask(
    taskId: string,
    tenantId: string,
    userId: string,
    notes?: string,
    outcome?: string
  ): Promise<boolean> {
    try {
      console.log('🔄 [completeCadenceTask] Marcando tarefa como concluída:', {
        taskId: taskId.substring(0, 8),
        tenantId: tenantId.substring(0, 8),
        userId: userId.substring(0, 8),
        notes: notes?.substring(0, 50),
        outcome
      });

      const { error } = await supabase
        .from('cadence_task_instances')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          execution_notes: notes,
          executed_by: userId, // Registrar quem executou
          outcome: outcome || 'neutral',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('❌ [completeCadenceTask] Erro na atualização:', error);
        throw new Error(`Erro ao completar tarefa de cadência: ${error.message}`);
      }

      console.log('✅ [completeCadenceTask] Tarefa marcada como concluída:', {
        taskId: taskId.substring(0, 8)
      });

      return true;
    } catch (error) {
      console.error('❌ [completeCadenceTask] Erro geral:', error);
      throw error;
    }
  }

  /**
   * Deletar tarefa de cadência
   */
  static async deleteCadenceTask(
    taskId: string,
    tenantId: string
  ): Promise<boolean> {
    try {
      console.log('🗑️ [deleteCadenceTask] Deletando tarefa:', {
        taskId: taskId.substring(0, 8),
        tenantId: tenantId.substring(0, 8)
      });

      // Deletar da tabela cadence_task_instances
      const { error } = await supabase
        .from('cadence_task_instances')
        .delete()
        .eq('id', taskId)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('❌ [deleteCadenceTask] Erro na exclusão:', error);
        throw new Error(`Erro ao deletar tarefa: ${error.message}`);
      }

      console.log('✅ [deleteCadenceTask] Tarefa deletada com sucesso:', {
        taskId: taskId.substring(0, 8)
      });

      return true;
    } catch (error) {
      console.error('❌ [deleteCadenceTask] Erro geral:', error);
      throw error;
    }
  }

  /**
   * Validar dados de atividade manual antes da criação
   */
  static validateManualActivityData(data: CreateManualActivityData): string[] {
    const errors: string[] = [];

    if (!data.lead_id) errors.push('lead_id é obrigatório');
    if (!data.pipeline_id) errors.push('pipeline_id é obrigatório');
    if (!data.tenant_id) errors.push('tenant_id é obrigatório');
    if (!data.created_by) errors.push('created_by é obrigatório');
    if (!data.activity_type) errors.push('activity_type é obrigatório');
    if (!data.title || data.title.trim().length === 0) errors.push('title é obrigatório');
    if (!data.completed_at) errors.push('completed_at é obrigatório');

    // Validar tipos permitidos
    const validTypes = ['call', 'email', 'meeting', 'note', 'whatsapp', 'proposal', 'presentation', 'demo', 'followup', 'visit'];
    if (data.activity_type && !validTypes.includes(data.activity_type)) {
      errors.push(`activity_type deve ser um de: ${validTypes.join(', ')}`);
    }

    // Validar outcome se fornecido
    const validOutcomes = ['positive', 'neutral', 'negative'];
    if (data.outcome && !validOutcomes.includes(data.outcome)) {
      errors.push(`outcome deve ser um de: ${validOutcomes.join(', ')}`);
    }

    // Validar data
    if (data.completed_at && isNaN(Date.parse(data.completed_at))) {
      errors.push('completed_at deve ser uma data válida');
    }

    // Validar duração se fornecida
    if (data.duration_minutes !== undefined && (isNaN(data.duration_minutes) || data.duration_minutes < 0)) {
      errors.push('duration_minutes deve ser um número positivo');
    }

    return errors;
  }
}

export default CombinedActivitiesService;
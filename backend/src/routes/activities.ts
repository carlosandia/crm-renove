import express from 'express';
import { authenticateToken } from '../middleware/auth';
import CombinedActivitiesService, { 
  CreateManualActivityData,
  ActivityFilters,
  PaginationOptions 
} from '../services/CombinedActivitiesService';

const router = express.Router();

// ===================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ===================================

// 🔍 DEBUG FASE 2: ENDPOINT DE TESTE ESPECÍFICO PARA PIPELINE NEW13
/**
 * GET /api/activities/debug/pipeline-new13/:leadId
 * DEBUG ESPECÍFICO PARA INVESTIGAR PROBLEMA COM PIPELINE NEW13
 */
router.get('/debug/pipeline-new13/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tenant_id } = req.query;
    
    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id é obrigatório via query string'
      });
    }

    console.log('🔍 [DEBUG FASE 2] Investigando pipeline new13:', {
      leadId: leadId.substring(0, 8),
      tenant_id: tenant_id.toString().substring(0, 8),
      timestamp: new Date().toISOString()
    });

    // Usar service role para bypass total de RLS
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

    // 1. Verificar se o lead existe na pipeline new13
    const { data: leadInfo, error: leadError } = await supabaseAdmin
      .from('pipeline_leads')
      .select('id, stage_id, pipeline_id, tenant_id')
      .eq('id', leadId)
      .eq('tenant_id', tenant_id)
      .single();

    if (leadError || !leadInfo) {
      return res.json({
        success: false,
        error: 'Lead não encontrado',
        leadError: leadError?.message
      });
    }

    // 1.1. Buscar informações da pipeline
    const { data: pipelineInfo } = await supabaseAdmin
      .from('pipelines')
      .select('name')
      .eq('id', leadInfo.pipeline_id)
      .single();

    // 1.2. Buscar informações da etapa atual
    const { data: stageInfo } = await supabaseAdmin
      .from('pipeline_stages')
      .select('name, order_index')
      .eq('id', leadInfo.stage_id)
      .single();

    if (leadError || !leadInfo) {
      return res.json({
        success: false,
        error: 'Lead não encontrado',
        leadError: leadError?.message
      });
    }

    // 2. Buscar TODAS as atividades diretamente da tabela cadence_task_instances
    const { data: rawActivities, error: rawError } = await supabaseAdmin
      .from('cadence_task_instances')
      .select(`
        id,
        title,
        activity_type,
        channel,
        status,
        day_offset,
        scheduled_at,
        auto_generated,
        is_manual_activity,
        created_at,
        stage_id
      `)
      .eq('lead_id', leadId)
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false });

    // 3. Buscar via combined_activities_view
    const { data: viewActivities, error: viewError } = await supabaseAdmin
      .from('combined_activities_view')
      .select('*')
      .eq('lead_id', leadId)
      .eq('tenant_id', tenant_id)
      .order('scheduled_at', { ascending: false });

    console.log('🔍 [DEBUG FASE 2] Resultados da investigação:', {
      leadId: leadId.substring(0, 8),
      leadInfo: {
        pipelineName: pipelineInfo?.name,
        stageName: stageInfo?.name,
        stageOrder: stageInfo?.order_index
      },
      rawActivitiesCount: rawActivities?.length || 0,
      viewActivitiesCount: viewActivities?.length || 0,
      rawError: rawError?.message,
      viewError: viewError?.message
    });

    res.json({
      success: true,
      debug_mode: true,
      leadInfo: {
        id: leadInfo.id,
        pipelineName: pipelineInfo?.name,
        stageName: stageInfo?.name,
        stageOrder: stageInfo?.order_index
      },
      raw_activities: {
        count: rawActivities?.length || 0,
        data: rawActivities || [],
        error: rawError?.message
      },
      view_activities: {
        count: viewActivities?.length || 0,
        data: viewActivities || [],
        error: viewError?.message
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [DEBUG FASE 2] Erro na investigação:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ✅ ENDPOINT DE TESTE SEM AUTH (TEMPORÁRIO)
/**
 * GET /api/activities/test/leads/:leadId/for-card
 * ENDPOINT DE TESTE SEM AUTENTICAÇÃO PARA DEBUG
 */
router.get('/test/leads/:leadId/for-card', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tenant_id } = req.query;
    
    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id é obrigatório via query string'
      });
    }

    console.log('🧪 [TEST ENDPOINT] Testando atividades sem auth:', {
      leadId: leadId.substring(0, 8),
      tenant_id: tenant_id.toString().substring(0, 8),
      timestamp: new Date().toISOString()
    });

    // Buscar atividades diretamente usando service role bypass
    console.log('🔍 [TEST ENDPOINT] Fazendo bypass de RLS com service role...');
    
    const activities = await CombinedActivitiesService.getCombinedActivitiesWithServiceRole(
      leadId,
      tenant_id as string,
      { source_filter: 'all', status_filter: 'all' },
      { limit: 1000, offset: 0 }
    );

    // Calcular estatísticas manualmente a partir dos dados unificados
    const stats = {
      total_count: activities.length,
      pending_count: activities.filter(a => a.status === 'pending').length,
      completed_count: activities.filter(a => a.status === 'completed').length,
      overdue_count: activities.filter(a => a.is_overdue === true).length,
      manual_count: activities.filter(a => a.source_type === 'manual').length,
      cadence_count: activities.filter(a => a.source_type === 'cadence').length,
      outcomes: {
        positive: activities.filter(a => a.outcome === 'positive').length,
        neutral: activities.filter(a => a.outcome === 'neutral').length,
        negative: activities.filter(a => a.outcome === 'negative').length,
      }
    };

    console.log('✅ [TEST ENDPOINT] Resultado do teste:', {
      leadId: leadId.substring(0, 8),
      total_activities: activities.length,
      stats: {
        total: stats.total_count,
        pending: stats.pending_count,
        completed: stats.completed_count,
        overdue: stats.overdue_count
      }
    });

    res.json({
      success: true,
      test_mode: true,
      data: activities,
      meta: {
        stats: stats,
        total: activities.length,
        leadId: leadId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ [TEST ENDPOINT] Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Todas as rotas normais precisam de autenticação
router.use(authenticateToken);

// ===================================
// ROTAS PARA ATIVIDADES COMBINADAS
// ===================================

/**
 * GET /api/activities/leads/:leadId/combined
 * Buscar todas as atividades (automáticas + manuais) de um lead
 */
router.get('/leads/:leadId/combined', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tenant_id } = req.user;

    // Extrair filtros da query string
    const filters: ActivityFilters = {
      source_filter: req.query.source as 'all' | 'cadence' | 'manual' || 'all',
      status_filter: req.query.status as 'all' | 'pending' | 'completed' | 'overdue' || 'all',
      activity_type_filter: req.query.type as string,
      outcome_filter: req.query.outcome as 'all' | 'positive' | 'neutral' | 'negative' || 'all',
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string
    };

    // Extrair opções de paginação
    const pagination: PaginationOptions = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const activities = await CombinedActivitiesService.getCombinedActivities(
      leadId,
      tenant_id,
      filters,
      pagination
    );

    res.json({
      success: true,
      data: activities,
      meta: {
        total: activities.length,
        filters,
        pagination
      }
    });

  } catch (error: any) {
    console.error('Erro ao buscar atividades combinadas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * GET /api/activities/leads/:leadId/stats
 * Buscar estatísticas de atividades de um lead
 */
router.get('/leads/:leadId/stats', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tenant_id } = req.user;

    const stats = await CombinedActivitiesService.getActivityStats(leadId, tenant_id);

    res.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('Erro ao buscar estatísticas de atividades:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// ===================================
// ROTAS PARA ATIVIDADES MANUAIS
// ===================================

/**
 * POST /api/activities/manual
 * Criar nova atividade manual
 */
router.post('/manual', async (req, res) => {
  try {
    const { tenant_id, id: userId } = req.user;
    
    const activityData: CreateManualActivityData = {
      ...req.body,
      tenant_id,
      created_by: userId
    };

    // Validar dados
    const validationErrors = CombinedActivitiesService.validateManualActivityData(activityData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validationErrors
      });
    }

    const newActivity = await CombinedActivitiesService.createManualActivity(activityData);

    res.status(201).json({
      success: true,
      data: newActivity,
      message: 'Atividade manual criada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro ao criar atividade manual:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * PUT /api/activities/manual/:activityId
 * Atualizar atividade manual existente
 */
router.put('/manual/:activityId', async (req, res) => {
  try {
    const { activityId } = req.params;
    const { tenant_id } = req.user;
    const updates = req.body;

    // Campos permitidos para atualização
    const allowedFields = ['title', 'description', 'outcome', 'duration_minutes', 'metadata'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum campo válido para atualização fornecido'
      });
    }

    const updatedActivity = await CombinedActivitiesService.updateManualActivity(
      activityId,
      tenant_id,
      filteredUpdates
    );

    res.json({
      success: true,
      data: updatedActivity,
      message: 'Atividade manual atualizada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro ao atualizar atividade manual:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * DELETE /api/activities/manual/:activityId
 * Excluir atividade manual
 */
router.delete('/manual/:activityId', async (req, res) => {
  try {
    const { activityId } = req.params;
    const { tenant_id, id: userId } = req.user;

    const success = await CombinedActivitiesService.deleteManualActivity(
      activityId,
      tenant_id,
      userId
    );

    if (success) {
      res.json({
        success: true,
        message: 'Atividade manual excluída com sucesso'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Atividade não encontrada ou sem permissão para excluir'
      });
    }

  } catch (error: any) {
    console.error('Erro ao excluir atividade manual:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});


/**
 * GET /api/activities/leads/:leadId/manual
 * Buscar apenas atividades manuais de um lead
 */
router.get('/leads/:leadId/manual', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tenant_id } = req.user;

    const activities = await CombinedActivitiesService.getManualActivitiesByLead(
      leadId,
      tenant_id
    );

    res.json({
      success: true,
      data: activities
    });

  } catch (error: any) {
    console.error('Erro ao buscar atividades manuais:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// ===================================
// ROTAS PARA ATIVIDADES DE CADÊNCIA
// ===================================

/**
 * PUT /api/activities/tasks/:taskId/complete
 * Marcar qualquer tarefa/atividade como concluída (unificado)
 */
router.put('/tasks/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { tenant_id, id: userId } = req.user;
    const { execution_notes, outcome } = req.body;

    const success = await CombinedActivitiesService.completeCadenceTask(
      taskId,
      tenant_id,
      userId,
      execution_notes || ''
    );

    if (success) {
      res.json({
        success: true,
        data: { id: taskId, status: 'completed' },
        message: 'Tarefa marcada como concluída'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Tarefa não encontrada'
      });
    }

  } catch (error: any) {
    console.error('Erro ao completar tarefa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * PUT /api/activities/cadence/:taskId/complete
 * Marcar tarefa de cadência como concluída (compatibilidade)
 */
router.put('/cadence/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { tenant_id, id: userId } = req.user;
    const { notes } = req.body;

    const success = await CombinedActivitiesService.completeCadenceTask(
      taskId,
      tenant_id,
      userId,
      notes
    );

    if (success) {
      res.json({
        success: true,
        message: 'Tarefa de cadência marcada como concluída'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Tarefa não encontrada'
      });
    }

  } catch (error: any) {
    console.error('Erro ao completar tarefa de cadência:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// ===================================
// ROTAS PARA DASHBOARD E RELATÓRIOS
// ===================================

/**
 * GET /api/activities/upcoming
 * Buscar próximas atividades pendentes (para dashboard)
 */
router.get('/upcoming', async (req, res) => {
  try {
    const { tenant_id, id: userId, role } = req.user;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    // Member só vê suas próprias atividades, Admin/Super Admin veem todas do tenant
    const userFilter = role === 'member' ? userId : undefined;

    const activities = await CombinedActivitiesService.getUpcomingActivities(
      tenant_id,
      userFilter,
      limit
    );

    res.json({
      success: true,
      data: activities
    });

  } catch (error: any) {
    console.error('Erro ao buscar atividades próximas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * GET /api/activities/leads/:leadId/for-card
 * Buscar estatísticas resumidas de atividades para exibição no card do lead
 */
router.get('/leads/:leadId/for-card', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tenant_id, id: userId, role } = req.user;

    // ✅ CORREÇÃO: Reduzir logs excessivos no backend também
    const isDebugMode = process.env.NODE_ENV === 'development' && Math.random() < 0.1; // 10% dos logs
    
    if (isDebugMode) {
      console.log('🔍 [activities/for-card] Iniciando busca de atividades:', {
        leadId: leadId.substring(0, 8),
        tenant_id: tenant_id.substring(0, 8),
        userId: userId.substring(0, 8),
        role,
        timestamp: new Date().toISOString(),
        endpoint: `/api/activities/leads/${leadId}/for-card`
      });
    }

    // Primeiro buscar as atividades
    const activities = await CombinedActivitiesService.getCombinedActivities(
      leadId,
      tenant_id,
      { source_filter: 'all', status_filter: 'all' },
      { limit: 1000, offset: 0 }
    );

    // ✅ CORREÇÃO: Só logar quando há dados relevantes ou em debug mode
    if (activities.length > 0 || isDebugMode) {
      console.log('✅ [activities/for-card] Atividades encontradas:', {
        leadId: leadId.substring(0, 8),
        total_activities: activities.length,
        by_status: {
          pending: activities.filter(a => a.status === 'pending').length,
          completed: activities.filter(a => a.status === 'completed').length,
          overdue: activities.filter(a => a.is_overdue === true).length,
          skipped: activities.filter(a => a.status === 'skipped').length
        },
        sample_activity: activities[0] ? {
          id: activities[0].id?.substring(0, 8),
          title: activities[0].title,
          status: activities[0].status,
          source_type: activities[0].source_type,
          scheduled_at: activities[0].scheduled_at,
          is_overdue: activities[0].is_overdue
        } : null
      });
    }

    // Calcular estatísticas também
    const stats = await CombinedActivitiesService.getActivityStats(leadId, tenant_id);

    // ✅ CORREÇÃO: Só logar stats em debug mode ou quando há dados
    if (stats.total_count > 0 || isDebugMode) {
      console.log('📊 [activities/for-card] Estatísticas calculadas:', {
        leadId: leadId.substring(0, 8),
        stats: {
          total: stats.total_count,
          pending: stats.pending_count,
          completed: stats.completed_count,
          overdue: stats.overdue_count,
          manual: stats.manual_count,
          cadence: stats.cadence_count
        }
      });
    }

    // Retornar no formato esperado pelo useLeadTasksForCard
    res.json({
      success: true,
      data: activities,
      meta: {
        stats: stats,
        total: activities.length,
        leadId: leadId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ [activities/for-card] Erro ao buscar atividades para card:', {
      leadId: req.params.leadId?.substring(0, 8),
      tenant_id: req.user?.tenant_id?.substring(0, 8),
      error: error.message,
      stack: error.stack?.split('\n')[0], // Primeira linha do stack trace
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * DELETE /api/activities/tasks/:taskId
 * Deletar uma tarefa/atividade específica
 */
router.delete('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { tenant_id, id: userId } = req.user;

    console.log('🗑️ [DELETE /tasks] Deletando tarefa:', {
      taskId: taskId.substring(0, 8),
      tenant_id: tenant_id.substring(0, 8),
      userId: userId.substring(0, 8)
    });

    // Tentar deletar da tabela cadence_task_instances primeiro
    const success = await CombinedActivitiesService.deleteCadenceTask(taskId, tenant_id);

    if (success) {
      console.log('✅ [DELETE /tasks] Tarefa deletada com sucesso:', taskId.substring(0, 8));
      res.json({
        success: true,
        message: 'Tarefa deletada com sucesso'
      });
    } else {
      console.log('⚠️ [DELETE /tasks] Tarefa não encontrada ou sem permissão:', taskId.substring(0, 8));
      res.status(404).json({
        success: false,
        error: 'Tarefa não encontrada ou sem permissão para deletar'
      });
    }

  } catch (error: any) {
    console.error('❌ [DELETE /tasks] Erro ao deletar tarefa:', {
      taskId: req.params.taskId?.substring(0, 8),
      tenant_id: req.user?.tenant_id?.substring(0, 8),
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// ===================================
// MIDDLEWARE DE TRATAMENTO DE ERROS
// ===================================

router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro nas rotas de atividades:', error);
  
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Erro inesperado'
  });
});

export default router;
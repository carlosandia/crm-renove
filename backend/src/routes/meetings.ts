// =====================================================================================
// ROUTES: Sistema de Reuniões
// Autor: Claude (Arquiteto Sênior) 
// Descrição: Rotas REST para CRUD de reuniões seguindo padrão das atividades
// =====================================================================================

import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { MeetingsService } from '../services/meetingsService';
import { 
  CreateMeetingSchema,
  UpdateMeetingOutcomeSchema,
  UpdateMeetingDataSchema,
  ListMeetingsQuerySchema
} from '../shared/schemas/meetings';

const router = express.Router();

// ===================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ===================================

// Todas as rotas precisam de autenticação (igual atividades)
router.use(authenticateToken);

// ===================================
// ROTAS PARA CRUD DE REUNIÕES
// ===================================

/**
 * GET /api/meetings/lead/:leadId
 * Buscar reuniões de um lead específico
 */
router.get('/lead/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tenant_id } = req.user;

    // Extrair filtros da query string
    const queryValidation = ListMeetingsQuerySchema.safeParse(req.query);
    
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros de query inválidos',
        details: queryValidation.error.errors
      });
    }

    const filters = queryValidation.data;

    console.log('🔍 [GET /meetings/lead] Buscando reuniões:', {
      leadId: leadId.substring(0, 8),
      tenant_id: tenant_id.substring(0, 8),
      filters: {
        outcome: filters.outcome,
        date_from: filters.date_from,
        date_to: filters.date_to,
        page: filters.page,
        limit: filters.limit
      }
    });

    const result = await MeetingsService.getLeadMeetings(leadId, tenant_id, filters);

    console.log('✅ [GET /meetings/lead] Reuniões encontradas:', {
      leadId: leadId.substring(0, 8),
      total: result.meetings.length,
      pagination: result.pagination
    });

    res.json({
      success: true,
      data: result.meetings,
      pagination: result.pagination
    });

  } catch (error: any) {
    console.error('❌ [GET /meetings/lead] Erro:', {
      leadId: req.params.leadId?.substring(0, 8),
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

/**
 * POST /api/meetings
 * Criar nova reunião
 */
router.post('/', async (req, res) => {
  try {
    const { tenant_id, id: userId } = req.user;

    // Validar dados de entrada
    const validation = CreateMeetingSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validation.error.errors
      });
    }

    const meetingData = {
      ...validation.data,
      tenant_id,
      owner_id: userId
    };

    console.log('🔍 [POST /meetings] Criando reunião:', {
      pipeline_lead_id: meetingData.pipeline_lead_id.substring(0, 8),
      tenant_id: tenant_id.substring(0, 8),
      owner_id: userId.substring(0, 8),
      title: meetingData.title,
      planned_at: meetingData.planned_at
    });

    const newMeeting = await MeetingsService.createMeeting(meetingData);

    console.log('✅ [POST /meetings] Reunião criada:', {
      id: newMeeting.id.substring(0, 8),
      title: newMeeting.title,
      planned_at: newMeeting.planned_at
    });

    res.status(201).json({
      success: true,
      data: newMeeting,
      message: 'Reunião criada com sucesso'
    });

  } catch (error: any) {
    console.error('❌ [POST /meetings] Erro:', {
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

/**
 * PUT /api/meetings/:id
 * Atualizar dados básicos da reunião (título e observações)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user;

    // Validar dados de entrada
    const validation = UpdateMeetingDataSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validation.error.errors
      });
    }

    const updateData = validation.data;

    console.log('🔍 [PUT /meetings] Atualizando dados da reunião:', {
      id: id.substring(0, 8),
      tenant_id: tenant_id.substring(0, 8),
      updateData: {
        title: updateData.title,
        notes: updateData.notes
      }
    });

    const updatedMeeting = await MeetingsService.updateMeetingData(id, tenant_id, updateData);

    if (!updatedMeeting) {
      return res.status(404).json({
        success: false,
        error: 'Reunião não encontrada'
      });
    }

    console.log('✅ [PUT /meetings] Reunião atualizada:', {
      id: updatedMeeting.id.substring(0, 8),
      title: updatedMeeting.title
    });

    res.json({
      success: true,
      data: updatedMeeting,
      message: 'Reunião atualizada com sucesso'
    });

  } catch (error: any) {
    console.error('❌ [PUT /meetings] Erro:', {
      id: req.params.id?.substring(0, 8),
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

/**
 * PATCH /api/meetings/:id/outcome
 * Atualizar status/outcome da reunião
 */
router.patch('/:id/outcome', async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user;

    // Validar dados de entrada
    const validation = UpdateMeetingOutcomeSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validation.error.errors
      });
    }

    const outcomeData = validation.data;

    console.log('🔍 [PATCH /meetings/outcome] Atualizando status:', {
      id: id.substring(0, 8),
      tenant_id: tenant_id.substring(0, 8),
      outcome: outcomeData.outcome,
      no_show_reason: outcomeData.no_show_reason
    });

    const updatedMeeting = await MeetingsService.updateMeetingOutcome(id, tenant_id, outcomeData);

    if (!updatedMeeting) {
      return res.status(404).json({
        success: false,
        error: 'Reunião não encontrada'
      });
    }

    console.log('✅ [PATCH /meetings/outcome] Status atualizado:', {
      id: updatedMeeting.id.substring(0, 8),
      outcome: updatedMeeting.outcome
    });

    res.json({
      success: true,
      data: updatedMeeting,
      message: 'Status da reunião atualizado com sucesso'
    });

  } catch (error: any) {
    console.error('❌ [PATCH /meetings/outcome] Erro:', {
      id: req.params.id?.substring(0, 8),
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

/**
 * DELETE /api/meetings/:id
 * Excluir reunião
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user;

    console.log('🗑️ [DELETE /meetings] Excluindo reunião:', {
      id: id.substring(0, 8),
      tenant_id: tenant_id.substring(0, 8)
    });

    const success = await MeetingsService.deleteMeeting(id, tenant_id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Reunião não encontrada'
      });
    }

    console.log('✅ [DELETE /meetings] Reunião excluída:', {
      id: id.substring(0, 8)
    });

    res.json({
      success: true,
      message: 'Reunião excluída com sucesso'
    });

  } catch (error: any) {
    console.error('❌ [DELETE /meetings] Erro:', {
      id: req.params.id?.substring(0, 8),
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
// ROTAS PARA MÉTRICAS E RELATÓRIOS
// ===================================

/**
 * GET /api/meetings/reports/metrics
 * Buscar métricas de reuniões para relatórios
 */
router.get('/reports/metrics', async (req, res) => {
  try {
    const { tenant_id } = req.user;

    // Extrair filtros da query string
    const filters = {
      pipeline_id: req.query.pipeline_id as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      group_by: req.query.group_by as 'day' | 'week' | 'month' || 'month',
      seller_id: req.query.seller_id as string
    };

    console.log('📊 [GET /meetings/metrics] Buscando métricas:', {
      tenant_id: tenant_id.substring(0, 8),
      filters
    });

    const metrics = await MeetingsService.getMeetingMetrics(tenant_id, filters);

    console.log('✅ [GET /meetings/metrics] Métricas calculadas:', {
      tenant_id: tenant_id.substring(0, 8),
      individualPipelines: metrics.individual_pipelines.length,
      hasAggregated: !!metrics.aggregated
    });

    res.json({
      success: true,
      data: metrics
    });

  } catch (error: any) {
    console.error('❌ [GET /meetings/metrics] Erro:', {
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
  console.error('❌ [MEETINGS ROUTES] Erro nas rotas de reuniões:', error);
  
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Erro inesperado'
  });
});

export default router;
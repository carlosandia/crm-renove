import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { asyncHandler, NotFoundError, ForbiddenError, ValidationError } from '../middleware/errorHandler';
import { validateRequest, schemas } from '../middleware/validation';
import { requireRole } from '../middleware/auth';
import { ApiResponse } from '../types/express';
import { LeadService } from '../services/LeadService';

const router = Router();

/**
 * Validações específicas para leads
 */
const leadValidation = {
  create: {
    body: {
      pipeline_id: { required: true, type: 'string', uuid: true },
      stage_id: { required: true, type: 'string', uuid: true },
      lead_data: { required: true, type: 'object' },
      assigned_to: { type: 'string', uuid: true }
    }
  },
  update: {
    body: {
      stage_id: { type: 'string', uuid: true },
      lead_data: { type: 'object' },
      assigned_to: { type: 'string', uuid: true }
    }
  },
  moveStage: {
    body: {
      stage_id: { required: true, type: 'string', uuid: true },
      reason: { type: 'string', max: 500 }
    }
  }
};

/**
 * GET /api/leads - Listar leads com filtros
 */
router.get('/', 
  validateRequest({
    query: {
      page: { type: 'number', min: 1 },
      limit: { type: 'number', min: 1, max: 100 },
      search: { type: 'string', max: 255 },
      pipeline_id: { type: 'string', uuid: true },
      stage_id: { type: 'string', uuid: true },
      assigned_to: { type: 'string', uuid: true },
      date_from: { type: 'string' },
      date_to: { type: 'string' }
    }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      search,
      pipeline_id,
      stage_id,
      assigned_to,
      date_from,
      date_to
    } = req.query;

    if (!req.user?.tenant_id) {
      throw new ForbiddenError('Usuário deve pertencer a uma empresa');
    }

    // 1. Construir query base
    let query = supabase
      .from('pipeline_leads')
      .select(`
        *,
        pipelines!inner(id, name, tenant_id),
        pipeline_stages(id, name, color)
      `, { count: 'exact' })
      .eq('pipelines.tenant_id', req.user.tenant_id);

    // 2. Aplicar filtros de permissão
    if (req.user.role === 'member') {
      query = query.or(`assigned_to.eq.${req.user.id},created_by.eq.${req.user.id}`);
    }

    // 3. Aplicar filtros
    if (pipeline_id) {
      query = query.eq('pipeline_id', pipeline_id);
    }

    if (stage_id) {
      query = query.eq('stage_id', stage_id);
    }

    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to);
    }

    if (search) {
      query = query.or(`
        lead_data->>name.ilike.%${search}%,
        lead_data->>email.ilike.%${search}%,
        lead_data->>phone.ilike.%${search}%,
        lead_data->>company.ilike.%${search}%
      `);
    }

    if (date_from) {
      query = query.gte('created_at', date_from);
    }

    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    // 4. Paginação
    const offset = ((page as number) - 1) * (limit as number);
    query = query
      .range(offset, offset + (limit as number) - 1)
      .order('created_at', { ascending: false });

    // 5. Executar query
    const { data: leads, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao buscar leads: ${error.message}`);
    }

    const totalPages = Math.ceil((count || 0) / (limit as number));

    const response: ApiResponse = {
      success: true,
      data: leads || [],
      meta: {
        page: page as number,
        limit: limit as number,
        total: count || 0,
        totalPages
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * GET /api/leads/:id - Buscar lead por ID
 */
router.get('/:id',
  validateRequest(schemas.uuidParam),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!req.user?.tenant_id) {
      throw new ForbiddenError('Usuário deve pertencer a uma empresa');
    }

    // 1. Buscar lead
    let query = supabase
      .from('pipeline_leads')
      .select(`
        *,
        pipelines!inner(id, name, tenant_id),
        pipeline_stages(id, name, color)
      `)
      .eq('id', id)
      .eq('pipelines.tenant_id', req.user.tenant_id);

    if (req.user.role === 'member') {
      query = query.or(`assigned_to.eq.${req.user.id},created_by.eq.${req.user.id}`);
    }

    const { data: lead, error } = await query.single();

    if (error || !lead) {
      throw new NotFoundError('Lead não encontrado');
    }

    const response: ApiResponse = {
      success: true,
      data: lead,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * POST /api/leads - Criar novo lead
 */
router.post('/',
  validateRequest(leadValidation.create),
  asyncHandler(async (req: Request, res: Response) => {
    const { pipeline_id, stage_id, lead_data, assigned_to } = req.body;

    if (!req.user?.tenant_id) {
      throw new ForbiddenError('Usuário deve pertencer a uma empresa');
    }

    // 1. Verificar pipeline
    const { data: pipeline } = await supabase
      .from('pipelines')
      .select('id, name')
      .eq('id', pipeline_id)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (!pipeline) {
      throw new NotFoundError('Pipeline não encontrado');
    }

    // 2. Verificar estágio
    const { data: stage } = await supabase
      .from('pipeline_stages')
      .select('id, name')
      .eq('id', stage_id)
      .eq('pipeline_id', pipeline_id)
      .single();

    if (!stage) {
      throw new NotFoundError('Estágio não encontrado');
    }

    // 3. Criar lead
    const { data: newLead, error } = await supabase
      .from('pipeline_leads')
      .insert([{
        pipeline_id,
        stage_id,
        lead_data,
        assigned_to: assigned_to || null,
        created_by: req.user.id,
        moved_at: new Date().toISOString()
      }])
      .select(`
        *,
        pipelines(name),
        pipeline_stages(name, color)
      `)
      .single();

    if (error) {
      throw new Error(`Erro ao criar lead: ${error.message}`);
    }

    console.log(`✅ Lead criado no pipeline ${pipeline.name} por ${req.user.email}`);

    const response: ApiResponse = {
      success: true,
      data: newLead,
      message: 'Lead criado com sucesso',
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  })
);

/**
 * PUT /api/leads/:id - Atualizar lead
 */
router.put('/:id',
  validateRequest({
    ...schemas.uuidParam,
    ...leadValidation.update
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    if (!req.user?.tenant_id) {
      throw new ForbiddenError('Usuário deve pertencer a uma empresa');
    }

    // 1. Verificar lead
    let query = supabase
      .from('pipeline_leads')
      .select(`
        *,
        pipelines!inner(tenant_id)
      `)
      .eq('id', id)
      .eq('pipelines.tenant_id', req.user.tenant_id);

    if (req.user.role === 'member') {
      query = query.or(`assigned_to.eq.${req.user.id},created_by.eq.${req.user.id}`);
    }

    const { data: existingLead } = await query.single();

    if (!existingLead) {
      throw new NotFoundError('Lead não encontrado');
    }

    // 2. Atualizar
    if (updates.stage_id && updates.stage_id !== existingLead.stage_id) {
      updates.moved_at = new Date().toISOString();
    }

    const { data: updatedLead, error } = await supabase
      .from('pipeline_leads')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        pipeline_stages(name, color)
      `)
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar lead: ${error.message}`);
    }

    const response: ApiResponse = {
      success: true,
      data: updatedLead,
      message: 'Lead atualizado com sucesso',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * DELETE /api/leads/:id - Excluir lead
 */
router.delete('/:id',
  requireRole(['admin', 'super_admin']),
  validateRequest(schemas.uuidParam),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!req.user?.tenant_id) {
      throw new ForbiddenError('Usuário deve pertencer a uma empresa');
    }

    // 1. Verificar lead
    const { data: existingLead } = await supabase
      .from('pipeline_leads')
      .select(`
        *,
        pipelines!inner(tenant_id, name)
      `)
      .eq('id', id)
      .eq('pipelines.tenant_id', req.user.tenant_id)
      .single();

    if (!existingLead) {
      throw new NotFoundError('Lead não encontrado');
    }

    // 2. Excluir
    const { error } = await supabase
      .from('pipeline_leads')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir lead: ${error.message}`);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Lead excluído com sucesso',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

// 🚀 NOVO ENDPOINT - Geração assíncrona de tarefas de cadência
router.post('/generate-cadence-tasks', async (req, res) => {
  try {
    const { leadId, stageId } = req.body;

    if (!leadId || !stageId) {
      return res.status(400).json({ 
        error: 'leadId e stageId são obrigatórios' 
      });
    }

    console.log('🔄 Endpoint: Iniciando geração assíncrona de tarefas');

    // Executar geração de tarefas em background
    const result = await LeadService.generateCadenceTasksForLeadEndpoint(leadId, stageId);

    // Responder imediatamente, sem aguardar conclusão
    res.status(202).json({ 
      message: 'Geração de tarefas iniciada em background',
      ...result
    });

  } catch (error: any) {
    console.error('❌ Erro no endpoint de geração de tarefas:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

export default router; 
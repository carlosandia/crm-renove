/**
 * ============================================
 * 🛣️ ROUTES: OUTCOME REASONS
 * ============================================
 * 
 * Rotas para sistema de motivos de ganho/perda
 * AIDEV-NOTE: Validação Zod obrigatória em todas as rotas
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../services/supabase-admin';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/zodValidation';
import { 
  CreateOutcomeReasonRequestSchema,
  UpdateOutcomeReasonRequestSchema,
  ApplyOutcomeRequestSchema,
  GetOutcomeReasonsQuerySchema,
  DefaultOutcomeReasonsSchema
} from '../shared/schemas/outcome-reasons';

const router = Router();

// ============================================
// MIDDLEWARE GLOBAL
// ============================================

router.use(authenticateToken);

// ============================================
// SCHEMAS DE VALIDAÇÃO PARA PARAMS
// ============================================

const ParamsWithIdSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido')
});

const ParamsWithLeadIdSchema = z.object({
  leadId: z.string().uuid('Lead ID deve ser um UUID válido')
});

const ReorderRequestSchema = z.object({
  pipeline_id: z.string().uuid('Pipeline ID deve ser um UUID válido'),
  reason_ids: z.array(z.string().uuid()).min(1, 'Lista de IDs não pode estar vazia')
});

// ============================================
// GET /api/outcome-reasons - Buscar motivos
// ============================================

router.get('/', validateRequest({ query: GetOutcomeReasonsQuerySchema }), async (req, res) => {
  try {
    const { pipeline_id, reason_type = 'all', active_only = true } = req.query;
    const { tenant_id } = req.user!;

    // ✅ Query direta do banco usando client interno do supabaseAdmin
    let query = supabaseAdmin.getClient()
      .from('pipeline_outcome_reasons')
      .select('*')
      .eq('pipeline_id', pipeline_id)
      .eq('tenant_id', tenant_id)
      .order('display_order', { ascending: true });

    // Aplicar filtros condicionalmente
    if (reason_type !== 'all') {
      query = query.eq('reason_type', reason_type);
    }

    if (active_only) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar motivos:', error);
      return res.status(500).json({ 
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Erro na rota GET /outcome-reasons:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// ============================================
// POST /api/outcome-reasons - Criar motivo
// ============================================

router.post('/', validateRequest({ body: CreateOutcomeReasonRequestSchema }), async (req, res) => {
  try {
    const { pipeline_id, reason_type, reason_text, display_order } = req.body;
    const { tenant_id, id: user_id } = req.user!;

    // ✅ Verificar se pipeline pertence ao tenant
    const { data: pipeline, error: pipelineError } = await supabaseAdmin
      .getClient()
      .from('pipelines')
      .select('id')
      .eq('id', pipeline_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (pipelineError || !pipeline) {
      return res.status(404).json({ message: 'Pipeline não encontrado' });
    }

    // ✅ Calcular display_order se não fornecido
    let finalDisplayOrder = display_order;
    if (finalDisplayOrder === undefined) {
      const { data: lastReason } = await supabaseAdmin
        .getClient()
        .from('pipeline_outcome_reasons')
        .select('display_order')
        .eq('pipeline_id', pipeline_id)
        .eq('tenant_id', tenant_id)
        .eq('reason_type', reason_type)
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

      finalDisplayOrder = (lastReason?.display_order || -1) + 1;
    }

    // ✅ Inserir novo motivo
    const { data: newReason, error } = await supabaseAdmin
      .getClient()
      .from('pipeline_outcome_reasons')
      .insert({
        pipeline_id,
        tenant_id,
        reason_type,
        reason_text: reason_text.trim(),
        display_order: finalDisplayOrder,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar motivo:', error);
      return res.status(500).json({ 
        message: 'Erro ao criar motivo',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }

    res.status(201).json(newReason);
  } catch (error) {
    console.error('Erro na rota POST /outcome-reasons:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// ============================================
// PUT /api/outcome-reasons/:id - Atualizar motivo
// ============================================

router.put('/:id', 
  validateRequest({ 
    params: ParamsWithIdSchema,
    body: UpdateOutcomeReasonRequestSchema 
  }), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const { tenant_id } = req.user!;
      const updateData = req.body;

      // ✅ Verificar se motivo existe e pertence ao tenant
      const { data: existingReason, error: findError } = await supabaseAdmin
        .getClient()
        .from('pipeline_outcome_reasons')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenant_id)
        .single();

      if (findError || !existingReason) {
        return res.status(404).json({ message: 'Motivo não encontrado' });
      }

      // ✅ Preparar dados para atualização
      const dataToUpdate: any = {};
      if (updateData.reason_text !== undefined) {
        dataToUpdate.reason_text = updateData.reason_text.trim();
      }
      if (updateData.display_order !== undefined) {
        dataToUpdate.display_order = updateData.display_order;
      }
      if (updateData.reason_type !== undefined) {
        dataToUpdate.reason_type = updateData.reason_type;
      }

      // ✅ Atualizar motivo
      const { data: updatedReason, error } = await supabaseAdmin
        .getClient()
        .from('pipeline_outcome_reasons')
        .update(dataToUpdate)
        .eq('id', id)
        .eq('tenant_id', tenant_id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar motivo:', error);
        return res.status(500).json({ 
          message: 'Erro ao atualizar motivo',
          error: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }

      res.json(updatedReason);
    } catch (error) {
      console.error('Erro na rota PUT /outcome-reasons/:id:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
);

// ============================================
// DELETE /api/outcome-reasons/:id - Deletar motivo
// ============================================

router.delete('/:id', validateRequest({ params: ParamsWithIdSchema }), async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user!;

    // ✅ Verificar se motivo existe e pertence ao tenant
    const { data: existingReason, error: findError } = await supabaseAdmin
      .getClient()
      .from('pipeline_outcome_reasons')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single();

    if (findError || !existingReason) {
      return res.status(404).json({ message: 'Motivo não encontrado' });
    }

    // ✅ Deletar motivo (CASCADE vai lidar com referências)
    const { error } = await supabaseAdmin
      .getClient()
      .from('pipeline_outcome_reasons')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant_id);

    if (error) {
      console.error('Erro ao deletar motivo:', error);
      return res.status(500).json({ 
        message: 'Erro ao deletar motivo',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro na rota DELETE /outcome-reasons/:id:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// ============================================
// POST /api/outcome-reasons/reorder - Reordenar motivos
// ============================================

router.post('/reorder', validateRequest({ body: ReorderRequestSchema }), async (req, res) => {
  try {
    const { pipeline_id, reason_ids } = req.body;
    const { tenant_id } = req.user!;

    // ✅ Verificar se pipeline pertence ao tenant
    const { data: pipeline, error: pipelineError } = await supabaseAdmin
      .getClient()
      .from('pipelines')
      .select('id')
      .eq('id', pipeline_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (pipelineError || !pipeline) {
      return res.status(404).json({ message: 'Pipeline não encontrado' });
    }

    // ✅ Atualizar display_order em batch
    const updatePromises = reason_ids.map((reasonId: string, index: number) => 
      supabaseAdmin
        .getClient()
        .from('pipeline_outcome_reasons')
        .update({ display_order: index })
        .eq('id', reasonId)
        .eq('tenant_id', tenant_id)
        .eq('pipeline_id', pipeline_id)
    );

    const results = await Promise.all(updatePromises);
    
    // ✅ Verificar se alguma atualização falhou
    const hasError = results.some(result => result.error);
    if (hasError) {
      console.error('Erro ao reordenar motivos:', results.filter(r => r.error));
      return res.status(500).json({ message: 'Erro ao reordenar motivos' });
    }

    res.json({ message: 'Motivos reordenados com sucesso' });
  } catch (error) {
    console.error('Erro na rota POST /outcome-reasons/reorder:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// ============================================
// POST /api/outcome-reasons/apply - Aplicar motivo
// ============================================

router.post('/apply', validateRequest({ body: ApplyOutcomeRequestSchema }), async (req, res) => {
  try {
    const { lead_id, outcome_type, reason_id, reason_text, notes } = req.body;
    const { tenant_id, id: user_id } = req.user!;

    // ✅ Log para debug
    console.log('📋 [Apply Outcome] Payload recebido:', {
      lead_id,
      outcome_type,
      reason_id,
      reason_text,
      notes,
      tenant_id,
      user_id
    });

    // ✅ Validação extra
    if (!reason_text || reason_text.trim().length === 0) {
      return res.status(400).json({ message: 'Reason text é obrigatório' });
    }

    // ✅ Verificar se lead existe e pertence ao tenant
    const { data: lead, error: leadError } = await supabaseAdmin
      .getClient()
      .from('pipeline_leads')
      .select('id, pipeline_id')
      .eq('id', lead_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ message: 'Lead não encontrado' });
    }

    // ✅ Se reason_id foi fornecido, verificar se existe
    if (reason_id) {
      const { data: reason, error: reasonError } = await supabaseAdmin
        .getClient()
        .from('pipeline_outcome_reasons')
        .select('id')
        .eq('id', reason_id)
        .eq('tenant_id', tenant_id)
        .single();

      if (reasonError || !reason) {
        return res.status(404).json({ message: 'Motivo não encontrado' });
      }
    }

    // ✅ Inserir histórico
    const { data: history, error } = await supabaseAdmin
      .getClient()
      .from('lead_outcome_history')
      .insert({
        lead_id,
        pipeline_id: lead.pipeline_id,
        tenant_id,
        outcome_type,
        reason_id: reason_id || null,
        reason_text: reason_text.trim(),
        notes: notes?.trim() || null,
        applied_by: user_id
      })
      .select('*')
      .single();

    if (error) {
      console.error('❌ [Apply Outcome] Erro detalhado:', {
        error,
        payload: { lead_id, outcome_type, reason_id, reason_text, notes, tenant_id, user_id },
        leadExists: !!lead
      });
      return res.status(500).json({ 
        message: 'Erro ao aplicar motivo',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }

    res.status(201).json(history);
  } catch (error) {
    console.error('Erro na rota POST /outcome-reasons/apply:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// ============================================
// GET /api/outcome-reasons/history/:leadId - Histórico de um lead
// ============================================

router.get('/history/:leadId', 
  validateRequest({ params: ParamsWithLeadIdSchema }), 
  async (req, res) => {
    try {
      const { leadId } = req.params;
      const { tenant_id } = req.user!;

      // ✅ Usar função helper do banco
      const { data, error } = await supabaseAdmin.getClient().rpc('get_lead_outcome_history', {
        p_lead_id: leadId
      });

      if (error) {
        console.error('Erro ao buscar histórico:', error);
        return res.status(500).json({ 
          message: 'Erro interno do servidor',
          error: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }

      res.json(data || []);
    } catch (error) {
      console.error('Erro na rota GET /outcome-reasons/history/:leadId:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
);

// ============================================
// POST /api/outcome-reasons/defaults - Criar motivos padrão
// ============================================

router.post('/defaults', 
  validateRequest({ 
    body: z.object({ 
      pipeline_id: z.string().uuid('Pipeline ID deve ser um UUID válido') 
    }) 
  }), 
  async (req, res) => {
    try {
      const { pipeline_id } = req.body;
      const { tenant_id } = req.user!;

      // ✅ Verificar se pipeline pertence ao tenant
      const { data: pipeline, error: pipelineError } = await supabaseAdmin
        .getClient()
        .from('pipelines')
        .select('id')
        .eq('id', pipeline_id)
        .eq('tenant_id', tenant_id)
        .single();

      if (pipelineError || !pipeline) {
        return res.status(404).json({ message: 'Pipeline não encontrado' });
      }

      // ✅ Buscar motivos padrão
      const defaultReasons = DefaultOutcomeReasonsSchema.parse({});

      // ✅ Preparar dados para inserção
      const reasonsToInsert = [
        ...defaultReasons.won.map((text: string, index: number) => ({
          pipeline_id,
          tenant_id,
          reason_type: 'won' as const,
          reason_text: text,
          display_order: index,
          is_active: true
        })),
        ...defaultReasons.lost.map((text: string, index: number) => ({
          pipeline_id,
          tenant_id,
          reason_type: 'lost' as const,
          reason_text: text,
          display_order: index,
          is_active: true
        }))
      ];

      // ✅ Inserir motivos padrão
      const { data: newReasons, error } = await supabaseAdmin
        .getClient()
        .from('pipeline_outcome_reasons')
        .insert(reasonsToInsert)
        .select();

      if (error) {
        console.error('Erro ao criar motivos padrão:', error);
        return res.status(500).json({ 
          message: 'Erro ao criar motivos padrão',
          error: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }

      res.status(201).json(newReasons);
    } catch (error) {
      console.error('Erro na rota POST /outcome-reasons/defaults:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
);

// ============================================
// GET /api/outcome-reasons/system-defaults - Buscar motivos padrão do sistema (SEM AUTENTICAÇÃO)
// ============================================

// ✅ Rota pública - remover autenticação para motivos padrão
const systemDefaultsRouter = Router();

systemDefaultsRouter.get('/system-defaults', async (req, res) => {
  try {
    // ✅ Retornar motivos padrão definidos no schema
    const defaultReasons = DefaultOutcomeReasonsSchema.parse({});
    res.json(defaultReasons);
  } catch (error) {
    console.error('Erro na rota GET /outcome-reasons/system-defaults:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Exportar tanto o router autenticado quanto o público
export default router;
export { systemDefaultsRouter };
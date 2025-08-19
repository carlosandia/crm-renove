/**
 * ============================================
 * 🎯 ROTAS OUTCOME REASONS
 * ============================================
 * 
 * Sistema completo para gerenciamento de motivos de ganho/perda
 * AIDEV-NOTE: Seguindo padrões de arquitetura multi-tenant
 */

import { Router } from 'express';
import { z } from 'zod';
import supabase from '../config/supabase';
import { simpleAuth } from '../middleware/simpleAuth';

const router = Router();

// ============================================
// SCHEMAS ZOD PARA VALIDAÇÃO
// ============================================

const CreateOutcomeReasonSchema = z.object({
  pipeline_id: z.string().uuid(),
  reason_type: z.enum(['ganho', 'perdido', 'won', 'lost']), // ganho/perdido preferidos, won/lost para compatibilidade
  reason_text: z.string().min(1).max(200).trim(),
  display_order: z.number().int().min(0).optional(),
  created_by: z.string().uuid(), // ✅ CORREÇÃO: Incluir created_by para RLS
  tenant_id: z.string().uuid() // ✅ CORREÇÃO: Incluir tenant_id explicitamente
});

const UpdateOutcomeReasonSchema = CreateOutcomeReasonSchema.partial();

const ApplyOutcomeRequestSchema = z.object({
  lead_id: z.string().uuid(),
  outcome_type: z.enum(['ganho', 'perdido', 'won', 'lost']), // ganho/perdido preferidos, won/lost para compatibilidade
  reason_id: z.string().uuid().optional(),
  reason_text: z.string().min(1).trim(),
  notes: z.string().max(500).trim().optional()
});

const GetOutcomeReasonsQuerySchema = z.object({
  pipeline_id: z.string().uuid(),
  reason_type: z.enum(['ganho', 'perdido', 'won', 'lost', 'all']).optional().default('all'), // ganho/perdido preferidos, won/lost para compatibilidade
  active_only: z.string().transform(val => val === 'true').optional().default('true')
});

// ============================================
// MOTIVOS PADRÃO DO SISTEMA
// ============================================

const DEFAULT_REASONS = {
  ganho: [
    'Preço competitivo',
    'Melhor proposta técnica', 
    'Relacionamento/confiança',
    'Urgência do cliente',
    'Recomendação/indicação'
  ],
  perdido: [
    'Preço muito alto',
    'Concorrente escolhido',
    'Não era o momento',
    'Não há orçamento',
    'Não era fit para o produto'
  ],
  // ✅ COMPATIBILIDADE: Manter formatos antigos para migration suave
  won: [
    'Preço competitivo',
    'Melhor proposta técnica', 
    'Relacionamento/confiança',
    'Urgência do cliente',
    'Recomendação/indicação'
  ],
  lost: [
    'Preço muito alto',
    'Concorrente escolhido',
    'Não era o momento',
    'Não há orçamento',
    'Não era fit para o produto'
  ]
};

// ============================================
// MIDDLEWARE DE VALIDAÇÃO
// ============================================

const validateTenantAccess = async (req: any, res: any, next: any) => {
  try {
    const { tenant_id } = req.user;
    const pipelineId = req.body.pipeline_id || req.query.pipeline_id;

    if (!pipelineId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Pipeline ID é obrigatório' 
      });
    }

    // Verificar se o pipeline pertence ao tenant
    const { data: pipeline, error } = await supabase
      .from('pipelines')
      .select('id')
      .eq('id', pipelineId)
      .eq('tenant_id', tenant_id)
      .single();

    if (error || !pipeline) {
      return res.status(403).json({ 
        success: false, 
        error: 'Pipeline não encontrado ou sem permissão' 
      });
    }

    next();
  } catch (error: any) {
    console.error('❌ [validateTenantAccess] Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro na validação de acesso' 
    });
  }
};

// ============================================
// ROTAS CRUD
// ============================================

// 🔍 GET /outcome-reasons - Listar motivos
router.get('/', simpleAuth, async (req: any, res: any) => {
  try {
    const query = GetOutcomeReasonsQuerySchema.parse(req.query);
    const { tenant_id } = req.user;

    let queryBuilder = supabase
      .from('pipeline_outcome_reasons')
      .select('*')
      .eq('pipeline_id', query.pipeline_id)
      .order('display_order', { ascending: true });

    // Filtrar por tenant via pipeline
    const { data: pipeline } = await supabase
      .from('pipelines')
      .select('id')
      .eq('id', query.pipeline_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (!pipeline) {
      return res.status(403).json({ 
        success: false, 
        error: 'Pipeline não encontrado' 
      });
    }

    // ✅ REFATORAÇÃO: Mapear valores antigos para novos e filtrar por tipo se especificado
    if (query.reason_type !== 'all') {
      let mappedType = query.reason_type;
      // Mapear valores antigos para novos
      if (query.reason_type === 'won') mappedType = 'ganho';
      if (query.reason_type === 'lost') mappedType = 'perdido';
      
      queryBuilder = queryBuilder.eq('reason_type', mappedType);
    }

    // Filtrar apenas ativos se solicitado
    if (query.active_only) {
      queryBuilder = queryBuilder.eq('is_active', true);
    }

    const { data: reasons, error } = await queryBuilder;

    if (error) {
      throw error;
    }

    // ✅ CORREÇÃO: Normalizar tipos para ganho/perdido antes de retornar
    const normalizedReasons = (reasons || []).map(reason => ({
      ...reason,
      reason_type: reason.reason_type === 'won' || reason.reason_type === 'win' ? 'ganho' :
                   reason.reason_type === 'lost' || reason.reason_type === 'loss' || reason.reason_type === 'perda' ? 'perdido' :
                   reason.reason_type // manter ganho/perdido como estão
    }));

    // ✅ CORREÇÃO: Logs detalhados para debugging
    console.log(`🔍 [GET /outcome-reasons] RESPOSTA DETALHADA:`, {
      pipelineId: query.pipeline_id.substring(0, 8),
      rawReasonsCount: (reasons || []).length,
      normalizedReasonsCount: normalizedReasons.length,
      ganhoCount: normalizedReasons.filter(r => r.reason_type === 'ganho').length,
      perdidoCount: normalizedReasons.filter(r => r.reason_type === 'perdido').length,
      firstRaw: (reasons || [])[0] ? {
        id: (reasons || [])[0].id?.substring(0, 8),
        type: (reasons || [])[0].reason_type,
        text: (reasons || [])[0].reason_text?.substring(0, 30)
      } : null,
      firstNormalized: normalizedReasons[0] ? {
        id: normalizedReasons[0].id?.substring(0, 8),
        type: normalizedReasons[0].reason_type,
        text: normalizedReasons[0].reason_text?.substring(0, 30)
      } : null
    });

    res.json({
      success: true,
      data: normalizedReasons
    });

  } catch (error: any) {
    console.error('❌ [GET /outcome-reasons] Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao buscar motivos' 
    });
  }
});

// 📝 POST /outcome-reasons - Criar motivo
router.post('/', simpleAuth, validateTenantAccess, async (req: any, res: any) => {
  try {
    const data = CreateOutcomeReasonSchema.parse(req.body);
    const { tenant_id } = req.user;

    // ✅ CORREÇÃO CRÍTICA: Log detalhado dos dados que serão inseridos
    // Usar created_by e tenant_id do payload (já validados pelo schema)
    const insertData = {
      ...data,
      is_active: true,
      display_order: data.display_order || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log(`🚀 [POST /outcome-reasons] INICIANDO INSERÇÃO:`, {
      pipelineId: data.pipeline_id.substring(0, 8),
      tenantId: data.tenant_id.substring(0, 8),
      createdBy: data.created_by.substring(0, 8),
      reasonType: data.reason_type,
      reasonText: data.reason_text.substring(0, 50),
      displayOrder: insertData.display_order,
      timestamp: new Date().toISOString()
    });

    // ✅ CORREÇÃO CRÍTICA: Usar supabaseAdmin para bypass RLS e garantir persistência
    console.log('🔄 [POST /outcome-reasons] EXECUTANDO INSERÇÃO COM SERVICE ROLE:', {
      table: 'pipeline_outcome_reasons',
      insertData: {
        ...insertData,
        tenant_id: insertData.tenant_id.substring(0, 8),
        pipeline_id: insertData.pipeline_id.substring(0, 8),
        created_by: insertData.created_by.substring(0, 8)
      },
      usingServiceRole: true
    });

    const { data: insertedData, error } = await supabaseAdmin
      .from('pipeline_outcome_reasons')
      .insert(insertData)
      .select();

    console.log('📡 [POST /outcome-reasons] RESPOSTA SUPABASE SERVICE ROLE:', {
      success: !error,
      insertedCount: insertedData?.length || 0,
      hasError: !!error,
      errorCode: error?.code,
      errorMessage: error?.message,
      serviceRoleUsed: true,
      bypassRLS: true
    });

    if (error) {
      console.error(`❌ [POST /outcome-reasons] ERRO CRÍTICO SUPABASE:`, {
        pipelineId: data.pipeline_id.substring(0, 8),
        tenantId: data.tenant_id.substring(0, 8),
        createdBy: data.created_by.substring(0, 8),
        error: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        code: error.code,
        hint: error.hint,
        details: error.details,
        insertData: insertData
      });
      throw error;
    }

    // ✅ CORREÇÃO CRÍTICA: Validar se dados foram realmente inseridos
    if (!insertedData || insertedData.length === 0) {
      console.error(`❌ [POST /outcome-reasons] FALHA CRÍTICA - Inserção não retornou dados:`, {
        pipelineId: data.pipeline_id.substring(0, 8),
        tenantId: data.tenant_id.substring(0, 8),
        createdBy: data.created_by.substring(0, 8),
        insertedData: insertedData,
        insertedDataType: typeof insertedData,
        insertedDataLength: insertedData?.length || 0,
        originalPayload: {
          pipeline_id: data.pipeline_id.substring(0, 8),
          tenant_id: data.tenant_id.substring(0, 8),
          created_by: data.created_by.substring(0, 8),
          reason_type: data.reason_type,
          reason_text: data.reason_text.substring(0, 50)
        },
        possibleCauses: [
          'RLS policy blocking insert',
          'Missing tenant_id validation',
          'Database constraints failed',
          'Invalid data format'
        ]
      });
      
      return res.status(500).json({
        success: false,
        error: 'Falha ao inserir motivo - operação não retornou dados',
        details: 'Possível problema com RLS ou constraints do banco',
        debug: {
          insertedData,
          insertedDataLength: insertedData?.length || 0
        }
      });
    }

    const newReason = insertedData[0]; // Pegar primeiro item do array retornado

    console.log(`🎉 [POST /outcome-reasons] MOTIVO CRIADO COM SUCESSO (SERVICE ROLE):`, {
      id: newReason.id.substring(0, 8),
      reasonType: newReason.reason_type,
      reasonText: newReason.reason_text.substring(0, 50),
      displayOrder: newReason.display_order,
      isActive: newReason.is_active,
      createdAt: newReason.created_at,
      persistedSuccessfully: true,
      serviceRoleBypass: true
    });

    res.status(201).json({
      success: true,
      data: newReason
    });

  } catch (error: any) {
    console.error('❌ [POST /outcome-reasons] Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao criar motivo' 
    });
  }
});

// ✏️ PUT /outcome-reasons/:id - Atualizar motivo
router.put('/:id', simpleAuth, async (req: any, res: any) => {
  try {
    const reasonId = req.params.id;
    const data = UpdateOutcomeReasonSchema.parse(req.body);
    const { tenant_id } = req.user;

    // Verificar se o motivo pertence ao tenant
    const { data: existingReason, error: checkError } = await supabase
      .from('pipeline_outcome_reasons')
      .select('id, pipeline_id')
      .eq('id', reasonId)
      .eq('tenant_id', tenant_id)
      .single();

    if (checkError || !existingReason) {
      return res.status(404).json({ 
        success: false, 
        error: 'Motivo não encontrado' 
      });
    }

    const { data: updatedReason, error } = await supabaseAdmin
      .from('pipeline_outcome_reasons')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', reasonId)
      .eq('tenant_id', tenant_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: updatedReason
    });

  } catch (error: any) {
    console.error('❌ [PUT /outcome-reasons] Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao atualizar motivo' 
    });
  }
});

// 🗑️ DELETE /outcome-reasons/:id - Deletar motivo
router.delete('/:id', simpleAuth, async (req: any, res: any) => {
  try {
    const reasonId = req.params.id;
    const { tenant_id } = req.user;

    // Verificar se o motivo pertence ao tenant
    const { data: existingReason, error: checkError } = await supabase
      .from('pipeline_outcome_reasons')
      .select('id, pipeline_id')
      .eq('id', reasonId)
      .eq('tenant_id', tenant_id)
      .single();

    if (checkError || !existingReason) {
      return res.status(404).json({ 
        success: false, 
        error: 'Motivo não encontrado' 
      });
    }

    const { error } = await supabaseAdmin
      .from('pipeline_outcome_reasons')
      .delete()
      .eq('id', reasonId)
      .eq('tenant_id', tenant_id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Motivo removido com sucesso'
    });

  } catch (error: any) {
    console.error('❌ [DELETE /outcome-reasons] Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao deletar motivo' 
    });
  }
});

// ============================================
// ROTAS ESPECIAIS
// ============================================

// 🎯 POST /outcome-reasons/apply - Aplicar motivo a lead
router.post('/apply', simpleAuth, async (req: any, res: any) => {
  try {
    const data = ApplyOutcomeRequestSchema.parse(req.body);
    const { tenant_id, user_id } = req.user;

    // Verificar se o lead pertence ao tenant
    const { data: lead, error: leadError } = await supabase
      .from('pipeline_leads')
      .select('id')
      .eq('id', data.lead_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ 
        success: false, 
        error: 'Lead não encontrado' 
      });
    }

    const { data: history, error } = await supabase
      .from('lead_outcome_history')
      .insert({
        lead_id: data.lead_id,
        outcome_type: data.outcome_type,
        reason_id: data.reason_id || null,
        reason_text: data.reason_text,
        notes: data.notes || null,
        applied_by: user_id,
        created_at: new Date().toISOString(),
        tenant_id
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data: history
    });

  } catch (error: any) {
    console.error('❌ [POST /outcome-reasons/apply] Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao aplicar motivo' 
    });
  }
});

// 📜 GET /outcome-reasons/history/:leadId - Histórico de motivos de um lead
router.get('/history/:leadId', simpleAuth, async (req: any, res: any) => {
  try {
    const { leadId } = req.params;
    const { tenant_id } = req.user;

    // Verificar se o lead pertence ao tenant
    const { data: lead, error: leadError } = await supabase
      .from('pipeline_leads')
      .select('id')
      .eq('id', leadId)
      .eq('tenant_id', tenant_id)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ 
        success: false, 
        error: 'Lead não encontrado' 
      });
    }

    const { data: history, error } = await supabase
      .from('lead_outcome_history')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: history || []
    });

  } catch (error: any) {
    console.error('❌ [GET /outcome-reasons/history] Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao buscar histórico' 
    });
  }
});

// 🏭 POST /outcome-reasons/defaults - Criar motivos padrão
router.post('/defaults', simpleAuth, validateTenantAccess, async (req: any, res: any) => {
  try {
    const { pipeline_id } = req.body;
    const { tenant_id } = req.user;

    const reasons: any[] = [];

    // ✅ REFATORAÇÃO: Criar motivos usando nova nomenclatura
    // Criar motivos de ganho
    DEFAULT_REASONS.ganho.forEach((reasonText, index) => {
      reasons.push({
        pipeline_id,
        tenant_id,
        reason_type: 'ganho', // ✅ Usar novo valor
        reason_text: reasonText,
        display_order: index,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });

    // Criar motivos de perdido
    DEFAULT_REASONS.perdido.forEach((reasonText, index) => {
      reasons.push({
        pipeline_id,
        tenant_id,
        reason_type: 'perdido', // ✅ Usar novo valor
        reason_text: reasonText,
        display_order: index,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });

    const { data: createdReasons, error } = await supabaseAdmin
      .from('pipeline_outcome_reasons')
      .insert(reasons)
      .select();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data: createdReasons || [],
      message: `${createdReasons?.length || 0} motivos padrão criados`
    });

  } catch (error: any) {
    console.error('❌ [POST /outcome-reasons/defaults] Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao criar motivos padrão' 
    });
  }
});

// 📋 GET /outcome-reasons/system-defaults - Buscar motivos padrão do sistema
router.get('/system-defaults', simpleAuth, async (req: any, res: any) => {
  try {
    res.json({
      success: true,
      data: DEFAULT_REASONS
    });
  } catch (error: any) {
    console.error('❌ [GET /outcome-reasons/system-defaults] Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao buscar motivos padrão' 
    });
  }
});

// 🔄 POST /outcome-reasons/reorder - Reordenar motivos
router.post('/reorder', simpleAuth, async (req: any, res: any) => {
  try {
    const { pipeline_id, reason_ids } = req.body;
    const { tenant_id } = req.user;

    if (!Array.isArray(reason_ids)) {
      return res.status(400).json({ 
        success: false, 
        error: 'reason_ids deve ser um array' 
      });
    }

    // Verificar se o pipeline pertence ao tenant
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id')
      .eq('id', pipeline_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (pipelineError || !pipeline) {
      return res.status(403).json({ 
        success: false, 
        error: 'Pipeline não encontrado' 
      });
    }

    // Atualizar ordem de cada motivo
    const updatePromises = reason_ids.map((reasonId: string, index: number) => 
      supabase
        .from('pipeline_outcome_reasons')
        .update({ 
          display_order: index,
          updated_at: new Date().toISOString()
        })
        .eq('id', reasonId)
        .eq('tenant_id', tenant_id)
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Ordem dos motivos atualizada'
    });

  } catch (error: any) {
    console.error('❌ [POST /outcome-reasons/reorder] Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao reordenar motivos' 
    });
  }
});

export default router;
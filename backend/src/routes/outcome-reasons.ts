/**
 * ============================================
 * 🎯 ROTAS OUTCOME REASONS
 * ============================================
 * 
 * Sistema completo para gerenciamento de motivos de ganho/perda
 * AIDEV-NOTE: Seguindo padrões de arquitetura multi-tenant
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import supabase from '../config/supabase';
import { simpleAuth } from '../middleware/simpleAuth';

// ✅ TYPES: Definições específicas para Request autenticado
interface AuthenticatedUser {
  id: string;
  email: string;
  tenant_id: string;
  role: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

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

const validateTenantAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ [validateTenantAccess] Erro:', errorMessage);
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
router.get('/', simpleAuth, async (req: AuthenticatedRequest, res: Response) => {
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

    // ✅ CORREÇÃO CRÍTICA: Implementar fallback JSON se tabela estiver vazia
    let finalReasons = reasons || [];
    
    if (!finalReasons || finalReasons.length === 0) {
      console.log('🔄 [GET /outcome-reasons] Tabela vazia, buscando fallback no JSON da pipeline...');
      
      // Buscar JSON da pipeline para fallback
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .select('id, outcome_reasons, tenant_id')
        .eq('id', query.pipeline_id)
        .eq('tenant_id', tenant_id)
        .single();
      
      if (!pipelineError && pipelineData?.outcome_reasons) {
        const outcomeReasons = pipelineData.outcome_reasons;
        const convertedReasons = [];
        
        // Converter motivos de ganho
        if (outcomeReasons.ganho_reasons && Array.isArray(outcomeReasons.ganho_reasons)) {
          outcomeReasons.ganho_reasons.forEach((reason: any, index: number) => {
            if (reason.is_active !== false) {
              convertedReasons.push({
                id: `json-ganho-${index}`, // ID temporário para compatibilidade
                pipeline_id: query.pipeline_id,
                tenant_id: pipelineData.tenant_id || tenant_id,
                reason_type: 'ganho',
                reason_text: reason.reason_text || reason.text || '',
                is_active: true,
                display_order: reason.display_order || index,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_from_json: true // Marcador para identificar origem
              });
            }
          });
        }
        
        // Converter motivos de perdido
        if (outcomeReasons.perdido_reasons && Array.isArray(outcomeReasons.perdido_reasons)) {
          outcomeReasons.perdido_reasons.forEach((reason: any, index: number) => {
            if (reason.is_active !== false) {
              convertedReasons.push({
                id: `json-perdido-${index}`, // ID temporário para compatibilidade
                pipeline_id: query.pipeline_id,
                tenant_id: pipelineData.tenant_id || tenant_id,
                reason_type: 'perdido',
                reason_text: reason.reason_text || reason.text || '',
                is_active: true,
                display_order: reason.display_order || index,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_from_json: true // Marcador para identificar origem
              });
            }
          });
        }
        
        // Filtrar por tipo se especificado
        if (query.reason_type !== 'all') {
          let targetType = query.reason_type;
          // Mapear valores antigos para novos
          if (query.reason_type === 'won') targetType = 'ganho';
          if (query.reason_type === 'lost') targetType = 'perdido';
          
          finalReasons = convertedReasons.filter(reason => reason.reason_type === targetType);
        } else {
          finalReasons = convertedReasons;
        }
        
        console.log(`✅ [GET /outcome-reasons] Fallback JSON concluído:`, {
          totalConverted: convertedReasons.length,
          filtered: finalReasons.length,
          ganhoCount: convertedReasons.filter(r => r.reason_type === 'ganho').length,
          perdidoCount: convertedReasons.filter(r => r.reason_type === 'perdido').length,
          requestedType: query.reason_type
        });
      } else {
        console.log('⚠️ [GET /outcome-reasons] Pipeline sem outcome_reasons configurados');
      }
    }

    // ✅ CORREÇÃO: Normalizar tipos para ganho/perdido antes de retornar
    const normalizedReasons = finalReasons.map(reason => ({
      ...reason,
      reason_type: reason.reason_type === 'won' || reason.reason_type === 'win' ? 'ganho' :
                   reason.reason_type === 'lost' || reason.reason_type === 'loss' || reason.reason_type === 'perda' ? 'perdido' :
                   reason.reason_type // manter ganho/perdido como estão
    }));

    // ✅ CORREÇÃO: Logs detalhados para debugging
    console.log(`🔍 [GET /outcome-reasons] RESPOSTA DETALHADA:`, {
      pipelineId: query.pipeline_id.substring(0, 8),
      requestedType: query.reason_type,
      rawTableCount: (reasons || []).length,
      finalReasonsCount: finalReasons.length,
      normalizedReasonsCount: normalizedReasons.length,
      usedFallback: finalReasons.some(r => r.is_from_json),
      ganhoCount: normalizedReasons.filter(r => r.reason_type === 'ganho').length,
      perdidoCount: normalizedReasons.filter(r => r.reason_type === 'perdido').length,
      firstResult: normalizedReasons[0] ? {
        id: normalizedReasons[0].id?.substring(0, 8),
        type: normalizedReasons[0].reason_type,
        text: normalizedReasons[0].reason_text?.substring(0, 30),
        fromJson: normalizedReasons[0].is_from_json || false
      } : null
    });

    res.json({
      success: true,
      data: normalizedReasons
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ [GET /outcome-reasons] Erro:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: errorMessage || 'Erro ao buscar motivos' 
    });
  }
});

// 📝 POST /outcome-reasons - Criar motivo
router.post('/', simpleAuth, validateTenantAccess, async (req: AuthenticatedRequest, res: Response) => {
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

    const { data: insertedData, error } = await supabase
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
      id: newReason.id ? newReason.id.substring(0, 8) : 'UNDEFINED',
      reasonType: newReason.reason_type || 'UNDEFINED',
      reasonText: newReason.reason_text ? newReason.reason_text.substring(0, 50) : 'UNDEFINED',
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ [POST /outcome-reasons] Erro:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: errorMessage || 'Erro ao criar motivo' 
    });
  }
});

// ✏️ PUT /outcome-reasons/:id - Atualizar motivo
router.put('/:id', simpleAuth, async (req: AuthenticatedRequest, res: Response) => {
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

    const { data: updatedReason, error } = await supabase
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ [PUT /outcome-reasons] Erro:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: errorMessage || 'Erro ao atualizar motivo' 
    });
  }
});

// 🗑️ DELETE /outcome-reasons/:id - Deletar motivo
router.delete('/:id', simpleAuth, async (req: AuthenticatedRequest, res: Response) => {
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

    const { error } = await supabase
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ [DELETE /outcome-reasons] Erro:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: errorMessage || 'Erro ao deletar motivo' 
    });
  }
});

// ============================================
// ROTAS ESPECIAIS
// ============================================

// 🎯 POST /outcome-reasons/apply - Aplicar motivo a lead
router.post('/apply', simpleAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 🚨 INVESTIGAÇÃO FASE 1: Log detalhado de entrada da rota com estrutura req.user
    console.log('🔍 [APPLY OUTCOME] === INÍCIO DA ROTA ===', {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      hasAuth: !!req.headers.authorization,
      authHeader: req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'ausente',
      userFromAuth: {
        hasUser: !!req.user,
        userType: typeof req.user,
        userKeys: req.user ? Object.keys(req.user) : [],
        // ✅ ESTRUTURA DETALHADA: Todos os campos disponíveis em req.user
        userStructure: req.user ? {
          id: req.user.id ? req.user.id.substring(0, 8) + '...' : 'UNDEFINED',
          email: req.user.email || 'UNDEFINED',
          tenant_id: req.user.tenant_id ? req.user.tenant_id.substring(0, 8) + '...' : 'UNDEFINED',
          role: req.user.role || 'UNDEFINED',
          first_name: req.user.first_name || 'UNDEFINED',
          last_name: req.user.last_name || 'UNDEFINED',
          // ✅ VERIFICAÇÃO: Campo user_id não deve existir (era o problema original)
          user_id_exists: 'user_id' in req.user,
          user_id_value: req.user.user_id || 'UNDEFINED'
        } : null
      },
      requestBody: {
        hasBody: !!req.body,
        bodyType: typeof req.body,
        bodyKeys: Object.keys(req.body || {}),
        bodySize: JSON.stringify(req.body || {}).length
      }
    });

    // ✅ CORREÇÃO CRÍTICA: Log do request body raw antes da validação
    console.log('🔍 [POST /outcome-reasons/apply] Request body recebido:', {
      rawBody: req.body,
      bodyType: typeof req.body,
      bodyKeys: Object.keys(req.body || {}),
      leadId: req.body?.lead_id,
      outcomeType: req.body?.outcome_type,
      reasonText: req.body?.reason_text,
      reasonId: req.body?.reason_id,
      notes: req.body?.notes
    });

    // ✅ IMPLEMENTAÇÃO CONTEXT7 ZOD: Usar safeParse para handling graceful de erros
    const validationResult = ApplyOutcomeRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.error('❌ [POST /outcome-reasons/apply] ERRO DE VALIDAÇÃO ZOD:', {
        rawBody: req.body,
        zodErrors: validationResult.error.issues,
        errorDetails: validationResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          code: issue.code,
          message: issue.message,
          expected: issue.expected || 'N/A',
          received: issue.received || 'N/A'
        })),
        totalErrors: validationResult.error.issues.length
      });

      // ✅ Retornar erro 400 (Bad Request) em vez de 500 para validation errors
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos fornecidos',
        details: 'Verifique os campos obrigatórios e formatos esperados',
        validationErrors: validationResult.error.issues.map(issue => ({
          field: issue.path.join('.') || 'root',
          message: issue.message,
          code: issue.code
        }))
      });
    }

    const data = validationResult.data;
    const { tenant_id, id: user_id } = req.user; // ✅ CORREÇÃO CRÍTICA: req.user.id em vez de req.user.user_id

    // 🚨 INVESTIGAÇÃO FASE 1: Log após validação bem-sucedida com debug completo de req.user
    console.log('✅ [APPLY OUTCOME] Validação Zod passou - dados extraídos:', {
      validatedData: {
        leadId: data.lead_id ? data.lead_id.substring(0, 8) + '...' : 'UNDEFINED',
        outcomeType: data.outcome_type,
        reasonText: data.reason_text ? data.reason_text.substring(0, 30) + '...' : 'UNDEFINED',
        reasonId: data.reason_id ? data.reason_id.substring(0, 8) + '...' : 'null',
        notes: data.notes ? data.notes.substring(0, 30) + '...' : 'null'
      },
      // ✅ DEBUG COMPLETO: Verificação da correção aplicada na linha 614
      userContextDetails: {
        rawReqUser: req.user ? {
          hasId: 'id' in req.user,
          hasUserId: 'user_id' in req.user,
          actualKeys: Object.keys(req.user),
          idValue: req.user.id || 'UNDEFINED',
          userIdValue: req.user.user_id || 'UNDEFINED'
        } : null,
        extractedTenantId: tenant_id ? tenant_id.substring(0, 8) + '...' : 'UNDEFINED',
        extractedUserId: user_id ? user_id.substring(0, 8) + '...' : 'UNDEFINED',
        destructuringWorked: !!(tenant_id && user_id),
        correctionApplied: 'linha 614: { tenant_id, id: user_id } = req.user'
      },
      nextStep: 'Buscar lead na tabela pipeline_leads'
    });

    // ✅ CORREÇÃO CRÍTICA: Buscar lead com pipeline_id (campo obrigatório na tabela)
    const { data: lead, error: leadError } = await supabase
      .from('pipeline_leads')
      .select('id, pipeline_id')
      .eq('id', data.lead_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (leadError || !lead) {
      console.error('❌ [POST /outcome-reasons/apply] Lead não encontrado:', {
        leadId: data.lead_id.substring(0, 8),
        tenantId: tenant_id.substring(0, 8),
        leadError: leadError?.message,
        errorCode: leadError?.code
      });
      return res.status(404).json({ 
        success: false, 
        error: 'Lead não encontrado' 
      });
    }

    // ✅ VALIDAÇÃO DEFENSIVA: Verificar campos antes de usar .substring()
    console.log('✅ [POST /outcome-reasons/apply] Lead encontrado:', {
      leadId: lead.id ? lead.id.substring(0, 8) : 'UNDEFINED',
      pipelineId: lead.pipeline_id ? lead.pipeline_id.substring(0, 8) : 'UNDEFINED',
      tenantId: tenant_id ? tenant_id.substring(0, 8) : 'UNDEFINED'
    });

    // 🚨 CORREÇÃO CRÍTICA: Buscar tenant_id como UUID da tabela pipeline_leads
    // Problema identificado: lead_outcome_history.tenant_id é TEXT, mas pipeline_leads.tenant_id é UUID
    const { data: leadTenantInfo, error: leadTenantError } = await supabase
      .from('pipeline_leads')
      .select('tenant_id')
      .eq('id', data.lead_id)
      .single();

    if (leadTenantError || !leadTenantInfo) {
      console.error('❌ [POST /outcome-reasons/apply] Erro ao buscar tenant_id do lead:', {
        leadId: data.lead_id ? data.lead_id.substring(0, 8) : 'UNDEFINED',
        error: leadTenantError?.message,
        note: 'Necessário para conversão correta de UUID para TEXT'
      });
      return res.status(404).json({ 
        success: false, 
        error: 'Erro ao validar dados do lead' 
      });
    }

    console.log('🔍 [POST /outcome-reasons/apply] Dados de tenant validados:', {
      leadTenantId: leadTenantInfo.tenant_id,
      userTenantId: tenant_id,
      tenantMatch: leadTenantInfo.tenant_id === tenant_id,
      tenantConversion: 'UUID → TEXT'
    });

    // ✅ CORREÇÃO CRÍTICA: Incluir pipeline_id na inserção (campo obrigatório)
    const insertData = {
      lead_id: data.lead_id,
      pipeline_id: lead.pipeline_id, // ✅ Campo obrigatório obtido do lead
      outcome_type: data.outcome_type,
      reason_id: data.reason_id || null,
      reason_text: data.reason_text,
      notes: data.notes || null,
      applied_by: user_id,
      created_at: new Date().toISOString(),
      tenant_id: String(leadTenantInfo.tenant_id)  // ✅ CORREÇÃO CRÍTICA: Converter UUID para STRING (campo é TEXT)
    };

    // ✅ VALIDAÇÃO DEFENSIVA: Verificar todos os campos antes de usar .substring()
    console.log('📡 [POST /outcome-reasons/apply] Dados para inserção:', {
      leadId: insertData.lead_id ? insertData.lead_id.substring(0, 8) : 'UNDEFINED',
      pipelineId: insertData.pipeline_id ? insertData.pipeline_id.substring(0, 8) : 'UNDEFINED',
      outcomeType: insertData.outcome_type || 'UNDEFINED',
      reasonText: insertData.reason_text ? insertData.reason_text.substring(0, 30) : 'UNDEFINED',
      appliedBy: insertData.applied_by ? insertData.applied_by.substring(0, 8) : 'UNDEFINED',
      tenantId: insertData.tenant_id ? insertData.tenant_id.substring(0, 8) : 'UNDEFINED'
    });

    // 🚨 CORREÇÃO ADICIONAL: Validar FKs antes da inserção para evitar FK constraint violations
    // FK 1: Verificar se reason_id existe (apenas se fornecido)
    if (insertData.reason_id) {
      const { data: reasonExists, error: reasonError } = await supabase
        .from('pipeline_outcome_reasons')
        .select('id')
        .eq('id', insertData.reason_id)
        .single();

      if (reasonError || !reasonExists) {
        console.error('❌ [POST /outcome-reasons/apply] ERRO FK reason_id:', {
          reasonId: insertData.reason_id ? insertData.reason_id.substring(0, 8) : 'UNDEFINED',
          error: reasonError?.message,
          note: 'FK constraint lead_outcome_history_reason_id_fkey violação'
        });
        return res.status(400).json({ 
          success: false, 
          error: 'Motivo não encontrado na base de dados',
          details: 'Motivo pode ter sido removido ou não existe'
        });
      }
    }

    // FK 2: Verificar se applied_by existe na tabela auth.users (via auth.uid())
    const { data: userExists, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', insertData.applied_by)
      .single();

    if (userError || !userExists) {
      console.warn('⚠️ [POST /outcome-reasons/apply] applied_by pode não existir em profiles:', {
        appliedBy: insertData.applied_by ? insertData.applied_by.substring(0, 8) : 'UNDEFINED',
        error: userError?.message,
        note: 'FK constraint pode falhar, mas prosseguindo com inserção'
      });
      // ✅ CORREÇÃO: Não bloquear inserção por isso, apenas avisar
    }

    console.log('✅ [POST /outcome-reasons/apply] Validações FK concluídas, prosseguindo com inserção...');

    // 🚨 INVESTIGAÇÃO FASE 1: Log antes da inserção no Supabase
    console.log('📤 [APPLY OUTCOME] Iniciando inserção no Supabase:', {
      table: 'lead_outcome_history',
      dataKeys: Object.keys(insertData),
      dataValidation: {
        allFieldsPresent: Object.values(insertData).every(val => val !== undefined),
        leadIdIsUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(insertData.lead_id),
        pipelineIdIsUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(insertData.pipeline_id),
        tenantIdIsUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(insertData.tenant_id),
        userIdIsUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(insertData.applied_by)
      },
      aboutToExecute: 'supabase.from(lead_outcome_history).insert().select().single()'
    });

    // 🚨 INVESTIGAÇÃO CRÍTICA: Log completo antes da inserção
    console.log('📤 [APPLY OUTCOME] === INICIANDO INSERÇÃO CRÍTICA ===', {
      timestamp: new Date().toISOString(),
      table: 'lead_outcome_history',
      operation: 'INSERT + SELECT + SINGLE',
      insertData: {
        lead_id: insertData.lead_id,
        pipeline_id: insertData.pipeline_id,
        outcome_type: insertData.outcome_type,
        reason_id: insertData.reason_id || 'NULL',
        reason_text: insertData.reason_text,
        notes: insertData.notes || 'NULL',
        applied_by: insertData.applied_by,
        tenant_id: insertData.tenant_id,
        created_at: insertData.created_at
      },
      dataValidation: {
        lead_id_uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(insertData.lead_id),
        pipeline_id_uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(insertData.pipeline_id),
        tenant_id_uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(insertData.tenant_id),
        applied_by_uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(insertData.applied_by),
        reason_id_valid: !insertData.reason_id || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(insertData.reason_id),
        outcome_type_valid: ['ganho', 'perdido', 'won', 'lost'].includes(insertData.outcome_type),
        reason_text_length: insertData.reason_text.length,
        notes_provided: !!insertData.notes
      },
      expectedSQLOperation: 'INSERT INTO lead_outcome_history (...) RETURNING *'
    });

    const { data: history, error } = await supabase
      .from('lead_outcome_history')
      .insert(insertData)
      .select()
      .single();

    // 🚨 INVESTIGAÇÃO CRÍTICA: Log detalhado da resposta Supabase
    console.log('📡 [APPLY OUTCOME] === RESPOSTA SUPABASE RECEBIDA ===', {
      timestamp: new Date().toISOString(),
      operation: 'INSERT lead_outcome_history',
      success: !error,
      responseData: {
        hasData: !!history,
        dataType: typeof history,
        dataKeys: history ? Object.keys(history) : [],
        historyId: history?.id || 'NONE'
      },
      errorInfo: error ? {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        supabaseError: true
      } : null,
      debugInfo: {
        insertDataKeys: Object.keys(insertData),
        insertDataSize: JSON.stringify(insertData).length,
        operationExpected: 'single record returned'
      }
    });

    if (error) {
      console.error('❌ [APPLY OUTCOME] === ERRO CRÍTICO DETALHADO ===', {
        timestamp: new Date().toISOString(),
        operation: 'INSERT lead_outcome_history',
        leadContext: {
          leadId: data.lead_id ? data.lead_id.substring(0, 8) + '...' : 'UNDEFINED',
          pipelineId: lead.pipeline_id ? lead.pipeline_id.substring(0, 8) + '...' : 'UNDEFINED',
          tenantId: tenant_id ? tenant_id.substring(0, 8) + '...' : 'UNDEFINED',
          userId: user_id ? user_id.substring(0, 8) + '...' : 'UNDEFINED'
        },
        supabaseError: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          supabaseCode: error.code
        },
        insertedData: {
          outcome_type: insertData.outcome_type,
          reason_text: insertData.reason_text ? insertData.reason_text.substring(0, 50) + '...' : 'UNDEFINED',
          has_pipeline_id: !!insertData.pipeline_id,
          has_tenant_id: !!insertData.tenant_id,
          has_reason_id: !!insertData.reason_id,
          has_notes: !!insertData.notes,
          applied_by_provided: !!insertData.applied_by
        },
        possibleCauses: [
          'Table lead_outcome_history does not exist',
          'RLS policy blocking INSERT operation',
          'Foreign key constraint violation (lead_id, pipeline_id, reason_id, applied_by)',
          'Required field missing or null constraint violation',
          'Invalid data type or format (tenant_id UUID vs TEXT)',
          'Unique constraint violation',
          'Tenant isolation policy blocking access',
          'Column type mismatch (tenant_id UUID→TEXT conversion failed)',
          'applied_by FK constraint violation (user not in auth.users)',
          'reason_id FK constraint violation (reason not in pipeline_outcome_reasons)'
        ],
        nextSteps: [
          'Check if table lead_outcome_history exists',
          'Verify RLS policies allow INSERT for authenticated users',
          'Validate FK relationships',
          'Check column constraints and required fields'
        ]
      });
      throw error;
    }

    // ✅ VALIDAÇÃO DEFENSIVA: Verificar campos antes de usar .substring()
    console.log('✅ [POST /outcome-reasons/apply] Motivo aplicado com sucesso:', {
      historyId: history.id ? history.id.substring(0, 8) : 'UNDEFINED',
      leadId: history.lead_id ? history.lead_id.substring(0, 8) : 'UNDEFINED',
      pipelineId: history.pipeline_id ? history.pipeline_id.substring(0, 8) : 'UNDEFINED',
      outcomeType: history.outcome_type || 'UNDEFINED',
      reasonText: history.reason_text ? history.reason_text.substring(0, 30) : 'UNDEFINED'
    });

    res.status(201).json({
      success: true,
      data: history
    });

  } catch (error: unknown) {
    // 🚨 INVESTIGAÇÃO FASE 1: Captura detalhada do erro 500
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    
    console.error('❌ [APPLY OUTCOME] === ERRO 500 CAPTURADO ===', {
      timestamp: new Date().toISOString(),
      errorDetails: {
        name: errorName,
        message: errorMessage,
        type: typeof error,
        isError: error instanceof Error,
        isSupabaseError: errorMessage.includes('supabase') || errorMessage.includes('database'),
        isZodError: errorName === 'ZodError'
      },
      errorStack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : null,
      requestContext: {
        url: req.url,
        method: req.method,
        hasAuth: !!req.headers.authorization,
        hasUser: !!req.user,
        hasBody: !!req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        userTenantId: req.user?.tenant_id ? req.user.tenant_id.substring(0, 8) + '...' : 'UNDEFINED'
      },
      possibleCauses: [
        'Supabase connection error',
        'Database constraint violation', 
        'RLS policy blocking insertion',
        'Invalid UUID format',
        'Missing required fields',
        'Tenant access violation'
      ],
      nextSteps: 'Verifique se o erro ocorreu na validação, busca do lead ou inserção no banco'
    });

    // ✅ DETERMINAR TIPO DE ERRO E RESPOSTA APROPRIADA
    if (errorName === 'ZodError') {
      // Caso um erro Zod tenha vazado do safeParse (não deveria acontecer)
      return res.status(400).json({
        success: false,
        error: 'Erro de validação de dados',
        details: 'Dados fornecidos não atendem aos requisitos do sistema'
      });
    }

    // ✅ ERRO GENÉRICO (geralmente problemas de banco ou sistema)
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor ao aplicar motivo',
      details: 'Tente novamente em alguns segundos. Se o problema persistir, contate o suporte.',
      errorCode: errorName
    });
  }
});

// 📜 GET /outcome-reasons/history/:leadId - Histórico de motivos de um lead
router.get('/history/:leadId', simpleAuth, async (req: AuthenticatedRequest, res: Response) => {
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ [GET /outcome-reasons/history] Erro:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: errorMessage || 'Erro ao buscar histórico' 
    });
  }
});

// 🏭 POST /outcome-reasons/defaults - Criar motivos padrão
router.post('/defaults', simpleAuth, validateTenantAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pipeline_id } = req.body;
    const { tenant_id } = req.user;

    const reasons: Array<{
      pipeline_id: string;
      tenant_id: string;
      reason_type: string;
      reason_text: string;
      display_order: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }> = [];

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

    const { data: createdReasons, error } = await supabase
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ [POST /outcome-reasons/defaults] Erro:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: errorMessage || 'Erro ao criar motivos padrão' 
    });
  }
});

// 📋 GET /outcome-reasons/system-defaults - Buscar motivos padrão do sistema
router.get('/system-defaults', simpleAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({
      success: true,
      data: DEFAULT_REASONS
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ [GET /outcome-reasons/system-defaults] Erro:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: errorMessage || 'Erro ao buscar motivos padrão' 
    });
  }
});

// 🔄 POST /outcome-reasons/migrate-from-json - Migrar motivos do JSON para tabela
router.post('/migrate-from-json', simpleAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pipeline_id } = req.body;
    const { tenant_id, user_id } = req.user;

    if (!pipeline_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Pipeline ID é obrigatório' 
      });
    }

    // Verificar se o pipeline pertence ao tenant
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id, outcome_reasons')
      .eq('id', pipeline_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (pipelineError || !pipeline) {
      return res.status(403).json({ 
        success: false, 
        error: 'Pipeline não encontrado' 
      });
    }

    if (!pipeline.outcome_reasons) {
      return res.status(400).json({ 
        success: false, 
        error: 'Pipeline não possui motivos configurados no JSON' 
      });
    }

    const outcomeReasons = pipeline.outcome_reasons;
    const reasonsToInsert = [];

    // Converter motivos de ganho
    if (outcomeReasons.ganho_reasons && Array.isArray(outcomeReasons.ganho_reasons)) {
      outcomeReasons.ganho_reasons.forEach((reason: any, index: number) => {
        if (reason.is_active !== false) {
          reasonsToInsert.push({
            pipeline_id,
            tenant_id,
            reason_type: 'ganho',
            reason_text: reason.reason_text || reason.text || '',
            display_order: reason.display_order || index,
            is_active: true,
            created_by: user_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      });
    }

    // Converter motivos de perdido
    if (outcomeReasons.perdido_reasons && Array.isArray(outcomeReasons.perdido_reasons)) {
      outcomeReasons.perdido_reasons.forEach((reason: any, index: number) => {
        if (reason.is_active !== false) {
          reasonsToInsert.push({
            pipeline_id,
            tenant_id,
            reason_type: 'perdido',
            reason_text: reason.reason_text || reason.text || '',
            display_order: reason.display_order || index,
            is_active: true,
            created_by: user_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      });
    }

    if (reasonsToInsert.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nenhum motivo ativo encontrado para migrar' 
      });
    }

    console.log(`🔄 [POST /outcome-reasons/migrate-from-json] Migrando ${reasonsToInsert.length} motivos:`, {
      pipelineId: pipeline_id.substring(0, 8),
      ganhoCount: reasonsToInsert.filter(r => r.reason_type === 'ganho').length,
      perdidoCount: reasonsToInsert.filter(r => r.reason_type === 'perdido').length
    });

    // Inserir motivos na tabela
    const { data: insertedReasons, error: insertError } = await supabase
      .from('pipeline_outcome_reasons')
      .insert(reasonsToInsert)
      .select();

    if (insertError) {
      console.error('❌ [POST /outcome-reasons/migrate-from-json] Erro na inserção:', insertError);
      throw insertError;
    }

    console.log(`✅ [POST /outcome-reasons/migrate-from-json] Migração concluída:`, {
      inserted: insertedReasons?.length || 0,
      expected: reasonsToInsert.length
    });

    res.status(201).json({
      success: true,
      data: insertedReasons || [],
      message: `${insertedReasons?.length || 0} motivos migrados com sucesso`,
      details: {
        ganho_migrated: insertedReasons?.filter(r => r.reason_type === 'ganho').length || 0,
        perdido_migrated: insertedReasons?.filter(r => r.reason_type === 'perdido').length || 0
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ [POST /outcome-reasons/migrate-from-json] Erro:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: errorMessage || 'Erro ao migrar motivos' 
    });
  }
});

// 🔄 POST /outcome-reasons/reorder - Reordenar motivos
router.post('/reorder', simpleAuth, async (req: AuthenticatedRequest, res: Response) => {
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ [POST /outcome-reasons/reorder] Erro:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: errorMessage || 'Erro ao reordenar motivos' 
    });
  }
});

export default router;
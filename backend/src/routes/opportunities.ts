import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

// Carregar variáveis de ambiente
import dotenv from 'dotenv';
dotenv.config();

// Configuração Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const router = Router();

// ================================================================================
// SCHEMAS DE VALIDAÇÃO
// ================================================================================

const CreateOpportunitySchema = z.object({
  pipeline_id: z.string().uuid('Pipeline ID deve ser um UUID válido'),
  stage_id: z.string().uuid('Stage ID deve ser um UUID válido'),
  nome_oportunidade: z.string().min(1, 'Nome da oportunidade é obrigatório'),
  valor: z.union([z.string(), z.number()]).optional(),
  responsavel: z.string().uuid('Responsável deve ser um UUID válido').optional(),
  nome_lead: z.string().min(1, 'Nome do lead é obrigatório'),
  nome_contato: z.string().optional(),
  email: z.string().email('Email deve ser válido'),
  email_contato: z.string().optional(),
  telefone: z.string().optional(),
  telefone_contato: z.string().optional(),
  lead_source: z.enum(['existing_lead', 'new_lead']),
  existing_lead_id: z.string().uuid().optional().nullable(),
  // ✅ CORREÇÃO CRÍTICA: Adicionar custom_data ao schema Zod para permitir campos customizados
  custom_data: z.record(z.any()).optional().nullable()
}).refine(data => {
  // Se lead_source é 'existing_lead', existing_lead_id é obrigatório
  if (data.lead_source === 'existing_lead' && !data.existing_lead_id) {
    return false;
  }
  return true;
}, {
  message: "existing_lead_id é obrigatório quando lead_source é 'existing_lead'",
  path: ["existing_lead_id"]
});

// ================================================================================
// ENDPOINTS
// ================================================================================

/**
 * POST /api/opportunities/create
 * Criar nova oportunidade (novo lead ou lead existente)
 */
router.post('/create', authMiddleware, async (req: Request, res: Response) => {
  try {
    console.log('🚀 [OpportunityRoutes] POST /create - Iniciando criação de oportunidade');
    console.log('📋 [OpportunityRoutes] Payload recebido:', JSON.stringify(req.body, null, 2));
    
    // Validar dados de entrada
    const validatedData = CreateOpportunitySchema.parse(req.body);
    const { tenant_id, id: user_id } = req.user!;
    
    console.log('✅ [OpportunityRoutes] Validação Zod passou - dados estruturados:', {
      pipeline_id: validatedData.pipeline_id?.substring(0, 8),
      stage_id: validatedData.stage_id?.substring(0, 8),
      nome_oportunidade: validatedData.nome_oportunidade,
      nome_lead: validatedData.nome_lead,
      email: validatedData.email,
      telefone: validatedData.telefone,
      lead_source: validatedData.lead_source
    });
    
    // 🔍 DIAGNÓSTICO CRÍTICO: Verificar se custom_data passou pela validação Zod
    console.log('🔍 [CUSTOM-DATA-DEBUG]', {
      hasCustomData: !!validatedData.custom_data,
      customDataKeys: validatedData.custom_data ? Object.keys(validatedData.custom_data) : [],
      customDataValues: validatedData.custom_data,
      rawCustomDataFromPayload: req.body?.custom_data
    });
    
    // Verificar se tenant_id e user_id são UUIDs válidos
    if (!tenant_id || typeof tenant_id !== 'string') {
      console.error('❌ [OpportunityRoutes] tenant_id inválido:', tenant_id);
      return res.status(400).json({
        success: false,
        message: 'tenant_id inválido'
      });
    }
    
    if (!user_id || typeof user_id !== 'string') {
      console.error('❌ [OpportunityRoutes] user_id inválido:', user_id);
      return res.status(400).json({
        success: false,
        message: 'user_id inválido'
      });
    }
    
    console.log('📋 [OpportunityRoutes] Dados validados:', {
      pipeline: validatedData.pipeline_id.substring(0, 8),
      stage: validatedData.stage_id.substring(0, 8),
      nome: validatedData.nome_oportunidade,
      source: validatedData.lead_source,
      tenant_id: tenant_id.substring(0, 8),
      user_id: user_id.substring(0, 8),
      responsavel: validatedData.responsavel?.substring(0, 8) || 'N/A'
    });

    let leadMasterId: string;
    let pipelineLeadId: string;

    // ================================================================================
    // FASE 1: GERENCIAR LEAD_MASTER (SIMPLIFICADO)
    // ================================================================================
    
    if (validatedData.lead_source === 'existing_lead' && validatedData.existing_lead_id) {
      // Usar lead existente
      console.log('👤 [OpportunityRoutes] Usando lead existente:', validatedData.existing_lead_id.substring(0, 8));
      
      // Verificação simples - service role filtra automaticamente por tenant_id no backend
      const { data: existingLeadMaster, error: existingError } = await supabase
        .from('leads_master')
        .select('id')
        .eq('id', validatedData.existing_lead_id)
        .eq('tenant_id', tenant_id)
        .single();

      if (existingError || !existingLeadMaster) {
        console.error('❌ [OpportunityRoutes] Lead master não encontrado:', existingError?.message);
        return res.status(404).json({
          success: false,
          message: 'Lead existente não encontrado'
        });
      }

      leadMasterId = existingLeadMaster.id;
      console.log('✅ [OpportunityRoutes] Lead master validado:', leadMasterId.substring(0, 8));
      
    } else {
      // Criar novo lead_master - ABORDAGEM SIMPLES
      console.log('➕ [OpportunityRoutes] Criando novo lead master');
      
      const newLeadMaster = {
        first_name: validatedData.nome_lead.split(' ')[0] || '',
        last_name: validatedData.nome_lead.split(' ').slice(1).join(' ') || '',
        email: validatedData.email,
        phone: validatedData.telefone || null,
        company: validatedData.nome_contato || null,
        tenant_id,
        created_by: user_id,
        status: 'active',
        lead_temperature: 'warm'
      };

      // INSERÇÃO DIRETA: Service role com RLS simplificado
      const { data: createdLeadMaster, error: createError } = await supabase
        .from('leads_master')
        .insert(newLeadMaster)
        .select('id')
        .single();

      if (createError || !createdLeadMaster) {
        console.error('❌ [OpportunityRoutes] Erro ao criar lead master:', createError?.message);
        return res.status(500).json({
          success: false,
          message: 'Erro ao criar lead master',
          details: createError?.message || 'Erro desconhecido'
        });
      }

      leadMasterId = createdLeadMaster.id;
      console.log('✅ [OpportunityRoutes] Novo lead master criado:', leadMasterId.substring(0, 8));
    }

    // ================================================================================
    // FASE 2: CRIAR PIPELINE_LEAD (OPORTUNIDADE) - SIMPLIFICADO
    // ================================================================================

    console.log('🏗️ [OpportunityRoutes] Criando pipeline_lead (oportunidade)');
    
    // Preparar campos customizados básicos
    const customFields: any = {
      nome_oportunidade: validatedData.nome_oportunidade,
      nome_lead: validatedData.nome_lead,
      nome_contato: validatedData.nome_contato || validatedData.nome_lead,
      email: validatedData.email,
      email_contato: validatedData.email_contato || validatedData.email,
      telefone: validatedData.telefone || '',
      telefone_contato: validatedData.telefone_contato || validatedData.telefone || ''
    };
    
    // ✅ CORREÇÃO APRIMORADA: Processar valor monetário corretamente
    const valorInput = validatedData.valor || 0;
    let valorNumerico: number;
    
    if (typeof valorInput === 'number') {
      valorNumerico = valorInput;
    } else {
      // Se for string, pode vir já processada do frontend ou precisar conversão
      const valorString = String(valorInput).trim();
      valorNumerico = parseFloat(valorString);
    }
    
    customFields.valor = isNaN(valorNumerico) ? 0 : valorNumerico;
    
    // ✅ CORREÇÃO CRÍTICA: Mesclar custom_data vindos do frontend com os campos básicos
    if (validatedData.custom_data && typeof validatedData.custom_data === 'object') {
      Object.assign(customFields, validatedData.custom_data);
      console.log('🔧 [CUSTOM-DATA-MERGE]', {
        camposBasicos: Object.keys(customFields).filter(k => !validatedData.custom_data![k]),
        camposCustomizados: Object.keys(validatedData.custom_data),
        customDataMerged: validatedData.custom_data
      });
    }
    
    console.log('💰 [OpportunityRoutes] Processamento de valor aprimorado:', {
      valor_recebido: validatedData.valor,
      valor_tipo: typeof validatedData.valor,
      valor_processado: valorNumerico,
      valor_final: customFields.valor
    });
    
    console.log('📦 [FINAL-CUSTOM-FIELDS]', {
      finalCustomFields: customFields,
      customFieldsKeys: Object.keys(customFields)
    });

    const newPipelineLead = {
      pipeline_id: validatedData.pipeline_id,
      stage_id: validatedData.stage_id,
      lead_master_id: leadMasterId,
      assigned_to: validatedData.responsavel || user_id,
      custom_data: customFields,
      tenant_id,
      created_by: user_id,
      position: 1000,
      status: 'active',
      lifecycle_stage: 'lead'
    };

    // INSERÇÃO DIRETA: Service role com RLS simplificado
    const { data: createdPipelineLead, error: pipelineError } = await supabase
      .from('pipeline_leads')
      .insert(newPipelineLead)
      .select('id')
      .single();

    if (pipelineError || !createdPipelineLead) {
      console.error('❌ [OpportunityRoutes] Erro ao criar pipeline_lead:', pipelineError?.message);
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar oportunidade na pipeline',
        details: pipelineError?.message || 'Erro desconhecido'
      });
    }

    pipelineLeadId = createdPipelineLead.id;
    console.log('✅ [OpportunityRoutes] Pipeline_lead criado:', pipelineLeadId.substring(0, 8));

    // ================================================================================
    // FASE 3: GERAÇÃO DE ATIVIDADES (OPCIONAL E ASSÍNCRONA)
    // ================================================================================
    
    // Gerar atividades de forma assíncrona (não bloquear resposta)
    setImmediate(async () => {
      try {
        const { LeadService } = await import('../services/leadService');
        
        const leadObject = {
          id: pipelineLeadId,
          pipeline_id: validatedData.pipeline_id,
          stage_id: validatedData.stage_id,
          assigned_to: validatedData.responsavel || user_id,
          lead_master_id: leadMasterId,
          tenant_id: tenant_id,
          created_by: user_id,
          lead_data: {}, // Dados dos campos customizados obrigatórios
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          moved_at: new Date().toISOString()
        };

        const tasksGenerated = await LeadService.generateCadenceTasksForLeadAsync(
          leadObject,
          validatedData.stage_id
        );

        console.log('✅ [OpportunityRoutes] Atividades geradas:', tasksGenerated || 0);
      } catch (activityError: any) {
        console.warn('⚠️ [OpportunityRoutes] Erro na geração de atividades (não crítico):', activityError.message);
      }
    });

    // ================================================================================
    // RESPOSTA DE SUCESSO
    // ================================================================================

    console.log('🎉 [OpportunityRoutes] Oportunidade criada com sucesso:', {
      opportunity_id: pipelineLeadId.substring(0, 8),
      lead_master_id: leadMasterId.substring(0, 8),
      source: validatedData.lead_source
    });

    res.status(201).json({
      success: true,
      message: 'Oportunidade criada com sucesso',
      opportunity_id: pipelineLeadId,
      lead_id: leadMasterId
    });

  } catch (error: any) {
    console.error('❌ [OpportunityRoutes] Erro geral:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * DELETE /api/opportunities/:leadId
 * Excluir oportunidade (pipeline_lead apenas, preserva lead_master)
 */
router.delete('/:leadId', authMiddleware, async (req: Request, res: Response) => {
  try {
    console.log('🗑️ [OpportunityRoutes] DELETE /:leadId - Iniciando exclusão de oportunidade');
    
    const { leadId } = req.params;
    const { tenant_id, id: user_id } = req.user!;
    
    console.log('📋 [OpportunityRoutes] DELETE params:', {
      leadId: leadId.substring(0, 8),
      tenant_id: tenant_id.substring(0, 8),
      user_id: user_id.substring(0, 8)
    });
    
    // Validar se leadId é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(leadId)) {
      console.error('❌ [OpportunityRoutes] leadId inválido:', leadId);
      return res.status(400).json({
        success: false,
        message: 'ID da oportunidade inválido'
      });
    }
    
    // Verificar se a oportunidade existe e pertence ao tenant
    console.log('🔍 [OpportunityRoutes] Verificando oportunidade existente...');
    const { data: existingOpportunity, error: verificationError } = await supabase
      .from('pipeline_leads')
      .select('id, pipeline_id, lead_master_id, tenant_id, created_by')
      .eq('id', leadId)
      .eq('tenant_id', tenant_id)
      .single();
    
    if (verificationError || !existingOpportunity) {
      console.error('❌ [OpportunityRoutes] Oportunidade não encontrada:', verificationError?.message);
      return res.status(404).json({
        success: false,
        message: 'Oportunidade não encontrada ou sem permissão de acesso'
      });
    }
    
    console.log('✅ [OpportunityRoutes] Oportunidade verificada:', {
      id: existingOpportunity.id.substring(0, 8),
      pipeline_id: existingOpportunity.pipeline_id.substring(0, 8),
      lead_master_id: existingOpportunity.lead_master_id.substring(0, 8),
      tenant_match: existingOpportunity.tenant_id === tenant_id
    });
    
    // EXECUTAR DELETE usando service role (bypassa RLS de forma controlada)
    console.log('🔥 [OpportunityRoutes] Executando DELETE com service role...');
    const { data: deletedData, error: deleteError, count } = await supabase
      .from('pipeline_leads')
      .delete()
      .eq('id', leadId)
      .eq('tenant_id', tenant_id) // Dupla verificação de segurança
      .select();
    
    console.log('📊 [OpportunityRoutes] Resultado DELETE:', {
      error: deleteError?.message || null,
      deletedCount: count || 0,
      deletedData: deletedData ? deletedData.length : 0,
      hasError: !!deleteError
    });
    
    if (deleteError) {
      console.error('❌ [OpportunityRoutes] Erro no DELETE:', deleteError);
      return res.status(500).json({
        success: false,
        message: 'Erro ao excluir oportunidade',
        details: deleteError.message
      });
    }
    
    if (!deletedData || deletedData.length === 0) {
      console.warn('⚠️ [OpportunityRoutes] DELETE não afetou nenhuma linha');
      return res.status(404).json({
        success: false,
        message: 'Oportunidade não encontrada para exclusão'
      });
    }
    
    console.log('✅ [OpportunityRoutes] Oportunidade excluída com sucesso:', {
      deleted_id: deletedData[0].id.substring(0, 8),
      pipeline_id: existingOpportunity.pipeline_id.substring(0, 8),
      lead_master_preserved: existingOpportunity.lead_master_id.substring(0, 8)
    });
    
    // Log de auditoria
    console.log('📝 [OpportunityRoutes] AUDIT - DELETE opportunity:', {
      deleted_opportunity_id: deletedData[0].id,
      deleted_by_user_id: user_id,
      tenant_id: tenant_id,
      pipeline_id: existingOpportunity.pipeline_id,
      timestamp: new Date().toISOString()
    });
    
    res.status(200).json({
      success: true,
      message: 'Oportunidade excluída com sucesso. Lead principal preservado no sistema.',
      data: {
        deleted_id: deletedData[0].id,
        pipeline_id: existingOpportunity.pipeline_id,
        lead_master_id: existingOpportunity.lead_master_id
      }
    });
    
  } catch (error: any) {
    console.error('❌ [OpportunityRoutes] Erro geral no DELETE:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      details: error.message
    });
  }
});

export default router;
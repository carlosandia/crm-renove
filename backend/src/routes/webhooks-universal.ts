/**
 * 🌐 ROTAS WEBHOOK UNIVERSAIS - Sistema Simples para Todas Integrações
 * Suporta: N8N, Zapier, Make.com, Pabbly Connect, Microsoft Power Automate, etc.
 * Autor: Claude (Arquiteto Sênior)
 * Data: 2025-01-30
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { webhookAuth } from '../middleware/simpleAuth';
import { CustomFieldService } from '../services/customFieldService';

const router = Router();

// ============================================
// INTERFACES PARA WEBHOOK UNIVERSAL
// ============================================

interface WebhookLeadData {
  // Campos obrigatórios
  first_name: string;
  email: string;
  
  // Campos opcionais básicos
  last_name?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  
  // Configuração específica
  pipeline_id?: string;        // ID da pipeline específica (se fornecido)
  assigned_to?: string;        // ID do usuário para atribuir
  created_by?: string;         // ID do usuário criador
  lead_temperature?: 'quente' | 'morno' | 'frio';
  
  // Dados de origem/campanha
  source?: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  conversion_value?: number;
  
  // Dados adicionais (qualquer estrutura)
  additional_data?: Record<string, any>;
}

// ============================================
// ROTA WEBHOOK UNIVERSAL
// ============================================

/**
 * 🌐 POST /api/webhook/:tenant_id - Webhook Universal para Qualquer Integração
 * 
 * ✅ Suporta múltiplos métodos de autenticação:
 *    - X-API-Key header
 *    - Authorization Bearer 
 *    - ?api_key= query parameter
 * 
 * ✅ Funciona com qualquer plataforma:
 *    - N8N, Zapier, Make.com, Pabbly Connect, etc.
 * 
 * ✅ Configurações automáticas:
 *    - Pipeline fallback (padrão ou primeira disponível)
 *    - Stage "Novos Leads" ou primeira stage
 *    - Rodízio automático se não especificar usuário
 */
router.post('/:tenant_id', webhookAuth, async (req: Request, res: Response) => {
  try {
    const { tenant_id } = req.params;
    const leadData: WebhookLeadData = req.body;
    
    console.log('🌐 [WEBHOOK-UNIVERSAL] Recebendo lead via webhook:', {
      tenant_id: tenant_id.substring(0, 8) + '...',
      email: leadData.email,
      source: req.get('User-Agent')?.includes('n8n') ? 'N8N' : 'External'
    });

    // ✅ VALIDAR TENANT_ID CORRETO
    if (!req.webhookAuth || req.webhookAuth.tenantId !== tenant_id) {
      return res.status(403).json({
        success: false,
        error: 'API Key não autorizada para este tenant'
      });
    }

    // ✅ VALIDAR DADOS OBRIGATÓRIOS
    if (!leadData.first_name || !leadData.email) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: first_name, email'
      });
    }

    // ✅ PIPELINE INTELIGENTE - Usar específica ou fallback
    let pipelineId: string | null = leadData.pipeline_id || null;

    // Validar pipeline específica se fornecida
    if (pipelineId) {
      console.log('🎯 [WEBHOOK-UNIVERSAL] Pipeline específica solicitada:', pipelineId);
      
      const { data: specificPipeline, error: specificError } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('id', pipelineId)
        .eq('tenant_id', tenant_id)
        .single();

      if (specificError || !specificPipeline) {
        console.warn('⚠️ [WEBHOOK-UNIVERSAL] Pipeline específica inválida, usando fallback');
        pipelineId = null;
      } else {
        console.log('✅ [WEBHOOK-UNIVERSAL] Pipeline específica validada:', specificPipeline.name);
      }
    }

    // FALLBACK: Buscar pipeline padrão ou primeira disponível
    if (!pipelineId) {
      console.log('🔄 [WEBHOOK-UNIVERSAL] Buscando pipeline padrão...');
      
      const { data: defaultPipeline } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('tenant_id', tenant_id)
        .eq('is_default', true)
        .single();

      pipelineId = defaultPipeline?.id;

      // Se não tem pipeline padrão, pegar o primeiro disponível
      if (!pipelineId) {
        const { data: firstPipeline } = await supabase
          .from('pipelines')
          .select('id, name')
          .eq('tenant_id', tenant_id)
          .limit(1)
          .single();
        
        pipelineId = firstPipeline?.id;
        console.log('📋 [WEBHOOK-UNIVERSAL] Usando primeira pipeline disponível:', firstPipeline?.name);
      } else {
        console.log('⭐ [WEBHOOK-UNIVERSAL] Usando pipeline padrão:', defaultPipeline.name);
      }
    }

    if (!pipelineId) {
      return res.status(500).json({
        success: false,
        error: 'Nenhuma pipeline encontrada para este tenant'
      });
    }

    // ✅ BUSCAR STAGE "NOVOS LEADS" OU PRIMEIRA STAGE
    const { data: stageData } = await supabase
      .from('pipeline_stages')
      .select('id, name')
      .eq('pipeline_id', pipelineId)
      .or('name.ilike.%novos leads%,name.ilike.%novo%,name.ilike.%inicial%,name.ilike.%lead%')
      .limit(1)
      .single();

    let stageId = stageData?.id;
    let stageName = stageData?.name;

    // Se não encontrou stage específica, pegar a primeira stage
    if (!stageId) {
      const { data: firstStage } = await supabase
        .from('pipeline_stages')
        .select('id, name')
        .eq('pipeline_id', pipelineId)
        .limit(1)
        .single();
      
      stageId = firstStage?.id;
      stageName = firstStage?.name;
    }

    if (!stageId) {
      return res.status(500).json({
        success: false,
        error: 'Nenhuma stage encontrada na pipeline'
      });
    }

    // ✅ VALIDAÇÃO DE USUÁRIOS (assigned_to e created_by)
    let assignedUserId: string | null = null;
    let createdByUserId: string | null = null;

    // Validar usuário para assigned_to
    if (leadData.assigned_to) {
      const { data: assignedUser } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', leadData.assigned_to)
        .eq('tenant_id', tenant_id)
        .single();

      if (assignedUser && (assignedUser.role === 'admin' || assignedUser.role === 'member')) {
        assignedUserId = assignedUser.id;
        console.log('✅ [WEBHOOK-UNIVERSAL] Assigned to:', assignedUser.email);
      }
    }

    // Validar usuário para created_by
    if (leadData.created_by) {
      const { data: creatorUser } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', leadData.created_by)
        .eq('tenant_id', tenant_id)
        .single();

      if (creatorUser && (creatorUser.role === 'admin' || creatorUser.role === 'member')) {
        createdByUserId = creatorUser.id;
        console.log('✅ [WEBHOOK-UNIVERSAL] Created by:', creatorUser.email);
      }
    }

    // ✅ FALLBACK PARA created_by (obrigatório)
    if (!createdByUserId) {
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('role', 'admin')
        .limit(1)
        .single();
      
      createdByUserId = adminUser?.id || null;
    }

    if (!createdByUserId) {
      return res.status(500).json({
        success: false,
        error: 'Nenhum usuário admin encontrado para criar o lead'
      });
    }

    // ✅ CRIAR LEAD NA TABELA PIPELINE_LEADS
    const leadInsertData = {
      pipeline_id: pipelineId,
      stage_id: stageId,
      tenant_id: tenant_id,
      temperature_level: leadData.lead_temperature || 'morno',
      assigned_to: assignedUserId,
      created_by: createdByUserId,
      custom_data: {
        // Dados básicos do lead
        nome_lead: leadData.first_name + (leadData.last_name ? ` ${leadData.last_name}` : ''),
        nome_contato: leadData.first_name + (leadData.last_name ? ` ${leadData.last_name}` : ''),
        email: leadData.email,
        telefone: leadData.phone || null,
        empresa: leadData.company || null,
        cargo: leadData.job_title || null,
        
        // Dados de origem
        origem: leadData.source || 'Webhook Universal',
        source_type: 'webhook_universal',
        
        // Dados de campanha
        campaign_id: leadData.campaign_id,
        adset_id: leadData.adset_id,
        ad_id: leadData.ad_id,
        conversion_value: leadData.conversion_value,
        
        // Metadados
        created_via: 'webhook_universal',
        webhook_data: leadData.additional_data,
        received_at: new Date().toISOString(),
        
        // Compatibilidade
        first_name: leadData.first_name,
        last_name: leadData.last_name || '',
        lead_temperature: leadData.lead_temperature || 'morno'
      }
    };

    const { data: newLead, error: leadError } = await supabase
      .from('pipeline_leads')
      .insert(leadInsertData)
      .select('id, custom_data, temperature_level, created_at')
      .single();

    if (leadError) {
      console.error('❌ [WEBHOOK-UNIVERSAL] Erro ao criar lead:', leadError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar lead no sistema'
      });
    }

    // ✅ APLICAR RODÍZIO AUTOMÁTICO (se não foi especificado assigned_to)
    let finalAssignedUserId = assignedUserId;
    let distributionMethod = 'manual';
    let distributionMessage = 'Usuário específico definido via webhook';

    if (!leadData.assigned_to) {
      try {
        const { data: distributionResult } = await supabase
          .rpc('assign_lead_round_robin_advanced', {
            p_lead_id: newLead.id,
            p_pipeline_id: pipelineId,
            p_force_member_id: null
          });

        if (distributionResult && distributionResult.length > 0) {
          const result = distributionResult[0];
          if (result.success) {
            finalAssignedUserId = result.assigned_to;
            distributionMethod = result.assignment_method;
            distributionMessage = result.message;
            
            console.log('🎯 [WEBHOOK-UNIVERSAL] Rodízio aplicado:', {
              assignedTo: finalAssignedUserId.substring(0, 8) + '...',
              method: distributionMethod
            });
          }
        }
      } catch (distributionError) {
        console.warn('⚠️ [WEBHOOK-UNIVERSAL] Rodízio falhou - continuando:', distributionError);
        distributionMethod = 'webhook_direct';
        distributionMessage = 'Rodízio não aplicado, criado via webhook direto';
      }
    }

    // ✅ LOG DE SUCESSO
    console.log('✅ [WEBHOOK-UNIVERSAL] Lead criado com sucesso:', {
      leadId: newLead.id.substring(0, 8) + '...',
      email: leadData.email,
      pipeline: pipelineId.substring(0, 8) + '...',
      stage: stageName,
      assigned_to: finalAssignedUserId?.substring(0, 8) + '...' || 'não definido',
      distribution: distributionMethod
    });

    // ✅ RESPOSTA UNIVERSAL
    res.status(201).json({
      success: true,
      data: {
        lead_id: newLead.id,
        email: leadData.email,
        pipeline_id: pipelineId,
        stage_id: stageId,
        stage_name: stageName,
        assigned_to: finalAssignedUserId,
        created_by: createdByUserId,
        temperature: newLead.temperature_level
      },
      configuration: {
        pipeline_source: leadData.pipeline_id ? 'webhook_specific' : 'tenant_default',
        assigned_to_source: leadData.assigned_to ? 'webhook_specific' : 'system_assigned',
        created_by_source: leadData.created_by ? 'webhook_specific' : 'admin_fallback'
      },
      distribution: {
        method: distributionMethod,
        message: distributionMessage,
        final_assigned_to: finalAssignedUserId,
        round_robin_applied: distributionMethod === 'round_robin'
      },
      message: `Lead criado com sucesso na stage "${stageName}"`
    });

  } catch (error) {
    console.error('❌ [WEBHOOK-UNIVERSAL] Erro interno:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// ============================================
// ROTAS AUXILIARES PARA WEBHOOKS
// ============================================

/**
 * 📋 GET /api/webhook/:tenant_id/pipelines - Listar pipelines do tenant para webhooks
 * Permite que integrações externas listem pipelines usando API Key
 */
router.get('/:tenant_id/pipelines', webhookAuth, async (req: Request, res: Response) => {
  try {
    const { tenant_id } = req.params;
    
    console.log('📋 [WEBHOOK-PIPELINES] Listando pipelines para tenant:', tenant_id.substring(0, 8) + '...');

    // ✅ VALIDAR TENANT_ID CORRETO
    if (!req.webhookAuth || req.webhookAuth.tenantId !== tenant_id) {
      return res.status(403).json({
        success: false,
        error: 'API Key não autorizada para este tenant'
      });
    }

    // ✅ BUSCAR PIPELINES DO TENANT
    const { data: pipelines, error } = await supabase
      .from('pipelines')
      .select('id, name, is_active, created_at')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('❌ [WEBHOOK-PIPELINES] Erro ao buscar pipelines:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar pipelines'
      });
    }

    console.log('✅ [WEBHOOK-PIPELINES] Pipelines encontradas:', pipelines?.length || 0);

    res.json({
      success: true,
      data: pipelines || [],
      total: pipelines?.length || 0,
      message: 'Pipelines listadas com sucesso'
    });

  } catch (error) {
    console.error('❌ [WEBHOOK-PIPELINES] Erro interno:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * 🏷️ GET /api/webhook/:tenant_id/pipelines/:pipeline_id/fields - Listar campos de pipeline para webhooks
 * Permite que integrações externas listem campos (fixos + customizados) usando API Key
 */
router.get('/:tenant_id/pipelines/:pipeline_id/fields', webhookAuth, async (req: Request, res: Response) => {
  try {
    const { tenant_id, pipeline_id } = req.params;
    
    console.log('🏷️ [WEBHOOK-FIELDS] Listando campos para pipeline:', {
      tenant: tenant_id.substring(0, 8) + '...',
      pipeline: pipeline_id.substring(0, 8) + '...'
    });

    // ✅ VALIDAR TENANT_ID CORRETO
    if (!req.webhookAuth || req.webhookAuth.tenantId !== tenant_id) {
      return res.status(403).json({
        success: false,
        error: 'API Key não autorizada para este tenant'
      });
    }

    // ✅ VALIDAR SE PIPELINE PERTENCE AO TENANT
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id, name')
      .eq('id', pipeline_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (pipelineError || !pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline não encontrada ou não pertence ao tenant'
      });
    }

    // ✅ CAMPOS FIXOS DO SISTEMA (sempre disponíveis)
    const systemFields = [
      {
        id: 'first_name',
        name: 'first_name',
        label: 'Nome',
        type: 'text',
        required: true,
        system: true,
        description: 'Nome do lead (obrigatório)'
      },
      {
        id: 'last_name', 
        name: 'last_name',
        label: 'Sobrenome',
        type: 'text',
        required: false,
        system: true,
        description: 'Sobrenome do lead (opcional)'
      },
      {
        id: 'email',
        name: 'email',
        label: 'E-mail',
        type: 'email',
        required: true,
        system: true,
        description: 'E-mail do lead (obrigatório)'
      },
      {
        id: 'phone',
        name: 'phone',
        label: 'Telefone',
        type: 'phone',
        required: false,
        system: true,
        description: 'Telefone do lead (opcional)'
      },
      {
        id: 'company',
        name: 'company',
        label: 'Empresa',
        type: 'text',
        required: false,
        system: true,
        description: 'Nome da empresa do lead (opcional)'
      },
      {
        id: 'job_title',
        name: 'job_title', 
        label: 'Cargo',
        type: 'text',
        required: false,
        system: true,
        description: 'Cargo/função do lead (opcional)'
      },
      {
        id: 'lead_temperature',
        name: 'lead_temperature',
        label: 'Temperatura',
        type: 'select',
        required: false,
        system: true,
        options: ['quente', 'morno', 'frio'],
        description: 'Temperatura do lead (opcional, padrão: morno)'
      },
      {
        id: 'source',
        name: 'source',
        label: 'Origem',
        type: 'text',
        required: false,
        system: true,
        description: 'Origem do lead (opcional)'
      }
    ];

    // ✅ BUSCAR CAMPOS CUSTOMIZADOS DA PIPELINE
    let customFields: any[] = [];
    try {
      const fields = await CustomFieldService.getCustomFieldsByPipeline(pipeline_id);
      customFields = fields.map(field => ({
        id: field.id,
        name: field.field_name,
        label: field.field_label,
        type: field.field_type,
        required: field.is_required,
        system: false,
        options: field.field_options,
        placeholder: field.placeholder,
        description: `Campo customizado: ${field.field_label} (${field.field_type})`
      }));
    } catch (error) {
      console.warn('⚠️ [WEBHOOK-FIELDS] Erro ao buscar campos customizados:', error);
      // Continuar sem campos customizados
    }

    const allFields = [...systemFields, ...customFields];

    console.log('✅ [WEBHOOK-FIELDS] Campos encontrados:', {
      pipeline: pipeline.name,
      system_fields: systemFields.length,
      custom_fields: customFields.length,
      total: allFields.length
    });

    res.json({
      success: true,
      data: {
        pipeline: {
          id: pipeline.id,
          name: pipeline.name
        },
        fields: allFields
      },
      summary: {
        total_fields: allFields.length,
        system_fields: systemFields.length,
        custom_fields: customFields.length
      },
      message: 'Campos listados com sucesso'
    });

  } catch (error) {
    console.error('❌ [WEBHOOK-FIELDS] Erro interno:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * 🏥 GET /api/webhook/health - Health check específico para webhooks
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'webhook-universal',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    supported_platforms: [
      'N8N',
      'Zapier', 
      'Make.com',
      'Pabbly Connect',
      'Microsoft Power Automate',
      'Integromat',
      'Custom HTTP Clients'
    ],
    authentication_methods: [
      'X-API-Key header',
      'Authorization Bearer',
      'Query parameter ?api_key='
    ]
  });
});

export default router;
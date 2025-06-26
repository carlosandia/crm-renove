import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import { supabase } from '../config/supabase';

const router = Router();

// Interface para dados de integração
interface Integration {
  id: string;
  company_id: string;
  meta_ads_token?: string;
  google_ads_token?: string;
  webhook_url: string;
  api_key_public: string;
  api_key_secret: string;
  created_at: string;
  updated_at: string;
}

// Interface para dados de lead via webhook
interface WebhookLeadData {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  lead_temperature?: 'quente' | 'morno' | 'frio';
  source?: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  conversion_value?: number;
  additional_data?: Record<string, any>;
  pipeline_id?: string;
  assigned_to?: string;
  created_by?: string;
}

// ============================================
// ROTAS PARA ADMINS - GERENCIAR INTEGRAÇÕES
// ============================================

// GET /api/integrations - Buscar integração da empresa
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Apenas administradores podem acessar integrações.'
      });
    }

    // Buscar ou criar integração usando função SQL segura
    const { data, error } = await supabase
      .rpc('get_or_create_secure_integration', {
        p_company_id: user.tenant_id
      });

    if (error) {
      console.error('Erro ao buscar integração:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Integração não encontrada'
      });
    }

    const integration = data[0];
    
    // Mascarar chave secreta para segurança
    const safeIntegration = {
      ...integration,
      api_key_secret: integration.api_key_secret ? '***HIDDEN***' : null
    };

    res.json({
      success: true,
      data: safeIntegration
    });

  } catch (error) {
    console.error('Erro ao buscar integrações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// PUT /api/integrations - Atualizar tokens de integração
router.put('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { meta_ads_token, google_ads_token } = req.body;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Apenas administradores podem atualizar integrações.'
      });
    }

    // Validar tokens se fornecidos usando funções melhoradas
    if (meta_ads_token && meta_ads_token.trim()) {
      const { data: validationResult } = await supabase
        .rpc('validate_meta_ads_token_enhanced', { p_token: meta_ads_token.trim() });
      
      if (!validationResult?.valid) {
        return res.status(400).json({
          success: false,
          error: 'Token do Meta Ads inválido',
          validation_errors: validationResult?.errors || []
        });
      }
    }

    if (google_ads_token && google_ads_token.trim()) {
      const { data: validationResult } = await supabase
        .rpc('validate_google_ads_token_enhanced', { p_token: google_ads_token.trim() });
      
      if (!validationResult?.valid) {
        return res.status(400).json({
          success: false,
          error: 'Token do Google Ads inválido',
          validation_errors: validationResult?.errors || []
        });
      }
    }

    // Atualizar tokens usando função segura
    const { data: updateResult, error } = await supabase
      .rpc('update_integration_tokens_secure', {
        p_company_id: user.tenant_id,
        p_meta_ads_token: meta_ads_token?.trim() || null,
        p_google_ads_token: google_ads_token?.trim() || null
      });

    if (error || !updateResult) {
      console.error('Erro ao atualizar integração:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao atualizar integração'
      });
    }

    // Buscar dados atualizados
    const { data, error: fetchError } = await supabase
      .rpc('get_or_create_secure_integration', {
        p_company_id: user.tenant_id
      });

    if (fetchError || !data || data.length === 0) {
      console.error('Erro ao buscar dados atualizados:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar dados atualizados'
      });
    }

    // Retornar dados atualizados (sem chave secreta)
    const integration = data[0];
    const safeIntegration = {
      ...integration,
      api_key_secret: integration.api_key_secret ? '***HIDDEN***' : null
    };

    res.json({
      success: true,
      data: safeIntegration,
      message: 'Integração atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar integrações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/integrations/regenerate-keys - Regenerar chaves de API
router.post('/regenerate-keys', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Apenas administradores podem regenerar chaves.'
      });
    }

    // Regenerar chaves usando função SQL segura
    const { data, error } = await supabase
      .rpc('regenerate_secure_api_keys', {
        p_company_id: user.tenant_id
      });

    if (error) {
      console.error('Erro ao regenerar chaves:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao regenerar chaves'
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Integração não encontrada'
      });
    }

    const newKeys = data[0];

    res.json({
      success: true,
      data: {
        api_key_public: newKeys.public_key,
        api_key_secret: newKeys.secret_key
      },
      message: 'Chaves regeneradas com sucesso'
    });

  } catch (error) {
    console.error('Erro ao regenerar chaves:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// ============================================
// WEBHOOK ENDPOINT - RECEBER LEADS EXTERNOS
// ============================================

// POST /api/integrations/webhook/:company_slug - Receber leads via webhook
router.post('/webhook/:company_slug', async (req: Request, res: Response) => {
  try {
    const { company_slug } = req.params;
    const leadData: WebhookLeadData = req.body;
    const apiKey = req.headers['x-api-key'] as string;

    console.log('📨 Webhook recebido:', {
      company_slug,
      hasApiKey: !!apiKey,
      leadEmail: leadData.email
    });

    // Validar dados obrigatórios
    if (!leadData.first_name || !leadData.email) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: first_name, email'
      });
    }

    // Buscar integração pela empresa
    let integration: Integration | null = null;

    // Tentar buscar por slug da empresa
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .or(`name.ilike.%${company_slug}%,id.eq.${company_slug}`)
      .single();

    if (tenantData) {
      const { data: integrationData, error: integrationError } = await supabase
        .from('integrations')
        .select('*')
        .eq('company_id', tenantData.id)
        .single();

      if (integrationData) {
        integration = integrationData;
      }
    }

    // Se não encontrou por slug, tentar por chave pública da API
    if (!integration && apiKey) {
      const { data: integrationData, error: integrationError } = await supabase
        .from('integrations')
        .select('*')
        .eq('api_key_public', apiKey)
        .single();

      if (integrationData) {
        integration = integrationData;
      }
    }

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integração não encontrada para esta empresa'
      });
    }

    // Validar chave de API se fornecida
    if (apiKey && integration.api_key_public !== apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Chave de API inválida'
      });
    }

    // 🆕 PIPELINE INTELIGENTE - USAR ESPECÍFICA OU FALLBACK
    let pipelineId: string | null = leadData.pipeline_id || null; // Usar pipeline específica do N8N se fornecida

    // Validar pipeline específica se fornecida
    if (pipelineId) {
      console.log('🎯 Pipeline específica solicitada:', pipelineId);
      
      const { data: specificPipeline, error: specificError } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('id', pipelineId)
        .eq('tenant_id', integration.company_id) // Garantir que pertence à empresa
        .single();

      if (specificError || !specificPipeline) {
        console.warn('⚠️ Pipeline específica não encontrada ou sem acesso:', pipelineId);
        pipelineId = null; // Reset para usar fallback
      } else {
        console.log('✅ Pipeline específica validada:', specificPipeline.name);
      }
    }

    // FALLBACK: Buscar pipeline padrão da empresa (LÓGICA ORIGINAL MANTIDA)
    if (!pipelineId) {
      console.log('🔄 Usando fallback - buscando pipeline padrão da empresa');
      
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .select('id')
        .eq('tenant_id', integration.company_id)
        .eq('is_default', true)
        .single();

      pipelineId = pipelineData?.id;

      // Se não tem pipeline padrão, pegar o primeiro disponível
      if (!pipelineId) {
        const { data: firstPipeline } = await supabase
          .from('pipelines')
          .select('id')
          .eq('tenant_id', integration.company_id)
          .limit(1)
          .single();
        
        pipelineId = firstPipeline?.id;
      }

      if (!pipelineId) {
        return res.status(500).json({
          success: false,
          error: 'Nenhum pipeline encontrado para esta empresa'
        });
      }
    }

    // 🆕 BUSCAR STAGE "NOVOS LEADS" DO PIPELINE
    const { data: stageData, error: stageError } = await supabase
      .from('pipeline_stages')
      .select('id, name, position')
      .eq('pipeline_id', pipelineId)
      .or('name.ilike.%novos leads%,name.ilike.%novo%,name.ilike.%inicial%')
      .order('position', { ascending: true })
      .limit(1)
      .single();

    let stageId = stageData?.id;

    // Se não encontrou stage "Novos Leads", pegar a primeira stage do pipeline
    if (!stageId) {
      const { data: firstStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('pipeline_id', pipelineId)
        .order('position', { ascending: true })
        .limit(1)
        .single();
      
      stageId = firstStage?.id;
    }

    if (!stageId) {
      return res.status(500).json({
        success: false,
        error: 'Nenhuma etapa encontrada no pipeline'
      });
    }

    // 🆕 VALIDAÇÃO DE USUÁRIO ESPECÍFICO
    let assignedUserId: string | null = null;
    let createdByUserId: string | null = null;

    // Validar assigned_to se fornecido
    if (leadData.assigned_to) {
      console.log('👤 Usuário específico solicitado para assigned_to:', leadData.assigned_to);
      
      const { data: assignedUser, error: assignedError } = await supabase
        .from('users')
        .select('id, email, role, tenant_id')
        .eq('id', leadData.assigned_to)
        .eq('tenant_id', integration.company_id) // Garantir que pertence à empresa
        .single();

      if (assignedError || !assignedUser) {
        console.warn('⚠️ Usuário assigned_to não encontrado ou sem acesso:', leadData.assigned_to);
      } else if (assignedUser.role !== 'admin' && assignedUser.role !== 'member') {
        console.warn('⚠️ Usuário assigned_to não tem role válido:', assignedUser.role);
      } else {
        assignedUserId = assignedUser.id;
        console.log('✅ Usuário assigned_to validado:', assignedUser.email, '-', assignedUser.role);
      }
    }

    // Validar created_by se fornecido
    if (leadData.created_by) {
      console.log('👤 Usuário específico solicitado para created_by:', leadData.created_by);
      
      const { data: creatorUser, error: creatorError } = await supabase
        .from('users')
        .select('id, email, role, tenant_id')
        .eq('id', leadData.created_by)
        .eq('tenant_id', integration.company_id) // Garantir que pertence à empresa
        .single();

      if (creatorError || !creatorUser) {
        console.warn('⚠️ Usuário created_by não encontrado ou sem acesso:', leadData.created_by);
      } else if (creatorUser.role !== 'admin' && creatorUser.role !== 'member') {
        console.warn('⚠️ Usuário created_by não tem role válido:', creatorUser.role);
      } else {
        createdByUserId = creatorUser.id;
        console.log('✅ Usuário created_by validado:', creatorUser.email, '-', creatorUser.role);
      }
    }

    // 🆕 CRIAR LEAD NA TABELA PIPELINE_LEADS (SISTEMA MODERNO ATUALIZADO)
    const leadInsertData = {
      pipeline_id: pipelineId,
      stage_id: stageId,
      tenant_id: integration.company_id,
      temperature_level: leadData.lead_temperature || 'warm',
      assigned_to: assignedUserId,    // 🆕 Usuário específico ou null
      created_by: createdByUserId,    // 🆕 Criador específico ou null
      custom_data: {
        // Dados básicos do lead
        nome_lead: leadData.first_name + (leadData.last_name ? ` ${leadData.last_name}` : ''),
        nome_contato: leadData.first_name + (leadData.last_name ? ` ${leadData.last_name}` : ''),
        email: leadData.email,
        telefone: leadData.phone || null,
        empresa: leadData.company || null,
        cargo: leadData.job_title || null,
        
        // Dados de origem
        origem: leadData.source || 'N8N Webhook',
        source_type: 'webhook_integration',
        
        // Dados de campanha
        campaign_id: leadData.campaign_id,
        adset_id: leadData.adset_id,
        ad_id: leadData.ad_id,
        conversion_value: leadData.conversion_value,
        
        // Metadados
        created_via: 'webhook',
        webhook_data: leadData.additional_data,
        received_at: new Date().toISOString(),
        
        // Compatibilidade com sistema antigo
        first_name: leadData.first_name,
        last_name: leadData.last_name || '',
        lead_temperature: leadData.lead_temperature || 'morno',
        
        // 🆕 NOVOS CAMPOS PARA N8N - CONFIGURAÇÃO ESPECÍFICA
        pipeline_id: leadData.pipeline_id,
        assigned_to: leadData.assigned_to,
        created_by: leadData.created_by
      },
      // Timestamps automáticos para temperatura
      initial_stage_entry_time: new Date().toISOString(),
      stage_entry_time: new Date().toISOString()
    };

    const { data: newLead, error: leadError } = await supabase
      .from('pipeline_leads')
      .insert(leadInsertData)
      .select('id, custom_data, temperature_level, created_at')
      .single();

    if (leadError) {
      console.error('Erro ao criar lead:', leadError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar lead no sistema'
      });
    }

    // 🆕 APLICAR SISTEMA DE RODÍZIO AUTOMÁTICO SE CONFIGURADO
    let finalAssignedUserId = assignedUserId;
    let distributionMethod = 'manual';
    let distributionMessage = 'Lead criado sem atribuição automática';

    // Só aplicar rodízio se não foi definido usuário específico no N8N
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
            
            console.log('🎯 Rodízio aplicado com sucesso:', {
              leadId: newLead.id,
              assignedTo: finalAssignedUserId,
              method: distributionMethod,
              position: result.round_robin_position,
              totalMembers: result.total_eligible_members
            });
          } else {
            console.log('ℹ️ Rodízio não aplicado:', result.message);
          }
        }
      } catch (distributionError) {
        console.warn('⚠️ Erro ao aplicar rodízio (continuando com criação manual):', distributionError);
      }
    } else {
      distributionMethod = 'n8n_specified';
      distributionMessage = 'Usuário específico definido pelo N8N';
    }

    // Log de sucesso com detalhes da configuração aplicada
    console.log('✅ Lead criado via webhook:', {
      leadId: newLead.id,
      email: newLead.custom_data?.email || leadData.email,
      company: integration.company_id,
      stage: stageData?.name || 'Primeira etapa',
      temperature: newLead.temperature_level,
      // 🆕 INFORMAÇÕES DE CONFIGURAÇÃO
      pipeline_configured: leadData.pipeline_id ? 'específica' : 'fallback',
      assigned_to_configured: leadData.assigned_to ? 'específico' : 'não definido',
      created_by_configured: leadData.created_by ? 'específico' : 'não definido',
      // 🆕 INFORMAÇÕES DE DISTRIBUIÇÃO
      final_assigned_to: finalAssignedUserId,
      distribution_method: distributionMethod,
      distribution_message: distributionMessage
    });

    // Resposta de sucesso com informações detalhadas
    res.status(201).json({
      success: true,
      data: {
        lead_id: newLead.id,
        email: newLead.custom_data?.email || leadData.email,
        stage_id: stageId,
        pipeline_id: pipelineId,
        temperature: newLead.temperature_level,
        assigned_to: finalAssignedUserId,   // 🆕 ID do usuário final (após rodízio)
        created_by: createdByUserId,        // 🆕 ID do criador
        status: 'created'
      },
      // 🆕 INFORMAÇÕES DE CONFIGURAÇÃO APLICADA
      configuration: {
        pipeline_source: leadData.pipeline_id ? 'n8n_specific' : 'company_default',
        assigned_to_source: leadData.assigned_to ? 'n8n_specific' : 'system_assigned',
        created_by_source: leadData.created_by ? 'n8n_specific' : 'unassigned'
      },
      // 🆕 INFORMAÇÕES DE DISTRIBUIÇÃO
      distribution: {
        method: distributionMethod,
        message: distributionMessage,
        final_assigned_to: finalAssignedUserId,
        was_round_robin_applied: distributionMethod === 'round_robin'
      },
      message: 'Lead criado com sucesso na etapa inicial'
    });

  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// ============================================
// API ENDPOINTS - PARA INTEGRAÇÕES EXTERNAS
// ============================================

// GET /api/integrations/leads - Listar leads (para integrações)
router.get('/leads', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    const { limit = 50, offset = 0, status, created_after } = req.query;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Chave de API obrigatória'
      });
    }

    // Buscar integração pela chave pública
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('company_id')
      .eq('api_key_public', apiKey)
      .single();

    if (!integration) {
      return res.status(401).json({
        success: false,
        error: 'Chave de API inválida'
      });
    }

    // Construir query para buscar leads
    let query = supabase
      .from('leads_master')
      .select('id, first_name, last_name, email, phone, company, job_title, lead_temperature, source, status, created_at')
      .eq('tenant_id', integration.company_id)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    // Filtros opcionais
    if (status) {
      query = query.eq('status', status);
    }

    if (created_after) {
      query = query.gte('created_at', created_after);
    }

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      console.error('Erro ao buscar leads:', leadsError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar leads'
      });
    }

    res.json({
      success: true,
      data: leads,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: leads?.length || 0
      }
    });

  } catch (error) {
    console.error('Erro ao listar leads:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/integrations/leads - Criar lead via API (ATUALIZADO COM NOVA LÓGICA)
router.post('/leads', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    const leadData: WebhookLeadData = req.body;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Chave de API obrigatória'
      });
    }

    // Validar dados obrigatórios
    if (!leadData.first_name || !leadData.email) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: first_name, email'
      });
    }

    // Buscar integração pela chave pública
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('api_key_public', apiKey)
      .single();

    if (!integration) {
      return res.status(401).json({
        success: false,
        error: 'Chave de API inválida'
      });
    }

    // 🆕 PIPELINE INTELIGENTE - USAR ESPECÍFICA OU FALLBACK (MESMO CÓDIGO DO WEBHOOK)
    let pipelineId: string | null = leadData.pipeline_id || null;

    // Validar pipeline específica se fornecida
    if (pipelineId) {
      const { data: specificPipeline, error: specificError } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('id', pipelineId)
        .eq('tenant_id', integration.company_id)
        .single();

      if (specificError || !specificPipeline) {
        pipelineId = null; // Reset para usar fallback
      }
    }

    // FALLBACK: Buscar pipeline padrão
    if (!pipelineId) {
      const { data: pipelineData } = await supabase
        .from('pipelines')
        .select('id')
        .eq('tenant_id', integration.company_id)
        .eq('is_default', true)
        .single();

      pipelineId = pipelineData?.id;

      if (!pipelineId) {
        const { data: firstPipeline } = await supabase
          .from('pipelines')
          .select('id')
          .eq('tenant_id', integration.company_id)
          .limit(1)
          .single();
        
        pipelineId = firstPipeline?.id;
      }
    }

    // 🆕 VALIDAÇÃO DE USUÁRIOS (MESMO CÓDIGO DO WEBHOOK)
    let assignedUserId: string | null = null;
    let createdByUserId: string | null = null;

    if (leadData.assigned_to) {
      const { data: assignedUser, error: assignedError } = await supabase
        .from('users')
        .select('id, email, role, tenant_id')
        .eq('id', leadData.assigned_to)
        .eq('tenant_id', integration.company_id)
        .single();

      if (!assignedError && assignedUser && (assignedUser.role === 'admin' || assignedUser.role === 'member')) {
        assignedUserId = assignedUser.id;
      }
    }

    if (leadData.created_by) {
      const { data: creatorUser, error: creatorError } = await supabase
        .from('users')
        .select('id, email, role, tenant_id')
        .eq('id', leadData.created_by)
        .eq('tenant_id', integration.company_id)
        .single();

      if (!creatorError && creatorUser && (creatorUser.role === 'admin' || creatorUser.role === 'member')) {
        createdByUserId = creatorUser.id;
      }
    }

    // 🆕 CRIAR LEAD COM NOVA ESTRUTURA (COMPATÍVEL COM PIPELINE_LEADS)
    const leadInsertData = {
      first_name: leadData.first_name,
      last_name: leadData.last_name || '',
      email: leadData.email,
      phone: leadData.phone || null,
      company: leadData.company || null,
      job_title: leadData.job_title || null,
      lead_temperature: leadData.lead_temperature || 'morno',
      source: leadData.source || 'api',
      tenant_id: integration.company_id,
      created_via: 'api',
      status: 'novo',
      pipeline_id: pipelineId,
      assigned_to: assignedUserId,    // 🆕 Campo atualizado
      created_by: createdByUserId,    // 🆕 Campo atualizado
      additional_data: leadData.additional_data
    };

    const { data: newLead, error: leadError } = await supabase
      .from('leads_master')
      .insert(leadInsertData)
      .select()
      .single();

    if (leadError) {
      console.error('Erro ao criar lead:', leadError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar lead'
      });
    }

    res.status(201).json({
      success: true,
      data: {
        lead_id: newLead.id,
        email: newLead.email,
        assigned_to: assignedUserId,        // 🆕 ID do usuário atribuído
        created_by: createdByUserId,        // 🆕 ID do criador
        pipeline_id: pipelineId,            // 🆕 ID da pipeline utilizada
        status: 'created'
      },
      // 🆕 INFORMAÇÕES DE CONFIGURAÇÃO APLICADA
      configuration: {
        pipeline_source: leadData.pipeline_id ? 'api_specific' : 'company_default',
        assigned_to_source: leadData.assigned_to ? 'api_specific' : 'unassigned',
        created_by_source: leadData.created_by ? 'api_specific' : 'unassigned'
      },
      message: 'Lead criado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao criar lead via API:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/integrations/health - Health check para integrações
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;

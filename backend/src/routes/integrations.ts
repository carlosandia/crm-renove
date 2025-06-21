import { Router, Request, Response } from 'express';
import crypto from 'crypto';
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

    // Buscar pipeline padrão da empresa
    const { data: pipelineData, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id')
      .eq('tenant_id', integration.company_id)
      .eq('is_default', true)
      .single();

    let pipelineId = pipelineData?.id;

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

    // Criar lead no sistema
    const leadInsertData = {
      first_name: leadData.first_name,
      last_name: leadData.last_name || '',
      email: leadData.email,
      phone: leadData.phone || null,
      company: leadData.company || null,
      job_title: leadData.job_title || null,
      lead_temperature: leadData.lead_temperature || 'morno',
      source: leadData.source || 'webhook',
      tenant_id: integration.company_id,
      created_via: 'webhook',
      status: 'novo',
      pipeline_id: pipelineId,
      additional_data: {
        campaign_id: leadData.campaign_id,
        adset_id: leadData.adset_id,
        ad_id: leadData.ad_id,
        conversion_value: leadData.conversion_value,
        webhook_data: leadData.additional_data,
        received_at: new Date().toISOString()
      }
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
        error: 'Erro ao criar lead no sistema'
      });
    }

    // Log de sucesso
    console.log('✅ Lead criado via webhook:', {
      leadId: newLead.id,
      email: newLead.email,
      company: integration.company_id
    });

    // Resposta de sucesso
    res.status(201).json({
      success: true,
      data: {
        lead_id: newLead.id,
        email: newLead.email,
        status: 'created'
      },
      message: 'Lead criado com sucesso'
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

// POST /api/integrations/leads - Criar lead via API
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

    // Buscar pipeline padrão
    const { data: pipelineData } = await supabase
      .from('pipelines')
      .select('id')
      .eq('tenant_id', integration.company_id)
      .eq('is_default', true)
      .single();

    let pipelineId = pipelineData?.id;

    if (!pipelineId) {
      const { data: firstPipeline } = await supabase
        .from('pipelines')
        .select('id')
        .eq('tenant_id', integration.company_id)
        .limit(1)
        .single();
      
      pipelineId = firstPipeline?.id;
    }

    // Criar lead
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
        status: 'created'
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

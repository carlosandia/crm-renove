import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getApiConfig } from '../config/api';

const router = Router();

// Configuração segura do Supabase
const apiConfig = getApiConfig();
const supabase = createClient(apiConfig.supabaseUrl, apiConfig.supabaseServiceKey);

// Configurações de segurança
const WEBHOOK_SECRET_HEADER = 'x-webhook-signature';
const API_KEY_HEADER = 'x-api-key';
const HMAC_ALGORITHM = 'sha256';

// Interfaces melhoradas
interface SecureIntegration {
  id: string;
  company_id: string;
  meta_ads_token?: string;
  google_ads_token?: string;
  webhook_url: string;
  webhook_secret: string;
  api_key_public: string;
  api_key_secret: string;
  webhook_enabled: boolean;
  rate_limit_per_minute: number;
  created_at: string;
  updated_at: string;
  last_key_rotation: string;
}

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

interface RequestWithUser extends Request {
  user?: {
    id: string;
    role: string;
    tenant_id: string;
    email: string;
  };
}

// Utilitários de segurança
const generateHmacSignature = (payload: string, secret: string): string => {
  return crypto
    .createHmac(HMAC_ALGORITHM, secret)
    .update(payload, 'utf8')
    .digest('hex');
};

const verifyHmacSignature = (payload: string, signature: string, secret: string): boolean => {
  const expectedSignature = generateHmacSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
};

const sanitizeIntegrationForResponse = (integration: SecureIntegration) => ({
  ...integration,
  api_key_secret: integration.api_key_secret ? '***HIDDEN***' : null,
  webhook_secret: '***HIDDEN***'
});

// ============================================
// ROTAS PARA ADMINS - GERENCIAR INTEGRAÇÕES
// ============================================

// GET /api/integrations - Buscar integração da empresa
router.get('/', async (req: RequestWithUser, res: Response) => {
  try {
    const user = req.user;
    
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
    const safeIntegration = sanitizeIntegrationForResponse(integration);

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
router.put('/', async (req: RequestWithUser, res: Response) => {
  try {
    const user = req.user;
    const { meta_ads_token, google_ads_token } = req.body;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Apenas administradores podem atualizar integrações.'
      });
    }

    // Validar tokens se fornecidos
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
    const { data: updatedData } = await supabase
      .rpc('get_or_create_secure_integration', {
        p_company_id: user.tenant_id
      });

    const safeIntegration = updatedData?.[0] ? 
      sanitizeIntegrationForResponse(updatedData[0]) : null;

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
router.post('/regenerate-keys', async (req: RequestWithUser, res: Response) => {
  try {
    const user = req.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Apenas administradores podem regenerar chaves.'
      });
    }

    // Regenerar chaves usando função segura
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

// GET /api/integrations/health - Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0-secure'
  });
});

export default router;

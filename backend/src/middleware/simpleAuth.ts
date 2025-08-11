import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

// AIDEV-NOTE: Autenticação simplificada usando token Supabase diretamente
// Elimina complexidade JWT manual e usa session do Supabase

// Usar interface existente do sistema

/**
 * Middleware de autenticação simples usando Supabase token diretamente
 * Compatível com frontend que envia session.access_token
 */
export async function simpleAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log('🔐 [SIMPLE-AUTH] Verificando autenticação Supabase...');
    
    // Extrair token do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [SIMPLE-AUTH] Token não encontrado');
      res.status(401).json({
        success: false,
        error: 'Token de acesso requerido'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer "
    
    // ✅ AUTENTICAÇÃO DIRETA SUPABASE: Verificar token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ [SIMPLE-AUTH] Token inválido:', userError?.message);
      res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado'
      });
      return;
    }

    // ✅ EXTRAIR DADOS BÁSICOS do usuário Supabase - preservar role real
    req.user = {
      id: user.id,
      email: user.email || 'unknown@email.com',
      tenant_id: user.user_metadata?.tenant_id || '',
      role: user.user_metadata?.role || 'member', // ✅ Preserva role real (admin, member, etc.)
      first_name: user.user_metadata?.first_name,
      last_name: user.user_metadata?.last_name
    };

    console.log('✅ [SIMPLE-AUTH] Autenticação bem-sucedida:', {
      userId: req.user.id.substring(0, 8),
      email: req.user.email,
      role: req.user.role, // ✅ Mostrar role real (admin/member podem configurar email)
      tenant_id: req.user.tenant_id?.substring(0, 8) || 'N/A'
    });

    next();

  } catch (error) {
    console.error('❌ [SIMPLE-AUTH] Erro interno:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}

/**
 * Middleware opcional - não falha se não houver token
 * Para rotas que podem funcionar com ou sem autenticação
 */
export async function optionalSimpleAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('ℹ️ [OPTIONAL-AUTH] Sem token - prosseguindo sem autenticação');
      req.user = undefined;
      return next();
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.log('⚠️ [OPTIONAL-AUTH] Token inválido - prosseguindo sem autenticação');
      req.user = undefined;
      return next();
    }

    // Configurar usuário se token válido - preservar role real
    req.user = {
      id: user.id,
      email: user.email || 'unknown@email.com',
      tenant_id: user.user_metadata?.tenant_id || '',
      role: user.user_metadata?.role || 'member', // ✅ Preserva role real (admin, member, etc.)
      first_name: user.user_metadata?.first_name,
      last_name: user.user_metadata?.last_name
    };

    console.log('✅ [OPTIONAL-AUTH] Autenticação opcional bem-sucedida:', {
      role: req.user.role,
      email: req.user.email
    });
    next();

  } catch (error) {
    console.error('❌ [OPTIONAL-AUTH] Erro - prosseguindo sem autenticação:', error);
    req.user = undefined;
    next();
  }
}

/**
 * 🆕 Middleware de autenticação universal para WEBHOOKS
 * Aceita API Keys via múltiplos métodos para suportar N8N, Zapier, Make.com, etc.
 */
export async function webhookAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log('🔐 [WEBHOOK-AUTH] Verificando autenticação para webhook...');
    
    // ✅ MÉTODO 1: X-API-Key header (padrão N8N)
    let apiKey = req.headers['x-api-key'] as string;
    
    // ✅ MÉTODO 2: Authorization Bearer (alguns sistemas)
    if (!apiKey) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7); // Remove "Bearer "
      }
    }
    
    // ✅ MÉTODO 3: Query parameter ?api_key= (fallback)
    if (!apiKey) {
      apiKey = req.query.api_key as string;
    }
    
    if (!apiKey) {
      console.log('❌ [WEBHOOK-AUTH] API Key não encontrada');
      res.status(401).json({
        success: false,
        error: 'API Key requerida. Use X-API-Key header, Authorization Bearer, ou ?api_key= query parameter'
      });
      return;
    }

    console.log('🔄 [WEBHOOK-AUTH] Validando API Key:', {
      keyPrefix: apiKey.substring(0, 8) + '...',
      source: req.headers['x-api-key'] ? 'header' : (req.headers.authorization ? 'bearer' : 'query')
    });

    // ✅ VALIDAR API KEY no banco de dados Supabase
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('company_id, api_key_public, api_key_secret')
      .eq('api_key_public', apiKey)
      .single();

    if (integrationError || !integration) {
      console.error('❌ [WEBHOOK-AUTH] API Key inválida:', {
        keyPrefix: apiKey.substring(0, 8) + '...',
        error: integrationError?.message
      });
      res.status(401).json({
        success: false,
        error: 'API Key inválida ou não encontrada'
      });
      return;
    }

    // ✅ CONFIGURAR CONTEXTO DE WEBHOOK (sem usuário específico)
    req.webhookAuth = {
      tenantId: integration.company_id,
      apiKey: apiKey,
      authenticatedVia: 'webhook_api_key'
    };

    console.log('✅ [WEBHOOK-AUTH] Webhook autenticado com sucesso:', {
      tenantId: integration.company_id.substring(0, 8) + '...',
      keyPrefix: apiKey.substring(0, 8) + '...'
    });

    next();

  } catch (error) {
    console.error('❌ [WEBHOOK-AUTH] Erro interno:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno na autenticação do webhook'
    });
  }
}

/**
 * 🆕 Middleware híbrido: Tenta webhook auth primeiro, depois user auth
 * Para rotas que podem aceitar tanto usuários quanto webhooks
 */
export async function hybridAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log('🔄 [HYBRID-AUTH] Tentando autenticação híbrida...');
    
    // Primeiro, tentar webhook authentication
    const hasApiKey = req.headers['x-api-key'] || 
                     (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') && !req.headers.authorization.includes('eyJ')) ||
                     req.query.api_key;
    
    if (hasApiKey) {
      console.log('🔗 [HYBRID-AUTH] Detectada API Key - usando webhook auth...');
      return webhookAuth(req, res, next);
    }
    
    // Se não tem API Key, tentar user authentication
    console.log('👤 [HYBRID-AUTH] Sem API Key - usando user auth...');
    return simpleAuth(req, res, next);
    
  } catch (error) {
    console.error('❌ [HYBRID-AUTH] Erro na autenticação híbrida:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno na autenticação'
    });
  }
}

// Export para compatibilidade com código existente
export { simpleAuth as authenticateToken };
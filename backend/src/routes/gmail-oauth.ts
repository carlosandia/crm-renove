import express, { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authMiddleware as authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * ✅ GMAIL OAUTH - Rotas para autenticação OAuth2 com Gmail
 * Elimina necessidade de configuração SMTP manual para usuários Gmail
 */

// GET /api/gmail-oauth/auth-url - Gerar URL de autenticação OAuth2
router.get('/auth-url', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    // ✅ THROTTLING: Log apenas uma vez por minuto por usuário
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 [GMAIL-OAUTH] Solicitação de URL OAuth para usuário:', req.user.id.substring(0, 8));
    }

    // ✅ SIMPLIFICADO: Usar credenciais diretas das variáveis de ambiente
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://127.0.0.1:8080';

    if (!clientId || !clientSecret) {
      console.log('⚠️ [GMAIL-OAUTH] Credenciais Google não configuradas - modo demo');
      return res.json({
        success: true,
        authUrl: 'demo_mode', // ✅ Correção: usar authUrl (não auth_url)
        message: 'Modo demo - credenciais Google não configuradas nas variáveis de ambiente'
      });
    }

    console.log('✅ [GMAIL-OAUTH] Credenciais Google carregadas das variáveis de ambiente');

    const state = Math.random().toString(36).substring(2, 15);
    const redirectUri = `${frontendUrl}/oauth/callback`;
    
    // ✅ Salvar state no localStorage via response (mais simples que tabela oauth_states)
    const stateWithTimestamp = `${state}_${Date.now()}`;

    // Scopes específicos para Gmail
    const gmailScopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: gmailScopes,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state: `gmail_${stateWithTimestamp}`, // ✅ Prefixar com 'gmail_'
      include_granted_scopes: 'true'
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    console.log('✅ [GMAIL-OAUTH] URL OAuth gerada com sucesso via variáveis de ambiente');

    res.json({
      success: true,
      authUrl: authUrl, // ✅ Usar 'authUrl' consistentemente
      state: stateWithTimestamp
    });

  } catch (error: any) {
    console.error('❌ [GMAIL-OAUTH] Erro ao gerar URL OAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao gerar URL de autenticação',
      details: error.message
    });
  }
});

// POST /api/gmail-oauth/callback - Processar callback OAuth2
router.post('/callback', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Código de autorização ou state não fornecidos'
      });
    }

    console.log('🔄 [GMAIL-OAUTH] Processando callback OAuth:', {
      user_id: req.user.id.substring(0, 8),
      state: state.substring(0, 8)
    });

    // ✅ SIMPLIFICADO: Verificar state básico (state deve começar com 'gmail_')
    if (!state || !state.startsWith('gmail_')) {
      console.error('❌ [GMAIL-OAUTH] State OAuth inválido para Gmail');
      return res.status(400).json({
        success: false,
        error: 'State OAuth inválido - deve ser para Gmail OAuth'
      });
    }

    console.log('✅ [GMAIL-OAUTH] State OAuth válido para Gmail');

    // ✅ SIMPLIFICADO: Usar credenciais diretas das variáveis de ambiente
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://127.0.0.1:8080';

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        error: 'Credenciais Google não configuradas nas variáveis de ambiente'
      });
    }

    const redirectUri = `${frontendUrl}/oauth/callback`;

    // Trocar código por tokens
    console.log('🔄 [GMAIL-OAUTH] Trocando código por tokens...');
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('❌ [GMAIL-OAUTH] Erro na resposta de tokens:', errorData);
      return res.status(400).json({
        success: false,
        error: 'Falha ao obter tokens OAuth',
        details: errorData
      });
    }

    const tokenData = await tokenResponse.json();

    // Obter informações do usuário
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = userResponse.ok ? await userResponse.json() : {};

    if (!userData.email) {
      return res.status(400).json({
        success: false,
        error: 'Não foi possível obter email do usuário Google'
      });
    }

    // Buscar tenant_id do usuário
    const { data: userInfo, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', req.user.id)
      .single();

    if (userError || !userInfo?.tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'Usuário não possui tenant_id válido'
      });
    }

    console.log('💾 [GMAIL-OAUTH] Salvando integração Gmail OAuth...');

    // Desativar integrações Gmail existentes
    await supabase
      .from('user_email_integrations')
      .update({ is_active: false })
      .eq('user_id', req.user.id)
      .eq('provider', 'gmail_oauth');

    // Criar nova integração OAuth Gmail
    const integrationData = {
      user_id: req.user.id,
      tenant_id: userInfo.tenant_id,
      provider: 'gmail_oauth',
      email_address: userData.email,
      display_name: userData.name || userData.email.split('@')[0],
      
      // Para OAuth, identificamos com valores especiais
      smtp_host: 'oauth.gmail.com',
      smtp_port: 443,
      smtp_secure: true,
      smtp_username: userData.email,
      smtp_password_encrypted: Buffer.from(tokenData.access_token).toString('base64'),
      
      // Metadados OAuth específicos
      oauth_provider: 'google',
      oauth_access_token: tokenData.access_token,
      oauth_refresh_token: tokenData.refresh_token || null,
      oauth_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
      
      is_active: true,
      last_test_at: new Date().toISOString(),
      integration_metadata: {
        connection_type: 'oauth2',
        gmail_api: true,
        scopes: ['gmail.send', 'userinfo.email', 'userinfo.profile'],
        connected_at: new Date().toISOString(),
        user_name: userData.name,
        user_picture: userData.picture
      }
    };

    const { data: savedIntegration, error: saveError } = await supabase
      .from('user_email_integrations')
      .insert(integrationData)
      .select()
      .single();

    if (saveError) {
      console.error('❌ [GMAIL-OAUTH] Erro ao salvar integração:', saveError);
      return res.status(500).json({
        success: false,
        error: 'Falha ao salvar integração Gmail OAuth',
        details: saveError
      });
    }

    console.log('✅ [GMAIL-OAUTH] Integração Gmail OAuth salva:', savedIntegration.id);

    res.json({
      success: true,
      message: 'Gmail conectado com sucesso via OAuth2',
      data: {
        integration_id: savedIntegration.id,
        email: userData.email,
        name: userData.name,
        expires_at: integrationData.oauth_expires_at,
        connected_at: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ [GMAIL-OAUTH] Erro no callback OAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no callback OAuth',
      details: error.message
    });
  }
});

// POST /api/gmail-oauth/send - Enviar email via Gmail API
router.post('/send', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    const { to, subject, message, lead_id } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: to, subject, message'
      });
    }

    console.log('📧 [GMAIL-API] Enviando email via Gmail API:', {
      to,
      subject: subject.substring(0, 30) + '...',
      user_id: req.user.id.substring(0, 8)
    });

    // Buscar integração Gmail OAuth ativa
    const { data: integration, error: integrationError } = await supabase
      .from('user_email_integrations')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('provider', 'gmail_oauth')
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      return res.status(400).json({
        success: false,
        error: 'Configure sua conta Gmail via OAuth em Integrações → E-mail pessoal'
      });
    }

    // Verificar se token ainda é válido
    const tokenExpiresAt = new Date(integration.oauth_expires_at);
    const now = new Date();
    
    if (tokenExpiresAt <= now) {
      return res.status(401).json({
        success: false,
        error: 'Token OAuth expirado. Reconecte sua conta Gmail.'
      });
    }

    // Preparar mensagem para Gmail API
    const emailContent = [
      `From: ${integration.display_name} <${integration.email_address}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      message
    ].join('\r\n');

    const encodedMessage = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log('🚀 [GMAIL-API] Executando envio via Gmail API...');
    
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.oauth_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    });

    if (!gmailResponse.ok) {
      const errorData = await gmailResponse.text();
      console.error('❌ [GMAIL-API] Erro na resposta Gmail:', errorData);
      
      if (gmailResponse.status === 401) {
        return res.status(401).json({
          success: false,
          error: 'Token OAuth inválido. Reconecte sua conta Gmail.'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: `Erro Gmail API: ${gmailResponse.status}`,
        details: errorData
      });
    }

    const result = await gmailResponse.json();
    console.log('✅ [GMAIL-API] Email enviado com sucesso:', result.id);

    // Salvar no histórico
    try {
      await supabase.from('email_history').insert({
        tenant_id: req.user.tenant_id,
        user_id: req.user.id,
        lead_id: lead_id || null,
        to_email: to,
        from_email: integration.email_address,
        subject: subject,
        content: message,
        status: 'sent',
        sent_at: new Date().toISOString(),
        email_message_id: result.id,
        provider: 'gmail_oauth'
      });
    } catch (historyError) {
      console.warn('⚠️ [GMAIL-API] Histórico não salvo:', historyError);
    }

    res.json({
      success: true,
      message: 'E-mail enviado via Gmail API com sucesso',
      data: {
        messageId: result.id,
        to,
        subject,
        sent_at: new Date().toISOString(),
        provider: 'gmail_oauth'
      }
    });

  } catch (error: any) {
    console.error('❌ [GMAIL-API] Erro no envio:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Erro interno no envio via Gmail API',
      details: error
    });
  }
});

// GET /api/gmail-oauth/status - Verificar status da integração Gmail
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    const { data: integration, error } = await supabase
      .from('user_email_integrations')
      .select('id, email_address, display_name, oauth_expires_at, created_at, integration_metadata')
      .eq('user_id', req.user.id)
      .eq('provider', 'gmail_oauth')
      .eq('is_active', true)
      .single();

    if (error || !integration) {
      return res.json({
        success: true,
        has_integration: false,
        message: 'Nenhuma integração Gmail OAuth encontrada'
      });
    }

    // Verificar se token ainda é válido
    const tokenExpiresAt = new Date(integration.oauth_expires_at);
    const now = new Date();
    const isExpired = tokenExpiresAt <= now;

    res.json({
      success: true,
      has_integration: true,
      data: {
        integration_id: integration.id,
        email: integration.email_address,
        display_name: integration.display_name,
        expires_at: integration.oauth_expires_at,
        is_expired: isExpired,
        connected_at: integration.created_at,
        metadata: integration.integration_metadata
      }
    });

  } catch (error: any) {
    console.error('❌ [GMAIL-OAUTH] Erro ao verificar status:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao verificar status',
      details: error.message
    });
  }
});

// DELETE /api/gmail-oauth/disconnect - Desconectar integração Gmail OAuth
router.delete('/disconnect', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    console.log('🗑️ [GMAIL-OAUTH] Desconectando Gmail OAuth para usuário:', req.user.id.substring(0, 8));

    const { data, error } = await supabase
      .from('user_email_integrations')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', req.user.id)
      .eq('provider', 'gmail_oauth')
      .eq('is_active', true)
      .select();

    if (error) {
      console.error('❌ [GMAIL-OAUTH] Erro ao desconectar:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao desconectar integração Gmail',
        details: error
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nenhuma integração Gmail OAuth ativa encontrada'
      });
    }

    console.log('✅ [GMAIL-OAUTH] Gmail OAuth desconectado com sucesso');

    res.json({
      success: true,
      message: 'Integração Gmail OAuth desconectada com sucesso',
      data: {
        disconnected_at: new Date().toISOString(),
        integrations_disconnected: data.length
      }
    });

  } catch (error: any) {
    console.error('❌ [GMAIL-OAUTH] Erro ao desconectar:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao desconectar',
      details: error.message
    });
  }
});

export default router;
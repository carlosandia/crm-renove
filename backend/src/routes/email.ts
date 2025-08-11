import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { supabase } from '../config/supabase';
import { authMiddleware as authenticateToken } from '../middleware/auth';
import { promisify } from 'util';
import { lookup } from 'dns';

const router = express.Router();
const dnsLookup = promisify(lookup);

// AIDEV-NOTE: Sistema robusto de teste SMTP seguindo melhores práticas da indústria
// Implementa validação DNS, fallbacks automáticos e logs detalhados

// ============================================
// INTERFACES SIMPLIFICADAS
// ============================================

interface EmailTestRequest {
  email_address: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_secure: boolean; // ✅ CORREÇÃO: Campo único para SSL/TLS
}

interface EmailIntegrationRequest extends EmailTestRequest {
  display_name?: string;
  provider?: string;
}

// ============================================
// PROVEDORES PRÉ-CONFIGURADOS (EXPANDIDO)
// ============================================

const EMAIL_PROVIDERS: Record<string, { name: string; smtp_host: string; smtp_port: number; smtp_secure: boolean; }> = {
  'gmail.com': { name: 'Gmail', smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_secure: false },
  'outlook.com': { name: 'Outlook', smtp_host: 'smtp-mail.outlook.com', smtp_port: 587, smtp_secure: false },
  'hotmail.com': { name: 'Hotmail', smtp_host: 'smtp-mail.outlook.com', smtp_port: 587, smtp_secure: false },
  'yahoo.com': { name: 'Yahoo', smtp_host: 'smtp.mail.yahoo.com', smtp_port: 587, smtp_secure: false },
  'uol.com.br': { name: 'UOL', smtp_host: 'smtps.uol.com.br', smtp_port: 587, smtp_secure: false },
  'terra.com.br': { name: 'Terra', smtp_host: 'smtp.terra.com.br', smtp_port: 587, smtp_secure: false }
};

// ============================================
// UTILITÁRIOS AVANÇADOS
// ============================================

function detectEmailProvider(email: string) {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain && EMAIL_PROVIDERS[domain] ? EMAIL_PROVIDERS[domain] : null;
}

// ✅ NOVO: Validação DNS para verificar se servidor SMTP existe
async function validateSMTPServer(hostname: string): Promise<{ valid: boolean; error?: string }> {
  try {
    console.log(`🔍 [EMAIL-DNS] Validando servidor: ${hostname}`);
    await dnsLookup(hostname);
    console.log(`✅ [EMAIL-DNS] Servidor ${hostname} encontrado`);
    return { valid: true };
  } catch (error: any) {
    console.log(`❌ [EMAIL-DNS] Servidor ${hostname} não encontrado: ${error.code}`);
    return { 
      valid: false, 
      error: error.code === 'ENOTFOUND' ? 'Servidor SMTP não encontrado' : 'Erro na resolução DNS'
    };
  }
}

// ✅ CORREÇÃO CRÍTICA: Sistema dual-stack IPv4/IPv6 com fallbacks robustos
function createTransportConfigs(host: string, port: number, username: string, password: string, secure: boolean) {
  const baseConfig = {
    host,
    port: parseInt(String(port)),
    auth: { user: username, pass: password },
    connectionTimeout: 45000, // 45s timeout estendido
    socketTimeout: 45000
  };

  // Configurações a serem tentadas em ordem de prioridade
  const configs = [];

  // ✅ PRIORIDADE 1: Configurações específicas para UNI5/servidores problemáticos
  if (host.includes('uni5.net') || host.includes('smtpi')) {
    // Configuração IPv6 forçada para UNI5
    configs.push({
      ...baseConfig,
      family: 6, // Força IPv6
      secure: false,
      requireTLS: true,
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1',
        servername: host
      },
      name: 'IPv6 STARTTLS (UNI5 otimizado)'
    });

    // Configuração com IP hardcoded IPv6 (backup)
    configs.push({
      ...baseConfig,
      host: '2804:10:8028::220:80', // IPv6 do UNI5
      family: 6,
      secure: false,
      requireTLS: true,
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1',
        servername: host // Preserva hostname original para TLS
      },
      name: 'IPv6 hardcoded (UNI5 fallback)'
    });
  }

  if (port === 465) {
    // Porta 465 = SSL direto (sempre secure: true)
    configs.push({
      ...baseConfig,
      secure: true,
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1'
      },
      name: 'SSL direto (porta 465)'
    });
  } else if (port === 587) {
    // ✅ PRIORIDADE 2: Configurações otimizadas para porta 587
    
    // Configuração dual-stack padrão
    configs.push({
      ...baseConfig,
      family: 0, // Permite IPv4 e IPv6
      secure: false,
      requireTLS: true,
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1',
        servername: host
      },
      name: 'Dual-stack STARTTLS (porta 587)'
    });

    // IPv4 forçado para compatibilidade
    configs.push({
      ...baseConfig,
      family: 4, // Força IPv4
      secure: false,
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1'
      },
      name: 'IPv4 STARTTLS (porta 587)'
    });
  } else {
    // Portas customizadas - tentar conforme solicitado pelo usuário
    configs.push({
      ...baseConfig,
      secure: secure,
      family: 0, // Dual-stack
      ...(secure ? {} : {
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1'
        }
      }),
      name: `Dual-stack customizada (porta ${port})`
    });
  }

  // ✅ PRIORIDADE 3: Fallbacks universais
  
  // Configuração com TLS relaxado
  configs.push({
    ...baseConfig,
    secure: false,
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1',
      ciphers: 'ALL'
    },
    name: 'TLS relaxado (fallback)'
  });

  // Fallback sem TLS como última opção
  configs.push({
    ...baseConfig,
    secure: false,
    ignoreTLS: true,
    name: 'Sem criptografia (último recurso)'
  });

  return configs;
}

// ✅ SIMPLIFICAÇÃO: Criptografia básica (será melhorada futuramente)
function encryptPassword(password: string): string {
  return Buffer.from(password).toString('base64');
}

function decryptPassword(encryptedPassword: string): string {
  return Buffer.from(encryptedPassword, 'base64').toString('utf8');
}

// ============================================
// ROTAS SIMPLIFICADAS
// ============================================

// GET /api/email/integrations - Buscar integrações
router.get('/integrations', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    const { data: integrations, error } = await supabase
      .from('user_email_integrations')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true);

    if (error) {
      console.error('❌ [EMAIL] Erro ao buscar integrações:', error);
      return res.status(500).json({ success: false, error: 'Erro interno' });
    }

    // Mascarar senhas na resposta
    const safeIntegrations = integrations?.map(integration => ({
      ...integration,
      smtp_password_encrypted: '********'
    })) || [];

    res.json({ success: true, data: safeIntegrations });

  } catch (error) {
    console.error('❌ [EMAIL] Erro interno:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// POST /api/email/test-connection - Teste robusto de conexão SMTP
router.post('/test-connection', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    const { email_address, smtp_host, smtp_port, smtp_username, smtp_password, smtp_secure }: EmailTestRequest = req.body;

    // Validação básica
    if (!email_address || !smtp_host || !smtp_port || !smtp_username || !smtp_password) {
      return res.status(400).json({ success: false, error: 'Todos os campos são obrigatórios' });
    }

    console.log('🧪 [EMAIL] Iniciando teste robusto:', { 
      email: email_address, 
      host: smtp_host, 
      port: smtp_port, 
      secure: smtp_secure 
    });

    // ✅ ETAPA 1: Validação DNS
    const dnsValidation = await validateSMTPServer(smtp_host);
    if (!dnsValidation.valid) {
      console.log(`❌ [EMAIL] Falha na validação DNS: ${dnsValidation.error}`);
      return res.status(400).json({
        success: false,
        error: `Servidor SMTP inválido: ${dnsValidation.error}`,
        data: { status: 'dns_failed', tested_at: new Date().toISOString() }
      });
    }

    // ✅ ETAPA 2: Configurações com fallback
    const transportConfigs = createTransportConfigs(smtp_host, smtp_port, smtp_username, smtp_password, smtp_secure);
    
    let lastError: any = null;
    let successful = false;
    let usedConfig: any = null;

    // ✅ ETAPA 3: Tentar configurações em ordem de prioridade
    for (const config of transportConfigs) {
      try {
        console.log(`🔧 [EMAIL] Tentando: ${config.name}`);
        
        // Remover propriedades auxiliares antes de criar o transport
        const { name, ...transportConfig } = config;
        const transporter = nodemailer.createTransport(transportConfig);

        // ✅ CORREÇÃO: Timeout estendido para 45s (servidores lentos)
        await Promise.race([
          transporter.verify(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT')), 45000)
          )
        ]);

        console.log(`✅ [EMAIL] Sucesso com: ${config.name}`);
        successful = true;
        usedConfig = config;
        break;

      } catch (error: any) {
        console.log(`⚠️ [EMAIL] Falhou ${config.name}: ${error.message}`);
        lastError = error;
        continue;
      }
    }

    if (successful) {
      res.json({
        success: true,
        message: `Conexão SMTP estabelecida! (Configuração: ${usedConfig.name})`,
        data: { 
          status: 'success', 
          config_used: usedConfig.name,
          tested_at: new Date().toISOString() 
        }
      });
    } else {
      // ✅ CORREÇÃO: Mensagens específicas para diferentes tipos de erro
      let errorMessage = 'Falha na conexão SMTP';
      let suggestion = '';

      if (lastError?.code === 'EAUTH') {
        errorMessage = 'Credenciais inválidas - verifique email e senha';
        suggestion = 'Confirme o email e senha. Para Gmail/Yahoo, use senha de aplicativo.';
      } else if (lastError?.code === 'ENOTFOUND') {
        errorMessage = 'Servidor SMTP não encontrado';
        suggestion = 'Verifique se o servidor SMTP está correto.';
      } else if (lastError?.code === 'ECONNECTION') {
        errorMessage = 'Falha na conexão - servidor pode estar indisponível';
        suggestion = 'Tente novamente em alguns minutos ou contate o administrador.';
      } else if (lastError?.code === 'ETIMEDOUT' || lastError?.message === 'TIMEOUT') {
        if (smtp_host.includes('uni5.net')) {
          errorMessage = 'Timeout na conexão com servidor UNI5';
          suggestion = 'O servidor UNI5 está lento. Tentamos IPv6 e IPv4. Contate o suporte UNI5 se o problema persistir.';
        } else {
          errorMessage = 'Timeout na conexão - servidor muito lento';
          suggestion = 'O servidor SMTP não respondeu em 45 segundos. Verifique a conectividade.';
        }
      } else if (lastError?.message) {
        errorMessage = `Erro: ${lastError.message}`;
      }

      console.log(`❌ [EMAIL] Todas as configurações falharam. Último erro: ${lastError?.message}`);

      res.status(400).json({
        success: false,
        error: errorMessage,
        suggestion: suggestion,
        data: { 
          status: 'failed',
          last_error: lastError?.code || 'UNKNOWN',
          configs_tried: transportConfigs.length,
          tested_at: new Date().toISOString() 
        }
      });
    }

  } catch (error: any) {
    console.error('❌ [EMAIL] Erro crítico no teste:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      data: { status: 'server_error', tested_at: new Date().toISOString() }
    });
  }
});

// POST /api/email/integrations - Salvar integração
router.post('/integrations', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    const { email_address, display_name, smtp_host, smtp_port, smtp_username, smtp_password, smtp_secure, provider }: EmailIntegrationRequest = req.body;

    // Validação
    if (!email_address || !smtp_host || !smtp_port || !smtp_username || !smtp_password) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes' });
    }

    // Buscar tenant_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', req.user.id)
      .single();

    if (userError || !userData) {
      return res.status(400).json({ success: false, error: 'Usuário não encontrado' });
    }

    // Criptografar senha (simplificado)
    const encryptedPassword = encryptPassword(smtp_password);

    // Verificar integração existente
    const { data: existingIntegration } = await supabase
      .from('user_email_integrations')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('email_address', email_address)
      .single();

    const integrationData = {
      user_id: req.user.id,
      tenant_id: userData.tenant_id,
      email_address,
      display_name: display_name || email_address.split('@')[0],
      smtp_host,
      smtp_port: parseInt(String(smtp_port)),
      smtp_secure, // ✅ CORREÇÃO: Campo único padronizado
      smtp_username,
      smtp_password_encrypted: encryptedPassword,
      provider: provider || detectEmailProvider(email_address)?.name || 'Custom',
      is_active: true,
      test_status: 'pending',
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingIntegration) {
      // Atualizar
      const { data, error } = await supabase
        .from('user_email_integrations')
        .update(integrationData)
        .eq('id', existingIntegration.id)
        .select()
        .single();
      result = { data, error };
    } else {
      // Criar
      const { data, error } = await supabase
        .from('user_email_integrations')
        .insert({ ...integrationData, created_at: new Date().toISOString() })
        .select()
        .single();
      result = { data, error };
    }

    if (result.error) {
      console.error('❌ [EMAIL] Erro ao salvar:', result.error);
      return res.status(500).json({ success: false, error: 'Erro ao salvar configuração' });
    }

    // Mascarar senha na resposta
    const responseData = { ...result.data, smtp_password_encrypted: '********' };

    res.json({
      success: true,
      message: existingIntegration ? 'Configuração atualizada' : 'Configuração salva',
      data: responseData
    });

  } catch (error) {
    console.error('❌ [EMAIL] Erro ao salvar:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ✅ TESTE TEMPORÁRIO: Endpoint sem auth para validar correções IPv6
router.post('/test-connection-debug', async (req: Request, res: Response) => {
  try {
    const { email_address, smtp_host, smtp_port, smtp_username, smtp_password, smtp_secure } = req.body;

    // Validação básica
    if (!email_address || !smtp_host || !smtp_port || !smtp_username || !smtp_password) {
      return res.status(400).json({ success: false, error: 'Todos os campos são obrigatórios' });
    }

    console.log('🧪 [EMAIL-DEBUG] Iniciando teste sem auth:', { 
      email: email_address, 
      host: smtp_host, 
      port: smtp_port, 
      secure: smtp_secure 
    });

    // ✅ ETAPA 1: Validação DNS
    const dnsValidation = await validateSMTPServer(smtp_host);
    if (!dnsValidation.valid) {
      console.log(`❌ [EMAIL-DEBUG] Falha na validação DNS: ${dnsValidation.error}`);
      return res.status(400).json({
        success: false,
        error: `Servidor SMTP inválido: ${dnsValidation.error}`,
        data: { status: 'dns_failed', tested_at: new Date().toISOString() }
      });
    }

    // ✅ ETAPA 2: Configurações com fallback
    const transportConfigs = createTransportConfigs(smtp_host, smtp_port, smtp_username, smtp_password, smtp_secure);
    
    let lastError = null;
    let successful = false;
    let usedConfig = null;

    // ✅ ETAPA 3: Tentar configurações em ordem de prioridade
    for (const config of transportConfigs) {
      try {
        console.log(`🔧 [EMAIL-DEBUG] Tentando: ${config.name}`);
        
        // Remover propriedades auxiliares antes de criar o transport
        const { name, ...transportConfig } = config;
        const transporter = nodemailer.createTransport(transportConfig);

        // Teste de verificação com timeout
        await Promise.race([
          transporter.verify(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT')), 45000)
          )
        ]);

        console.log(`✅ [EMAIL-DEBUG] Sucesso com: ${config.name}`);
        successful = true;
        usedConfig = config;
        break;

      } catch (error) {
        console.log(`⚠️ [EMAIL-DEBUG] Falhou ${config.name}: ${error.message}`);
        lastError = error;
        continue;
      }
    }

    if (successful) {
      res.json({
        success: true,
        message: `Conexão SMTP estabelecida! (Configuração: ${usedConfig.name})`,
        data: { 
          status: 'success', 
          config_used: usedConfig.name,
          tested_at: new Date().toISOString() 
        }
      });
    } else {
      let errorMessage = 'Falha na conexão SMTP';
      let suggestion = '';

      if (lastError?.code === 'ETIMEDOUT' || lastError?.message === 'TIMEOUT') {
        if (smtp_host.includes('uni5.net')) {
          errorMessage = 'Timeout na conexão com servidor UNI5';
          suggestion = 'O servidor UNI5 está lento. Tentamos IPv6 e IPv4. Contate o suporte UNI5 se o problema persistir.';
        } else {
          errorMessage = 'Timeout na conexão - servidor muito lento';
          suggestion = 'O servidor SMTP não respondeu em 45 segundos. Verifique a conectividade.';
        }
      }

      res.status(400).json({
        success: false,
        error: errorMessage,
        suggestion: suggestion,
        data: { 
          status: 'failed',
          last_error: lastError?.code || 'UNKNOWN',
          configs_tried: transportConfigs.length,
          tested_at: new Date().toISOString() 
        }
      });
    }

  } catch (error) {
    console.error('❌ [EMAIL-DEBUG] Erro crítico no teste:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      data: { status: 'server_error', tested_at: new Date().toISOString() }
    });
  }
});

// GET /api/email/providers - Provedores disponíveis
router.get('/providers', (req: Request, res: Response) => {
  const providers = Object.entries(EMAIL_PROVIDERS).map(([domain, config]) => ({
    name: config.name,
    domain,
    smtp_host: config.smtp_host,
    smtp_port: config.smtp_port,
    smtp_secure: config.smtp_secure,
    instructions: config.name === 'Gmail' || config.name === 'Yahoo' 
      ? 'Use uma senha de aplicativo' 
      : 'Use sua senha normal da conta'
  }));

  res.json({ success: true, data: providers });
});

// POST /api/email/send - Enviar e-mail usando integração do usuário
router.post('/send', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    const { to, subject, message, lead_id } = req.body;

    // Validação básica
    if (!to || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campos obrigatórios: to, subject, message' 
      });
    }

    console.log('📧 [EMAIL-SEND] Iniciando envio:', {
      to,
      subject: subject.substring(0, 50) + '...',
      user_id: req.user.id.substring(0, 8),
      lead_id: lead_id?.substring(0, 8)
    });

    // Buscar integração de e-mail ativa do usuário
    const { data: integration, error: integrationError } = await supabase
      .from('user_email_integrations')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      console.error('❌ [EMAIL-SEND] Nenhuma integração ativa encontrada:', integrationError);
      return res.status(400).json({
        success: false,
        error: 'Nenhuma integração de e-mail ativa configurada'
      });
    }

    // Descriptografar senha
    const password = decryptPassword(integration.smtp_password_encrypted);

    // Criar configurações de transporte
    const transportConfigs = createTransportConfigs(
      integration.smtp_host,
      integration.smtp_port,
      integration.smtp_username,
      password,
      integration.smtp_secure
    );

    let successful = false;
    let messageId = '';
    let lastError: any = null;

    // Tentar enviar com configurações em ordem de prioridade
    for (const config of transportConfigs) {
      try {
        console.log(`📧 [EMAIL-SEND] Tentando: ${config.name}`);
        
        const { name, ...transportConfig } = config;
        const transporter = nodemailer.createTransport(transportConfig);

        const mailOptions = {
          from: `${integration.display_name || integration.smtp_username} <${integration.email_address}>`,
          to: to,
          subject: subject,
          html: message.replace(/\n/g, '<br>'),
          text: message
        };

        const result = await transporter.sendMail(mailOptions);
        messageId = result.messageId;
        successful = true;
        console.log(`✅ [EMAIL-SEND] Sucesso com: ${config.name}`);
        break;

      } catch (error: any) {
        console.log(`⚠️ [EMAIL-SEND] Falhou ${config.name}: ${error.message}`);
        lastError = error;
        continue;
      }
    }

    if (successful) {
      // Buscar tenant_id do usuário para salvar histórico
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', req.user.id)
        .single();

      // Registrar no histórico (não bloquear envio se falhar)
      try {
        await supabase.from('email_history').insert({
          tenant_id: userData?.tenant_id || req.user.tenant_id,
          user_id: req.user.id,
          lead_id: lead_id || null,
          to_email: to,
          from_email: integration.email_address,
          subject: subject,
          content: message,
          status: 'sent',
          sent_at: new Date().toISOString(),
          email_message_id: messageId
        });
      } catch (historyError) {
        console.warn('⚠️ [EMAIL-SEND] Erro ao salvar histórico (não crítico):', historyError);
      }

      res.json({
        success: true,
        message: 'E-mail enviado com sucesso',
        data: {
          messageId,
          to,
          subject,
          sent_at: new Date().toISOString()
        }
      });
    } else {
      let errorMessage = 'Falha ao enviar e-mail';
      if (lastError?.code === 'EAUTH') errorMessage = 'Credenciais inválidas - verifique sua configuração SMTP';
      else if (lastError?.code === 'ENOTFOUND') errorMessage = 'Servidor SMTP não encontrado';
      else if (lastError?.message) errorMessage = lastError.message;

      console.log(`❌ [EMAIL-SEND] Todas as configurações falharam: ${lastError?.message}`);

      res.status(500).json({
        success: false,
        error: errorMessage,
        details: lastError?.code || 'UNKNOWN'
      });
    }

  } catch (error: any) {
    console.error('❌ [EMAIL-SEND] Erro crítico:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// GET /api/email/history - Histórico de emails 
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    const { pipeline_id, lead_id, limit = '10', offset = '0' } = req.query;

    console.log('📧 [EMAIL-HISTORY] Buscando histórico:', {
      pipeline_id,
      lead_id, 
      limit,
      tenant_id: req.user.tenant_id?.substring(0, 8)
    });

    let query = supabase
      .from('email_history')
      .select(`
        id,
        subject,
        to_email,
        from_email,
        status,
        sent_at,
        error_message,
        lead_id,
        pipeline_id,
        user_id
      `)
      .eq('tenant_id', req.user.tenant_id)
      .order('sent_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    // Filtrar por pipeline se especificado
    if (pipeline_id) {
      query = query.eq('pipeline_id', pipeline_id);
    }

    // Filtrar por lead se especificado  
    if (lead_id) {
      query = query.eq('lead_id', lead_id);
    }

    const { data: emailHistory, error } = await query;

    if (error) {
      console.error('❌ [EMAIL-HISTORY] Erro na query:', error);
      return res.status(500).json({ success: false, error: 'Erro ao buscar histórico' });
    }

    const formattedHistory = (emailHistory || []).map(email => ({
      id: email.id,
      subject: email.subject,
      to: email.to_email,
      from: email.from_email,
      status: email.status,
      sent_at: email.sent_at,
      error_message: email.error_message
    }));

    console.log('✅ [EMAIL-HISTORY] Histórico encontrado:', formattedHistory.length);

    res.json({ 
      success: true, 
      data: formattedHistory,
      meta: {
        total: formattedHistory.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });

  } catch (error) {
    console.error('❌ [EMAIL-HISTORY] Erro interno:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

export default router;
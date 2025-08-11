import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { supabase } from '../config/supabase';
import { emailValidationService, SmtpConfig } from '../services/emailValidationService';

// AIDEV-NOTE: Autenticação Básica Supabase - padrão oficial CLAUDE.md
// Removido import do middleware JWT - usando supabase.auth.getUser() diretamente

const router = express.Router();

/**
 * ✅ VERSÃO ULTRA SIMPLES DO ENVIO DE EMAIL
 * - Remove todas as complexidades e fallbacks
 * - Timeout padrão do nodemailer (sem overrides)
 * - Configuração direta SMTP sem múltiplas tentativas
 * - Logs mínimos e essenciais
 */

// Função simples para descriptografar senha (Base64)
function decryptPassword(encryptedPassword: string): string {
  return Buffer.from(encryptedPassword, 'base64').toString('utf8');
}

// POST /api/simple-email/send - Versão ultra simples
router.post('/send', async (req: Request, res: Response) => {
  try {
    // ✅ AUTENTICAÇÃO BÁSICA SUPABASE - padrão oficial
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token de acesso requerido' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
    }

    // ✅ Validar tenant_id do user_metadata
    const tenantId = user.user_metadata?.tenant_id;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Usuário não possui tenant válido' });
    }

    const { to, subject, message, lead_id } = req.body;

    // Validação básica
    if (!to || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campos obrigatórios: to, subject, message' 
      });
    }

    console.log('📧 [SIMPLE-EMAIL] Enviando email:', {
      to,
      subject: subject.substring(0, 30) + '...',
      user_id: user.id.substring(0, 8)
    });

    // Buscar integração de e-mail ativa do usuário
    const { data: integration, error: integrationError } = await supabase
      .from('user_email_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      console.error('❌ [SIMPLE-EMAIL] Nenhuma integração encontrada');
      return res.status(400).json({
        success: false,
        error: 'Configure seu email em Integrações → E-mail pessoal'
      });
    }

    console.log('🔍 [SIMPLE-EMAIL] Integração encontrada:', {
      email: integration.email_address,
      host: integration.smtp_host,
      port: integration.smtp_port,
      username: integration.smtp_username,
      provider: integration.provider
    });

    // ✅ CONFIGURAÇÃO SEGUINDO PADRÕES CONTEXT7/NODEMAILER
    const password = decryptPassword(integration.smtp_password_encrypted);
    
    const transportConfig = {
      host: integration.smtp_host,
      port: integration.smtp_port,
      secure: integration.smtp_port === 465, // SSL para porta 465, STARTTLS para outras
      auth: {
        user: integration.smtp_username,
        pass: password
      },
      // ✅ TIMEOUTS PADRÃO NODEMAILER - MAIS COMPATÍVEIS
      connectionTimeout: 60000,        // 60 segundos para conectar (padrão: 2min)
      greetingTimeout: 30000,          // 30 segundos para greeting (padrão: 30s)
      socketTimeout: 75000,            // 75 segundos para socket (padrão: 10min - reduzido para corporativo)
      // ✅ TLS SEGUINDO PADRÕES CONTEXT7 - SEGURO MAS FLEXÍVEL
      tls: {
        rejectUnauthorized: false,     // Flexível para certificados corporativos
        minVersion: 'TLSv1.2',         // Versão segura mínima conforme Context7
        // Para servidores com IP fixo corporativo (UNI5)
        servername: integration.smtp_host // Validação TLS adequada
      },
      // ✅ DEBUG CONTROLADO PARA PRODUÇÃO
      debug: process.env.NODE_ENV === 'development', // Só em desenvolvimento
      logger: process.env.NODE_ENV === 'development' // Só em desenvolvimento
    };

    console.log('🔧 [SIMPLE-EMAIL] Configuração SMTP:', {
      host: transportConfig.host,
      port: transportConfig.port,
      secure: transportConfig.secure,
      user: transportConfig.auth.user
    });

    console.log('📧 [SIMPLE-EMAIL] Criando transporter com timeouts otimizados');
    const transporter = nodemailer.createTransport(transportConfig);

    // ✅ TESTAR CONEXÃO ANTES DE ENVIAR
    console.log('🔍 [SIMPLE-EMAIL] Verificando conexão SMTP...');
    try {
      await transporter.verify();
      console.log('✅ [SIMPLE-EMAIL] Conexão SMTP verificada com sucesso');
    } catch (verifyError: any) {
      console.error('❌ [SIMPLE-EMAIL] Falha na verificação SMTP:', {
        code: verifyError.code,
        command: verifyError.command,
        message: verifyError.message
      });
      // Continuar mesmo se verificação falhar (alguns servidores não suportam verify)
      console.log('⚠️ [SIMPLE-EMAIL] Continuando apesar da falha na verificação...');
    }

    const mailOptions = {
      from: `${integration.display_name || 'CRM'} <${integration.email_address}>`,
      to: to,
      subject: subject,
      html: message.replace(/\n/g, '<br>'),
      text: message
    };

    console.log('📧 [SIMPLE-EMAIL] Enviando email...');
    
    // ✅ ENVIO SIMPLES - SEM TIMEOUT CUSTOMIZADO
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ [SIMPLE-EMAIL] Email enviado com sucesso:', {
      messageId: result.messageId,
      response: result.response
    });

    // ✅ SALVAR HISTÓRICO SIMPLES (não bloquear se falhar)
    try {
      await supabase.from('email_history').insert({
        tenant_id: tenantId,
        user_id: user.id,
        lead_id: lead_id || null,
        to_email: to,
        from_email: integration.email_address,
        subject: subject,
        content: message,
        status: 'sent',
        sent_at: new Date().toISOString(),
        email_message_id: result.messageId
      });
    } catch (historyError) {
      console.warn('⚠️ [SIMPLE-EMAIL] Histórico não salvo (não crítico):', historyError);
    }

    res.json({
      success: true,
      message: 'E-mail enviado com sucesso',
      data: {
        messageId: result.messageId,
        to,
        subject,
        sent_at: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ [SIMPLE-EMAIL] Erro no envio:', error);
    
    let errorMessage = 'Erro ao enviar e-mail';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Credenciais de email inválidas. Verifique sua configuração.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Servidor SMTP não encontrado. Verifique a configuração.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Falha na conexão com o servidor SMTP.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Timeout na conexão SMTP. Tente novamente.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: {
        code: error.code,
        command: error.command,
        responseCode: error.responseCode
      }
    });
  }
});

// POST /api/simple-email/test-connection - Testar apenas conectividade SMTP
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    // ✅ AUTENTICAÇÃO BÁSICA SUPABASE - padrão oficial
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token de acesso requerido' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
    }

    // ✅ Validar tenant_id do user_metadata
    const tenantId = user.user_metadata?.tenant_id;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Usuário não possui tenant válido' });
    }

    console.log('🧪 [TEST-SMTP] Iniciando teste de conectividade...');

    // Buscar integração de e-mail ativa do usuário
    const { data: integration, error: integrationError } = await supabase
      .from('user_email_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      return res.status(400).json({
        success: false,
        error: 'Nenhuma configuração SMTP encontrada'
      });
    }

    console.log('🔍 [TEST-SMTP] Configuração encontrada:', {
      email: integration.email_address,
      host: integration.smtp_host,
      port: integration.smtp_port,
      username: integration.smtp_username
    });

    const password = decryptPassword(integration.smtp_password_encrypted);
    
    const transportConfig = {
      host: integration.smtp_host,
      port: integration.smtp_port,
      secure: integration.smtp_port === 465,
      auth: {
        user: integration.smtp_username,
        pass: password
      },
      // ✅ TIMEOUTS PADRÃO NODEMAILER - MAIS COMPATÍVEIS
      connectionTimeout: 60000,        // 60 segundos para conectar
      greetingTimeout: 30000,          // 30 segundos para greeting
      socketTimeout: 75000,            // 75 segundos para socket
      // ✅ TLS SEGUINDO PADRÕES CONTEXT7
      tls: {
        rejectUnauthorized: false,     // Flexível para certificados corporativos
        minVersion: 'TLSv1.2',         // Versão segura mínima
        servername: integration.smtp_host // Validação TLS adequada
      },
      // ✅ DEBUG CONTROLADO
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development'
    };

    console.log('🔧 [TEST-SMTP] Testando com configuração:', {
      host: transportConfig.host,
      port: transportConfig.port,
      secure: transportConfig.secure
    });

    const transporter = nodemailer.createTransport(transportConfig);

    // Teste de conectividade
    console.log('🧪 [TEST-SMTP] Executando transporter.verify()...');
    await transporter.verify();
    console.log('✅ [TEST-SMTP] Conexão SMTP bem-sucedida!');

    res.json({
      success: true,
      message: 'Conectividade SMTP funcionando perfeitamente',
      data: {
        host: integration.smtp_host,
        port: integration.smtp_port,
        email: integration.email_address,
        tested_at: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ [TEST-SMTP] Erro de conectividade:', {
      message: error.message,
      code: error.code,
      command: error.command,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port
    });

    let errorMessage = 'Erro de conectividade SMTP';
    let suggestion = '';

    if (error.code === 'ENOTFOUND') {
      errorMessage = 'Servidor SMTP não encontrado';
      suggestion = 'Verifique o hostname do servidor SMTP';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Timeout na conexão SMTP';
      suggestion = 'Servidor pode estar indisponível ou bloqueado por firewall';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Conexão recusada pelo servidor';
      suggestion = 'Verifique se a porta está correta e se o servidor permite conexões';
    } else if (error.code === 'EAUTH') {
      errorMessage = 'Falha na autenticação';
      suggestion = 'Verifique usuário e senha SMTP';
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      suggestion,
      details: {
        code: error.code,
        command: error.command,
        address: error.address,
        port: error.port,
        errno: error.errno
      }
    });
  }
});

// POST /api/simple-email/validate-config - Validar configuração SMTP
router.post('/validate-config', async (req: Request, res: Response) => {
  try {
    // ✅ AUTENTICAÇÃO BÁSICA SUPABASE - padrão oficial
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token de acesso requerido' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
    }

    // ✅ Validar tenant_id do user_metadata
    const tenantId = user.user_metadata?.tenant_id;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Usuário não possui tenant válido' });
    }

    const { host, port, user: smtpUser, password }: SmtpConfig = req.body;

    // Validação básica dos campos
    if (!host || !port || !smtpUser || !password) {
      return res.status(400).json({
        success: false,
        error: 'Todos os campos são obrigatórios: host, port, user, password'
      });
    }

    console.log('🧪 [VALIDATE-CONFIG] Validação solicitada para:', {
      host,
      port,
      user: smtpUser,
      user_id: user.id.substring(0, 8)
    });

    // Executar validação
    const result = await emailValidationService.testSmtpConnection({
      host,
      port: parseInt(String(port)),
      user: smtpUser,
      password
    });

    if (result.success) {
      console.log('✅ [VALIDATE-CONFIG] Configuração válida');
      res.json({
        success: true,
        message: result.message,
        details: result.details
      });
    } else {
      console.log('❌ [VALIDATE-CONFIG] Configuração inválida:', result.error);
      res.status(400).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }

  } catch (error: any) {
    console.error('❌ [VALIDATE-CONFIG] Erro interno:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// POST /api/simple-email/save-config - Salvar configuração apenas se válida
router.post('/save-config', async (req: Request, res: Response) => {
  try {
    // ✅ AUTENTICAÇÃO BÁSICA SUPABASE - padrão oficial
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token de acesso requerido' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
    }

    // ✅ Validar tenant_id do user_metadata
    const tenantId = user.user_metadata?.tenant_id;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Usuário não possui tenant válido' });
    }

    const { host, port, user: smtpUser, password }: SmtpConfig = req.body;

    // Validação básica dos campos
    if (!host || !port || !smtpUser || !password) {
      return res.status(400).json({
        success: false,
        error: 'Todos os campos são obrigatórios: host, port, user, password'
      });
    }

    console.log('💾 [SAVE-CONFIG] Salvamento com validação solicitado:', {
      host,
      port,
      user: smtpUser,
      user_id: user.id.substring(0, 8),
      tenant_id: tenantId.substring(0, 8)
    });

    // Executar salvamento com validação
    const result = await emailValidationService.saveConfigWithValidation(
      {
        host,
        port: parseInt(String(port)),
        user: smtpUser,
        password
      },
      user.id,
      tenantId
    );

    if (result.success) {
      console.log('✅ [SAVE-CONFIG] Configuração salva com sucesso');
      res.json({
        success: true,
        message: result.message,
        details: result.details
      });
    } else {
      console.log('❌ [SAVE-CONFIG] Falha no salvamento:', result.error);
      res.status(400).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }

  } catch (error: any) {
    console.error('❌ [SAVE-CONFIG] Erro interno:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// DELETE /api/simple-email/remove-config - Remover configuração SMTP
router.delete('/remove-config', async (req: Request, res: Response) => {
  try {
    // ✅ AUTENTICAÇÃO BÁSICA SUPABASE - padrão oficial
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token de acesso requerido' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
    }

    // ✅ Validar tenant_id do user_metadata
    const tenantId = user.user_metadata?.tenant_id;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Usuário não possui tenant válido' });
    }

    console.log('🗑️ [REMOVE-CONFIG] Removendo configuração SMTP para usuário:', user.id.substring(0, 8));

    // Desativar configuração existente
    const { data, error } = await supabase
      .from('user_email_integrations')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('is_active', true)
      .select();

    if (error) {
      console.error('❌ [REMOVE-CONFIG] Erro ao desativar configuração:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao remover configuração de email',
        details: error
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nenhuma configuração ativa encontrada para remover'
      });
    }

    console.log('✅ [REMOVE-CONFIG] Configuração removida com sucesso');

    res.json({
      success: true,
      message: 'Configuração de email removida com sucesso',
      data: {
        removed_at: new Date().toISOString(),
        configurations_removed: data.length
      }
    });

  } catch (error: any) {
    console.error('❌ [REMOVE-CONFIG] Erro interno:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// GET /api/simple-email/integrations - Buscar integrações de email ativas
router.get('/integrations', async (req: Request, res: Response) => {
  try {
    // ✅ AUTENTICAÇÃO BÁSICA SUPABASE - padrão oficial
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token de acesso requerido' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
    }

    // ✅ Validar tenant_id do user_metadata
    const tenantId = user.user_metadata?.tenant_id;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Usuário não possui tenant válido' });
    }

    console.log('📧 [SIMPLE-EMAIL] Buscando integrações para usuário:', user.id.substring(0, 8));

    // Buscar integrações ativas do usuário
    const { data: integrations, error } = await supabase
      .from('user_email_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('❌ [SIMPLE-EMAIL] Erro ao buscar integrações:', error);
      return res.status(500).json({ success: false, error: 'Erro interno' });
    }

    // Mascarar senhas na resposta
    const safeIntegrations = integrations?.map(integration => ({
      ...integration,
      smtp_password_encrypted: '********'
    })) || [];

    console.log('✅ [SIMPLE-EMAIL] Integrações encontradas:', safeIntegrations.length);

    res.json({ success: true, data: safeIntegrations });

  } catch (error) {
    console.error('❌ [SIMPLE-EMAIL] Erro interno:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

export default router;
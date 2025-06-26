import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { supabase } from '../config/supabase';
import { verifyToken } from '../middleware/auth';
import crypto from 'crypto';

const router = express.Router();

// Chave para criptografia (em produção, deve estar em variável de ambiente)
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'your-32-character-secret-key-here';
const ALGORITHM = 'aes-256-cbc';

interface EmailProvider {
  name: string;
  smtp_host: string;
  smtp_port: number;
  use_tls: boolean;
  use_ssl: boolean;
}

// Função para criptografar senha
function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Função para descriptografar senha
function decryptPassword(encryptedPassword: string): string {
  const textParts = encryptedPassword.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = textParts.join(':');
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Detectar provedor baseado no domínio do e-mail
function detectEmailProvider(email: string): EmailProvider | null {
  const domain = email.split('@')[1]?.toLowerCase();
  
  const providers: Record<string, EmailProvider> = {
    'gmail.com': {
      name: 'Gmail',
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      use_tls: true,
      use_ssl: false
    },
    'outlook.com': {
      name: 'Outlook',
      smtp_host: 'smtp-mail.outlook.com',
      smtp_port: 587,
      use_tls: true,
      use_ssl: false
    },
    'hotmail.com': {
      name: 'Hotmail',
      smtp_host: 'smtp-mail.outlook.com',
      smtp_port: 587,
      use_tls: true,
      use_ssl: false
    },
    'yahoo.com': {
      name: 'Yahoo',
      smtp_host: 'smtp.mail.yahoo.com',
      smtp_port: 587,
      use_tls: true,
      use_ssl: false
    },
    'uol.com.br': {
      name: 'UOL',
      smtp_host: 'smtps.uol.com.br',
      smtp_port: 587,
      use_tls: true,
      use_ssl: false
    },
    'terra.com.br': {
      name: 'Terra',
      smtp_host: 'smtp.terra.com.br',
      smtp_port: 587,
      use_tls: true,
      use_ssl: false
    }
  };

  return providers[domain] || null;
}

// GET /api/email/integrations - Buscar integrações de e-mail do usuário
router.get('/integrations', verifyToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    const { data: integrations, error } = await supabase
      .from('user_email_integrations')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true);

    if (error) {
      console.error('Erro ao buscar integrações de e-mail:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }

    // Descriptografar senhas antes de enviar (apenas para exibição mascarada)
    const integrationsWithMaskedPasswords = integrations?.map(integration => ({
      ...integration,
      smtp_password_encrypted: '********', // Mascarar senha
      smtp_password: undefined // Remover campo original
    })) || [];

    res.json({
      success: true,
      data: integrationsWithMaskedPasswords
    });

  } catch (error) {
    console.error('Erro ao buscar integrações de e-mail:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/email/test-connection - Testar conexão SMTP
router.post('/test-connection', verifyToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    const {
      email_address,
      smtp_host,
      smtp_port,
      smtp_username,
      smtp_password,
      use_tls,
      use_ssl
    } = req.body;

    // Validação básica
    if (!email_address || !smtp_host || !smtp_port || !smtp_username || !smtp_password) {
      return res.status(400).json({
        success: false,
        error: 'Todos os campos são obrigatórios'
      });
    }

    // Configurar transportador de teste
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: parseInt(smtp_port),
      secure: use_ssl, // true para 465, false para outras portas
      auth: {
        user: smtp_username,
        pass: smtp_password
      },
      tls: use_tls ? {
        rejectUnauthorized: false
      } : undefined
    });

    // Verificar conexão
    await transporter.verify();

    // Enviar e-mail de teste
    await transporter.sendMail({
      from: `"${req.user.first_name || 'CRM User'}" <${email_address}>`,
      to: email_address,
      subject: '✅ Teste de Conexão SMTP - CRM Marketing',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">✅ Conexão SMTP Configurada com Sucesso!</h2>
          <p>Olá <strong>${req.user.first_name || 'Usuário'}</strong>,</p>
          <p>Sua configuração de e-mail pessoal foi testada e está funcionando corretamente.</p>
          
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Detalhes da Configuração:</h3>
            <ul style="margin: 0;">
              <li><strong>E-mail:</strong> ${email_address}</li>
              <li><strong>Servidor SMTP:</strong> ${smtp_host}</li>
              <li><strong>Porta:</strong> ${smtp_port}</li>
              <li><strong>Segurança:</strong> ${use_tls ? 'TLS' : use_ssl ? 'SSL' : 'Nenhuma'}</li>
            </ul>
          </div>
          
          <p>Agora você pode enviar e-mails diretamente da sua pipeline no CRM Marketing!</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
          <p style="font-size: 12px; color: #6B7280;">
            Este e-mail foi enviado automaticamente pelo sistema CRM Marketing.<br>
            Data/Hora: ${new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'Conexão testada com sucesso! E-mail de confirmação enviado.',
      data: {
        status: 'success',
        tested_at: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Erro no teste de conexão SMTP:', error);
    
    let errorMessage = 'Erro ao testar conexão SMTP';
    if (error.code === 'EAUTH') {
      errorMessage = 'Credenciais de autenticação inválidas';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Não foi possível conectar ao servidor SMTP';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Timeout na conexão com o servidor SMTP';
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(400).json({
      success: false,
      error: errorMessage,
      data: {
        status: 'failed',
        tested_at: new Date().toISOString(),
        error_message: errorMessage
      }
    });
  }
});

// POST /api/email/integrations - Salvar/Atualizar integração de e-mail
router.post('/integrations', verifyToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    const {
      email_address,
      display_name,
      smtp_host,
      smtp_port,
      smtp_username,
      smtp_password,
      use_tls,
      use_ssl,
      provider
    } = req.body;

    // Validação básica
    if (!email_address || !smtp_host || !smtp_port || !smtp_username || !smtp_password) {
      return res.status(400).json({
        success: false,
        error: 'Todos os campos obrigatórios devem ser preenchidos'
      });
    }

    // Criptografar senha
    const encryptedPassword = encryptPassword(smtp_password);

    // Buscar tenant_id do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', req.user.id)
      .single();

    if (userError || !userData) {
      return res.status(400).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    // Verificar se já existe uma integração para este e-mail
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
      smtp_port: parseInt(smtp_port),
      smtp_username,
      smtp_password_encrypted: encryptedPassword,
      use_tls: Boolean(use_tls),
      use_ssl: Boolean(use_ssl),
      provider: provider || detectEmailProvider(email_address)?.name || 'Custom',
      is_active: true,
      test_status: 'pending',
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingIntegration) {
      // Atualizar integração existente
      const { data, error } = await supabase
        .from('user_email_integrations')
        .update(integrationData)
        .eq('id', existingIntegration.id)
        .select()
        .single();
      
      result = { data, error };
    } else {
      // Criar nova integração
      const { data, error } = await supabase
        .from('user_email_integrations')
        .insert({
          ...integrationData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      result = { data, error };
    }

    if (result.error) {
      console.error('Erro ao salvar integração de e-mail:', result.error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar configuração de e-mail'
      });
    }

    // Mascarar senha na resposta
    const responseData = {
      ...result.data,
      smtp_password_encrypted: '********'
    };

    res.json({
      success: true,
      message: existingIntegration ? 'Configuração atualizada com sucesso' : 'Configuração salva com sucesso',
      data: responseData
    });

  } catch (error) {
    console.error('Erro ao salvar integração de e-mail:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/email/send - Enviar e-mail
router.post('/send', verifyToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    const {
      integration_id,
      to_email,
      to_name,
      subject,
      message_text,
      message_html,
      lead_id,
      pipeline_id
    } = req.body;

    // Validação básica
    if (!integration_id || !to_email || !subject || (!message_text && !message_html)) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: integration_id, to_email, subject, message'
      });
    }

    // Buscar configuração de e-mail
    const { data: integration, error: integrationError } = await supabase
      .from('user_email_integrations')
      .select('*')
      .eq('id', integration_id)
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      return res.status(404).json({
        success: false,
        error: 'Configuração de e-mail não encontrada'
      });
    }

    // Descriptografar senha
    const smtpPassword = decryptPassword(integration.smtp_password_encrypted);

    // Configurar transportador
    const transporter = nodemailer.createTransport({
      host: integration.smtp_host,
      port: integration.smtp_port,
      secure: integration.use_ssl,
      auth: {
        user: integration.smtp_username,
        pass: smtpPassword
      },
      tls: integration.use_tls ? {
        rejectUnauthorized: false
      } : undefined
    });

    // Preparar o e-mail
    const mailOptions = {
      from: `"${integration.display_name}" <${integration.email_address}>`,
      to: to_name ? `"${to_name}" <${to_email}>` : to_email,
      subject,
      text: message_text,
      html: message_html || message_text?.replace(/\n/g, '<br>')
    };

    // Buscar tenant_id do usuário
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', req.user.id)
      .single();

    // Salvar no histórico antes de enviar
    const { data: emailHistory, error: historyError } = await supabase
      .from('email_history')
      .insert({
        user_id: req.user.id,
        tenant_id: userData?.tenant_id,
        integration_id,
        lead_id,
        pipeline_id,
        to_email,
        to_name,
        from_email: integration.email_address,
        from_name: integration.display_name,
        subject,
        message_text,
        message_html,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (historyError) {
      console.error('Erro ao salvar histórico de e-mail:', historyError);
    }

    try {
      // Enviar e-mail
      const info = await transporter.sendMail(mailOptions);

      // Atualizar status no histórico
      if (emailHistory) {
        await supabase
          .from('email_history')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', emailHistory.id);
      }

      // Registrar atividade do lead (se aplicável)
      if (lead_id && pipeline_id) {
        await supabase
          .from('lead_activities')
          .insert({
            lead_id,
            pipeline_id,
            user_id: req.user.id,
            tenant_id: userData?.tenant_id,
            activity_type: 'email_sent',
            activity_description: `E-mail enviado: ${subject}`,
            metadata: {
              to_email,
              to_name,
              subject,
              message_preview: (message_text || message_html)?.substring(0, 100) + '...'
            },
            email_history_id: emailHistory?.id,
            created_at: new Date().toISOString()
          });
      }

      console.log('✅ E-mail enviado com sucesso:', {
        from: integration.email_address,
        to: to_email,
        subject,
        messageId: info.messageId
      });

      res.json({
        success: true,
        message: 'E-mail enviado com sucesso',
        data: {
          messageId: info.messageId,
          status: 'sent',
          sent_at: new Date().toISOString(),
          email_history_id: emailHistory?.id
        }
      });

    } catch (sendError: any) {
      console.error('Erro ao enviar e-mail:', sendError);

      // Atualizar status de erro no histórico
      if (emailHistory) {
        await supabase
          .from('email_history')
          .update({
            status: 'failed',
            error_message: sendError.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', emailHistory.id);
      }

      res.status(500).json({
        success: false,
        error: 'Erro ao enviar e-mail: ' + sendError.message,
        data: {
          status: 'failed',
          error_message: sendError.message,
          email_history_id: emailHistory?.id
        }
      });
    }

  } catch (error) {
    console.error('Erro no envio de e-mail:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/email/history - Buscar histórico de e-mails
router.get('/history', verifyToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    const { lead_id, pipeline_id, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('email_history')
      .select(`
        *,
        user_email_integrations!inner(email_address, display_name)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (lead_id) {
      query = query.eq('lead_id', lead_id);
    }

    if (pipeline_id) {
      query = query.eq('pipeline_id', pipeline_id);
    }

    const { data: history, error } = await query;

    if (error) {
      console.error('Erro ao buscar histórico de e-mails:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }

    res.json({
      success: true,
      data: history || []
    });

  } catch (error) {
    console.error('Erro ao buscar histórico de e-mails:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/email/providers - Buscar provedores disponíveis
router.get('/providers', (req: Request, res: Response) => {
  const providers = [
    {
      name: 'Gmail',
      domain: 'gmail.com',
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      use_tls: true,
      use_ssl: false,
      instructions: 'Use sua senha de app do Gmail (não a senha normal da conta)'
    },
    {
      name: 'Outlook',
      domain: 'outlook.com',
      smtp_host: 'smtp-mail.outlook.com',
      smtp_port: 587,
      use_tls: true,
      use_ssl: false,
      instructions: 'Use sua senha normal da conta Microsoft'
    },
    {
      name: 'Hotmail',
      domain: 'hotmail.com',
      smtp_host: 'smtp-mail.outlook.com',
      smtp_port: 587,
      use_tls: true,
      use_ssl: false,
      instructions: 'Use sua senha normal da conta Microsoft'
    },
    {
      name: 'Yahoo',
      domain: 'yahoo.com',
      smtp_host: 'smtp.mail.yahoo.com',
      smtp_port: 587,
      use_tls: true,
      use_ssl: false,
      instructions: 'Use uma senha de app do Yahoo (não a senha normal da conta)'
    },
    {
      name: 'UOL',
      domain: 'uol.com.br',
      smtp_host: 'smtps.uol.com.br',
      smtp_port: 587,
      use_tls: true,
      use_ssl: false,
      instructions: 'Use sua senha normal da conta UOL'
    },
    {
      name: 'Terra',
      domain: 'terra.com.br',
      smtp_host: 'smtp.terra.com.br',
      smtp_port: 587,
      use_tls: true,
      use_ssl: false,
      instructions: 'Use sua senha normal da conta Terra'
    }
  ];

  res.json({
    success: true,
    data: providers
  });
});

export default router;
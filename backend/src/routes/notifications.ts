import express from 'express';
import nodemailer from 'nodemailer';
import { NotificationController } from '../controllers/NotificationController';
import { authMiddleware } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

// Configuração do transportador de email (usando SMTP)
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true para 465, false para outras portas
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Rota para envio de notificações por email
router.post('/email', async (req, res) => {
  try {
    const {
      recipients,
      subject,
      content,
      formId,
      leadData,
      source
    } = req.body;

    // Validações básicas
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Lista de destinatários é obrigatória'
      });
    }

    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        error: 'Assunto e conteúdo são obrigatórios'
      });
    }

    // Verificar se as configurações SMTP estão definidas
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('Configurações SMTP não definidas. Email não será enviado.');
      return res.status(200).json({
        success: true,
        message: 'Configurações de email não definidas. Notificação simulada.',
        sent: false
      });
    }

    const transporter = createEmailTransporter();

    // Verificar conexão com o servidor SMTP
    try {
      await transporter.verify();
    } catch (error: any) {
      console.error('Erro na verificação SMTP:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro na configuração do servidor de email'
      });
    }

    // Preparar o HTML do email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 10px 10px;
            border: 1px solid #e9ecef;
          }
          .highlight {
            background: #e3f2fd;
            padding: 15px;
            border-left: 4px solid #2196f3;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
            font-size: 14px;
          }
          .badge {
            display: inline-block;
            padding: 4px 8px;
            background: #28a745;
            color: white;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }
          .source-badge {
            background: ${source === 'whatsapp' ? '#25d366' : '#007bff'};
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎯 Novo Lead Capturado!</h1>
          <p>Um novo cadastro foi realizado através do formulário</p>
        </div>
        
        <div class="content">
          <div class="highlight">
            <strong>Origem:</strong> 
            <span class="badge source-badge">
              ${source === 'whatsapp' ? '📱 WhatsApp' : '📝 Formulário'}
            </span>
          </div>
          
          <div style="white-space: pre-line; margin-top: 20px;">
            ${content}
          </div>
        </div>
        
        <div class="footer">
          <p>Este email foi enviado automaticamente pelo sistema CRM Marketing</p>
          <p>Data: ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      </body>
      </html>
    `;

    // Preparar opções do email
    const mailOptions = {
      from: {
        name: 'CRM Marketing - Notificações',
        address: process.env.SMTP_USER || 'noreply@crmmarketing.com'
      },
      to: recipients.join(', '),
      subject: subject,
      text: content, // Versão texto simples
      html: htmlContent // Versão HTML
    };

    // Enviar email
    const info = await transporter.sendMail(mailOptions);

    console.log('Email enviado com sucesso:', {
      messageId: info.messageId,
      recipients: recipients,
      subject: subject,
      source: source,
      formId: formId
    });

    res.status(200).json({
      success: true,
      message: 'Notificação enviada com sucesso',
      messageId: info.messageId,
      recipients: recipients.length,
      sent: true
    });

  } catch (error: any) {
    console.error('Erro ao enviar notificação por email:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor ao enviar email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Rota para testar configurações de email
router.post('/test', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email de teste é obrigatório'
      });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(400).json({
        success: false,
        error: 'Configurações SMTP não definidas'
      });
    }

    const transporter = createEmailTransporter();

    // Testar conexão
    await transporter.verify();

    // Enviar email de teste
    const testMailOptions = {
      from: {
        name: 'CRM Marketing - Teste',
        address: process.env.SMTP_USER
      },
      to: email,
      subject: '✅ Teste de Configuração - CRM Marketing',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px;">
            <h2>✅ Teste de Email Bem-sucedido!</h2>
            <p>As configurações de email do CRM Marketing estão funcionando corretamente.</p>
          </div>
          <div style="background: #f5f5f5; padding: 20px; margin-top: 20px; border-radius: 8px;">
            <h3>Detalhes da Configuração:</h3>
            <ul>
              <li><strong>Servidor SMTP:</strong> ${process.env.SMTP_HOST || 'smtp.gmail.com'}</li>
              <li><strong>Porta:</strong> ${process.env.SMTP_PORT || '587'}</li>
              <li><strong>Usuário:</strong> ${process.env.SMTP_USER}</li>
              <li><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</li>
            </ul>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666;">
            <p>Este é um email de teste automático do sistema CRM Marketing</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(testMailOptions);

    res.status(200).json({
      success: true,
      message: 'Email de teste enviado com sucesso',
      messageId: info.messageId,
      recipient: email
    });

  } catch (error: any) {
    console.error('Erro no teste de email:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao testar configurações de email',
      details: error.message
    });
  }
});

/**
 * @route POST /api/notifications/create
 * @desc Criar notificação enterprise (Super Admin only)
 * @access Private (Super Admin)
 */
router.post('/create', 
  NotificationController.createNotification
);

/**
 * @route GET /api/notifications/admin
 * @desc Listar notificações para interface admin
 * @access Private (Super Admin)
 */
router.get('/admin',
  NotificationController.getAdminNotifications
);

/**
 * @route POST /api/notifications/track-click
 * @desc Rastrear clique em notificação
 * @access Private
 */
router.post('/track-click',
  NotificationController.trackClick
);

/**
 * @route PUT /api/notifications/process-scheduled
 * @desc Processar notificações agendadas
 * @access Private (Super Admin)
 */
router.put('/process-scheduled',
  NotificationController.processScheduled
);

/**
 * @route GET /api/notifications/analytics
 * @desc Obter analytics de notificações
 * @access Private (Super Admin + Admin)
 */
router.get('/analytics',
  NotificationController.getAnalytics
);

/**
 * @route PUT /api/notifications/:id/read
 * @desc Marcar notificação como lida
 * @access Private
 */
router.put('/:id/read',
  NotificationController.markAsRead
);

/**
 * @route GET /api/notifications/user
 * @desc Listar notificações do usuário
 * @access Private
 */
router.get('/user',
  NotificationController.getUserNotifications
);

export default router; 
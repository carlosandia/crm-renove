import nodemailer from 'nodemailer';
import { User } from '../types/express';

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

interface InvitationEmailData {
  companyName: string;
  adminName: string;
  adminEmail: string;
  activationToken: string;
  expiresIn: string;
}

/**
 * ENTERPRISE EMAIL SERVICE
 * Implementação com Mailtrap para desenvolvimento
 * Facilmente migratório para produção (Resend/SendGrid)
 */
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly appUrl: string;
  private readonly companyName: string;

  constructor() {
    this.appUrl = process.env.APP_URL || 'http://localhost:8080';
    this.companyName = process.env.COMPANY_NAME || 'CRM Marketing';
    this.transporter = this.createTransporter();
  }

  /**
   * Criar transportador baseado no ambiente
   */
  private createTransporter(): nodemailer.Transporter {
    const emailProvider = process.env.EMAIL_PROVIDER || 'mailtrap';

    switch (emailProvider) {
      case 'mailtrap':
        return this.createMailtrapTransporter();
      case 'resend':
        return this.createResendTransporter();
      case 'gmail':
        return this.createGmailTransporter();
      default:
        return this.createMockTransporter();
    }
  }

  /**
   * MAILTRAP - Para desenvolvimento
   */
  private createMailtrapTransporter(): nodemailer.Transporter {
    console.log('📧 [EMAIL] Configurando Mailtrap transporter...');
    
    return nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST || 'smtp.mailtrap.io',
      port: parseInt(process.env.MAILTRAP_PORT || '2525'),
      auth: {
        user: process.env.MAILTRAP_USERNAME || process.env.MAILTRAP_USER || '',
        pass: process.env.MAILTRAP_PASSWORD || process.env.MAILTRAP_PASS || ''
      }
    });
  }

  /**
   * RESEND - Para produção
   */
  private createResendTransporter(): nodemailer.Transporter {
    console.log('📧 [EMAIL] Configurando Resend transporter...');
    
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 587,
      secure: false,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY || ''
      }
    });
  }

  /**
   * GMAIL - Para teste rápido
   */
  private createGmailTransporter(): nodemailer.Transporter {
    console.log('📧 [EMAIL] Configurando Gmail transporter...');
    
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || '',
        pass: process.env.GMAIL_APP_PASSWORD || ''
      }
    });
  }

  /**
   * MOCK - Para desenvolvimento sem email
   */
  private createMockTransporter(): nodemailer.Transporter {
    console.log('📧 [EMAIL] Configurando Mock transporter (console only)...');
    
    return {
      sendMail: async (mailOptions: any) => {
        console.log('📧 [MOCK EMAIL] Email seria enviado:');
        console.log('Para:', mailOptions.to);
        console.log('Assunto:', mailOptions.subject);
        console.log('Conteúdo:', mailOptions.html);
        console.log('---');
        return {
          messageId: `mock-${Date.now()}`,
          response: 'Mock email sent'
        };
      }
    } as any;
  }

  /**
   * Enviar email de convite para administrador
   */
  async sendAdminInvitation(data: InvitationEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`📧 [EMAIL] Enviando convite para: ${data.adminEmail}`);

      const template = this.generateInvitationTemplate(data);
      
      const mailOptions = {
        from: `${this.companyName} <noreply@crmmarketing.com>`,
        to: data.adminEmail,
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ [EMAIL] Convite enviado com sucesso! MessageID: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error: any) {
      console.error('❌ [EMAIL] Erro ao enviar convite:', error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Gerar template de convite profissional
   */
  private generateInvitationTemplate(data: InvitationEmailData): EmailTemplate {
    const activationUrl = `${this.appUrl}/activate?token=${data.activationToken}`;
    
    const subject = `🎯 Convite para gerenciar ${data.companyName} no ${this.companyName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Convite - ${this.companyName}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
              🎯 Você foi convidado!
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
              Para gerenciar ${data.companyName}
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 22px;">
              Olá, ${data.adminName}! 👋
            </h2>
            
            <p style="color: #4a5568; line-height: 1.6; margin: 0 0 25px 0; font-size: 16px;">
              Você foi convidado para ser o <strong>administrador</strong> da empresa 
              <strong>${data.companyName}</strong> em nosso sistema CRM.
            </p>

            <div style="background-color: #edf2f7; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px;">
                🔑 Como administrador, você poderá:
              </h3>
              <ul style="color: #4a5568; margin: 0; padding-left: 20px;">
                <li>Gerenciar vendedores e equipes</li>
                <li>Configurar pipelines de vendas</li>
                <li>Acompanhar métricas de performance</li>
                <li>Gerenciar leads e oportunidades</li>
                <li>Configurar integrações e automações</li>
              </ul>
            </div>

            <p style="color: #4a5568; line-height: 1.6; margin: 25px 0; font-size: 16px;">
              Para ativar sua conta e definir sua senha, clique no botão abaixo:
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 35px 0;">
              <a href="${activationUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 16px 32px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: 600; 
                        font-size: 16px;
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ✅ Ativar Minha Conta
              </a>
            </div>

            <!-- Security Notice -->
            <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 15px; margin: 30px 0;">
              <p style="color: #c53030; margin: 0; font-size: 14px; font-weight: 500;">
                🔒 <strong>Segurança:</strong> Este link expira em ${data.expiresIn}. 
                Se você não solicitou este convite, ignore este email.
              </p>
            </div>

            <p style="color: #718096; font-size: 14px; margin: 25px 0 0 0;">
              Se o botão não funcionar, copie e cole este link no seu navegador:<br>
              <span style="color: #4299e1; word-break: break-all;">${activationUrl}</span>
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f7fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; margin: 0; font-size: 14px;">
              © 2025 ${this.companyName}. Todos os direitos reservados.
            </p>
            <p style="color: #a0aec0; margin: 8px 0 0 0; font-size: 12px;">
              Este é um email automático, não responda.
            </p>
          </div>

        </div>
      </body>
      </html>
    `;

    const text = `
      🎯 Convite para gerenciar ${data.companyName}

      Olá, ${data.adminName}!

      Você foi convidado para ser o administrador da empresa ${data.companyName} em nosso sistema CRM.

      Para ativar sua conta, acesse: ${activationUrl}

      Este link expira em ${data.expiresIn}.

      Atenciosamente,
      Equipe ${this.companyName}
    `;

    return { subject, html, text };
  }

  /**
   * Verificar configuração do transporter
   */
  async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 [EMAIL] Verificando conexão...');
      
      if (this.transporter.verify) {
        await this.transporter.verify();
      }
      
      console.log('✅ [EMAIL] Conexão verificada com sucesso!');
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ [EMAIL] Erro na verificação:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar email de teste
   */
  async sendTestEmail(to: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const mailOptions = {
        from: `${this.companyName} <noreply@crmmarketing.com>`,
        to: to,
        subject: '✅ Teste de Email - Sistema Funcionando',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">🎯 Email de Teste</h2>
            <p>Este é um email de teste para verificar se o sistema está funcionando corretamente.</p>
            <p><strong>Data/Hora:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Sistema:</strong> ${this.companyName}</p>
            <p style="color: #28a745; font-weight: bold;">✅ Sistema de email funcionando perfeitamente!</p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Instância singleton do serviço
export const emailService = new EmailService(); 
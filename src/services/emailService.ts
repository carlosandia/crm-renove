/**
 * 📧 Serviço Unificado de Email - Seguindo Padrões Oficiais Nodemailer
 * 
 * ✅ Baseado na documentação oficial do Nodemailer
 * ✅ Arquitetura simplificada seguindo padrão dos grandes CRMs
 * ✅ Uma única camada de serviço (sem duplicações)
 * ✅ Timeout padrão Nodemailer (sem customização frontend)
 * ✅ Validação obrigatória antes de salvar
 */

import { api } from './api';

// ============================================
// TIPOS UNIFICADOS
// ============================================

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface EmailIntegration {
  id?: string;
  user_id: string;
  tenant_id: string;
  email_address: string;
  display_name?: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password_encrypted?: string;
  smtp_secure: boolean;
  provider: string;
  is_active: boolean;
  last_test_at?: string;
  test_status?: string;
  test_error?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ValidationResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: any;
}

export interface EmailSendData {
  to: string;
  subject: string;
  message: string;
  lead_id?: string;
  cc?: string;
  bcc?: string;
}

// ============================================
// SERVIÇO UNIFICADO
// ============================================

/**
 * 🚀 Serviço unificado seguindo padrão dos grandes CRMs (HubSpot, Pipedrive)
 * - Interface minimalista com apenas campos essenciais
 * - Validação obrigatória antes de salvar
 * - Timeout padrão Nodemailer (sem customização frontend)
 * - Auto-detecção de configurações por provedor
 */
export class EmailService {

  /**
   * 🧪 Validar configuração SMTP (obrigatório antes de salvar)
   * Seguindo padrão dos grandes CRMs: testar antes de persistir
   */
  async validateConfig(config: SmtpConfig): Promise<ValidationResult> {
    try {
      console.log('🧪 [EmailService] Validando configuração SMTP:', {
        host: config.host,
        port: config.port,
        user: config.user
      });

      const response = await api.post('/simple-email/validate-config', config);

      console.log('✅ [EmailService] Configuração válida');

      return {
        success: true,
        message: (response.data as any)?.message || 'Configuração validada com sucesso',
        details: (response.data as any)?.details
      };

    } catch (error: any) {
      console.error('❌ [EmailService] Erro na validação:', error);

      const errorResponse = error.response?.data;
      
      return {
        success: false,
        error: errorResponse?.error || 'Erro ao validar configuração SMTP',
        details: errorResponse?.details
      };
    }
  }

  /**
   * 💾 Salvar configuração (apenas se válida)
   * Padrão dos grandes CRMs: validação é obrigatória
   */
  async saveConfig(config: SmtpConfig): Promise<ValidationResult> {
    try {
      console.log('💾 [EmailService] Salvando configuração validada');

      const response = await api.post('/simple-email/save-config', config);

      console.log('✅ [EmailService] Configuração salva');

      return {
        success: true,
        message: (response.data as any)?.message || 'Configuração salva com sucesso',
        details: (response.data as any)?.details
      };

    } catch (error: any) {
      console.error('❌ [EmailService] Erro no salvamento:', error);

      const errorResponse = error.response?.data;
      
      return {
        success: false,
        error: errorResponse?.error || 'Erro ao salvar configuração',
        details: errorResponse?.details
      };
    }
  }

  /**
   * 📧 Enviar email (usando configuração validada)
   */
  async sendEmail(data: EmailSendData): Promise<ValidationResult> {
    try {
      console.log('📧 [EmailService] Enviando email:', {
        to: data.to,
        subject: data.subject.substring(0, 50) + '...'
      });

      const response = await api.post('/simple-email/send', data);

      console.log('✅ [EmailService] Email enviado');

      return {
        success: true,
        message: (response.data as any)?.message || 'Email enviado com sucesso',
        details: (response.data as any)?.data
      };

    } catch (error: any) {
      console.error('❌ [EmailService] Erro no envio:', error);

      const errorResponse = error.response?.data;
      
      return {
        success: false,
        error: errorResponse?.error || 'Erro ao enviar e-mail',
        details: errorResponse?.details
      };
    }
  }

  /**
   * 🧪 Testar configuração existente
   */
  async testExistingConnection(): Promise<ValidationResult> {
    try {
      console.log('🧪 [EmailService] Testando configuração existente...');

      const response = await api.post('/simple-email/test-connection');

      console.log('✅ [EmailService] Configuração existente válida');

      return {
        success: true,
        message: (response.data as any)?.message || 'Configuração testada com sucesso',
        details: (response.data as any)?.data
      };

    } catch (error: any) {
      console.error('❌ [EmailService] Erro no teste:', error);

      const errorResponse = error.response?.data;
      
      return {
        success: false,
        error: errorResponse?.error || 'Erro ao testar configuração existente',
        details: errorResponse?.details
      };
    }
  }

  /**
   * 🗑️ Remover configuração
   */
  async removeConfig(): Promise<ValidationResult> {
    try {
      console.log('🗑️ [EmailService] Removendo configuração...');

      const response = await api.delete('/simple-email/remove-config');

      console.log('✅ [EmailService] Configuração removida');

      return {
        success: true,
        message: (response.data as any)?.message || 'Configuração removida com sucesso',
        details: (response.data as any)?.data
      };

    } catch (error: any) {
      console.error('❌ [EmailService] Erro na remoção:', error);

      const errorResponse = error.response?.data;
      
      return {
        success: false,
        error: errorResponse?.error || 'Erro ao remover configuração',
        details: errorResponse?.details
      };
    }
  }

  /**
   * 📋 Buscar integrações de email (compatibilidade com componentes existentes)
   */
  async getIntegrations(): Promise<{ data: EmailIntegration[]; success: boolean }> {
    try {
      const response = await api.get<EmailIntegration[]>('/email/integrations');
      console.log('✅ [EmailService] Integrações carregadas:', response.data?.length || 0);
      
      return {
        data: response.data || [],
        success: true
      };
    } catch (error) {
      console.error('❌ [EmailService] Erro ao buscar integrações:', error);
      return {
        data: [],
        success: false
      };
    }
  }

  /**
   * 📊 Buscar provedores disponíveis
   */
  async getProviders(): Promise<{ data: any[]; success: boolean }> {
    try {
      const response = await api.get<any[]>('/email/providers');
      return {
        data: response.data || [],
        success: true
      };
    } catch (error) {
      console.error('❌ [EmailService] Erro ao buscar provedores:', error);
      return {
        data: [],
        success: false
      };
    }
  }

  /**
   * 🎯 Auto-detectar provedor (padrão dos grandes CRMs)
   * Simplifica UX seguindo padrão do HubSpot/Pipedrive
   */
  detectEmailProvider(email: string): { provider: string; suggestedConfig: Partial<SmtpConfig> } {
    const domain = email.split('@')[1]?.toLowerCase();

    const providers: Record<string, { provider: string; suggestedConfig: Partial<SmtpConfig> }> = {
      'gmail.com': {
        provider: 'Gmail',
        suggestedConfig: {
          host: 'smtp.gmail.com',
          port: 587
        }
      },
      'outlook.com': {
        provider: 'Outlook',
        suggestedConfig: {
          host: 'smtp-mail.outlook.com', 
          port: 587
        }
      },
      'hotmail.com': {
        provider: 'Hotmail',
        suggestedConfig: {
          host: 'smtp-mail.outlook.com',
          port: 587
        }
      },
      'yahoo.com': {
        provider: 'Yahoo',
        suggestedConfig: {
          host: 'smtp.mail.yahoo.com',
          port: 587
        }
      },
      'renovedigital.com.br': {
        provider: 'Renove Digital (UNI5)',
        suggestedConfig: {
          host: 'smtpi.uni5.net',
          port: 587
        }
      },
      'uni5.net': {
        provider: 'UNI5',
        suggestedConfig: {
          host: 'smtpi.uni5.net',
          port: 587
        }
      }
    };

    return providers[domain] || {
      provider: 'Personalizado',
      suggestedConfig: {
        port: 587 // Padrão mais comum (STARTTLS)
      }
    };
  }

  /**
   * 📝 Formatar detalhes do erro para exibição (UX melhorada)
   */
  formatErrorDetails(details: any): string {
    if (!details) return '';

    let formatted = '';
    
    if (details.suggestion) {
      formatted += `\n💡 Sugestão: ${details.suggestion}`;
    }
    
    if (details.code) {
      formatted += `\n🔧 Código do erro: ${details.code}`;
    }
    
    if (details.host && details.port) {
      formatted += `\n📍 Servidor testado: ${details.host}:${details.port}`;
    }

    if (details.protocol) {
      formatted += `\n🎯 Protocolo usado: ${details.protocol}`;
    }

    if (details.server_address) {
      formatted += `\n📡 Endereço do servidor: ${details.server_address}`;
    }

    return formatted;
  }

  /**
   * ✅ Formatar detalhes de sucesso para exibição
   */
  formatSuccessDetails(details: any): string {
    if (!details) return '';

    let formatted = '';
    
    if (details.protocol) {
      formatted += `\n🎯 Protocolo: ${details.protocol}`;
    }
    
    if (details.server_address) {
      formatted += `\n📡 Servidor: ${details.server_address}:${details.port}`;
    }
    
    if (details.duration_ms) {
      formatted += `\n⏱️ Tempo de validação: ${details.duration_ms}ms`;
    }

    if (details.tcp_test_duration) {
      formatted += `\n🔗 Conectividade TCP: ${details.tcp_test_duration}ms`;
    }

    return formatted;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const emailService = new EmailService();
export default emailService;
import { api } from './api';

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface ValidationResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: any;
}

/**
 * 🔧 SERVIÇO DE VALIDAÇÃO SMTP - FRONTEND
 * - Testa configurações antes de salvar
 * - Feedback detalhado para usuário
 * - Integração com API de validação
 * 🚨 MELHORADO: Detecção de ambiente e sugestões específicas
 */
export class EmailValidationService {

  /**
   * 🎯 Buscar configuração sugerida por ambiente
   */
  async getSuggestedConfig(): Promise<{
    environment: string;
    suggested: any;
    instructions?: any;
  }> {
    try {
      console.log('🎯 [EmailValidationService] Buscando configuração sugerida...');
      
      const response = await api.get('/api/email/suggest-config');
      
      return {
        environment: (response.data as any)?.environment || 'development',
        suggested: (response.data as any)?.recommended || (response.data as any)?.corporate,
        instructions: (response.data as any)?.instructions
      };
      
    } catch (error) {
      console.error('❌ [EmailValidationService] Erro ao buscar configuração sugerida:', error);
      
      // Fallback para configuração padrão
      return {
        environment: 'development',
        suggested: {
          host: 'smtp.gmail.com',
          port: 587,
          note: 'Gmail App Password recomendado para desenvolvimento'
        },
        instructions: {
          gmail: [
            'Acesse: https://myaccount.google.com/apppasswords',
            'Gere senha de app para Email',
            'Use essa senha de 16 caracteres'
          ]
        }
      };
    }
  }

  /**
   * 📊 Buscar provedores disponíveis com recomendações
   */
  async getProvidersWithRecommendations(): Promise<{
    providers: any[];
    environment: string;
    recommendation: string;
  }> {
    try {
      console.log('📊 [EmailValidationService] Buscando provedores...');
      
      const response = await api.get('/api/email/providers');
      
      return {
        providers: (response.data as any)?.providers || [],
        environment: (response.data as any)?.environment || 'development',
        recommendation: (response.data as any)?.recommendation || 'Use Gmail para desenvolvimento'
      };
      
    } catch (error) {
      console.error('❌ [EmailValidationService] Erro ao buscar provedores:', error);
      
      return {
        providers: [],
        environment: 'development',
        recommendation: 'Configure Gmail App Password para desenvolvimento'
      };
    }
  }

  /**
   * Testar configuração SMTP
   * 🚨 ULTRA MELHORADO: Com tratamento específico para servidores corporativos e timeouts longos
   */
  async validateSmtpConfig(config: SmtpConfig): Promise<ValidationResult> {
    try {
      console.log('🧪 [EmailValidationService] Validando configuração SMTP:', {
        host: config.host,
        port: config.port,
        user: config.user
      });

      // ✅ DETECTAR SERVIDOR KINGHOST PARA INFORMAR USUÁRIO
      const isKingHostServer = config.host.includes('uni5.net') || 
                               config.host.includes('smtpi.') ||
                               config.host.includes('renovedigital.com.br');

      if (isKingHostServer) {
        console.log('🏢 [EmailValidationService] Servidor corporativo KingHost detectado - processo pode levar até 25 minutos');
        console.log('🔬 [EmailValidationService] Sistema irá tentar 3 portas diferentes com timeouts estendidos');
      }

      const startTime = Date.now();
      const response = await api.post('/api/simple-email/validate-config', config);
      const duration = Date.now() - startTime;

      console.log(`✅ [EmailValidationService] Configuração válida em ${duration}ms:`, response.data);

      return {
        success: true,
        message: (response.data as any)?.message || 'Configuração validada com sucesso',
        details: {
          ...(response.data as any)?.details,
          frontend_duration_ms: duration,
          isKingHostServer
        }
      };

    } catch (error: any) {
      console.error('❌ [EmailValidationService] Erro na validação:', error);

      const errorResponse = error.response?.data;
      const duration = Date.now() - Date.now(); // Aproximado
      
      // ✅ MENSAGENS ESPECÍFICAS PARA KINGHOST
      let enhancedError = errorResponse?.error || 'Erro ao validar configuração SMTP';
      
      if (config.host.includes('uni5.net') || config.host.includes('smtpi.')) {
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          enhancedError = 'Servidor KingHost não respondeu em 25 minutos. O servidor pode estar indisponível ou sua rede pode ter restrições para SMTP corporativo.';
        } else if (errorResponse?.details?.diagnosis?.includes('firewall')) {
          enhancedError = 'Servidor KingHost detectado mas conexão SMTP bloqueada. Verifique firewall/proxy local ou tente de outra rede.';
        }
      }
      
      return {
        success: false,
        error: enhancedError,
        details: {
          ...errorResponse?.details,
          frontend_duration_ms: duration,
          isKingHostServer: config.host.includes('uni5.net') || config.host.includes('smtpi.'),
          troubleshooting: [
            'Verifique se as credenciais estão corretas',
            'Teste de uma rede diferente (ex: celular)',
            'Confirme com administrador se IP precisa estar em whitelist',
            'Considere usar outro servidor SMTP temporariamente'
          ]
        }
      };
    }
  }

  /**
   * Salvar configuração (apenas se válida)
   */
  async saveEmailConfig(config: SmtpConfig): Promise<ValidationResult> {
    try {
      console.log('💾 [EmailValidationService] Salvando configuração validada:', {
        host: config.host,
        port: config.port,
        user: config.user
      });

      // ✅ DEBUG: Verificar se algum campo está vazio/nulo
      console.log('🔍 [EmailValidationService] Debug - verificando campos:', {
        host_type: typeof config.host,
        host_empty: !config.host,
        port_type: typeof config.port,
        port_zero: config.port === 0,
        user_type: typeof config.user,
        user_empty: !config.user,
        password_type: typeof config.password,
        password_empty: !config.password
      });

      const response = await api.post('/api/simple-email/save-config', config);

      console.log('✅ [EmailValidationService] Configuração salva:', response.data);

      return {
        success: true,
        message: (response.data as any)?.message || 'Configuração salva com sucesso',
        details: (response.data as any)?.details
      };

    } catch (error: any) {
      console.error('❌ [EmailValidationService] Erro no salvamento:', error);

      const errorResponse = error.response?.data;
      
      return {
        success: false,
        error: errorResponse?.error || 'Erro ao salvar configuração',
        details: errorResponse?.details
      };
    }
  }

  /**
   * Enviar email (usando configuração validada)
   */
  async sendEmail(data: {
    to: string;
    subject: string;
    message: string;
    lead_id?: string;
    cc?: string;
    bcc?: string;
  }): Promise<ValidationResult> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 [EmailValidationService] Enviando email:', {
          to: data.to,
          subject: data.subject.substring(0, 50) + '...'
        });
      }

      const response = await api.post('/api/simple-email/send', data);

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [EmailValidationService] Email enviado:', response.data);
      }

      return {
        success: true,
        message: (response.data as any)?.message || 'Email enviado com sucesso',
        details: (response.data as any)?.data
      };

    } catch (error: any) {
      console.error('❌ [EmailValidationService] Erro no envio:', error);

      const errorResponse = error.response?.data;
      
      return {
        success: false,
        error: errorResponse?.error || 'Erro ao enviar e-mail',
        details: errorResponse?.details
      };
    }
  }

  /**
   * Buscar integrações de e-mail existentes
   */
  async getIntegrations(): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 [EmailValidationService] Buscando integrações existentes...');
      }
      
      const response = await api.get('/api/simple-email/integrations');
      
      return {
        success: true,
        data: (response.data as any)?.data || []
      };
      
    } catch (error: any) {
      // ✅ OTIMIZADO: Fallback silencioso para integrações não configuradas
      if (error.response?.status === 404) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ [EmailValidationService] Integrações não configuradas (404) - retornando array vazio');
        }
        return {
          success: true,
          data: []
        };
      }

      // ✅ Log apenas erros reais (não 404)
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [EmailValidationService] Erro ao buscar integrações:', error);
      }
      
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao buscar integrações',
        data: []
      };
    }
  }

  /**
   * Testar conectividade com configuração existente
   */
  async testExistingConnection(): Promise<ValidationResult> {
    try {
      console.log('🧪 [EmailValidationService] Testando configuração existente...');

      const response = await api.post('/api/simple-email/test-connection');

      console.log('✅ [EmailValidationService] Configuração existente válida:', response.data);

      return {
        success: true,
        message: (response.data as any)?.message || 'Configuração testada com sucesso',
        details: (response.data as any)?.data
      };

    } catch (error: any) {
      console.error('❌ [EmailValidationService] Erro no teste:', error);

      const errorResponse = error.response?.data;
      
      return {
        success: false,
        error: errorResponse?.error || 'Erro ao testar configuração existente',
        details: errorResponse?.details
      };
    }
  }

  /**
   * Obter configuração atual do usuário
   */
  async getCurrentConfig(): Promise<{ success: boolean; config?: SmtpConfig; error?: string }> {
    try {
      // Esta rota ainda precisa ser implementada no backend se necessário
      // Por enquanto, retornamos sucesso vazio para não quebrar a interface
      return { success: true };

    } catch (error: any) {
      console.error('❌ [EmailValidationService] Erro ao buscar configuração:', error);
      return { success: false, error: 'Erro ao buscar configuração atual' };
    }
  }

  /**
   * Detectar provedor de email baseado no endereço
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
        provider: 'Renove Digital',
        suggestedConfig: {
          host: 'smtpi.uni5.net',
          port: 587
        }
      }
    };

    return providers[domain] || {
      provider: 'Custom',
      suggestedConfig: {
        port: 587
      }
    };
  }

  /**
   * Remover configuração de email
   */
  async removeEmailConfig(): Promise<ValidationResult> {
    try {
      console.log('🗑️ [EmailValidationService] Removendo configuração de email...');

      const response = await api.delete('/api/simple-email/remove-config');

      console.log('✅ [EmailValidationService] Configuração removida:', response.data);

      return {
        success: true,
        message: (response.data as any)?.message || 'Operação realizada com sucesso',
        details: (response.data as any)?.data
      };

    } catch (error: any) {
      console.error('❌ [EmailValidationService] Erro na remoção:', error);

      const errorResponse = error.response?.data;
      
      return {
        success: false,
        error: errorResponse?.error || 'Erro ao remover configuração',
        details: errorResponse?.details
      };
    }
  }

  /**
   * Formatar detalhes do erro para exibição
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

    if (details.ipv4_ipv6_both_failed) {
      formatted += `\n🌐 Teste de conectividade: IPv4 e IPv6 falharam`;
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
   * Formatar detalhes de sucesso para exibição
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

// Instância singleton
export const emailValidationService = new EmailValidationService();
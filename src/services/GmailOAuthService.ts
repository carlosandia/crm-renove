// ✅ Gmail OAuth2 Service - Integração direta sem SMTP
import { supabase } from '../lib/supabase';

export interface GmailOAuthCredentials {
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  email: string;
  name?: string;
}

export interface GmailSendRequest {
  to: string;
  subject: string;
  message: string;
  lead_id?: string;
}

export interface GmailSendResult {
  success: boolean;
  message?: string;
  error?: string;
  messageId?: string;
  details?: any;
}

/**
 * 🆕 Serviço Gmail OAuth2 
 * Elimina necessidade de configuração SMTP manual para Gmail
 */
export class GmailOAuthService {
  
  /**
   * 🔗 Inicia processo de autenticação OAuth2 com Gmail
   */
  static async startOAuthFlow(): Promise<string> {
    try {
      console.log('🔄 [GMAIL-OAUTH] Iniciando fluxo OAuth2 para Gmail...');
      
      // Usar infraestrutura existente do GoogleCalendarAuth mas com scopes específicos do Gmail
      const authUrl = await this.getGmailAuthUrl();
      
      if (authUrl === 'demo_mode') {
        console.log('🔄 [GMAIL-OAUTH] Modo demo ativo');
        return 'demo_mode';
      }
      
      console.log('✅ [GMAIL-OAUTH] URL de autenticação gerada');
      return authUrl;
      
    } catch (error) {
      console.error('❌ [GMAIL-OAUTH] Erro ao iniciar fluxo OAuth:', error);
      throw new Error('Falha ao iniciar autenticação com Google');
    }
  }
  
  /**
   * 🔗 Gera URL específica para Gmail (com scopes de email)
   * ✅ SIMPLIFICADO: Usa endpoint backend direto (sem platform-integrations)
   */
  private static async getGmailAuthUrl(): Promise<string> {
    try {
      console.log('🔄 [GMAIL-OAUTH] Obtendo URL de autenticação via backend...');

      // ✅ NOVO: Usar endpoint backend simples para obter URL de autenticação
      const response = await fetch('/api/gmail-oauth/auth-url', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('❌ [GMAIL-OAUTH] Erro ao obter auth URL:', response.status);
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.authUrl && data.authUrl !== 'demo_mode') {
        console.log('✅ [GMAIL-OAUTH] URL de autenticação obtida com sucesso');
        
        // Salvar state para validação posterior
        if (data.state) {
          localStorage.setItem('gmail_oauth_state', data.state);
        }
        
        return data.authUrl;
      } else {
        console.log('🟨 [GMAIL-OAUTH] Backend retornou modo demo');
        return 'demo_mode';
      }

    } catch (error) {
      console.error('❌ [GMAIL-OAUTH] Erro ao gerar URL de auth:', error);
      
      // ✅ Fallback para modo demo se houver erro
      console.log('🟨 [GMAIL-OAUTH] Fallback para modo demo devido ao erro');
      return 'demo_mode';
    }
  }
  
  /**
   * 🔑 Processa código de autorização via backend
   * ✅ SIMPLIFICADO: Usa endpoint backend direto
   */
  static async handleOAuthCallback(code: string, state?: string): Promise<string> {
    try {
      console.log('🔄 [GMAIL-OAUTH] Processando callback via backend...');

      // ✅ NOVO: Usar endpoint backend para processar callback
      const response = await fetch('/api/gmail-oauth/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          state
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ [GMAIL-OAUTH] Erro no callback:', response.status, errorData);
        throw new Error(`Erro HTTP ${response.status}: ${errorData}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro no processamento do callback');
      }

      console.log('✅ [GMAIL-OAUTH] Callback processado com sucesso:', {
        email: result.data?.email,
        integration_id: result.data?.integration_id
      });

      return result.data.integration_id;

    } catch (error: any) {
      console.error('❌ [GMAIL-OAUTH] Erro ao processar callback:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha na autenticação Gmail: ${errorMessage}`);
    }
  }
  
  /**
   * 💾 Salva integração Gmail no banco de dados
   * ✅ SIMPLIFICADO: Não é mais necessário - backend já salva automaticamente
   */
  static async saveGmailIntegration(integrationId: string): Promise<string> {
    console.log('✅ [GMAIL-OAUTH] Integração já salva pelo backend:', integrationId);
    return integrationId;
  }
  
  /**
   * 📧 Envia email usando Gmail API (sem SMTP)
   */
  static async sendEmail(request: GmailSendRequest): Promise<GmailSendResult> {
    try {
      // ✅ MIGRADO: Verificar autenticação básica Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      console.log('📧 [GMAIL-API] Enviando email via Gmail API:', {
        to: request.to,
        subject: request.subject.substring(0, 30) + '...'
      });

      // Buscar integração Gmail OAuth ativa
      const { data: integration, error: integrationError } = await supabase
        .from('user_email_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'gmail_oauth')
        .eq('is_active', true)
        .single();

      if (integrationError || !integration) {
        return {
          success: false,
          error: 'Configure sua conta Gmail em Integrações → E-mail pessoal'
        };
      }

      // Verificar se token ainda é válido
      const tokenExpiresAt = new Date(integration.oauth_expires_at);
      const now = new Date();
      
      if (tokenExpiresAt <= now) {
        return {
          success: false,
          error: 'Token OAuth expirado. Reconecte sua conta Gmail.'
        };
      }

      // Preparar mensagem para Gmail API
      const emailContent = [
        `From: ${integration.display_name} <${integration.email_address}>`,
        `To: ${request.to}`,
        `Subject: ${request.subject}`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        request.message
      ].join('\r\n');

      const encodedMessage = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Enviar via Gmail API
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
        console.error('❌ [GMAIL-API] Erro na resposta:', errorData);
        
        if (gmailResponse.status === 401) {
          return {
            success: false,
            error: 'Token OAuth inválido. Reconecte sua conta Gmail.'
          };
        }
        
        return {
          success: false,
          error: `Erro Gmail API: ${gmailResponse.status}`,
          details: errorData
        };
      }

      const result = await gmailResponse.json();
      console.log('✅ [GMAIL-API] Email enviado com sucesso:', result.id);

      // Salvar no histórico
      try {
        await supabase.from('email_history').insert({
          tenant_id: user.user_metadata?.tenant_id,
          user_id: user.id,
          lead_id: request.lead_id || null,
          to_email: request.to,
          from_email: integration.email_address,
          subject: request.subject,
          content: request.message,
          status: 'sent',
          sent_at: new Date().toISOString(),
          email_message_id: result.id,
          provider: 'gmail_oauth'
        });
      } catch (historyError) {
        console.warn('⚠️ [GMAIL-API] Histórico não salvo:', historyError);
      }

      return {
        success: true,
        message: 'E-mail enviado via Gmail API com sucesso',
        messageId: result.id,
        details: result
      };

    } catch (error: any) {
      console.error('❌ [GMAIL-API] Erro no envio:', error);
      return {
        success: false,
        error: error?.message || 'Erro interno no envio via Gmail API',
        details: error
      };
    }
  }
  
  /**
   * 🔍 Verifica se usuário tem integração Gmail OAuth ativa
   */
  static async hasGmailIntegration(): Promise<boolean> {
    try {
      // ✅ MIGRADO: Verificar autenticação básica Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return false;
      }

      const { data, error } = await supabase
        .from('user_email_integrations')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'gmail_oauth')
        .eq('is_active', true)
        .limit(1);

      if (error) {
        console.error('❌ [GMAIL-OAUTH] Erro ao verificar integração:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('❌ [GMAIL-OAUTH] Erro ao verificar integração:', error);
      return false;
    }
  }
  
  /**
   * 🗑️ Remove integração Gmail OAuth
   */
  static async removeGmailIntegration(): Promise<boolean> {
    try {
      // ✅ MIGRADO: Verificar autenticação básica Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return false;
      }

      console.log('🗑️ [GMAIL-OAUTH] Removendo integração Gmail...');

      const { error } = await supabase
        .from('user_email_integrations')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('provider', 'gmail_oauth');

      if (error) {
        console.error('❌ [GMAIL-OAUTH] Erro ao remover integração:', error);
        return false;
      }

      console.log('✅ [GMAIL-OAUTH] Integração Gmail removida');
      return true;
    } catch (error) {
      console.error('❌ [GMAIL-OAUTH] Erro ao remover integração:', error);
      return false;
    }
  }
}

export default GmailOAuthService;
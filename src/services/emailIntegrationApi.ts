/**
 * 📧 Email Integration API Service
 * Serviço para gerenciar integrações de e-mail pessoal
 */

import api, { ApiResponse } from './api';

// ============================================
// TIPOS
// ============================================

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
  smtp_secure: boolean; // ✅ Campo único (true=SSL/465, false=TLS/587)
  provider: string;
  is_active: boolean;
  last_test_at?: string;
  test_status?: string;
  test_error?: string;
  created_at?: string;
  updated_at?: string;
}

// ✅ CORREÇÃO: Interface simplificada com campo único smtp_secure
export interface EmailTestRequest {
  email_address: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_secure: boolean; // ✅ Campo único (true=SSL/465, false=TLS/587)
}

export interface EmailTestResponse {
  status: 'success' | 'failed';
  tested_at: string;
  message?: string;
  error_message?: string;
}

export interface EmailIntegrationRequest {
  email_address: string;
  display_name?: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_secure: boolean; // ✅ Campo único (true=SSL/465, false=TLS/587)
  provider?: string;
}

// ============================================
// API CLIENT
// ============================================

class EmailIntegrationApiClient {
  private api = api;

  constructor() {
    // Use a instância singleton da API
  }

  /**
   * Buscar integrações de e-mail do usuário
   */
  // ✅ LIMPEZA: Logs otimizados seguindo CLAUDE.md
  async getIntegrations(): Promise<ApiResponse<EmailIntegration[]>> {
    try {
      const response = await this.api.get<EmailIntegration[]>('/email/integrations');
      console.log('✅ [EMAIL-API] Integrações carregadas:', response.data?.length || 0);
      return response;
    } catch (error) {
      console.error('❌ [EMAIL-API] Erro ao buscar integrações:', error);
      throw error;
    }
  }

  /**
   * Testar conexão SMTP
   */
  async testConnection(request: EmailTestRequest): Promise<ApiResponse<EmailTestResponse>> {
    try {      
      const response = await this.api.post<EmailTestResponse>('/email/test-connection', request);
      console.log('✅ [EMAIL-API] Teste concluído:', response.data?.status);
      return response;
    } catch (error) {
      console.error('❌ [EMAIL-API] Erro no teste:', error);
      throw error;
    }
  }

  /**
   * Salvar/Atualizar integração de e-mail
   */
  async saveIntegration(request: EmailIntegrationRequest): Promise<ApiResponse<EmailIntegration>> {
    try {
      const response = await this.api.post<EmailIntegration>('/email/integrations', request);
      console.log('✅ [EMAIL-API] Integração salva');
      return response;
    } catch (error) {
      console.error('❌ [EMAIL-API] Erro ao salvar:', error);
      throw error;
    }
  }

  /**
   * Buscar provedores disponíveis
   */
  async getProviders(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get<any[]>('/email/providers');
      return response;
    } catch (error) {
      console.error('❌ [EMAIL-API] Erro ao buscar provedores:', error);
      throw error;
    }
  }

  /**
   * Buscar histórico de e-mails
   */
  async getEmailHistory(params?: {
    lead_id?: string;
    pipeline_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any[]>> {
    try {
      console.log('📜 [EMAIL-API] Buscando histórico de e-mails...');
      
      const queryString = params ? new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined) acc[key] = String(value);
          return acc;
        }, {} as Record<string, string>)
      ).toString() : '';
      
      const endpoint = queryString ? `/email/history?${queryString}` : '/email/history';
      const response = await this.api.get<any[]>(endpoint);
      
      console.log('✅ [EMAIL-API] Histórico carregado:', response.data?.length || 0);
      return response;
    } catch (error) {
      console.error('❌ [EMAIL-API] Erro ao buscar histórico:', error);
      throw error;
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const emailIntegrationApi = new EmailIntegrationApiClient();
export default emailIntegrationApi;
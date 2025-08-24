/**
 * 🔧 Service Layer Unificado - Elimina duplicação de lógicas de API
 * Centraliza todas as operações de API com padrões consistentes
 */

import { API } from '@/utils/constants';
import { environmentConfig } from '../config/environment';

// ============================================
// TIPOS BASE
// ============================================

export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  filter?: Record<string, unknown>;
  sort?: string;
  order?: 'asc' | 'desc';
}

// ============================================
// CONFIGURAÇÕES DA API
// ============================================

class ApiService {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    // ✅ CORREÇÃO: Usar proxy Vite em desenvolvimento, URL completa em produção
    // PROBLEMA IDENTIFICADO: audioApiService.ts chamava URL sem /api prefix
    this.baseURL = import.meta.env.DEV ? '/api' : environmentConfig.urls.api;
    // ✅ CORREÇÃO FORMDATA: Não definir Content-Type fixo (permite FormData com boundary automático)
    this.defaultHeaders = {
      // Removido 'Content-Type': 'application/json' para compatibilidade com FormData
    };
  }

  /**
   * Configura headers de autenticação
   */
  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Request base com retry e timeout + autenticação automática Supabase
   * ✅ CORREÇÃO: Tratamento robusto de AbortController e timeout
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    // ✅ CORREÇÃO CRÍTICA: Incluir automaticamente token Supabase
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(options.headers as Record<string, string>),
    };
    
    // ✅ CORREÇÃO FORMDATA: Detectar FormData e configurar Content-Type adequadamente
    const isFormData = options.body instanceof FormData;
    if (!isFormData) {
      // ✅ Apenas adicionar Content-Type para requisições JSON
      headers['Content-Type'] = 'application/json';
    } else {
      console.log('🎵 [API-FormData] FormData detectado - permitindo Content-Type automático do browser');
    }
    // ✅ FormData define Content-Type automaticamente com boundary correto
    
    // ✅ BÁSICO: Buscar user autenticado (Basic Supabase Authentication)
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (user && !error) {
        // ✅ Basic Supabase Authentication: usar session token atual
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
          console.log('🔑 [API] Basic Auth Supabase - Token incluído para:', user?.email || 'N/A');
        }
      } else {
        console.warn('⚠️ [API] Usuário não autenticado - requisição sem autorização');
      }
    } catch (authError) {
      console.error('❌ [API] Erro ao verificar autenticação:', authError);
    }
    
    // ✅ TIMEOUT ESPECÍFICO: SMTP, Pipeline e outras operações
    const isSmtpValidation = endpoint.includes('/simple-email/validate-config');
    const isSmtpOperation = endpoint.includes('/simple-email/') && !isSmtpValidation;
    const isPipelineOperation = endpoint.includes('/pipelines') || endpoint.includes('/pipeline');
    
    // ✅ TIMEOUT CONFIGURADO para cada tipo de operação
    let timeoutDuration: number = API.TIMEOUT; // 30s padrão
    if (isSmtpValidation) {
      // ✅ BASEADO EM DIAGNÓSTICO: 3 tentativas x 7min cada = 21min total
      // Adicionando margem de segurança: 25 minutos
      timeoutDuration = 25 * 60 * 1000; // 25 minutos
      console.log('🧪 [API-TIMEOUT] Validação SMTP ultra robusta: timeout 25min (3 tentativas x 7min + margem)');
    } else if (isSmtpOperation) {
      // Outras operações SMTP: sem timeout (controlado pelo Nodemailer)
      console.log('📧 [API-SMTP] Operação SMTP: sem timeout de frontend');
    } else if (isPipelineOperation) {
      // Operações de pipeline: timeout estendido para salvar dados complexos
      timeoutDuration = API.TIMEOUT_PIPELINE; // 60s para pipelines
      console.log('🔧 [API-TIMEOUT] Operação Pipeline: timeout estendido 60s para salvamento complexo');
    }
    
    // ✅ CRIAR CONTROLLER baseado no tipo de operação
    const shouldCreateController = !options.signal && !isSmtpOperation; // SMTP operations excluded, pipeline operations included
    const controller = shouldCreateController ? new AbortController() : null;
    const signal = options.signal || controller?.signal;
    
    const config: RequestInit = {
      ...options,
      headers,
      signal,
    };

    // ✅ TIMEOUT APLICADO baseado no tipo de operação
    const timeoutId = shouldCreateController ? setTimeout(() => {
      if (controller) {
        const operationType = isSmtpValidation ? 'Validação SMTP' : 
                            isPipelineOperation ? 'Pipeline' : 
                            'Operação padrão';
        console.log(`⏰ [API] ${operationType} - Timeout atingido (${timeoutDuration}ms) - abortando requisição`);
        controller.abort();
      }
    }, timeoutDuration) : null;

    try {
      console.log(`🌐 [API] ${options.method || 'GET'} ${url}`);
      const startTime = Date.now();
      
      const response = await fetch(url, config);
      const duration = Date.now() - startTime;
      
      if (timeoutId) clearTimeout(timeoutId);

      console.log(`✅ [API] Resposta recebida em ${duration}ms: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [API] Erro HTTP ${response.status}: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);
      
      // ✅ CORREÇÃO: Melhor tratamento de erros AbortError
      if (error.name === 'AbortError') {
        console.error('❌ [API] Requisição cancelada:', {
          url,
          method: options.method || 'GET',
          reason: error.message || 'Timeout ou cancelamento'
        });
        throw new Error('Requisição cancelada ou timeout atingido');
      }
      
      console.error('❌ [API] Erro na requisição:', {
        url,
        method: options.method || 'GET',
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: PaginationParams): Promise<ApiResponse<T>> {
    const queryString = params ? this.buildQueryString(params) : '';
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request<T>(url);
  }

  /**
   * POST request simplificado - timeout padrão para todas operações
   * ✅ CORREÇÃO FORMDATA: Detectar FormData e não converter para JSON
   */
  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    const isFormData = data instanceof FormData;
    if (isFormData) {
      console.log('🎵 [API-POST] FormData detectado - enviando sem JSON.stringify');
    }
    
    const config: RequestInit = {
      method: 'POST',
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    };
    
    return this.request<T>(endpoint, config);
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * Criar administrador via backend API
   * ✅ CORREÇÃO: Migrado de useMultipleAdmins.ts para eliminar 403 Forbidden
   */
  async createAdmin(adminData: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    tenant_id: string;
    role?: string;
  }): Promise<ApiResponse<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    tenant_id: string;
    is_active: boolean;
    created_at: string;
  }>> {
    return this.post<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      role: string;
      tenant_id: string;
      is_active: boolean;
      created_at: string;
    }>('/api/admin/create-user', adminData);
  }

  /**
   * DELETE Opportunity - Nova implementação usando backend API
   * ✅ CORREÇÃO RLS: Usa service role via backend para bypass controlado
   */
  async deleteOpportunity(leadId: string): Promise<ApiResponse<{
    deleted_id: string;
    pipeline_id: string;
    lead_master_id: string;
  }>> {
    console.log('🗑️ [API] DELETE opportunity via backend:', leadId?.substring(0, 8) || 'N/A');
    return this.delete<{
      deleted_id: string;
      pipeline_id: string;
      lead_master_id: string;
    }>(`/api/opportunities/${leadId}`);
  }

  /**
   * ✅ MIGRAÇÃO CONCLUÍDA: Método mantido para compatibilidade - usa autenticação básica Supabase
   */
  async authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Incluir automaticamente token Supabase
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(options.headers as Record<string, string>),
    };
    
    // Buscar token Supabase automaticamente
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (authError) {
      console.error('❌ [API] Erro ao obter token Supabase:', authError);
    }
    
    const config: RequestInit = {
      ...options,
      headers,
    };

    return fetch(url, config);
  }

  /**
   * Constrói query string
   */
  private buildQueryString(params: PaginationParams): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'object') {
          searchParams.append(key, JSON.stringify(value));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
    
    return searchParams.toString();
  }
}

// Instância singleton da API
export const api = new ApiService();

export default api; 
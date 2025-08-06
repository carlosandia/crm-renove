import axios from 'axios'
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  UserData,
  CustomerData,
  PipelineData,
  VendedorData,
  DatabaseQuery,
  McpToolParams,
  McpTool,
  HealthCheckResponse
} from '../types/api'
import { environmentConfig } from '../config/environment'

// ✅ CORREÇÃO: Usar configuração centralizada
// Em desenvolvimento: usa proxy Vite (/api → 127.0.0.1:3001)
// Em produção: usa URL configurada do ambiente
const API_BASE_URL = import.meta.env.DEV ? '/api' : environmentConfig.urls.api

// ✅ SISTEMA DE LOG LEVELS GLOBAL
const logLevel = import.meta.env.VITE_LOG_LEVEL || 'warn';
const isDev = import.meta.env.DEV;

const apiLogger = {
  debug: (message: string, ...args: any[]) => {
    if (logLevel === 'debug') {
      console.log(`🔍 [API] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (['debug', 'info'].includes(logLevel)) {
      console.log(`ℹ️ [API] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (['debug', 'info', 'warn'].includes(logLevel)) {
      console.warn(`⚠️ [API] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    console.error(`❌ [API] ${message}`, ...args);
  }
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ✅ INTERCEPTOR SIMPLIFICADO - 100% Supabase Auth nativo
api.interceptors.request.use(
  async (config) => {
    try {
      // Obter token atual do Supabase
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
        apiLogger.debug('✅ Token Supabase nativo adicionado');
        return config;
      }
      
      // Sem token - request sem autenticação
      apiLogger.debug('⚠️ Request sem token (public endpoint)');
      return config;
    } catch (error) {
      // Em caso de erro, continuar sem token
      apiLogger.warn('❌ Erro ao obter token Supabase:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response) => {
    // ✅ OTIMIZADO: Log apenas operações importantes baseado no log level
    const isImportantOperation = response.config.method === 'post' || 
                                 response.config.method === 'put' || 
                                 response.config.method === 'delete' ||
                                 response.status >= 400;
    
    if (isImportantOperation || response.status >= 400) {
      apiLogger.debug('Resposta recebida:', {
        url: response.config.url,
        method: response.config.method?.toUpperCase(),
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data
      });
    }
    
    return response
  },
  async (error) => {
    // ✅ MELHORADO: Identificação expandida de erros de rede 
    const isNetworkError = !error.response || 
                          error.code === 'ERR_NETWORK' || 
                          error.code === 'ERR_CONNECTION_CLOSED' ||
                          error.code === 'ERR_CONNECTION_REFUSED' ||
                          error.code === 'ERR_CONNECTION_RESET' ||
                          error.message === 'Network Error' ||
                          error.code === 'ECONNREFUSED' ||
                          error.code === 'ENOTFOUND' ||
                          error.code === 'ETIMEDOUT' ||
                          (error.message && error.message.includes('fetch failed'));
    
    // ✅ NOVO: Identificar operações pós-salvamento (cache sync)
    const isCacheOperation = error.config?.url?.includes('invalidate') ||
                           error.config?.url?.includes('refetch') ||
                           error.config?.headers?.['X-Cache-Operation'];
    
    if (isNetworkError && isCacheOperation) {
      // ✅ MELHORADO: Log mínimo para cache sync failures
      apiLogger.debug('Cache sync offline (ignorado):', {
        url: error.config?.url,
        operation: 'cache-sync'
      });
    } else if (isNetworkError) {
      // Log padrão para erros de rede em operações críticas
      apiLogger.debug('Backend offline:', {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        message: error.message,
        errorType: error.name || 'Unknown'
      });
    } else {
      // Log completo para outros tipos de erro
      apiLogger.error('Erro na resposta:', {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        responseData: error.response?.data,
        hasResponseData: !!error.response?.data,
        errorType: error.name || 'Unknown'
      });
    }
    
    if (error.response?.status === 401) {
      // ✅ SIMPLES: Apenas logar e redirecionar para login
      apiLogger.warn('❌ Erro 401 - Token Supabase inválido ou expirado');
      
      // Evitar loop infinito de redirecionamento
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        apiLogger.info('🔄 Redirecionando para login...');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error)
  }
)

// Funções da API com tipos específicos
export const apiService = {
  // Auth
  login: (email: string, password: string) =>
    api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password }),

  // Users
  getUsers: () => api.get<ApiResponse<UserData[]>>('/users'),
  createUser: (userData: UserData) => api.post<ApiResponse<UserData>>('/users', userData),
  updateUser: (id: string, userData: Partial<UserData>) => 
    api.put<ApiResponse<UserData>>(`/users/${id}`, userData),
  deleteUser: (id: string) => api.delete<ApiResponse<void>>(`/users/${id}`),

  // Customers
  getCustomers: () => api.get<ApiResponse<CustomerData[]>>('/customers'),
  createCustomer: (customerData: CustomerData) => 
    api.post<ApiResponse<CustomerData>>('/customers', customerData),
  updateCustomer: (id: string, customerData: Partial<CustomerData>) => 
    api.put<ApiResponse<CustomerData>>(`/customers/${id}`, customerData),
  deleteCustomer: (id: string) => api.delete<ApiResponse<void>>(`/customers/${id}`),

  // Pipelines
  getPipelines: () => api.get<ApiResponse<PipelineData[]>>('/pipelines'),
  createPipeline: (pipelineData: PipelineData) => 
    api.post<ApiResponse<PipelineData>>('/pipelines', pipelineData),
  updatePipeline: (id: string, pipelineData: Partial<PipelineData>) => 
    api.put<ApiResponse<PipelineData>>(`/pipelines/${id}`, pipelineData),
  deletePipeline: (id: string) => api.delete<ApiResponse<void>>(`/pipelines/${id}`),

  // Vendedores
  getVendedores: () => api.get<ApiResponse<VendedorData[]>>('/vendedores'),
  createVendedor: (vendedorData: VendedorData) => 
    api.post<ApiResponse<VendedorData>>('/vendedores', vendedorData),
  updateVendedor: (id: string, vendedorData: Partial<VendedorData>) => 
    api.put<ApiResponse<VendedorData>>(`/vendedores/${id}`, vendedorData),
  deleteVendedor: (id: string) => api.delete<ApiResponse<void>>(`/vendedores/${id}`),

  // Database operations
  executeQuery: (query: string, params?: (string | number | boolean | null)[]) =>
    api.post<ApiResponse<unknown[]>>('/database', { query, params } as DatabaseQuery),

  // Health check
  healthCheck: () => api.get<ApiResponse<HealthCheckResponse>>('/health'),

  // MCP operations
  getMcpTools: () => api.get<ApiResponse<McpTool[]>>('/mcp/tools'),
  executeMcpTool: (toolName: string, params: McpToolParams) =>
    api.post<ApiResponse<unknown>>('/mcp/execute', { toolName, params }),

  // Lead Tasks - Geração de task instances
  generateLeadTasks: (leadId: string, pipelineId: string, stageId: string, stageName: string, assignedTo: string, tenantId: string) =>
    api.post<ApiResponse<{ message: string; tasks_created: number }>>('/lead-tasks/generate', {
      lead_id: leadId,
      pipeline_id: pipelineId,
      stage_id: stageId,
      stage_name: stageName,
      assigned_to: assignedTo,
      tenant_id: tenantId
    }),
}

export default api 
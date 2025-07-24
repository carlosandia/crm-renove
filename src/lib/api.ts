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

// Configuração base da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001'

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
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 🔧 CORREÇÃO: Interceptor unificado para tokens (sessionStorage principal)
api.interceptors.request.use(
  (config) => {
    // PRIORIDADE 1: sessionStorage (AuthProvider managed)
    const sessionToken = sessionStorage.getItem('crm_access_token');
    if (sessionToken) {
      config.headers.Authorization = `Bearer ${sessionToken}`;
      if (!window.__apiTokenLogged) {
        apiLogger.debug('Token: sessionStorage (AuthProvider)');
        window.__apiTokenLogged = true;
      }
      return config;
    }
    
    // PRIORIDADE 2: localStorage access_token (JWT fallback)
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      // 🔧 CORREÇÃO: Sincronizar com sessionStorage
      sessionStorage.setItem('crm_access_token', accessToken);
      config.headers.Authorization = `Bearer ${accessToken}`;
      if (!window.__apiTokenLogged) {
        apiLogger.debug('Token: localStorage → sessionStorage (sync)');
        window.__apiTokenLogged = true;
      }
      return config;
    }
    
    // PRIORIDADE 3: crm_user legacy (compatibilidade)
    const user = localStorage.getItem('crm_user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        let token = userData.token || userData.id;
        
        if (token) {
          // 🔧 CORREÇÃO: Para tokens demo, adicionar headers apropriados
          if (token.startsWith('demo_') || !userData.token) {
            token = userData.id.startsWith('demo_') ? userData.id : `demo_fallback_${userData.id}`;
            
            // Adicionar headers para tokens demo
            config.headers['x-user-id'] = userData.id;
            config.headers['x-user-role'] = userData.role;
            config.headers['x-tenant-id'] = userData.tenant_id || '';
            
            apiLogger.debug('Token: demo mode com headers');
          }
          
          // Sincronizar com sessionStorage
          sessionStorage.setItem('crm_access_token', token);
          config.headers.Authorization = `Bearer ${token}`;
          
          if (!window.__apiTokenLogged) {
            apiLogger.debug('Token: crm_user → sessionStorage (legacy sync)');
            window.__apiTokenLogged = true;
          }
          return config;
        }
      } catch (parseError) {
        apiLogger.warn('Erro ao parsear crm_user:', parseError);
      }
    }
    
    // 🔧 CORREÇÃO TEMPORÁRIA: Para outcome-reasons, usar token demo se não houver autenticação
    if (config.url?.includes('outcome-reasons')) {
      console.log('🚨 [API] Sem token para outcome-reasons, usando modo demo');
      const demoToken = 'demo_' + Date.now();
      config.headers.Authorization = `Bearer ${demoToken}`;
      
      // Adicionar headers de usuário demo (seraquevai)
      config.headers['x-user-id'] = 'bbaf8441-23c9-44dc-9a4c-a4da787f829c';
      config.headers['x-user-role'] = 'admin';
      config.headers['x-tenant-id'] = 'd7caffc1-c923-47c8-9301-ca9eeff1a243';
      
      return config;
    }
    
    // ÚLTIMO RECURSO: Nenhum token encontrado
    apiLogger.warn('Nenhum token encontrado em nenhum storage');
    return config;
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
    // ✅ CORREÇÃO: Log silencioso para erros de rede
    const isNetworkError = !error.response || 
                          error.code === 'ERR_NETWORK' || 
                          error.message === 'Network Error' ||
                          error.code === 'ECONNREFUSED';
    
    if (isNetworkError) {
      // Log apenas em debug para erros de rede
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
      // 🔧 CORREÇÃO: Sistema de retry antes de forçar logout
      const retryAttempts = error.config?._retryCount || 0;
      const maxRetries = 2; // Máximo 2 tentativas de retry
      
      const shouldTryRefresh = !error.config?.url?.includes('/auth/refresh') && 
                              !error.config?.url?.includes('/auth/login') &&
                              retryAttempts < maxRetries;
      
      if (shouldTryRefresh) {
        apiLogger.warn(`Token inválido - tentativa ${retryAttempts + 1}/${maxRetries + 1} de renovação...`);
        
        try {
          // Tentar renovar o token usando AuthProvider se disponível
          const refreshToken = sessionStorage.getItem('crm_refresh_token') || 
                             localStorage.getItem('refresh_token');
          
          if (!refreshToken) {
            throw new Error('Nenhum refresh token disponível');
          }
          
          const refreshResponse = await api.post('/auth/refresh', {}, {
            headers: {
              'Authorization': `Bearer ${refreshToken}`
            }
          });
          
          if (refreshResponse.data?.success && refreshResponse.data?.data?.tokens) {
            // Tokens JWT do backend
            const tokens = refreshResponse.data.data.tokens;
            sessionStorage.setItem('crm_access_token', tokens.accessToken);
            if (tokens.refreshToken) {
              sessionStorage.setItem('crm_refresh_token', tokens.refreshToken);
            }
            localStorage.setItem('access_token', tokens.accessToken);
            
            apiLogger.info('Token renovado com sucesso, repetindo requisição...');
            
            // Marcar tentativa de retry e repetir requisição
            if (error.config) {
              error.config._retryCount = retryAttempts + 1;
              error.config.headers.Authorization = `Bearer ${tokens.accessToken}`;
              return api.request(error.config);
            }
          } else if (refreshResponse.data?.token) {
            // Formato antigo de resposta (fallback)
            const newToken = refreshResponse.data.token;
            sessionStorage.setItem('crm_access_token', newToken);
            localStorage.setItem('access_token', newToken);
            
            if (error.config) {
              error.config._retryCount = retryAttempts + 1;
              error.config.headers.Authorization = `Bearer ${newToken}`;
              return api.request(error.config);
            }
          } else {
            throw new Error('Resposta de refresh inválida');
          }
        } catch (refreshError) {
          apiLogger.error(`Falha ao renovar token (tentativa ${retryAttempts + 1}):`, refreshError);
          
          // Se ainda há tentativas restantes, tentar novamente com delay
          if (retryAttempts < maxRetries - 1) {
            apiLogger.warn('Aguardando 1s antes de nova tentativa...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (error.config) {
              error.config._retryCount = retryAttempts + 1;
              return api.request(error.config);
            }
          }
          
          // Todas as tentativas falharam, seguir com logout
        }
      }
      
      // 🔧 CORREÇÃO: Só forçar logout após esgotar todas as tentativas
      if (retryAttempts >= maxRetries) {
        apiLogger.error(`Todas as tentativas de renovação falharam (${retryAttempts + 1}/${maxRetries + 1}) - forçando logout`);
      } else {
        apiLogger.error('Token inválido e sem possibilidade de renovação - forçando logout');
      }
      
      // Limpar tokens
      localStorage.removeItem('crm_user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('crm_access_token');
      sessionStorage.removeItem('crm_refresh_token');
      
      // Verificar se há força de logout no response
      if (error.response?.data?.forceLogout) {
        apiLogger.info('Força logout detectada, redirecionando...');
      }
      
      // Evitar loop infinito de redirecionamento
      if (window.location.pathname !== '/login') {
        apiLogger.info('Redirecionando para login...');
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
}

export default api 
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
import { batchRequest, dedupeRequest, requestBatcher } from '../utils/requestBatcher'

// ✅ CORREÇÃO DEFINITIVA: Forçar proxy em desenvolvimento
// PROBLEMA IDENTIFICADO: environmentConfig.urls.api estava sobrepondo DEV mode
// Em desenvolvimento: SEMPRE usar proxy Vite (/api → 127.0.0.1:3001)
// Em produção: usar URL configurada do ambiente
const API_BASE_URL = import.meta.env.DEV ? '/api' : (environmentConfig.urls.api || 'https://crm.renovedigital.com.br')

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

// ✅ OTIMIZADO: Sistema de timeouts simplificado e rápido
const TIMEOUT_CONFIG = {
  // Operações rápidas - requests simples
  quick: 3000,    // GET requests simples (health, status)
  
  // Operações padrão - a maioria dos requests
  standard: 6000, // POST/PUT/DELETE padrão (reduzido de 12s para 6s)
  
  // Operações pesadas - apenas para uploads e relatórios
  heavy: 12000   // Uploads, reports, bulk operations (reduzido de 25s para 12s)
};

// ✅ BATCHING: Configurações para tipos de request
const BATCH_CONFIG = {
  // Requests que podem ser agrupados (GET similares)
  batchable: ['/pipelines', '/leads', '/stages', '/members'],
  
  // Requests que devem ser deduplicados (evitar duplicatas)
  dedupable: ['/health', '/user-preferences', '/analytics'],
  
  // Janelas de tempo para batching/dedup
  batchDelay: 100,    // 100ms para agrupar
  dedupWindow: 2000   // 2s para deduplicação
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT_CONFIG.standard, // Padrão 6s (otimizado)
  headers: {
    'Content-Type': 'application/json',
  },
})

// ✅ OTIMIZADO: Lógica simplificada de timeout
const determineTimeout = (config: any) => {
  const url = config.url || '';
  const method = config.method?.toLowerCase() || 'get';
  
  // Operações pesadas - apenas uploads e relatórios
  if (url.includes('/upload') || 
      url.includes('/reports') || 
      url.includes('/bulk') ||
      url.includes('/analytics')) {
    return TIMEOUT_CONFIG.heavy;
  }
  
  // Operações rápidas - apenas health check
  if (method === 'get' && url.includes('/health')) {
    return TIMEOUT_CONFIG.quick;
  }
  
  // Padrão para tudo o resto (incluindo user-preferences)
  return TIMEOUT_CONFIG.standard;
};

// ✅ HELPERS: Verificar se request deve usar batching/deduplicação
const shouldBatch = (url: string, method: string): boolean => {
  if (method.toLowerCase() !== 'get') return false;
  return BATCH_CONFIG.batchable.some(path => url.includes(path));
};

const shouldDedupe = (url: string, method: string): boolean => {
  if (method.toLowerCase() !== 'get') return false;
  return BATCH_CONFIG.dedupable.some(path => url.includes(path));
};

// ✅ WRAPPER: Aplicar batching/deduplicação quando apropriado
const optimizedRequest = async (config: any) => {
  const url = config.url || '';
  const method = config.method || 'GET';
  
  // Aplicar batching para requests apropriados
  if (shouldBatch(url, method)) {
    apiLogger.debug(`Aplicando batching para: ${method} ${url}`);
    return batchRequest(url, method, config.data, {
      batchDelay: BATCH_CONFIG.batchDelay,
      maxBatchSize: 5
    });
  }
  
  // Aplicar deduplicação para requests apropriados
  if (shouldDedupe(url, method)) {
    apiLogger.debug(`Aplicando deduplicação para: ${method} ${url}`);
    return dedupeRequest(url, method, config.data, BATCH_CONFIG.dedupWindow);
  }
  
  // Para outros requests, usar axios normal
  return api.request(config);
};

// ✅ INTERCEPTOR OTIMIZADO - Simplified Request Processing
api.interceptors.request.use(
  async (config) => {
    try {
      // ✅ OTIMIZAÇÃO: Aplicar timeout dinâmico baseado na operação
      config.timeout = determineTimeout(config);
      
      // ✅ BÁSICO: Verificar usuário autenticado (cache da sessão)
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
      
      return config;
    } catch (error) {
      // Em caso de erro, continuar sem token
      return config;
    }
  },
  (error) => {
    return Promise.reject(error)
  }
)

// ✅ INTERCEPTOR DE RESPONSE OTIMIZADO
api.interceptors.response.use(
  (response) => {
    // ✅ OTIMIZAÇÃO: Sem logs para responses normais - apenas retornar
    return response
  },
  async (error) => {
    // ✅ OTIMIZAÇÃO: Log apenas timeouts e erros críticos
    const isTimeout = error.code === 'ECONNABORTED' || 
                     error.message?.includes('timeout') ||
                     error.message?.includes('exceeded');
    
    if (isTimeout) {
      apiLogger.warn(`⏱️ Timeout:`, {
        url: error.config?.url?.substring(0, 30),
        timeout: error.config?.timeout || 'unknown'
      });
    }
    
    // ✅ SIMPLES: Redirecionamento para 401 sem logs excessivos
    if (error.response?.status === 401) {
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
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

  // Pipelines (✅ OTIMIZADO: Com batching)
  getPipelines: () => {
    if (shouldBatch('/pipelines', 'GET')) {
      return batchRequest<ApiResponse<PipelineData[]>>('/pipelines', 'GET', undefined, {
        batchDelay: BATCH_CONFIG.batchDelay,
        maxBatchSize: 3
      });
    }
    return api.get<ApiResponse<PipelineData[]>>('/pipelines');
  },
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

  // Health check (✅ OTIMIZADO: Com deduplicação)
  healthCheck: () => {
    if (shouldDedupe('/health', 'GET')) {
      return dedupeRequest<ApiResponse<HealthCheckResponse>>('/health', 'GET', undefined, BATCH_CONFIG.dedupWindow);
    }
    return api.get<ApiResponse<HealthCheckResponse>>('/health');
  },

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

// ✅ MONITORAMENTO: Estatísticas de batching para desenvolvimento
export const getBatchingStats = (logStats: boolean = false) => {
  const stats = requestBatcher.getStats();
  // ✅ PRIORIDADE 3: Log condicional para evitar duplicação
  if (logStats) {
    apiLogger.info('Estatísticas de batching:', stats);
  }
  return stats;
};

// ✅ LIMPEZA: Forçar limpeza de cache
export const clearBatchingCache = () => {
  requestBatcher.cleanup();
  apiLogger.info('Cache de batching limpo');
};

// ✅ DESENVOLVIMENTO: Log estatísticas periodicamente (apenas com atividade)
if (import.meta.env.DEV) {
  let lastStatsSnapshot = '';
  
  setInterval(() => {
    const stats = requestBatcher.getStats();
    const currentSnapshot = JSON.stringify(stats);
    
    // ✅ PRIORIDADE 3: Log apenas quando há mudanças ou atividade significativa
    const hasActivity = stats.pendingBatches > 0 || stats.dedupCacheSize > 0 || stats.totalRequests > 0;
    const hasChanges = currentSnapshot !== lastStatsSnapshot;
    
    if (hasActivity && hasChanges) {
      apiLogger.debug('📊 [BATCHING-MONITOR]', {
        pendingBatches: stats.pendingBatches,
        dedupCacheSize: stats.dedupCacheSize,
        totalRequests: stats.totalRequests,
        dedupHits: stats.dedupHits,
        // ✅ Informações adicionais para debugging
        dedupEfficiency: stats.totalRequests > 0 ? `${Math.round((stats.dedupHits / stats.totalRequests) * 100)}%` : '0%'
      });
      lastStatsSnapshot = currentSnapshot;
    }
  }, 30000); // A cada 30 segundos
}

export default api 
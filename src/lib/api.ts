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
} from '@/types/api'

// Configuração base da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem('crm_user')
    if (user) {
      const userData = JSON.parse(user)
      config.headers.Authorization = `Bearer ${userData.id}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido ou expirado
      localStorage.removeItem('crm_user')
      window.location.href = '/login'
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
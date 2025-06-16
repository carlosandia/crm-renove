import axios from 'axios'

// Configuração base da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

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

// Funções da API
export const apiService = {
  // Auth
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  // Users
  getUsers: () => api.get('/users'),
  createUser: (userData: any) => api.post('/users', userData),
  updateUser: (id: string, userData: any) => api.put(`/users/${id}`, userData),
  deleteUser: (id: string) => api.delete(`/users/${id}`),

  // Customers
  getCustomers: () => api.get('/customers'),
  createCustomer: (customerData: any) => api.post('/customers', customerData),
  updateCustomer: (id: string, customerData: any) => api.put(`/customers/${id}`, customerData),
  deleteCustomer: (id: string) => api.delete(`/customers/${id}`),

  // Pipelines
  getPipelines: () => api.get('/pipelines'),
  createPipeline: (pipelineData: any) => api.post('/pipelines', pipelineData),
  updatePipeline: (id: string, pipelineData: any) => api.put(`/pipelines/${id}`, pipelineData),
  deletePipeline: (id: string) => api.delete(`/pipelines/${id}`),

  // Vendedores
  getVendedores: () => api.get('/vendedores'),
  createVendedor: (vendedorData: any) => api.post('/vendedores', vendedorData),
  updateVendedor: (id: string, vendedorData: any) => api.put(`/vendedores/${id}`, vendedorData),
  deleteVendedor: (id: string) => api.delete(`/vendedores/${id}`),

  // Database operations
  executeQuery: (query: string, params?: any[]) =>
    api.post('/database', { query, params }),

  // Health check
  healthCheck: () => api.get('/health'),

  // MCP operations
  getMcpTools: () => api.get('/mcp/tools'),
  executeMcpTool: (toolName: string, params: any) =>
    api.post('/mcp/execute', { toolName, params }),
}

export default api 
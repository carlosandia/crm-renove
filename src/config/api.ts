// Configuração centralizada da API
import { environmentConfig } from './environment';

export const API_CONFIG = {
  BASE_URL: environmentConfig.urls.api,
  ENDPOINTS: {
    // Auth
    AUTH: '/api/auth',
    
    // Cadence
    CADENCE: '/api/cadence',
    CADENCE_SAVE: '/api/cadence/save',
    CADENCE_DELETE: '/api/cadence/delete',
    
    // Lead Tasks
    LEAD_TASKS: '/api/lead-tasks',
    
    // Pipelines
    PIPELINES: '/api/pipelines',
    
    // Users
    USERS: '/api/users',
    VENDEDORES: '/api/vendedores',
    
    // Others
    HEALTH: '/api/health',
    SETUP: '/api/setup'
  }
};

// Helper para construir URLs completas
export const buildApiUrl = (endpoint: string, params?: Record<string, string>): string => {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  
  return url;
};

// Helper para fazer requests autenticadas
export const apiRequest = async (
  endpoint: string, 
  options: RequestInit = {},
  params?: Record<string, string>
): Promise<Response> => {
  const url = buildApiUrl(endpoint, params);
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  
  return fetch(url, config);
}; 
// ============================================================================
// TIPOS ESPECÍFICOS PARA API - SUBSTITUINDO 'any'
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: 'super_admin' | 'admin' | 'member';
    tenant_id: string;
    is_active: boolean;
    created_at: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
  };
}

export interface UserData {
  id?: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'super_admin' | 'admin' | 'member';
  tenant_id: string;
  is_active?: boolean;
  password_hash?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerData {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PipelineData {
  id?: string;
  name: string;
  description?: string;
  tenant_id: string;
  created_by: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface VendedorData {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  tenant_id: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseQuery {
  query: string;
  params?: (string | number | boolean | null)[];
}

export interface McpToolParams {
  [key: string]: string | number | boolean | object | null;
}

export interface McpTool {
  name: string;
  description: string;
  parameters: object;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected';
    redis?: 'connected' | 'disconnected';
  };
} 
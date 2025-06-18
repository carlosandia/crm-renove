// Extensões de tipos para Express
declare global {
  namespace Express {
    interface Request {
      requestTime?: string;
      user?: {
        id: string;
        email: string;
        role: string;
        tenant_id: string;
        first_name?: string;
        last_name?: string;
      };
      apiKey?: string;
      rateLimit?: {
        limit: number;
        current: number;
        remaining: number;
        resetTime: Date;
      };
    }
  }
}

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'super_admin' | 'admin' | 'member';
  tenant_id: string;
  is_active: boolean;
  password_hash?: string;
  created_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export {}; 
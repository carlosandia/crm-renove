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
      webhookAuth?: {
        tenantId: string;
        apiKey: string;
        authenticatedVia: 'webhook_api_key';
      };
      apiKey?: string;
      rateLimit?: {
        limit: number;
        current: number;
        remaining: number;
        resetTime: Date;
      };
      correlationId?: string;
      startTime?: number;
    }

    interface Response {
      correlationId?: string;
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
  updated_at?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
  correlationId?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    tenant_id?: string;
    time_range?: string;
    cache_hit?: boolean;
    response_time?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
  correlationId?: string;
  timestamp: string;
}

// AIDEV-NOTE: Interface JWTPayload removida
// Sistema usa apenas User interface com Supabase Auth nativo

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface CacheOptions {
  ttl?: number;
  compress?: boolean;
  tags?: string[];
  namespace?: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  pool?: {
    min: number;
    max: number;
  };
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  tenantId?: string;
  operation?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  tenantId?: string;
  [key: string]: unknown;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    cache: ServiceStatus;
    email: ServiceStatus;
  };
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'unknown';
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

export {}; 
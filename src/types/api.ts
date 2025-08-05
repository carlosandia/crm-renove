/**
 * ============================================
 * 🔧 CATEGORIA 6.3: TIPOS DE API CONSISTENTES
 * ============================================
 * 
 * Tipos padronizados para todas as chamadas de API do CRM,
 * incluindo respostas, erros, query parameters e payloads.
 * 
 * Baseado em padrões REST e GraphQL enterprise.
 */

import type { PaginatedResponse, AsyncState } from './Utility';

// ============================================
// CORE API RESPONSE TYPES
// ============================================

/**
 * ✅ API_RESPONSE<T> - Resposta padrão melhorada
 * 
 * Estrutura consistente para todas as respostas da API.
 * Substitui e melhora a interface existente.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: string;
  requestId: string;
  
  // Metadata opcional
  meta?: ApiMeta;
  
  // Para operações específicas
  warnings?: ApiWarning[];
  debug?: ApiDebugInfo;
}

/**
 * ✅ API_ERROR - Interface para erros padronizada
 * 
 * Estrutura consistente para todos os erros da API.
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  
  // Contexto do erro
  field?: string;
  path?: string;
  line?: number;
  
  // Informações para usuário
  userMessage?: string;
  helpUrl?: string;
  
  // Stack trace (apenas em desenvolvimento)
  stackTrace?: string;
  
  // Erros aninhados
  innerErrors?: ApiError[];
  
  // Categorização
  category: 'validation' | 'authentication' | 'authorization' | 'business' | 'system' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * ✅ API_META - Metadados da resposta
 * 
 * Informações adicionais sobre a resposta.
 */
export interface ApiMeta {
  // Paginação (melhorada)
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    links?: {
      first?: string;
      last?: string;
      next?: string;
      prev?: string;
    };
  };
  
  // Performance
  timing?: {
    total: number;
    database?: number;
    cache?: number;
    external?: number;
  };
  
  // Cache
  cache?: {
    hit: boolean;
    ttl?: number;
    key?: string;
  };
  
  // Rate limiting
  rateLimit?: {
    limit: number;
    remaining: number;
    resetTime: string;
  };
}

/**
 * ✅ API_WARNING - Avisos não críticos
 * 
 * Para situações que não são erros mas merecem atenção.
 */
export interface ApiWarning {
  code: string;
  message: string;
  field?: string;
  type: 'deprecation' | 'performance' | 'business' | 'data';
}

/**
 * ✅ API_DEBUG_INFO - Informações de debug
 * 
 * Apenas em ambiente de desenvolvimento.
 */
export interface ApiDebugInfo {
  query?: string;
  queryTime?: number;
  cacheHit?: boolean;
  memoryUsage?: number;
  version?: string;
}

// ============================================
// HTTP METHOD TYPES
// ============================================

/**
 * ✅ HTTP_METHOD - Métodos HTTP suportados
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * ✅ HTTP_STATUS - Status codes mais comuns
 */
export type HttpStatus = 
  | 200 // OK
  | 201 // Created
  | 204 // No Content
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden
  | 404 // Not Found
  | 409 // Conflict
  | 422 // Unprocessable Entity
  | 429 // Too Many Requests
  | 500 // Internal Server Error
  | 502 // Bad Gateway
  | 503; // Service Unavailable

// ============================================
// QUERY PARAMETERS
// ============================================

/**
 * ✅ BASE_QUERY_PARAMS - Parâmetros base para listagens
 * 
 * Parâmetros comuns em todas as consultas de listagem.
 */
export interface BaseQueryParams {
  // Paginação
  page?: number;
  per_page?: number;
  limit?: number;
  offset?: number;
  
  // Ordenação
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  order_by?: string;
  
  // Filtros básicos
  search?: string;
  q?: string;
  
  // Campos
  fields?: string[];
  include?: string[];
  exclude?: string[];
  
  // Cache
  cache?: boolean;
  fresh?: boolean;
}

/**
 * ✅ FILTER_PARAMS - Parâmetros de filtro
 * 
 * Para filtros mais complexos e específicos.
 */
export interface FilterParams {
  // Filtros por data
  created_after?: string;
  created_before?: string;
  updated_after?: string;
  updated_before?: string;
  
  // Filtros por status
  status?: string | string[];
  is_active?: boolean;
  
  // Filtros por relacionamento
  tenant_id?: string;
  user_id?: string;
  assigned_to?: string;
  
  // Filtros customizados
  custom_fields?: Record<string, any>;
  
  // Operadores
  operators?: Record<string, 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'nin'>;
}

/**
 * ✅ ENTITY_QUERY_PARAMS<T> - Query params tipados por entidade
 * 
 * Combina parâmetros base com filtros específicos.
 */
export type EntityQueryParams<T extends Record<string, any> = Record<string, any>> = 
  BaseQueryParams & FilterParams & Partial<T>;

// ============================================
// REQUEST/RESPONSE PAIRS
// ============================================

/**
 * ✅ LIST_REQUEST<T> - Request para listagens
 */
export interface ListRequest<T extends Record<string, any> = Record<string, any>> {
  params: EntityQueryParams<T>;
  headers?: Record<string, string>;
}

/**
 * ✅ LIST_RESPONSE<T> - Response para listagens
 */
export type ListResponse<T> = ApiResponse<PaginatedResponse<T>>;

/**
 * ✅ DETAIL_REQUEST - Request para buscar item específico
 */
export interface DetailRequest {
  id: string;
  include?: string[];
  fields?: string[];
}

/**
 * ✅ DETAIL_RESPONSE<T> - Response para item específico
 */
export type DetailResponse<T> = ApiResponse<T>;

/**
 * ✅ CREATE_REQUEST<T> - Request para criação
 */
export interface CreateRequest<T> {
  data: T;
  validate?: boolean;
  return_entity?: boolean;
}

/**
 * ✅ CREATE_RESPONSE<T> - Response para criação
 */
export type CreateResponse<T> = ApiResponse<T>;

/**
 * ✅ UPDATE_REQUEST<T> - Request para atualização
 */
export interface UpdateRequest<T> {
  id: string;
  data: Partial<T>;
  validate?: boolean;
  return_entity?: boolean;
}

/**
 * ✅ UPDATE_RESPONSE<T> - Response para atualização
 */
export type UpdateResponse<T> = ApiResponse<T>;

/**
 * ✅ DELETE_REQUEST - Request para deleção
 */
export interface DeleteRequest {
  id: string;
  soft_delete?: boolean;
  cascade?: boolean;
}

/**
 * ✅ DELETE_RESPONSE - Response para deleção
 */
export type DeleteResponse = ApiResponse<{ deleted: boolean; id: string }>;

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * ✅ BATCH_REQUEST<T> - Request para operações em lote
 */
export interface BatchRequest<T> {
  operation: 'create' | 'update' | 'delete';
  items: T[];
  validate?: boolean;
  continue_on_error?: boolean;
}

/**
 * ✅ BATCH_RESPONSE<T> - Response para operações em lote
 */
export interface BatchResponse<T> {
  success: boolean;
  results: Array<{
    item: T;
    success: boolean;
    error?: ApiError;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// ============================================
// FILE UPLOAD
// ============================================

/**
 * ✅ UPLOAD_REQUEST - Request para upload de arquivos
 */
export interface UploadRequest {
  file: File | Blob;
  filename?: string;
  folder?: string;
  metadata?: Record<string, any>;
  
  // Configurações
  max_size?: number;
  allowed_types?: string[];
  compress?: boolean;
}

/**
 * ✅ UPLOAD_RESPONSE - Response para upload
 */
export interface UploadResponse {
  file_id: string;
  filename: string;
  original_name: string;
  size: number;
  mime_type: string;
  url: string;
  cdn_url?: string;
  thumbnail_url?: string;
  metadata: Record<string, any>;
}

// ============================================
// EXISTING INTERFACES (MELHORADAS)
// ============================================

/**
 * ✅ LOGIN_REQUEST - Request de login melhorado
 */
export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
  device_info?: {
    user_agent: string;
    ip_address?: string;
    device_type?: 'desktop' | 'mobile' | 'tablet';
  };
}

/**
 * ✅ LOGIN_RESPONSE - Response simplificado para Supabase Auth
 * AIDEV-NOTE: Tokens JWT customizados removidos, sistema usa Session do Supabase
 */
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
    
    // Informações adicionais
    permissions: string[];
    last_login?: string;
    avatar_url?: string;
  };
  
  // Supabase Session (gerenciada automaticamente)
  session: {
    id: string;
    expires_at: string;
    device_info?: LoginRequest['device_info'];
  };
}

/**
 * ✅ USER_DATA - Dados de usuário melhorados
 */
export interface UserData {
  id?: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'super_admin' | 'admin' | 'member';
  tenant_id: string;
  
  // Campos opcionais melhorados
  is_active?: boolean;
  avatar_url?: string;
  phone?: string;
  timezone?: string;
  language?: string;
  
  // Configurações
  settings?: {
    email_notifications: boolean;
    desktop_notifications: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  
  // Metadados
  password_hash?: string;
  email_verified_at?: string;
  last_login?: string;
  login_count?: number;
  created_at?: string;
  updated_at?: string;
}

// Continuar com outras interfaces existentes...
export interface CustomerData {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  tenant_id?: string;
  
  // Campos adicionais
  status?: 'active' | 'inactive' | 'prospect' | 'customer';
  source?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
  
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
  
  // Campos adicionais
  settings?: {
    auto_progress: boolean;
    notification_enabled: boolean;
    required_fields: string[];
  };
  
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
  
  // Campos adicionais
  role?: string;
  team?: string;
  target?: number;
  commission_rate?: number;
  
  created_at?: string;
  updated_at?: string;
}

// ============================================
// WEBHOOK & INTEGRATION TYPES
// ============================================

/**
 * ✅ WEBHOOK_PAYLOAD<T> - Payload de webhook
 */
export interface WebhookPayload<T = any> {
  event: string;
  timestamp: string;
  data: T;
  
  // Metadados
  webhook_id?: string;
  delivery_id?: string;
  attempt?: number;
  
  // Assinatura
  signature?: string;
  
  // Contexto
  tenant_id?: string;
  user_id?: string;
}

/**
 * ✅ INTEGRATION_CONFIG - Configuração de integração
 */
export interface IntegrationConfig {
  name: string;
  type: 'webhook' | 'api' | 'email' | 'sms';
  enabled: boolean;
  
  // Configurações específicas
  config: Record<string, any>;
  
  // Autenticação
  auth?: {
    type: 'bearer' | 'basic' | 'oauth2' | 'api_key';
    credentials: Record<string, string>;
  };
  
  // Retry policy
  retry?: {
    max_attempts: number;
    backoff_strategy: 'linear' | 'exponential';
    initial_delay: number;
  };
}

// ============================================
// HEALTH CHECK (MELHORADO)
// ============================================

/**
 * ✅ HEALTH_CHECK_RESPONSE - Health check melhorado
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  
  // Serviços
  services: {
    database: ServiceStatus;
    email?: ServiceStatus;
    storage?: ServiceStatus;
    integrations?: ServiceStatus;
  };
  
  // Métricas
  metrics?: {
    memory_usage: number;
    cpu_usage: number;
    active_connections: number;
    response_time: number;
  };
}

/**
 * ✅ SERVICE_STATUS - Status de serviço individual
 */
export interface ServiceStatus {
  status: 'connected' | 'disconnected' | 'error';
  response_time?: number;
  last_check: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

// ============================================
// LEGACY SUPPORT (manter compatibilidade)
// ============================================

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

// ============================================

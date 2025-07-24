/**
 * ============================================
 * 🔧 SCHEMAS ZOD CENTRALIZADOS - API LAYER
 * ============================================
 * 
 * Schemas Zod como fonte única da verdade para validação runtime
 * e inferência de tipos TypeScript. Conforme CLAUDE.md:
 * "Schemas live in src/shared/schemas/"
 * "Types must always be generated via z.infer<typeof Schema>"
 */

import { z } from 'zod';

// ============================================
// CORE API RESPONSE SCHEMAS
// ============================================

/**
 * 🔧 API Error Schema - Estrutura de erro padronizada
 */
export const ApiErrorSchema: z.ZodType<any> = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  
  // Contexto do erro
  field: z.string().optional(),
  path: z.string().optional(),
  line: z.number().optional(),
  
  // Informações para usuário
  userMessage: z.string().optional(),
  helpUrl: z.string().url().optional(),
  
  // Stack trace (apenas em desenvolvimento)
  stackTrace: z.string().optional(),
  
  // Erros aninhados
  innerErrors: z.array(z.lazy(() => ApiErrorSchema)).optional(),
  
  // Categorização
  category: z.enum(['validation', 'authentication', 'authorization', 'business', 'system', 'network']),
  severity: z.enum(['low', 'medium', 'high', 'critical'])
});

/**
 * 🔧 API Warning Schema - Avisos não críticos
 */
export const ApiWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
  type: z.enum(['deprecation', 'performance', 'business', 'data'])
});

/**
 * 🔧 API Debug Info Schema - Informações de debug
 */
export const ApiDebugInfoSchema = z.object({
  query: z.string().optional(),
  queryTime: z.number().optional(),
  cacheHit: z.boolean().optional(),
  memoryUsage: z.number().optional(),
  version: z.string().optional()
});

/**
 * 🔧 API Meta Schema - Metadados da resposta
 */
export const ApiMetaSchema = z.object({
  // Paginação
  pagination: z.object({
    page: z.number(),
    per_page: z.number(),
    total: z.number(),
    total_pages: z.number(),
    has_next: z.boolean(),
    has_prev: z.boolean(),
    links: z.object({
      first: z.string().optional(),
      last: z.string().optional(),
      next: z.string().optional(),
      prev: z.string().optional()
    }).optional()
  }).optional(),
  
  // Performance
  timing: z.object({
    total: z.number(),
    database: z.number().optional(),
    cache: z.number().optional(),
    external: z.number().optional()
  }).optional(),
  
  // Cache
  cache: z.object({
    hit: z.boolean(),
    ttl: z.number().optional(),
    key: z.string().optional()
  }).optional(),
  
  // Rate limiting
  rateLimit: z.object({
    limit: z.number(),
    remaining: z.number(),
    resetTime: z.string().datetime()
  }).optional()
});

/**
 * 🔧 API Response Schema Generic - Resposta padrão tipada
 */
export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: ApiErrorSchema.optional(),
  message: z.string().optional(),
  timestamp: z.string().datetime(),
  requestId: z.string().uuid(),
  
  // Metadata opcional
  meta: ApiMetaSchema.optional(),
  
  // Para operações específicas
  warnings: z.array(ApiWarningSchema).optional(),
  debug: ApiDebugInfoSchema.optional()
});

/**
 * 🔧 Paginated Response Schema Generic
 */
export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
  items: z.array(itemSchema),
  total_count: z.number(),
  page: z.number(),
  per_page: z.number(),
  total_pages: z.number(),
  has_next: z.boolean(),
  has_prev: z.boolean()
});

// ============================================
// HTTP SCHEMAS
// ============================================

/**
 * 🔧 HTTP Method Schema
 */
export const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

/**
 * 🔧 HTTP Status Schema
 */
export const HttpStatusSchema = z.union([
  z.literal(200), // OK
  z.literal(201), // Created
  z.literal(204), // No Content
  z.literal(400), // Bad Request
  z.literal(401), // Unauthorized
  z.literal(403), // Forbidden
  z.literal(404), // Not Found
  z.literal(409), // Conflict
  z.literal(422), // Unprocessable Entity
  z.literal(429), // Too Many Requests
  z.literal(500), // Internal Server Error
  z.literal(502), // Bad Gateway
  z.literal(503)  // Service Unavailable
]);

// ============================================
// QUERY PARAMETERS SCHEMAS
// ============================================

/**
 * 🔧 Base Query Params Schema
 */
export const BaseQueryParamsSchema = z.object({
  // Paginação
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().max(100).optional(),
  limit: z.number().int().positive().max(1000).optional(),
  offset: z.number().int().nonnegative().optional(),
  
  // Ordenação
  sort_by: z.string().optional(),
  sort_direction: z.enum(['asc', 'desc']).optional(),
  order_by: z.string().optional(),
  
  // Filtros básicos
  search: z.string().optional(),
  q: z.string().optional(),
  
  // Campos
  fields: z.array(z.string()).optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  
  // Cache
  cache: z.boolean().optional(),
  fresh: z.boolean().optional()
});

/**
 * 🔧 Filter Params Schema
 */
export const FilterParamsSchema = z.object({
  // Filtros por data
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  updated_after: z.string().datetime().optional(),
  updated_before: z.string().datetime().optional(),
  
  // Filtros por status
  status: z.union([z.string(), z.array(z.string())]).optional(),
  is_active: z.boolean().optional(),
  
  // Filtros por relacionamento
  tenant_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  
  // Filtros customizados
  custom_fields: z.record(z.unknown()).optional(),
  
  // Operadores
  operators: z.record(z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'like', 'in', 'nin'])).optional()
});

/**
 * 🔧 Entity Query Params Schema Generic
 */
export const createEntityQueryParamsSchema = <T extends z.ZodTypeAny>(entitySchema: T) => 
  BaseQueryParamsSchema
    .merge(FilterParamsSchema)
    .merge(entitySchema instanceof z.ZodObject ? entitySchema.partial() : entitySchema);

// ============================================
// REQUEST/RESPONSE PAIRS SCHEMAS
// ============================================

/**
 * 🔧 List Request Schema Generic
 */
export const createListRequestSchema = <T extends z.ZodTypeAny>(entitySchema: T) => z.object({
  params: createEntityQueryParamsSchema(entitySchema),
  headers: z.record(z.string()).optional()
});

/**
 * 🔧 Detail Request Schema
 */
export const DetailRequestSchema = z.object({
  id: z.string().uuid(),
  include: z.array(z.string()).optional(),
  fields: z.array(z.string()).optional()
});

/**
 * 🔧 Create Request Schema Generic
 */
export const createCreateRequestSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  data: dataSchema,
  validate: z.boolean().default(true).optional(),
  return_entity: z.boolean().default(true).optional()
});

/**
 * 🔧 Update Request Schema Generic
 */
export const createUpdateRequestSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  id: z.string().uuid(),
  data: dataSchema instanceof z.ZodObject ? dataSchema.partial() : dataSchema,
  validate: z.boolean().default(true).optional(),
  return_entity: z.boolean().default(true).optional()
});

/**
 * 🔧 Delete Request Schema
 */
export const DeleteRequestSchema = z.object({
  id: z.string().uuid(),
  soft_delete: z.boolean().default(false).optional(),
  cascade: z.boolean().default(false).optional()
});

// ============================================
// BATCH OPERATIONS SCHEMAS
// ============================================

/**
 * 🔧 Batch Request Schema Generic
 */
export const createBatchRequestSchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
  operation: z.enum(['create', 'update', 'delete']),
  items: z.array(itemSchema),
  validate: z.boolean().default(true).optional(),
  continue_on_error: z.boolean().default(false).optional()
});

/**
 * 🔧 Batch Response Schema Generic
 */
export const createBatchResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
  success: z.boolean(),
  results: z.array(z.object({
    item: itemSchema,
    success: z.boolean(),
    error: ApiErrorSchema.optional()
  })),
  summary: z.object({
    total: z.number(),
    successful: z.number(),
    failed: z.number()
  })
});

// ============================================
// FILE UPLOAD SCHEMAS
// ============================================

/**
 * 🔧 Upload Request Schema
 */
export const UploadRequestSchema = z.object({
  file: z.instanceof(File).or(z.instanceof(Blob)),
  filename: z.string().optional(),
  folder: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  
  // Configurações
  max_size: z.number().positive().optional(),
  allowed_types: z.array(z.string()).optional(),
  compress: z.boolean().optional()
});

/**
 * 🔧 Upload Response Schema
 */
export const UploadResponseSchema = z.object({
  file_id: z.string().uuid(),
  filename: z.string(),
  original_name: z.string(),
  size: z.number(),
  mime_type: z.string(),
  url: z.string().url(),
  cdn_url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  metadata: z.record(z.unknown())
});

// ============================================
// AUTHENTICATION SCHEMAS
// ============================================

/**
 * 🔧 Login Request Schema
 */
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  remember_me: z.boolean().optional(),
  device_info: z.object({
    user_agent: z.string(),
    ip_address: z.string().ip().optional(),
    device_type: z.enum(['desktop', 'mobile', 'tablet']).optional()
  }).optional()
});

/**
 * 🔧 User Schema para autenticação
 */
export const UserAuthSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  role: z.enum(['super_admin', 'admin', 'member']),
  tenant_id: z.string().uuid(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  
  // Informações adicionais
  permissions: z.array(z.string()),
  last_login: z.string().datetime().optional(),
  avatar_url: z.string().url().optional()
});

/**
 * 🔧 Token Schema para autenticação
 */
export const TokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  tokenType: z.literal('Bearer'),
  
  // Informações do token
  scope: z.string().optional(),
  issuedAt: z.string().datetime()
});

/**
 * 🔧 Session Schema para autenticação
 */
export const SessionSchema = z.object({
  id: z.string().uuid(),
  expires_at: z.string().datetime(),
  device_info: LoginRequestSchema.shape.device_info.optional()
});

/**
 * 🔧 Login Response Schema
 */
export const LoginResponseSchema = z.object({
  user: UserAuthSchema,
  tokens: TokenSchema,
  session: SessionSchema
});

// ============================================
// WEBHOOK & INTEGRATION SCHEMAS
// ============================================

/**
 * 🔧 Webhook Payload Schema Generic
 */
export const createWebhookPayloadSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  event: z.string(),
  timestamp: z.string().datetime(),
  data: dataSchema,
  
  // Metadados
  webhook_id: z.string().uuid().optional(),
  delivery_id: z.string().uuid().optional(),
  attempt: z.number().int().positive().optional(),
  
  // Assinatura
  signature: z.string().optional(),
  
  // Contexto
  tenant_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional()
});

/**
 * 🔧 Integration Config Schema
 */
export const IntegrationConfigSchema = z.object({
  name: z.string(),
  type: z.enum(['webhook', 'api', 'email', 'sms']),
  enabled: z.boolean(),
  
  // Configurações específicas
  config: z.record(z.unknown()),
  
  // Autenticação
  auth: z.object({
    type: z.enum(['bearer', 'basic', 'oauth2', 'api_key']),
    credentials: z.record(z.string())
  }).optional(),
  
  // Retry policy
  retry: z.object({
    max_attempts: z.number().int().positive(),
    backoff_strategy: z.enum(['linear', 'exponential']),
    initial_delay: z.number().positive()
  }).optional()
});

// ============================================
// HEALTH CHECK SCHEMAS
// ============================================

/**
 * 🔧 Service Status Schema
 */
export const ServiceStatusSchema = z.object({
  status: z.enum(['connected', 'disconnected', 'error']),
  response_time: z.number().optional(),
  last_check: z.string().datetime(),
  error_message: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

/**
 * 🔧 Health Check Response Schema
 */
export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string().datetime(),
  uptime: z.number(),
  version: z.string(),
  
  // Serviços
  services: z.object({
    database: ServiceStatusSchema,
    email: ServiceStatusSchema.optional(),
    storage: ServiceStatusSchema.optional(),
    integrations: ServiceStatusSchema.optional()
  }),
  
  // Métricas
  metrics: z.object({
    memory_usage: z.number(),
    cpu_usage: z.number(),
    active_connections: z.number(),
    response_time: z.number()
  }).optional()
});

// ============================================
// EXPORTS PARA COMPATIBILIDADE LEGACY
// ============================================

/**
 * 🔧 Database Query Schema
 */
export const DatabaseQuerySchema = z.object({
  query: z.string(),
  params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
});

/**
 * 🔧 MCP Tool Params Schema
 */
export const McpToolParamsSchema = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.object({}), z.null()])
);

/**
 * 🔧 MCP Tool Schema
 */
export const McpToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.object({})
});
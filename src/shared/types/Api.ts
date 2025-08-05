/**
 * ============================================
 * 🔧 TIPOS DERIVADOS DOS SCHEMAS ZOD - API
 * ============================================
 * 
 * Types must always be generated via z.infer<typeof Schema>
 * AIDEV-NOTE: Type derived from Zod — do not edit manually
 */

import { z } from 'zod';
import {
  ApiErrorSchema,
  ApiWarningSchema,
  ApiDebugInfoSchema,
  ApiMetaSchema,
  createApiResponseSchema,
  createPaginatedResponseSchema,
  HttpMethodSchema,
  HttpStatusSchema,
  BaseQueryParamsSchema,
  FilterParamsSchema,
  createEntityQueryParamsSchema,
  createListRequestSchema,
  DetailRequestSchema,
  createCreateRequestSchema,
  createUpdateRequestSchema,
  DeleteRequestSchema,
  createBatchRequestSchema,
  createBatchResponseSchema,
  UploadRequestSchema,
  UploadResponseSchema,
  LoginRequestSchema,
  UserAuthSchema,
  SessionSchema,
  LoginResponseSchema,
  createWebhookPayloadSchema,
  IntegrationConfigSchema,
  ServiceStatusSchema,
  HealthCheckResponseSchema,
  DatabaseQuerySchema,
  McpToolParamsSchema,
  McpToolSchema
} from '../schemas/ApiSchemas';

// ============================================
// CORE API TYPES
// ============================================

/**
 * ✅ API Error - Interface para erros padronizada
 * AIDEV-NOTE: Use Zod inference — schema is the source of truth
 */
export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * ✅ API Warning - Avisos não críticos
 */
export type ApiWarning = z.infer<typeof ApiWarningSchema>;

/**
 * ✅ API Debug Info - Informações de debug
 */
export type ApiDebugInfo = z.infer<typeof ApiDebugInfoSchema>;

/**
 * ✅ API Meta - Metadados da resposta
 */
export type ApiMeta = z.infer<typeof ApiMetaSchema>;

/**
 * ✅ API Response<T> - Resposta padrão tipada
 */
export type ApiResponse<T = unknown> = z.infer<ReturnType<typeof createApiResponseSchema<z.ZodType<T>>>>;

/**
 * ✅ Paginated Response<T> - Resposta paginada tipada
 */
export type PaginatedResponse<T = unknown> = z.infer<ReturnType<typeof createPaginatedResponseSchema<z.ZodType<T>>>>;

// ============================================
// HTTP TYPES
// ============================================

/**
 * ✅ HTTP Method - Métodos HTTP suportados
 */
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

/**
 * ✅ HTTP Status - Status codes mais comuns
 */
export type HttpStatus = z.infer<typeof HttpStatusSchema>;

// ============================================
// QUERY PARAMETERS TYPES
// ============================================

/**
 * ✅ Base Query Params - Parâmetros base para listagens
 */
export type BaseQueryParams = z.infer<typeof BaseQueryParamsSchema>;

/**
 * ✅ Filter Params - Parâmetros de filtro
 */
export type FilterParams = z.infer<typeof FilterParamsSchema>;

/**
 * ✅ Entity Query Params<T> - Query params tipados por entidade
 */
export type EntityQueryParams<T extends Record<string, unknown> = Record<string, unknown>> = 
  z.infer<ReturnType<typeof createEntityQueryParamsSchema<z.ZodType<T>>>>;

// ============================================
// REQUEST/RESPONSE PAIRS TYPES
// ============================================

/**
 * ✅ List Request<T> - Request para listagens
 */
export type ListRequest<T extends Record<string, unknown> = Record<string, unknown>> = 
  z.infer<ReturnType<typeof createListRequestSchema<z.ZodType<T>>>>;

/**
 * ✅ List Response<T> - Response para listagens
 */
export type ListResponse<T> = ApiResponse<PaginatedResponse<T>>;

/**
 * ✅ Detail Request - Request para buscar item específico
 */
export type DetailRequest = z.infer<typeof DetailRequestSchema>;

/**
 * ✅ Detail Response<T> - Response para item específico
 */
export type DetailResponse<T> = ApiResponse<T>;

/**
 * ✅ Create Request<T> - Request para criação
 */
export type CreateRequest<T> = z.infer<ReturnType<typeof createCreateRequestSchema<z.ZodType<T>>>>;

/**
 * ✅ Create Response<T> - Response para criação
 */
export type CreateResponse<T> = ApiResponse<T>;

/**
 * ✅ Update Request<T> - Request para atualização
 */
export type UpdateRequest<T> = z.infer<ReturnType<typeof createUpdateRequestSchema<z.ZodType<T>>>>;

/**
 * ✅ Update Response<T> - Response para atualização
 */
export type UpdateResponse<T> = ApiResponse<T>;

/**
 * ✅ Delete Request - Request para deleção
 */
export type DeleteRequest = z.infer<typeof DeleteRequestSchema>;

/**
 * ✅ Delete Response - Response para deleção
 */
export type DeleteResponse = ApiResponse<{ deleted: boolean; id: string }>;

// ============================================
// BATCH OPERATIONS TYPES
// ============================================

/**
 * ✅ Batch Request<T> - Request para operações em lote
 */
export type BatchRequest<T> = z.infer<ReturnType<typeof createBatchRequestSchema<z.ZodType<T>>>>;

/**
 * ✅ Batch Response<T> - Response para operações em lote
 */
export type BatchResponse<T> = z.infer<ReturnType<typeof createBatchResponseSchema<z.ZodType<T>>>>;

// ============================================
// FILE UPLOAD TYPES
// ============================================

/**
 * ✅ Upload Request - Request para upload de arquivos
 */
export type UploadRequest = z.infer<typeof UploadRequestSchema>;

/**
 * ✅ Upload Response - Response para upload
 */
export type UploadResponse = z.infer<typeof UploadResponseSchema>;

// ============================================
// AUTHENTICATION TYPES
// ============================================

/**
 * ✅ Login Request - Request de login
 */
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * ✅ User Auth - Dados de usuário para autenticação
 */
export type UserAuth = z.infer<typeof UserAuthSchema>;

/**
 * ✅ Token - Informações de token (DEPRECATED: usando Session do Supabase)
 */
// export type Token = z.infer<typeof TokenSchema>;

/**
 * ✅ Session - Informações de sessão
 */
export type Session = z.infer<typeof SessionSchema>;

/**
 * ✅ Login Response - Response de login
 */
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// ============================================
// WEBHOOK & INTEGRATION TYPES
// ============================================

/**
 * ✅ Webhook Payload<T> - Payload de webhook
 */
export type WebhookPayload<T = unknown> = z.infer<ReturnType<typeof createWebhookPayloadSchema<z.ZodType<T>>>>;

/**
 * ✅ Integration Config - Configuração de integração
 */
export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>;

// ============================================
// HEALTH CHECK TYPES
// ============================================

/**
 * ✅ Service Status - Status de serviço individual
 */
export type ServiceStatus = z.infer<typeof ServiceStatusSchema>;

/**
 * ✅ Health Check Response - Health check
 */
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

// ============================================
// LEGACY SUPPORT TYPES
// ============================================

/**
 * ✅ Database Query - Query de banco
 */
export type DatabaseQuery = z.infer<typeof DatabaseQuerySchema>;

/**
 * ✅ MCP Tool Params - Parâmetros de ferramenta MCP
 */
export type McpToolParams = z.infer<typeof McpToolParamsSchema>;

/**
 * ✅ MCP Tool - Ferramenta MCP
 */
export type McpTool = z.infer<typeof McpToolSchema>;

// ============================================
// UTILITY TYPES PARA VALIDAÇÃO
// ============================================

/**
 * ✅ Validator Helper - Helper para criar validadores tipados
 */
export type ValidatorFunction<T> = (data: unknown) => T;

/**
 * ✅ Safe Parse Result - Resultado de parsing seguro
 */
export type SafeParseResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: {
    issues: Array<{
      code: string;
      message: string;
      path: (string | number)[];
    }>;
  };
};

/**
 * ✅ Schema Type Helper - Helper para extrair tipo de schema
 */
export type SchemaType<T extends z.ZodTypeAny> = z.infer<T>;
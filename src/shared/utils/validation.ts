/**
 * ============================================
 * 🔧 UTILITÁRIOS DE VALIDAÇÃO ZOD
 * ============================================
 * 
 * Helpers para validação runtime usando Zod schemas.
 * Centraliza lógica de parsing e error handling.
 */

import { z } from 'zod';
import type { SafeParseResult } from '../types/Api';

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * 🔧 Parse Safe - Parsing seguro com resultado tipado
 */
export function parseSafe<T>(schema: z.ZodType<T>, data: unknown): SafeParseResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data
    };
  }

  return {
    success: false,
    error: {
      issues: result.error.issues.map(issue => ({
        code: issue.code,
        message: issue.message,
        path: issue.path
      }))
    }
  };
}

/**
 * 🔧 Parse Strict - Parsing estrito que lança erro
 */
export function parseStrict<T>(schema: z.ZodType<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      throw new Error(`Validation error: ${firstIssue.message} at path: ${firstIssue.path.join('.')}`);
    }
    throw error;
  }
}

/**
 * 🔧 Validate API Response - Validação específica para respostas de API
 */
export function validateApiResponse<T>(
  dataSchema: z.ZodType<T>,
  response: unknown
): SafeParseResult<T> {
  // Primeiro, valida se é uma resposta de API válida
  const apiResponseSchema = z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      code: z.string(),
      message: z.string()
    }).optional(),
    message: z.string().optional(),
    timestamp: z.string().optional(),
    requestId: z.string().optional()
  });

  const apiResult = parseSafe(apiResponseSchema, response);
  
  if (!apiResult.success) {
    return apiResult as SafeParseResult<T>;
  }

  // Se a resposta da API indica sucesso, valida os dados
  if (apiResult.data.success && apiResult.data.data !== undefined) {
    return parseSafe(dataSchema, apiResult.data.data);
  }

  // Se a resposta da API indica erro, retorna o erro
  if (!apiResult.data.success) {
    return {
      success: false,
      error: {
        issues: [{
          code: 'api_error',
          message: apiResult.data.error?.message || 'API returned error',
          path: []
        }]
      }
    };
  }

  // Se não há dados, considera como erro
  return {
    success: false,
    error: {
      issues: [{
        code: 'no_data',
        message: 'API response does not contain data',
        path: []
      }]
    }
  };
}

/**
 * 🔧 Validate Array - Validação específica para arrays
 */
export function validateArray<T>(
  itemSchema: z.ZodType<T>,
  data: unknown
): SafeParseResult<T[]> {
  console.log('🔍 [validateArray] ENTRADA - Iniciando validação:', {
    dataType: typeof data,
    isArray: Array.isArray(data),
    dataLength: Array.isArray(data) ? data.length : 'N/A',
    schemaName: itemSchema._def?.typeName || 'unknown',
    sampleData: Array.isArray(data) ? data.slice(0, 2).map(item => ({
      hasId: item && typeof item === 'object' && 'id' in item,
      hasEmail: item && typeof item === 'object' && 'email' in item,
      hasAuthUserId: item && typeof item === 'object' && 'auth_user_id' in item,
      authUserIdValue: item && typeof item === 'object' && 'auth_user_id' in item ? item.auth_user_id : 'MISSING'
    })) : 'NOT_ARRAY'
  });

  const arraySchema = z.array(itemSchema);
  const result = parseSafe(arraySchema, data);
  
  console.log('🔍 [validateArray] RESULTADO - Validação concluída:', {
    success: result.success,
    dataPassedValidation: result.success ? result.data.length : 0,
    validationErrors: !result.success ? result.error.issues.map(issue => ({
      code: issue.code,
      message: issue.message,
      path: issue.path.join('.'),
      itemIndex: issue.path[0]
    })) : 'NONE'
  });

  if (!result.success) {
    console.error('❌ [validateArray] ERRO DETALHADO - Falha na validação:', {
      totalIssues: result.error.issues.length,
      firstIssue: result.error.issues[0],
      issuesByPath: result.error.issues.reduce((acc, issue) => {
        const path = issue.path.join('.');
        if (!acc[path]) acc[path] = [];
        acc[path].push(issue.message);
        return acc;
      }, {} as Record<string, string[]>),
      itemsBeingValidated: Array.isArray(data) ? data.map((item, index) => ({
        index,
        itemType: typeof item,
        itemKeys: item && typeof item === 'object' ? Object.keys(item as Record<string, unknown>) : 'NOT_OBJECT',
        hasRequiredFields: item && typeof item === 'object' ? {
          id: 'id' in item,
          email: 'email' in item,
          first_name: 'first_name' in item,
          auth_user_id: 'auth_user_id' in item,
          auth_user_id_value: 'auth_user_id' in item ? (item as any).auth_user_id : 'MISSING'
        } : 'ITEM_NOT_OBJECT'
      })) : 'DATA_NOT_ARRAY'
    });
  }

  return result;
}

/**
 * 🔧 Validate Paginated Response - Validação para respostas paginadas
 */
export function validatePaginatedResponse<T>(
  itemSchema: z.ZodType<T>,
  response: unknown
): SafeParseResult<{
  items: T[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}> {
  const paginatedSchema = z.object({
    items: z.array(itemSchema),
    total_count: z.number(),
    page: z.number(),
    per_page: z.number(),
    total_pages: z.number(),
    has_next: z.boolean(),
    has_prev: z.boolean()
  });

  return parseSafe(paginatedSchema, response) as SafeParseResult<{
    items: T[];
    total_count: number;
    page: number;
    per_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  }>;
}

// ============================================
// TRANSFORMATION HELPERS
// ============================================

/**
 * 🔧 Transform and Validate - Transforma e valida dados
 */
export function transformAndValidate<TInput, TOutput>(
  inputSchema: z.ZodType<TInput>,
  outputSchema: z.ZodType<TOutput>,
  transformer: (data: TInput) => TOutput,
  data: unknown
): SafeParseResult<TOutput> {
  // Primeiro valida a entrada
  const inputResult = parseSafe(inputSchema, data);
  if (!inputResult.success) {
    return inputResult as SafeParseResult<TOutput>;
  }

  try {
    // Transforma os dados
    const transformed = transformer(inputResult.data);
    
    // Valida a saída
    return parseSafe(outputSchema, transformed);
  } catch (error) {
    return {
      success: false,
      error: {
        issues: [{
          code: 'transformation_error',
          message: error instanceof Error ? error.message : 'Transformation failed',
          path: []
        }]
      }
    };
  }
}

/**
 * 🔧 Clean and Validate - Limpa dados antes de validar
 */
export function cleanAndValidate<T>(
  schema: z.ZodType<T>,
  data: unknown,
  cleaner?: (data: unknown) => unknown
): SafeParseResult<T> {
  const cleanedData = cleaner ? cleaner(data) : data;
  return parseSafe(schema, cleanedData);
}

/**
 * 🔧 Default Cleaner - Limpeza padrão de dados
 */
export function defaultCleaner(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const cleaned: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    // Remove propriedades undefined
    if (value !== undefined) {
      // Trim strings
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed !== '') {
          cleaned[key] = trimmed;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }

  return cleaned;
}

// ============================================
// ERROR HANDLING HELPERS
// ============================================

/**
 * 🔧 Format Validation Error - Formata erros de validação para usuário
 */
export function formatValidationError(result: SafeParseResult<any>): string {
  if (result.success) {
    return '';
  }

  const issues = (result as any).error.issues;
  if (issues.length === 1) {
    const issue = issues[0];
    const path = issue.path.length > 0 ? ` (${issue.path.join('.')})` : '';
    return `${issue.message}${path}`;
  }

  return `Multiple validation errors: ${issues.map(issue => {
    const path = issue.path.length > 0 ? ` (${issue.path.join('.')})` : '';
    return `${issue.message}${path}`;
  }).join(', ')}`;
}

/**
 * 🔧 Get First Error - Obtém primeira mensagem de erro
 */
export function getFirstError(result: SafeParseResult<any>): string {
  if (result.success) {
    return '';
  }

  const firstIssue = (result as any).error.issues[0];
  return firstIssue?.message || 'Validation error';
}

/**
 * 🔧 Has Field Error - Verifica se campo específico tem erro
 */
export function hasFieldError(result: SafeParseResult<any>, fieldPath: string): boolean {
  if (result.success) {
    return false;
  }

  return (result as any).error.issues.some(issue => 
    issue.path.join('.') === fieldPath
  );
}

/**
 * 🔧 Get Field Error - Obtém erro de campo específico
 */
export function getFieldError(result: SafeParseResult<any>, fieldPath: string): string {
  if (result.success) {
    return '';
  }

  const fieldIssue = (result as any).error.issues.find(issue => 
    issue.path.join('.') === fieldPath
  );

  return fieldIssue?.message || '';
}

// ============================================
// ASYNC VALIDATION HELPERS
// ============================================

/**
 * 🔧 Parse Safe Async - Parsing assíncrono seguro
 */
export async function parseSafeAsync<T>(
  schema: z.ZodType<T>,
  data: unknown
): Promise<SafeParseResult<T>> {
  try {
    const result = await schema.safeParseAsync(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    }

    return {
      success: false,
      error: {
        issues: result.error.issues.map(issue => ({
          code: issue.code,
          message: issue.message,
          path: issue.path
        }))
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        issues: [{
          code: 'async_error',
          message: error instanceof Error ? error.message : 'Async validation failed',
          path: []
        }]
      }
    };
  }
}

/**
 * 🔧 Parse Strict Async - Parsing assíncrono estrito
 */
export async function parseStrictAsync<T>(
  schema: z.ZodType<T>,
  data: unknown
): Promise<T> {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      throw new Error(`Async validation error: ${firstIssue.message} at path: ${firstIssue.path.join('.')}`);
    }
    throw error;
  }
}

// ============================================
// FORM VALIDATION HELPERS
// ============================================

/**
 * 🔧 Validate Form Data - Validação específica para formulários
 */
export function validateFormData<T>(
  schema: z.ZodType<T>,
  formData: FormData | Record<string, unknown>
): SafeParseResult<T> {
  let data: Record<string, unknown>;

  if (formData instanceof FormData) {
    data = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
  } else {
    data = formData;
  }

  return cleanAndValidate(schema, data, defaultCleaner);
}

/**
 * 🔧 Create Validator - Cria função validadora tipada
 */
export function createValidator<T>(schema: z.ZodType<T>) {
  return {
    parse: (data: unknown): T => parseStrict(schema, data),
    safeParse: (data: unknown): SafeParseResult<T> => parseSafe(schema, data),
    parseAsync: (data: unknown): Promise<T> => parseStrictAsync(schema, data),
    safeParseAsync: (data: unknown): Promise<SafeParseResult<T>> => parseSafeAsync(schema, data),
    validate: (data: unknown): data is T => schema.safeParse(data).success,
    schema
  };
}
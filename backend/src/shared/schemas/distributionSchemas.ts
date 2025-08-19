import { z } from 'zod';

/**
 * Schemas Zod para Sistema de Distribuição
 * ✅ Validação de entrada robusta para APIs de distribuição
 * ✅ Baseado em padrões Zod Context7 documentation
 */

// ================================================================================
// SCHEMA PARA REGRAS DE DISTRIBUIÇÃO
// ================================================================================

/**
 * ✅ SCHEMA: Regra de Distribuição
 */
export const DistributionRuleSchema = z.object({
  pipeline_id: z.string().uuid('Pipeline ID deve ser um UUID válido'),
  tenant_id: z.string().uuid('Tenant ID deve ser um UUID válido').optional(), // Será extraído do req.user
  mode: z.enum(['manual', 'rodizio'], {
    errorMap: () => ({ message: 'Modo deve ser "manual" ou "rodizio"' })
  }),
  is_active: z.boolean().default(true),
  working_hours_only: z.boolean().default(false),
  working_hours_start: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, 'Formato deve ser HH:MM:SS')
    .optional()
    .nullable(),
  working_hours_end: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, 'Formato deve ser HH:MM:SS')
    .optional()
    .nullable(),
  working_days: z.array(z.number().min(1).max(7), {
    errorMap: () => ({ message: 'Dias devem ser números de 1 (domingo) a 7 (sábado)' })
  }).optional().nullable(),
  skip_inactive_members: z.boolean().default(true),
  fallback_to_manual: z.boolean().default(true),
  last_assigned_member_id: z.string().uuid().optional().nullable(),
  total_assignments: z.number().int().min(0).optional().default(0),
  successful_assignments: z.number().int().min(0).optional().default(0),
  failed_assignments: z.number().int().min(0).optional().default(0),
  last_assignment_at: z.string().datetime().optional().nullable(),
}).refine((data) => {
  // ✅ VALIDAÇÃO CUSTOMIZADA: Horários devem ser consistentes
  if (data.working_hours_only && data.working_hours_start && data.working_hours_end) {
    return data.working_hours_start < data.working_hours_end;
  }
  return true;
}, {
  message: 'Horário de início deve ser anterior ao horário de fim',
  path: ['working_hours_start']
});

/**
 * ✅ SCHEMA: Request para salvar regra de distribuição
 * AIDEV-NOTE: Schema reescrito para evitar uso de .omit() que estava causando erro
 */
export const SaveDistributionRuleSchema = z.object({
  mode: z.enum(['manual', 'rodizio'], {
    errorMap: () => ({ message: 'Modo deve ser "manual" ou "rodizio"' })
  }),
  is_active: z.boolean().default(true),
  working_hours_only: z.boolean().default(false),
  working_hours_start: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, 'Formato deve ser HH:MM:SS')
    .optional()
    .nullable(),
  working_hours_end: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, 'Formato deve ser HH:MM:SS')
    .optional()
    .nullable(),
  working_days: z.array(z.number().min(1).max(7), {
    errorMap: () => ({ message: 'Dias devem ser números de 1 (domingo) a 7 (sábado)' })
  }).optional().nullable(),
  skip_inactive_members: z.boolean().default(true),
  fallback_to_manual: z.boolean().default(true)
}).refine((data) => {
  // ✅ VALIDAÇÃO CUSTOMIZADA: Horários devem ser consistentes
  if (data.working_hours_only && data.working_hours_start && data.working_hours_end) {
    return data.working_hours_start < data.working_hours_end;
  }
  return true;
}, {
  message: 'Horário de início deve ser anterior ao horário de fim',
  path: ['working_hours_start']
});

// ================================================================================
// SCHEMA PARA PARAMETROS DE REQUISIÇÃO
// ================================================================================

/**
 * ✅ SCHEMA: Parâmetros de URL para rotas de distribuição
 * AIDEV-NOTE: Relaxar validação de UUID para aceitar diferentes formatos
 */
export const DistributionParamsSchema = z.object({
  pipelineId: z.string()
    .min(1, 'Pipeline ID é obrigatório')
    .refine((val) => {
      // Aceitar UUID com ou sem hífens, ou qualquer string válida
      const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
      return uuidRegex.test(val.replace(/-/g, ''));
    }, 'Pipeline ID deve ser um UUID válido')
});

/**
 * ✅ SCHEMA: Query parameters para estatísticas
 * AIDEV-NOTE: Tornar todos os query parameters completamente opcionais
 */
export const DistributionStatsQuerySchema = z.object({
  days: z.union([
    z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(365)),
    z.number().int().min(1).max(365),
    z.undefined()
  ]).optional().default(30),
  detailed: z.union([
    z.string().transform(val => val.toLowerCase() === 'true').pipe(z.boolean()),
    z.boolean(),
    z.undefined()
  ]).optional().default(false)
}).optional().default({});

// ================================================================================
// SCHEMA PARA DISTRIBUIÇÃO ROUND-ROBIN
// ================================================================================

/**
 * ✅ SCHEMA: Request para distribuição round-robin
 */
export const RoundRobinRequestSchema = z.object({
  pipeline_id: z.string().uuid('Pipeline ID deve ser um UUID válido'),
  lead_id: z.string().uuid('Lead ID deve ser um UUID válido').optional(),
  force_assignment: z.boolean().default(false),
  skip_working_hours: z.boolean().default(false)
});

/**
 * ✅ SCHEMA: Teste de distribuição
 */
export const TestDistributionSchema = z.object({
  pipeline_id: z.string().uuid('Pipeline ID deve ser um UUID válido'),
  simulate_only: z.boolean().default(true)
});

// ================================================================================
// SCHEMA PARA CADENCE RECONSTRUCT
// ================================================================================

/**
 * ✅ SCHEMA: Request para reconstruct de cadence
 */
export const CadenceReconstructSchema = z.object({
  pipeline_id: z.string().uuid('Pipeline ID deve ser um UUID válido'),
  tenant_id: z.string().uuid('Tenant ID deve ser um UUID válido'),
  user_id: z.string().uuid('User ID deve ser um UUID válido').optional(),
  reason: z.string().min(3, 'Razão deve ter pelo menos 3 caracteres').optional(),
  force_rebuild: z.boolean().default(false)
});

// ================================================================================
// TIPOS TYPESCRIPT DERIVADOS
// ================================================================================

/**
 * ✅ TIPOS: Inferidos dos schemas Zod
 */
export type DistributionRule = z.infer<typeof DistributionRuleSchema>;
export type SaveDistributionRuleRequest = z.infer<typeof SaveDistributionRuleSchema>;
export type DistributionParams = z.infer<typeof DistributionParamsSchema>;
export type DistributionStatsQuery = z.infer<typeof DistributionStatsQuerySchema>;
export type RoundRobinRequest = z.infer<typeof RoundRobinRequestSchema>;
export type TestDistributionRequest = z.infer<typeof TestDistributionSchema>;
export type CadenceReconstructRequest = z.infer<typeof CadenceReconstructSchema>;

// ================================================================================
// HELPERS DE VALIDAÇÃO
// ================================================================================

/**
 * ✅ HELPER: Validar parâmetros de distribuição
 */
export function validateDistributionParams(params: unknown) {
  try {
    return {
      success: true,
      data: DistributionParamsSchema.parse(params)
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof z.ZodError ? error.errors : 'Erro de validação'
    };
  }
}

/**
 * ✅ HELPER: Validar dados de regra de distribuição
 */
export function validateDistributionRule(data: unknown) {
  try {
    return {
      success: true,
      data: SaveDistributionRuleSchema.parse(data)
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof z.ZodError ? error.errors : 'Erro de validação'
    };
  }
}

/**
 * ✅ HELPER: Validar query parameters de estatísticas
 */
export function validateStatsQuery(query: unknown) {
  try {
    return {
      success: true,
      data: DistributionStatsQuerySchema.parse(query)
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof z.ZodError ? error.errors : 'Erro de validação'
    };
  }
}
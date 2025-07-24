/**
 * ============================================
 * 🎯 OUTCOME REASONS SCHEMAS
 * ============================================
 * 
 * Schemas Zod para sistema de motivos de ganho/perda
 * AIDEV-NOTE: Source of truth para types - nunca editar types manualmente
 */

import { z } from 'zod';

// ============================================
// SCHEMA BASE PARA MOTIVOS DE GANHO/PERDA
// ============================================

export const OutcomeReasonSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido'),
  pipeline_id: z.string().uuid('Pipeline ID deve ser um UUID válido'),
  tenant_id: z.string().min(1, 'Tenant ID é obrigatório'), // text, não uuid
  reason_type: z.enum(['won', 'lost', 'win', 'loss'], { // suporte aos formatos antigos
    errorMap: () => ({ message: 'Tipo deve ser "won", "lost", "win" ou "loss"' })
  }),
  reason_text: z.string()
    .min(1, 'Motivo não pode estar vazio')
    .max(200, 'Motivo deve ter no máximo 200 caracteres')
    .trim(),
  is_active: z.boolean().default(true),
  display_order: z.number()
    .int('Ordem deve ser um número inteiro')
    .min(0, 'Ordem não pode ser negativa'),
  created_at: z.string().datetime('Data de criação inválida'),
  updated_at: z.string().datetime('Data de atualização inválida')
});

// ============================================
// SCHEMA PARA HISTÓRICO DE APLICAÇÃO
// ============================================

export const LeadOutcomeHistorySchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido'),
  lead_id: z.string().uuid('Lead ID deve ser um UUID válido'),
  pipeline_id: z.string().uuid('Pipeline ID deve ser um UUID válido'),
  tenant_id: z.string().min(1, 'Tenant ID é obrigatório'), // text, não uuid
  outcome_type: z.enum(['won', 'lost', 'win', 'loss'], { // suporte aos formatos antigos
    errorMap: () => ({ message: 'Tipo deve ser "won", "lost", "win" ou "loss"' })
  }),
  reason_id: z.string().uuid('Reason ID deve ser um UUID válido').optional(),
  reason_text: z.string()
    .min(1, 'Texto do motivo não pode estar vazio')
    .trim(),
  notes: z.string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .trim()
    .optional(),
  applied_by: z.string().uuid('Applied by deve ser um UUID válido'),
  applied_at: z.string().datetime('Data de aplicação inválida')
});

// ============================================
// SCHEMAS PARA REQUESTS/RESPONSES DA API
// ============================================

export const CreateOutcomeReasonRequestSchema = z.object({
  pipeline_id: z.string().uuid(),
  reason_type: z.enum(['won', 'lost', 'win', 'loss']),
  reason_text: z.string().min(1).max(200).trim(),
  display_order: z.number().int().min(0).optional()
});

export const UpdateOutcomeReasonRequestSchema = CreateOutcomeReasonRequestSchema.partial();

export const ApplyOutcomeRequestSchema = z.object({
  lead_id: z.string().uuid(),
  outcome_type: z.enum(['won', 'lost', 'win', 'loss']),
  reason_id: z.string().uuid().optional(),
  reason_text: z.string().min(1).trim(),
  notes: z.string().max(500).trim().optional()
});

export const GetOutcomeReasonsQuerySchema = z.object({
  pipeline_id: z.string().uuid(),
  reason_type: z.enum(['won', 'lost', 'win', 'loss', 'all']).optional().default('all'),
  active_only: z.string().transform(val => val === 'true').optional().default('true')
});

// ============================================
// SCHEMAS PARA CONFIGURAÇÃO DEFAULT
// ============================================

export const DefaultOutcomeReasonsSchema = z.object({
  won: z.array(z.string().min(1).max(200)).default([
    'Preço competitivo',
    'Melhor proposta técnica', 
    'Relacionamento/confiança',
    'Urgência do cliente',
    'Recomendação/indicação'
  ]),
  lost: z.array(z.string().min(1).max(200)).default([
    'Preço muito alto',
    'Concorrente escolhido',
    'Não era o momento',
    'Não há orçamento',
    'Não era fit para o produto'
  ])
});

// ============================================
// TYPES DERIVADOS - AIDEV-NOTE: NUNCA EDITAR MANUALMENTE
// ============================================

export type OutcomeReason = z.infer<typeof OutcomeReasonSchema>;
export type LeadOutcomeHistory = z.infer<typeof LeadOutcomeHistorySchema>;
export type CreateOutcomeReasonRequest = z.infer<typeof CreateOutcomeReasonRequestSchema>;
export type UpdateOutcomeReasonRequest = z.infer<typeof UpdateOutcomeReasonRequestSchema>;
export type ApplyOutcomeRequest = z.infer<typeof ApplyOutcomeRequestSchema>;
export type GetOutcomeReasonsQuery = z.infer<typeof GetOutcomeReasonsQuerySchema>;
export type DefaultOutcomeReasons = z.infer<typeof DefaultOutcomeReasonsSchema>;

// ============================================
// EXPORT DEFAULT PARA FÁCIL IMPORTAÇÃO
// ============================================

export default {
  OutcomeReasonSchema,
  LeadOutcomeHistorySchema,
  CreateOutcomeReasonRequestSchema,
  UpdateOutcomeReasonRequestSchema,
  ApplyOutcomeRequestSchema,
  GetOutcomeReasonsQuerySchema,
  DefaultOutcomeReasonsSchema
};
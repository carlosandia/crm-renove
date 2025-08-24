/**
 * ============================================
 * 🎯 OUTCOME REASONS SCHEMAS
 * ============================================
 * 
 * Schemas Zod para sistema de motivos de ganho/perdido
 * AIDEV-NOTE: Source of truth para types - nunca editar types manualmente
 */

import { z } from 'zod';

// ============================================
// SCHEMA BASE PARA MOTIVOS DE GANHO/PERDIDO
// ============================================

export const OutcomeReasonSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido'),
  pipeline_id: z.string().uuid('Pipeline ID deve ser um UUID válido'),
  tenant_id: z.string().min(1, 'Tenant ID é obrigatório').nullable().optional(), // ✅ Aceita null do banco Supabase
  reason_type: z.enum(['ganho', 'perdido', 'won', 'lost'], { // ganho/perdido são novos padrões, won/lost para compatibilidade
    errorMap: () => ({ message: 'Tipo deve ser "ganho", "perdido", "won" ou "lost"' })
  }),
  reason_text: z.string()
    .min(1, 'Motivo não pode estar vazio')
    .max(200, 'Motivo deve ter no máximo 200 caracteres')
    .trim(),
  is_active: z.boolean().nullable().default(false), // ✅ Aceita null do banco, default false
  display_order: z.number()
    .int('Ordem deve ser um número inteiro')
    .min(0, 'Ordem não pode ser negativa')
    .nullable()
    .optional(), // ✅ Campo pode ser null no banco
  created_at: z.string().datetime('Data de criação inválida'),
  updated_at: z.string().datetime('Data de atualização inválida'),
  // ✅ CORREÇÃO: Campo para identificar origem dos dados (tabela vs JSON)
  is_from_json: z.boolean().nullable().optional().default(false) // ✅ Aceita null
});

// ============================================
// SCHEMA PARA HISTÓRICO DE APLICAÇÃO
// ============================================

export const LeadOutcomeHistorySchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido'),
  lead_id: z.string().uuid('Lead ID deve ser um UUID válido'),
  pipeline_id: z.string().uuid('Pipeline ID deve ser um UUID válido'),
  tenant_id: z.string().min(1, 'Tenant ID é obrigatório').nullable().optional(), // ✅ Aceita null do banco
  outcome_type: z.enum(['ganho', 'perdido', 'won', 'lost'], { // ganho/perdido são novos padrões, won/lost para compatibilidade
    errorMap: () => ({ message: 'Tipo deve ser "ganho", "perdido", "won" ou "lost"' })
  }),
  reason_id: z.string().uuid('Reason ID deve ser um UUID válido').nullish(), // ✅ Zod oficial: aceita null e undefined
  reason_text: z.string()
    .min(1, 'Texto do motivo não pode estar vazio')
    .trim(),
  notes: z.string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .trim()
    .nullish(), // ✅ Zod oficial: aceita null, undefined e string
  applied_by: z.string().uuid('Applied by deve ser um UUID válido'),
  applied_at: z.string().datetime('Data de aplicação inválida')
});

// ============================================
// SCHEMAS PARA REQUESTS/RESPONSES DA API
// ============================================

export const CreateOutcomeReasonRequestSchema = z.object({
  pipeline_id: z.string().uuid(),
  reason_type: z.enum(['ganho', 'perdido', 'won', 'lost']), // ganho/perdido preferidos, won/lost para compatibilidade
  reason_text: z.string().min(1).max(200).trim(),
  display_order: z.number().int().min(0).optional()
});

export const UpdateOutcomeReasonRequestSchema = CreateOutcomeReasonRequestSchema.partial();

export const ApplyOutcomeRequestSchema = z.object({
  lead_id: z.string().uuid(),
  outcome_type: z.enum(['ganho', 'perdido', 'won', 'lost']), // ganho/perdido preferidos, won/lost para compatibilidade
  reason_id: z.string().uuid().nullish(), // ✅ Zod oficial: aceita null, undefined e UUID
  reason_text: z.string().min(1).trim(),
  notes: z.string().max(500).trim().nullish() // ✅ Zod oficial: aceita null, undefined e string
});

export const GetOutcomeReasonsQuerySchema = z.object({
  pipeline_id: z.string().uuid(),
  reason_type: z.enum(['ganho', 'perdido', 'won', 'lost', 'all']).optional().default('all'), // ganho/perdido preferidos, won/lost para compatibilidade
  active_only: z.string().transform(val => val === 'true').optional().default('true')
});

// ============================================
// SCHEMAS PARA CONFIGURAÇÃO DEFAULT
// ============================================

export const DefaultOutcomeReasonsSchema = z.object({
  ganho: z.array(z.string().min(1).max(200)).default([
    'Preço competitivo',
    'Melhor proposta técnica', 
    'Relacionamento/confiança',
    'Urgência do cliente',
    'Recomendação/indicação'
  ]),
  perdido: z.array(z.string().min(1).max(200)).default([
    'Preço muito alto',
    'Concorrente escolhido',
    'Não era o momento',
    'Não há orçamento',
    'Não era fit para o produto'
  ]),
  // ✅ COMPATIBILIDADE: Manter formatos antigos para migration suave
  won: z.array(z.string().min(1).max(200)).optional(),
  lost: z.array(z.string().min(1).max(200)).optional()
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
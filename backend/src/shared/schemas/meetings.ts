// =====================================================================================
// SCHEMAS ZOD BACKEND: Sistema de Reuniões
// Autor: Claude (Arquiteto Sênior)
// Descrição: Schemas Zod para validação backend do sistema de reuniões
// =====================================================================================

import { z } from 'zod';

// AIDEV-NOTE: Schemas idênticos ao frontend para consistência
export const MeetingOutcomeSchema = z.enum([
  'agendada',
  'realizada', 
  'no_show',
  'reagendada',
  'cancelada'
]);

export const NoShowReasonSchema = z.enum([
  'nao_atendeu',
  'esqueceu', 
  'sem_interesse',
  'problema_tecnico',
  'outro'
]);

export const MeetingSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  pipeline_lead_id: z.string().uuid(),
  lead_master_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  planned_at: z.string().datetime(),
  outcome: MeetingOutcomeSchema.default('agendada'),
  no_show_reason: NoShowReasonSchema.optional(),
  notes: z.string().optional(),
  google_event_id: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export const CreateMeetingSchema = z.object({
  pipeline_lead_id: z.string().uuid(),
  lead_master_id: z.string().uuid(),
  planned_at: z.string().datetime(),
  notes: z.string().max(500).optional()
});

export const UpdateMeetingOutcomeSchema = z.object({
  outcome: MeetingOutcomeSchema,
  no_show_reason: NoShowReasonSchema.optional(),
  notes: z.string().max(500).optional()
}).refine(data => {
  if (data.outcome === 'no_show' && !data.no_show_reason) {
    return false;
  }
  return true;
}, {
  message: "no_show_reason é obrigatório quando outcome é 'no_show'",
  path: ['no_show_reason']
});

export const ListMeetingsQuerySchema = z.object({
  pipeline_lead_id: z.string().uuid().optional(),
  lead_master_id: z.string().uuid().optional(),
  outcome: MeetingOutcomeSchema.optional(),
  owner_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10)
});

export const MeetingMetricsQuerySchema = z.object({
  pipeline_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  group_by: z.enum(['day', 'week', 'month']).default('month'),
  seller_id: z.string().uuid().optional()
});

// AIDEV-NOTE: Tipos derivados para uso no backend
export type Meeting = z.infer<typeof MeetingSchema>;
export type CreateMeeting = z.infer<typeof CreateMeetingSchema>;
export type UpdateMeetingOutcome = z.infer<typeof UpdateMeetingOutcomeSchema>;
export type ListMeetingsQuery = z.infer<typeof ListMeetingsQuerySchema>;
export type MeetingMetricsQuery = z.infer<typeof MeetingMetricsQuerySchema>;
export type MeetingOutcome = z.infer<typeof MeetingOutcomeSchema>;
export type NoShowReason = z.infer<typeof NoShowReasonSchema>;
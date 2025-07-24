// =====================================================================================
// SCHEMAS ZOD: Sistema de Reuniões
// Autor: Claude (Arquiteto Sênior)
// Descrição: Schemas Zod para validação e type safety do sistema de reuniões
// =====================================================================================

import { z } from 'zod';

// AIDEV-NOTE: Enum outcomes padronizados do sistema (não-customizáveis)
export const MeetingOutcomeSchema = z.enum([
  'agendada',
  'realizada', 
  'no_show',
  'reagendada',
  'cancelada'
]);

// AIDEV-NOTE: Motivos de no-show padronizados (campo core business)
export const NoShowReasonSchema = z.enum([
  'nao_atendeu',
  'esqueceu', 
  'sem_interesse',
  'problema_tecnico',
  'outro'
]);

// AIDEV-NOTE: Schema principal da reunião (completo)
export const MeetingSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  pipeline_lead_id: z.string().uuid(),
  lead_master_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  planned_at: z.string(), // Formato Supabase timestamp
  outcome: MeetingOutcomeSchema.default('agendada'),
  no_show_reason: NoShowReasonSchema.optional(),
  notes: z.string().optional(),
  google_event_id: z.string().optional(), // TODO: Integração futura
  created_at: z.string(), // Formato Supabase timestamp
  updated_at: z.string() // Formato Supabase timestamp
});

// AIDEV-NOTE: Schema para criação de reunião (sem campos auto-gerados)
export const CreateMeetingSchema = z.object({
  pipeline_lead_id: z.string().uuid(),
  lead_master_id: z.string().uuid(),
  planned_at: z.string(), // Formato Supabase timestamp
  notes: z.string().max(500).optional()
});

// AIDEV-NOTE: Schema para atualização de outcome (endpoint PATCH)
export const UpdateMeetingOutcomeSchema = z.object({
  outcome: MeetingOutcomeSchema,
  no_show_reason: NoShowReasonSchema.optional(),
  notes: z.string().max(500).optional()
}).refine(data => {
  // AIDEV-NOTE: Validação: no_show_reason obrigatório quando outcome = 'no_show'
  if (data.outcome === 'no_show' && !data.no_show_reason) {
    return false;
  }
  return true;
}, {
  message: "no_show_reason é obrigatório quando outcome é 'no_show'",
  path: ['no_show_reason']
});

// AIDEV-NOTE: Schema para listagem com filtros
export const ListMeetingsQuerySchema = z.object({
  pipeline_lead_id: z.string().uuid().optional(),
  lead_master_id: z.string().uuid().optional(),
  outcome: MeetingOutcomeSchema.optional(),
  owner_id: z.string().uuid().optional(),
  date_from: z.string().optional(), // Formato Supabase timestamp
  date_to: z.string().optional(), // Formato Supabase timestamp
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10)
});

// AIDEV-NOTE: Schema para métricas de reuniões (relatórios)
export const MeetingMetricsQuerySchema = z.object({
  pipeline_id: z.string().uuid().optional(),
  date_from: z.string().optional(), // Formato Supabase timestamp
  date_to: z.string().optional(), // Formato Supabase timestamp
  group_by: z.enum(['day', 'week', 'month']).default('month'),
  seller_id: z.string().uuid().optional() // Para filtrar por vendedor
});

// AIDEV-NOTE: Schema de response para métricas
export const MeetingMetricsSchema = z.object({
  pipeline_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  scheduled_count: z.number().int().min(0),
  attended_count: z.number().int().min(0),
  no_show_count: z.number().int().min(0),
  rescheduled_count: z.number().int().min(0),
  canceled_count: z.number().int().min(0),
  total_meetings: z.number().int().min(0),
  no_show_rate: z.number().min(0).max(100),
  attend_rate: z.number().min(0).max(100)
});

// AIDEV-NOTE: Schema expandido para reunião com dados relacionados
export const MeetingWithRelationsSchema = MeetingSchema.extend({
  owner_name: z.string(),
  pipeline_lead: z.object({
    id: z.string().uuid(),
    stage_name: z.string().optional(),
    pipeline_name: z.string().optional()
  }).optional(),
  lead_master: z.object({
    id: z.string().uuid(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().email(),
    company: z.string().optional()
  }).optional()
});

// AIDEV-NOTE: Tipos TypeScript derivados (SEMPRE via z.infer)
export type Meeting = z.infer<typeof MeetingSchema>;
export type CreateMeeting = z.infer<typeof CreateMeetingSchema>;
export type UpdateMeetingOutcome = z.infer<typeof UpdateMeetingOutcomeSchema>;
export type ListMeetingsQuery = z.infer<typeof ListMeetingsQuerySchema>;
export type MeetingMetricsQuery = z.infer<typeof MeetingMetricsQuerySchema>;
export type MeetingMetrics = z.infer<typeof MeetingMetricsSchema>;
export type MeetingWithRelations = z.infer<typeof MeetingWithRelationsSchema>;
export type MeetingOutcome = z.infer<typeof MeetingOutcomeSchema>;
export type NoShowReason = z.infer<typeof NoShowReasonSchema>;

// AIDEV-NOTE: Constantes para uso no frontend
export const MEETING_OUTCOMES = MeetingOutcomeSchema.options;
export const NO_SHOW_REASONS = NoShowReasonSchema.options;

// AIDEV-NOTE: Labels em português para UI
export const MEETING_OUTCOME_LABELS: Record<MeetingOutcome, string> = {
  agendada: 'Agendada',
  realizada: 'Realizada',
  no_show: 'No-Show',
  reagendada: 'Reagendada',
  cancelada: 'Cancelada'
};

export const NO_SHOW_REASON_LABELS: Record<NoShowReason, string> = {
  nao_atendeu: 'Não atendeu telefone/chamada',
  esqueceu: 'Esqueceu do compromisso',
  sem_interesse: 'Perdeu interesse',
  problema_tecnico: 'Problema técnico',
  outro: 'Outro motivo'
};

// AIDEV-NOTE: Cores para UI (badges, status)
export const MEETING_OUTCOME_COLORS: Record<MeetingOutcome, string> = {
  agendada: 'blue',
  realizada: 'green',
  no_show: 'red',
  reagendada: 'yellow',
  cancelada: 'gray'
};

// AIDEV-NOTE: Ícones para UI (Lucide icons)
export const MEETING_OUTCOME_ICONS: Record<MeetingOutcome, string> = {
  agendada: 'Calendar',
  realizada: 'CheckCircle',
  no_show: 'XCircle',
  reagendada: 'Clock',
  cancelada: 'Slash'
};
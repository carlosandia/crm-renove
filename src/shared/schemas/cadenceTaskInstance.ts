// =====================================================================================
// SCHEMA: Cadence Task Instance (Nova Arquitetura)
// Autor: Claude (Arquiteto Sênior)
// Data: 2025-01-24
// Descrição: Schema Zod para nova arquitetura de atividades/cadências
// =====================================================================================

import { z } from 'zod';

// ===================================
// ENUMS E CONSTANTES
// ===================================

export const ActivityTypeEnum = z.enum([
  'call',
  'email', 
  'meeting',
  'note',
  'whatsapp',
  'proposal',
  'presentation',
  'demo',
  'followup',
  'visit',
  'task',
  'message',
  'other'
]);

export const ChannelEnum = z.enum([
  'phone',
  'email',
  'whatsapp',
  'sms',
  'video_call',
  'in_person',
  'task',
  'visit',
  'other'
]);

export const TaskStatusEnum = z.enum([
  'pending',
  'completed', 
  'skipped',
  'overdue'
]);

export const OutcomeEnum = z.enum([
  'positive',
  'neutral',
  'negative'
]);

export const UrgencyLevelEnum = z.enum([
  'overdue',
  'due_soon',
  'future', 
  'completed',
  'skipped',
  'unknown'
]);

export const SourceTypeEnum = z.enum([
  'manual',
  'cadence'
]);

// ===================================
// SCHEMA PRINCIPAL
// ===================================

export const CadenceTaskInstanceSchema = z.object({
  // Identificação
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  lead_id: z.string().uuid(),
  pipeline_id: z.string().uuid(),
  stage_id: z.string().uuid(),
  
  // Identificação da cadência
  cadence_step_id: z.string().uuid().nullable(),
  day_offset: z.number().int().min(0).default(0),
  task_order: z.number().int().min(1).default(1),
  
  // Conteúdo
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  activity_type: ActivityTypeEnum,
  channel: ChannelEnum,
  template_content: z.string().nullable(),
  
  // Execução
  status: TaskStatusEnum.default('pending'),
  scheduled_at: z.string().datetime(), // ISO string
  completed_at: z.string().datetime().nullable(),
  executed_by: z.string().uuid().nullable(),
  execution_notes: z.string().nullable(),
  outcome: OutcomeEnum.nullable(),
  duration_minutes: z.number().int().min(1).max(1440).nullable(),
  
  // Metadados
  is_manual_activity: z.boolean().default(false),
  auto_generated: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// ===================================
// SCHEMA DA VIEW COMBINADA
// ===================================

export const CombinedActivityViewSchema = CadenceTaskInstanceSchema.extend({
  // Classificação
  source_type: SourceTypeEnum,
  
  // Dados enriquecidos
  custom_data: z.record(z.any()).nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  lead_name: z.string().nullable(),
  lead_email: z.string().email().nullable(),
  lead_phone: z.string().nullable(),
  lead_company: z.string().nullable(),
  pipeline_name: z.string().nullable(),
  stage_name: z.string().nullable(),
  
  // Campos calculados
  is_overdue: z.boolean(),
  hours_overdue: z.number().nullable(),
  urgency_level: UrgencyLevelEnum
});

// ===================================
// SCHEMAS DE INPUT/OUTPUT
// ===================================

// Schema para criar atividade manual
export const CreateManualActivitySchema = z.object({
  lead_id: z.string().uuid(),
  pipeline_id: z.string().uuid(),
  activity_type: ActivityTypeEnum,
  title: z.string().min(3).max(255),
  description: z.string().max(1000).optional(),
  outcome: OutcomeEnum,
  completed_at: z.string().datetime(),
  duration_minutes: z.number().int().min(1).max(1440).optional()
});

// Schema para completar tarefa
export const CompleteTaskSchema = z.object({
  task_id: z.string().uuid(),
  execution_notes: z.string().max(1000).optional(),
  outcome: OutcomeEnum.optional(),
  duration_minutes: z.number().int().min(1).max(1440).optional()
});

// Schema para reagendar tarefa
export const RescheduleTaskSchema = z.object({
  task_id: z.string().uuid(),
  new_scheduled_at: z.string().datetime(),
  reason: z.string().max(500).optional()
});

// Schema para pular tarefa
export const SkipTaskSchema = z.object({
  task_id: z.string().uuid(),
  reason: z.string().min(1).max(500)
});

// Schema para buscar atividades
export const GetActivitiesQuerySchema = z.object({
  lead_id: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
  status: TaskStatusEnum.optional(),
  activity_type: ActivityTypeEnum.optional(),
  source_type: SourceTypeEnum.optional(),
  include_completed: z.boolean().default(true)
});

// ===================================
// SCHEMA DE ESTATÍSTICAS
// ===================================

export const ActivityStatsSchema = z.object({
  total: z.number().int().min(0),
  pending: z.number().int().min(0),
  completed: z.number().int().min(0),
  overdue: z.number().int().min(0),
  skipped: z.number().int().min(0),
  manual_activities: z.number().int().min(0),
  cadence_tasks: z.number().int().min(0),
  completion_rate: z.number().min(0).max(100), // Percentual
  average_completion_time: z.number().min(0).nullable() // Em horas
});

// ===================================
// EXPORTAR TIPOS
// ===================================

export type CadenceTaskInstance = z.infer<typeof CadenceTaskInstanceSchema>;
export type CombinedActivityView = z.infer<typeof CombinedActivityViewSchema>;
export type CreateManualActivity = z.infer<typeof CreateManualActivitySchema>;
export type CompleteTask = z.infer<typeof CompleteTaskSchema>;
export type RescheduleTask = z.infer<typeof RescheduleTaskSchema>;
export type SkipTask = z.infer<typeof SkipTaskSchema>;
export type GetActivitiesQuery = z.infer<typeof GetActivitiesQuerySchema>;
export type ActivityStats = z.infer<typeof ActivityStatsSchema>;

// Tipos de enum como strings
export type ActivityType = z.infer<typeof ActivityTypeEnum>;
export type Channel = z.infer<typeof ChannelEnum>;
export type TaskStatus = z.infer<typeof TaskStatusEnum>;
export type Outcome = z.infer<typeof OutcomeEnum>;
export type UrgencyLevel = z.infer<typeof UrgencyLevelEnum>;
export type SourceType = z.infer<typeof SourceTypeEnum>;
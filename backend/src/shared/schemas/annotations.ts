// =====================================================================================
// SCHEMAS ZOD: Sistema de Anotações (Backend)
// Autor: Claude (Arquiteto Sênior)
// Descrição: Schemas Zod para validação e type safety do sistema de anotações (backend)
// =====================================================================================

import { z } from 'zod';

// AIDEV-NOTE: Schema principal da anotação (completo) - ATUALIZADO para suportar áudio
export const AnnotationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  pipeline_lead_id: z.string().uuid().optional(),
  lead_master_id: z.string().uuid().optional(),
  owner_id: z.string().uuid(),
  content: z.string().min(1), // HTML do editor rico
  content_plain: z.string().min(1), // Versão texto para busca
  audio_file_url: z.string().url().optional(), // URL do arquivo de áudio no Supabase Storage
  audio_file_name: z.string().optional(), // Nome original do arquivo de áudio
  audio_duration: z.number().positive().optional(), // Duração em segundos
  content_type: z.enum(['text', 'audio', 'mixed']).default('text'), // Tipo de conteúdo
  created_at: z.string(), // Formato Supabase timestamp
  updated_at: z.string() // Formato Supabase timestamp
}).refine(data => {
  // AIDEV-NOTE: Validação: pelo menos um dos IDs de lead deve estar presente
  return data.pipeline_lead_id || data.lead_master_id;
}, {
  message: "Pelo menos pipeline_lead_id ou lead_master_id deve ser fornecido",
  path: ['pipeline_lead_id']
}).refine(data => {
  // AIDEV-NOTE: Validação: se é tipo 'audio', deve ter URL do áudio
  if (data.content_type === 'audio') {
    return data.audio_file_url;
  }
  return true;
}, {
  message: "Anotações de áudio devem ter audio_file_url",
  path: ['audio_file_url']
});

// AIDEV-NOTE: Schema para criação de anotação (sem campos auto-gerados) - ATUALIZADO para suportar áudio
export const CreateAnnotationSchema = z.object({
  pipeline_lead_id: z.string().uuid().optional(),
  lead_master_id: z.string().uuid().optional(),
  content: z.string().max(10000).nullable(), // NULL para áudio puro
  content_plain: z.string().max(5000).nullable(), // NULL para áudio puro
  audio_file_url: z.string().url().optional(), // URL do arquivo de áudio já uploaded
  audio_file_name: z.string().optional(), // Nome original do arquivo
  audio_duration: z.number().positive().optional(), // Duração em segundos
  content_type: z.enum(['text', 'audio', 'mixed']).default('text') // Tipo de conteúdo
}).refine(data => {
  // AIDEV-NOTE: Validação: pelo menos um dos IDs de lead deve estar presente
  return data.pipeline_lead_id || data.lead_master_id;
}, {
  message: "Pelo menos pipeline_lead_id ou lead_master_id deve ser fornecido",
  path: ['pipeline_lead_id']
}).refine(data => {
  // AIDEV-NOTE: Validação: se é tipo 'audio', deve ter URL do áudio
  if (data.content_type === 'audio') {
    return data.audio_file_url;
  }
  return true;
}, {
  message: "Anotações de áudio devem ter audio_file_url",
  path: ['audio_file_url']
});

// AIDEV-NOTE: Schema para atualização de anotação (apenas conteúdo editável) - ATUALIZADO para suportar áudio
export const UpdateAnnotationSchema = z.object({
  content: z.string().max(10000).nullable(),
  content_plain: z.string().max(5000).nullable(),
  audio_file_url: z.string().url().optional(),
  audio_file_name: z.string().optional(),
  audio_duration: z.number().positive().optional(),
  content_type: z.enum(['text', 'audio', 'mixed']).optional()
});

// AIDEV-NOTE: Schema para listagem com filtros
export const ListAnnotationsQuerySchema = z.object({
  pipeline_lead_id: z.string().uuid().optional(),
  lead_master_id: z.string().uuid().optional(),
  owner_id: z.string().uuid().optional(),
  search: z.string().optional(), // Busca no content_plain
  date_from: z.string().optional(), // Formato Supabase timestamp
  date_to: z.string().optional(), // Formato Supabase timestamp
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20) // Max 50 por página para performance
});

// AIDEV-NOTE: Schema expandido para anotação com dados relacionados - ATUALIZADO para suportar áudio
export const AnnotationWithRelationsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  pipeline_lead_id: z.string().uuid().optional(),
  lead_master_id: z.string().uuid().optional(),
  owner_id: z.string().uuid(),
  content: z.string().min(1),
  content_plain: z.string().min(1),
  audio_file_url: z.string().url().optional(), // URL do arquivo de áudio
  audio_file_name: z.string().optional(), // Nome original do arquivo
  audio_duration: z.number().positive().optional(), // Duração em segundos
  content_type: z.enum(['text', 'audio', 'mixed']).default('text'), // Tipo de conteúdo
  created_at: z.string(),
  updated_at: z.string(),
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
}).refine(data => {
  return data.pipeline_lead_id || data.lead_master_id;
}, {
  message: "Pelo menos pipeline_lead_id ou lead_master_id deve ser fornecido",
  path: ['pipeline_lead_id']
});

// AIDEV-NOTE: Schema para métricas de anotações (analytics/dashboard)
export const AnnotationMetricsSchema = z.object({
  tenant_id: z.string().uuid(),
  total_annotations: z.number().int().min(0),
  annotations_this_week: z.number().int().min(0),
  annotations_this_month: z.number().int().min(0),
  most_active_user: z.string().optional(),
  avg_annotations_per_lead: z.number().min(0),
  last_annotation_date: z.string().optional()
});

// AIDEV-NOTE: Tipos TypeScript derivados (SEMPRE via z.infer)
export type Annotation = z.infer<typeof AnnotationSchema>;
export type CreateAnnotation = z.infer<typeof CreateAnnotationSchema>;
export type UpdateAnnotation = z.infer<typeof UpdateAnnotationSchema>;
export type ListAnnotationsQuery = z.infer<typeof ListAnnotationsQuerySchema>;
export type AnnotationWithRelations = z.infer<typeof AnnotationWithRelationsSchema>;
export type AnnotationMetrics = z.infer<typeof AnnotationMetricsSchema>;
// =====================================================================================
// SCHEMAS ZOD: Sistema de Anotações
// Autor: Claude (Arquiteto Sênior)
// Descrição: Schemas Zod para validação e type safety do sistema de anotações
// =====================================================================================

import { z } from 'zod';

// AIDEV-NOTE: Schema base da anotação (ZodObject puro para composição) - ATUALIZADO para suportar áudio
export const BaseAnnotationSchema = z.object({
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
});

// AIDEV-NOTE: Schema principal da anotação (com validações) - ATUALIZADO para suportar áudio
export const AnnotationSchema = BaseAnnotationSchema.refine(data => {
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

// AIDEV-NOTE: Schema para criação de anotação (sem campos auto-gerados) - CORRIGIDO para null em áudio puro
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
  // AIDEV-NOTE: Validação: content obrigatório apenas para tipos text e mixed
  if (data.content_type === 'text' || data.content_type === 'mixed') {
    return data.content && data.content.length > 0;
  }
  return true; // Para 'audio', content pode ser null
}, {
  message: "Anotações de texto devem ter conteúdo",
  path: ['content']
}).refine(data => {
  // AIDEV-NOTE: Validação: se é tipo 'audio', deve ter URL do áudio
  if (data.content_type === 'audio') {
    return data.audio_file_url;
  }
  return true;
}, {
  message: "Anotações de áudio devem ter audio_file_url",
  path: ['audio_file_url']
}).refine(data => {
  // AIDEV-NOTE: Validação: pelo menos content OU áudio deve estar presente
  return (data.content && data.content.length > 0) || data.audio_file_url;
}, {
  message: "Anotação deve ter pelo menos texto ou áudio",
  path: ['content']
});

// AIDEV-NOTE: Schema para atualização de anotação (apenas conteúdo editável) - CORRIGIDO para null em áudio puro
export const UpdateAnnotationSchema = z.object({
  content: z.string().max(10000).nullable(), // NULL para áudio puro
  content_plain: z.string().max(5000).nullable(), // NULL para áudio puro
  audio_file_url: z.string().url().optional(),
  audio_file_name: z.string().optional(),
  audio_duration: z.number().positive().optional(),
  content_type: z.enum(['text', 'audio', 'mixed']).optional()
}).refine(data => {
  // AIDEV-NOTE: Validação: pelo menos content OU áudio deve estar presente
  return (data.content && data.content.length > 0) || data.audio_file_url;
}, {
  message: "Anotação deve ter pelo menos texto ou áudio",
  path: ['content']
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

// AIDEV-NOTE: Schema expandido para anotação com dados relacionados (usando BaseAnnotationSchema para composição)
export const AnnotationWithRelationsSchema = BaseAnnotationSchema.extend({
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

// AIDEV-NOTE: Schema para auto-save (drafts temporários)
export const AnnotationDraftSchema = z.object({
  lead_id: z.string().uuid(), // Pode ser pipeline_lead_id ou lead_master_id
  content: z.string().max(10000),
  content_plain: z.string().max(5000),
  last_saved: z.string() // ISO timestamp do último auto-save
});

// AIDEV-NOTE: Tipos TypeScript derivados (SEMPRE via z.infer)
export type BaseAnnotation = z.infer<typeof BaseAnnotationSchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;
export type CreateAnnotation = z.infer<typeof CreateAnnotationSchema>;
export type UpdateAnnotation = z.infer<typeof UpdateAnnotationSchema>;
export type ListAnnotationsQuery = z.infer<typeof ListAnnotationsQuerySchema>;
export type AnnotationWithRelations = z.infer<typeof AnnotationWithRelationsSchema>;
export type AnnotationMetrics = z.infer<typeof AnnotationMetricsSchema>;
export type AnnotationDraft = z.infer<typeof AnnotationDraftSchema>;

// AIDEV-NOTE: Constantes para validação frontend - ATUALIZADO com limites de áudio
export const ANNOTATION_LIMITS = {
  MAX_CONTENT_HTML: 10000,
  MAX_CONTENT_PLAIN: 5000,
  MAX_ANNOTATIONS_PER_PAGE: 50,
  AUTO_SAVE_INTERVAL: 2000, // 2 segundos
  DEBOUNCE_SEARCH: 300, // 300ms para busca
  MAX_AUDIO_SIZE_MB: 10, // 10MB máximo para arquivo de áudio
  MAX_AUDIO_DURATION_SECONDS: 300, // 5 minutos máximo
  AUDIO_SAMPLE_RATE: 44100, // Sample rate padrão
  SUPPORTED_AUDIO_FORMATS: ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg'] as const
} as const;

// AIDEV-NOTE: Tipos de busca disponíveis
export const ANNOTATION_SEARCH_TYPES = {
  CONTENT: 'content',
  DATE: 'date',
  OWNER: 'owner'
} as const;

// AIDEV-NOTE: Configurações do editor TipTap
export const TIPTAP_EDITOR_CONFIG = {
  placeholder: 'Digite sua anotação aqui...',
  extensions: [
    'bold',
    'italic',
    'underline',
    'bulletList',
    'orderedList',
    'link',
    'paragraph',
    'heading'
  ],
  toolbar: {
    bold: true,
    italic: true,
    underline: true,
    bulletList: true,
    orderedList: true,
    link: true,
    heading: true
  }
} as const;

// AIDEV-NOTE: Cores e ícones para UI
export const ANNOTATION_UI_CONFIG = {
  colors: {
    editor: {
      border: 'border-gray-300',
      focusBorder: 'border-blue-500',
      background: 'bg-white'
    },
    timeline: {
      background: 'bg-gray-50',
      cardBackground: 'bg-white',
      borderColor: 'border-gray-200'
    }
  },
  icons: {
    annotation: 'FileText',
    timeline: 'Clock',
    save: 'Save',
    edit: 'Edit2',
    delete: 'Trash2'
  }
} as const;

// AIDEV-NOTE: Labels em português para UI - ATUALIZADO com labels de áudio
export const ANNOTATION_LABELS = {
  tab: 'Anotações',
  newAnnotation: 'Nova Anotação',
  editAnnotation: 'Editar Anotação',
  deleteAnnotation: 'Excluir Anotação',
  saveAnnotation: 'Salvar Anotação',
  cancelEdit: 'Cancelar',
  searchPlaceholder: 'Buscar nas anotações...',
  emptyState: 'Nenhuma anotação encontrada',
  autoSaving: 'Salvando automaticamente...',
  lastSaved: 'Última alteração',
  // Áudio
  recordAudio: 'Gravar Áudio',
  stopRecording: 'Parar Gravação',
  playAudio: 'Reproduzir Áudio',
  pauseAudio: 'Pausar Áudio',
  audioRecorded: 'Áudio Gravado',
  uploadingAudio: 'Enviando áudio...',
  audioUploaded: 'Áudio enviado com sucesso',
  audioError: 'Erro ao processar áudio',
  audioDuration: 'Duração',
  audioSize: 'Tamanho'
} as const;
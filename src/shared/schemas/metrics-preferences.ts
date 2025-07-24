// =====================================================================================
// SCHEMAS ZOD: Preferências de Métricas
// Autor: Claude (Arquiteto Sênior)
// Descrição: Schemas para validação de preferências de visualização de métricas
// =====================================================================================

import { z } from 'zod';

// AIDEV-NOTE: Enum com todas as métricas disponíveis no sistema
export const MetricIdSchema = z.enum([
  // Métricas de Pipeline
  'unique_leads',
  'opportunities', 
  'conversion_rate',
  'total_sales',
  'ticket_medio',
  // Métricas de Reuniões
  'meetings_scheduled',
  'meetings_attended',
  'meetings_noshow',
  'meetings_noshow_rate'
]);

// AIDEV-NOTE: Categorias das métricas para organização na UI
export const MetricCategorySchema = z.enum(['pipeline', 'meetings']);

// AIDEV-NOTE: Configuração individual de uma métrica
export const MetricConfigSchema = z.object({
  id: MetricIdSchema,
  label: z.string(),
  category: MetricCategorySchema,
  defaultVisible: z.boolean(),
  description: z.string(),
  order: z.number().optional() // Para ordenação customizada futura
});

// AIDEV-NOTE: Schema principal das preferências de métricas do usuário
export const MetricsPreferencesSchema = z.object({
  visible_metrics: z.array(MetricIdSchema).default([
    'unique_leads',
    'opportunities',
    'conversion_rate', 
    'total_sales',
    'ticket_medio',
    'meetings_scheduled',
    'meetings_attended',
    'meetings_noshow',
    'meetings_noshow_rate'
  ]),
  updated_at: z.string().optional() // Formato Supabase timestamp
});

// AIDEV-NOTE: Schema para payload de atualização de preferências
export const UpdateMetricsPreferencesSchema = z.object({
  visible_metrics: z.array(MetricIdSchema)
});

// AIDEV-NOTE: Tipos TypeScript derivados (SEMPRE via z.infer)
export type MetricId = z.infer<typeof MetricIdSchema>;
export type MetricCategory = z.infer<typeof MetricCategorySchema>;
export type MetricConfig = z.infer<typeof MetricConfigSchema>;
export type MetricsPreferences = z.infer<typeof MetricsPreferencesSchema>;
export type UpdateMetricsPreferences = z.infer<typeof UpdateMetricsPreferencesSchema>;

// AIDEV-NOTE: Constantes para uso no frontend
export const METRIC_IDS = MetricIdSchema.options;
export const METRIC_CATEGORIES = MetricCategorySchema.options;

// AIDEV-NOTE: Configuração completa de todas as métricas disponíveis
export const AVAILABLE_METRICS: MetricConfig[] = [
  // === MÉTRICAS DE PIPELINE ===
  {
    id: 'unique_leads',
    label: 'Leads Únicos',
    category: 'pipeline',
    defaultVisible: true,
    description: 'Número total de pessoas/empresas únicas',
    order: 1
  },
  {
    id: 'opportunities',
    label: 'Oportunidades',
    category: 'pipeline', 
    defaultVisible: true,
    description: 'Total de oportunidades de negócio',
    order: 2
  },
  {
    id: 'conversion_rate',
    label: 'Taxa de Conversão',
    category: 'pipeline',
    defaultVisible: true,
    description: 'Percentual de leads que viraram vendas',
    order: 3
  },
  {
    id: 'total_sales',
    label: 'Vendas Realizadas', 
    category: 'pipeline',
    defaultVisible: true,
    description: 'Valor total em vendas fechadas',
    order: 4
  },
  {
    id: 'ticket_medio',
    label: 'Ticket Médio',
    category: 'pipeline',
    defaultVisible: true,
    description: 'Valor médio por venda realizada',
    order: 5
  },
  
  // === MÉTRICAS DE REUNIÕES ===
  {
    id: 'meetings_scheduled',
    label: 'Reuniões Agendadas',
    category: 'meetings',
    defaultVisible: true,
    description: 'Total de reuniões marcadas',
    order: 6
  },
  {
    id: 'meetings_attended',
    label: 'Reuniões Realizadas',
    category: 'meetings',
    defaultVisible: true,
    description: 'Reuniões que aconteceram conforme planejado',
    order: 7
  },
  {
    id: 'meetings_noshow',
    label: 'No-Shows',
    category: 'meetings',
    defaultVisible: true,
    description: 'Reuniões onde o cliente não compareceu',
    order: 8
  },
  {
    id: 'meetings_noshow_rate',
    label: 'Taxa No-Show',
    category: 'meetings',
    defaultVisible: true,
    description: 'Percentual de reuniões perdidas por ausência',
    order: 9
  }
];

// AIDEV-NOTE: Métricas padrão visíveis (todas por padrão)
export const DEFAULT_VISIBLE_METRICS: MetricId[] = AVAILABLE_METRICS
  .filter(metric => metric.defaultVisible)
  .map(metric => metric.id);

// AIDEV-NOTE: Helpers para organização por categoria
export const getMetricsByCategory = (category: MetricCategory): MetricConfig[] => {
  return AVAILABLE_METRICS.filter(metric => metric.category === category);
};

export const getPipelineMetrics = (): MetricConfig[] => {
  return getMetricsByCategory('pipeline');
};

export const getMeetingMetrics = (): MetricConfig[] => {
  return getMetricsByCategory('meetings');
};

// AIDEV-NOTE: Helper para buscar configuração de uma métrica específica
export const getMetricConfig = (metricId: MetricId): MetricConfig | undefined => {
  return AVAILABLE_METRICS.find(metric => metric.id === metricId);
};

// AIDEV-NOTE: Validador para verificar se todas as métricas são válidas
export const validateMetricsSelection = (metrics: string[]): MetricId[] => {
  return metrics.filter(metric => METRIC_IDS.includes(metric as MetricId)) as MetricId[];
};
// =====================================================================================
// SCHEMAS ZOD: Preferências de Métricas por Pipeline
// Autor: Claude (Arquiteto Sênior)
// Descrição: Schemas para persistir configurações de métricas específicas por pipeline
// =====================================================================================

import { z } from 'zod';
import { MetricIdSchema } from './metrics-preferences';

// AIDEV-NOTE: Schema para preferências de métricas específicas por pipeline
export const PipelineMetricsPreferencesSchema = z.object({
  pipeline_id: z.string().uuid(),
  visible_metrics: z.array(MetricIdSchema)
    .min(1, 'Pelo menos uma métrica deve ser selecionada')
    .max(6, 'Máximo de 6 métricas podem ser selecionadas')
    .default([
      'unique_leads',
      'opportunities', 
      'conversion_rate',
      'total_sales',
      'ticket_medio'
    ]),
  metrics_order: z.array(MetricIdSchema).optional(), // Para futura funcionalidade de drag & drop
  updated_at: z.string(),
  created_at: z.string().optional()
});

// AIDEV-NOTE: Schema para payload de atualização (apenas campos modificáveis)
export const UpdatePipelineMetricsPreferencesSchema = z.object({
  visible_metrics: z.array(MetricIdSchema)
    .min(1, 'Pelo menos uma métrica deve ser selecionada') 
    .max(6, 'Máximo de 6 métricas podem ser selecionadas'),
  metrics_order: z.array(MetricIdSchema).optional()
});

// AIDEV-NOTE: Schema para buscar preferências por pipeline
export const GetPipelineMetricsPreferencesSchema = z.object({
  pipeline_id: z.string().uuid(),
  tenant_id: z.string().uuid()
});

// AIDEV-NOTE: Schema para múltiplas preferências (para buscar de várias pipelines)
export const MultiplePipelineMetricsPreferencesSchema = z.object({
  pipeline_ids: z.array(z.string().uuid()).min(1).max(10), // Limite para performance
  tenant_id: z.string().uuid()
});

// AIDEV-NOTE: Schema para resposta da API com metadados
export const PipelineMetricsPreferencesResponseSchema = z.object({
  success: z.boolean(),
  data: PipelineMetricsPreferencesSchema,
  message: z.string().optional(),
  updated_at: z.string()
});

// AIDEV-NOTE: Schema para resposta de múltiplas preferências
export const MultiplePipelineMetricsPreferencesResponseSchema = z.object({
  success: z.boolean(),
  data: z.record(z.string(), PipelineMetricsPreferencesSchema), // pipeline_id -> preferences
  message: z.string().optional(),
  count: z.number()
});

// AIDEV-NOTE: Tipos TypeScript derivados (SEMPRE via z.infer)
export type PipelineMetricsPreferences = z.infer<typeof PipelineMetricsPreferencesSchema>;
export type UpdatePipelineMetricsPreferences = z.infer<typeof UpdatePipelineMetricsPreferencesSchema>;
export type GetPipelineMetricsPreferences = z.infer<typeof GetPipelineMetricsPreferencesSchema>;
export type MultiplePipelineMetricsPreferences = z.infer<typeof MultiplePipelineMetricsPreferencesSchema>;
export type PipelineMetricsPreferencesResponse = z.infer<typeof PipelineMetricsPreferencesResponseSchema>;
export type MultiplePipelineMetricsPreferencesResponse = z.infer<typeof MultiplePipelineMetricsPreferencesResponseSchema>;

// AIDEV-NOTE: Métricas padrão para novas pipelines
export const DEFAULT_PIPELINE_METRICS = [
  'unique_leads',
  'opportunities', 
  'conversion_rate',
  'total_sales',
  'ticket_medio'
] as const;

// AIDEV-NOTE: Limite máximo de métricas selecionáveis
export const MAX_SELECTED_METRICS = 6;
export const MIN_SELECTED_METRICS = 1;

// AIDEV-NOTE: Chaves para React Query
export const pipelineMetricsPreferencesKeys = {
  all: ['pipeline-metrics-preferences'] as const,
  pipeline: (pipelineId: string) => [...pipelineMetricsPreferencesKeys.all, pipelineId] as const,
  tenant: (tenantId: string) => [...pipelineMetricsPreferencesKeys.all, 'tenant', tenantId] as const,
  multiple: (pipelineIds: string[], tenantId: string) => [
    ...pipelineMetricsPreferencesKeys.all, 
    'multiple', 
    pipelineIds.sort().join(','),
    tenantId
  ] as const,
};

// AIDEV-NOTE: Helper para validar se conjunto de métricas é válido
export const validateMetricsSelection = (metrics: string[]): boolean => {
  if (metrics.length < MIN_SELECTED_METRICS || metrics.length > MAX_SELECTED_METRICS) {
    return false;
  }
  
  // Verificar se todas as métricas são válidas
  const validMetrics = UpdatePipelineMetricsPreferencesSchema.shape.visible_metrics.safeParse(metrics);
  return validMetrics.success;
};

// AIDEV-NOTE: Helper para gerar configuração padrão para nova pipeline
export const createDefaultPipelineMetricsPreferences = (
  pipelineId: string
): Omit<PipelineMetricsPreferences, 'created_at'> => ({
  pipeline_id: pipelineId,
  visible_metrics: [...DEFAULT_PIPELINE_METRICS],
  updated_at: new Date().toISOString()
});

// AIDEV-NOTE: Helper para verificar se há mudanças nas preferências
export const hasMetricsPreferencesChanged = (
  current: string[],
  previous: string[]
): boolean => {
  if (current.length !== previous.length) return true;
  
  const sortedCurrent = [...current].sort();
  const sortedPrevious = [...previous].sort();
  
  return !sortedCurrent.every((metric, index) => metric === sortedPrevious[index]);
};

// AIDEV-NOTE: Helper para ordenar métricas por ordem preferida ou padrão
export const sortMetricsByPreference = (
  metrics: string[], 
  preferredOrder?: string[]
): string[] => {
  if (!preferredOrder || preferredOrder.length === 0) {
    return metrics;
  }
  
  // Ordenar pelas preferências, mantendo métricas não ordenadas no final
  const sorted = [...metrics].sort((a, b) => {
    const indexA = preferredOrder.indexOf(a);
    const indexB = preferredOrder.indexOf(b);
    
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    
    return indexA - indexB;
  });
  
  return sorted;
};
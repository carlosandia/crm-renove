/**
 * ✅ QUERY KEYS CENTRALIZADAS - Padrão TanStack Query
 * 
 * Melhores práticas:
 * - Hierarquia consistente
 * - Tipagem forte
 * - Cache hit rate otimizado
 * - Invalidação seletiva
 */

export const QueryKeys = {
  // 🎯 PIPELINES
  pipelines: {
    all: ['pipelines'] as const,
    byTenant: (tenantId: string) => ['pipelines', 'tenant', tenantId] as const,
    byId: (pipelineId: string) => ['pipelines', 'detail', pipelineId] as const,
    archived: (tenantId: string) => ['pipelines', 'archived', tenantId] as const,
    active: (tenantId: string) => ['pipelines', 'active', tenantId] as const,
  },

  // 🎯 PIPELINE LEADS
  pipelineLeads: {
    all: ['pipeline-leads'] as const,
    byPipeline: (pipelineId: string) => ['pipeline-leads', 'pipeline', pipelineId] as const,
    byStage: (pipelineId: string, stageId: string) => ['pipeline-leads', 'pipeline', pipelineId, 'stage', stageId] as const,
    byMember: (memberId: string) => ['pipeline-leads', 'member', memberId] as const,
  },

  // 🎯 PIPELINE METRICS
  pipelineMetrics: {
    all: ['pipeline-metrics'] as const,
    byPipeline: (pipelineId: string) => ['pipeline-metrics', 'pipeline', pipelineId] as const,
    conversion: (pipelineId: string) => ['pipeline-metrics', 'conversion', pipelineId] as const,
    performance: (pipelineId: string, period: string) => ['pipeline-metrics', 'performance', pipelineId, period] as const,
  },

  // 🎯 PIPELINE COMPONENTS
  pipelineStages: {
    all: ['pipeline-stages'] as const,
    byPipeline: (pipelineId: string) => ['pipeline-stages', 'pipeline', pipelineId] as const,
  },

  pipelineMembers: {
    all: ['pipeline-members'] as const,
    byPipeline: (pipelineId: string) => ['pipeline-members', 'pipeline', pipelineId] as const,
    byMember: (memberId: string) => ['pipeline-members', 'member', memberId] as const,
  },

  pipelineCustomFields: {
    all: ['pipeline-custom-fields'] as const,
    byPipeline: (pipelineId: string) => ['pipeline-custom-fields', 'pipeline', pipelineId] as const,
  },

  // 🎯 MEMBERS
  members: {
    all: ['members'] as const,
    byTenant: (tenantId: string) => ['members', 'tenant', tenantId] as const,
    byId: (memberId: string) => ['members', 'detail', memberId] as const,
    active: (tenantId: string) => ['members', 'active', tenantId] as const,
  },

  // 🎯 CACHE VIEWS
  views: {
    pipelineView: ['views', 'pipeline-view'] as const,
    pipelineCache: (pipelineId: string) => ['views', 'pipeline-cache', pipelineId] as const,
    dashboardCache: (tenantId: string) => ['views', 'dashboard-cache', tenantId] as const,
  },

  // 🎯 USER CONTEXT
  user: {
    all: ['user'] as const,
    profile: (userId: string) => ['user', 'profile', userId] as const,
    preferences: (userId: string) => ['user', 'preferences', userId] as const,
    tenant: (tenantId: string) => ['user', 'tenant', tenantId] as const,
  },
} as const;

/**
 * Tipos para type safety
 */
export type QueryKey = typeof QueryKeys[keyof typeof QueryKeys];

/**
 * Utilitários para query keys
 */
export const QueryKeyUtils = {
  /**
   * Verifica se uma query key pertence a um tenant específico
   */
  belongsToTenant: (queryKey: readonly unknown[], tenantId: string): boolean => {
    return queryKey.includes(tenantId);
  },

  /**
   * Verifica se uma query key pertence a uma pipeline específica
   */
  belongsToPipeline: (queryKey: readonly unknown[], pipelineId: string): boolean => {
    return queryKey.includes(pipelineId);
  },

  /**
   * Extrai o tenantId de uma query key se existir
   */
  extractTenantId: (queryKey: readonly unknown[]): string | null => {
    const tenantIndex = queryKey.indexOf('tenant');
    if (tenantIndex !== -1 && tenantIndex + 1 < queryKey.length) {
      return queryKey[tenantIndex + 1] as string;
    }
    return null;
  },

  /**
   * Extrai o pipelineId de uma query key se existir
   */
  extractPipelineId: (queryKey: readonly unknown[]): string | null => {
    const pipelineIndex = queryKey.indexOf('pipeline');
    if (pipelineIndex !== -1 && pipelineIndex + 1 < queryKey.length) {
      return queryKey[pipelineIndex + 1] as string;
    }
    return null;
  },
};

export default QueryKeys;
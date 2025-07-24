/**
 * ENTERPRISE METRICS TYPES
 * Tipos TypeScript para métricas enterprise da pipeline
 * 
 * Espelha a estrutura do backend mas adaptada para o frontend React
 */

// ============================================================================
// INTERFACES PRINCIPAIS
// ============================================================================

export interface EnterpriseMetrics {
  // Métricas principais
  total_unique_leads: number;
  total_opportunities: number;
  conversion_rate: number; // % de leads únicos que geraram pelo menos 1 venda
  total_sales_value: number; // Soma dos valores de oportunidades ganhas
  sales_count: number; // Quantidade de vendas (oportunidades ganhas)
  
  // Métricas derivadas
  average_deal_size: number; // Ticket médio das vendas
  opportunities_per_lead: number; // Média de oportunidades por lead
  
  // Metadados
  period_start: string;
  period_end: string;
  tenant_id: string;
  last_updated: string;
}

export interface DetailedMetrics extends EnterpriseMetrics {
  // Breakdown por pipeline
  by_pipeline: PipelineBreakdown[];
  // Breakdown por etapa
  by_stage: StageBreakdown[];
}

export interface PipelineBreakdown {
  pipeline_id: string;
  pipeline_name: string;
  metrics: Omit<EnterpriseMetrics, 'by_pipeline' | 'by_stage'>;
}

export interface StageBreakdown {
  stage_id: string;
  stage_name: string;
  stage_type: string;
  opportunities_count: number;
  total_value: number;
}

// ============================================================================
// FILTROS E PERÍODOS
// ============================================================================

export interface DateFilter {
  start_date: string; // ISO format: 2025-01-01
  end_date: string;   // ISO format: 2025-01-31
}

export interface MetricsFilters extends DateFilter {
  tenant_id: string;
  pipeline_id?: string;
  created_by?: string;
  assigned_to?: string;
}

export type PredefinedPeriod = 'today' | '7days' | '30days' | '90days' | 'current_month';

export interface PeriodOption {
  key: PredefinedPeriod;
  label: string;
  description: string;
}

// ============================================================================
// RESPONSE TYPES (API)
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    cached: boolean;
    query_time: string;
    filters_applied: Partial<MetricsFilters>;
    breakdown_counts?: {
      pipelines: number;
      stages: number;
    };
  };
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export interface FiltersResponse {
  periods: PeriodOption[];
  pipelines: {
    id: string;
    name: string;
  }[];
  users: {
    id: string;
    name: string;
    email: string;
  }[];
  current_defaults: {
    period: PredefinedPeriod;
    start_date: string;
    end_date: string;
  };
}

// ============================================================================
// HOOK STATE TYPES
// ============================================================================

export interface UseEnterpriseMetricsState {
  // Dados
  metrics: EnterpriseMetrics | null;
  detailedMetrics: DetailedMetrics | null;
  availableFilters: FiltersResponse | null;
  // Estados de carregamento
  isLoading: boolean;
  isLoadingDetailed: boolean;
  isLoadingFilters: boolean;
  // Estados de erro
  error: string | null;
  detailedError: string | null;
  filtersError: string | null;
  // Cache e metadata
  lastUpdated: string | null;
  isCached: boolean;
}

export interface UseEnterpriseMetricsOptions {
  // Filtros iniciais
  initialFilters?: Partial<MetricsFilters>;
  initialPeriod?: PredefinedPeriod;
  
  // Configurações de cache e refetch
  enableAutoRefresh?: boolean;
  autoRefreshInterval?: number; // em milissegundos
  cacheTime?: number; // em milissegundos
  staleTime?: number; // em milissegundos
  
  // Configurações de carregamento
  enabled?: boolean;
  loadDetailed?: boolean;
  loadFilters?: boolean;
  
  // Callbacks
  onSuccess?: (metrics: EnterpriseMetrics) => void;
  onError?: (error: string) => void;
}

// ============================================================================
// HOOK RETURN TYPE
// ============================================================================

export interface UseEnterpriseMetricsReturn extends UseEnterpriseMetricsState {
  // Funções de controle
  refetch: () => Promise<void>;
  refetchDetailed: () => Promise<void>;
  refetchFilters: () => Promise<void>;
  // Funções de filtro
  updateFilters: (filters: Partial<MetricsFilters>) => void;
  setPeriod: (period: PredefinedPeriod) => void;
  setDateRange: (start: string, end: string) => void;
  // Funções de cache
  clearCache: () => void;
  // Utilities
  getCurrentFilters: () => MetricsFilters;
  isDataStale: () => boolean;
  formatValue: (value: number, type: 'currency' | 'percentage' | 'number') => string;
}

// ============================================================================
// COMPARAÇÃO E ANÁLISE
// ============================================================================

export interface MetricsComparison {
  current: EnterpriseMetrics;
  previous: EnterpriseMetrics;
  changes: {
    total_unique_leads: MetricChange;
    total_opportunities: MetricChange;
    conversion_rate: MetricChange;
    total_sales_value: MetricChange;
    sales_count: MetricChange;
    average_deal_size: MetricChange;
  };
}

export interface MetricChange {
  absolute: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

// ============================================================================
// FILTROS AVANÇADOS
// ============================================================================

export interface AdvancedFilters extends MetricsFilters {
  // Filtros por lead source
  lead_sources?: string[];
  
  // Filtros por valor
  min_deal_value?: number;
  max_deal_value?: number;
  
  // Filtros por temperatura
  temperatures?: string[];
  
  // Filtros por tags
  tags?: string[];
}

// ============================================================================
// EXPORT DE TIPOS UTILITÁRIOS
// ============================================================================

export type MetricKey = keyof Pick<EnterpriseMetrics, 
  'total_unique_leads' | 'total_opportunities' | 'conversion_rate' | 
  'total_sales_value' | 'sales_count' | 'average_deal_size' | 'opportunities_per_lead'
>;

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export type CacheStatus = 'fresh' | 'stale' | 'expired' | 'none';

// ============================================================================
// CONSTANTES
// ============================================================================

export const DEFAULT_FILTERS: Partial<MetricsFilters> = {
  // Será preenchido com tenant_id do contexto de auth
};

export const DEFAULT_PERIOD: PredefinedPeriod = 'current_month';

export const PREDEFINED_PERIODS: PeriodOption[] = [
  {
    key: 'today',
    label: 'Hoje',
    description: 'Métricas do dia atual'
  },
  {
    key: '7days',
    label: 'Últimos 7 dias',
    description: 'Métricas dos últimos 7 dias'
  },
  {
    key: '30days',
    label: 'Últimos 30 dias',
    description: 'Métricas dos últimos 30 dias'
  },
  {
    key: '90days',
    label: 'Últimos 90 dias',
    description: 'Métricas dos últimos 90 dias'
  },
  {
    key: 'current_month',
    label: 'Mês atual',
    description: 'Métricas do mês corrente'
  }
];

export const CACHE_CONFIG = {
  BASIC_METRICS: {
    staleTime: 1 * 60 * 1000, // 1 minuto
    cacheTime: 5 * 60 * 1000, // 5 minutos
  },
  DETAILED_METRICS: {
    staleTime: 2 * 60 * 1000, // 2 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  },
  FILTERS: {
    staleTime: 15 * 60 * 1000, // 15 minutos
    cacheTime: 30 * 60 * 1000, // 30 minutos
  }
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export const isValidPeriod = (period: string): period is PredefinedPeriod => {
  return ['today', '7days', '30days', '90days', 'current_month'].includes(period);
};

export const isValidDateFilter = (filter: DateFilter): boolean => {
  const start = new Date(filter.start_date);
  const end = new Date(filter.end_date);
  
  return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
};

export const isEnterpriseMetrics = (obj: any): obj is EnterpriseMetrics => {
  return obj && 
    typeof obj.total_unique_leads === 'number' &&
    typeof obj.total_opportunities === 'number' &&
    typeof obj.conversion_rate === 'number' &&
    typeof obj.total_sales_value === 'number' &&
    typeof obj.sales_count === 'number' &&
    typeof obj.tenant_id === 'string';
};
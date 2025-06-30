/**
 * FASE 3: ANALYTICS & REPORTING SYSTEM
 * useAnalytics Hook - Integração com API de analytics
 * 
 * Hook customizado para gerenciar estado e chamadas da API de analytics
 * Compatível com React Query para cache e sincronização
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// INTERFACES E TIPOS
// ============================================================================

export interface TimeRange {
  start_date: string;
  end_date: string;
  period_type?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  comparison_period?: 'previous' | 'year_ago';
}

export interface DashboardMetrics {
  kpis: {
    total_leads: number;
    qualified_leads: number;
    converted_leads: number;
    conversion_rate: number;
    avg_deal_value: number;
    pipeline_value: number;
    monthly_revenue: number;
    pipeline_velocity: number;
  };
  trends: {
    leads_trend: TrendData[];
    revenue_trend: TrendData[];
    conversion_trend: TrendData[];
    pipeline_trend: TrendData[];
  };
  comparisons: {
    period_over_period: ComparisonData;
    year_over_year: ComparisonData;
  };
  team_performance: TeamMember[];
  recent_activities: ActivitySummary[];
}

export interface TrendData {
  date: string;
  value: number;
  change_percentage?: number;
  target?: number;
}

export interface ComparisonData {
  current_period: number;
  previous_period: number;
  change_percentage: number;
  change_direction: 'up' | 'down' | 'stable';
}

export interface TeamMember {
  user_id: string;
  name: string;
  email: string;
  metrics: {
    leads_created: number;
    deals_closed: number;
    revenue_generated: number;
    conversion_rate: number;
    avg_deal_size: number;
    activities_count: number;
  };
  ranking: number;
  performance_score: number;
}

export interface ActivitySummary {
  type: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  change_percentage: number;
}

export interface ForecastData {
  period: string;
  forecast_type: 'linear' | 'exponential' | 'seasonal';
  predictions: {
    date: string;
    predicted_value: number;
    confidence_level: number;
    confidence_range: {
      min: number;
      max: number;
    };
  }[];
  accuracy_metrics: {
    mae: number;
    mape: number;
    rmse: number;
  };
  historical_data: TrendData[];
}

export interface ConversionFunnel {
  stages: {
    stage_name: string;
    stage_order: number;
    leads_count: number;
    conversion_rate: number;
    avg_time_in_stage: number;
    dropoff_rate: number;
    bottleneck_score: number;
  }[];
  overall_metrics: {
    total_leads: number;
    final_conversions: number;
    overall_conversion_rate: number;
    avg_cycle_time: number;
    biggest_bottleneck: string;
  };
  recommendations: {
    stage: string;
    issue: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

export interface RealTimeMetrics {
  leads_today: number;
  conversions_today: number;
  revenue_today: number;
  pipeline_value: number;
  conversion_rate: number;
  team_activities: number;
  last_updated: string;
}

export interface AnalyticsError {
  message: string;
  error_code: string;
  suggestion?: string;
}

// ============================================
// ✅ CATEGORIA 5.2: TIPOS ESPECÍFICOS PARA PROMISE<ANY>
// ============================================

/**
 * ✅ Tipo para retorno da função exportReport
 */
export interface ExportResult {
  success: boolean;
  download_url?: string;
  file_name: string;
  format: 'csv' | 'pdf' | 'excel';
  file_size: number;
  expires_at: string;
  error?: string;
}

/**
 * ✅ Tipo para retorno da função getLeadSources
 */
export interface LeadSourcesData {
  sources: Array<{
    source_name: string;
    leads_count: number;
    conversion_rate: number;
    avg_deal_value: number;
    total_revenue: number;
    cost_per_lead?: number;
    roi?: number;
    trend: 'up' | 'down' | 'stable';
    change_percentage: number;
  }>;
  summary: {
    total_leads: number;
    top_source: string;
    best_converting_source: string;
    highest_value_source: string;
  };
}

/**
 * ✅ Tipo para retorno da função getPipelineAnalysis
 */
export interface PipelineAnalysisData {
  pipelines: Array<{
    pipeline_id: string;
    pipeline_name: string;
    total_leads: number;
    total_value: number;
    conversion_rate: number;
    avg_cycle_time: number;
    velocity: number;
    health_score: number;
    stages_analysis: Array<{
      stage_id: string;
      stage_name: string;
      leads_count: number;
      avg_time_in_stage: number;
      conversion_rate: number;
      bottleneck_score: number;
    }>;
  }>;
  overall_metrics: {
    total_pipelines: number;
    avg_conversion_rate: number;
    total_pipeline_value: number;
    fastest_pipeline: string;
    slowest_pipeline: string;
  };
}

/**
 * ✅ Tipo para retorno da função getRevenueAnalysis
 */
export interface RevenueAnalysisData {
  periods: Array<{
    period: string;
    revenue: number;
    deals_closed: number;
    avg_deal_size: number;
    target?: number;
    achievement_rate?: number;
  }>;
  revenue_streams: Array<{
    source: string;
    revenue: number;
    percentage: number;
    growth_rate: number;
  }>;
  forecasts: Array<{
    period: string;
    predicted_revenue: number;
    confidence_level: number;
  }>;
  metrics: {
    total_revenue: number;
    growth_rate: number;
    avg_deal_size: number;
    recurring_revenue: number;
    one_time_revenue: number;
  };
}

/**
 * ✅ Tipo para retorno da função getActivitiesAnalysis
 */
export interface ActivitiesAnalysisData {
  activities: Array<{
    activity_type: 'call' | 'email' | 'meeting' | 'task' | 'note';
    count: number;
    success_rate: number;
    avg_response_time: number;
    peak_hours: string[];
    top_performers: string[];
  }>;
  team_activity: Array<{
    user_id: string;
    user_name: string;
    total_activities: number;
    activity_breakdown: Record<string, number>;
    productivity_score: number;
    best_performing_activity: string;
  }>;
  trends: {
    daily_activity: TrendData[];
    weekly_activity: TrendData[];
    activity_effectiveness: TrendData[];
  };
  insights: {
    most_effective_activity: string;
    best_time_for_calls: string;
    highest_response_rate_channel: string;
    recommendations: string[];
  };
}

// ============================================================================
// API SERVICE FUNCTIONS
// ============================================================================

class AnalyticsAPI {
  private baseURL = '/api/analytics';

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  async getDashboard(timeRange?: TimeRange): Promise<DashboardMetrics> {
    const params = new URLSearchParams();
    
    if (timeRange) {
      params.append('start_date', timeRange.start_date);
      params.append('end_date', timeRange.end_date);
      if (timeRange.period_type) params.append('period_type', timeRange.period_type);
      if (timeRange.comparison_period) params.append('comparison_period', timeRange.comparison_period);
    }

    const queryString = params.toString();
    return this.request<DashboardMetrics>(`/dashboard${queryString ? `?${queryString}` : ''}`);
  }

  async getForecast(forecastType: 'linear' | 'exponential' | 'seasonal' = 'linear', periods: number = 6): Promise<ForecastData> {
    const params = new URLSearchParams({
      forecast_type: forecastType,
      periods: periods.toString(),
    });

    return this.request<ForecastData>(`/forecast?${params.toString()}`);
  }

  async getConversionFunnel(timeRange?: TimeRange): Promise<ConversionFunnel> {
    const params = new URLSearchParams();
    
    if (timeRange) {
      params.append('start_date', timeRange.start_date);
      params.append('end_date', timeRange.end_date);
    }

    const queryString = params.toString();
    return this.request<ConversionFunnel>(`/funnel${queryString ? `?${queryString}` : ''}`);
  }

  async getTeamPerformance(timeRange?: TimeRange): Promise<{ team_members: TeamMember[]; summary: any }> {
    const params = new URLSearchParams();
    
    if (timeRange) {
      params.append('start_date', timeRange.start_date);
      params.append('end_date', timeRange.end_date);
    }

    const queryString = params.toString();
    return this.request<{ team_members: TeamMember[]; summary: any }>(`/team${queryString ? `?${queryString}` : ''}`);
  }

  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    return this.request<RealTimeMetrics>('/realtime');
  }

  async exportReport(format: 'csv' | 'pdf' | 'excel', reportType: string, filters?: any): Promise<ExportResult> {
    return this.request('/export', {
      method: 'POST',
      body: JSON.stringify({
        format,
        report_type: reportType,
        filters,
      }),
    });
  }

  async getLeadSources(): Promise<LeadSourcesData> {
    return this.request('/lead-sources');
  }

  async getPipelineAnalysis(): Promise<PipelineAnalysisData> {
    return this.request('/pipeline');
  }

  async getRevenueAnalysis(): Promise<RevenueAnalysisData> {
    return this.request('/revenue');
  }

  async getActivitiesAnalysis(): Promise<ActivitiesAnalysisData> {
    return this.request('/activities');
  }
}

const analyticsAPI = new AnalyticsAPI();

// ============================================================================
// QUERY KEYS
// ============================================================================

export const analyticsKeys = {
  all: ['analytics'] as const,
  dashboard: (timeRange?: TimeRange) => [...analyticsKeys.all, 'dashboard', timeRange] as const,
  forecast: (type: string, periods: number) => [...analyticsKeys.all, 'forecast', type, periods] as const,
  funnel: (timeRange?: TimeRange) => [...analyticsKeys.all, 'funnel', timeRange] as const,
  team: (timeRange?: TimeRange) => [...analyticsKeys.all, 'team', timeRange] as const,
  realtime: () => [...analyticsKeys.all, 'realtime'] as const,
  leadSources: () => [...analyticsKeys.all, 'lead-sources'] as const,
  pipeline: () => [...analyticsKeys.all, 'pipeline'] as const,
  revenue: () => [...analyticsKeys.all, 'revenue'] as const,
  activities: () => [...analyticsKeys.all, 'activities'] as const,
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Hook principal para métricas do dashboard
 */
export const useDashboard = (timeRange?: TimeRange) => {
  return useQuery({
    queryKey: analyticsKeys.dashboard(timeRange),
    queryFn: () => analyticsAPI.getDashboard(timeRange),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos (novo nome para cacheTime)
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

/**
 * Hook para previsões de vendas
 */
export const useForecast = (
  forecastType: 'linear' | 'exponential' | 'seasonal' = 'linear',
  periods: number = 6
) => {
  return useQuery({
    queryKey: analyticsKeys.forecast(forecastType, periods),
    queryFn: () => analyticsAPI.getForecast(forecastType, periods),
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

/**
 * Hook para análise do funil de conversão
 */
export const useConversionFunnel = (timeRange?: TimeRange) => {
  return useQuery({
    queryKey: analyticsKeys.funnel(timeRange),
    queryFn: () => analyticsAPI.getConversionFunnel(timeRange),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

/**
 * Hook para performance da equipe
 */
export const useTeamPerformance = (timeRange?: TimeRange) => {
  return useQuery({
    queryKey: analyticsKeys.team(timeRange),
    queryFn: () => analyticsAPI.getTeamPerformance(timeRange),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

/**
 * Hook para métricas em tempo real
 */
export const useRealTimeMetrics = (enabled: boolean = true, refreshInterval: number = 30000) => {
  return useQuery({
    queryKey: analyticsKeys.realtime(),
    queryFn: () => analyticsAPI.getRealTimeMetrics(),
    enabled,
    refetchInterval: refreshInterval,
    staleTime: 0, // Sempre considerar stale para tempo real
    gcTime: 60 * 1000, // 1 minuto
    refetchOnWindowFocus: true,
    retry: 2,
  });
};

/**
 * Hook para análise de fontes de leads
 */
export const useLeadSources = () => {
  return useQuery({
    queryKey: analyticsKeys.leadSources(),
    queryFn: () => analyticsAPI.getLeadSources(),
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

/**
 * Hook para análise do pipeline
 */
export const usePipelineAnalysis = () => {
  return useQuery({
    queryKey: analyticsKeys.pipeline(),
    queryFn: () => analyticsAPI.getPipelineAnalysis(),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

/**
 * Hook para análise de receita
 */
export const useRevenueAnalysis = () => {
  return useQuery({
    queryKey: analyticsKeys.revenue(),
    queryFn: () => analyticsAPI.getRevenueAnalysis(),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

/**
 * Hook para análise de atividades
 */
export const useActivitiesAnalysis = () => {
  return useQuery({
    queryKey: analyticsKeys.activities(),
    queryFn: () => analyticsAPI.getActivitiesAnalysis(),
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

/**
 * Hook para exportação de relatórios
 */
export const useExportReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ format, reportType, filters }: { 
      format: 'csv' | 'pdf' | 'excel'; 
      reportType: string; 
      filters?: any 
    }) => analyticsAPI.exportReport(format, reportType, filters),
    onSuccess: () => {
      // Invalidar cache se necessário
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    },
  });
};

/**
 * Hook de conveniência para gerenciar período de tempo
 */
export const useTimeRange = (initialRange?: TimeRange) => {
  const [timeRange, setTimeRange] = useState<TimeRange>(
    initialRange || {
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      period_type: 'month',
    }
  );

  const updateTimeRange = useCallback((newRange: Partial<TimeRange>) => {
    setTimeRange(prev => ({ ...prev, ...newRange }));
  }, []);

  const setPresetRange = useCallback((preset: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
    const end = new Date();
    const start = new Date();

    switch (preset) {
      case 'today':
        start.setDate(start.getDate());
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    setTimeRange({
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      period_type: preset === 'today' ? 'day' : preset,
    });
  }, []);

  return {
    timeRange,
    updateTimeRange,
    setPresetRange,
  };
};

/**
 * Hook para invalidar cache de analytics
 */
export const useInvalidateAnalytics = () => {
  const queryClient = useQueryClient();

  return useCallback((keys?: string[]) => {
    if (keys) {
      keys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    } else {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    }
  }, [queryClient]);
};

/**
 * Hook para status de loading geral
 */
export const useAnalyticsStatus = (timeRange?: TimeRange) => {
  const dashboard = useDashboard(timeRange);
  const funnel = useConversionFunnel(timeRange);
  const team = useTeamPerformance(timeRange);

  return {
    isLoading: dashboard.isLoading || funnel.isLoading || team.isLoading,
    isError: dashboard.isError || funnel.isError || team.isError,
    error: dashboard.error || funnel.error || team.error,
    hasData: dashboard.data && funnel.data && team.data,
    refetchAll: () => {
      dashboard.refetch();
      funnel.refetch();
      team.refetch();
    },
  };
};

/**
 * Hook principal que combina todas as funcionalidades de analytics
 */
export const useAnalytics = (options?: {
  timeRange?: TimeRange;
  enableRealTime?: boolean;
  realTimeInterval?: number;
}) => {
  const { timeRange, enableRealTime = false, realTimeInterval = 30000 } = options || {};

  const dashboard = useDashboard(timeRange);
  const forecast = useForecast();
  const funnel = useConversionFunnel(timeRange);
  const team = useTeamPerformance(timeRange);
  const realTime = useRealTimeMetrics(enableRealTime, realTimeInterval);
  const exportReport = useExportReport();

  const invalidateAll = useInvalidateAnalytics();

  return {
    // Data
    dashboard: dashboard.data,
    forecast: forecast.data,
    funnel: funnel.data,
    team: team.data,
    realTime: realTime.data,

    // Loading states
    isLoading: dashboard.isLoading || forecast.isLoading || funnel.isLoading || team.isLoading,
    isError: dashboard.isError || forecast.isError || funnel.isError || team.isError,
    
    // Errors
    error: dashboard.error || forecast.error || funnel.error || team.error,

    // Actions
    refetch: {
      dashboard: dashboard.refetch,
      forecast: forecast.refetch,
      funnel: funnel.refetch,
      team: team.refetch,
      realTime: realTime.refetch,
      all: () => {
        dashboard.refetch();
        forecast.refetch();
        funnel.refetch();
        team.refetch();
        if (enableRealTime) realTime.refetch();
      },
    },

    // Mutations
    exportReport: exportReport.mutate,
    isExporting: exportReport.isPending,
    exportError: exportReport.error,

    // Utilities
    invalidateAll,
  };
}; 
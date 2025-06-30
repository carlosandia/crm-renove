import { useState, useCallback, useEffect } from 'react';

interface AnalyticsOverview {
  totalViews: number;
  totalSubmissions: number;
  conversionRate: number;
  averageTime: number;
  bounceRate: number;
}

interface TrafficData {
  desktop: number;
  mobile: number;
  tablet: number;
}

interface SourceData {
  source: string;
  views: number;
  conversions: number;
  rate: number;
}

interface TimelineData {
  date: string;
  views: number;
  submissions: number;
  conversionRate: number;
}

interface HeatmapData {
  element: string;
  clicks: number;
  percentage: number;
}

interface FunnelData {
  step: string;
  count: number;
  dropoff: number;
}

interface FormAnalyticsData {
  overview: AnalyticsOverview;
  traffic: TrafficData;
  sources: SourceData[];
  timeline: TimelineData[];
  heatmap: HeatmapData[];
  funnel: FunnelData[];
  lastUpdated: string;
}

interface AnalyticsFilters {
  period: '24h' | '7d' | '30d' | '90d';
  dateRange?: {
    start: Date;
    end: Date;
  };
  formType?: string;
  source?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
}

export function useFormAnalytics(formId: string) {
  const [data, setData] = useState<FormAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    period: '7d'
  });

  const fetchAnalytics = useCallback(async (customFilters?: Partial<AnalyticsFilters>) => {
    setIsLoading(true);
    setError(null);

    try {
      const appliedFilters = { ...filters, ...customFilters };
      
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data baseado nos filtros
      const mockData: FormAnalyticsData = {
        overview: {
          totalViews: appliedFilters.period === '24h' ? 245 : 
                     appliedFilters.period === '7d' ? 2847 :
                     appliedFilters.period === '30d' ? 8543 : 25647,
          totalSubmissions: appliedFilters.period === '24h' ? 34 :
                           appliedFilters.period === '7d' ? 423 :
                           appliedFilters.period === '30d' ? 1284 : 3856,
          conversionRate: 14.9,
          averageTime: 45,
          bounceRate: 32.4
        },
        traffic: {
          desktop: 60,
          mobile: 35,
          tablet: 5
        },
        sources: [
          { source: 'Orgânico', views: 1205, conversions: 189, rate: 15.7 },
          { source: 'Redes Sociais', views: 856, conversions: 124, rate: 14.5 },
          { source: 'Email', views: 543, conversions: 78, rate: 14.4 },
          { source: 'Direto', views: 243, conversions: 32, rate: 13.2 }
        ],
        timeline: generateTimelineData(appliedFilters.period),
        heatmap: [
          { element: 'Nome', clicks: 847, percentage: 100 },
          { element: 'E-mail', clicks: 823, percentage: 97.2 },
          { element: 'Telefone', clicks: 756, percentage: 89.3 },
          { element: 'Botão Enviar', clicks: 423, percentage: 49.9 }
        ],
        funnel: [
          { step: 'Visualizações', count: 2847, dropoff: 0 },
          { step: 'Interações', count: 1924, dropoff: 32.4 },
          { step: 'Iniciaram', count: 847, dropoff: 56.0 },
          { step: 'Completaram', count: 423, dropoff: 50.1 }
        ],
        lastUpdated: new Date().toISOString()
      };

      setData(mockData);
      return mockData;

    } catch (err) {
      setError('Erro ao carregar analytics');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [filters, formId]);

  const generateTimelineData = (period: string): TimelineData[] => {
    const days = period === '24h' ? 1 : 
                 period === '7d' ? 7 :
                 period === '30d' ? 30 : 90;

    const data: TimelineData[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const views = Math.floor(Math.random() * 200) + 200;
      const submissions = Math.floor(views * (0.1 + Math.random() * 0.1));
      
      data.push({
        date: date.toISOString().split('T')[0],
        views,
        submissions,
        conversionRate: (submissions / views) * 100
      });
    }

    return data;
  };

  const updateFilters = useCallback((newFilters: Partial<AnalyticsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const refreshData = useCallback(() => {
    return fetchAnalytics();
  }, [fetchAnalytics]);

  const exportData = useCallback((format: 'csv' | 'json' | 'pdf') => {
    if (!data) return null;

    switch (format) {
      case 'csv':
        return generateCSV(data);
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'pdf':
        return generatePDFData(data);
      default:
        return null;
    }
  }, [data]);

  const generateCSV = (analyticsData: FormAnalyticsData): string => {
    const headers = ['Data', 'Visualizações', 'Conversões', 'Taxa de Conversão'];
    const rows = analyticsData.timeline.map(item => [
      item.date,
      item.views.toString(),
      item.submissions.toString(),
      `${item.conversionRate.toFixed(2)}%`
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generatePDFData = (analyticsData: FormAnalyticsData) => {
    return {
      title: `Analytics - Formulário ${formId}`,
      period: filters.period,
      overview: analyticsData.overview,
      traffic: analyticsData.traffic,
      sources: analyticsData.sources,
      generatedAt: new Date().toISOString()
    };
  };

  const getConversionTrend = useCallback((): 'up' | 'down' | 'stable' => {
    if (!data?.timeline || data.timeline.length < 2) return 'stable';

    const recent = data.timeline.slice(-3);
    const older = data.timeline.slice(-6, -3);

    const recentAvg = recent.reduce((acc, item) => acc + item.conversionRate, 0) / recent.length;
    const olderAvg = older.reduce((acc, item) => acc + item.conversionRate, 0) / older.length;

    const difference = recentAvg - olderAvg;
    
    if (difference > 1) return 'up';
    if (difference < -1) return 'down';
    return 'stable';
  }, [data]);

  const getTopSource = useCallback((): SourceData | null => {
    if (!data?.sources || data.sources.length === 0) return null;
    
    return data.sources.reduce((top, source) => 
      source.rate > top.rate ? source : top
    );
  }, [data]);

  const getWorstPerformingStep = useCallback((): FunnelData | null => {
    if (!data?.funnel || data.funnel.length === 0) return null;
    
    return data.funnel.reduce((worst, step) => 
      step.dropoff > worst.dropoff ? step : worst
    );
  }, [data]);

  // Auto-refresh data quando filters mudam
  useEffect(() => {
    fetchAnalytics();
  }, [filters.period]);

  return {
    // Estado
    data,
    isLoading,
    error,
    filters,

    // Ações
    fetchAnalytics,
    updateFilters,
    refreshData,
    exportData,

    // Análises derivadas
    getConversionTrend,
    getTopSource,
    getWorstPerformingStep,

    // Utilitários
    formatNumber: (num: number) => num.toLocaleString('pt-BR'),
    formatPercentage: (num: number) => `${num.toFixed(1)}%`,
    formatDate: (date: string) => new Date(date).toLocaleDateString('pt-BR')
  };
} 
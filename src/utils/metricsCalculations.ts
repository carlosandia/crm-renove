/**
 * METRICS CALCULATIONS UTILITIES
 * Funções utilitárias para cálculos de métricas enterprise
 * 
 * Funções puras para processamento de dados de pipeline
 */

import type {
  EnterpriseMetrics,
  MetricChange,
  MetricsComparison,
  MetricKey,
  PredefinedPeriod
} from '../types/EnterpriseMetrics';

// ============================================================================
// FORMATAÇÃO E DISPLAY
// ============================================================================

/**
 * Formata valores monetários em Real brasileiro
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Formata valores monetários de forma compacta (K, M)
 */
export const formatCurrencyCompact = (value: number): string => {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    // ✅ CORREÇÃO: Usar 1 casa decimal para melhor precisão (7.8K em vez de 8K)
    return `R$ ${(value / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(value);
};

/**
 * Formata percentuais
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Formata números com separadores de milhares
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

/**
 * Formata números de forma compacta (K, M)
 */
export const formatNumberCompact = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return formatNumber(value);
};

// ============================================================================
// CÁLCULOS DE VARIAÇÃO E COMPARAÇÃO
// ============================================================================

/**
 * Calcula mudança entre dois valores
 */
export const calculateChange = (current: number, previous: number): MetricChange => {
  const absolute = current - previous;
  const percentage = previous !== 0 ? (absolute / Math.abs(previous)) * 100 : 0;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(percentage) >= 0.1) { // Considera mudança >= 0.1% como significativa
    trend = percentage > 0 ? 'up' : 'down';
  }
  
  return {
    absolute,
    percentage,
    trend
  };
};

/**
 * Compara duas métricas enterprise
 */
export const compareMetrics = (
  current: EnterpriseMetrics, 
  previous: EnterpriseMetrics
): MetricsComparison => {
  return {
    current,
    previous,
    changes: {
      total_unique_leads: calculateChange(current.total_unique_leads, previous.total_unique_leads),
      total_opportunities: calculateChange(current.total_opportunities, previous.total_opportunities),
      conversion_rate: calculateChange(current.conversion_rate, previous.conversion_rate),
      total_sales_value: calculateChange(current.total_sales_value, previous.total_sales_value),
      sales_count: calculateChange(current.sales_count, previous.sales_count),
      average_deal_size: calculateChange(current.average_deal_size, previous.average_deal_size)
    }
  };
};

// ============================================================================
// ANÁLISE E INSIGHTS
// ============================================================================

/**
 * Calcula score de performance geral (0-100)
 */
export const calculatePerformanceScore = (metrics: EnterpriseMetrics): number => {
  const factors = [
    // Conversion rate (peso 40%)
    Math.min(metrics.conversion_rate / 25, 1) * 40, // Max 25% = 100%
    
    // Opportunities per lead (peso 30%)
    Math.min(metrics.opportunities_per_lead / 2, 1) * 30, // Max 2 = 100%
    
    // Tem vendas (peso 20%)
    metrics.sales_count > 0 ? 20 : 0,
    
    // Volume de leads (peso 10%)
    Math.min(metrics.total_unique_leads / 100, 1) * 10 // Max 100 leads = 100%
  ];
  
  return Math.round(factors.reduce((sum, factor) => sum + factor, 0));
};

/**
 * Identifica tendências nas métricas
 */
export const analyzeTrends = (comparison: MetricsComparison) => {
  const changes = comparison.changes;
  const trends = [];
  
  // Tendências positivas
  if (changes.conversion_rate.trend === 'up') {
    trends.push({
      type: 'positive',
      metric: 'conversion_rate',
      message: `Taxa de conversão aumentou ${formatPercentage(Math.abs(changes.conversion_rate.percentage))}`,
      impact: 'high'
    });
  }
  
  if (changes.total_sales_value.trend === 'up') {
    trends.push({
      type: 'positive',
      metric: 'total_sales_value',
      message: `Receita aumentou ${formatCurrency(changes.total_sales_value.absolute)}`,
      impact: 'high'
    });
  }
  
  if (changes.average_deal_size.trend === 'up') {
    trends.push({
      type: 'positive',
      metric: 'average_deal_size',
      message: `Ticket médio aumentou ${formatCurrency(changes.average_deal_size.absolute)}`,
      impact: 'medium'
    });
  }
  
  // Tendências de atenção
  if (changes.conversion_rate.trend === 'down' && Math.abs(changes.conversion_rate.percentage) > 10) {
    trends.push({
      type: 'warning',
      metric: 'conversion_rate',
      message: `Taxa de conversão caiu ${formatPercentage(Math.abs(changes.conversion_rate.percentage))}`,
      impact: 'high'
    });
  }
  
  if (changes.total_unique_leads.trend === 'down' && Math.abs(changes.total_unique_leads.percentage) > 20) {
    trends.push({
      type: 'warning',
      metric: 'total_unique_leads',
      message: `Volume de leads caiu ${formatPercentage(Math.abs(changes.total_unique_leads.percentage))}`,
      impact: 'medium'
    });
  }
  
  return trends;
};

/**
 * Gera recomendações baseadas nas métricas
 */
export const generateRecommendations = (metrics: EnterpriseMetrics) => {
  const recommendations = [];
  
  // Conversão baixa
  if (metrics.conversion_rate < 10) {
    recommendations.push({
      category: 'conversion',
      priority: 'high',
      title: 'Taxa de conversão baixa',
      description: 'Sua taxa de conversão está abaixo de 10%. Considere melhorar a qualificação de leads.',
      actions: [
        'Implementar lead scoring',
        'Revisar critérios de qualificação',
        'Melhorar follow-up de leads quentes'
      ]
    });
  }
  
  // Poucas oportunidades por lead
  if (metrics.opportunities_per_lead < 1.2) {
    recommendations.push({
      category: 'opportunities',
      priority: 'medium',
      title: 'Baixo volume de oportunidades',
      description: 'Cada lead está gerando poucas oportunidades. Explore cross-sell e upsell.',
      actions: [
        'Identificar necessidades adicionais',
        'Treinar equipe em técnicas de cross-sell',
        'Criar campanhas de reativação'
      ]
    });
  }
  
  // Ticket médio baixo
  if (metrics.average_deal_size > 0 && metrics.average_deal_size < 1000) {
    recommendations.push({
      category: 'ticket',
      priority: 'medium',
      title: 'Ticket médio baixo',
      description: 'O valor médio das vendas pode ser otimizado.',
      actions: [
        'Focar em leads de maior valor',
        'Oferecer pacotes premium',
        'Melhorar técnicas de negociação'
      ]
    });
  }
  
  // Volume baixo de leads
  if (metrics.total_unique_leads < 50) {
    recommendations.push({
      category: 'volume',
      priority: 'high',
      title: 'Volume baixo de leads',
      description: 'Poucos leads únicos no período. Intensifique a geração de leads.',
      actions: [
        'Expandir canais de marketing',
        'Otimizar SEO e conteúdo',
        'Investir em campanhas pagas'
      ]
    });
  }
  
  return recommendations;
};

// ============================================================================
// BENCHMARKS E COMPARAÇÕES
// ============================================================================

/**
 * Benchmarks da indústria (SaaS B2B)
 */
export const INDUSTRY_BENCHMARKS = {
  conversion_rate: {
    poor: 5,
    average: 15,
    good: 25,
    excellent: 35
  },
  opportunities_per_lead: {
    poor: 1.0,
    average: 1.5,
    good: 2.0,
    excellent: 3.0
  },
  cycle_time_days: {
    poor: 90,
    average: 60,
    good: 30,
    excellent: 15
  }
} as const;

/**
 * Compara métricas com benchmarks da indústria
 */
export const compareToBenchmark = (metrics: EnterpriseMetrics) => {
  const getBenchmarkLevel = (value: number, benchmark: { poor: number; average: number; good: number; excellent: number }) => {
    if (value >= benchmark.excellent) return 'excellent';
    if (value >= benchmark.good) return 'good';
    if (value >= benchmark.average) return 'average';
    return 'poor';
  };
  
  return {
    conversion_rate: {
      value: metrics.conversion_rate,
      level: getBenchmarkLevel(metrics.conversion_rate, INDUSTRY_BENCHMARKS.conversion_rate),
      benchmark: INDUSTRY_BENCHMARKS.conversion_rate
    },
    opportunities_per_lead: {
      value: metrics.opportunities_per_lead,
      level: getBenchmarkLevel(metrics.opportunities_per_lead, INDUSTRY_BENCHMARKS.opportunities_per_lead),
      benchmark: INDUSTRY_BENCHMARKS.opportunities_per_lead
    }
  };
};

// ============================================================================
// UTILITÁRIOS DE PERÍODO
// ============================================================================

/**
 * Obtém período anterior para comparação
 */
export const getPreviousPeriod = (period: PredefinedPeriod): { start_date: string; end_date: string } => {
  const now = new Date();
  
  switch (period) {
    case 'today':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start_date: yesterday.toISOString().split('T')[0],
        end_date: yesterday.toISOString().split('T')[0]
      };
      
    case '7days':
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return {
        start_date: twoWeeksAgo.toISOString().split('T')[0],
        end_date: weekAgo.toISOString().split('T')[0]
      };
      
    case '30days':
      const twoMonthsAgo = new Date(now);
      twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return {
        start_date: twoMonthsAgo.toISOString().split('T')[0],
        end_date: monthAgo.toISOString().split('T')[0]
      };
      
    case 'current_month':
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start_date: previousMonth.toISOString().split('T')[0],
        end_date: lastDayPreviousMonth.toISOString().split('T')[0]
      };
      
    default:
      return {
        start_date: now.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0]
      };
  }
};

/**
 * Calcula duração de um período em dias
 */
export const calculatePeriodDuration = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o dia final
};

// ============================================================================
// VALIDAÇÃO E SANITIZAÇÃO
// ============================================================================

/**
 * Valida e sanitiza métricas
 */
export const sanitizeMetrics = (metrics: Partial<EnterpriseMetrics>): EnterpriseMetrics | null => {
  try {
    const sanitized: EnterpriseMetrics = {
      total_unique_leads: Math.max(0, Math.floor(metrics.total_unique_leads || 0)),
      total_opportunities: Math.max(0, Math.floor(metrics.total_opportunities || 0)),
      conversion_rate: Math.max(0, Math.min(100, metrics.conversion_rate || 0)),
      total_sales_value: Math.max(0, metrics.total_sales_value || 0),
      sales_count: Math.max(0, Math.floor(metrics.sales_count || 0)),
      average_deal_size: Math.max(0, metrics.average_deal_size || 0),
      opportunities_per_lead: Math.max(0, metrics.opportunities_per_lead || 0),
      period_start: metrics.period_start || '',
      period_end: metrics.period_end || '',
      tenant_id: metrics.tenant_id || '',
      last_updated: metrics.last_updated || new Date().toISOString()
    };
    
    // Validação básica
    if (!sanitized.tenant_id || !sanitized.period_start || !sanitized.period_end) {
      return null;
    }
    
    return sanitized;
  } catch (error) {
    console.error('❌ [metricsCalculations] Erro ao sanitizar métricas:', error);
    return null;
  }
};

/**
 * Verifica se métricas estão dentro de limites razoáveis
 */
export const validateMetrics = (metrics: EnterpriseMetrics): { isValid: boolean; warnings: string[] } => {
  const warnings: string[] = [];
  
  // Conversão impossível (> 100%)
  if (metrics.conversion_rate > 100) {
    warnings.push('Taxa de conversão superior a 100%');
  }
  
  // Oportunidades por lead muito alto
  if (metrics.opportunities_per_lead > 10) {
    warnings.push('Média de oportunidades por lead muito alta');
  }
  
  // Ticket médio muito baixo ou muito alto
  if (metrics.average_deal_size > 0) {
    if (metrics.average_deal_size < 10) {
      warnings.push('Ticket médio muito baixo');
    }
    if (metrics.average_deal_size > 1_000_000) {
      warnings.push('Ticket médio muito alto');
    }
  }
  
  // Inconsistência entre leads e oportunidades
  if (metrics.total_opportunities > metrics.total_unique_leads * 5) {
    warnings.push('Número de oportunidades inconsistente com leads');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  };
};

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  formatCurrency,
  formatCurrencyCompact,
  formatPercentage,
  formatNumber,
  formatNumberCompact,
  calculateChange,
  compareMetrics,
  calculatePerformanceScore,
  analyzeTrends,
  generateRecommendations,
  compareToBenchmark,
  getPreviousPeriod,
  calculatePeriodDuration,
  sanitizeMetrics,
  validateMetrics,
  INDUSTRY_BENCHMARKS
};
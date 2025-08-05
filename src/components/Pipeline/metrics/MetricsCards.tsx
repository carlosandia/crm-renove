/**
 * METRICS CARDS
 * Componentes de cartões especializados para diferentes tipos de métricas
 * 
 * Cartões reutilizáveis para dashboards e exibição de dados
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Progress } from '../../ui/progress';
import { cn } from '../../../lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Target,
  DollarSign,
  Users,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';

// Types
import type { EnterpriseMetrics, MetricChange } from '../../../types/EnterpriseMetrics';
import { 
  formatCurrency, 
  formatPercentage, 
  formatNumber,
  formatCurrencyCompact,
  formatNumberCompact,
  INDUSTRY_BENCHMARKS
} from '../../../utils/metricsCalculations';

// ============================================================================
// INTERFACES
// ============================================================================

interface BaseMetricCardProps {
  title: string;
  description?: string;
  loading?: boolean;
  error?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  // ✅ FASE 2: Props para ícones semânticos
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
}

interface ConversionMetricCardProps extends BaseMetricCardProps {
  conversionRate: number;
  totalLeads: number;
  convertedLeads: number;
  change?: MetricChange;
  benchmark?: boolean;
}

interface RevenueMetricCardProps extends BaseMetricCardProps {
  totalRevenue: number;
  salesCount: number;
  averageDealSize: number;
  change?: MetricChange;
  target?: number;
  displayField?: 'revenue' | 'average'; // ✅ CORREÇÃO: Permitir escolher qual valor exibir
}

interface VolumeMetricCardProps extends BaseMetricCardProps {
  totalLeads: number;
  totalOpportunities: number;
  opportunitiesPerLead: number;
  change?: MetricChange;
  displayField?: 'leads' | 'opportunities'; // ✅ CORREÇÃO: Permitir escolher qual valor exibir
}

interface PerformanceCardProps extends BaseMetricCardProps {
  score: number;
  breakdown: {
    conversion: number;
    volume: number;
    revenue: number;
    efficiency: number;
  };
}

// ============================================================================
// COMPONENTE BASE OTIMIZADO
// ============================================================================

interface BaseMetricDisplayProps extends BaseMetricCardProps {
  children: React.ReactNode;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  badge?: React.ReactNode;
}

const BaseMetricDisplay: React.FC<BaseMetricDisplayProps> = ({
  title,
  description,
  loading,
  error,
  className,
  size = 'md',
  children,
  icon,
  iconBgColor = 'bg-blue-100',
  iconColor = 'text-blue-600',
  badge
}) => {
  const cardSizes = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  // ✅ ACESSIBILIDADE: IDs únicos para aria-labelledby e aria-describedby
  const titleId = `metric-title-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const descriptionId = description ? `metric-desc-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined;

  if (loading) {
    return (
      <Card 
        className={className}
        role="status"
        aria-live="polite"
        aria-label={`Carregando métricas de ${title}`}
      >
        <CardHeader className={cardSizes[size]}>
          <LoadingSkeleton lines={3} />
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card 
        className={className}
        role="alert"
        aria-live="assertive"
        aria-label={`Erro ao carregar métricas de ${title}: ${error}`}
      >
        <CardHeader className={cardSizes[size]}>
          <ErrorDisplay message={error} />
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card 
      className={cn("transition-all duration-300 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2", className)}
      role="region"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      tabIndex={0}
    >
      <CardHeader className="p-4">
        {/* Layout compacto em uma linha: Ícone + Nome à esquerda, Valor à direita */}
        <div className="flex justify-between items-start gap-3">
          {/* Lado esquerdo - Ícone + Nome */}
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div 
              className={cn("p-2 rounded-lg flex-shrink-0", iconBgColor)}
              role="img"
              aria-hidden="true"
            >
              <div className={cn("w-5 h-5", iconColor)}>
                {icon}
              </div>
            </div>
            <h3 
              id={titleId}
              className="text-sm font-medium text-gray-700 break-words leading-tight"
            >
              {title}
            </h3>
          </div>
          
          {/* Lado direito - Valor da métrica */}
          <div className="flex-shrink-0" role="main" aria-live="polite">
            {children}
          </div>
        </div>

        {/* Descrição invisível para screen readers */}
        {description && (
          <div id={descriptionId} className="sr-only">
            {description}
          </div>
        )}
      </CardHeader>
    </Card>
  );
};

// ============================================================================
// SISTEMA DE CORES SEMÂNTICO
// ============================================================================

interface SemanticColorConfig {
  background: string;
  text: string;
  icon: string;
  border?: string;
}

const SEMANTIC_COLORS = {
  // Estados de performance
  excellent: {
    background: 'bg-emerald-50',
    text: 'text-emerald-800',
    icon: 'text-emerald-600',
    border: 'border-emerald-200'
  },
  good: {
    background: 'bg-blue-50',
    text: 'text-blue-800',
    icon: 'text-blue-600',
    border: 'border-blue-200'
  },
  average: {
    background: 'bg-amber-50',
    text: 'text-amber-800',
    icon: 'text-amber-600',
    border: 'border-amber-200'
  },
  poor: {
    background: 'bg-red-50',
    text: 'text-red-800',
    icon: 'text-red-600',
    border: 'border-red-200'
  },
  
  // Tipos de métricas
  conversion: {
    background: 'bg-blue-100',
    text: 'text-blue-800',
    icon: 'text-blue-600',
    border: 'border-blue-200'
  },
  revenue: {
    background: 'bg-green-100',
    text: 'text-green-800',
    icon: 'text-green-600',
    border: 'border-green-200'
  },
  volume: {
    background: 'bg-purple-100',
    text: 'text-purple-800',
    icon: 'text-purple-600',
    border: 'border-purple-200'
  },
  performance: {
    background: 'bg-indigo-100',
    text: 'text-indigo-800',
    icon: 'text-indigo-600',
    border: 'border-indigo-200'
  },
  meeting: {
    background: 'bg-orange-100',
    text: 'text-orange-800',
    icon: 'text-orange-600',
    border: 'border-orange-200'
  },
  
  // Estados de tendência
  positive: {
    background: 'bg-emerald-50',
    text: 'text-emerald-700',
    icon: 'text-emerald-600',
    border: 'border-emerald-200'
  },
  negative: {
    background: 'bg-red-50',
    text: 'text-red-700',
    icon: 'text-red-600',
    border: 'border-red-200'
  },
  neutral: {
    background: 'bg-gray-50',
    text: 'text-gray-700',
    icon: 'text-gray-600',
    border: 'border-gray-200'
  }
} as const;

type SemanticColorKey = keyof typeof SEMANTIC_COLORS;

const getSemanticColors = (key: SemanticColorKey): SemanticColorConfig => {
  return SEMANTIC_COLORS[key] || SEMANTIC_COLORS.neutral;
};

// Função para determinar nível de performance baseado em valor e tipo
const getPerformanceLevel = (value: number, type: 'percentage' | 'ratio' | 'count'): SemanticColorKey => {
  switch (type) {
    case 'percentage':
      if (value >= 80) return 'excellent';
      if (value >= 60) return 'good';
      if (value >= 40) return 'average';
      return 'poor';
    
    case 'ratio':
      if (value >= 2.0) return 'excellent';
      if (value >= 1.5) return 'good';
      if (value >= 1.0) return 'average';
      return 'poor';
    
    case 'count':
      if (value >= 100) return 'excellent';
      if (value >= 50) return 'good';
      if (value >= 20) return 'average';
      return 'poor';
    
    default:
      return 'neutral';
  }
};

// ============================================================================
// COMPONENTES UTILITÁRIOS
// ============================================================================

const TrendIcon: React.FC<{ trend: 'up' | 'down' | 'stable'; size?: number }> = ({ 
  trend, 
  size = 16 
}) => {
  const iconProps = { 
    size, 
    className: cn(
      trend === 'up' ? 'text-green-600' :
      trend === 'down' ? 'text-red-600' : 
      'text-gray-600'
    ),
    'aria-hidden': 'true' as const
  };

  // ✅ ACESSIBILIDADE: Labels descritivos para screen readers
  const ariaLabel = {
    up: 'Tendência de alta',
    down: 'Tendência de baixa', 
    stable: 'Tendência estável'
  }[trend];

  return (
    <span role="img" aria-label={ariaLabel} title={ariaLabel}>
      {trend === 'up' && <ArrowUpRight {...iconProps} />}
      {trend === 'down' && <ArrowDownRight {...iconProps} />}
      {trend === 'stable' && <Minus {...iconProps} />}
    </span>
  );
};

const LoadingSkeleton: React.FC<{ lines?: number }> = ({ lines = 2 }) => (
  <div 
    className="space-y-2"
    role="status" 
    aria-label="Carregando dados da métrica"
    aria-live="polite"
  >
    {Array.from({ length: lines }).map((_, i) => (
      <div 
        key={i} 
        className="h-4 bg-gray-200 rounded animate-pulse"
        style={{ width: `${80 - i * 10}%` }}
        aria-hidden="true"
      />
    ))}
    <span className="sr-only">Carregando...</span>
  </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
  <div 
    className="flex items-center space-x-2 text-red-600"
    role="alert"
    aria-live="assertive"
  >
    <AlertTriangle 
      className="w-4 h-4 flex-shrink-0" 
      aria-hidden="true"
      role="img"
    />
    <span className="text-sm" aria-label={`Erro: ${message}`}>
      {message}
    </span>
  </div>
);

// ============================================================================
// CONVERSION METRIC CARD
// ============================================================================

export const ConversionMetricCard: React.FC<ConversionMetricCardProps> = ({
  title,
  description,
  conversionRate,
  totalLeads,
  convertedLeads,
  change,
  benchmark = true,
  loading,
  error,
  className,
  size = 'md',
  // ✅ FASE 2: Props de ícone semântico
  icon,
  iconBgColor,
  iconColor
}) => {
  // Determinar nível de performance usando sistema semântico
  const performanceLevel = getPerformanceLevel(conversionRate, 'percentage');
  const conversionColors = getSemanticColors('conversion');

  return (
    <BaseMetricDisplay
      title={title}
      description={`Taxa de conversão de ${formatPercentage(conversionRate)}, classificada como ${performanceLevel === 'excellent' ? 'excelente' : performanceLevel === 'good' ? 'boa' : performanceLevel === 'average' ? 'regular' : 'baixa'}`}
      loading={loading}
      error={error}
      className={className}
      size={size}
      icon={icon || <Target className="w-5 h-5" />} // ✅ FASE 2: Usar ícone passado ou fallback
      iconBgColor={iconBgColor || conversionColors.background} // ✅ FASE 2: Usar cor passada ou fallback
      iconColor={iconColor || conversionColors.icon} // ✅ FASE 2: Usar cor passada ou fallback
      badge={null}
    >
      {/* Apenas o valor da métrica - layout compacto */}
      <div 
        className="text-xl font-bold text-gray-900" // ✅ FASE 3: Reduzido de text-2xl para text-xl
        aria-label={`Taxa de conversão: ${formatPercentage(conversionRate)}`}
        role="text"
      >
        {formatPercentage(conversionRate)}
      </div>
    </BaseMetricDisplay>
  );
};

// ============================================================================
// REVENUE METRIC CARD
// ============================================================================

export const RevenueMetricCard: React.FC<RevenueMetricCardProps> = ({
  title,
  description,
  totalRevenue,
  salesCount,
  averageDealSize,
  change,
  target,
  loading,
  error,
  className,
  size = 'md',
  displayField = 'revenue', // ✅ CORREÇÃO: Campo padrão
  // ✅ FASE 2: Props de ícone semântico
  icon,
  iconBgColor,
  iconColor
}) => {
  const revenueColors = getSemanticColors('revenue');

  // ✅ CORREÇÃO: Determinar qual valor e label usar baseado no displayField
  const displayValue = displayField === 'average' ? averageDealSize : totalRevenue;
  const displayLabel = displayField === 'average' ? 'ticket médio' : 'receita total';
  const ariaLabel = `${displayLabel}: ${formatCurrencyCompact(displayValue)}`;

  return (
    <BaseMetricDisplay
      title={title}
      description={`Receita total de ${formatCurrencyCompact(totalRevenue)} com ${formatNumber(salesCount)} vendas`}
      loading={loading}
      error={error}
      className={className}
      size={size}
      icon={icon || <DollarSign className="w-5 h-5" />} // ✅ FASE 2: Usar ícone passado ou fallback
      iconBgColor={iconBgColor || revenueColors.background} // ✅ FASE 2: Usar cor passada ou fallback
      iconColor={iconColor || revenueColors.icon} // ✅ FASE 2: Usar cor passada ou fallback
      badge={null}
    >
      {/* ✅ CORREÇÃO: Mostrar valor baseado no displayField */}
      <div 
        className="text-xl font-bold text-gray-900" // ✅ FASE 3: Reduzido de text-2xl para text-xl
        aria-label={ariaLabel}
        role="text"
      >
        {formatCurrencyCompact(displayValue)}
      </div>
    </BaseMetricDisplay>
  );
};

// ============================================================================
// VOLUME METRIC CARD
// ============================================================================

export const VolumeMetricCard: React.FC<VolumeMetricCardProps> = ({
  title,
  description,
  totalLeads,
  totalOpportunities,
  opportunitiesPerLead,
  change,
  loading,
  error,
  className,
  size = 'md',
  displayField = 'leads', // ✅ CORREÇÃO: Campo padrão
  // ✅ FASE 2: Props de ícone semântico
  icon,
  iconBgColor,
  iconColor
}) => {
  const volumeColors = getSemanticColors('volume');

  // ✅ CORREÇÃO: Determinar qual valor e label usar baseado no displayField
  const displayValue = displayField === 'opportunities' ? totalOpportunities : totalLeads;
  const displayLabel = displayField === 'opportunities' ? 'oportunidades' : 'leads';
  const ariaLabel = `Total de ${displayLabel}: ${formatNumberCompact(displayValue)}`;

  return (
    <BaseMetricDisplay
      title={title}
      description={`${formatNumberCompact(totalLeads)} leads com ${formatNumber(totalOpportunities)} oportunidades ativas`}
      loading={loading}
      error={error}
      className={className}
      size={size}
      icon={icon || <Users className="w-5 h-5" />} // ✅ FASE 2: Usar ícone passado ou fallback
      iconBgColor={iconBgColor || volumeColors.background} // ✅ FASE 2: Usar cor passada ou fallback
      iconColor={iconColor || volumeColors.icon} // ✅ FASE 2: Usar cor passada ou fallback
      badge={null}
    >
      {/* ✅ CORREÇÃO: Mostrar valor baseado no displayField */}
      <div 
        className="text-xl font-bold text-gray-900" // ✅ FASE 3: Reduzido de text-2xl para text-xl
        aria-label={ariaLabel}
        role="text"
      >
        {formatNumberCompact(displayValue)}
      </div>
    </BaseMetricDisplay>
  );
};

// ============================================================================
// PERFORMANCE SCORE CARD
// ============================================================================

export const PerformanceCard: React.FC<PerformanceCardProps> = ({
  title,
  description,
  score,
  breakdown,
  loading,
  error,
  className,
  size = 'md'
}) => {
  const performanceColors = getSemanticColors('performance');

  return (
    <BaseMetricDisplay
      title={title}
      description={`Score de performance: ${score}/100 pontos`}
      loading={loading}
      error={error}
      className={className}
      size={size}
      icon={<BarChart3 className="w-5 h-5" />}
      iconBgColor={performanceColors.background}
      iconColor={performanceColors.icon}
      badge={null}
    >
      {/* Apenas o valor da métrica - layout compacto */}
      <div 
        className="text-xl font-bold text-gray-900" // ✅ FASE 3: Reduzido de text-2xl para text-xl
        aria-label={`Score de performance: ${score} de 100 pontos`}
        role="text"
      >
        {score}<span className="text-base text-gray-500">/100</span> {/* ✅ FASE 3: Ajustado text-lg para text-base */}
      </div>
    </BaseMetricDisplay>
  );
};

// ============================================================================
// QUICK METRICS GRID
// ============================================================================

interface QuickMetricsGridProps {
  metrics: EnterpriseMetrics;
  loading?: boolean;
  className?: string;
}

export const QuickMetricsGrid: React.FC<QuickMetricsGridProps> = ({
  metrics,
  loading,
  className
}) => {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      <ConversionMetricCard
        title="Taxa de Conversão"
        conversionRate={metrics.conversion_rate}
        totalLeads={metrics.total_unique_leads}
        convertedLeads={metrics.sales_count}
        loading={loading}
        size="sm"
      />
      
      <RevenueMetricCard
        title="Receita Total"
        totalRevenue={metrics.total_sales_value}
        salesCount={metrics.sales_count}
        averageDealSize={metrics.average_deal_size}
        loading={loading}
        size="sm"
      />
      
      <VolumeMetricCard
        title="Volume de Leads"
        totalLeads={metrics.total_unique_leads}
        totalOpportunities={metrics.total_opportunities}
        opportunitiesPerLead={metrics.opportunities_per_lead}
        loading={loading}
        size="sm"
      />
      
      <PerformanceCard
        title="Score Performance"
        score={85} // Calcular dinamicamente
        breakdown={{
          conversion: 20,
          volume: 18,
          revenue: 22,
          efficiency: 25
        }}
        loading={loading}
        size="sm"
      />
    </div>
  );
};

export default {
  ConversionMetricCard,
  RevenueMetricCard,
  VolumeMetricCard,
  PerformanceCard,
  QuickMetricsGrid
};
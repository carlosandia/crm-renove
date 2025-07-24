/**
 * ENTERPRISE METRICS HEADER
 * Componente principal de métricas enterprise para o header do pipeline
 * 
 * Substitui PipelineStats com métricas mais avançadas e real-time
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { BlurFade } from '../../ui/blur-fade';
import { cn } from '../../../lib/utils';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Target, 
  Award,
  BarChart3,
  RefreshCw,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';

// Hooks e types
import { useEnterpriseMetrics } from '../../../hooks/useEnterpriseMetrics';
import { useAuth } from '../../../contexts/AuthContext';
import type { PredefinedPeriod, MetricKey } from '../../../types/EnterpriseMetrics';
import { 
  formatCurrency, 
  formatPercentage, 
  formatNumber,
  calculatePerformanceScore,
  compareToBenchmark,
  INDUSTRY_BENCHMARKS
} from '../../../utils/metricsCalculations';

// ============================================================================
// INTERFACES
// ============================================================================

interface EnterpriseMetricsHeaderProps {
  // Props do pipeline atual
  selectedPipelineId?: string;
  
  // Configurações de display
  compact?: boolean;
  showComparison?: boolean;
  showBenchmarks?: boolean;
  
  // Callbacks
  onPeriodChange?: (period: PredefinedPeriod) => void;
  onRefresh?: () => void;
  
  // Styling
  className?: string;
}

interface MetricCardProps {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'stable';
  };
  benchmark?: {
    level: 'poor' | 'average' | 'good' | 'excellent';
    description: string;
  };
  iconColor: string;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
  loading?: boolean;
}

// ============================================================================
// COMPONENTE METRIC CARD
// ============================================================================

const MetricCard: React.FC<MetricCardProps> = ({
  icon: IconComponent,
  label,
  value,
  change,
  benchmark,
  iconColor,
  bgColor,
  gradientFrom,
  gradientTo,
  loading = false
}) => {
  const getBenchmarkColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'average': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getChangeIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-600" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-red-600" />;
      default: return <Activity className="w-3 h-3 text-gray-600" />;
    }
  };

  return (
    <Card className="group cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-1 border-border/50 hover:border-primary/30 relative overflow-hidden">
      {/* Gradient background on hover */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300",
        "bg-gradient-to-br", gradientFrom, gradientTo
      )} />
      
      <CardContent className="p-2 relative z-10">
        <div className="flex items-center space-x-2 w-full">
          {/* Icon compacto */}
          <div className={cn(
            "p-1.5 rounded transition-all duration-300 group-hover:scale-110 flex-shrink-0",
            bgColor
          )}>
            <IconComponent className={cn("w-4 h-4", iconColor)} />
          </div>
          
          {/* Conteúdo principal linha única */}
          <div className="flex items-center space-x-1.5 flex-1 min-w-0">
            <span className="text-xs font-medium text-gray-600 truncate">
              {label}
            </span>
            <span className="text-gray-400">•</span>
            <span className={cn(
              "text-sm font-bold transition-colors duration-300",
              loading ? "text-muted-foreground animate-pulse" : "text-foreground group-hover:text-primary"
            )}>
              {loading ? '...' : value}
            </span>
            
            {/* Info adicional inline */}
            {benchmark && !loading && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-xs text-gray-600 truncate">
                  {benchmark.description}
                </span>
              </>
            )}
          </div>
          
          {/* Indicadores finais */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Change indicator */}
            {change && !loading && (
              <>
                {getChangeIcon(change.trend)}
                <span className={cn(
                  "text-xs font-medium",
                  change.trend === 'up' ? 'text-green-600' : 
                  change.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                )}>
                  {formatPercentage(Math.abs(change.value))}
                </span>
              </>
            )}
            
            {/* Benchmark badge */}
            {benchmark && !loading && (
              <Badge className={cn("text-xs", getBenchmarkColor(benchmark.level))}>
                {benchmark.level}
              </Badge>
            )}
          </div>
        </div>

        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </CardContent>
    </Card>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const EnterpriseMetricsHeader: React.FC<EnterpriseMetricsHeaderProps> = ({
  selectedPipelineId,
  compact = false,
  showComparison = true,
  showBenchmarks = true,
  onPeriodChange,
  onRefresh,
  className
}) => {
  
  // ============================================================================
  // HOOKS E ESTADO
  // ============================================================================
  
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<PredefinedPeriod>('current_month');
  const [isExpanded, setIsExpanded] = useState(!compact);
  
  // Hook de métricas
  const {
    metrics,
    isLoading,
    error,
    refetch,
    setPeriod,
    formatValue,
    isDataStale
  } = useEnterpriseMetrics({
    initialPeriod: selectedPeriod,
    enableAutoRefresh: true,
    autoRefreshInterval: 2 * 60 * 1000, // 2 minutos
    initialFilters: selectedPipelineId ? { pipeline_id: selectedPipelineId } : {}
  });
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handlePeriodChange = (period: PredefinedPeriod) => {
    setSelectedPeriod(period);
    setPeriod(period);
    onPeriodChange?.(period);
  };
  
  const handleRefresh = async () => {
    await refetch();
    onRefresh?.();
  };
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  // ============================================================================
  // CÁLCULOS E DADOS
  // ============================================================================
  
  const performanceScore = useMemo(() => {
    return metrics ? calculatePerformanceScore(metrics) : 0;
  }, [metrics]);
  
  const benchmarkComparison = useMemo(() => {
    return metrics ? compareToBenchmark(metrics) : null;
  }, [metrics]);
  
  const metricCards = useMemo(() => {
    if (!metrics) return [];
    
    return [
      {
        icon: Users,
        label: 'Leads Únicos',
        value: formatNumber(metrics.total_unique_leads),
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-100',
        gradientFrom: 'from-blue-400',
        gradientTo: 'to-blue-600',
        benchmark: showBenchmarks ? {
          level: metrics.total_unique_leads > 50 ? 'good' : 'average' as const,
          description: 'Volume'
        } : undefined
      },
      {
        icon: Target,
        label: 'Oportunidades',
        value: formatNumber(metrics.total_opportunities),
        iconColor: 'text-purple-600',
        bgColor: 'bg-purple-100',
        gradientFrom: 'from-purple-400',
        gradientTo: 'to-purple-600',
        benchmark: showBenchmarks ? {
          level: benchmarkComparison?.opportunities_per_lead.level || 'average',
          description: `${metrics.opportunities_per_lead.toFixed(1)} por lead`
        } : undefined
      },
      {
        icon: TrendingUp,
        label: 'Taxa de Conversão',
        value: formatPercentage(metrics.conversion_rate),
        iconColor: 'text-green-600',
        bgColor: 'bg-green-100',
        gradientFrom: 'from-green-400',
        gradientTo: 'to-green-600',
        benchmark: showBenchmarks ? {
          level: benchmarkComparison?.conversion_rate.level || 'average',
          description: 'vs. mercado'
        } : undefined
      },
      {
        icon: DollarSign,
        label: 'Receita Total',
        value: formatCurrency(metrics.total_sales_value),
        iconColor: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
        gradientFrom: 'from-emerald-400',
        gradientTo: 'to-emerald-600'
      },
      {
        icon: Award,
        label: 'Vendas Fechadas',
        value: formatNumber(metrics.sales_count),
        iconColor: 'text-orange-600',
        bgColor: 'bg-orange-100',
        gradientFrom: 'from-orange-400',
        gradientTo: 'to-orange-600'
      },
      {
        icon: BarChart3,
        label: 'Ticket Médio',
        value: metrics.sales_count > 0 ? formatCurrency(metrics.average_deal_size) : 'R$ 0',
        iconColor: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
        gradientFrom: 'from-indigo-400',
        gradientTo: 'to-indigo-600'
      }
    ];
  }, [metrics, benchmarkComparison, showBenchmarks]);
  
  // ============================================================================
  // RENDER DE ERRO
  // ============================================================================
  
  if (error) {
    return (
      <div className={cn("p-4 border border-red-200 bg-red-50 rounded-lg", className)}>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Erro ao carregar métricas</h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleRefresh}
            className="ml-auto"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }
  
  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================
  
  return (
    <div className={cn("enterprise-metrics-header", className)}>
      {/* Header com controles */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Métricas Enterprise
          </h2>
          
          {/* Performance Score */}
          {metrics && (
            <Badge className={cn(
              "text-xs font-medium",
              performanceScore >= 80 ? 'bg-green-100 text-green-800' :
              performanceScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            )}>
              Score: {performanceScore}/100
            </Badge>
          )}
          
          {/* Data staleness indicator */}
          {isDataStale() && (
            <Badge variant="outline" className="text-xs text-yellow-600">
              <Activity className="w-3 h-3 mr-1" />
              Atualizando...
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Period selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value as PredefinedPeriod)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Hoje</option>
            <option value="7days">7 dias</option>
            <option value="30days">30 dias</option>
            <option value="90days">90 dias</option>
            <option value="current_month">Mês atual</option>
          </select>
          
          {/* Refresh button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-1"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          
          {/* Expand/Collapse toggle */}
          {compact && (
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleExpanded}
              className="flex items-center space-x-1"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Métricas principais */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {metricCards.map((card, index) => (
            <BlurFade key={index} delay={index * 0.05} inView>
              <MetricCard
                {...card}
                loading={isLoading}
              />
            </BlurFade>
          ))}
        </div>
      )}
      
      {/* Resumo compacto (quando collapsed) */}
      {!isExpanded && metrics && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-6">
            <div className="text-sm">
              <span className="text-gray-600">Leads:</span>{' '}
              <span className="font-semibold">{formatNumber(metrics.total_unique_leads)}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Conversão:</span>{' '}
              <span className="font-semibold">{formatPercentage(metrics.conversion_rate)}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Receita:</span>{' '}
              <span className="font-semibold">{formatCurrency(metrics.total_sales_value)}</span>
            </div>
          </div>
          <Badge className={cn(
            "text-xs",
            performanceScore >= 80 ? 'bg-green-100 text-green-800' :
            performanceScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          )}>
            {performanceScore}/100
          </Badge>
        </div>
      )}
    </div>
  );
};

export default EnterpriseMetricsHeader;
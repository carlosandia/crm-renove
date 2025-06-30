/**
 * FASE 3: ANALYTICS & REPORTING SYSTEM
 * Conversion Funnel - Análise detalhada do funil de conversão
 * 
 * Componente enterprise-grade para análise de funil comparável ao:
 * - HubSpot Funnel Analysis
 * - Salesforce Pipeline Analytics
 * - Pipedrive Pipeline Insights
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  ArrowDown,
  ArrowRight,
  Lightbulb,
  Target,
  BarChart3,
  PieChart,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { FunnelChart, Funnel, LabelList, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { useConversionFunnel, useTimeRange } from '@/hooks/useAnalytics';
import { formatNumber, formatPercentage, cn } from '@/lib/utils';

// ============================================================================
// INTERFACES E TIPOS
// ============================================================================

/**
 * ✅ SUBSTITUIÇÃO: stages: any[] → stages: FunnelStage[]
 */
export interface FunnelStage {
  stage_name: string;
  stage_order: number;
  leads_count: number;
  conversion_rate: number;
  avg_time_in_stage: number;
  dropoff_rate: number;
  bottleneck_score: number;
}

interface FunnelStageProps {
  stage: FunnelStage; // ✅ Usando a interface específica
  isLast: boolean;
  totalLeads: number;
  previousStageCount?: number;
}

interface RecommendationCardProps {
  recommendation: {
    stage: string;
    issue: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  };
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const FunnelStage: React.FC<FunnelStageProps> = ({ 
  stage, 
  isLast, 
  totalLeads, 
  previousStageCount 
}) => {
  const dropoffCount = previousStageCount ? previousStageCount - stage.leads_count : 0;
  const overallConversionRate = (stage.leads_count / totalLeads) * 100;
  
  const getBottleneckColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getBottleneckIcon = (score: number) => {
    if (score >= 70) return <AlertTriangle className="h-4 w-4" />;
    if (score >= 50) return <Clock className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <div className="relative">
      {/* Stage Card */}
      <Card className={cn(
        "transition-all duration-200 hover:shadow-md",
        stage.bottleneck_score >= 70 && "border-red-200 bg-red-50/30"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold capitalize">
              {stage.stage_name}
            </CardTitle>
            <Badge 
              variant="outline" 
              className={getBottleneckColor(stage.bottleneck_score)}
            >
              {getBottleneckIcon(stage.bottleneck_score)}
              <span className="ml-1">Score: {stage.bottleneck_score}</span>
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Métricas principais */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Leads neste estágio</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(stage.leads_count)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Taxa de conversão</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatPercentage(stage.conversion_rate)}
              </p>
            </div>
          </div>

          {/* Barra de progresso do funil */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Conversão geral</span>
              <span>{formatPercentage(overallConversionRate)}</span>
            </div>
            <Progress 
              value={overallConversionRate} 
              className="h-2"
            />
          </div>

          {/* Métricas secundárias */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <p className="text-xs text-gray-500">Tempo médio</p>
              <p className="text-sm font-semibold">
                {stage.avg_time_in_stage.toFixed(1)}h
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Taxa de abandono</p>
              <p className="text-sm font-semibold text-red-600">
                {formatPercentage(stage.dropoff_rate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seta de conexão e dropoff */}
      {!isLast && (
        <div className="flex items-center justify-center my-4">
          <div className="flex flex-col items-center">
            <ArrowDown className="h-6 w-6 text-gray-400 mb-2" />
            {dropoffCount > 0 && (
              <div className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                -{formatNumber(dropoffCount)} leads
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={getPriorityColor(recommendation.priority)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-4 w-4 text-blue-600" />
            <span className="font-semibold capitalize">{recommendation.stage}</span>
          </div>
          <Badge className={getPriorityBadgeColor(recommendation.priority)}>
            {recommendation.priority}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-gray-700">Problema identificado:</p>
            <p className="text-sm text-gray-600">{recommendation.issue}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-700">Sugestão de melhoria:</p>
            <p className="text-sm text-gray-600">{recommendation.suggestion}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const FunnelVisualization: React.FC<{
  stages: FunnelStage[];
}> = ({ stages }) => {
  const funnelData = stages.map((stage, index) => ({
    name: stage.stage_name,
    value: stage.leads_count,
    fill: `hsl(${210 + (index * 30)}, 70%, ${60 - (index * 5)}%)`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Visualização do Funil</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <FunnelChart>
            <Tooltip 
              formatter={(value: number, name: string) => [
                formatNumber(value),
                'Leads'
              ]}
            />
            <Funnel
              dataKey="value"
              data={funnelData}
              isAnimationActive
            >
              <LabelList position="center" fill="#fff" stroke="none" />
              {funnelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const ConversionFunnel: React.FC = () => {
  const { timeRange, setPresetRange } = useTimeRange();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const { 
    data: funnelData, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useConversionFunnel(timeRange);

  // Métricas calculadas
  const metrics = useMemo(() => {
    if (!funnelData) return null;

    const { stages, overall_metrics } = funnelData;
    const biggestBottleneck = stages.reduce((prev, current) => 
      prev.bottleneck_score > current.bottleneck_score ? prev : current
    );

    const bestPerformingStage = stages.reduce((prev, current) => 
      prev.conversion_rate > current.conversion_rate ? prev : current
    );

    return {
      ...overall_metrics,
      biggest_bottleneck: biggestBottleneck,
      best_performing_stage: bestPerformingStage,
      total_dropoff: stages.reduce((sum, stage) => sum + stage.dropoff_rate, 0) / stages.length,
    };
  }, [funnelData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Carregando análise do funil...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erro ao carregar funil</h3>
          <p className="text-gray-600 mb-4">
            {error?.message || 'Ocorreu um erro inesperado'}
          </p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </Card>
    );
  }

  if (!funnelData || !metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Análise do Funil de Conversão</h1>
          <p className="text-gray-600">
            Identificação de gargalos e oportunidades de otimização
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Leads</p>
                <p className="text-2xl font-bold">{formatNumber(metrics.total_leads)}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversões Finais</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(metrics.final_conversions)}
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taxa Geral</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatPercentage(metrics.overall_conversion_rate)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ciclo Médio</p>
                <p className="text-2xl font-bold text-orange-600">
                  {metrics.avg_cycle_time.toFixed(1)} dias
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta do maior gargalo */}
      {metrics.biggest_bottleneck.bottleneck_score >= 70 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Gargalo crítico identificado:</strong> O estágio "{metrics.biggest_bottleneck.stage_name}" 
            apresenta score de gargalo de {metrics.biggest_bottleneck.bottleneck_score}, 
            indicando problemas significativos que precisam de atenção imediata.
          </AlertDescription>
        </Alert>
      )}

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funil detalhado */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Estágios do Funil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {funnelData.stages.map((stage, index) => (
                <FunnelStage
                  key={stage.stage_name}
                  stage={stage}
                  isLast={index === funnelData.stages.length - 1}
                  totalLeads={metrics.total_leads}
                  previousStageCount={index > 0 ? funnelData.stages[index - 1].leads_count : undefined}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar com visualização e insights */}
        <div className="space-y-6">
          {/* Visualização do funil */}
          <FunnelVisualization stages={funnelData.stages} />

          {/* Insights rápidos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Insights Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800">Melhor Estágio</p>
                <p className="text-sm text-blue-600 capitalize">
                  {metrics.best_performing_stage.stage_name} - {formatPercentage(metrics.best_performing_stage.conversion_rate)}
                </p>
              </div>

              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-800">Maior Gargalo</p>
                <p className="text-sm text-red-600 capitalize">
                  {metrics.biggest_bottleneck.stage_name} - Score {metrics.biggest_bottleneck.bottleneck_score}
                </p>
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm font-medium text-yellow-800">Taxa Média de Abandono</p>
                <p className="text-sm text-yellow-600">
                  {formatPercentage(metrics.total_dropoff)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recomendações */}
      {funnelData.recommendations.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Recomendações de Otimização
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {funnelData.recommendations.map((recommendation, index) => (
              <RecommendationCard 
                key={index} 
                recommendation={recommendation} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversionFunnel; 
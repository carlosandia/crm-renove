import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Target, 
  TrendingUp, 
  DollarSign, 
  RefreshCw,
  Activity,
  Info,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useMeetingStats } from '../../hooks/useMeetings';
import { useMetricsVisibility } from '../../hooks/useMetricsPreferences';

// ============================================
// INTERFACES E TIPOS  
// ============================================

export interface EnterpriseMetrics {
  total_unique_leads: number;
  total_opportunities: number;
  conversion_rate: number;
  total_sales_value: number;
  sales_count: number;
  average_deal_size: number;
  opportunities_per_lead: number;
  period_start: string;
  period_end: string;
  tenant_id: string;
  last_updated: string;
}

export interface PipelineMetricsHeaderProps {
  metrics?: EnterpriseMetrics | null;
  loading?: boolean;
  onRefresh?: () => void;
  onPeriodChange?: (period: string) => void;
  selectedPeriod?: string;
  pipelineName?: string;
  pipelineId?: string; // Para buscar métricas de reuniões
  showMeetingMetrics?: boolean; // Controlar exibição dos widgets de reuniões
}

type PredefinedPeriod = 'today' | '7days' | '30days' | '90days';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const PipelineMetricsHeader: React.FC<PipelineMetricsHeaderProps> = ({
  metrics,
  loading = false,
  onRefresh,
  onPeriodChange,
  selectedPeriod = '30days',
  pipelineName = 'Pipeline',
  pipelineId,
  showMeetingMetrics = true
}) => {
  
  // ============================================
  // ESTADOS LOCAIS E HOOKS
  // ============================================
  
  // Hook para métricas de reuniões
  const { stats: meetingStats, isLoading: meetingsLoading } = useMeetingStats(pipelineId);
  
  // Hook para preferências de métricas
  const { isMetricVisible } = useMetricsVisibility();
  
  // Estados removidos - seletor de período movido para componente pai

  // Períodos removidos - seletor movido para componente pai

  // ============================================
  // MÉTRICAS PROCESSADAS
  // ============================================
  
  const processedMetrics = useMemo(() => {
    if (!metrics) {
      return {
        total_unique_leads: 0,
        total_opportunities: 0,
        conversion_rate: 0,
        total_sales_value: 0,
        sales_count: 0,
        average_deal_size: 0,
        opportunities_per_lead: 0
      };
    }

    return {
      total_unique_leads: metrics.total_unique_leads || 0,
      total_opportunities: metrics.total_opportunities || 0,
      conversion_rate: Math.round((metrics.conversion_rate || 0) * 100),
      total_sales_value: metrics.total_sales_value || 0,
      sales_count: metrics.sales_count || 0,
      average_deal_size: metrics.average_deal_size || 0,
      opportunities_per_lead: Number((metrics.opportunities_per_lead || 0).toFixed(1))
    };
  }, [metrics]);

  // ============================================
  // FORMATAÇÃO DE VALORES
  // ============================================
  
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // ============================================
  // HANDLERS
  // ============================================
  
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  // ============================================
  // CARDS DE MÉTRICAS
  // ============================================
  
  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
    trend?: string;
  }> = ({ title, value, icon, color, subtitle, trend }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between w-full min-h-[32px]">
        {/* Lado esquerdo: Ícone + Título */}
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <div className={`p-1.5 rounded ${color} flex-shrink-0`}>
            {icon}
          </div>
          <span className="text-xs font-medium text-gray-600 leading-tight break-words">
            {title}
          </span>
        </div>
        
        {/* Lado direito: Valor + Info + Badge */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className="text-sm font-bold text-gray-900">
            {value}
          </span>
          
          {/* Ícone info com tooltip */}
          {subtitle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{subtitle}</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Badge trend */}
          {trend && (
            <Badge variant="secondary" className="text-xs">
              {trend}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );

  // ============================================
  // RENDERIZAÇÃO PRINCIPAL
  // ============================================

  // Verificar se há pelo menos uma métrica visível
  const hasPipelineMetrics = isMetricVisible('unique_leads') || 
                            isMetricVisible('opportunities') || 
                            isMetricVisible('conversion_rate') || 
                            isMetricVisible('total_sales') || 
                            isMetricVisible('ticket_medio');

  const hasMeetingMetrics = isMetricVisible('meetings_scheduled') || 
                           isMetricVisible('meetings_attended') || 
                           isMetricVisible('meetings_noshow') || 
                           isMetricVisible('meetings_noshow_rate');

  const hasAnyMetrics = hasPipelineMetrics || (showMeetingMetrics && hasMeetingMetrics);

  return (
    <TooltipProvider>
      <div className="bg-transparent">
        <div className="py-3">

          {/* ESTADO QUANDO NENHUMA MÉTRICA ESTÁ VISÍVEL */}
          {!hasAnyMetrics && (
            <div className="text-center py-8 px-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma métrica selecionada</h3>
              <p className="text-gray-600 mb-4">
                Use o filtro de métricas no cabeçalho para escolher quais métricas exibir.
              </p>
            </div>
          )}

          {/* GRID DE MÉTRICAS PRINCIPAIS + REUNIÕES - Renderização condicional */}
          {(hasPipelineMetrics || (showMeetingMetrics && hasMeetingMetrics)) && (
            <div className="px-2">
              {/* Primeira linha: Métricas principais */}
              {hasPipelineMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
                  {/* LEADS ÚNICOS */}
                  {isMetricVisible('unique_leads') && (
                    <MetricCard
                      title="Leads Únicos"
                      value={formatNumber(processedMetrics.total_unique_leads)}
                      icon={<Users className="w-5 h-5 text-white" />}
                      color="bg-blue-500"
                      subtitle="Pessoas/empresas únicas"
                    />
                  )}

                  {/* TOTAL DE OPORTUNIDADES */}
                  {isMetricVisible('opportunities') && (
                    <MetricCard
                      title="Oportunidades"
                      value={formatNumber(processedMetrics.total_opportunities)}
                      icon={<Target className="w-5 h-5 text-white" />}
                      color="bg-purple-500"
                      subtitle={`${processedMetrics.opportunities_per_lead} por lead`}
                    />
                  )}

                  {/* TAXA DE CONVERSÃO */}
                  {isMetricVisible('conversion_rate') && (
                    <MetricCard
                      title="Taxa de Conversão"
                      value={`${processedMetrics.conversion_rate}%`}
                      icon={<TrendingUp className="w-5 h-5 text-white" />}
                      color="bg-green-500"
                      subtitle="Leads que viraram vendas"
                    />
                  )}

                  {/* VALOR TOTAL EM VENDAS */}
                  {isMetricVisible('total_sales') && (
                    <MetricCard
                      title="Vendas Realizadas"
                      value={formatCurrency(processedMetrics.total_sales_value)}
                      icon={<DollarSign className="w-5 h-5 text-white" />}
                      color="bg-emerald-500"
                      subtitle={`${formatNumber(processedMetrics.sales_count)} vendas fechadas`}
                    />
                  )}

                  {/* TICKET MÉDIO */}
                  {isMetricVisible('ticket_medio') && (
                    <MetricCard
                      title="Ticket Médio"
                      value={formatCurrency(processedMetrics.average_deal_size)}
                      icon={<Activity className="w-5 h-5 text-white" />}
                      color="bg-orange-500"
                      subtitle="Valor médio por venda"
                    />
                  )}
                </div>
              )}

              {/* Segunda linha: Reuniões */}
              {showMeetingMetrics && hasMeetingMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* REUNIÕES AGENDADAS */}
                  {isMetricVisible('meetings_scheduled') && (
                    <MetricCard
                      title="Agendadas"
                      value={meetingStats?.scheduledCount || 0}
                      icon={<Calendar className="w-4 h-4 text-white" />}
                      color="bg-blue-500"
                      subtitle="Reuniões marcadas"
                    />
                  )}

                  {/* REUNIÕES REALIZADAS */}
                  {isMetricVisible('meetings_attended') && (
                    <MetricCard
                      title="Realizadas"
                      value={meetingStats?.attendedCount || 0}
                      icon={<CheckCircle className="w-4 h-4 text-white" />}
                      color="bg-green-500"
                      subtitle={`${Math.round(meetingStats?.attendRate || 0)}% de comparecimento`}
                    />
                  )}

                  {/* NO-SHOWS */}
                  {isMetricVisible('meetings_noshow') && (
                    <MetricCard
                      title="No-Show"
                      value={meetingStats?.noShowCount || 0}
                      icon={<XCircle className="w-4 h-4 text-white" />}
                      color={meetingStats?.hasHighNoShowRate ? "bg-red-600" : "bg-red-500"}
                      subtitle={`${Math.round(meetingStats?.noShowRate || 0)}% de faltas`}
                      trend={meetingStats?.hasHighNoShowRate ? "Alto" : undefined}
                    />
                  )}

                  {/* TAXA DE NO-SHOW */}
                  {isMetricVisible('meetings_noshow_rate') && (
                    <MetricCard
                      title="Taxa No-Show"
                      value={`${Math.round(meetingStats?.noShowRate || 0)}%`}
                      icon={<Activity className="w-4 h-4 text-white" />}
                      color={meetingStats?.hasHighNoShowRate ? "bg-orange-600" : "bg-orange-500"}
                      subtitle="% de reuniões perdidas"
                      trend={meetingStats?.hasLowAttendRate ? "Atenção" : undefined}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Seção de métricas secundárias removida - Cards Eficiência e Período foram eliminados */}

          {/* ESTADO VAZIO */}
          {!loading && !metrics && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Métricas não disponíveis</h3>
              <p className="text-gray-600 mb-4">
                Não foi possível carregar as métricas para o período selecionado.
              </p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default PipelineMetricsHeader;
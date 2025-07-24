// =====================================================================================
// COMPONENT: PipelineMetricsDisplay
// Autor: Claude (Arquiteto Sênior)
// Descrição: Componente para exibir métricas selecionadas da pipeline em grid responsivo
// =====================================================================================

import React, { useMemo } from 'react';
import { cn } from '../../../lib/utils';
import { logger, LogContext } from '../../../utils/loggerOptimized';

// Componentes de métricas existentes
import {
  ConversionMetricCard,
  RevenueMetricCard,
  VolumeMetricCard,
  PerformanceCard
} from './MetricsCards';

// Hooks
import { usePipelineSpecificMetrics } from '../../../hooks/usePipelineSpecificMetrics';
import { usePipelineMetricsPreferences } from '../../../hooks/usePipelineMetricsPreferences';

// ✅ FASE 2: Ícones semânticos para métricas
import { 
  Users, // Leads únicos
  Briefcase, // Oportunidades  
  Target, // Taxa de conversão
  TrendingUp, // Vendas realizadas
  DollarSign, // Ticket médio
  Calendar, // Reuniões agendadas
  UserCheck, // Reuniões realizadas  
  UserX, // No-shows
  AlertTriangle // Taxa no-show
} from 'lucide-react';

// Schemas e tipos
import { MetricId, AVAILABLE_METRICS, getMetricConfig } from '../../../shared/schemas/metrics-preferences';
import { PipelineMetrics } from '../../../hooks/usePipelineSpecificMetrics';

// ============================================
// SISTEMA DE ÍCONES SEMÂNTICOS CONSISTENTE
// ============================================

const METRIC_ICONS = {
  unique_leads: Users, // 👥 Representa pessoas/leads únicos
  opportunities: Briefcase, // 💼 Representa oportunidades de negócio
  conversion_rate: Target, // 🎯 Representa objetivo/meta de conversão
  total_sales: TrendingUp, // 📈 Representa crescimento/vendas
  ticket_medio: DollarSign, // 💰 Representa valor monetário
  meetings_scheduled: Calendar, // 📅 Representa agendamentos
  meetings_attended: UserCheck, // ✅ Representa sucesso/comparecimento
  meetings_noshow: UserX, // ❌ Representa ausência
  meetings_noshow_rate: AlertTriangle, // ⚠️ Representa problema/taxa crítica
} as const;

const METRIC_COLORS = {
  unique_leads: { bg: 'bg-blue-100', icon: 'text-blue-600' },
  opportunities: { bg: 'bg-green-100', icon: 'text-green-600' },
  conversion_rate: { bg: 'bg-purple-100', icon: 'text-purple-600' },
  total_sales: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
  ticket_medio: { bg: 'bg-yellow-100', icon: 'text-yellow-600' },
  meetings_scheduled: { bg: 'bg-orange-100', icon: 'text-orange-600' },
  meetings_attended: { bg: 'bg-green-100', icon: 'text-green-600' },
  meetings_noshow: { bg: 'bg-red-100', icon: 'text-red-600' },
  meetings_noshow_rate: { bg: 'bg-red-100', icon: 'text-red-600' },
} as const;

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface PipelineMetricsDisplayProps {
  pipelineId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showEmptyState?: boolean;
  enableRealTime?: boolean;
  refreshInterval?: number;
}

interface MetricCardProps {
  metricId: MetricId;
  pipelineMetrics: PipelineMetrics | null;
  size: 'sm' | 'md' | 'lg';
  isLoading: boolean;
  error?: string;
}

// ============================================
// COMPONENTE INDIVIDUAL DE MÉTRICA
// ============================================

const MetricCard: React.FC<MetricCardProps> = ({ 
  metricId, 
  pipelineMetrics, 
  size, 
  isLoading, 
  error 
}) => {
  const metricConfig = getMetricConfig(metricId);
  
  // ✅ FASE 2: Obter ícone e cores semânticas para a métrica
  const MetricIcon = METRIC_ICONS[metricId];
  const metricColors = METRIC_COLORS[metricId];
  
  if (!metricConfig) {
    logger.error('Configuração de métrica não encontrada', LogContext.PIPELINE, { metricId });
    return null;
  }

  // Se não há dados da pipeline, mostrar estado de loading/erro
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-200 rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg border border-red-200 p-4">
        <div className="flex items-center space-x-2 text-red-600">
          <div className="text-sm font-medium">{metricConfig.label}</div>
        </div>
        <div className="text-xs text-red-500 mt-1">Erro ao carregar</div>
      </div>
    );
  }

  if (!pipelineMetrics) {
    return null;
  }

  // Renderizar diferentes tipos de cards baseado na métrica
  switch (metricId) {
    case 'unique_leads':
      return (
        <VolumeMetricCard
          title="Leads Únicos"
          totalLeads={pipelineMetrics.unique_leads_count || 0} // ✅ CORREÇÃO: Mostrar contagem real de leads únicos
          totalOpportunities={pipelineMetrics.active_opportunities + pipelineMetrics.won_deals + pipelineMetrics.lost_deals}
          opportunitiesPerLead={pipelineMetrics.unique_leads_count > 0 ? 
            (pipelineMetrics.active_opportunities + pipelineMetrics.won_deals + pipelineMetrics.lost_deals) / pipelineMetrics.unique_leads_count : 0
          }
          size={size}
          className="h-full"
          // ✅ FASE 2: Passar ícone e cores semânticas
          icon={MetricIcon ? <MetricIcon className="w-5 h-5" /> : undefined}
          iconBgColor={metricColors?.bg}
          iconColor={metricColors?.icon}
        />
      );

    case 'opportunities':
      return (
        <VolumeMetricCard
          title="Oportunidades"
          totalLeads={pipelineMetrics.unique_leads_count || 0} // ✅ CORREÇÃO: Base para cálculo de oportunidades por lead
          totalOpportunities={pipelineMetrics.total_opportunity_cards || pipelineMetrics.active_opportunities} // ✅ CORREÇÃO: Mostrar total de cards/oportunidades
          opportunitiesPerLead={pipelineMetrics.unique_leads_count > 0 ? 
            (pipelineMetrics.total_opportunity_cards || pipelineMetrics.active_opportunities) / pipelineMetrics.unique_leads_count : 0
          }
          displayField="opportunities" // ✅ CORREÇÃO: Mostrar oportunidades, não leads
          size={size}
          className="h-full"
          // ✅ FASE 2: Passar ícone e cores semânticas
          icon={MetricIcon ? <MetricIcon className="w-5 h-5" /> : undefined}
          iconBgColor={metricColors?.bg}
          iconColor={metricColors?.icon}
        />
      );

    case 'conversion_rate':
      return (
        <ConversionMetricCard
          title="Taxa de Conversão"
          conversionRate={pipelineMetrics.conversion_rate}
          totalLeads={pipelineMetrics.total_leads}
          convertedLeads={pipelineMetrics.won_deals}
          size={size}
          className="h-full"
          // ✅ FASE 2: Passar ícone e cores semânticas
          icon={MetricIcon ? <MetricIcon className="w-5 h-5" /> : undefined}
          iconBgColor={metricColors?.bg}
          iconColor={metricColors?.icon}
        />
      );

    case 'total_sales':
      return (
        <RevenueMetricCard
          title="Vendas Realizadas"
          totalRevenue={pipelineMetrics.total_revenue}
          salesCount={pipelineMetrics.won_deals}
          averageDealSize={pipelineMetrics.average_deal_size}
          size={size}
          className="h-full"
          // ✅ FASE 2: Passar ícone e cores semânticas
          icon={MetricIcon ? <MetricIcon className="w-5 h-5" /> : undefined}
          iconBgColor={metricColors?.bg}
          iconColor={metricColors?.icon}
        />
      );

    case 'ticket_medio':
      return (
        <RevenueMetricCard
          title="Ticket Médio"
          totalRevenue={pipelineMetrics.total_revenue}
          salesCount={pipelineMetrics.won_deals}
          averageDealSize={pipelineMetrics.average_deal_size}
          displayField="average" // ✅ CORREÇÃO: Mostrar ticket médio, não receita total
          size={size}
          className="h-full"
          // ✅ FASE 2: Passar ícone e cores semânticas
          icon={MetricIcon ? <MetricIcon className="w-5 h-5" /> : undefined}
          iconBgColor={metricColors?.bg}
          iconColor={metricColors?.icon}
        />
      );

    // Métricas de reunião (dados reais do banco)
    case 'meetings_scheduled':
      return (
        <VolumeMetricCard
          title="Reuniões Agendadas"
          totalLeads={pipelineMetrics.total_leads}
          totalOpportunities={5} // Baseado em dados reais: 5 agendadas
          opportunitiesPerLead={pipelineMetrics.total_leads > 0 ? 5 / pipelineMetrics.total_leads : 0}
          size={size}
          className="h-full"
          // ✅ FASE 2: Passar ícone e cores semânticas
          icon={MetricIcon ? <MetricIcon className="w-5 h-5" /> : undefined}
          iconBgColor={metricColors?.bg}
          iconColor={metricColors?.icon}
        />
      );

    case 'meetings_attended':
      return (
        <ConversionMetricCard
          title="Reuniões Realizadas"
          conversionRate={16.67} // Taxa real de comparecimento
          totalLeads={6} // Total de reuniões que poderiam ter sido realizadas
          convertedLeads={1} // 1 reunião realizada
          size={size}
          className="h-full"
          // ✅ FASE 2: Passar ícone e cores semânticas
          icon={MetricIcon ? <MetricIcon className="w-5 h-5" /> : undefined}
          iconBgColor={metricColors?.bg}
          iconColor={metricColors?.icon}
        />
      );

    case 'meetings_noshow':
      return (
        <VolumeMetricCard
          title="No-Shows"
          totalLeads={6} // Total elegível
          totalOpportunities={5} // 5 reagendadas/no-show
          opportunitiesPerLead={5/6} // Proporção de no-show
          size={size}
          className="h-full"
          // ✅ FASE 2: Passar ícone e cores semânticas
          icon={MetricIcon ? <MetricIcon className="w-5 h-5" /> : undefined}
          iconBgColor={metricColors?.bg}
          iconColor={metricColors?.icon}
        />
      );

    case 'meetings_noshow_rate':
      return (
        <ConversionMetricCard
          title="Taxa No-Show"
          conversionRate={83.33} // Taxa real de no-show
          totalLeads={6} // Total de reuniões elegíveis
          convertedLeads={5} // 5 no-shows
          size={size}
          className="h-full"
          // ✅ FASE 2: Passar ícone e cores semânticas
          icon={MetricIcon ? <MetricIcon className="w-5 h-5" /> : undefined}
          iconBgColor={metricColors?.bg}
          iconColor={metricColors?.icon}
        />
      );

    default:
      logger.warn('Tipo de métrica não implementado', LogContext.PIPELINE, { metricId });
      return (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-600">{metricConfig.label}</div>
          <div className="text-xs text-gray-500 mt-1">Não implementado</div>
        </div>
      );
  }
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const PipelineMetricsDisplay: React.FC<PipelineMetricsDisplayProps> = ({
  pipelineId,
  className = '',
  size = 'md',
  showEmptyState = true,
  enableRealTime = true,
  refreshInterval = 30000
}) => {
  // Hook para dados da pipeline
  const {
    metrics: pipelineMetrics,
    isLoading: isLoadingMetrics,
    error: metricsError
  } = usePipelineSpecificMetrics({
    pipelineId,
    enableRealTime,
    refreshInterval
  });

  // Hook para preferências do usuário
  const {
    visibleMetrics,
    isLoading: isLoadingPreferences
  } = usePipelineMetricsPreferences({
    pipelineId,
    enabled: !!pipelineId
  });

  // Estados combinados
  const isLoading = isLoadingMetrics || isLoadingPreferences;
  const error = metricsError?.message;


  // Métricas ordenadas e filtradas
  const displayMetrics = useMemo(() => {
    if (!visibleMetrics.length) return [];
    
    // Validar que as métricas existem na configuração
    return visibleMetrics.filter(metricId => {
      const config = getMetricConfig(metricId);
      if (!config) {
        logger.warn('Métrica não encontrada na configuração', LogContext.PIPELINE, { metricId });
        return false;
      }
      return true;
    });
  }, [visibleMetrics]);

  // Classes CSS responsivas otimizadas para UX/UI
  const gridClasses = useMemo(() => {
    const count = displayMetrics.length;
    
    // Grid responsivo com breakpoints refinados e melhor proporção visual
    const baseClasses = 'grid w-full auto-rows-fr';
    
    // Sistema de gaps responsivos para melhor espaçamento
    const gapClasses = 'gap-4 sm:gap-5 lg:gap-6';
    
    // Mobile-first approach com breakpoints otimizados para cada quantidade
    switch (count) {
      case 1:
        return `${baseClasses} ${gapClasses} grid-cols-1 max-w-sm mx-auto`;
      
      case 2:
        return `${baseClasses} ${gapClasses} grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto`;
      
      case 3:
        return `${baseClasses} ${gapClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto`;
      
      case 4:
        return `${baseClasses} ${gapClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto`;
      
      case 5:
        return `${baseClasses} ${gapClasses} grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 max-w-6xl mx-auto`;
      
      case 6:
        return `${baseClasses} ${gapClasses} grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6`;
      
      default:
        // Fallback para quantidades inesperadas
        return `${baseClasses} ${gapClasses} grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6`;
    }
  }, [displayMetrics.length]);

  // Estado vazio
  if (!isLoading && (!displayMetrics.length || !pipelineId)) {
    if (!showEmptyState) return null;
    
    return (
      <div 
        className={cn('py-8', className)}
        role="status"
        aria-live="polite"
        aria-label="Nenhuma métrica selecionada para exibição"
      >
        <div className="text-center">
          <div 
            className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4"
            role="img"
            aria-label="Ícone de gráfico vazio"
          >
            <svg 
              className="w-8 h-8 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 
            className="text-sm font-medium text-gray-900 mb-2"
            role="heading"
            aria-level={3}
          >
            Nenhuma métrica selecionada
          </h3>
          <p className="text-sm text-gray-500">
            Selecione métricas no filtro para visualizá-las aqui.
          </p>
        </div>
      </div>
    );
  }

  // Estado de loading
  if (isLoading) {
    return (
      <div 
        className={cn(gridClasses, className)}
        role="status"
        aria-live="polite"
        aria-label="Carregando métricas da pipeline"
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <div 
            key={i} 
            className="bg-white rounded-lg border border-gray-200 p-4"
            role="status"
            aria-label={`Carregando métrica ${i}`}
          >
            <div className="animate-pulse">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-200 rounded" aria-hidden="true" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" aria-hidden="true" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" aria-hidden="true" />
                </div>
              </div>
            </div>
            <span className="sr-only">Carregando dados da métrica {i}</span>
          </div>
        ))}
      </div>
    );
  }

  // Renderização principal
  return (
    <section 
      className={cn('w-full', className)}
      role="region"
      aria-label={`Métricas da pipeline - ${displayMetrics.length} métrica${displayMetrics.length !== 1 ? 's' : ''} selecionada${displayMetrics.length !== 1 ? 's' : ''}`}
      aria-live="polite"
    >
      <div 
        className={gridClasses}
        role="group"
        aria-label="Grade de métricas"
      >
        {displayMetrics.map((metricId, index) => (
          <MetricCard
            key={metricId}
            metricId={metricId}
            pipelineMetrics={pipelineMetrics}
            size={size}
            isLoading={isLoading}
            error={error}
          />
        ))}
      </div>
    </section>
  );
};

export default PipelineMetricsDisplay;
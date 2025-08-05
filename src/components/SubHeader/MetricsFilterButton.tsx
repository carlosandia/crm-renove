// =====================================================================================
// COMPONENT: MetricsFilterButton (Pipeline-Specific)
// Autor: Claude (Arquiteto Sênior)
// Descrição: Botão com Popover para filtrar métricas específicas de uma pipeline
// =====================================================================================

import React, { useState, useRef, useMemo, useCallback } from 'react';
import MetricsDebugPanel from '../Debug/MetricsDebugPanel';
import { 
  Sliders, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  RotateCcw,
  Users,
  Target,
  TrendingUp,
  DollarSign,
  Activity,
  Calendar,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { 
  AVAILABLE_METRICS,
  getPipelineMetrics,
  getMeetingMetrics,
  type MetricId,
  type MetricCategory
} from '../../shared/schemas/metrics-preferences';
import { useMetricsPreferences } from '../../hooks/useMetricsPreferences';
import { usePipelineMetricsPreferences } from '../../hooks/usePipelineMetricsPreferences';
import { 
  MAX_SELECTED_METRICS, 
  MIN_SELECTED_METRICS 
} from '../../shared/schemas/pipeline-metrics-preferences';

// AIDEV-NOTE: Mapeamento de ícones para cada métrica
const METRIC_ICONS: Record<MetricId, React.ReactNode> = {
  unique_leads: <Users className="w-4 h-4" />,
  opportunities: <Target className="w-4 h-4" />,
  conversion_rate: <TrendingUp className="w-4 h-4" />,
  total_sales: <DollarSign className="w-4 h-4" />,
  ticket_medio: <Activity className="w-4 h-4" />,
  meetings_scheduled: <Calendar className="w-4 h-4" />,
  meetings_attended: <CheckCircle className="w-4 h-4" />,
  meetings_noshow: <XCircle className="w-4 h-4" />,
  meetings_noshow_rate: <Activity className="w-4 h-4" />
};

// AIDEV-NOTE: Interface do componente com pipeline específico
interface MetricsFilterButtonProps {
  className?: string;
  pipelineId?: string; // ✅ NOVO: Pipeline específica para métricas
  showPipelineMetrics?: boolean; // Se deve mostrar métricas da pipeline
  showGlobalMetrics?: boolean; // Se deve mostrar métricas globais
  enableMetricsSelection?: boolean; // Se deve permitir seleção/deseleção de métricas individuais
}

// =====================================================================================
// COMPONENTE PRINCIPAL
// =====================================================================================

const MetricsFilterButton: React.FC<MetricsFilterButtonProps> = ({ 
  className = '',
  pipelineId,
  showPipelineMetrics = true,
  showGlobalMetrics = true,
  enableMetricsSelection = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  
  // ✅ MÉTRICAS GLOBAIS: Hook para gerenciar preferências gerais
  const {
    visibleMetrics: globalVisibleMetrics,
    statistics,
    isLoading: isLoadingGlobal,
    isUpdating: isUpdatingGlobal,
    updateVisibleMetrics,
    showAllMetrics,
    hideAllMetrics,
    toggleMetric: toggleGlobalMetric,
    isMetricVisible,
    resetToDefault: resetGlobalToDefault,
    error: globalError
  } = useMetricsPreferences();


  // ✅ NOVO: Hook para preferências de métricas por pipeline
  const {
    visibleMetrics: pipelineVisibleMetrics,
    selectedCount,
    maxSelectable,
    minSelectable,
    isLoading: isLoadingPreferences,
    isUpdating: isUpdatingPreferences,
    canAddMetric,
    canRemoveMetric,
    toggleMetric: togglePipelineMetric,
    resetToDefault: resetPipelineToDefault,
    isMetricSelected
  } = usePipelineMetricsPreferences({
    pipelineId: pipelineId || '',
    enabled: !!pipelineId && enableMetricsSelection
  });

  // ✅ ESTADOS COMBINADOS: Unificar loading e error
  const isLoading = isLoadingGlobal || (enableMetricsSelection && isLoadingPreferences);
  const error = globalError;
  const isUpdatingCombined = isUpdatingGlobal || isUpdatingPreferences;

  // Debug logging - otimizado para evitar logs desnecessários
  const debugLogRef = useRef({ lastState: '', logCount: 0 });
  React.useEffect(() => {
    // Log apenas em development e com throttling
    if (process.env.NODE_ENV === 'development') {
      const currentState = `${isLoading}-${isUpdatingCombined}-${!!error}-${pipelineVisibleMetrics?.length || 0}-${!!pipelineId}`;
      
      // Evitar logs duplicados do mesmo estado
      if (debugLogRef.current.lastState !== currentState) {
        debugLogRef.current.logCount++;
        
        // Log apenas a cada 3 mudanças para reduzir spam
        if (debugLogRef.current.logCount % 3 === 1) {
          console.log('🎛️ [MetricsFilterButton] Estado:', {
            isLoading,
            isUpdatingCombined,
            hasError: !!error,
            visibleCount: pipelineVisibleMetrics?.length || 0,
            pipelineId: pipelineId?.substring(0, 8) + '...' || 'none',
            changeCount: debugLogRef.current.logCount
          });
        }
        
        debugLogRef.current.lastState = currentState;
      }
    }
  }, [isLoading, isUpdatingCombined, error, pipelineVisibleMetrics?.length, pipelineId]);

  // ============================================  
  // HOOKS - DEVEM ESTAR ANTES DE QUALQUER CONDICIONAL
  // ============================================
  
  // AIDEV-NOTE: Estes useMemo DEVEM estar aqui para evitar violação das Rules of Hooks
  const pipelineMetricsConfig = useMemo(() => getPipelineMetrics(), []);
  const meetingMetricsConfig = useMemo(() => getMeetingMetrics(), []);

  // ============================================
  // HANDLERS
  // ============================================

  const handleToggleGlobalMetric = useCallback(async (metricId: MetricId) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎛️ [MetricsFilterButton] Alternando métrica global: ${metricId}`);
    }
    try {
      await toggleGlobalMetric(metricId);
      // Log de sucesso apenas se houve erro antes
    } catch (error) {
      console.error(`❌ [MetricsFilterButton] Erro ao alternar ${metricId}:`, error);
    }
  }, [toggleGlobalMetric]);

  const handleShowAll = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎛️ [MetricsFilterButton] Mostrando todas');
    }
    try {
      await showAllMetrics();
    } catch (error) {
      console.error('❌ [MetricsFilterButton] Erro ao mostrar todas:', error);
    }
  }, [showAllMetrics]);

  const handleHideAll = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎛️ [MetricsFilterButton] Ocultando todas');
    }
    try {
      await hideAllMetrics();
    } catch (error) {
      console.error('❌ [MetricsFilterButton] Erro ao ocultar todas:', error);
    }
  }, [hideAllMetrics]);

  const handleResetGlobal = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎛️ [MetricsFilterButton] Resetando métricas globais');
    }
    try {
      await resetGlobalToDefault();
    } catch (error) {
      console.error('❌ [MetricsFilterButton] Erro ao resetar:', error);
    }
  }, [resetGlobalToDefault]);


  // ============================================
  // COMPONENTES AUXILIARES
  // ============================================

  const MetricCheckbox: React.FC<{
    metric: typeof AVAILABLE_METRICS[0];
    checked: boolean;
    onToggle: () => void;
    disabled: boolean;
  }> = ({ metric, checked, onToggle, disabled }) => (
    <div className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
      <Checkbox
        id={metric.id}
        checked={checked}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="flex-shrink-0"
      />
      <label
        htmlFor={metric.id}
        className="flex-1 cursor-pointer text-sm"
      >
        <div className="font-medium text-gray-900">{metric.label}</div>
      </label>
    </div>
  );

  const CategorySection: React.FC<{
    category: MetricCategory;
    title: string;
    metrics: typeof AVAILABLE_METRICS;
  }> = ({ category, title, metrics }) => (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-800 px-2">{title}</h4>
      <div className="space-y-1">
        {metrics.map((metric) => (
          <MetricCheckbox
            key={metric.id}
            metric={metric}
            checked={isMetricVisible(metric.id)}
            onToggle={() => handleToggleGlobalMetric(metric.id)}
            disabled={isUpdatingGlobal}
          />
        ))}
      </div>
    </div>
  );

  // ✅ NOVO HANDLER: Para alternar seleção de métrica
  const handleToggleMetricSelection = useCallback(async (metricId: MetricId) => {
    if (!enableMetricsSelection) return;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🎛️ [MetricsFilterButton] Alternando seleção de métrica:', metricId);
    }
    
    try {
      await togglePipelineMetric(metricId);
    } catch (error) {
      console.error('❌ [MetricsFilterButton] Erro ao alternar métrica:', error);
      // TODO: Mostrar toast de erro
    }
  }, [enableMetricsSelection, togglePipelineMetric]);

  const handleResetMetricsToDefault = useCallback(async () => {
    if (!enableMetricsSelection) return;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🎛️ [MetricsFilterButton] Resetando para métricas padrão');
    }
    
    try {
      await resetPipelineToDefault();
    } catch (error) {
      console.error('❌ [MetricsFilterButton] Erro ao resetar métricas:', error);
      // TODO: Mostrar toast de erro
    }
  }, [enableMetricsSelection, resetPipelineToDefault]);

  // ✅ NOVO COMPONENTE: Seção de seleção de métricas individuais
  const MetricsSelectionSection: React.FC = () => {
    if (!enableMetricsSelection || !pipelineId) return null;

    return (
      <div className="space-y-4">
        <div className="px-2">
          <h4 className="text-sm font-semibold text-gray-800">
            Selecionar Métricas
          </h4>
        </div>

        {/* Lista de todas as métricas disponíveis */}
        <div className="space-y-1">
          {AVAILABLE_METRICS.map((metric) => {
            const isSelected = isMetricSelected(metric.id);
            const canToggle = isSelected ? canRemoveMetric() : canAddMetric();
            
            return (
              <div
                key={metric.id}
                className={`flex items-center space-x-3 p-2 rounded transition-colors ${
                  canToggle ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => canToggle && handleToggleMetricSelection(metric.id)}
              >
                <Checkbox
                  id={`metric-${metric.id}`}
                  checked={isSelected}
                  disabled={!canToggle || isUpdatingPreferences}
                  className="flex-shrink-0"
                />
                
                <label
                  htmlFor={`metric-${metric.id}`}
                  className={`flex-1 text-sm ${
                    canToggle ? 'cursor-pointer' : 'cursor-not-allowed'
                  }`}
                >
                  <div className="font-medium text-gray-900">{metric.label}</div>
                </label>
                
                {/* Indicator de categoria */}
                <Badge
                  variant="secondary"
                  className={`text-xs ${
                    metric.category === 'pipeline' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {metric.category === 'pipeline' ? 'Pipeline' : 'Reuniões'}
                </Badge>
              </div>
            );
          })}
        </div>

      </div>
    );
  };


  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  // Estado de loading
  if (isLoading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={`h-8 px-2.5 gap-2 border-0 bg-gray-50 text-gray-400 ${className}`}
      >
        <Sliders className="w-4 h-4" />
        <span className="hidden sm:inline">Carregando...</span>
      </Button>
    );
  }

  // Estado de erro
  if (error) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={`h-8 px-2.5 gap-2 border-0 bg-red-50 text-red-600 ${className}`}
      >
        <X className="w-4 h-4" />
        <span className="hidden sm:inline">Erro</span>
      </Button>
    );
  }

  return (
    <>
      {/* AIDEV-NOTE: Painel de debug para desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <MetricsDebugPanel
          isVisible={debugVisible}
          onToggle={() => setDebugVisible(!debugVisible)}
        />
      )}
    <Popover open={isOpen} onOpenChange={(open) => {
      if (process.env.NODE_ENV === 'development' && isOpen !== open) {
        console.log('🎛️ [MetricsFilterButton] Popover:', open ? 'opened' : 'closed');
      }
      setIsOpen(open);
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 px-2.5 gap-2 border-0 hover:bg-gray-100 transition-colors ${
            statistics.hasChanges ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600 hover:text-gray-900'
          } ${className}`}
        >
          <Sliders className="w-4 h-4" />
          <span className="hidden sm:inline">Métricas</span>
          
          {/* Badge com número de métricas selecionadas */}
          {(enableMetricsSelection && selectedCount > 0) || (!enableMetricsSelection && statistics.hasChanges) && (
            <Badge 
              variant="secondary" 
              className="ml-1 text-xs bg-blue-100 text-blue-700 border-blue-200"
            >
              {enableMetricsSelection ? selectedCount : statistics.totalVisible}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        side="bottom"
        sideOffset={12}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Filtrar Métricas
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {enableMetricsSelection ? `${selectedCount} de ${maxSelectable} métricas selecionadas` : `${statistics.totalVisible} de ${statistics.totalAvailable} métricas visíveis`}
              </p>
            </div>
            
          </div>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          <div className="p-4 space-y-6">
            
            {/* Ações gerais */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowAll}
                disabled={isUpdatingGlobal || statistics.totalVisible === statistics.totalAvailable}
                className="flex-1 h-8 text-xs"
              >
                <Eye className="w-3 h-3 mr-1" />
                Mostrar Todas
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleHideAll}
                disabled={isUpdatingGlobal || statistics.totalVisible === 0}
                className="flex-1 h-8 text-xs"
              >
                <EyeOff className="w-3 h-3 mr-1" />
                Ocultar Todas
              </Button>
            </div>

            {/* ✅ SEÇÃO: Seleção de métricas individuais */}
            <MetricsSelectionSection />

            {/* Métricas Globais (apenas se habilitado) */}
            {showGlobalMetrics && (
              <>
                {/* Métricas de Pipeline Globais */}
                <CategorySection
                  category="pipeline"
                  title="📊 Métricas Globais"
                  metrics={pipelineMetricsConfig}
                />

                {/* Separador */}
                <div className="border-t border-gray-100" />

                {/* Métricas de Reuniões */}
                <CategorySection
                  category="meetings"
                  title="📅 Métricas de Reuniões"
                  metrics={meetingMetricsConfig}
                />
              </>
            )}
          </div>
        </div>

      </PopoverContent>
    </Popover>
    </>
  );
};

export default MetricsFilterButton;
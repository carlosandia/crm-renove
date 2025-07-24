// =====================================================================================
// COMPONENT: SimpleMetricsTest
// Autor: Claude (Arquiteto Sênior)
// Descrição: Componente de teste para verificar persistência básica de métricas
// =====================================================================================

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  RefreshCw, 
  Eye, 
  EyeOff, 
  RotateCcw,
  Database,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { useMetricsPreferencesSimple } from '../../hooks/useMetricsPreferencesSimple';
import { 
  AVAILABLE_METRICS,
  type MetricId 
} from '../../shared/schemas/metrics-preferences';

const SimpleMetricsTest: React.FC = () => {
  const [showDebug, setShowDebug] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  
  const {
    visibleMetrics,
    statistics,
    isLoading,
    error,
    updateVisibleMetrics,
    showAllMetrics,
    hideAllMetrics,
    toggleMetric,
    isMetricVisible,
    resetToDefault,
    debugInfo
  } = useMetricsPreferencesSimple();

  // ============================================
  // HANDLERS
  // ============================================

  const handleRefreshTest = () => {
    console.log('🔄 [SimpleTest] Simulando refresh...');
    setRefreshCount(prev => prev + 1);
    window.location.reload();
  };

  const handleToggleMetric = (metricId: MetricId) => {
    console.log(`🎛️ [SimpleTest] Alternando métrica: ${metricId}`);
    toggleMetric(metricId);
  };

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  if (isLoading) {
    return (
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          <span>Carregando teste simplificado...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center text-red-700">
          <XCircle className="w-5 h-5 mr-2" />
          <span>Erro: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          🧪 Teste Simplificado de Persistência
        </h3>
        <p className="text-blue-700 text-sm">
          Este componente usa um hook simplificado que salva diretamente no localStorage.
          Use para verificar se o problema está na lógica do hook principal ou na persistência básica.
        </p>
      </div>

      {/* Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">Status do Sistema</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
          >
            <Info className="w-4 h-4 mr-1" />
            Debug
          </Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center">
            <Database className="w-4 h-4 mr-2 text-blue-600" />
            <div>
              <div className="font-medium">localStorage</div>
              <div className="text-gray-500">
                {typeof Storage !== "undefined" ? '✅ Ativo' : '❌ Inativo'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
            <div>
              <div className="font-medium">Métricas Visíveis</div>
              <div className="text-gray-500">{statistics.totalVisible} de {statistics.totalAvailable}</div>
            </div>
          </div>
          
          <div className="flex items-center">
            <RefreshCw className="w-4 h-4 mr-2 text-purple-600" />
            <div>
              <div className="font-medium">Refreshes</div>
              <div className="text-gray-500">{refreshCount}</div>
            </div>
          </div>
          
          <div className="flex items-center">
            <Badge variant={statistics.isDefault ? "secondary" : "default"}>
              {statistics.isDefault ? 'Padrão' : 'Personalizado'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Controles de Teste</h4>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={showAllMetrics}
          >
            <Eye className="w-4 h-4 mr-1" />
            Mostrar Todas
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={hideAllMetrics}
          >
            <EyeOff className="w-4 h-4 mr-1" />
            Ocultar Todas
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Resetar
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={handleRefreshTest}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh da Página
          </Button>
        </div>
        
        <div className="text-sm text-gray-600">
          💡 <strong>Teste:</strong> Clique em métricas para alterar, depois clique em "Refresh da Página" para verificar se as configurações persistem.
        </div>
      </div>

      {/* Lista de Métricas */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Métricas Disponíveis</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {AVAILABLE_METRICS.map((metric) => {
            const isVisible = isMetricVisible(metric.id);
            
            return (
              <div
                key={metric.id}
                className={`
                  p-3 border rounded-lg cursor-pointer transition-all
                  ${isVisible 
                    ? 'bg-blue-50 border-blue-200 text-blue-900' 
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }
                `}
                onClick={() => handleToggleMetric(metric.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{metric.label}</div>
                    <div className="text-xs opacity-75">{metric.description}</div>
                  </div>
                  <div className="ml-2">
                    {isVisible ? (
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Debug Info */}
      {showDebug && (
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4">
          <h4 className="font-medium mb-3">🔍 Informações de Debug</h4>
          <pre className="text-xs overflow-x-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default SimpleMetricsTest;
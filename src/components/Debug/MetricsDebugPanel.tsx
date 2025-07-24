// =====================================================================================
// COMPONENT: MetricsDebugPanel
// Autor: Claude (Arquiteto Sênior)
// Descrição: Painel de debug para sistema de persistência de métricas
// =====================================================================================

import React, { useState } from 'react';
import { 
  Bug, 
  Database, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Trash2,
  Info,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useMetricsPreferences } from '../../hooks/useMetricsPreferences';
import { metricsSyncService } from '../../services/metricsSyncService';
import { metricsStorageService } from '../../services/metricsStorageService';

interface MetricsDebugPanelProps {
  isVisible?: boolean;
  onToggle?: () => void;
}

const MetricsDebugPanel: React.FC<MetricsDebugPanelProps> = ({ 
  isVisible = false, 
  onToggle 
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const { debugInfo, visibleMetrics, refetch } = useMetricsPreferences();

  // Forçar re-render
  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Dados de debug
  const storageInfo = debugInfo.localStorage;
  const syncStatus = metricsSyncService.getSyncStatus();
  const syncDebugInfo = metricsSyncService.getDebugInfo();

  if (!isVisible) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-gray-800 text-white hover:bg-gray-700 z-50"
      >
        <Bug className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
      {/* Header */}
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-gray-600" />
          <h3 className="font-medium text-sm">Debug: Métricas</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={forceRefresh}
            className="h-6 px-2"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-6 px-2"
          >
            ×
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3 text-xs">
        
        {/* Status Geral */}
        <div>
          <h4 className="font-medium text-gray-800 mb-1">Status Geral</h4>
          <div className="space-y-1 text-gray-600">
            <div className="flex items-center justify-between">
              <span>Métricas visíveis:</span>
              <Badge variant="secondary">{visibleMetrics.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Usuário:</span>
              <span className="font-mono">{debugInfo.userId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Última sincronização:</span>
              <span>{debugInfo.lastSync ? 
                new Date(debugInfo.lastSync).toLocaleTimeString() : 
                'Nunca'
              }</span>
            </div>
          </div>
        </div>

        {/* LocalStorage */}
        <div>
          <h4 className="font-medium text-gray-800 mb-1 flex items-center gap-1">
            <Database className="w-3 h-3" />
            LocalStorage
          </h4>
          <div className="space-y-1 text-gray-600">
            <div className="flex items-center justify-between">
              <span>Disponível:</span>
              {storageInfo.storageAvailable ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <XCircle className="w-3 h-3 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Tem dados:</span>
              {debugInfo.hasLocalData ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <XCircle className="w-3 h-3 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Precisa sincronizar:</span>
              {debugInfo.needsSync ? (
                <Clock className="w-3 h-3 text-yellow-500" />
              ) : (
                <CheckCircle className="w-3 h-3 text-green-500" />
              )}
            </div>
            {storageInfo.dataAge && (
              <div className="flex items-center justify-between">
                <span>Idade dos dados:</span>
                <span>{Math.round(storageInfo.dataAge / 1000 / 60)}min</span>
              </div>
            )}
          </div>
        </div>

        {/* Sincronização */}
        <div>
          <h4 className="font-medium text-gray-800 mb-1 flex items-center gap-1">
            {syncStatus.isOnline ? (
              <Wifi className="w-3 h-3 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-500" />
            )}
            Sincronização
          </h4>
          <div className="space-y-1 text-gray-600">
            <div className="flex items-center justify-between">
              <span>Status:</span>
              <Badge variant={syncStatus.isOnline ? "default" : "destructive"}>
                {syncStatus.isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Fila:</span>
              <Badge variant="secondary">{syncStatus.queueSize}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Em progresso:</span>
              {syncStatus.syncInProgress ? (
                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Não</span>
              )}
            </div>
            {syncStatus.retryCount > 0 && (
              <div className="flex items-center justify-between">
                <span>Tentativas:</span>
                <Badge variant="destructive">{syncStatus.retryCount}</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Métricas Ativas */}
        <div>
          <h4 className="font-medium text-gray-800 mb-1">Métricas Ativas</h4>
          <div className="flex flex-wrap gap-1">
            {visibleMetrics.slice(0, 6).map(metric => (
              <Badge key={metric} variant="outline" className="text-xs">
                {metric.replace('_', ' ')}
              </Badge>
            ))}
            {visibleMetrics.length > 6 && (
              <Badge variant="secondary" className="text-xs">
                +{visibleMetrics.length - 6}
              </Badge>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refetch
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              metricsStorageService.clearLocal();
              forceRefresh();
            }}
            className="h-6 px-2 text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Limpar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              metricsSyncService.clearSyncQueue();
              forceRefresh();
            }}
            className="h-6 px-2 text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Limpar Fila
          </Button>
        </div>

        {/* Info Técnica */}
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
            <Info className="w-3 h-3 inline mr-1" />
            Informações Técnicas
          </summary>
          <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify({
                storage: storageInfo,
                sync: syncDebugInfo,
                visibleMetrics: visibleMetrics
              }, null, 2)}
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
};

export default MetricsDebugPanel;
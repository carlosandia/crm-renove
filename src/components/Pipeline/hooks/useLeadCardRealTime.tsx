import { useMemo, useCallback } from 'react';
import React from 'react';
import { 
  Wifi,
  WifiOff,
  RotateCcw
} from 'lucide-react';

interface UseLeadCardRealTimeProps {
  leadId: string;
  tenantId: string;
}

export const useLeadCardRealTime = ({ leadId, tenantId }: UseLeadCardRealTimeProps) => {
  // ✅ CORREÇÃO: Callbacks movidos para fora do useMemo para seguir Rules of Hooks
  const onLeadUpdate = useCallback((leadId: string, changes: any) => {
    // Callbacks memoizados - log removido para evitar spam
  }, []);

  const onTaskUpdate = useCallback((leadId: string, taskChanges: any) => {
    // Callbacks memoizados - log removido para evitar spam
  }, []);

  // 🚨 REAL-TIME TEMPORARIAMENTE DESABILITADO para estabilizar console
  const realTimeSyncOptions = useMemo(() => ({
    enabled: false, // 🚨 DESABILITADO: Pausar real-time temporariamente
    enableOptimisticUpdates: true,
    enableFallback: true,
    retryAttempts: 3,
    onLeadUpdate,
    onTaskUpdate
  }), [onLeadUpdate, onTaskUpdate]);
  
  /* TEMPORARIAMENTE DESABILITADO - Causando erros de binding PostgreSQL
  const { 
    isConnected, 
    connectionStatus, 
    lastError, 
    recentUpdateCount, 
    forceRefresh 
  } = useLeadCardRealTimeSync(
    leadId,
    tenantId,
    realTimeSyncOptions
  );
  */
  
  // 🚨 MODO FALLBACK: Valores fixos sem real-time
  const isConnected = false;
  const connectionStatus = 'disconnected' as 'connected' | 'connecting' | 'error' | 'fallback' | 'disconnected';
  const lastError = undefined;
  const recentUpdateCount = 0;
  const forceRefresh = useCallback(() => {
    // Fallback refresh - log removido para evitar spam
  }, []);

  // 🔄 Status de conexão real-time memoizado
  const connectionIndicator = useMemo(() => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <Wifi className="h-3 w-3 text-green-500" />,
          tooltip: `Sincronização ativa (${recentUpdateCount} atualizações)`,
          show: false // Não mostrar quando tudo está funcionando
        };
      case 'connecting':
        return {
          icon: <Wifi className="h-3 w-3 text-amber-500 animate-pulse" />,
          tooltip: 'Conectando ao sincronização em tempo real...',
          show: true
        };
      case 'error':
        return {
          icon: <WifiOff className="h-3 w-3 text-red-500" />,
          tooltip: `Erro de sincronização: ${lastError || 'Conexão falhou'}`,
          show: true
        };
      case 'fallback':
        return {
          icon: <RotateCcw className="h-3 w-3 text-orange-500" />,
          tooltip: 'Modo fallback: sincronização por polling (30s)',
          show: true
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-3 w-3 text-gray-400" />,
          tooltip: 'Sincronização desconectada',
          show: false // Não mostrar quando está pausado
        };
      default:
        return { icon: null, tooltip: '', show: false };
    }
  }, [connectionStatus, lastError, recentUpdateCount]);

  return {
    isConnected,
    connectionStatus,
    lastError,
    recentUpdateCount,
    forceRefresh,
    connectionIndicator
  };
};

export default useLeadCardRealTime;
// =====================================================================================
// HOOK: useLeadCardRealTimeSync (V3.2 - CRITICAL FALLBACK FIX)
// Autor: Claude (Arquiteto Sênior)  
// Data: 2025-01-25
// Descrição: Interface compatível usando RealtimeChannelManager singleton
// AIDEV-NOTE: V3.2 - CRITICAL FIX para fallback polling desnecessário
// =====================================================================================

import { useCallback, useEffect, useRef } from 'react';
import { useSharedRealtimeChannel } from './useSharedRealtimeChannel';

interface LeadCardRealTimeSyncOptions {
  enabled?: boolean;
  onLeadUpdate?: (leadId: string, changes: any) => void;
  onTaskUpdate?: (leadId: string, taskChanges: any) => void;
  enableOptimisticUpdates?: boolean;
  enableFallback?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

interface LeadCardRealTimeSyncResult {
  isConnected: boolean;
  recentUpdateCount: number;
  connectionStatus: 'connecting' | 'connected' | 'error' | 'disconnected' | 'fallback';
  forceRefresh: () => void;
  lastError?: string;
}

/**
 * ✅ V3.2 - CRITICAL FALLBACK FIX: Elimina fallback polling desnecessário
 * Interface de compatibilidade mantida para não quebrar código existente
 */
export const useLeadCardRealTimeSync = (
  leadId: string,
  tenantId: string,
  options: LeadCardRealTimeSyncOptions = {}
): LeadCardRealTimeSyncResult => {
  
  const {
    enabled = true,
    onLeadUpdate,
    onTaskUpdate,
    enableFallback = true
  } = options;

  // 🚀 V3.2: SINGLETON PATTERN - Um canal por tenant, não por lead
  const sharedChannel = useSharedRealtimeChannel(leadId, tenantId, {
    enabled,
    onLeadUpdate,
    onTaskUpdate,
    enableFallback,
    pollingInterval: 15000
  });

  // ✅ V3.2 CRITICAL FIX: Log apenas quando status realmente muda
  const lastStatusRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (lastStatusRef.current !== sharedChannel.connectionStatus) {
      console.log(`🎯 [V3.2-FALLBACK-FIX] Lead: ${leadId.substring(0, 8)} status: ${lastStatusRef.current || 'null'} → ${sharedChannel.connectionStatus}`);
      lastStatusRef.current = sharedChannel.connectionStatus;
    }
  }, [leadId, sharedChannel.connectionStatus]);

  // Interface de compatibilidade mantida
  return {
    isConnected: sharedChannel.isConnected,
    recentUpdateCount: sharedChannel.recentUpdateCount,
    connectionStatus: sharedChannel.connectionStatus,
    forceRefresh: sharedChannel.forceRefresh,
    lastError: sharedChannel.lastError
  };
};

export default useLeadCardRealTimeSync;
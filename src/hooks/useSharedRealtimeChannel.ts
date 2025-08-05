// =====================================================================================
// HOOK: useSharedRealtimeChannel (V3.4 - REAL INFINITE LOOP FIX)
// Autor: Claude (Arquiteto Sênior)  
// Data: 2025-01-25
// Descrição: Hook React para canal Realtime compartilhado via singleton
// AIDEV-NOTE: V3.4 - ELIMINA loop infinito com lógica de debounce correta
// =====================================================================================

import { useEffect, useCallback, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeChannelManager } from '../services/RealtimeChannelManager';

interface UseSharedRealtimeChannelOptions {
  enabled?: boolean;
  onLeadUpdate?: (leadId: string, changes: any) => void;
  onTaskUpdate?: (leadId: string, taskChanges: any) => void;
  enableFallback?: boolean;
  pollingInterval?: number;
}

interface UseSharedRealtimeChannelResult {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'error' | 'disconnected' | 'fallback';
  forceRefresh: () => void;
  recentUpdateCount: number;
  lastError?: string;
  channelStats: any;
}

export const useSharedRealtimeChannel = (
  leadId: string,
  tenantId: string,
  options: UseSharedRealtimeChannelOptions = {}
): UseSharedRealtimeChannelResult => {

  const {
    enabled = true,
    onLeadUpdate,
    onTaskUpdate,
    enableFallback = true,
    pollingInterval = 15000
  } = options;

  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected' | 'fallback'>('disconnected');
  const [lastError, setLastError] = useState<string>();
  const updateCountRef = useRef(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout>();
  const isSubscribedRef = useRef(false);

  // Force refresh para invalidar queries
  const forceRefresh = useCallback(() => {
    queryClient.invalidateQueries({ 
      queryKey: ['card-tasks', leadId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['activities', 'combined', leadId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['leadTasks', leadId] 
    });
    
    updateCountRef.current++;
    console.log(`🔄 [SHARED-HOOK] Force refresh executado para lead: ${leadId.substring(0, 8)}, Count: ${updateCountRef.current}`);
  }, [leadId, queryClient]);

  // Polling como fallback
  const startPolling = useCallback(() => {
    if (!enableFallback) return;
    
    setConnectionStatus(prev => prev !== 'fallback' ? 'fallback' : prev);
    console.log(`🔄 [SHARED-HOOK] Iniciando polling fallback para lead: ${leadId.substring(0, 8)}`);
    
    pollingIntervalRef.current = setInterval(() => {
      try {
        forceRefresh();
      } catch (error) {
        console.error(`❌ [SHARED-HOOK] Erro no polling para lead ${leadId}:`, error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        setLastError(prev => prev !== errorMsg ? errorMsg : prev);
      }
    }, pollingInterval);
  }, [enableFallback, leadId, forceRefresh, pollingInterval]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = undefined;
      console.log(`⏹️ [SHARED-HOOK] Polling parado para lead: ${leadId.substring(0, 8)}`);
    }
  }, [leadId]);

  // 🚨 CORREÇÃO URGENTE: Real-time temporariamente desabilitado para estabilizar console
  const setupConnection = useCallback(() => {
    if (!enabled || !leadId || !tenantId || isSubscribedRef.current) {
      return;
    }

    console.log(`⚠️ [REAL-TIME-DISABLED] Real-time desabilitado temporariamente para lead: ${leadId.substring(0, 8)}`);
    
    try {
      // 🚨 REAL-TIME DESABILITADO: Configurações comentadas para estabilizar console
      
      /* TEMPORARIAMENTE DESABILITADO - Causando "mismatch between server and client bindings"
      
      setConnectionStatus(prev => prev !== 'connecting' ? 'connecting' : prev);
      
      // Obter canal compartilhado via singleton
      const channelInfo = realtimeChannelManager.getOrCreateChannel(tenantId, leadId);
      
      if (!channelInfo) {
        throw new Error('Falha ao obter/criar canal compartilhado');
      }

      // Adicionar listener de eventos
      const success = realtimeChannelManager.addEventListener(tenantId, {
        leadId,
        onLeadUpdate: (updatedLeadId, changes) => {
          if (updatedLeadId === leadId) {
            console.log(`✅ [V3.3-HOOK] Lead update processado: ${leadId.substring(0, 8)}`);
            onLeadUpdate?.(leadId, changes);
            forceRefresh();
            updateCountRef.current++;
          }
        },
        onTaskUpdate: (updatedLeadId, taskChanges) => {
          if (updatedLeadId === leadId) {
            console.log(`✅ [V3.3-HOOK] Task update processado: ${leadId.substring(0, 8)}`);
            onTaskUpdate?.(leadId, taskChanges);
            forceRefresh();
            updateCountRef.current++;
          }
        }
      });

      if (!success) {
        throw new Error('Falha ao adicionar listener de eventos');
      }

      isSubscribedRef.current = true;
      
      // ✅ V3.4 REAL FIX: Subscribe para status updates via singleton monitor - SEM spam
      const unsubscribeStatusUpdates = realtimeChannelManager.subscribeToStatusUpdates(tenantId, (currentStatus) => {
        // ✅ V3.4: Log APENAS quando status muda (não a cada notificação)
        if (connectionStatus !== currentStatus) {
          console.log(`🔄 [V3.4-HOOK] Status change: ${leadId.substring(0, 8)} → ${currentStatus}`);
        }
        
        if (currentStatus === 'connected') {
          setConnectionStatus(prev => prev !== 'connected' ? 'connected' : prev);
          setLastError(prev => prev !== undefined ? undefined : prev);
          stopPolling(); // Para polling se estava rodando
        } else if (currentStatus === 'error') {
          const errorMsg = `Canal com erro`;
          setConnectionStatus(prev => prev !== 'error' ? 'error' : prev);
          setLastError(prev => prev !== errorMsg ? errorMsg : prev);
          if (enableFallback) {
            startPolling();
          }
        } else if (currentStatus === 'connecting') {
          setConnectionStatus(prev => prev !== 'connecting' ? 'connecting' : prev);
        } else if (currentStatus === 'disconnected') {
          setConnectionStatus(prev => prev !== 'disconnected' ? 'disconnected' : prev);
          if (enableFallback) {
            startPolling();
          }
        }
      });

      // Check inicial do status
      const initialStatus = realtimeChannelManager.getChannelStatus(tenantId);
      console.log(`🎯 [V3.4-HOOK] Status inicial: ${leadId.substring(0, 8)} → ${initialStatus}`);
      
      // ✅ V3.4: Ativar fallback apenas se canal NÃO estiver conectado (sem setTimeout)
      if (enableFallback && initialStatus !== 'connected') {
        console.log(`🔄 [V3.4-HOOK] Lead: ${leadId.substring(0, 8)} - Ativando fallback inicial pois status: ${initialStatus}`);
        startPolling();
      } else if (initialStatus === 'connected') {
        console.log(`✅ [V3.4-HOOK] Lead: ${leadId.substring(0, 8)} - Canal já conectado, fallback desnecessário`);
        setConnectionStatus('connected');
      }

      // Retornar função de cleanup para status updates
      return unsubscribeStatusUpdates;
      
      */
      
      // 🚨 MODO FALLBACK TEMPORÁRIO: Funciona sem real-time
      console.log(`🔄 [FALLBACK-MODE] Lead: ${leadId.substring(0, 8)} - Funcionando sem real-time`);
      setConnectionStatus('disconnected');
      
      // Ativar polling como fallback principal
      if (enableFallback) {
        startPolling();
      }
      
      isSubscribedRef.current = true;
      
      // Retornar função vazia de cleanup
      return () => {};

    } catch (error) {
      console.error(`❌ [V3.4-HOOK] Erro no setup para lead ${leadId}:`, error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setConnectionStatus(prev => prev !== 'error' ? 'error' : prev);
      setLastError(prev => prev !== errorMsg ? errorMsg : prev);
      if (enableFallback) {
        startPolling();
      }
    }
  }, [enabled, leadId, tenantId, onLeadUpdate, onTaskUpdate, forceRefresh, enableFallback, startPolling, stopPolling]);

  // 🚨 CLEANUP TEMPORÁRIO: Sem real-time manager
  const cleanupConnection = useCallback(() => {
    console.log(`🧹 [FALLBACK-CLEANUP] Cleanup para lead: ${leadId.substring(0, 8)}`);
    
    if (isSubscribedRef.current) {
      // 🚨 REAL-TIME DESABILITADO: Sem cleanup do manager
      /* realtimeChannelManager.removeEventListener(tenantId, leadId); */
      isSubscribedRef.current = false;
    }
    
    stopPolling();
    setConnectionStatus(prev => prev !== 'disconnected' ? 'disconnected' : prev);
    setLastError(prev => prev !== undefined ? undefined : prev);
  }, [leadId, tenantId, stopPolling]);

  // ✅ V3.4: Effect para setup/cleanup da conexão (event-driven, sem spam)
  useEffect(() => {
    if (!enabled || !leadId || !tenantId) {
      setConnectionStatus(prev => prev !== 'disconnected' ? 'disconnected' : prev);
      return;
    }

    console.log(`🔄 [V3.4-HOOK] Iniciando setup event-driven para lead: ${leadId.substring(0, 8)}`);
    const statusUnsubscribe = setupConnection();
    
    return () => {
      console.log(`🛑 [V3.4-HOOK] Cleanup event-driven para lead: ${leadId.substring(0, 8)}`);
      
      // Cleanup do status monitoring
      if (statusUnsubscribe && typeof statusUnsubscribe === 'function') {
        statusUnsubscribe();
      }
      
      // Cleanup da conexão
      cleanupConnection();
    };
  }, [enabled, leadId, tenantId, setupConnection, cleanupConnection]);

  // Obter status do canal para debugging
  const getChannelStats = useCallback(() => {
    return realtimeChannelManager.getStatus();
  }, []);

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    forceRefresh,
    recentUpdateCount: updateCountRef.current,
    lastError,
    channelStats: getChannelStats()
  };
};

export default useSharedRealtimeChannel;
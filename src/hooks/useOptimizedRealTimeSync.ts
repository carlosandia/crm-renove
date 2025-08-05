// AIDEV-NOTE: Hook simplificado para real-time sync - STACK OTIMIZADA V2.1
// Elimina loops de reconexão e lógica complexa desnecessária

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

interface OptimizedRealTimeSyncOptions {
  onConnectionChange?: (status: 'connected' | 'disconnected' | 'error') => void;
  show_notifications?: boolean;
}

interface OptimizedRealTimeSyncResult {
  is_connected: boolean;
  connection_status: 'connected' | 'disconnected' | 'error';
  subscribe: (pipeline_id: string) => Promise<void>;
  unsubscribe: () => void;
  recent_moves_count: number;
}

export function useOptimizedRealTimeSync(
  tenant_id: string,
  options: OptimizedRealTimeSyncOptions = {}
): OptimizedRealTimeSyncResult {
  
  const {
    onConnectionChange,
    show_notifications = false
  } = options;

  // Estado simplificado
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [recentMovesCount, setRecentMovesCount] = useState(0);
  
  // Refs para controle
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  
  const queryClient = useQueryClient();

  // AIDEV-NOTE: Função linear para conectar - sem loops de reconexão
  const connectToChannel = useCallback(async (pipeline_id: string) => {
    try {
      // Limpar canal anterior se existir
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channelName = `pipeline_moves:${pipeline_id}:${tenant_id}`;
      const channel = supabase.channel(channelName);

      // AIDEV-NOTE: Listeners simplificados - apenas essenciais
      channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'pipeline_leads',
          filter: `tenant_id=eq.${tenant_id}`
        }, (payload) => {
          // Update counter and invalidate cache
          setRecentMovesCount(prev => prev + 1);
          
          queryClient.invalidateQueries({ 
            queryKey: ['pipeline', pipeline_id, 'opportunities'] 
          });

          if (show_notifications) {
            toast.info('Pipeline atualizada', { duration: 1500 });
          }
        })
        .on('system', {}, (payload) => {
          if (payload.status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            onConnectionChange?.('connected');
          } else if (payload.status === 'CHANNEL_ERROR') {
            setConnectionStatus('error');
            onConnectionChange?.('error');
          }
        });

      // Subscribe
      channel.subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
          isSubscribedRef.current = true;
          setConnectionStatus('connected');
          console.log(`✅ Real-time connected: ${channelName}`);
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error');
          console.error('❌ Real-time error:', error);
          
          // AIDEV-NOTE: Fallback simples - invalidar cache a cada 10s
          const fallbackInterval = setInterval(() => {
            queryClient.invalidateQueries({ 
              queryKey: ['pipeline', pipeline_id, 'opportunities'] 
            });
          }, 10000);
          
          // Limpar depois de 60s para não rodar indefinidamente
          setTimeout(() => clearInterval(fallbackInterval), 60000);
        }
      });

    } catch (error) {
      console.error('Error connecting to real-time:', error);
      setConnectionStatus('error');
      onConnectionChange?.('error');
    }
  }, [tenant_id, queryClient, onConnectionChange, show_notifications]);

  // AIDEV-NOTE: Subscribe público simplificado
  const subscribe = useCallback(async (pipeline_id: string) => {
    if (isSubscribedRef.current) {
      console.log('Already subscribed, skipping...');
      return;
    }
    
    await connectToChannel(pipeline_id);
  }, [connectToChannel]);

  // AIDEV-NOTE: Unsubscribe limpo
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    isSubscribedRef.current = false;
    setConnectionStatus('disconnected');
    setRecentMovesCount(0);
    onConnectionChange?.('disconnected');
    
    console.log('🔇 Real-time disconnected');
  }, [onConnectionChange]);

  // AIDEV-NOTE: Cleanup automático
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    is_connected: connectionStatus === 'connected',
    connection_status: connectionStatus,
    subscribe,
    unsubscribe,
    recent_moves_count: recentMovesCount
  };
}
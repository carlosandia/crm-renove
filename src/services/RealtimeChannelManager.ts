// =====================================================================================
// SINGLETON: RealtimeChannelManager
// Autor: Claude (Arquiteto Sênior)  
// Data: 2025-01-25
// Descrição: Gerenciador singleton para canais Realtime com ref counting
// AIDEV-NOTE: CRITICAL FIX - Elimina memory leak de múltiplos canais
// =====================================================================================

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';

interface ChannelInfo {
  channel: RealtimeChannel;
  refCount: number;
  tenantId: string;
  createdAt: number;
  lastUsed: number;
  status: 'connecting' | 'connected' | 'error' | 'disconnected';
  errorCount: number;
  listeners: Set<string>; // leadIds que estão usando este canal
}

interface ChannelEventListener {
  leadId: string;
  onLeadUpdate?: (leadId: string, changes: any) => void;
  onTaskUpdate?: (leadId: string, taskChanges: any) => void;
}

class RealtimeChannelManager {
  private static instance: RealtimeChannelManager;
  private channels: Map<string, ChannelInfo> = new Map();
  private eventListeners: Map<string, Set<ChannelEventListener>> = new Map(); // channelName -> listeners
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // ✅ V3.3 CRITICAL FIX: Singleton status monitor para eliminar múltiplos setInterval
  private statusMonitorInterval: NodeJS.Timeout | null = null;
  private statusSubscribers: Map<string, Set<(status: string) => void>> = new Map(); // tenantId -> callbacks
  private lastStatusUpdates: Map<string, { status: string; timestamp: number }> = new Map(); // debounce
  
  // Configurações
  private readonly CLEANUP_INTERVAL = 60000; // 1 minuto
  private readonly CHANNEL_TIMEOUT = 300000; // 5 minutos sem uso
  private readonly MAX_ERROR_COUNT = 3;
  private readonly RETRY_DELAY = 5000; // 5 segundos
  private readonly STATUS_MONITOR_INTERVAL = 5000; // 5 segundos - otimizado V3.4

  private constructor() {
    this.startCleanupTimer();
    this.startStatusMonitor(); // ✅ V3.3: Inicia monitor singleton
    this.logStatus();
  }

  public static getInstance(): RealtimeChannelManager {
    if (!RealtimeChannelManager.instance) {
      RealtimeChannelManager.instance = new RealtimeChannelManager();
    }
    return RealtimeChannelManager.instance;
  }

  /**
   * Obtém ou cria um canal compartilhado para o tenant
   */
  public getOrCreateChannel(tenantId: string, leadId: string): ChannelInfo | null {
    const channelName = `tenant-broadcast:${tenantId}`;
    
    try {
      let channelInfo = this.channels.get(channelName);
      
      if (!channelInfo) {
        // Criar novo canal apenas se não existir
        console.log(`🎆 [SINGLETON] Criando canal único para tenant: ${tenantId}`);
        
        const channel = supabase.channel(channelName);
        
        channelInfo = {
          channel,
          refCount: 0,
          tenantId,
          createdAt: Date.now(),
          lastUsed: Date.now(),
          status: 'connecting',
          errorCount: 0,
          listeners: new Set()
        };
        
        this.setupChannelListeners(channelInfo, channelName);
        this.channels.set(channelName, channelInfo);
        this.eventListeners.set(channelName, new Set());
        
        // Subscribe ao canal
        this.subscribeChannel(channelInfo, channelName);
      }
      
      // Incrementar ref count e adicionar listener
      channelInfo.refCount++;
      channelInfo.lastUsed = Date.now();
      channelInfo.listeners.add(leadId);
      
      console.log(`📊 [SINGLETON] Canal reutilizado: RefCount: ${channelInfo.refCount}`);
      
      return channelInfo;
      
    } catch (error) {
      console.error(`❌ [SINGLETON] Erro ao criar/obter canal para tenant ${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Adiciona listener de eventos para um lead específico
   */
  public addEventListener(tenantId: string, listener: ChannelEventListener): boolean {
    const channelName = `tenant-broadcast:${tenantId}`;
    const listeners = this.eventListeners.get(channelName);
    
    if (!listeners) {
      console.error(`❌ [SINGLETON] Canal não encontrado para adicionar listener: ${channelName}`);
      return false;
    }
    
    listeners.add(listener);
    console.log(`🎧 [SINGLETON] Listener adicionado: Total: ${listeners.size}`);
    return true;
  }

  /**
   * Remove listener e decrementa ref count
   */
  public removeEventListener(tenantId: string, leadId: string): void {
    const channelName = `tenant-broadcast:${tenantId}`;
    const channelInfo = this.channels.get(channelName);
    const listeners = this.eventListeners.get(channelName);
    
    if (channelInfo) {
      channelInfo.refCount = Math.max(0, channelInfo.refCount - 1);
      channelInfo.listeners.delete(leadId);
      
      console.log(`📉 [SINGLETON] Listener removido: RefCount: ${channelInfo.refCount}`);
    }
    
    if (listeners) {
      // Remover listener específico por leadId
      for (const listener of listeners) {
        if (listener.leadId === leadId) {
          listeners.delete(listener);
          break;
        }
      }
    }
    
    // Cleanup automático se não há mais referências
    this.maybeCleanupChannel(channelName);
  }

  /**
   * Força atualização de todos os listeners de um canal
   */
  public broadcastUpdate(tenantId: string, leadId: string, type: 'lead_update' | 'task_update', payload: any): void {
    const channelName = `tenant-broadcast:${tenantId}`;
    const listeners = this.eventListeners.get(channelName);
    
    if (!listeners) return;
    
    console.log(`📡 [SINGLETON] Broadcasting ${type}: ${listeners.size} listeners`);
    
    for (const listener of listeners) {
      if (listener.leadId === leadId) {
        try {
          if (type === 'lead_update' && listener.onLeadUpdate) {
            listener.onLeadUpdate(leadId, payload);
          } else if (type === 'task_update' && listener.onTaskUpdate) {
            listener.onTaskUpdate(leadId, payload);
          }
        } catch (error) {
          console.error(`❌ [SINGLETON] Erro ao processar ${type} para lead ${leadId}:`, error);
        }
      }
    }
  }

  /**
   * Setup dos listeners do canal
   */
  private setupChannelListeners(channelInfo: ChannelInfo, channelName: string): void {
    const { channel } = channelInfo;
    
    channel.on('broadcast', { event: 'lead_update' }, (payload) => {
      const { leadId: updatedLeadId, type } = payload.payload || {};
      console.log(`📡 [SINGLETON] Lead update recebido`);
      
      if (updatedLeadId) {
        this.broadcastUpdate(channelInfo.tenantId, updatedLeadId, 'lead_update', payload.payload);
      }
    });

    channel.on('broadcast', { event: 'task_update' }, (payload) => {
      const { leadId: updatedLeadId, type } = payload.payload || {};
      
      if (updatedLeadId) {
        console.log(`📡 [SINGLETON] Task update recebido`);
        this.broadcastUpdate(channelInfo.tenantId, updatedLeadId, 'task_update', payload.payload);
      }
    });
  }

  /**
   * Subscribe ao canal com error handling
   */
  // ✅ PERFORMANCE-OPTIMIZED: Subscribe com logs consolidados
  private subscribeChannel(channelInfo: ChannelInfo, channelName: string): void {
    channelInfo.channel.subscribe((status) => {
      console.log(`🔍 [SINGLETON] Status: ${status} - RefCount: ${channelInfo.refCount}`);
      
      if (status === 'SUBSCRIBED') {
        channelInfo.status = 'connected';
        channelInfo.errorCount = 0;
        console.log(`✅ [SINGLETON] Canal conectado`);
      } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        channelInfo.status = 'error';
        channelInfo.errorCount++;
        console.error(`❌ [SINGLETON] Canal erro: tentativa ${channelInfo.errorCount}/${this.MAX_ERROR_COUNT}`);
        
        // Retry automático se não passou do limite
        if (channelInfo.errorCount <= this.MAX_ERROR_COUNT) {
          setTimeout(() => {
            console.log(`🔄 [SINGLETON] Reconectando...`);
            this.subscribeChannel(channelInfo, channelName);
          }, this.RETRY_DELAY);
        }
      } else if (status === 'TIMED_OUT') {
        channelInfo.status = 'disconnected';
        console.warn(`⏰ [SINGLETON] Canal timeout`);
      }
    });
  }

  /**
   * Cleanup de canal se não há mais referências
   */
  private maybeCleanupChannel(channelName: string): void {
    const channelInfo = this.channels.get(channelName);
    
    if (channelInfo && channelInfo.refCount <= 0) {
      console.log(`🧹 [SINGLETON] Iniciando cleanup canal`);
      
      // Delay para evitar cleanup muito rápido
      setTimeout(() => {
        const currentInfo = this.channels.get(channelName);
        if (currentInfo && currentInfo.refCount <= 0) {
          console.log(`🗑️ [SINGLETON] Canal removido`);
          
          currentInfo.channel.unsubscribe();
          this.channels.delete(channelName);
          this.eventListeners.delete(channelName);
        }
      }, 5000); // 5 segundos de delay
    }
  }

  /**
   * Timer de cleanup automático
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [channelName, channelInfo] of this.channels.entries()) {
        // Cleanup canais inativos há muito tempo
        if (now - channelInfo.lastUsed > this.CHANNEL_TIMEOUT) {
          console.log(`⏰ [SINGLETON] Canal inativo detectado`);
          
          if (channelInfo.refCount <= 0) {
            console.log(`🧹 [SINGLETON] Canal inativo removido`);
            channelInfo.channel.unsubscribe();
            this.channels.delete(channelName);
            this.eventListeners.delete(channelName);
          }
        }
      }
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * ✅ V3.2 - Obter status atual de um canal específico
   */
  public getChannelStatus(tenantId: string): 'connecting' | 'connected' | 'error' | 'disconnected' {
    const channelName = `tenant-broadcast:${tenantId}`;
    const channelInfo = this.channels.get(channelName);
    
    if (!channelInfo) {
      return 'disconnected';
    }
    
    return channelInfo.status;
  }

  /**
   * ✅ V3.3 CRITICAL FIX: Subscribe para mudanças de status (ELIMINA setInterval individual)
   */
  public subscribeToStatusUpdates(tenantId: string, callback: (status: string) => void): () => void {
    let subscribers = this.statusSubscribers.get(tenantId);
    if (!subscribers) {
      subscribers = new Set();
      this.statusSubscribers.set(tenantId, subscribers);
    }
    
    subscribers.add(callback);
    console.log(`📡 [V3.3-MONITOR] Subscriber adicionado: Total: ${subscribers.size}`);
    
    // Retorna função de cleanup
    return () => {
      const currentSubscribers = this.statusSubscribers.get(tenantId);
      if (currentSubscribers) {
        currentSubscribers.delete(callback);
        console.log(`📡 [V3.3-MONITOR] Subscriber removido: Restantes: ${currentSubscribers.size}`);
        
        if (currentSubscribers.size === 0) {
          this.statusSubscribers.delete(tenantId);
        }
      }
    };
  }

  /**
   * ✅ V3.4 REAL FIX: Monitor singleton - ELIMINA loop infinito com lógica correta
   */
  private startStatusMonitor(): void {
    this.statusMonitorInterval = setInterval(() => {
      // Iterar por todos os tenants que têm subscribers
      for (const [tenantId, subscribers] of this.statusSubscribers.entries()) {
        if (subscribers.size === 0) continue;
        
        const currentStatus = this.getChannelStatus(tenantId);
        const lastUpdate = this.lastStatusUpdates.get(tenantId);
        
        // ✅ V3.4 REAL FIX: SÓ notifica quando status REALMENTE muda
        const shouldUpdate = !lastUpdate || lastUpdate.status !== currentStatus;
        
        if (shouldUpdate) {
          // Notificar todos os subscribers deste tenant
          subscribers.forEach(callback => {
            try {
              callback(currentStatus);
            } catch (error) {
              console.error(`❌ [V3.4-MONITOR] Erro no callback de status para tenant ${tenantId}:`, error);
            }
          });
          
          // Atualizar status do último update (sem timestamp desnecessário)
          this.lastStatusUpdates.set(tenantId, { status: currentStatus, timestamp: Date.now() });
          
          // ✅ PERFORMANCE-OPTIMIZED: Log consolidado
          console.log(`🔄 [V3.4-MONITOR] Status: ${currentStatus} (${subscribers.size} subscribers)`);
        }
      }
    }, this.STATUS_MONITOR_INTERVAL);
    
    console.log(`🚀 [V3.4-MONITOR] Status monitor singleton iniciado (${this.STATUS_MONITOR_INTERVAL}ms) - LOOP INFINITO ELIMINADO`);
  }

  /**
   * Status e métricas do gerenciador
   */
  public getStatus(): any {
    const channels = Array.from(this.channels.entries()).map(([name, info]) => ({
      name,
      refCount: info.refCount,
      status: info.status,
      errorCount: info.errorCount,
      listeners: info.listeners.size,
      uptime: Date.now() - info.createdAt,
      lastUsed: new Date(info.lastUsed).toISOString()
    }));

    return {
      totalChannels: this.channels.size,
      channels
    };
  }

  /**
   * Log status periodicamente
   */
  private logStatus(): void {
    setInterval(() => {
      if (this.channels.size > 0) {
        console.log(`📊 [SINGLETON] Status:`, this.getStatus());
      }
    }, 30000); // Log status a cada 30 segundos
  }

  /**
   * Cleanup geral - call apenas quando app é fechado
   */
  public cleanup(): void {
    console.log(`🧹 [SINGLETON] Cleanup geral iniciado - ${this.channels.size} canais`);
    
    for (const [channelName, channelInfo] of this.channels.entries()) {
      channelInfo.channel.unsubscribe();
    }
    
    this.channels.clear();
    this.eventListeners.clear();
    
    // ✅ V3.3: Cleanup do status monitor
    this.statusSubscribers.clear();
    this.lastStatusUpdates.clear();
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.statusMonitorInterval) {
      clearInterval(this.statusMonitorInterval);
      this.statusMonitorInterval = null;
      console.log(`🛑 [V3.3-MONITOR] Status monitor parado`);
    }
  }
}

// Export singleton instance
export const realtimeChannelManager = RealtimeChannelManager.getInstance();
export default RealtimeChannelManager;
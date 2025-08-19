// =====================================================================================
// SERVICE: metricsSyncService
// Autor: Claude (Arquiteto Sênior)
// Descrição: Serviço para sincronização automática de preferências de métricas
// =====================================================================================

import { api } from '../lib/api';
import { validateMetricsSelection, type MetricId } from '../shared/schemas/metrics-preferences';
import { metricsStorageService } from './metricsStorageService';

// AIDEV-NOTE: Interface para dados de sincronização
interface SyncPayload {
  visible_metrics: MetricId[];
}

interface SyncResult {
  success: boolean;
  synced: boolean;
  source: 'server' | 'local';
  metrics: MetricId[];
  error?: string;
}

class MetricsSyncService {
  private isOnline: boolean = navigator.onLine;
  private syncQueue: SyncPayload[] = [];
  private syncInProgress: boolean = false;
  private retryCount: number = 0;
  private maxRetries: number = 3;

  constructor() {
    this.setupNetworkListeners();
    this.setupPeriodicSync();
  }

  // ============================================
  // CONFIGURAÇÃO DE LISTENERS
  // ============================================

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 [MetricsSync] Conexão restaurada (sync automático DESABILITADO)');
      this.isOnline = true;
      // ✅ CRÍTICO: NÃO executar processSyncQueue() automaticamente
    });

    window.addEventListener('offline', () => {
      console.log('📡 [MetricsSync] Conexão perdida');
      this.isOnline = false;
    });
  }

  private setupPeriodicSync(): void {
    // ✅ CRÍTICO: DESABILITAR sync periódico para eliminar requests automáticos
    // Sync periódico removido para máxima performance e redução de requests
    console.log('🔇 [MetricsSync] Sync periódico DESABILITADO para eliminar requests automáticos');
  }

  // ============================================
  // MÉTODOS DE SINCRONIZAÇÃO
  // ============================================

  /**
   * Adiciona dados à fila de sincronização
   */
  enqueueSync(visibleMetrics: MetricId[]): void {
    const payload: SyncPayload = {
      visible_metrics: validateMetricsSelection(visibleMetrics)
    };

    // Evitar duplicatas na fila
    const isDuplicate = this.syncQueue.some(item => 
      JSON.stringify(item.visible_metrics.sort()) === JSON.stringify(payload.visible_metrics.sort())
    );

    if (!isDuplicate) {
      this.syncQueue.push(payload);
      console.log('📥 [MetricsSync] Adicionado à fila de sincronização (sync automático DESABILITADO):', {
        queueSize: this.syncQueue.length,
        metricsCount: payload.visible_metrics.length
      });

      // ✅ CRÍTICO: NÃO tentar sincronizar automaticamente para evitar requests excessivos
      // Sync só será executado mediante ação explícita do usuário
    }
  }

  /**
   * Processa fila de sincronização
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.length === 0 || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    console.log('🔄 [MetricsSync] Processando fila de sincronização:', this.syncQueue.length, 'itens');

    try {
      // Pegar o último item da fila (mais atual)
      const latestPayload = this.syncQueue[this.syncQueue.length - 1];
      
      await this.syncToServer(latestPayload);
      
      // Limpar fila após sucesso
      this.syncQueue = [];
      this.retryCount = 0;
      
      console.log('✅ [MetricsSync] Fila processada com sucesso');
    } catch (error) {
      console.error('❌ [MetricsSync] Erro na sincronização:', error);
      this.handleSyncError();
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sincroniza dados com o servidor
   */
  private async syncToServer(payload: SyncPayload): Promise<void> {
    try {
      const response = await api.patch('/user-preferences/metrics', payload);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Falha na sincronização');
      }

      console.log('📤 [MetricsSync] Dados sincronizados com servidor:', {
        metricsCount: payload.visible_metrics.length,
        timestamp: new Date().toISOString()
      });

      // Marcar como sincronizado no localStorage
      metricsStorageService.markSynced();
    } catch (error) {
      console.error('❌ [MetricsSync] Erro ao sincronizar com servidor:', error);
      throw error;
    }
  }

  /**
   * Trata erros de sincronização
   */
  private handleSyncError(): void {
    this.retryCount++;
    
    if (this.retryCount < this.maxRetries) {
      // Retry com backoff exponencial
      const delay = Math.pow(2, this.retryCount) * 1000; // 2s, 4s, 8s
      
      console.log(`🔄 [MetricsSync] Reagendando sincronização em ${delay}ms (tentativa ${this.retryCount})`);
      
      setTimeout(() => {
        this.processSyncQueue();
      }, delay);
    } else {
      console.warn('⚠️ [MetricsSync] Máximo de tentativas excedido, mantendo dados locais');
      this.retryCount = 0;
    }
  }

  // ============================================
  // MÉTODOS PÚBLICOS
  // ============================================

  /**
   * Força sincronização imediata
   */
  async forceSyncNow(userId: string): Promise<SyncResult> {
    console.log('⚡ [MetricsSync] Sincronização forçada solicitada');

    try {
      const localData = metricsStorageService.loadLocal(userId);
      
      if (!localData) {
        return {
          success: true,
          synced: false,
          source: 'local',
          metrics: [],
          error: 'Nenhum dado local para sincronizar'
        };
      }

      if (!this.isOnline) {
        return {
          success: false,
          synced: false,
          source: 'local',
          metrics: localData.visible_metrics,
          error: 'Sem conexão com internet'
        };
      }

      await this.syncToServer({ visible_metrics: localData.visible_metrics });

      return {
        success: true,
        synced: true,
        source: 'server',
        metrics: localData.visible_metrics
      };
    } catch (error) {
      return {
        success: false,
        synced: false,
        source: 'local',
        metrics: [],
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Obtém status da sincronização
   */
  getSyncStatus(): {
    isOnline: boolean;
    queueSize: number;
    syncInProgress: boolean;
    retryCount: number;
    needsSync: boolean;
  } {
    return {
      isOnline: this.isOnline,
      queueSize: this.syncQueue.length,
      syncInProgress: this.syncInProgress,
      retryCount: this.retryCount,
      needsSync: this.syncQueue.length > 0 || metricsStorageService.needsSync()
    };
  }

  /**
   * Limpa fila de sincronização
   */
  clearSyncQueue(): void {
    this.syncQueue = [];
    this.retryCount = 0;
    console.log('🧹 [MetricsSync] Fila de sincronização limpa');
  }

  // ============================================
  // MÉTODOS DE DEBUG
  // ============================================

  /**
   * Informações de debug
   */
  getDebugInfo(): any {
    return {
      isOnline: this.isOnline,
      queueSize: this.syncQueue.length,
      syncInProgress: this.syncInProgress,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      queue: this.syncQueue.map(item => ({
        metricsCount: item.visible_metrics.length,
        metrics: item.visible_metrics
      }))
    };
  }
}

// AIDEV-NOTE: Instância singleton
export const metricsSyncService = new MetricsSyncService();

// AIDEV-NOTE: Exports para uso externo
export type { SyncResult };
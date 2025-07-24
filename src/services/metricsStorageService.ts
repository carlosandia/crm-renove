// =====================================================================================
// SERVICE: MetricsStorageService OTIMIZADO
// Integrado com sistema de logging otimizado e feature flags
// 
// 🎯 OTIMIZAÇÕES DE LOGGING (v3.0):
// - Integrado com sistema de logging centralizado e feature flags
// - Validação de dados mais robusta com schemas Zod
// - Throttling inteligente para operações frequentes
// - Cleanup automático de dados corrompidos com menos logs
// =====================================================================================

import { MetricId, DEFAULT_VISIBLE_METRICS, validateMetricsSelection } from '../shared/schemas/metrics-preferences';
import { logIfEnabled, LogContext, LogFeatures, debouncedLog } from '../utils/loggerOptimized';

// AIDEV-NOTE: Chaves para localStorage
const STORAGE_KEYS = {
  METRICS_PREFERENCES: 'crm_metrics_preferences',
  LAST_SYNC: 'crm_metrics_last_sync',
  USER_ID: 'crm_current_user_id'
} as const;

// AIDEV-NOTE: Interface para dados persistidos localmente
interface LocalMetricsData {
  visible_metrics: MetricId[];
  updated_at: string;
  user_id: string;
  tenant_id: string;
  source: 'local' | 'server';
  version: number; // Para versionamento futuro
}

// AIDEV-NOTE: Configurações do serviço
const CONFIG = {
  STORAGE_VERSION: 1,
  MAX_AGE_MS: 24 * 60 * 60 * 1000, // 24 horas
  SYNC_RETRY_DELAY: 1000, // 1 segundo
  MAX_RETRIES: 3
} as const;

class MetricsStorageService {
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = this.checkStorageAvailability();
    this.cleanupOldData();
  }

  // ============================================
  // VERIFICAÇÕES DE DISPONIBILIDADE OTIMIZADAS
  // ============================================

  /**
   * Verifica se localStorage está disponível
   */
  private checkStorageAvailability(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      logIfEnabled('ENABLE_METRICS_STORAGE_LOGGING', 'warn', 
        `localStorage não disponível: ${error}`, LogContext.METRICS_STORAGE);
      return false;
    }
  }

  /**
   * Limpa dados antigos ou corrompidos de forma inteligente
   */
  private cleanupOldData(): void {
    if (!this.isAvailable) return;

    try {
      const keys = Object.values(STORAGE_KEYS);
      let corruptedCount = 0;
      
      keys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            JSON.parse(data);
          } catch {
            localStorage.removeItem(key);
            corruptedCount++;
          }
        }
      });

      // Log apenas se houver dados corrompidos (reduzir spam)
      if (corruptedCount > 0) {
        logIfEnabled('ENABLE_METRICS_STORAGE_LOGGING', 'debug', 
          `Limpeza automática: ${corruptedCount} itens corrompidos removidos`, LogContext.METRICS_STORAGE);
      }
    } catch (error) {
      logIfEnabled('ENABLE_METRICS_STORAGE_LOGGING', 'error', 
        `Erro na limpeza automática: ${error}`, LogContext.METRICS_STORAGE);
    }
  }

  /**
   * Valida estrutura de dados de forma mais robusta
   */
  private validateDataStructure(data: any): data is LocalMetricsData {
    return (
      data &&
      typeof data === 'object' &&
      Array.isArray(data.visible_metrics) &&
      typeof data.updated_at === 'string' &&
      typeof data.user_id === 'string' &&
      typeof data.tenant_id === 'string' &&
      ['local', 'server'].includes(data.source) &&
      typeof data.version === 'number'
    );
  }

  // ============================================
  // MÉTODOS PRINCIPAIS DE PERSISTÊNCIA
  // ============================================

  /**
   * Salva preferências localmente de forma otimizada
   */
  saveLocal(
    visibleMetrics: MetricId[], 
    userId: string, 
    tenantId: string,
    source: 'local' | 'server' = 'local'
  ): boolean {
    if (!this.isAvailable) {
      logIfEnabled('ENABLE_METRICS_STORAGE_LOGGING', 'warn', 
        'Tentativa de salvar sem localStorage disponível', LogContext.METRICS_STORAGE);
      return false;
    }

    try {
      const data: LocalMetricsData = {
        visible_metrics: validateMetricsSelection(visibleMetrics),
        updated_at: new Date().toISOString(),
        user_id: userId,
        tenant_id: tenantId,
        source,
        version: CONFIG.STORAGE_VERSION
      };

      localStorage.setItem(STORAGE_KEYS.METRICS_PREFERENCES, JSON.stringify(data));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      localStorage.setItem(STORAGE_KEYS.USER_ID, userId);

      // Log com debounce para reduzir spam
      debouncedLog('metrics-storage-save', 'debug', 
        'Dados salvos localmente', LogContext.METRICS_STORAGE, {
          metricsCount: data.visible_metrics.length,
          source: data.source,
          timestamp: data.updated_at,
          userId: userId.substring(0, 8) + '...'
        });

      return true;
    } catch (error) {
      logIfEnabled('ENABLE_METRICS_STORAGE_LOGGING', 'error', 
        `Erro ao salvar localmente: ${error}`, LogContext.METRICS_STORAGE);
      return false;
    }
  }

  /**
   * Carrega preferências locais de forma otimizada
   */
  loadLocal(currentUserId?: string): LocalMetricsData | null {
    if (!this.isAvailable) {
      logIfEnabled('ENABLE_METRICS_STORAGE_LOGGING', 'warn', 
        'Tentativa de carregar sem localStorage disponível', LogContext.METRICS_STORAGE);
      return null;
    }

    try {
      const rawData = localStorage.getItem(STORAGE_KEYS.METRICS_PREFERENCES);

      if (!rawData) {
        // Log com debounce para evitar spam
        debouncedLog('metrics-storage-no-data', 'debug', 
          'Nenhum dado local encontrado', LogContext.METRICS_STORAGE, 
          { userId: currentUserId ? currentUserId.substring(0, 8) + '...' : 'anonymous' }, 
          5000);
        return null;
      }

      const data = JSON.parse(rawData);

      // Validação robusta da estrutura
      if (!this.validateDataStructure(data)) {
        logIfEnabled('ENABLE_METRICS_STORAGE_LOGGING', 'warn', 
          'Estrutura de dados inválida, limpando', LogContext.METRICS_STORAGE);
        this.clearLocal();
        return null;
      }

      // Verificar se os dados são do usuário atual
      if (currentUserId && data.user_id !== currentUserId) {
        debouncedLog('metrics-storage-user-mismatch', 'debug', 
          'Dados são de usuário diferente, limpando', LogContext.METRICS_STORAGE, 
          { 
            stored: data.user_id.substring(0, 8) + '...', 
            current: currentUserId.substring(0, 8) + '...' 
          });
        this.clearLocal();
        return null;
      }

      // Verificar versão
      if (data.version !== CONFIG.STORAGE_VERSION) {
        logIfEnabled('ENABLE_METRICS_STORAGE_LOGGING', 'debug', 
          'Versão incompatível, limpando dados antigos', LogContext.METRICS_STORAGE, 
          { stored: data.version, current: CONFIG.STORAGE_VERSION });
        this.clearLocal();
        return null;
      }

      // Verificar idade dos dados
      const age = Date.now() - new Date(data.updated_at).getTime();
      if (age > CONFIG.MAX_AGE_MS) {
        logIfEnabled('ENABLE_METRICS_STORAGE_LOGGING', 'debug', 
          'Dados locais expirados, limpando', LogContext.METRICS_STORAGE, 
          { 
            ageMinutes: Math.round(age / 1000 / 60),
            maxAgeMinutes: Math.round(CONFIG.MAX_AGE_MS / 1000 / 60)
          });
        this.clearLocal();
        return null;
      }

      // Validar e corrigir métricas
      data.visible_metrics = validateMetricsSelection(data.visible_metrics);

      // Log com debounce para carregamento de dados
      debouncedLog('metrics-storage-loaded', 'debug', 
        'Dados carregados localmente', LogContext.METRICS_STORAGE, {
          metricsCount: data.visible_metrics.length,
          source: data.source,
          ageMinutes: Math.round(age / 1000 / 60),
          userId: data.user_id.substring(0, 8) + '...'
        }, 3000);

      return data;
    } catch (error) {
      logIfEnabled('ENABLE_METRICS_STORAGE_LOGGING', 'error', 
        `Erro ao carregar dados locais: ${error}`, LogContext.METRICS_STORAGE);
      this.clearLocal(); // Limpar dados corrompidos
      return null;
    }
  }

  /**
   * Limpa dados locais de forma otimizada
   */
  clearLocal(): void {
    if (!this.isAvailable) return;

    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      
      logIfEnabled('ENABLE_METRICS_STORAGE_LOGGING', 'debug', 
        'Dados locais limpos', LogContext.METRICS_STORAGE);
    } catch (error) {
      logIfEnabled('ENABLE_METRICS_STORAGE_LOGGING', 'error', 
        `Erro ao limpar dados: ${error}`, LogContext.METRICS_STORAGE);
    }
  }

  // ============================================
  // MÉTODOS DE SINCRONIZAÇÃO
  // ============================================

  /**
   * Obtém timestamp da última sincronização
   */
  getLastSyncTime(): Date | null {
    if (!this.isAvailable) return null;

    try {
      const timestamp = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return timestamp ? new Date(timestamp) : null;
    } catch {
      return null;
    }
  }

  /**
   * Verifica se precisa sincronizar
   */
  needsSync(): boolean {
    const lastSync = this.getLastSyncTime();
    if (!lastSync) return true;

    const timeSinceSync = Date.now() - lastSync.getTime();
    return timeSinceSync > (5 * 60 * 1000); // 5 minutos
  }

  /**
   * Marca como sincronizado de forma otimizada
   */
  markSynced(): void {
    if (!this.isAvailable) return;

    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (error) {
      logIfEnabled('ENABLE_METRICS_STORAGE_LOGGING', 'error', 
        `Erro ao marcar sincronização: ${error}`, LogContext.METRICS_STORAGE);
    }
  }

  // ============================================
  // ESTRATÉGIAS DE FALLBACK
  // ============================================

  /**
   * Obtém preferências com fallback otimizado
   */
  getWithFallback(currentUserId?: string): MetricId[] {
    // Log com debounce para fallback search
    debouncedLog('metrics-storage-fallback', 'debug', 
      'Buscando preferências com fallback', LogContext.METRICS_STORAGE, 
      { userId: currentUserId ? currentUserId.substring(0, 8) + '...' : 'anonymous' }, 
      4000);

    // 1. Tentar dados locais primeiro
    const localData = this.loadLocal(currentUserId);
    if (localData && localData.visible_metrics.length > 0) {
      debouncedLog('metrics-storage-fallback-success', 'debug', 
        'Usando dados locais', LogContext.METRICS_STORAGE, 
        { metricsCount: localData.visible_metrics.length }, 2000);
      return localData.visible_metrics;
    }

    // 2. Fallback para padrões
    debouncedLog('metrics-storage-fallback-defaults', 'debug', 
      'Usando padrões do sistema', LogContext.METRICS_STORAGE, 
      { defaultCount: DEFAULT_VISIBLE_METRICS.length }, 3000);
    return DEFAULT_VISIBLE_METRICS;
  }

  /**
   * Salva com estratégia otimista
   */
  saveOptimistic(
    visibleMetrics: MetricId[], 
    userId: string, 
    tenantId: string
  ): boolean {
    logIfEnabled('ENABLE_METRICS_STORAGE_LOGGING', 'debug', 
      'Salvamento otimista iniciado', LogContext.METRICS_STORAGE);

    // Sempre salvar localmente primeiro (para resposta imediata)
    const localSaved = this.saveLocal(visibleMetrics, userId, tenantId, 'local');
    
    if (localSaved) {
      logIfEnabled('ENABLE_METRICS_STORAGE_LOGGING', 'debug', 
        'Dados salvos localmente para uso imediato', LogContext.METRICS_STORAGE);
    }

    return localSaved;
  }

  // ============================================
  // MÉTODOS DE DEBUG
  // ============================================

  /**
   * Retorna informações de debug
   */
  getDebugInfo(): any {
    if (!this.isAvailable) {
      return { storageAvailable: false };
    }

    try {
      const preferences = localStorage.getItem(STORAGE_KEYS.METRICS_PREFERENCES);
      const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);

      return {
        storageAvailable: true,
        hasPreferences: !!preferences,
        hasLastSync: !!lastSync,
        hasUserId: !!userId,
        lastSync: lastSync ? new Date(lastSync).toISOString() : null,
        userId: userId ? userId.substring(0, 8) + '...' : 'anonymous',
        needsSync: this.needsSync(),
        dataAge: preferences ? Date.now() - new Date(JSON.parse(preferences).updated_at).getTime() : null
      };
    } catch (error) {
      return {
        storageAvailable: true,
        error: error.message
      };
    }
  }
}

// AIDEV-NOTE: Instância singleton
export const metricsStorageService = new MetricsStorageService();

// AIDEV-NOTE: Exports para uso no hook
export type { LocalMetricsData };
export { CONFIG as STORAGE_CONFIG };
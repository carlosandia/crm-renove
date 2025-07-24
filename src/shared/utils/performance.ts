/**
 * ============================================
 * 🔧 PERFORMANCE MONITORING
 * ============================================
 * 
 * Utilitários para monitoramento de performance de hooks e componentes.
 * Coleta métricas de cache hit ratio, tempo de execução, etc.
 */

// ============================================
// TYPES E INTERFACES
// ============================================

interface PerformanceMetric {
  name: string;
  category: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'ratio';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface HookPerformanceData {
  hookName: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  cacheHit?: boolean;
  dataSize?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRatio: number;
  totalRequests: number;
  averageResponseTime: number;
  lastUpdated: number;
}

// ============================================
// PERFORMANCE TRACKER CLASS
// ============================================

class PerformanceTracker {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private cacheMetrics: Map<string, CacheMetrics> = new Map();
  private activeTimers: Map<string, HookPerformanceData> = new Map();

  // ============================================
  // TIMER METHODS
  // ============================================

  /**
   * 🔧 Start Timer - Inicia cronômetro para operação
   */
  startTimer(hookName: string, operation: string, metadata?: Record<string, unknown>): string {
    const timerId = `${hookName}_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const timerData: HookPerformanceData = {
      hookName,
      operation,
      startTime: performance.now(),
      metadata
    };

    this.activeTimers.set(timerId, timerData);
    
    return timerId;
  }

  /**
   * 🔧 End Timer - Finaliza cronômetro e registra métrica
   */
  endTimer(
    timerId: string, 
    options?: {
      cacheHit?: boolean;
      dataSize?: number;
      error?: string;
      metadata?: Record<string, unknown>;
    }
  ): number | null {
    const timerData = this.activeTimers.get(timerId);
    
    if (!timerData) {
      console.warn(`⚠️ [PerformanceTracker] Timer não encontrado: ${timerId}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - timerData.startTime;

    // Atualizar dados do timer
    timerData.endTime = endTime;
    timerData.duration = duration;
    if (options) {
      Object.assign(timerData, options);
    }

    // Registrar métrica
    this.recordMetric({
      name: `${timerData.hookName}_${timerData.operation}_duration`,
      category: 'hook_performance',
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      metadata: {
        ...timerData.metadata,
        ...options?.metadata,
        hookName: timerData.hookName,
        operation: timerData.operation,
        cacheHit: options?.cacheHit,
        dataSize: options?.dataSize,
        hasError: !!options?.error
      }
    });

    // Atualizar métricas de cache se aplicável
    if (typeof options?.cacheHit === 'boolean') {
      this.updateCacheMetrics(timerData.hookName, options.cacheHit, duration);
    }

    // Remover timer ativo
    this.activeTimers.delete(timerId);

    return duration;
  }

  /**
   * 🔧 Measure Async - Mede operação assíncrona automaticamente
   */
  async measureAsync<T>(
    hookName: string,
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const timerId = this.startTimer(hookName, operation, metadata);
    
    try {
      const result = await fn();
      
      // Calcular tamanho dos dados se possível
      const dataSize = this.calculateDataSize(result);
      
      this.endTimer(timerId, { 
        dataSize,
        metadata: { success: true }
      });
      
      return result;
    } catch (error) {
      this.endTimer(timerId, { 
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { success: false }
      });
      
      throw error;
    }
  }

  // ============================================
  // CACHE METRICS
  // ============================================

  /**
   * 🔧 Record Cache Hit - Registra hit de cache
   */
  recordCacheHit(cacheKey: string, responseTime: number): void {
    this.updateCacheMetrics(cacheKey, true, responseTime);
  }

  /**
   * 🔧 Record Cache Miss - Registra miss de cache
   */
  recordCacheMiss(cacheKey: string, responseTime: number): void {
    this.updateCacheMetrics(cacheKey, false, responseTime);
  }

  /**
   * 🔧 Update Cache Metrics - Atualiza métricas de cache
   */
  private updateCacheMetrics(key: string, isHit: boolean, responseTime: number): void {
    const current = this.cacheMetrics.get(key) || {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      lastUpdated: Date.now()
    };

    if (isHit) {
      current.hits++;
    } else {
      current.misses++;
    }

    current.totalRequests = current.hits + current.misses;
    current.hitRatio = current.totalRequests > 0 ? current.hits / current.totalRequests : 0;
    
    // Calcular média móvel do tempo de resposta
    current.averageResponseTime = (current.averageResponseTime + responseTime) / 2;
    current.lastUpdated = Date.now();

    this.cacheMetrics.set(key, current);

    // Registrar como métrica geral
    this.recordMetric({
      name: `cache_hit_ratio_${key}`,
      category: 'cache_performance',
      value: current.hitRatio,
      unit: 'ratio',
      timestamp: Date.now(),
      metadata: {
        cacheKey: key,
        totalRequests: current.totalRequests,
        averageResponseTime: current.averageResponseTime
      }
    });
  }

  // ============================================
  // METRIC RECORDING
  // ============================================

  /**
   * 🔧 Record Metric - Registra métrica customizada
   */
  recordMetric(metric: PerformanceMetric): void {
    const categoryMetrics = this.metrics.get(metric.category) || [];
    categoryMetrics.push(metric);
    
    // Manter apenas últimas 100 métricas por categoria
    if (categoryMetrics.length > 100) {
      categoryMetrics.shift();
    }
    
    this.metrics.set(metric.category, categoryMetrics);

    // Log em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 [Performance] ${metric.name}: ${metric.value}${metric.unit}`, metric.metadata);
    }
  }

  // ============================================
  // ANALYTICS E REPORTING
  // ============================================

  /**
   * 🔧 Get Metrics Summary - Obtém resumo de métricas
   */
  getMetricsSummary(category?: string): Record<string, any> {
    const categories = category ? [category] : Array.from(this.metrics.keys());
    const summary: Record<string, any> = {};

    for (const cat of categories) {
      const metrics = this.metrics.get(cat) || [];
      
      if (metrics.length === 0) {
        summary[cat] = { count: 0 };
        continue;
      }

      const values = metrics.map(m => m.value);
      const latest = metrics[metrics.length - 1];

      summary[cat] = {
        count: metrics.length,
        latest: latest.value,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        unit: latest.unit,
        lastUpdated: latest.timestamp
      };
    }

    return summary;
  }

  /**
   * 🔧 Get Cache Summary - Obtém resumo de cache
   */
  getCacheSummary(): Record<string, CacheMetrics> {
    return Object.fromEntries(this.cacheMetrics.entries());
  }

  /**
   * 🔧 Get Hook Performance - Obtém performance de hook específico
   */
  getHookPerformance(hookName: string): {
    averageDuration: number;
    totalOperations: number;
    cacheHitRatio: number;
    errorRate: number;
  } {
    const hookMetrics = Array.from(this.metrics.values())
      .flat()
      .filter(m => m.metadata?.hookName === hookName);

    if (hookMetrics.length === 0) {
      return {
        averageDuration: 0,
        totalOperations: 0,
        cacheHitRatio: 0,
        errorRate: 0
      };
    }

    const durations = hookMetrics
      .filter(m => m.name.includes('duration'))
      .map(m => m.value);

    const cacheHits = hookMetrics.filter(m => m.metadata?.cacheHit === true).length;
    const cacheTotal = hookMetrics.filter(m => typeof m.metadata?.cacheHit === 'boolean').length;
    const errors = hookMetrics.filter(m => m.metadata?.hasError === true).length;

    return {
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      totalOperations: hookMetrics.length,
      cacheHitRatio: cacheTotal > 0 ? cacheHits / cacheTotal : 0,
      errorRate: hookMetrics.length > 0 ? errors / hookMetrics.length : 0
    };
  }

  /**
   * 🔧 Export Metrics - Exporta métricas para análise
   */
  exportMetrics(): {
    metrics: Record<string, PerformanceMetric[]>;
    cache: Record<string, CacheMetrics>;
    summary: Record<string, any>;
    exportedAt: string;
  } {
    return {
      metrics: Object.fromEntries(this.metrics.entries()),
      cache: this.getCacheSummary(),
      summary: this.getMetricsSummary(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * 🔧 Clear Metrics - Limpa métricas (útil para testes)
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.cacheMetrics.clear();
    this.activeTimers.clear();
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * 🔧 Calculate Data Size - Calcula tamanho dos dados
   */
  private calculateDataSize(data: unknown): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  /**
   * 🔧 Get Memory Usage - Obtém uso de memória (se disponível)
   */
  getMemoryUsage(): Record<string, number> | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }
    return null;
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

const performanceTracker = new PerformanceTracker();

// ============================================
// REACT HOOKS PARA PERFORMANCE
// ============================================

/**
 * 🔧 usePerformanceMonitor - Hook para monitorar performance
 */
export function usePerformanceMonitor(hookName: string) {
  return {
    measureAsync: <T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, unknown>) =>
      performanceTracker.measureAsync(hookName, operation, fn, metadata),
    
    startTimer: (operation: string, metadata?: Record<string, unknown>) =>
      performanceTracker.startTimer(hookName, operation, metadata),
    
    endTimer: (timerId: string, options?: { cacheHit?: boolean; dataSize?: number; error?: string }) =>
      performanceTracker.endTimer(timerId, options),
    
    recordCacheHit: (responseTime: number) =>
      performanceTracker.recordCacheHit(hookName, responseTime),
    
    recordCacheMiss: (responseTime: number) =>
      performanceTracker.recordCacheMiss(hookName, responseTime),
    
    getPerformance: () =>
      performanceTracker.getHookPerformance(hookName)
  };
}

// ============================================
// EXPORTS
// ============================================

export {
  performanceTracker,
  PerformanceTracker
};

export type {
  PerformanceMetric,
  HookPerformanceData,
  CacheMetrics
};
/**
 * Performance Metrics Centralizadas
 * 
 * Sistema centralizado para tracking de performance em toda a aplicação,
 * incluindo client factory, operações de oportunidade, bypass de triggers,
 * e smart caching.
 */

import { logger } from './logger';

// ================================================================================
// TYPES E INTERFACES
// ================================================================================

interface MetricEntry {
  name: string;
  category: 'client-factory' | 'opportunity' | 'bypass' | 'cache' | 'validation' | 'api';
  value: number;
  unit: 'ms' | 'count' | 'bytes' | 'percentage';
  timestamp: number;
  context?: Record<string, any>;
}

interface PerformanceSummary {
  category: string;
  totalOperations: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
  lastOperation: number;
}

// ================================================================================
// GLOBAL METRICS STORAGE
// ================================================================================

class PerformanceTracker {
  private metrics: Map<string, MetricEntry[]> = new Map();
  private summaries: Map<string, PerformanceSummary> = new Map();
  private maxHistorySize = 100; // Manter últimas 100 operações por categoria

  // ✅ Registrar nova métrica
  record(entry: Omit<MetricEntry, 'timestamp'>): void {
    const fullEntry: MetricEntry = {
      ...entry,
      timestamp: Date.now()
    };

    const key = `${entry.category}:${entry.name}`;
    const existing = this.metrics.get(key) || [];
    
    // Manter apenas as últimas N entradas
    const updated = [...existing.slice(-(this.maxHistorySize - 1)), fullEntry];
    this.metrics.set(key, updated);

    // Atualizar sumário
    this.updateSummary(entry.category, fullEntry);

    // Log estruturado apenas em desenvolvimento
    if (import.meta.env.DEV) {
      logger.performance(`Métrica registrada: ${entry.name}`, {
        category: entry.category,
        value: entry.value,
        unit: entry.unit,
        context: entry.context
      });
    }
  }

  // ✅ Atualizar sumário da categoria
  private updateSummary(category: string, entry: MetricEntry): void {
    const categoryKey = category;
    const allMetrics = Array.from(this.metrics.entries())
      .filter(([key]) => key.startsWith(`${category}:`))
      .flatMap(([, entries]) => entries);

    if (allMetrics.length === 0) return;

    const durations = allMetrics
      .filter(m => m.unit === 'ms')
      .map(m => m.value);

    const successes = allMetrics
      .filter(m => m.context?.success === true).length;

    const summary: PerformanceSummary = {
      category,
      totalOperations: allMetrics.length,
      avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      successRate: allMetrics.length > 0 ? (successes / allMetrics.length) * 100 : 0,
      lastOperation: entry.timestamp
    };

    this.summaries.set(categoryKey, summary);
  }

  // ✅ Obter métricas de uma categoria
  getMetrics(category: string): MetricEntry[] {
    return Array.from(this.metrics.entries())
      .filter(([key]) => key.startsWith(`${category}:`))
      .flatMap(([, entries]) => entries);
  }

  // ✅ Obter sumário de uma categoria  
  getSummary(category: string): PerformanceSummary | undefined {
    return this.summaries.get(category);
  }

  // ✅ Obter todas as métricas
  getAllMetrics(): Record<string, MetricEntry[]> {
    const result: Record<string, MetricEntry[]> = {};
    
    for (const [key, entries] of this.metrics.entries()) {
      result[key] = entries;
    }
    
    return result;
  }

  // ✅ Obter todos os sumários
  getAllSummaries(): Record<string, PerformanceSummary> {
    const result: Record<string, PerformanceSummary> = {};
    
    for (const [key, summary] of this.summaries.entries()) {
      result[key] = summary;
    }
    
    return result;
  }

  // ✅ Limpar métricas antigas
  cleanup(maxAgeMs: number = 30 * 60 * 1000): void { // 30 minutos por padrão
    const cutoff = Date.now() - maxAgeMs;
    let cleanedCount = 0;

    for (const [key, entries] of this.metrics.entries()) {
      const filtered = entries.filter(entry => entry.timestamp > cutoff);
      
      if (filtered.length !== entries.length) {
        this.metrics.set(key, filtered);
        cleanedCount += entries.length - filtered.length;
      }
    }

    if (cleanedCount > 0) {
      logger.performance(`Limpeza de métricas concluída: ${cleanedCount} entradas removidas`);
    }
  }

  // ✅ Gerar relatório de performance
  generateReport(): string {
    const summaries = this.getAllSummaries();
    const lines = ['📊 Performance Report', '=================='];

    for (const [category, summary] of Object.entries(summaries)) {
      lines.push('');
      lines.push(`🔷 ${category.toUpperCase()}`);
      lines.push(`  Total Operations: ${summary.totalOperations}`);
      lines.push(`  Average Duration: ${summary.avgDuration.toFixed(2)}ms`);
      lines.push(`  Min/Max Duration: ${summary.minDuration.toFixed(2)}ms / ${summary.maxDuration.toFixed(2)}ms`);
      lines.push(`  Success Rate: ${summary.successRate.toFixed(1)}%`);
      lines.push(`  Last Operation: ${new Date(summary.lastOperation).toLocaleTimeString()}`);
    }

    return lines.join('\n');
  }
}

// ================================================================================
// GLOBAL INSTANCE
// ================================================================================

export const performanceTracker = new PerformanceTracker();

// ================================================================================
// HELPER FUNCTIONS
// ================================================================================

// ✅ Registrar tempo de operação
export function recordTiming(
  category: MetricEntry['category'], 
  name: string, 
  duration: number, 
  context?: Record<string, any>
): void {
  performanceTracker.record({
    name,
    category,
    value: duration,
    unit: 'ms',
    context
  });
}

// ✅ Registrar contador
export function recordCount(
  category: MetricEntry['category'], 
  name: string, 
  count: number, 
  context?: Record<string, any>
): void {
  performanceTracker.record({
    name,
    category,
    value: count,
    unit: 'count',
    context
  });
}

// ✅ Registrar taxa de sucesso
export function recordSuccessRate(
  category: MetricEntry['category'], 
  name: string, 
  rate: number, 
  context?: Record<string, any>
): void {
  performanceTracker.record({
    name,
    category,
    value: rate,
    unit: 'percentage',
    context
  });
}

// ✅ Wrapper para medir tempo de execução
export async function measureAsync<T>(
  category: MetricEntry['category'],
  name: string,
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - startTime;
    
    recordTiming(category, name, duration, { 
      ...context, 
      success: true 
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    recordTiming(category, name, duration, { 
      ...context, 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw error;
  }
}

// ✅ Debug: Mostrar relatório de performance
export function showPerformanceReport(): void {
  console.log(performanceTracker.generateReport());
}

// ================================================================================
// AUTO-CLEANUP
// ================================================================================

// Limpeza automática a cada 5 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    performanceTracker.cleanup();
  }, 5 * 60 * 1000);
}

// Debug no desenvolvimento
if (import.meta.env.DEV) {
  if (typeof window !== 'undefined') {
    (window as any).performanceTracker = {
      getMetrics: performanceTracker.getMetrics.bind(performanceTracker),
      getSummary: performanceTracker.getSummary.bind(performanceTracker),
      generateReport: performanceTracker.generateReport.bind(performanceTracker),
      showReport: showPerformanceReport
    };
  }
}
// =====================================================================================
// UTILS: Sistema Global de Log Throttling
// Autor: Claude (Arquiteto Sênior)
// Descrição: Sistema centralizado para evitar spam de logs no console
// =====================================================================================

/**
 * Cache global de logs para throttling
 * Map<logKey, timestamp>
 */
let globalLogCache = new Map<string, number>();

/**
 * Configurações padrão de throttling por tipo de log
 */
const DEFAULT_INTERVALS = {
  error: 1000,      // Erros: 1 segundo
  warning: 2000,    // Warnings: 2 segundos
  info: 3000,       // Info: 3 segundos
  debug: 5000,      // Debug: 5 segundos
  event: 2000,      // Eventos: 2 segundos
  api: 1000,        // API calls: 1 segundo
  performance: 5000 // Performance: 5 segundos
};

/**
 * Tipos de log suportados
 */
type LogType = keyof typeof DEFAULT_INTERVALS;

/**
 * Configuração de throttling por log
 */
interface ThrottleConfig {
  key: string;
  intervalMs?: number;
  logType?: LogType;
}

/**
 * Sistema principal de log throttling
 * 
 * @param message - Mensagem a ser logada
 * @param config - Configuração de throttling (key obrigatório)
 * @param logFunction - Função de log customizada (padrão: console.log)
 * 
 * @example
 * ```typescript
 * // Log básico com throttling
 * throttledLog('🌡️ Carregando configuração...', { key: 'temp-load' });
 * 
 * // Com tipo específico
 * throttledLog('❌ Erro na API', { key: 'api-error', logType: 'error' });
 * 
 * // Com intervalo customizado
 * throttledLog('Debug info', { key: 'debug', intervalMs: 10000 });
 * 
 * // Com função de log customizada
 * throttledLog('Warning!', { key: 'warn' }, console.warn);
 * ```
 */
export function throttledLog(
  message: string, 
  config: ThrottleConfig,
  logFunction: (message: string) => void = console.log
): boolean {
  const { key, intervalMs, logType = 'info' } = config;
  
  if (!key || typeof key !== 'string') {
    console.error('❌ [LogThrottling] Key é obrigatório e deve ser string');
    return false;
  }

  const now = Date.now();
  const lastLog = globalLogCache.get(key) || 0;
  const interval = intervalMs || DEFAULT_INTERVALS[logType];
  
  // Verificar se deve logar
  if (now - lastLog > interval) {
    logFunction(message);
    globalLogCache.set(key, now);
    return true; // Log executado
  }
  
  return false; // Log throttled
}

/**
 * Helpers específicos para cada tipo de log
 */
export const throttledLogger = {
  /**
   * Log de erro com throttling de 1 segundo
   */
  error: (message: string, key: string, intervalMs?: number) => 
    throttledLog(message, { key, intervalMs, logType: 'error' }, console.error),

  /**
   * Log de warning com throttling de 2 segundos
   */
  warn: (message: string, key: string, intervalMs?: number) => 
    throttledLog(message, { key, intervalMs, logType: 'warning' }, console.warn),

  /**
   * Log de info com throttling de 3 segundos
   */
  info: (message: string, key: string, intervalMs?: number) => 
    throttledLog(message, { key, intervalMs, logType: 'info' }, console.log),

  /**
   * Log de debug com throttling de 5 segundos
   */
  debug: (message: string, key: string, intervalMs?: number) => 
    throttledLog(message, { key, intervalMs, logType: 'debug' }, console.log),

  /**
   * Log de eventos com throttling de 2 segundos
   */
  event: (message: string, key: string, intervalMs?: number) => 
    throttledLog(message, { key, intervalMs, logType: 'event' }, console.log),

  /**
   * Log de API com throttling de 1 segundo
   */
  api: (message: string, key: string, intervalMs?: number) => 
    throttledLog(message, { key, intervalMs, logType: 'api' }, console.log),

  /**
   * Log de performance com throttling de 5 segundos
   */
  performance: (message: string, key: string, intervalMs?: number) => 
    throttledLog(message, { key, intervalMs, logType: 'performance' }, console.log)
};

/**
 * Limpar cache de logs (útil para testes ou reset)
 * 
 * @param keys - Chaves específicas para limpar (opcional, limpa tudo se não fornecido)
 */
export function clearLogCache(keys?: string[]): void {
  if (keys && keys.length > 0) {
    keys.forEach(key => globalLogCache.delete(key));
  } else {
    globalLogCache.clear();
  }
}

/**
 * Obter estatísticas do cache de logs
 */
export function getLogCacheStats(): { totalKeys: number; oldestLog: number | null; newestLog: number | null } {
  const values = Array.from(globalLogCache.values());
  
  return {
    totalKeys: globalLogCache.size,
    oldestLog: values.length > 0 ? Math.min(...values) : null,
    newestLog: values.length > 0 ? Math.max(...values) : null
  };
}

/**
 * Configurar limpeza automática do cache (executar a cada 5 minutos)
 * Remove entradas mais antigas que 10 minutos
 */
export function setupAutoCleanup(): void {
  const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutos
  const MAX_AGE = 10 * 60 * 1000; // 10 minutos

  setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    globalLogCache.forEach((timestamp, key) => {
      if (now - timestamp > MAX_AGE) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => globalLogCache.delete(key));
    
    if (keysToDelete.length > 0 && process.env.NODE_ENV === 'development') {
      console.log(`🧹 [LogThrottling] Limpeza automática: ${keysToDelete.length} entradas removidas`);
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Condicionalmente logar apenas em desenvolvimento
 * 
 * @param message - Mensagem a ser logada
 * @param config - Configuração de throttling
 * @param logFunction - Função de log (padrão: console.log)
 */
export function throttledLogDev(
  message: string,
  config: ThrottleConfig,
  logFunction?: (message: string) => void
): boolean {
  if (process.env.NODE_ENV === 'development') {
    return throttledLog(message, config, logFunction);
  }
  return false;
}

/**
 * Sistema de log por componente - útil para debugging específico
 * 
 * @param componentName - Nome do componente
 * @returns Objeto com métodos de log específicos para o componente
 */
export function createComponentLogger(componentName: string) {
  const prefix = `[${componentName}]`;
  
  return {
    info: (message: string, key?: string, intervalMs?: number) => 
      throttledLogger.info(`${prefix} ${message}`, key || `${componentName}-info`, intervalMs),
      
    warn: (message: string, key?: string, intervalMs?: number) => 
      throttledLogger.warn(`${prefix} ${message}`, key || `${componentName}-warn`, intervalMs),
      
    error: (message: string, key?: string, intervalMs?: number) => 
      throttledLogger.error(`${prefix} ${message}`, key || `${componentName}-error`, intervalMs),
      
    debug: (message: string, key?: string, intervalMs?: number) => 
      throttledLogger.debug(`${prefix} ${message}`, key || `${componentName}-debug`, intervalMs),
      
    event: (message: string, key?: string, intervalMs?: number) => 
      throttledLogger.event(`${prefix} ${message}`, key || `${componentName}-event`, intervalMs)
  };
}

// Auto-setup da limpeza quando o módulo for importado
if (typeof window !== 'undefined') {
  setupAutoCleanup();
}
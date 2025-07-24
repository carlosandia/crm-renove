/**
 * ============================================
 * 🔧 SISTEMA DE LOGS CENTRALIZADO
 * ============================================
 * 
 * Sistema unificado de logs com níveis configuráveis
 * Usado por toda a aplicação para logs consistentes
 * AIDEV-NOTE: Centraliza configuração de logs para toda aplicação
 */

// ✅ TIPOS DE LOG LEVELS
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

// ✅ CONFIGURAÇÃO GLOBAL
const LOG_LEVEL = (import.meta.env.VITE_LOG_LEVEL || 'warn') as LogLevel;
const IS_DEV = import.meta.env.DEV;
const IS_PROD = import.meta.env.PROD;

// ✅ HIERARQUIA DE LOG LEVELS
const LOG_HIERARCHY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
};

/**
 * ✅ CRIADOR DE LOGGER COM CONTEXTO
 */
export const createLogger = (context: string) => {
  const currentLevel = LOG_HIERARCHY[LOG_LEVEL] || LOG_HIERARCHY.warn;

  return {
    debug: (message: string, ...args: any[]) => {
      if (LOG_HIERARCHY.debug >= currentLevel) {
        console.log(`🔍 [${context}] ${message}`, ...args);
      }
    },
    info: (message: string, ...args: any[]) => {
      if (LOG_HIERARCHY.info >= currentLevel) {
        console.log(`ℹ️ [${context}] ${message}`, ...args);
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (LOG_HIERARCHY.warn >= currentLevel) {
        console.warn(`⚠️ [${context}] ${message}`, ...args);
      }
    },
    error: (message: string, ...args: any[]) => {
      if (LOG_HIERARCHY.error >= currentLevel) {
        console.error(`❌ [${context}] ${message}`, ...args);
      }
    },
    // ✅ MÉTODOS AUXILIARES
    time: (label: string) => {
      if (LOG_HIERARCHY.debug >= currentLevel) {
        console.time(`⏱️ [${context}] ${label}`);
      }
    },
    timeEnd: (label: string) => {
      if (LOG_HIERARCHY.debug >= currentLevel) {
        console.timeEnd(`⏱️ [${context}] ${label}`);
      }
    },
    group: (label: string) => {
      if (LOG_HIERARCHY.debug >= currentLevel) {
        console.group(`📁 [${context}] ${label}`);
      }
    },
    groupEnd: () => {
      if (LOG_HIERARCHY.debug >= currentLevel) {
        console.groupEnd();
      }
    }
  };
};

/**
 * ✅ LOGGER GLOBAL PARA CASOS SIMPLES
 */
export const logger = createLogger('Global');

/**
 * ✅ CONFIGURAÇÕES ÚTEIS
 */
export const logConfig = {
  level: LOG_LEVEL,
  isDev: IS_DEV,
  isProd: IS_PROD,
  isVerbose: LOG_LEVEL === 'debug',
  isQuiet: LOG_LEVEL === 'silent'
};

/**
 * ✅ THROTTLING HELPER PARA LOGS REPETITIVOS
 */
const throttleCache = new Map<string, number>();

export const throttledLog = (
  key: string, 
  logFn: () => void, 
  intervalMs: number = 5000
) => {
  const now = Date.now();
  const lastLog = throttleCache.get(key) || 0;
  
  if (now - lastLog > intervalMs) {
    logFn();
    throttleCache.set(key, now);
  }
};

/**
 * ✅ PERFORMANCE LOGGER
 */
export const perfLogger = createLogger('Performance');

export const measurePerformance = <T>(
  operation: string,
  fn: () => T | Promise<T>
): T | Promise<T> => {
  if (LOG_LEVEL === 'debug') {
    const start = performance.now();
    perfLogger.time(operation);
    
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const end = performance.now();
        perfLogger.timeEnd(operation);
        perfLogger.debug(`${operation} took ${(end - start).toFixed(2)}ms`);
      });
    } else {
      const end = performance.now();
      perfLogger.timeEnd(operation);
      perfLogger.debug(`${operation} took ${(end - start).toFixed(2)}ms`);
      return result;
    }
  }
  
  return fn();
};

export default logger;
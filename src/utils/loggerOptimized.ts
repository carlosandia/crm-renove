// ============================================
// SISTEMA DE LOGGING OTIMIZADO COM ENVIRONMENT CONFIG
// Integrado com sistema de configuração por ambiente
// ============================================

import { environmentConfig, currentEnvironment } from '../config/environment';

// ============================================
// TYPES E INTERFACES
// ============================================

type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'performance';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  timestamp: string;
}

interface PerformanceEntry {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

interface LoggerConfig {
  enabled: boolean;
  logLevel: LogLevel;
  performanceMonitoring: boolean;
  throttleMs: number;
  maxBufferSize: number;
}

// ============================================
// LOG LEVEL HIERARCHY
// ============================================

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  'silent': 0,
  'error': 1,
  'warn': 2,
  'info': 3,
  'debug': 4,
  'performance': 5
};

// ============================================
// CONFIGURAÇÃO DO LOGGER
// ============================================

class OptimizedLogger {
  private static instance: OptimizedLogger;
  private config: LoggerConfig;
  private performanceTimers: Map<string, PerformanceEntry> = new Map();
  private logBuffer: LogEntry[] = [];
  private throttledLogs: Map<string, number> = new Map();

  private constructor() {
    // Configuração baseada no environment atual
    this.config = this.getEnvironmentConfig();
    
    // Log da inicialização apenas se debug estiver ativo
    if (this.shouldLog('debug')) {
      console.debug('🔧 [LOGGER] Logger inicializado com configuração:', {
        environment: currentEnvironment,
        config: this.config
      });
    }
  }

  static getInstance(): OptimizedLogger {
    if (!OptimizedLogger.instance) {
      OptimizedLogger.instance = new OptimizedLogger();
    }
    return OptimizedLogger.instance;
  }

  // ============================================
  // CONFIGURAÇÃO BASEADA EM AMBIENTE
  // ============================================

  private getEnvironmentConfig(): LoggerConfig {
    const envLogLevel = environmentConfig.debug.logLevel as LogLevel;
    
    return {
      enabled: environmentConfig.debug.enabled,
      logLevel: envLogLevel || 'warn',
      performanceMonitoring: environmentConfig.debug.performanceMonitoring,
      throttleMs: currentEnvironment === 'development' ? 100 : 1000,
      maxBufferSize: currentEnvironment === 'development' ? 200 : 50
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled || level === 'silent') return false;
    
    const currentPriority = LOG_LEVEL_PRIORITY[this.config.logLevel];
    const requestedPriority = LOG_LEVEL_PRIORITY[level];
    
    return requestedPriority <= currentPriority;
  }

  private shouldThrottle(key: string): boolean {
    const now = Date.now();
    const lastLog = this.throttledLogs.get(key);
    
    if (!lastLog || (now - lastLog) >= this.config.throttleMs) {
      this.throttledLogs.set(key, now);
      return false;
    }
    
    return true;
  }

  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.shouldLog('debug')) {
      console.debug('🔧 [LOGGER] Configuração atualizada:', this.config);
    }
  }

  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  // ============================================
  // MÉTODOS DE LOGGING OTIMIZADOS COM THROTTLING
  // ============================================

  debug(message: string, context?: string, data?: unknown): void {
    if (!this.shouldLog('debug')) return;
    
    const key = `debug-${context}-${message}`;
    if (this.shouldThrottle(key)) return;
    
    this.addToBuffer('debug', message, context, data);
    console.debug(`🔍 [${context || 'DEBUG'}] ${message}`, data || '');
  }

  info(message: string, context?: string, data?: unknown): void {
    if (!this.shouldLog('info')) return;
    
    const key = `info-${context}-${message}`;
    if (this.shouldThrottle(key)) return;
    
    this.addToBuffer('info', message, context, data);
    console.info(`ℹ️ [${context || 'INFO'}] ${message}`, data || '');
  }

  warn(message: string, context?: string, data?: unknown): void {
    if (!this.shouldLog('warn')) return;
    
    const key = `warn-${context}-${message}`;
    if (this.shouldThrottle(key)) return;
    
    this.addToBuffer('warn', message, context, data);
    console.warn(`⚠️ [${context || 'WARN'}] ${message}`, data || '');
  }

  error(message: string, context?: string, data?: unknown): void {
    // Erros sempre são logados se o nível permitir
    if (!this.shouldLog('error')) return;
    
    // Erros críticos não sofrem throttling
    this.addToBuffer('error', message, context, data);
    console.error(`❌ [${context || 'ERROR'}] ${message}`, data || '');
  }

  performance(message: string, context?: string, data?: unknown): void {
    if (!this.shouldLog('performance') || !this.config.performanceMonitoring) return;
    
    const key = `perf-${context}-${message}`;
    if (this.shouldThrottle(key)) return;
    
    this.addToBuffer('performance', message, context, data);
    console.info(`⚡ [${context || 'PERFORMANCE'}] ${message}`, data || '');
  }

  // ============================================
  // PERFORMANCE TIMING OTIMIZADO
  // ============================================

  startTimer(name: string, context?: string): void {
    if (!this.shouldLog('performance') || !this.config.performanceMonitoring) return;
    
    // Verificar se timer já existe para evitar duplicação
    if (this.performanceTimers.has(name)) {
      this.warn(`Timer "${name}" já existe - ignorando duplicata`, 'PERFORMANCE');
      return;
    }
    
    const entry: PerformanceEntry = {
      name,
      startTime: performance.now()
    };
    
    this.performanceTimers.set(name, entry);
    
    // Console.time apenas em development
    if (currentEnvironment === 'development') {
      console.time(`⏱️ [${context || 'PERF'}] ${name}`);
    }
  }

  endTimer(name: string, context?: string): number | null {
    if (!this.shouldLog('performance') || !this.config.performanceMonitoring) return null;
    
    const entry = this.performanceTimers.get(name);
    if (!entry) {
      this.warn(`Timer "${name}" não foi encontrado`, 'PERFORMANCE');
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - entry.startTime;
    
    entry.endTime = endTime;
    entry.duration = duration;
    
    // Console.timeEnd apenas em development
    if (currentEnvironment === 'development') {
      console.timeEnd(`⏱️ [${context || 'PERF'}] ${name}`);
    }
    
    // Log performance apenas se for significativo (> 100ms) ou em debug
    if (duration > 100 || this.shouldLog('debug')) {
      this.performance(`Operação "${name}" completada em ${duration.toFixed(2)}ms`, context);
    }
    
    this.performanceTimers.delete(name);
    return duration;
  }

  clearTimer(name: string): void {
    if (!this.shouldLog('performance')) return;
    
    if (this.performanceTimers.has(name)) {
      this.performanceTimers.delete(name);
      
      // Limpar console.time apenas em development
      if (currentEnvironment === 'development') {
        try {
          console.timeEnd(`⏱️ [PERF] ${name}`);
        } catch (e) {
          // Silenciar erro se console.time não existir
        }
      }
    }
  }

  hasTimer(name: string): boolean {
    return this.performanceTimers.has(name);
  }

  // ============================================
  // LOGGING PARA REACT HOOKS OTIMIZADO
  // ============================================

  debugHook(hookName: string, value: unknown, formatter?: (value: unknown) => string): void {
    if (!this.shouldLog('debug')) return;
    
    const key = `hook-${hookName}`;
    if (this.shouldThrottle(key)) return;
    
    const formattedValue = formatter ? formatter(value) : this.safeStringify(value);
    this.debug(`Hook: ${hookName}`, 'REACT_HOOK', formattedValue);
  }

  // ============================================
  // DEBOUNCED LOGGING OTIMIZADO
  // ============================================

  private debouncedLogs: Map<string, NodeJS.Timeout> = new Map();

  debouncedLog(
    key: string,
    level: LogLevel,
    message: string,
    context?: string,
    data?: unknown,
    delay: number = 1000
  ): void {
    if (!this.shouldLog(level)) return;

    // Cancelar log anterior se existir
    const existingTimeout = this.debouncedLogs.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Criar novo timeout
    const timeout = setTimeout(() => {
      this[level](message, context, data);
      this.debouncedLogs.delete(key);
    }, delay);

    this.debouncedLogs.set(key, timeout);
  }

  // ============================================
  // UTILITÁRIOS AUXILIARES
  // ============================================

  private safeStringify(value: unknown): string {
    try {
      if (value === undefined) return 'undefined';
      if (value === null) return 'null';
      if (typeof value === 'string') return value;
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return `[Circular/Error: ${String(error)}]`;
    }
  }

  // ============================================
  // GRUPAMENTO DE LOGS OTIMIZADO
  // ============================================

  group(label: string, collapsed: boolean = false): void {
    if (!this.shouldLog('debug')) return;
    
    if (collapsed) {
      console.groupCollapsed(`📁 ${label}`);
    } else {
      console.group(`📁 ${label}`);
    }
  }

  groupEnd(): void {
    if (!this.shouldLog('debug')) return;
    console.groupEnd();
  }

  // ============================================
  // UTILITÁRIOS INTERNOS OTIMIZADOS
  // ============================================

  private addToBuffer(level: LogLevel, message: string, context?: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      message,
      context,
      data: this.safeStringify(data),
      timestamp: new Date().toISOString()
    };

    this.logBuffer.push(entry);

    // Manter buffer limitado
    if (this.logBuffer.length > this.config.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  // ============================================
  // MÉTODOS DE ANÁLISE OTIMIZADOS
  // ============================================

  getLogBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logBuffer.filter(entry => entry.level === level);
  }

  getLogsByContext(context: string): LogEntry[] {
    return this.logBuffer.filter(entry => entry.context === context);
  }

  clearBuffer(): void {
    this.logBuffer = [];
    if (this.shouldLog('debug')) {
      console.debug('🧹 [LOGGER] Buffer limpo');
    }
  }

  getActiveTimers(): string[] {
    return Array.from(this.performanceTimers.keys());
  }

  getStats(): { 
    totalLogs: number; 
    activeTimers: number; 
    debouncedLogs: number;
    throttledLogs: number;
    bufferSize: number;
  } {
    return {
      totalLogs: this.logBuffer.length,
      activeTimers: this.performanceTimers.size,
      debouncedLogs: this.debouncedLogs.size,
      throttledLogs: this.throttledLogs.size,
      bufferSize: this.config.maxBufferSize
    };
  }

  // ============================================
  // CLEANUP OTIMIZADO
  // ============================================

  cleanup(): void {
    // Limpar timeouts debounced
    this.debouncedLogs.forEach(timeout => clearTimeout(timeout));
    this.debouncedLogs.clear();
    
    // Limpar performance timers
    this.performanceTimers.clear();
    
    // Limpar throttling cache
    this.throttledLogs.clear();
    
    // Limpar buffer
    this.clearBuffer();
    
    if (this.shouldLog('debug')) {
      console.debug('🧹 [LOGGER] Cleanup completo executado');
    }
  }
}

// ============================================
// INSTÂNCIA SINGLETON E EXPORTS OTIMIZADOS
// ============================================

export const logger = OptimizedLogger.getInstance();

// Exports de conveniência com contexto this preservado
export const debug = (...args: Parameters<typeof logger.debug>) => logger.debug(...args);
export const info = (...args: Parameters<typeof logger.info>) => logger.info(...args);
export const warn = (...args: Parameters<typeof logger.warn>) => logger.warn(...args);
export const error = (...args: Parameters<typeof logger.error>) => logger.error(...args);
export const performance = (...args: Parameters<typeof logger.performance>) => logger.performance(...args);
export const startTimer = (...args: Parameters<typeof logger.startTimer>) => logger.startTimer(...args);
export const endTimer = (...args: Parameters<typeof logger.endTimer>) => logger.endTimer(...args);
export const clearTimer = (...args: Parameters<typeof logger.clearTimer>) => logger.clearTimer(...args);
export const hasTimer = (...args: Parameters<typeof logger.hasTimer>) => logger.hasTimer(...args);
export const debugHook = (...args: Parameters<typeof logger.debugHook>) => logger.debugHook(...args);
export const debouncedLog = (...args: Parameters<typeof logger.debouncedLog>) => logger.debouncedLog(...args);
export const group = (...args: Parameters<typeof logger.group>) => logger.group(...args);
export const groupEnd = (...args: Parameters<typeof logger.groupEnd>) => logger.groupEnd(...args);

// Novos exports para configuração
export const updateLoggerConfig = (...args: Parameters<typeof logger.updateConfig>) => logger.updateConfig(...args);
export const getLoggerConfig = () => logger.getConfig();
export const getLoggerStats = () => logger.getStats();

// ============================================
// HOOKS ESPECÍFICOS PARA REACT OTIMIZADOS
// ============================================

import { useDebugValue } from 'react';

export function useLoggerDebug<T>(value: T, label: string): void {
  // AIDEV-NOTE: Usar método público logger.debug ao invés de métodos privados
  useDebugValue(value, (val) => {
    try {
      if (val === undefined) return 'undefined';
      if (val === null) return 'null';
      if (typeof val === 'string') return val;
      return JSON.stringify(val, null, 2);
    } catch (error) {
      return `[Circular/Error: ${String(error)}]`;
    }
  });
  
  // Usar método público debugHook que já existe
  if (logger.getConfig().enabled) {
    logger.debugHook(label, value);
  }
}

// ============================================
// PADRÕES DE CONTEXTO ESPECÍFICOS OTIMIZADOS
// ============================================

export const LogContext = {
  PIPELINE: 'PIPELINE',
  LEADS: 'LEADS',
  AUTH: 'AUTH',
  API: 'API',
  HOOKS: 'HOOKS',
  PERFORMANCE: 'PERFORMANCE',
  VALIDATION: 'VALIDATION',
  CACHE: 'CACHE',
  EVENT_MANAGER: 'EVENT_MANAGER',
  METRICS_STORAGE: 'METRICS_STORAGE'
} as const;

export type LogContextType = typeof LogContext[keyof typeof LogContext];

// ============================================
// UTILITÁRIOS DE CONVENIÊNCIA OTIMIZADOS
// ============================================

export function logApiCall(method: string, url: string, data?: unknown): void {
  logger.info(`${method.toUpperCase()} ${url}`, LogContext.API, data);
}

export function logApiResponse(method: string, url: string, status: number, data?: unknown): void {
  const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
  logger[level](`${method.toUpperCase()} ${url} - ${status}`, LogContext.API, data);
}

export function logValidationError(field: string, error: string, data?: unknown): void {
  logger.warn(`Validation failed for ${field}: ${error}`, LogContext.VALIDATION, data);
}

export function logPerformanceMetric(operation: string, duration: number, threshold: number = 100): void {
  const level = duration > threshold ? 'warn' : 'performance';
  logger[level](`${operation} took ${duration.toFixed(2)}ms`, LogContext.PERFORMANCE);
}

// ============================================
// FEATURE FLAGS E CONTROLE DINÂMICO
// ============================================

export const LogFeatures = {
  // Feature flags para controle granular de logging
  ENABLE_API_LOGGING: environmentConfig.debug.enabled,
  ENABLE_PERFORMANCE_LOGGING: environmentConfig.debug.performanceMonitoring,
  ENABLE_EVENT_MANAGER_LOGGING: currentEnvironment === 'development',
  ENABLE_METRICS_STORAGE_LOGGING: currentEnvironment === 'development',
  ENABLE_HOOK_DEBUGGING: currentEnvironment === 'development'
} as const;

// Função para verificar feature flags
export function isLogFeatureEnabled(feature: keyof typeof LogFeatures): boolean {
  return LogFeatures[feature] && logger.getConfig().enabled;
}

// Logging condicional baseado em features
export function logIfEnabled(
  feature: keyof typeof LogFeatures,
  level: LogLevel,
  message: string,
  context?: string,
  data?: unknown
): void {
  if (isLogFeatureEnabled(feature)) {
    logger[level](message, context, data);
  }
}

// ============================================
// EXPORTED TYPE FOR EXTERNAL USAGE
// ============================================

export type { LogLevel, LoggerConfig, LogEntry };
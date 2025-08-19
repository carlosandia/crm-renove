/**
 * Hook useSmartLogger - Sistema Centralizado de Logging Inteligente
 * 
 * ✅ Resolve problema de spam de logs no console durante desenvolvimento
 * ✅ Implementa throttling automático e rate limiting
 * ✅ Modo silencioso configurável via variáveis de ambiente
 * ✅ Suporte a diferentes tipos de log (draft, flush, field, error)
 * 
 * Uso:
 * ```tsx
 * const logger = useSmartLogger('CUSTOM_FIELDS_MANAGER');
 * logger.logDraft(data, 'CREATE');
 * logger.logFlush(data, 'AUTO');
 * logger.logField(data, 'UPDATE');
 * logger.logError(error, 'SAVE');
 * ```
 */

import { useRef, useCallback } from 'react';
import { 
  COMPONENT_LOGGING_CONFIG, 
  shouldLogComponentDebug, 
  getThrottleThreshold 
} from '../config/logging';

type LogType = 'draft' | 'flush' | 'field' | 'error' | 'general';
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogState {
  lastLog: Record<LogType, number>;
  logsThisSecond: number;
  lastSecondReset: number;
}

interface SmartLogger {
  logDraft: (data: any, operation: string) => void;
  logFlush: (data: any, operation: string) => void;
  logField: (data: any, operation: string) => void;
  logError: (error: any, operation: string) => void;
  logGeneral: (data: any, operation: string, level?: LogLevel) => void;
  canLog: (type: LogType, level: LogLevel) => boolean;
  log: (type: LogType, level: LogLevel, message: string, data?: any) => void;
}

/**
 * Hook que retorna um logger inteligente configurado para um componente específico
 */
export const useSmartLogger = (componentKey: keyof typeof COMPONENT_LOGGING_CONFIG): SmartLogger => {
  const config = COMPONENT_LOGGING_CONFIG[componentKey];
  
  const logStateRef = useRef<LogState>({
    lastLog: {
      draft: 0,
      flush: 0,
      field: 0,
      error: 0,
      general: 0
    },
    logsThisSecond: 0,
    lastSecondReset: Date.now()
  });

  // ✅ RATE LIMITING: Resetar contador de logs por segundo
  const resetRateLimitIfNeeded = useCallback(() => {
    const now = Date.now();
    const timeSinceReset = now - logStateRef.current.lastSecondReset;
    
    if (timeSinceReset >= 1000) {
      logStateRef.current.logsThisSecond = 0;
      logStateRef.current.lastSecondReset = now;
    }
  }, []);

  // ✅ THROTTLING: Verificar se pode logar baseado no tipo e throttling
  const canLog = useCallback((type: LogType, level: LogLevel): boolean => {
    if (!config.enabled) return false;
    
    resetRateLimitIfNeeded();
    
    // ✅ RATE LIMITING: Verificar limite de logs por segundo
    const maxLogsPerSecond = (config as any).maxLogsPerSecond || 5;
    if (logStateRef.current.logsThisSecond >= maxLogsPerSecond) {
      return false;
    }

    // ✅ MODO SILENCIOSO: Apenas erros em modo silencioso
    const silentMode = (config as any).silentMode || false;
    if (silentMode && (config as any).onlyErrors && level !== 'error') {
      return false;
    }

    // ✅ THROTTLING: Verificar timing do último log do mesmo tipo
    const now = Date.now();
    const lastLogTime = logStateRef.current.lastLog[type];
    const throttleMs = config.throttleMs || getThrottleThreshold();
    
    return (now - lastLogTime) >= throttleMs;
  }, [config, resetRateLimitIfNeeded]);

  // ✅ LOG GENÉRICO: Função base para todos os tipos de log
  const log = useCallback((type: LogType, level: LogLevel, message: string, data?: any) => {
    if (!canLog(type, level)) return;

    const now = Date.now();
    logStateRef.current.lastLog[type] = now;
    logStateRef.current.logsThisSecond++;

    // ✅ FORMATAÇÃO: Log formatado baseado no nível
    switch (level) {
      case 'debug':
        console.debug(message, data || '');
        break;
      case 'info':
        console.log(message, data || '');
        break;
      case 'warn':
        console.warn(message, data || '');
        break;
      case 'error':
        console.error(message, data || '');
        break;
    }
  }, [canLog]);

  // ✅ LOG DRAFT: Operações de draft (criação, edição de campos)
  const logDraft = useCallback((data: any, operation: string) => {
    const trackDraftOperations = (config as any).trackDraftOperations;
    if (!trackDraftOperations) return;

    const silentMode = (config as any).silentMode || false;
    const message = silentMode 
      ? `🟡 [Draft] ${operation}` 
      : `🟡 [DRAFT-${operation.toUpperCase()}]`;
    
    log('draft', 'info', message, silentMode ? undefined : data);
  }, [config, log]);

  // ✅ LOG FLUSH: Operações de flush (salvar campos no banco)
  const logFlush = useCallback((data: any, operation: string) => {
    const trackFlushOperations = (config as any).trackFlushOperations;
    const onlyMajorOperations = (config as any).onlyMajorOperations;
    
    // ✅ FLUSH sempre é importante - ignorar trackFlushOperations se for major operation
    if (!trackFlushOperations && !onlyMajorOperations) return;

    const silentMode = (config as any).silentMode || false;
    const message = silentMode && onlyMajorOperations
      ? `🚀 [FLUSH-${operation.toUpperCase()}] ${data.savedCount || data.draftFieldsCount || ''} campos`
      : `🚀 [FLUSH-${operation.toUpperCase()}]`;
    
    log('flush', 'info', message, silentMode && onlyMajorOperations ? undefined : data);
  }, [config, log]);

  // ✅ LOG FIELD: Operações CRUD de campos (create, update, delete)
  const logField = useCallback((data: any, operation: string) => {
    const trackFieldCRUD = (config as any).trackFieldCRUD;
    if (!trackFieldCRUD) return;

    const silentMode = (config as any).silentMode || false;
    const message = silentMode 
      ? `💾 [Field] ${operation}` 
      : `💾 [FIELD-${operation.toUpperCase()}]`;
    
    log('field', 'info', message, silentMode ? undefined : data);
  }, [config, log]);

  // ✅ LOG ERROR: Sempre ativo, erros são sempre importantes
  const logError = useCallback((error: any, operation: string) => {
    const message = `❌ [ERROR-${operation.toUpperCase()}]`;
    log('error', 'error', message, error);
  }, [log]);

  // ✅ LOG GENERAL: Log genérico para outras operações
  const logGeneral = useCallback((data: any, operation: string, level: LogLevel = 'info') => {
    const message = `ℹ️ [${operation.toUpperCase()}]`;
    log('general', level, message, data);
  }, [log]);

  return {
    logDraft,
    logFlush,
    logField,
    logError,
    logGeneral,
    canLog,
    log
  };
};

/**
 * Hook simplificado para componentes que só precisam de log básico
 */
export const useBasicLogger = (componentName: string) => {
  const logStateRef = useRef({ lastLog: 0 });
  
  return useCallback((message: string, data?: any, level: LogLevel = 'info') => {
    if (!shouldLogComponentDebug()) return;
    
    const now = Date.now();
    const throttleMs = getThrottleThreshold();
    
    if (now - logStateRef.current.lastLog < throttleMs) return;
    
    const formattedMessage = `[${componentName}] ${message}`;
    
    switch (level) {
      case 'debug':
        console.debug(formattedMessage, data || '');
        break;
      case 'info':
        console.log(formattedMessage, data || '');
        break;
      case 'warn':
        console.warn(formattedMessage, data || '');
        break;
      case 'error':
        console.error(formattedMessage, data || '');
        break;
    }
    
    logStateRef.current.lastLog = now;
  }, [componentName]);
};

export type { SmartLogger, LogType, LogLevel };
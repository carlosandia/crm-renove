/**
 * Utilitários do Sistema de Logging
 * 
 * ✅ Funções auxiliares para configuração e controle de logs
 * ✅ Helpers para diferentes ambientes (desenvolvimento/produção)
 * ✅ Configuração dinâmica baseada em variáveis de ambiente
 */

import { 
  LOGGING_CONFIG, 
  shouldLog, 
  shouldLogComponentDebug,
  shouldLogPerformance 
} from '../config/logging';

/**
 * ✅ CONTROLE DE AMBIENTE: Detectar se logging deve ser ativo
 */
export const shouldEnableLogging = (componentKey?: string): boolean => {
  // Em produção, apenas logs de erro por padrão
  if (LOGGING_CONFIG.IS_PRODUCTION) {
    return shouldLog('error');
  }
  
  // Em desenvolvimento, seguir configurações específicas
  return shouldLogComponentDebug();
};

/**
 * ✅ CONFIGURAÇÃO DINÂMICA: Gerar configuração de logging para componente
 */
export const createComponentLogConfig = (componentKey: string) => {
  const baseConfig = {
    enabled: shouldEnableLogging(componentKey),
    throttleMs: LOGGING_CONFIG.LOG_THROTTLE_MS,
    silentMode: LOGGING_CONFIG.IS_PRODUCTION,
    onlyErrors: LOGGING_CONFIG.IS_PRODUCTION,
    maxLogsPerSecond: LOGGING_CONFIG.IS_PRODUCTION ? 1 : 5,
  };

  // ✅ CONFIGURAÇÕES ESPECÍFICAS por tipo de componente
  switch (componentKey) {
    case 'PIPELINE_CREATOR':
      return {
        ...baseConfig,
        trackTabChanges: shouldLogComponentDebug(),
        trackFormValidation: false, // Muito verboso
        trackPerformance: shouldLogPerformance(),
      };
      
    case 'STAGE_MANAGER':
      return {
        ...baseConfig,
        trackDragAndDrop: false, // Silencioso por padrão
        trackStateChanges: false, // Silencioso por padrão
        suppressRepetitive: true,
        maxLogsPerSecond: 2,
        throttleMs: baseConfig.throttleMs * 3, // Menos frequente
      };
      
    case 'CUSTOM_FIELDS_MANAGER':
      return {
        ...baseConfig,
        trackDraftOperations: false, // Silencioso por padrão
        trackFieldCRUD: shouldLogPerformance(),
        trackFlushOperations: false, // Silencioso por padrão
        onlyMajorOperations: true,
        maxLogsPerSecond: 1,
        throttleMs: baseConfig.throttleMs * 2,
      };
      
    case 'DISTRIBUTION_MANAGER':
      return {
        ...baseConfig,
        trackAlgorithmChanges: shouldLogComponentDebug(),
        trackRuleExecution: shouldLogPerformance(),
      };
      
    default:
      return baseConfig;
  }
};

/**
 * ✅ FORMATAÇÃO: Formatadores de mensagem para diferentes tipos de log
 */
export const formatLogMessage = (
  component: string, 
  operation: string, 
  type: 'draft' | 'flush' | 'field' | 'error' | 'general' = 'general'
): string => {
  const icons = {
    draft: '🟡',
    flush: '🚀', 
    field: '💾',
    error: '❌',
    general: 'ℹ️'
  };

  return `${icons[type]} [${component}] ${operation.toUpperCase()}`;
};

/**
 * ✅ THROTTLING: Helper para controle de rate limiting
 */
export const createThrottler = (throttleMs: number = LOGGING_CONFIG.LOG_THROTTLE_MS) => {
  const lastExecution: Record<string, number> = {};
  
  return (key: string): boolean => {
    const now = Date.now();
    const lastTime = lastExecution[key] || 0;
    
    if (now - lastTime >= throttleMs) {
      lastExecution[key] = now;
      return true;
    }
    
    return false;
  };
};

/**
 * ✅ ANÁLISE: Detectar logs problemáticos em tempo real
 */
export const analyzeLogSpam = () => {
  if (typeof window === 'undefined') return;
  
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  
  const logCounts: Record<string, number> = {};
  const spamThreshold = 10; // Mais que 10 logs similares = spam
  
  const wrapConsoleMethod = (method: typeof console.log, methodName: string) => {
    return (...args: any[]) => {
      const message = args.join(' ');
      const messageKey = message.substring(0, 50); // Primeiros 50 caracteres
      
      logCounts[messageKey] = (logCounts[messageKey] || 0) + 1;
      
      // ✅ DETECÇÃO DE SPAM: Alertar sobre logs repetitivos
      if (logCounts[messageKey] === spamThreshold) {
        console.warn(`🚨 [LogAnalyzer] Detectado spam de logs: "${messageKey}..." (${spamThreshold}+ vezes)`);
      }
      
      // ✅ CHAMAR MÉTODO ORIGINAL apenas se não for spam excessivo
      if (logCounts[messageKey] <= spamThreshold * 2) {
        method.apply(console, args);
      }
    };
  };
  
  // ✅ MONITORAMENTO: Ativar apenas em desenvolvimento
  if (LOGGING_CONFIG.IS_DEVELOPMENT && LOGGING_CONFIG.ENABLE_COMPONENT_DEBUG) {
    console.log = wrapConsoleMethod(originalLog, 'log');
    console.warn = wrapConsoleMethod(originalWarn, 'warn');
    console.error = wrapConsoleMethod(originalError, 'error');
    
    // ✅ RELATÓRIO: Log de estatísticas a cada 30 segundos
    const reportInterval = setInterval(() => {
      const totalLogs = Object.values(logCounts).reduce((sum, count) => sum + count, 0);
      const spamLogs = Object.entries(logCounts).filter(([_, count]) => count > spamThreshold);
      
      if (spamLogs.length > 0) {
        console.warn(`📊 [LogAnalyzer] Total logs: ${totalLogs}, Spam detectado: ${spamLogs.length} tipos`);
      }
    }, 30000);
    
    // ✅ CLEANUP: Limpar interval quando necessário
    window.addEventListener('beforeunload', () => {
      clearInterval(reportInterval);
    });
  }
};

/**
 * ✅ CONFIGURAÇÃO DE AMBIENTE: Helpers para .env
 */
export const getRecommendedEnvConfig = (environment: 'development' | 'production') => {
  const configs = {
    development: {
      VITE_LOG_LEVEL: 'debug',
      VITE_ENABLE_PERFORMANCE_LOGS: 'true',
      VITE_LOG_THROTTLE_MS: '1000',
      VITE_ENABLE_COMPONENT_DEBUG: 'true',
      VITE_ENVIRONMENT: 'development'
    },
    production: {
      VITE_LOG_LEVEL: 'error',
      VITE_ENABLE_PERFORMANCE_LOGS: 'false',
      VITE_LOG_THROTTLE_MS: '5000',
      VITE_ENABLE_COMPONENT_DEBUG: 'false',
      VITE_ENVIRONMENT: 'production'
    }
  };
  
  return configs[environment];
};

/**
 * ✅ EXEMPLO DE USO: Mostrar como usar o sistema de logging
 */
export const loggerUsageExample = () => {
  console.log(`
🎯 EXEMPLO DE USO - Sistema de Logging Centralizado:

1. Importar o hook:
   import { useSmartLogger } from '../hooks/useSmartLogger';

2. Usar no componente:
   const logger = useSmartLogger('CUSTOM_FIELDS_MANAGER');
   
3. Tipos de log disponíveis:
   logger.logDraft(data, 'CREATE');     // 🟡 Draft operations
   logger.logFlush(data, 'AUTO');       // 🚀 Flush operations  
   logger.logField(data, 'UPDATE');     // 💾 Field CRUD
   logger.logError(error, 'SAVE');      // ❌ Errors (sempre ativo)
   logger.logGeneral(data, 'CUSTOM');   // ℹ️ General logs

4. Configurar no .env:
   VITE_LOG_LEVEL=debug
   VITE_ENABLE_COMPONENT_DEBUG=true
   VITE_LOG_THROTTLE_MS=1000
  `);
};

export default {
  shouldEnableLogging,
  createComponentLogConfig,
  formatLogMessage,
  createThrottler,
  analyzeLogSpam,
  getRecommendedEnvConfig,
  loggerUsageExample
};
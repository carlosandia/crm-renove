/**
 * Configurações de Logging do Sistema
 * 
 * Centraliza todas as configurações de logging baseadas em variáveis de ambiente
 * seguindo os padrões documentados no CLAUDE.md
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

// ================================================
// CONFIGURAÇÕES DE AMBIENTE
// ================================================

/**
 * Configurações de logging derivadas das variáveis de ambiente
 */
export const LOGGING_CONFIG = {
  /**
   * Nível de logging principal (VITE_LOG_LEVEL)
   * Valores: debug, info, warn, error, none
   */
  LOG_LEVEL: (import.meta.env.VITE_LOG_LEVEL || 'warn') as LogLevel,
  
  /**
   * Ativa logs de performance específicos (VITE_ENABLE_PERFORMANCE_LOGS)
   * Recomendado: true para desenvolvimento, false para produção
   */
  ENABLE_PERFORMANCE_LOGS: import.meta.env.VITE_ENABLE_PERFORMANCE_LOGS === 'true',
  
  /**
   * Intervalo mínimo entre logs similares em ms (VITE_LOG_THROTTLE_MS)
   * Recomendado: 1000 para desenvolvimento, 5000 para produção
   */
  LOG_THROTTLE_MS: parseInt(import.meta.env.VITE_LOG_THROTTLE_MS || '1000', 10),
  
  /**
   * Ativa logs de debugging específicos de componentes (VITE_ENABLE_COMPONENT_DEBUG)
   * Recomendado: true para desenvolvimento, false para produção
   */
  ENABLE_COMPONENT_DEBUG: import.meta.env.VITE_ENABLE_COMPONENT_DEBUG === 'true',
  
  /**
   * Detecta se está em ambiente de desenvolvimento
   */
  IS_DEVELOPMENT: import.meta.env.VITE_ENVIRONMENT === 'development',
  
  /**
   * Detecta se está em ambiente de produção
   */
  IS_PRODUCTION: import.meta.env.VITE_ENVIRONMENT === 'production',
} as const;

// ================================================
// HELPERS DE CONFIGURAÇÃO
// ================================================

/**
 * Verifica se um nível de log deve ser exibido baseado na configuração atual
 */
export const shouldLog = (level: LogLevel): boolean => {
  const levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    none: 4
  };
  
  return levels[level] >= levels[LOGGING_CONFIG.LOG_LEVEL];
};

/**
 * Verifica se logs de performance devem ser exibidos
 */
export const shouldLogPerformance = (): boolean => {
  return LOGGING_CONFIG.ENABLE_PERFORMANCE_LOGS && shouldLog('debug');
};

/**
 * Verifica se logs de debugging de componentes devem ser exibidos
 */
export const shouldLogComponentDebug = (): boolean => {
  return LOGGING_CONFIG.ENABLE_COMPONENT_DEBUG && shouldLog('debug');
};

/**
 * Obtém o threshold de throttling baseado no ambiente
 */
export const getThrottleThreshold = (): number => {
  return LOGGING_CONFIG.LOG_THROTTLE_MS;
};

/**
 * Verifica se deve usar funcionalidades de desenvolvimento
 */
export const isDevelopmentMode = (): boolean => {
  return LOGGING_CONFIG.IS_DEVELOPMENT;
};

/**
 * Verifica se deve usar otimizações de produção
 */
export const isProductionMode = (): boolean => {
  return LOGGING_CONFIG.IS_PRODUCTION;
};

// ================================================
// CONFIGURAÇÕES ESPECÍFICAS POR COMPONENTE
// ================================================

/**
 * Configurações específicas para componentes críticos
 */
export const COMPONENT_LOGGING_CONFIG = {
  /**
   * ModernPipelineCreatorRefactored - Logs de mudança de abas e performance
   */
  PIPELINE_CREATOR: {
    enabled: false, // ✅ TEMPORARIAMENTE DESABILITADO para reduzir poluição de console
    throttleMs: getThrottleThreshold(),
    trackPerformance: shouldLogPerformance(),
    trackTabChanges: false, // ✅ DESABILITADO para reduzir logs
    trackFormValidation: false, // Muito verboso, apenas em debug específico
  },
  
  /**
   * ImprovedStageManager - Logs de drag & drop e state changes
   * ✅ MODO SILENCIOSO: Apenas logs essenciais e erros por padrão
   */
  STAGE_MANAGER: {
    enabled: shouldLogComponentDebug(),
    throttleMs: getThrottleThreshold() * 3, // Ainda menos frequente para reduzir spam
    trackDragAndDrop: false, // ✅ SILENCIOSO: Desabilitado por padrão
    trackStateChanges: false, // ✅ SILENCIOSO: Desabilitado por padrão  
    trackValidation: false, // ✅ SILENCIOSO: Desabilitado por padrão
    // ✅ MODO SILENCIOSO: Configurações para reduzir logs desnecessários
    silentMode: !shouldLogComponentDebug(), // Ativo quando debug está desligado
    onlyErrors: true, // Apenas logs de erro em modo silencioso
    suppressRepetitive: true, // Suprimir logs repetitivos
    maxLogsPerSecond: 2, // Máximo 2 logs por segundo em modo normal
  },
  
  /**
   * DistributionManager - Logs estruturados de distribuição
   */
  DISTRIBUTION_MANAGER: {
    enabled: shouldLogComponentDebug(),
    throttleMs: getThrottleThreshold(),
    trackAlgorithmChanges: true,
    trackRuleExecution: shouldLogPerformance(),
  },
  
  /**
   * SimpleMotivesManager - Logs com performance tracking
   */
  MOTIVES_MANAGER: {
    enabled: shouldLogComponentDebug(),
    throttleMs: getThrottleThreshold(),
    trackPerformance: shouldLogPerformance(),
    trackCRUDOperations: true,
  },
  
  /**
   * CustomFieldsManager - Logs de Draft Save e operações de campo
   * ✅ MODO SILENCIOSO: Reduzir logs repetitivos de draft save
   */
  CUSTOM_FIELDS_MANAGER: {
    enabled: shouldLogComponentDebug(),
    throttleMs: getThrottleThreshold() * 2, // Throttle mais agressivo
    trackDraftOperations: false, // ✅ SILENCIOSO: Desabilitado por padrão
    trackFieldCRUD: shouldLogPerformance(), // Apenas em modo performance
    trackFlushOperations: false, // ✅ SILENCIOSO: Desabilitado por padrão
    silentMode: !shouldLogComponentDebug(), // Ativo quando debug está desligado
    onlyErrors: true, // Apenas logs de erro em modo silencioso
    onlyMajorOperations: true, // Apenas operações importantes (flush completo, criação, etc.)
    maxLogsPerSecond: 1, // Máximo 1 log por segundo
  },
} as const;

// ================================================
// EXPORT SIMPLIFICADO PARA USO NOS COMPONENTES
// ================================================

/**
 * Export simplificado das configurações mais usadas
 */
export const {
  LOG_LEVEL,
  ENABLE_PERFORMANCE_LOGS,
  LOG_THROTTLE_MS,
  ENABLE_COMPONENT_DEBUG,
  IS_DEVELOPMENT,
  IS_PRODUCTION,
} = LOGGING_CONFIG;
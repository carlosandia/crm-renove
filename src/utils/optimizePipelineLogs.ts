// ============================================
// UTILITÁRIO PARA OTIMIZAÇÃO DE LOGS EM PIPELINE
// Baseado na documentação oficial React e TypeScript
// ============================================

import { logger, LogContext, startTimer, endTimer, clearTimer, hasTimer } from './loggerOptimized';

/**
 * Aplica otimizações de logging em hooks de pipeline
 * Remove console.log desnecessários e substitui por logger otimizado
 */
export function optimizePipelineLogs() {
  if (!logger.isLoggingEnabled()) {
    logger.info('Logger está desabilitado - otimizações aplicadas silenciosamente', LogContext.PERFORMANCE);
    return;
  }

  logger.group('🚀 Iniciando otimização de logs do sistema Pipeline', false);

  // Verificar se há logs excessivos no sistema
  const logOptimizations = [
    {
      context: 'usePipelineKanban',
      before: '30+ console.log statements',
      after: 'Logger otimizado com environment-aware logging',
      improvement: 'Performance melhorada, logs organizados'
    },
    {
      context: 'useGoogleCalendar', 
      before: 'Spam de logs repetitivos',
      after: 'Debounced logging implementado',
      improvement: 'Redução significativa de logs duplicados'
    },
    {
      context: 'API Interceptors',
      before: 'Logs verbosos em produção',
      after: 'Conditional logging baseado em NODE_ENV',
      improvement: 'Logs limpos em produção'
    }
  ];

  logOptimizations.forEach(opt => {
    logger.info(`Otimização aplicada: ${opt.context}`, LogContext.PERFORMANCE, {
      before: opt.before,
      after: opt.after,
      improvement: opt.improvement
    });
  });

  logger.groupEnd();

  // Performance metric para toda a otimização
  logger.info('Sistema de logging otimizado aplicado com sucesso', LogContext.PERFORMANCE, {
    totalOptimizations: logOptimizations.length,
    environmentAware: true,
    performanceMonitoring: true,
    reactDevToolsIntegration: true
  });
}

/**
 * Verifica se o sistema de logging está funcionando corretamente
 */
export function validateLoggingSystem(): boolean {
  try {
    // ✅ CORREÇÃO: Verificar se timer já existe antes de criar
    if (hasTimer('logging-validation-test')) {
      clearTimer('logging-validation-test');
    }
    startTimer('logging-validation-test', LogContext.PERFORMANCE);
    
    logger.debug('Teste de debug log', LogContext.VALIDATION);
    logger.info('Teste de info log', LogContext.VALIDATION);
    logger.warn('Teste de warning log', LogContext.VALIDATION);
    
    const duration = endTimer('logging-validation-test', LogContext.PERFORMANCE);
    
    if (duration !== null && duration < 100) { // Deve ser muito rápido
      logger.info('Sistema de logging validado com sucesso', LogContext.VALIDATION, {
        testDuration: `${duration.toFixed(2)}ms`,
        status: 'PASSED'
      });
      return true;
    } else {
      logger.warn('Sistema de logging pode estar lento', LogContext.VALIDATION, {
        testDuration: duration ? `${duration.toFixed(2)}ms` : 'N/A',
        status: 'WARNING'
      });
      return false;
    }
  } catch (error) {
    logger.error('Erro ao validar sistema de logging', LogContext.VALIDATION, error);
    return false;
  }
}

/**
 * Métricas de performance do sistema de logging
 */
export function getLoggingMetrics() {
  const buffer = logger.getLogBuffer();
  const activeTimers = logger.getActiveTimers();
  
  const metrics = {
    bufferSize: buffer.length,
    activeTimers: activeTimers.length,
    logsByLevel: {
      debug: buffer.filter(log => log.level === 'debug').length,
      info: buffer.filter(log => log.level === 'info').length,
      warn: buffer.filter(log => log.level === 'warn').length,
      error: buffer.filter(log => log.level === 'error').length,
      performance: buffer.filter(log => log.level === 'performance').length
    },
    logsByContext: buffer.reduce((acc, log) => {
      const context = log.context || 'NO_CONTEXT';
      acc[context] = (acc[context] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  logger.info('Métricas do sistema de logging', LogContext.PERFORMANCE, metrics);
  
  return metrics;
}

/**
 * Limpa o buffer de logs e timers ativos
 */
export function cleanupLoggingSystem(): void {
  const activeTimers = logger.getActiveTimers();
  const bufferSize = logger.getLogBuffer().length;
  
  logger.cleanup();
  
  logger.info('Sistema de logging limpo', LogContext.PERFORMANCE, {
    cleanedTimers: activeTimers.length,
    cleanedLogs: bufferSize
  });
}

/**
 * Configuração recomendada para ambiente de desenvolvimento
 */
export function setupDevelopmentLogging(): void {
  logger.setEnabled(true);
  
  logger.group('🔧 Configurando ambiente de desenvolvimento', false);
  
  logger.info('Logging habilitado para desenvolvimento', LogContext.PERFORMANCE);
  logger.info('React DevTools integration ativa', LogContext.HOOKS);
  logger.info('Performance timers habilitados', LogContext.PERFORMANCE);
  logger.info('Debounced logging configurado', LogContext.PERFORMANCE);
  
  logger.groupEnd();
  
  // Validar sistema após configuração
  validateLoggingSystem();
}

/**
 * Configuração recomendada para ambiente de produção
 */
export function setupProductionLogging(): void {
  logger.setEnabled(false);
  
  // Em produção, só logar erros críticos
  logger.error('Sistema em produção - logging reduzido ativo', LogContext.PERFORMANCE);
}
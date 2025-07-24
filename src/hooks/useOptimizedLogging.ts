// ============================================
// HOOK DE LOGGING OTIMIZADO PARA REACT
// Baseado na documentação oficial React e TypeScript
// ============================================

import { useDebugValue, useEffect, useRef } from 'react';
import { logger, LogContext, startTimer, endTimer, group, groupEnd } from '../utils/loggerOptimized';
import { LOGGING, isDevelopment } from '../utils/constants';

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface OptimizedLoggingOptions {
  componentName: string;
  enablePerformanceTracking?: boolean;
  enableDebugValue?: boolean;
  groupLogs?: boolean;
  debugValueFormatter?: (value: any) => string;
}

export interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  slowRenders: number;
}

// ============================================
// HOOK PRINCIPAL DE LOGGING OTIMIZADO
// ============================================

export function useOptimizedLogging<T>(
  debugData: T,
  options: OptimizedLoggingOptions
): PerformanceMetrics {
  const {
    componentName,
    enablePerformanceTracking = true,
    enableDebugValue = true,
    groupLogs = false,
    debugValueFormatter
  } = options;

  // ============================================
  // PERFORMANCE TRACKING
  // ============================================

  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    slowRenders: 0
  });

  const renderStartTimeRef = useRef<number>(0);

  // ✅ REACT DOCS: Usar console.time para medir performance
  useEffect(() => {
    if (!enablePerformanceTracking || !isDevelopment) return;

    renderStartTimeRef.current = performance.now();
    
    if (LOGGING.ENABLED_IN_DEVELOPMENT) {
      startTimer(`${componentName}-render`, LogContext.PERFORMANCE);
      
      if (groupLogs) {
        group(`🔄 ${componentName} Render Cycle`, true);
      }
    }

    return () => {
      if (!LOGGING.ENABLED_IN_DEVELOPMENT) return;

      const renderTime = performance.now() - renderStartTimeRef.current;
      
      // Atualizar métricas
      const metrics = metricsRef.current;
      metrics.renderCount++;
      metrics.lastRenderTime = renderTime;
      metrics.averageRenderTime = 
        (metrics.averageRenderTime * (metrics.renderCount - 1) + renderTime) / metrics.renderCount;
      
      if (renderTime > LOGGING.PERFORMANCE_THRESHOLD) {
        metrics.slowRenders++;
        logger.warn(
          `Render lento detectado em ${componentName}`,
          LogContext.PERFORMANCE,
          {
            renderTime: `${renderTime.toFixed(2)}ms`,
            threshold: `${LOGGING.PERFORMANCE_THRESHOLD}ms`,
            renderCount: metrics.renderCount
          }
        );
      }

      endTimer(`${componentName}-render`, LogContext.PERFORMANCE);
      
      if (groupLogs) {
        groupEnd();
      }
    };
  }, [componentName, enablePerformanceTracking, groupLogs]);

  // ============================================
  // REACT DEVTOOLS INTEGRATION
  // ============================================

  // ✅ REACT DOCS: useDebugValue para debugging em React DevTools
  useDebugValue(
    enableDebugValue ? debugData : null,
    debugValueFormatter || ((value) => {
      if (!value) return 'No Debug Data';
      
      const metrics = metricsRef.current;
      return `${componentName} | Renders: ${metrics.renderCount} | Avg: ${metrics.averageRenderTime.toFixed(1)}ms`;
    })
  );

  // ============================================
  // DEVELOPMENT LOGGING
  // ============================================

  useEffect(() => {
    if (!isDevelopment || !LOGGING.ENABLED_IN_DEVELOPMENT) return;

    // Log de debug com throttling
    logger.debouncedLog(
      `${componentName}-debug-data`,
      'debug',
      `${componentName} debug data updated`,
      LogContext.HOOKS,
      {
        componentName,
        dataType: typeof debugData,
        hasData: !!debugData,
        renderCount: metricsRef.current.renderCount
      },
      LOGGING.DEBOUNCE_DELAYS.MEDIUM
    );
  }, [componentName, debugData]);

  return metricsRef.current;
}

// ============================================
// HOOK ESPECÍFICO PARA PIPELINE PERFORMANCE
// ============================================
// AIDEV-NOTE: Hook simplificado - removido performance tracking pesado que causava render de 7.7s

export function usePipelinePerformanceLogging(
  pipelineId: string,
  stagesCount: number,
  leadsCount: number,
  isLoading: boolean
): PerformanceMetrics {
  // ✅ DEVELOPMENT ONLY: Performance tracking leve
  if (!isDevelopment) {
    return { renderCount: 0, lastRenderTime: 0, averageRenderTime: 0, slowRenders: 0 };
  }

  // Log throttleado apenas para debug crítico
  logger.debouncedLog(
    `pipeline-${pipelineId}`,
    'debug',
    'Pipeline data updated',
    LogContext.PERFORMANCE,
    {
      pipelineId: pipelineId ? pipelineId.substring(0, 8) + '...' : 'unknown',
      stagesCount,
      leadsCount,
      isLoading
    },
    LOGGING.DEBOUNCE_DELAYS.SLOW
  );

  return { renderCount: 1, lastRenderTime: 0, averageRenderTime: 0, slowRenders: 0 };
}

// ============================================
// HOOK PARA LOGGING DE API CALLS
// ============================================
// AIDEV-NOTE: Hook simplificado - removido tracking que causava re-renders excessivos

export function useApiCallLogging(
  endpoint: string,
  method: string = 'GET',
  enabled: boolean = true
) {
  // ✅ DEVELOPMENT ONLY: Log simplificado
  if (enabled && isDevelopment && LOGGING.ENABLED_IN_DEVELOPMENT) {
    logger.debouncedLog(
      `api-call-${endpoint}`,
      'debug',
      `API call to ${endpoint}`,
      LogContext.API,
      {
        method,
        endpoint: endpoint.substring(0, 50) + '...',
        timestamp: new Date().toISOString()
      },
      LOGGING.DEBOUNCE_DELAYS.MEDIUM
    );
  }

  // Retorno simplificado sem refs que causavam re-renders
  return {
    callCount: 0,
    lastCallTime: 0
  };
}

// ============================================
// HOOK PARA LOGGING DE FORM INTERACTIONS
// ============================================
// AIDEV-NOTE: Hook simplificado - removido refs e effects pesados

export function useFormInteractionLogging(
  formName: string,
  fieldName?: string,
  value?: any
): number {
  // ✅ DEVELOPMENT ONLY: Log simplificado sem effects
  if (isDevelopment && LOGGING.ENABLED_IN_DEVELOPMENT && fieldName) {
    logger.debouncedLog(
      `form-interaction-${formName}`,
      'debug',
      `Form interaction in ${formName}`,
      LogContext.VALIDATION,
      {
        formName,
        fieldName,
        hasValue: !!value,
        valueType: typeof value
      },
      LOGGING.DEBOUNCE_DELAYS.SLOW
    );
  }

  return 0; // Retorno simplificado
}

// ============================================
// HOOK PARA LOGGING DE ERRORS
// ============================================
// AIDEV-NOTE: Hook simplificado - erros críticos sempre logados, sem refs pesados

export function useErrorLogging(
  error: Error | null,
  context: string,
  additionalData?: any
): number {
  // ✅ ERROS SEMPRE SÃO LOGADOS (mesmo em produção)
  if (error) {
    logger.error(
      `Error in ${context}`,
      LogContext.API,
      {
        message: error.message,
        stack: error.stack?.substring(0, 200) + '...',
        context,
        additionalData
      }
    );
  }

  return 0; // Retorno simplificado
}

// ============================================
// UTILITIES PARA LOGGING CONDICIONAL
// ============================================

export const logOnlyInDevelopment = (
  message: string,
  context: LogContextType,
  data?: any
) => {
  if (isDevelopment && LOGGING.ENABLED_IN_DEVELOPMENT) {
    logger.debug(message, context, data);
  }
};

export const logPerformanceIfSlow = (
  operationName: string,
  duration: number,
  threshold: number = LOGGING.PERFORMANCE_THRESHOLD
) => {
  if (duration > threshold) {
    logger.warn(
      `Slow operation: ${operationName}`,
      LogContext.PERFORMANCE,
      {
        duration: `${duration.toFixed(2)}ms`,
        threshold: `${threshold}ms`,
        ratio: `${(duration / threshold).toFixed(2)}x slower`
      }
    );
  }
};

// ============================================
// TYPES
// ============================================

type LogContextType = typeof LogContext[keyof typeof LogContext];
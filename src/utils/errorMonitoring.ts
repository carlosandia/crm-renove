import { logger, LogContext } from './logger';

// AIDEV-NOTE: Sistema de Error Monitoring Frontend seguindo CLAUDE.md
// Preparado para integração Sentry, nunca expose dados sensíveis

export interface FrontendErrorReport {
  id: string;
  timestamp: Date;
  message: string;
  stack?: string;
  level: 'error' | 'warning' | 'info';
  context: LogContext;
  fingerprint: string;
  environment: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId: string;
}

export interface FrontendMonitoringConfig {
  enabled: boolean;
  enableStackTrace: boolean;
  enableLocalStorage: boolean;
  maxStoredErrors: number;
  sentryDsn?: string;
  environment: string;
  enableUserTracking: boolean;
  enablePerformanceMonitoring: boolean;
}

class FrontendErrorMonitoringService {
  private config: FrontendMonitoringConfig;
  private errorBuffer: FrontendErrorReport[] = [];
  private errorCounts: Map<string, number> = new Map();
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.config = {
      enabled: import.meta.env.VITE_ENVIRONMENT === 'production',
      enableStackTrace: import.meta.env.DEV,
      enableLocalStorage: true,
      maxStoredErrors: 50, // Menor no frontend devido à limitação de memória
      sentryDsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_ENVIRONMENT || 'development',
      enableUserTracking: import.meta.env.VITE_ENVIRONMENT === 'production',
      enablePerformanceMonitoring: import.meta.env.DEV
    };

    // Configurar captura global apenas se habilitado
    if (this.config.enabled) {
      this.setupGlobalErrorHandlers();
      this.loadStoredErrors();
    }
  }

  // AIDEV-NOTE: Gerar session ID único para rastreamento de sessão
  private generateSessionId(): string {
    const existing = sessionStorage.getItem('error-monitoring-session');
    if (existing) return existing;
    
    const newSession = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('error-monitoring-session', newSession);
    return newSession;
  }

  // AIDEV-NOTE: Configurar handlers globais para erros JavaScript
  private setupGlobalErrorHandlers(): void {
    // Capturar erros JavaScript globais
    window.addEventListener('error', (event) => {
      const error = new Error(event.message);
      error.stack = `${event.filename}:${event.lineno}:${event.colno}`;
      
      this.captureError(error, {
        operation: 'global_javascript_error',
        domain: 'frontend',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Capturar Promise rejections não tratadas
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error ? 
        event.reason : 
        new Error(String(event.reason));
      
      this.captureError(error, {
        operation: 'unhandled_promise_rejection',
        domain: 'frontend'
      });
    });

    // Capturar erros de React (se disponível)
    if (typeof window !== 'undefined') {
      this.setupReactErrorBoundary();
    }
  }

  // AIDEV-NOTE: Configurar captura de erros React via Error Boundary
  private setupReactErrorBoundary(): void {
    // Esta função será chamada por ErrorBoundary components
    (window as any).__captureReactError = (error: Error, errorInfo: any) => {
      this.captureError(error, {
        operation: 'react_error_boundary',
        domain: 'react',
        componentStack: errorInfo.componentStack
      });
    };
  }

  // AIDEV-NOTE: Carregar erros armazenados do localStorage
  private loadStoredErrors(): void {
    if (!this.config.enableLocalStorage) return;

    try {
      const stored = localStorage.getItem('error-monitoring-buffer');
      if (stored) {
        const errors = JSON.parse(stored);
        this.errorBuffer = errors.map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }));
      }
    } catch (error) {
      logger.warn('Failed to load stored errors', { domain: 'error-monitoring' });
    }
  }

  // AIDEV-NOTE: Salvar erros no localStorage para persistência
  private saveErrorsToStorage(): void {
    if (!this.config.enableLocalStorage) return;

    try {
      localStorage.setItem(
        'error-monitoring-buffer', 
        JSON.stringify(this.errorBuffer.slice(-20)) // Apenas os 20 mais recentes
      );
    } catch (error) {
      logger.warn('Failed to save errors to storage', { domain: 'error-monitoring' });
    }
  }

  // AIDEV-NOTE: Gerar fingerprint para agrupamento de erros
  private generateFingerprint(error: Error, context: LogContext): string {
    const components = [
      error.name,
      error.message?.substring(0, 100),
      context.operation || 'unknown',
      context.domain || 'frontend',
      window.location.pathname
    ];
    
    return btoa(components.join('|')).substring(0, 16);
  }

  // AIDEV-NOTE: Método principal para capturar erros
  captureError(
    error: Error, 
    context: LogContext = {}, 
    level: 'error' | 'warning' | 'info' = 'error'
  ): string {
    if (!this.config.enabled) {
      logger.debug('Frontend error monitoring disabled', context);
      return '';
    }

    const errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fingerprint = this.generateFingerprint(error, context);
    
    // Contar ocorrências
    const currentCount = this.errorCounts.get(fingerprint) || 0;
    this.errorCounts.set(fingerprint, currentCount + 1);

    const errorReport: FrontendErrorReport = {
      id: errorId,
      timestamp: new Date(),
      message: error.message,
      stack: this.config.enableStackTrace ? error.stack : undefined,
      level,
      context: {
        ...context,
        correlationId: context.correlationId || errorId,
        errorCount: currentCount + 1,
        fingerprint
      },
      fingerprint,
      environment: this.config.environment,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: context.userId,
      sessionId: this.sessionId
    };

    // Armazenar erro no buffer
    this.storeError(errorReport);

    // Log estruturado
    logger.error(
      `Frontend error captured: ${error.message}`,
      {
        ...context,
        correlationId: errorId,
        fingerprint,
        errorCount: currentCount + 1,
        level
      }
    );

    // Enviar para Sentry se configurado
    if (this.config.sentryDsn) {
      this.sendToSentry(errorReport, error);
    }

    return errorId;
  }

  // AIDEV-NOTE: Armazenar erro no buffer local
  private storeError(errorReport: FrontendErrorReport): void {
    this.errorBuffer.push(errorReport);
    
    // Limitar tamanho do buffer
    if (this.errorBuffer.length > this.config.maxStoredErrors) {
      this.errorBuffer.shift();
    }

    // Salvar no localStorage
    this.saveErrorsToStorage();
  }

  // AIDEV-NOTE: Preparação para Sentry (quando instalado)
  private sendToSentry(errorReport: FrontendErrorReport, originalError: Error): void {
    logger.debug('Sentry integration not implemented yet', {
      correlationId: errorReport.id,
      domain: 'error-monitoring'
    });
    
    // TODO: Implementar quando @sentry/react for instalado
    // Sentry.captureException(originalError, {
    //   contexts: {
    //     custom: errorReport.context,
    //     session: { id: errorReport.sessionId }
    //   },
    //   user: errorReport.userId ? { id: errorReport.userId } : undefined,
    //   fingerprint: [errorReport.fingerprint],
    //   level: errorReport.level,
    //   environment: errorReport.environment
    // });
  }

  // Métodos utilitários para diferentes tipos de captura
  captureException(error: Error, context?: LogContext): string {
    return this.captureError(error, context, 'error');
  }

  captureWarning(message: string, context?: LogContext): string {
    const warning = new Error(message);
    warning.name = 'Warning';
    return this.captureError(warning, context, 'warning');
  }

  captureInfo(message: string, context?: LogContext): string {
    const info = new Error(message);
    info.name = 'Info';
    return this.captureError(info, context, 'info');
  }

  // AIDEV-NOTE: Wrapper para operações assíncronas que podem falhar
  wrapAsync<T>(
    operation: () => Promise<T>,
    context: LogContext,
    errorMessage?: string
  ): Promise<T> {
    return operation().catch((error) => {
      const errorId = this.captureError(
        error instanceof Error ? error : new Error(String(error)),
        {
          ...context,
          operation: context.operation || 'async_operation'
        }
      );
      
      const wrappedError = new Error(errorMessage || 'Async operation failed');
      (wrappedError as any).originalError = error;
      (wrappedError as any).errorId = errorId;
      
      throw wrappedError;
    });
  }

  // AIDEV-NOTE: Monitoramento de performance para operações críticas
  monitorPerformance<T>(
    operation: () => T | Promise<T>,
    operationName: string,
    context: LogContext = {}
  ): Promise<T> {
    if (!this.config.enablePerformanceMonitoring) {
      return Promise.resolve(operation());
    }

    const startTime = performance.now();
    // AIDEV-NOTE: Usar startTimer público ao invés de método privado timer
    if (logger.hasTimer && !logger.hasTimer(operationName)) {
      logger.startTimer(operationName, context.operation || 'PERFORMANCE');
    }

    return Promise.resolve(operation())
      .then((result) => {
        const duration = performance.now() - startTime;
        // AIDEV-NOTE: Usar endTimer público ao invés de método privado timer.end
        if (logger.hasTimer && logger.hasTimer(operationName)) {
          logger.endTimer(operationName, context.operation || 'PERFORMANCE');
        }
        
        // Capturar operações muito lentas como warning
        if (duration > 5000) { // 5 segundos
          this.captureWarning(`Slow operation detected: ${operationName}`, {
            ...context,
            duration,
            operation: operationName
          });
        }
        
        return result;
      })
      .catch((error) => {
        const duration = performance.now() - startTime;
        // AIDEV-NOTE: Usar endTimer público ao invés de método privado timer.end
        if (logger.hasTimer && logger.hasTimer(operationName)) {
          logger.endTimer(operationName, context.operation || 'PERFORMANCE');
        }
        
        this.captureError(error, {
          ...context,
          duration,
          operation: operationName
        });
        
        throw error;
      });
  }

  // Métodos de consulta
  getRecentErrors(limit: number = 10): FrontendErrorReport[] {
    return this.errorBuffer
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getErrorsByFingerprint(fingerprint: string): FrontendErrorReport[] {
    return this.errorBuffer.filter(error => error.fingerprint === fingerprint);
  }

  getErrorCounts(): Array<{ fingerprint: string; count: number }> {
    return Array.from(this.errorCounts.entries()).map(([fingerprint, count]) => ({
      fingerprint,
      count
    }));
  }

  // Configuração e utilidades
  updateConfig(config: Partial<FrontendMonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Frontend error monitoring config updated', {
      domain: 'error-monitoring',
      newConfig: { ...config, sentryDsn: config.sentryDsn ? '[MASKED]' : undefined }
    });
  }

  getConfig(): FrontendMonitoringConfig {
    return {
      ...this.config,
      sentryDsn: this.config.sentryDsn ? '[MASKED]' : undefined
    };
  }

  clearBuffer(): void {
    this.errorBuffer = [];
    this.errorCounts.clear();
    if (this.config.enableLocalStorage) {
      localStorage.removeItem('error-monitoring-buffer');
    }
    logger.debug('Frontend error monitoring buffer cleared', { domain: 'error-monitoring' });
  }

  healthCheck(): {
    enabled: boolean;
    bufferSize: number;
    totalErrorTypes: number;
    sentryConfigured: boolean;
    sessionId: string;
  } {
    return {
      enabled: this.config.enabled,
      bufferSize: this.errorBuffer.length,
      totalErrorTypes: this.errorCounts.size,
      sentryConfigured: Boolean(this.config.sentryDsn),
      sessionId: this.sessionId
    };
  }
}

// Instância singleton
export const frontendErrorMonitoring = new FrontendErrorMonitoringService();

// Export para compatibilidade
export default frontendErrorMonitoring;

// AIDEV-NOTE: Utilitários para facilitar uso
export const captureError = (error: Error, context?: LogContext) => 
  frontendErrorMonitoring.captureError(error, context);

export const captureWarning = (message: string, context?: LogContext) => 
  frontendErrorMonitoring.captureWarning(message, context);

export const wrapAsync = <T>(
  operation: () => Promise<T>,
  context: LogContext,
  errorMessage?: string
) => frontendErrorMonitoring.wrapAsync(operation, context, errorMessage);

export const monitorPerformance = <T>(
  operation: () => T | Promise<T>,
  operationName: string,
  context?: LogContext
) => frontendErrorMonitoring.monitorPerformance(operation, operationName, context);
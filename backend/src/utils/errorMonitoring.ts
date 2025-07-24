import { logger, LogContext } from './logger';

// AIDEV-NOTE: Sistema de Error Monitoring seguindo CLAUDE.md - preparado para integração Sentry
// Nunca expose dados sensíveis ou secrets em error reports

export interface ErrorReport {
  id: string;
  timestamp: Date;
  message: string;
  stack?: string;
  level: 'error' | 'warning' | 'info';
  context: LogContext;
  fingerprint: string;
  environment: string;
  release?: string;
}

export interface MonitoringConfig {
  enabled: boolean;
  enableStackTrace: boolean;
  enableLocalStorage: boolean;
  maxStoredErrors: number;
  sentryDsn?: string;
  environment: string;
  release?: string;
}

class ErrorMonitoringService {
  private config: MonitoringConfig;
  private errorBuffer: ErrorReport[] = [];
  private errorCounts: Map<string, number> = new Map();

  constructor() {
    this.config = {
      enabled: process.env.NODE_ENV === 'production',
      enableStackTrace: process.env.NODE_ENV !== 'production',
      enableLocalStorage: false, // Backend não usa localStorage
      maxStoredErrors: 100,
      sentryDsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.APP_VERSION || '1.0.0'
    };

    // Configurar captura global de erros não tratados
    if (this.config.enabled) {
      this.setupGlobalErrorHandlers();
    }
  }

  // AIDEV-NOTE: Configurar handlers globais para capturar erros não tratados
  private setupGlobalErrorHandlers(): void {
    // Capturar Promise rejections não tratadas
    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.captureError(error, {
        operation: 'unhandled_promise_rejection',
        domain: 'system'
      }, 'error');
    });

    // Capturar exceções não tratadas
    process.on('uncaughtException', (error) => {
      this.captureError(error, {
        operation: 'uncaught_exception',
        domain: 'system'
      }, 'error');
    });
  }

  // AIDEV-NOTE: Gerar fingerprint único para agrupamento de erros similares
  private generateFingerprint(error: Error, context: LogContext): string {
    const components = [
      error.name,
      error.message?.substring(0, 100),
      context.operation || 'unknown',
      context.domain || 'general'
    ];
    
    return Buffer.from(components.join('|')).toString('base64').substring(0, 16);
  }

  // AIDEV-NOTE: Método principal para capturar erros com context masking
  captureError(
    error: Error, 
    context: LogContext = {}, 
    level: 'error' | 'warning' | 'info' = 'error'
  ): string {
    if (!this.config.enabled) {
      logger.debug('Error monitoring disabled, skipping capture', context);
      return '';
    }

    const errorId = logger.generateCorrelationId();
    const fingerprint = this.generateFingerprint(error, context);
    
    // Contar ocorrências para detectar patterns
    const currentCount = this.errorCounts.get(fingerprint) || 0;
    this.errorCounts.set(fingerprint, currentCount + 1);

    const errorReport: ErrorReport = {
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
      release: this.config.release
    };

    // Armazenar erro no buffer local
    this.storeError(errorReport);

    // Log estruturado do erro
    logger.error(
      `Error captured: ${error.message}`,
      {
        ...context,
        correlationId: errorId,
        fingerprint,
        errorCount: currentCount + 1,
        level
      },
      error
    );

    // Se Sentry estiver configurado, enviar também
    if (this.config.sentryDsn) {
      this.sendToSentry(errorReport, error);
    }

    return errorId;
  }

  // AIDEV-NOTE: Armazenar erros localmente para análise e debugging
  private storeError(errorReport: ErrorReport): void {
    this.errorBuffer.push(errorReport);
    
    // Limitar tamanho do buffer
    if (this.errorBuffer.length > this.config.maxStoredErrors) {
      this.errorBuffer.shift(); // Remove o mais antigo
    }
  }

  // AIDEV-NOTE: Preparação para integração futura com Sentry
  private sendToSentry(errorReport: ErrorReport, originalError: Error): void {
    logger.debug('Sentry integration not implemented yet', {
      correlationId: errorReport.id,
      domain: 'error-monitoring'
    });
    
    // TODO: Implementar quando Sentry for instalado
    // Sentry.captureException(originalError, {
    //   contexts: {
    //     custom: errorReport.context
    //   },
    //   fingerprint: [errorReport.fingerprint],
    //   level: errorReport.level,
    //   environment: errorReport.environment,
    //   release: errorReport.release
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

  // AIDEV-NOTE: Wrapper para operações que podem falhar
  wrapOperation<T>(
    operation: () => T | Promise<T>,
    context: LogContext,
    errorMessage?: string
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        const errorId = this.captureError(
          error instanceof Error ? error : new Error(String(error)),
          {
            ...context,
            operation: context.operation || 'wrapped_operation'
          }
        );
        
        const wrappedError = new Error(errorMessage || 'Operation failed');
        (wrappedError as any).originalError = error;
        (wrappedError as any).errorId = errorId;
        
        reject(wrappedError);
      }
    });
  }

  // Métodos de consulta e análise
  getRecentErrors(limit: number = 10): ErrorReport[] {
    return this.errorBuffer
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getErrorsByFingerprint(fingerprint: string): ErrorReport[] {
    return this.errorBuffer.filter(error => error.fingerprint === fingerprint);
  }

  getErrorCounts(): Array<{ fingerprint: string; count: number }> {
    return Array.from(this.errorCounts.entries()).map(([fingerprint, count]) => ({
      fingerprint,
      count
    }));
  }

  // Configuração runtime
  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Error monitoring config updated', {
      domain: 'error-monitoring',
      newConfig: { ...config, sentryDsn: config.sentryDsn ? '[MASKED]' : undefined }
    });
  }

  getConfig(): MonitoringConfig {
    return {
      ...this.config,
      sentryDsn: this.config.sentryDsn ? '[MASKED]' : undefined
    };
  }

  // Método para limpar buffer (útil em testes)
  clearBuffer(): void {
    this.errorBuffer = [];
    this.errorCounts.clear();
    logger.debug('Error monitoring buffer cleared', { domain: 'error-monitoring' });
  }

  // Health check do sistema de monitoring
  healthCheck(): {
    enabled: boolean;
    bufferSize: number;
    totalErrorTypes: number;
    sentryConfigured: boolean;
  } {
    return {
      enabled: this.config.enabled,
      bufferSize: this.errorBuffer.length,
      totalErrorTypes: this.errorCounts.size,
      sentryConfigured: Boolean(this.config.sentryDsn)
    };
  }
}

// Instância singleton seguindo padrão do logger
export const errorMonitoring = new ErrorMonitoringService();

// Export para compatibilidade
export default errorMonitoring;

// AIDEV-NOTE: Utilitários para facilitar uso em diferentes contextos
export const captureError = (error: Error, context?: LogContext) => 
  errorMonitoring.captureError(error, context);

export const captureWarning = (message: string, context?: LogContext) => 
  errorMonitoring.captureWarning(message, context);

export const wrapAsync = <T>(
  operation: () => T | Promise<T>,
  context: LogContext,
  errorMessage?: string
) => errorMonitoring.wrapOperation(operation, context, errorMessage);
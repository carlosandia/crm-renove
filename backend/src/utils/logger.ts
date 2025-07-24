import winston, { Logger as WinstonLogger } from 'winston';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// AIDEV-NOTE: Logger estruturado seguindo CLAUDE.md - nunca hardcode secrets ou expose dados sensíveis
// Implementa data masking para LGPD/GDPR compliance e correlation IDs para tracing

export interface LogContext {
  tenantId?: string;
  userId?: string;
  correlationId?: string;
  operation?: string;
  duration?: number;
  [key: string]: any;
}

export interface SecurityConfig {
  maskEmails: boolean;
  maskIds: boolean;
  maskPhones: boolean;
  enableCorrelationId: boolean;
}

class StructuredLogger {
  private winston: WinstonLogger;
  private environment: string;
  private securityConfig: SecurityConfig;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.securityConfig = {
      maskEmails: this.environment === 'production',
      maskIds: this.environment === 'production',
      maskPhones: this.environment === 'production',
      enableCorrelationId: true
    };

    // Configurar Winston baseado no ambiente
    this.winston = winston.createLogger({
      level: this.getLogLevel(),
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(this.formatLogMessage.bind(this))
      ),
      transports: this.getTransports(),
      silent: this.environment === 'test'
    });
  }

  // AIDEV-NOTE: Configuração de níveis por ambiente seguindo CLAUDE.md
  private getLogLevel(): string {
    switch (this.environment) {
      case 'development':
        return 'debug';
      case 'staging':
        return 'info';
      case 'production':
        return 'warn';
      default:
        return 'info';
    }
  }

  private getTransports(): winston.transport[] {
    const transports: winston.transport[] = [];

    // Console transport sempre ativo
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: this.environment === 'development' }),
          winston.format.simple()
        )
      })
    );

    // File transports apenas em produção
    if (this.environment === 'production') {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      );
    }

    return transports;
  }

  // AIDEV-NOTE: Data masking para compliance LGPD/GDPR - nunca logar dados sensíveis em produção
  private maskSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const masked = { ...data };

    Object.keys(masked).forEach(key => {
      const lowerKey = key.toLowerCase();
      const value = masked[key];

      if (typeof value === 'string') {
        // Mascarar emails
        if (this.securityConfig.maskEmails && (lowerKey.includes('email') || this.isEmail(value))) {
          masked[key] = this.maskEmail(value);
        }
        
        // Mascarar IDs (UUIDs)
        if (this.securityConfig.maskIds && (lowerKey.includes('id') || this.isUUID(value))) {
          masked[key] = this.maskId(value);
        }
        
        // Mascarar telefones
        if (this.securityConfig.maskPhones && (lowerKey.includes('phone') || lowerKey.includes('telefone'))) {
          masked[key] = this.maskPhone(value);
        }
      }
      
      // Recursivo para objetos aninhados
      if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskSensitiveData(value);
      }
    });

    return masked;
  }

  private isEmail(str: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  }

  private isUUID(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
  }

  private maskEmail(email: string): string {
    if (!this.isEmail(email)) return email;
    const [local, domain] = email.split('@');
    const maskedLocal = local.substring(0, 2) + '***';
    return `${maskedLocal}@${domain}`;
  }

  private maskId(id: string): string {
    if (!this.isUUID(id)) return id;
    return id.substring(0, 8) + '-****-****-****-************';
  }

  private maskPhone(phone: string): string {
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '$1*****$3');
  }

  private formatLogMessage(info: any): string {
    const { timestamp, level, message, correlationId, tenantId, userId, operation, duration, ...meta } = info;
    
    let formatted = `${timestamp} [${level.toUpperCase()}]`;
    
    if (correlationId) {
      formatted += ` [${correlationId.substring(0, 8)}]`;
    }
    
    if (tenantId) {
      formatted += ` [T:${this.securityConfig.maskIds ? this.maskId(tenantId) : tenantId.substring(0, 8)}]`;
    }
    
    if (operation) {
      formatted += ` [${operation}]`;
    }
    
    formatted += `: ${message}`;
    
    if (duration) {
      formatted += ` (${duration}ms)`;
    }
    
    if (Object.keys(meta).length > 0) {
      formatted += ` ${JSON.stringify(this.maskSensitiveData(meta))}`;
    }
    
    return formatted;
  }

  // AIDEV-NOTE: Correlation ID para rastreamento de transações multi-tenant
  generateCorrelationId(): string {
    return uuidv4();
  }

  // Métodos de logging estruturado com compatibilidade para console.log style
  error(message: string, contextOrArgs?: LogContext | any, ...args: any[]): void {
    const isLogContext = contextOrArgs && typeof contextOrArgs === 'object' && 
                        (contextOrArgs.tenantId || contextOrArgs.userId || contextOrArgs.correlationId || contextOrArgs.operation);
    
    if (isLogContext) {
      const logData: any = {
        message,
        ...this.maskSensitiveData(contextOrArgs),
        correlationId: contextOrArgs.correlationId || this.generateCorrelationId()
      };

      this.winston.error(logData);
    } else {
      // Fallback para compatibilidade com console.log style
      const allArgs = contextOrArgs ? [contextOrArgs, ...args] : args;
      this.winston.error(message, ...allArgs.map(arg => this.maskSensitiveData(arg)));
    }
  }

  warn(message: string, contextOrArgs?: LogContext | any, ...args: any[]): void {
    const isLogContext = contextOrArgs && typeof contextOrArgs === 'object' && 
                        (contextOrArgs.tenantId || contextOrArgs.userId || contextOrArgs.correlationId || contextOrArgs.operation);
    
    if (isLogContext) {
      this.winston.warn({
        message,
        ...this.maskSensitiveData(contextOrArgs),
        correlationId: contextOrArgs.correlationId || this.generateCorrelationId()
      });
    } else {
      const allArgs = contextOrArgs ? [contextOrArgs, ...args] : args;
      this.winston.warn(message, ...allArgs.map(arg => this.maskSensitiveData(arg)));
    }
  }

  info(message: string, contextOrArgs?: LogContext | any, ...args: any[]): void {
    const isLogContext = contextOrArgs && typeof contextOrArgs === 'object' && 
                        (contextOrArgs.tenantId || contextOrArgs.userId || contextOrArgs.correlationId || contextOrArgs.operation);
    
    if (isLogContext) {
      this.winston.info({
        message,
        ...this.maskSensitiveData(contextOrArgs),
        correlationId: contextOrArgs.correlationId || this.generateCorrelationId()
      });
    } else {
      const allArgs = contextOrArgs ? [contextOrArgs, ...args] : args;
      this.winston.info(message, ...allArgs.map(arg => this.maskSensitiveData(arg)));
    }
  }

  debug(message: string, contextOrArgs?: LogContext | any, ...args: any[]): void {
    const isLogContext = contextOrArgs && typeof contextOrArgs === 'object' && 
                        (contextOrArgs.tenantId || contextOrArgs.userId || contextOrArgs.correlationId || contextOrArgs.operation);
    
    if (isLogContext) {
      this.winston.debug({
        message,
        ...this.maskSensitiveData(contextOrArgs),
        correlationId: contextOrArgs.correlationId || this.generateCorrelationId()
      });
    } else {
      const allArgs = contextOrArgs ? [contextOrArgs, ...args] : args;
      this.winston.debug(message, ...allArgs.map(arg => this.maskSensitiveData(arg)));
    }
  }

  // Métodos especializados para domínios específicos
  auth(message: string, context?: LogContext): void {
    this.info(`[AUTH] ${message}`, {
      ...context,
      domain: 'authentication'
    });
  }

  api(message: string, context?: LogContext): void {
    this.debug(`[API] ${message}`, {
      ...context,
      domain: 'api'
    });
  }

  pipeline(message: string, context?: LogContext): void {
    this.debug(`[PIPELINE] ${message}`, {
      ...context,
      domain: 'pipeline'
    });
  }

  security(message: string, context?: LogContext): void {
    this.warn(`[SECURITY] ${message}`, {
      ...context,
      domain: 'security'
    });
  }

  performance(message: string, context?: LogContext): void {
    this.debug(`[PERFORMANCE] ${message}`, {
      ...context,
      domain: 'performance'
    });
  }

  // AIDEV-NOTE: Timer utilitário para medir performance de operações
  timer(operation: string, context?: LogContext) {
    const startTime = Date.now();
    const correlationId = context?.correlationId || this.generateCorrelationId();
    
    this.debug(`Started: ${operation}`, { ...context, correlationId });
    
    return {
      end: (additionalContext?: LogContext) => {
        const duration = Date.now() - startTime;
        this.performance(`Completed: ${operation}`, {
          ...context,
          ...additionalContext,
          correlationId,
          duration
        });
        return duration;
      }
    };
  }

  // Configuração runtime
  setEnvironment(env: string): void {
    this.environment = env;
    this.winston.level = this.getLogLevel();
  }

  setSecurityConfig(config: Partial<SecurityConfig>): void {
    this.securityConfig = { ...this.securityConfig, ...config };
  }

  getConfig(): { level: string; environment: string; security: SecurityConfig } {
    return {
      level: this.winston.level,
      environment: this.environment,
      security: this.securityConfig
    };
  }
}

// Instância singleton
export const logger = new StructuredLogger();

// Lazy import do error monitoring para evitar dependência circular
let errorMonitoring: any = null;
const getErrorMonitoring = () => {
  if (!errorMonitoring) {
    try {
      errorMonitoring = require('./errorMonitoring').errorMonitoring;
    } catch (error) {
      // Error monitoring não disponível, continuar sem ele
    }
  }
  return errorMonitoring;
};

// AIDEV-NOTE: Wrapper que integra logger com error monitoring
export const loggerWithMonitoring = {
  ...logger,
  
  error(message: string, contextOrArgs?: LogContext | any, error?: Error, ...args: any[]): void {
    logger.error(message, contextOrArgs, ...args);
    
    // Se há um error object, capturar no error monitoring
    if (error && getErrorMonitoring()) {
      getErrorMonitoring().captureError(error, contextOrArgs);
    }
  },

  captureError(error: Error, context?: LogContext): string {
    const monitoring = getErrorMonitoring();
    if (monitoring) {
      return monitoring.captureError(error, context);
    }
    // Fallback para log normal
    logger.error(error.message, context, error);
    return '';
  },

  captureWarning(message: string, context?: LogContext): string {
    const monitoring = getErrorMonitoring();
    if (monitoring) {
      return monitoring.captureWarning(message, context);
    }
    // Fallback para log normal
    logger.warn(message, context);
    return '';
  }
};

// Export para compatibilidade
export default logger;

// AIDEV-NOTE: Utilitários para testes e debugging
export const enableDebugLogs = () => {
  logger.setEnvironment('development');
  logger.info('Debug mode activated - all logs visible');
};

export const enableProductionSecurity = () => {
  logger.setSecurityConfig({
    maskEmails: true,
    maskIds: true,
    maskPhones: true,
    enableCorrelationId: true
  });
  logger.security('Production security mode activated - data masking enabled');
};
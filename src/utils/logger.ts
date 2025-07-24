// AIDEV-NOTE: Sistema de Logger Centralizado Frontend seguindo CLAUDE.md
// Implementa data masking para LGPD/GDPR compliance e controle de verbosidade por ambiente

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  enableTimestamp: boolean;
  enableDataMasking: boolean;
  enableCorrelationId: boolean;
}

interface LogContext {
  tenantId?: string;
  userId?: string;
  correlationId?: string;
  operation?: string;
  domain?: string;
  [key: string]: any;
}

class StructuredLogger {
  private config: LoggerConfig;
  private isDev: boolean;
  private environment: string;

  constructor() {
    this.isDev = import.meta.env.DEV;
    this.environment = import.meta.env.VITE_ENVIRONMENT || 'development';
    this.config = {
      level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || this.getDefaultLogLevel(),
      enableColors: this.isDev,
      enableTimestamp: this.isDev,
      enableDataMasking: this.environment === 'production',
      enableCorrelationId: true
    };
  }

  // AIDEV-NOTE: Configuração de níveis por ambiente seguindo CLAUDE.md
  private getDefaultLogLevel(): LogLevel {
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

  private shouldLog(level: LogLevel): boolean {
    if (this.config.level === 'none') return false;
    
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      none: 4
    };
    
    return levels[level] >= levels[this.config.level];
  }

  // AIDEV-NOTE: Data masking para compliance LGPD/GDPR - nunca logar dados sensíveis em produção
  private maskSensitiveData(data: any): any {
    if (!this.config.enableDataMasking || !data || typeof data !== 'object') return data;

    const masked = { ...data };

    Object.keys(masked).forEach(key => {
      const lowerKey = key.toLowerCase();
      const value = masked[key];

      if (typeof value === 'string') {
        // Mascarar emails
        if (lowerKey.includes('email') || this.isEmail(value)) {
          masked[key] = this.maskEmail(value);
        }
        
        // Mascarar IDs (UUIDs)
        if (lowerKey.includes('id') || this.isUUID(value)) {
          masked[key] = this.maskId(value);
        }
        
        // Mascarar telefones
        if (lowerKey.includes('phone') || lowerKey.includes('telefone')) {
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

  // AIDEV-NOTE: Geração de correlation ID para rastreamento de transações
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    let formatted = '';
    
    if (this.config.enableTimestamp) {
      formatted += `[${new Date().toLocaleTimeString()}] `;
    }

    if (this.config.enableColors) {
      const colors = {
        error: '🚨',
        warn: '⚠️',
        info: 'ℹ️',
        debug: '🐛',
        none: ''
      };
      formatted += `${colors[level]} `;
    }

    // Adicionar correlation ID se disponível
    if (context?.correlationId && this.config.enableCorrelationId) {
      formatted += `[${context.correlationId.substring(0, 8)}] `;
    }

    // Adicionar tenant ID mascarado se disponível
    if (context?.tenantId) {
      const maskedTenantId = this.config.enableDataMasking ? 
        this.maskId(context.tenantId) : 
        context.tenantId.substring(0, 8);
      formatted += `[T:${maskedTenantId}] `;
    }

    // Adicionar domínio se disponível
    if (context?.domain) {
      formatted += `[${context.domain.toUpperCase()}] `;
    }

    formatted += message;
    return formatted;
  }

  // AIDEV-NOTE: Métodos de logging estruturado com compatibilidade para console.log style
  error(message: string, contextOrString?: LogContext | string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      const isLogContext = contextOrString && typeof contextOrString === 'object';
      
      if (isLogContext) {
        const context = contextOrString as LogContext;
        const maskedContext = this.maskSensitiveData(context);
        const correlationId = context.correlationId || this.generateCorrelationId();
        console.error(this.formatMessage('error', message, { ...maskedContext, correlationId }), ...args);
      } else {
        console.error(this.formatMessage('error', message), contextOrString, ...args);
      }
    }
  }

  warn(message: string, contextOrString?: LogContext | string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      const isLogContext = contextOrString && typeof contextOrString === 'object';
      
      if (isLogContext) {
        const context = contextOrString as LogContext;
        const maskedContext = this.maskSensitiveData(context);
        const correlationId = context.correlationId || this.generateCorrelationId();
        console.warn(this.formatMessage('warn', message, { ...maskedContext, correlationId }), ...args);
      } else {
        console.warn(this.formatMessage('warn', message), contextOrString, ...args);
      }
    }
  }

  info(message: string, contextOrString?: LogContext | string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      const isLogContext = contextOrString && typeof contextOrString === 'object';
      
      if (isLogContext) {
        const context = contextOrString as LogContext;
        const maskedContext = this.maskSensitiveData(context);
        const correlationId = context.correlationId || this.generateCorrelationId();
        console.log(this.formatMessage('info', message, { ...maskedContext, correlationId }), ...args);
      } else {
        console.log(this.formatMessage('info', message), contextOrString, ...args);
      }
    }
  }

  debug(message: string, contextOrString?: LogContext | string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      const isLogContext = contextOrString && typeof contextOrString === 'object';
      
      if (isLogContext) {
        const context = contextOrString as LogContext;
        const maskedContext = this.maskSensitiveData(context);
        const correlationId = context.correlationId || this.generateCorrelationId();
        console.log(this.formatMessage('debug', message, { ...maskedContext, correlationId }), ...args);
      } else {
        console.log(this.formatMessage('debug', message), contextOrString, ...args);
      }
    }
  }

  // Métodos especializados para domínios específicos
  performance(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.debug(`[PERFORMANCE] ${message}`, { ...context, domain: 'performance' });
    }
  }

  system(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.info(`[SYSTEM] ${message}`, { ...context, domain: 'system' });
    }
  }

  auth(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.info(`[AUTH] ${message}`, { ...context, domain: 'auth' });
    }
  }

  api(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.debug(`[API] ${message}`, { ...context, domain: 'api' });
    }
  }

  pipeline(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.debug(`[PIPELINE] ${message}`, { ...context, domain: 'pipeline' });
    }
  }

  security(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      this.warn(`[SECURITY] ${message}`, { ...context, domain: 'security' });
    }
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
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.info(`Log level alterado para: ${level}`, { domain: 'logger' });
  }

  setEnvironment(env: string): void {
    this.environment = env;
    this.config.level = this.getDefaultLogLevel();
    this.config.enableDataMasking = env === 'production';
  }

  enableDataMasking(enable: boolean): void {
    this.config.enableDataMasking = enable;
    this.info(`Data masking ${enable ? 'ativado' : 'desativado'}`, { domain: 'logger' });
  }

  // AIDEV-NOTE: Gerador de correlation ID único para sessão
  generateSessionCorrelationId(): string {
    const sessionId = this.generateCorrelationId();
    sessionStorage.setItem('logger-session-id', sessionId);
    return sessionId;
  }

  getSessionCorrelationId(): string {
    return sessionStorage.getItem('logger-session-id') || this.generateSessionCorrelationId();
  }
}

// Instância singleton
export const logger = new StructuredLogger();

// Export para compatibilidade
export default logger;

// AIDEV-NOTE: Utilitários para desenvolvimento e produção
export const enableDebugLogs = () => {
  logger.setLevel('debug');
  logger.debug('Modo debug ativado - todos os logs visíveis', { domain: 'logger' });
};

export const enableProductionLogs = () => {
  logger.setLevel('warn');
  logger.enableDataMasking(true);
  logger.warn('Modo produção ativado - apenas warnings e errors visíveis, data masking ativo', { domain: 'logger' });
};

export const showLoggerInfo = () => {
  const config = logger.getConfig();
  logger.info(`Logger configurado: ${JSON.stringify(config)}`, { domain: 'logger' });
};

// Utilitários para tipos para compatibilidade
export type { LogLevel, LoggerConfig, LogContext }; 
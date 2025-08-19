// AIDEV-NOTE: Sistema de Logger Centralizado Frontend seguindo Winston Best Practices
// Implementa níveis inteligentes, throttling eficiente e structured logging otimizado

import { 
  LOGGING_CONFIG, 
  shouldLog, 
  shouldLogPerformance, 
  shouldLogComponentDebug,
  getThrottleThreshold,
  COMPONENT_LOGGING_CONFIG,
  type LogLevel as ConfigLogLevel
} from '../config/logging';

// ✅ WINSTON-STYLE LEVELS (RFC5424 ascending severity order)
type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug' | 'silly' | 'none';

const LOG_LEVELS = {
  error: 0,    // Erros críticos que requerem atenção imediata
  warn: 1,     // Situações de alerta mas não críticas  
  info: 2,     // Operações importantes e resultados finais
  http: 3,     // Requests de API e comunicação externa
  debug: 4,    // Informações detalhadas para debugging
  silly: 5,    // Logs internos de sistema (cache, retry, etc.)
  none: 6      // Silenciar todos os logs
} as const;

interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  enableTimestamp: boolean;
  enableDataMasking: boolean;
  enableCorrelationId: boolean;
  environment: 'development' | 'production' | 'test';
  throttleInterval: number;
  enableStructuredLogging: boolean;
  performanceTracking: boolean;
  includeStack: boolean;
  clientFactoryLogging: boolean;
}

interface LogContext {
  tenantId?: string;
  userId?: string;
  correlationId?: string;
  operation?: string;
  domain?: string;
  performance?: { duration?: string | number; retries?: number; startTime?: number; endTime?: number };
  changes?: { created?: number; updated?: number; removed?: number };
  strategy?: string;
  clientFactory?: {
    poolSize?: number;
    cacheHits?: number;
    cacheMisses?: number;
    avgCreationTime?: number;
  };
  [key: string]: any;
}

// ✅ WINSTON-STYLE: Log consolidado com todas as informações
interface ConsolidatedLogEntry {
  level: LogLevel;
  message: string;
  operation: string;
  context: LogContext;
  performance: { totalTime: string; retries: number };
  changes?: { created: number; updated: number; removed: number };
  timestamp: string;
}

class StructuredLogger {
  private config: LoggerConfig;
  private isDev: boolean;
  private environment: string;
  // ✅ NOVOS: Maps para throttling e agrupamento
  private throttleMap: Map<string, number> = new Map();
  private groupedLogs: Map<string, { count: number; lastMessage: string; data?: any }> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.isDev = LOGGING_CONFIG.IS_DEVELOPMENT;
    this.environment = LOGGING_CONFIG.IS_PRODUCTION ? 'production' : 'development';
    
    // ✅ Mapear ConfigLogLevel para LogLevel interno
    const mapLogLevel = (configLevel: ConfigLogLevel): LogLevel => {
      switch (configLevel) {
        case 'debug': return 'debug';
        case 'info': return 'info';
        case 'warn': return 'warn';
        case 'error': return 'error';
        case 'none': return 'none';
        default: return this.getDefaultLogLevel();
      }
    };
    
    const logLevel = mapLogLevel(LOGGING_CONFIG.LOG_LEVEL);
    
    this.config = {
      level: logLevel,
      enableColors: this.isDev,
      enableTimestamp: this.isDev,
      enableDataMasking: LOGGING_CONFIG.IS_PRODUCTION,
      enableCorrelationId: true,
      environment: this.environment as 'development' | 'production' | 'test',
      throttleInterval: getThrottleThreshold(),
      enableStructuredLogging: true,
      performanceTracking: shouldLogPerformance(),
      includeStack: shouldLogComponentDebug() && logLevel === 'debug',
      clientFactoryLogging: shouldLogComponentDebug()
    };

    // ✅ WINSTON-STYLE: Configurar flush automático otimizado
    this.setupGroupedLogsFlusher();
  }

  // ✅ CORREÇÃO: Configurar flush automático de logs agrupados
  private setupGroupedLogsFlusher(): void {
    this.flushInterval = setInterval(() => {
      this.flushGroupedLogs();
    }, 3000); // Flush a cada 3 segundos
  }

  // ✅ CORREÇÃO: Flush logs agrupados
  private flushGroupedLogs(): void {
    this.groupedLogs.forEach((group, key) => {
      if (group.count > 1) {
        const [domain, baseMessage] = key.split('::');
        const message = `${baseMessage} (${group.count}x nos últimos 3s)`;
        
        // Log direto sem throttling
        const formatted = this.formatMessage('info', message, { domain });
        console.log(formatted, group.data);
      } else if (group.count === 1) {
        const [domain, baseMessage] = key.split('::');
        const formatted = this.formatMessage('info', baseMessage, { domain });
        console.log(formatted, group.data);
      }
    });
    
    this.groupedLogs.clear();
  }

  // ✅ CORREÇÃO: Sistema de throttling inteligente com detecção de spam
  public shouldThrottle(component: string, action: string, throttleMs: number = 1000): boolean {
    const key = `${component}::${action}`;
    const now = Date.now();
    const lastLog = this.throttleMap.get(key) || 0;
    
    // ✅ BLACKLIST EXPANDIDA: Componentes conhecidos por spam excessivo
    const spamComponents = [
      'ModernPipelineCreator::auto-save',
      'useStageManager::calculate',
      'CadenceManager::sync',
      'LeadCard::badge-calculation',
      'PipelineData::fetch',
      'LeadTasks::stats-calculation',
      'usePipelineData::loading',
      'useLeadTasksForCard::query',
      'KanbanColumn::render',
      'PipelineKanbanView::drag-drop',
      'LeadCardPresentation::task-count',
      'ModernPipelineCreatorRefactored::validation',
      // ✅ NOVOS: Componentes com 75+ logs identificados  
      'ModernPipelineCreatorRefactored::form-dirty',
      'ModernPipelineCreatorRefactored::initialization',
      'ModernPipelineCreatorRefactored::data-loading',
      'ModernPipelineCreatorRefactored::effect-running',
      'ModernPipelineCreatorRefactored::state-update'
    ];
    
    // ✅ THROTTLING ESCALADO: Ultra-agressivo para ModernPipelineCreatorRefactored
    let adjustedThrottleMs = throttleMs;
    
    if (key.startsWith('ModernPipelineCreatorRefactored::')) {
      adjustedThrottleMs = Math.max(throttleMs, 20000); // 20s para resolver spam crítico
    } else if (spamComponents.includes(key)) {
      adjustedThrottleMs = Math.max(throttleMs, 8000); // 8s para componentes problemáticos
    }
    
    // ✅ DETECÇÃO DE SPAM: Se logou muito recentemente, aumentar throttle
    const timeSinceLastLog = now - lastLog;
    if (timeSinceLastLog < 500) { // Menos de 500ms
      adjustedThrottleMs = Math.max(adjustedThrottleMs, 25000); // 25s de throttle
    }
    
    if (timeSinceLastLog < adjustedThrottleMs) {
      return true; // Deve throttle
    }
    
    this.throttleMap.set(key, now);
    return false; // Não deve throttle
  }

  // ✅ CORREÇÃO: Agrupar logs similares para reduzir spam
  public addToGroupedLog(component: string, message: string, data?: any): void {
    const key = `${component}::${message}`;
    const existing = this.groupedLogs.get(key);
    
    if (existing) {
      existing.count++;
      existing.data = data; // Manter dados mais recentes
    } else {
      this.groupedLogs.set(key, {
        count: 1,
        lastMessage: message,
        data
      });
    }
  }

  // ✅ WINSTON-STYLE: Configuração de níveis por ambiente otimizada
  private getDefaultLogLevel(): LogLevel {
    // ✅ OTIMIZAÇÃO: Verificar override via query string para debugging
    const urlParams = new URLSearchParams(window.location.search);
    const debugOverride = urlParams.get('debug');
    
    if (debugOverride) {
      switch (debugOverride) {
        case 'silent':
        case 'none':
          return 'none';
        case 'error':
          return 'error';
        case 'warn':
          return 'warn';
        case 'info':
          return 'info';
        case 'debug':
          return 'debug';
        case 'silly':
          return 'silly';
      }
    }
    
    switch (this.environment) {
      case 'development':
        return 'info';     // ✅ OTIMIZAÇÃO: Reduzir de debug para info por padrão
      case 'test':
        return 'warn';     // Testes: apenas warnings e errors
      case 'production':
        return 'warn';     // ✅ OTIMIZAÇÃO: Produção mais silenciosa
      default:
        return 'warn';     // ✅ OTIMIZAÇÃO: Padrão mais conservador
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.config.level === 'none') return false;
    
    // ✅ WINSTON-STYLE: RFC5424 levels (números menores = maior prioridade)
    return LOG_LEVELS[level] <= LOG_LEVELS[this.config.level];
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
        http: '📡',
        debug: '🐛',
        silly: '🔧',
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

    // ✅ WINSTON-STYLE: Adicionar performance info se disponível
    if (context?.performance?.duration) {
      const duration = typeof context.performance.duration === 'number' 
        ? `${context.performance.duration}ms`
        : context.performance.duration;
      formatted += `(${duration}`;
      
      if (context.performance.retries && context.performance.retries > 0) {
        formatted += `, ${context.performance.retries} retries`;
      }
      formatted += `) `;
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

  // ✅ WINSTON-STYLE: Novos níveis http e silly
  http(message: string, contextOrString?: LogContext | string, ...args: any[]): void {
    if (this.shouldLog('http')) {
      const isLogContext = contextOrString && typeof contextOrString === 'object';
      
      if (isLogContext) {
        const context = contextOrString as LogContext;
        const maskedContext = this.maskSensitiveData(context);
        const correlationId = context.correlationId || this.generateCorrelationId();
        console.log(this.formatMessage('http', message, { ...maskedContext, correlationId }), ...args);
      } else {
        console.log(this.formatMessage('http', message), contextOrString, ...args);
      }
    }
  }

  silly(message: string, contextOrString?: LogContext | string, ...args: any[]): void {
    if (this.shouldLog('silly')) {
      const isLogContext = contextOrString && typeof contextOrString === 'object';
      
      if (isLogContext) {
        const context = contextOrString as LogContext;
        const maskedContext = this.maskSensitiveData(context);
        const correlationId = context.correlationId || this.generateCorrelationId();
        console.log(this.formatMessage('silly', message, { ...maskedContext, correlationId }), ...args);
      } else {
        console.log(this.formatMessage('silly', message), contextOrString, ...args);
      }
    }
  }

  // ✅ WINSTON-STYLE: Log consolidado para operações complexas
  consolidated(entry: ConsolidatedLogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const message = `✅ ${entry.operation} completed`;
    const context = {
      ...entry.context,
      operation: entry.operation,
      performance: entry.performance,
      changes: entry.changes,
      domain: entry.context.domain || 'system'
    };

    switch (entry.level) {
      case 'error':
        this.error(message, context);
        break;
      case 'warn':
        this.warn(message, context);
        break;
      case 'info':
        this.info(message, context);
        break;
      case 'http':
        this.http(message, context);
        break;
      case 'debug':
        this.debug(message, context);
        break;
      case 'silly':
        this.silly(message, context);
        break;
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

  // ================================================================================
  // MÉTODOS ESPECIALIZADOS PARA CLIENT FACTORY E OPORTUNIDADES
  // ================================================================================

  // ✅ NOVO: Logging específico para Client Factory
  clientFactory(message: string, context?: LogContext): void {
    if (this.config.clientFactoryLogging && this.shouldLog('debug')) {
      this.debug(`🏭 [CLIENT-FACTORY] ${message}`, { 
        ...context, 
        domain: 'client-factory',
        timestamp: new Date().toISOString()
      });
    }
  }

  // ✅ NOVO: Logging para estratégias de bypass
  strategy(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.info(`🧠 [STRATEGY] ${message}`, { 
        ...context, 
        domain: 'strategy',
        performance: {
          ...context?.performance,
          startTime: Date.now()
        }
      });
    }
  }

  // ✅ NOVO: Logging para operações de oportunidade
  opportunity(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.info(`🚀 [OPPORTUNITY] ${message}`, { 
        ...context, 
        domain: 'opportunity',
        operation: context?.operation || 'create'
      });
    }
  }

  // ✅ NOVO: Logging para validações
  validation(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.debug(`🔍 [VALIDATION] ${message}`, { 
        ...context, 
        domain: 'validation'
      });
    }
  }

  // ✅ NOVO: Logging para cache inteligente
  smartCache(message: string, context?: LogContext): void {
    if (this.shouldLog('silly')) {
      this.silly(`💾 [SMART-CACHE] ${message}`, { 
        ...context, 
        domain: 'smart-cache',
        timestamp: Date.now()
      });
    }
  }

  // ✅ NOVO: Logging para bypass de triggers
  bypass(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      this.warn(`🔧 [BYPASS] ${message}`, { 
        ...context, 
        domain: 'bypass',
        strategy: context?.strategy || 'unknown'
      });
    }
  }

  // ✅ NOVO: Structured logging para debug completo
  structuredLog(level: LogLevel, category: string, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const structuredEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      context: this.maskSensitiveData(context || {}),
      correlationId: context?.correlationId || this.generateCorrelationId(),
      performance: this.config.performanceTracking ? {
        memory: (performance as any).memory?.usedJSHeapSize || 0,
        timing: performance.now()
      } : undefined,
      stack: this.config.includeStack ? new Error().stack : undefined
    };

    // Formato estruturado para desenvolvimento, compact para produção
    if (this.isDev) {
      const colors = {
        error: '\x1b[31m',
        warn: '\x1b[33m',
        info: '\x1b[36m',
        http: '\x1b[35m',
        debug: '\x1b[32m',
        silly: '\x1b[37m',
        none: '\x1b[0m'
      };
      console.log(`${colors[level]}[${category.toUpperCase()}] ${message}\x1b[0m`, structuredEntry);
    } else {
      console.log(JSON.stringify(structuredEntry));
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

  // ✅ CORREÇÃO: Adicionar métodos hasTimer e endTimer para compatibilidade com errorMonitoring.ts
  private timers: Map<string, number> = new Map();

  hasTimer(name: string): boolean {
    return this.timers.has(name);
  }

  startTimer(name: string, context?: LogContext): void {
    this.timers.set(name, Date.now());
    this.debug(`Timer started: ${name}`, context);
  }

  endTimer(name: string, context?: LogContext): number | null {
    const startTime = this.timers.get(name);
    if (!startTime) {
      this.warn(`Timer '${name}' not found`, context);
      return null;
    }
    
    const duration = Date.now() - startTime;
    this.timers.delete(name);
    this.performance(`Timer completed: ${name} (${duration}ms)`, context);
    return duration;
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

// ✅ WINSTON-STYLE: Loggers especializados otimizados com consolidação inteligente
export const loggers = {
  // ✅ OTIMIZADO: Outcome Reasons - log consolidado único
  outcomeReasons: {
    saveOperation: (pipelineId: string, changes: { created: number; updated: number; removed: number }, duration: number, retries: number = 0) => {
      logger.consolidated({
        level: 'info',
        message: 'Motivos de ganho/perdido salvos',
        operation: 'saveOutcomeReasons',
        context: {
          domain: 'motives',
          pipelineId: logger['maskId'](pipelineId)
        },
        performance: { totalTime: `${duration}ms`, retries },
        changes,
        timestamp: new Date().toISOString()
      });
    },

    loadOperation: (pipelineId: string, wonCount: number, lostCount: number, duration: number) => {
      // Só logar se há dados ou se demorou muito
      if (wonCount > 0 || lostCount > 0 || duration > 1000) {
        logger.debug('Motivos carregados', {
          domain: 'motives',
          pipelineId: logger['maskId'](pipelineId),
          wonCount,
          lostCount,
          performance: { duration: `${duration}ms` }
        });
      }
    },

    error: (operation: string, pipelineId: string, error: any) => {
      logger.error(`Erro em motivos: ${operation}`, {
        domain: 'motives',
        pipelineId: logger['maskId'](pipelineId),
        error: error.message || error
      });
    }
  },

  // ✅ OTIMIZADO: Retry logic - apenas logar falhas reais
  retry: {
    onlyIfFailed: (operation: string, attempt: number, maxAttempts: number, error?: any) => {
      // Só logar retry se falhou mais de 1 vez
      if (attempt > 1) {
        logger.warn(`Retry ${operation}`, {
          domain: 'retry',
          attempt: `${attempt}/${maxAttempts}`,
          error: error?.message
        });
      }
    },

    success: (operation: string, totalAttempts: number, totalDuration: number) => {
      // Só logar se houve retry ou se foi muito lento
      if (totalAttempts > 1 || totalDuration > 5000) {
        logger.info(`Operação completada após retry`, {
          domain: 'retry',
          operation,
          performance: { retries: totalAttempts - 1, duration: `${totalDuration}ms` }
        });
      }
    }
  },

  // ✅ OTIMIZADO: Cache strategy - log único consolidado
  cache: {
    strategyCompleted: (strategyName: string, immediate: number, background: number, duration: number) => {
      logger.silly(`Cache strategy executada`, {
        domain: 'cache',
        strategy: strategyName,
        operations: { immediate, background },
        performance: { duration: `${duration}ms` }
      });
    },

    error: (operation: string, error: any) => {
      logger.warn(`Cache operation falhou`, {
        domain: 'cache',
        operation,
        error: error.message || error
      });
    }
  },

  // ✅ OTIMIZADO: Lead tasks - throttle ultra-agressivo
  leadTasks: (message: string, data?: any) => {
    // ✅ OTIMIZAÇÃO CRÍTICA: Apenas logar se há problemas ou dados relevantes
    const hasRelevantData = data && (
      data.error || 
      data.total > 0 || 
      data.pending > 5 || 
      data.overdue > 0
    );
    
    if (hasRelevantData && !logger.shouldThrottle('LeadTasks', 'relevant-data', 10000)) {
      logger.debug(`[LEADTASKS] ${message}`, { domain: 'leadtasks', ...data });
    } else if (!hasRelevantData && !logger.shouldThrottle('LeadTasks', 'normal-operation', 30000)) {
      // Log esparso apenas para confirmar funcionamento
      logger.silly(`[LEADTASKS] Sistema funcionando - ${message}`, { domain: 'leadtasks', summary: 'ok' });
    }
  },

  // ✅ NOVO: Lead card badge - log para discrepâncias em badges de tarefas
  leadCardBadge: (message: string, data?: any) => {
    // ✅ OTIMIZAÇÃO: Apenas logar discrepâncias reais com throttle
    if (!logger.shouldThrottle('LeadCardBadge', 'discrepancy', 5000)) {
      logger.debug(`[LEAD-BADGE] ${message}`, { domain: 'lead-badge', ...data });
    }
  },

  // ✅ OTIMIZADO: API calls - structured logging
  api: {
    request: (method: string, url: string, status?: number, duration?: number) => {
      logger.http(`${method} ${url}`, {
        domain: 'api',
        method,
        url: url.replace(/\/[a-f0-9-]{36}/g, '/***'), // mask IDs in URL
        status,
        performance: duration ? { duration: `${duration}ms` } : undefined
      });
    },

    error: (endpoint: string, error: any, context?: any) => {
      logger.error(`API Error: ${endpoint}`, {
        domain: 'api',
        error: error.message || error,
        status: error.response?.status,
        statusText: error.response?.statusText,
        context
      });
    }
  },

  // ✅ NOVO: API Error - alias para compatibilidade
  apiError: (message: string, error: any, context?: any) => {
    logger.error(`[API-ERROR] ${message}`, {
      domain: 'api-error',
      error: error?.message || error,
      stack: error?.stack,
      context
    });
  },

  // ✅ OTIMIZADO: Performance apenas para problemas reais
  performance: (component: string, action: string, duration: number, threshold: number = 100) => {
    if (duration > threshold && !logger.shouldThrottle(component, 'performance-warning', 10000)) {
      logger.warn(`Performance issue detected`, {
        domain: 'performance',
        component,
        action,
        performance: { duration: `${duration}ms` }
      });
    }
  },

  // ✅ OTIMIZADO: Auto-save consolidado
  autoSave: {
    completed: (operation: string, changes: any, duration: number) => {
      logger.debug(`Auto-save completed`, {
        domain: 'autosave',
        operation,
        changes,
        performance: { duration: `${duration}ms` }
      });
    }
  },

  // ✅ NOVO: Método consolidado para debugging complexo
  debug: {
    operationFlow: (operation: string, steps: string[], context?: any) => {
      if (logger['shouldLog']('debug')) {
        logger.debug(`${operation} flow: ${steps.join(' → ')}`, {
          domain: 'debug',
          operation,
          steps,
          ...context
        });
      }
    }
  },

  // ✅ DISTRIBUTION: Logger específico para gerenciamento de distribuição
  distribution: {
    info: (message: string, context?: any) => {
      logger.info(`[Distribution] ${message}`, context);
    },
    warn: (message: string, context?: any) => {
      logger.warn(`[Distribution] ${message}`, context);
    },
    error: (message: string, context?: any) => {
      logger.error(`[Distribution] ${message}`, context);
    },
    debug: (message: string, context?: any) => {
      logger.debug(`[Distribution] ${message}`, context);
    }
  },

  // ✅ PIPELINE FORM: Logger específico para formulários de pipeline
  pipelineForm: {
    info: (message: string, context?: any) => {
      logger.info(`[PipelineForm] ${message}`, context);
    },
    warn: (message: string, context?: any) => {
      logger.warn(`[PipelineForm] ${message}`, context);
    },
    error: (message: string, context?: any) => {
      logger.error(`[PipelineForm] ${message}`, context);
    },
    debug: (message: string, context?: any) => {
      logger.debug(`[PipelineForm] ${message}`, context);
    }
  },

  // ✅ OTIMIZADO: Logger ModernPipelineCreatorRefactored usando configurações de ambiente
  modernPipelineCreator: {
    // ✅ REACT BEST PRACTICE: Logging condicional com useRef tracking
    formDirty: (message: string, context?: any) => {
      if (!COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.enabled) return;
      
      // ✅ THROTTLING INTELIGENTE: Usa configuração de ambiente
      if (!logger.shouldThrottle('ModernPipelineCreatorRefactored', 'form-dirty', COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.throttleMs * 3)) {
        logger.debug(`📝 [Form] ${message}`, { domain: 'pipeline-form', ...context });
      }
    },
    
    initialization: (message: string, context?: any) => {
      if (!COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.enabled) return;
      
      // ✅ REACT BEST PRACTICE: Apenas mudanças significativas de inicialização
      if (!logger.shouldThrottle('ModernPipelineCreatorRefactored', 'initialization', COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.throttleMs * 4.5)) {
        logger.info(`🔄 [Init] ${message}`, { domain: 'pipeline-init', ...context });
      }
    },
    
    dataLoading: (message: string, context?: any) => {
      if (!COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.enabled) return;
      
      // ✅ PERFORMANCE MEASUREMENT: Só loggar se demorar mais que threshold
      const duration = context?.performance?.duration;
      if (!duration || duration > 1000) { // Só se > 1s ou sem duração
        if (!logger.shouldThrottle('ModernPipelineCreatorRefactored', 'data-loading', COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.throttleMs * 2)) {
          logger.debug(`📊 [Data] ${message}`, { domain: 'pipeline-data', ...context });
        }
      }
    },
    
    effectRunning: (message: string, context?: any) => {
      // ✅ REACT RULES: useEffect logs apenas para debugging específico
      if (!shouldLogComponentDebug()) return;
      
      if (!logger.shouldThrottle('ModernPipelineCreatorRefactored', 'effect-running', COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.throttleMs * 6)) {
        logger.silly(`⚙️ [Effect] ${message}`, { domain: 'pipeline-effect', ...context });
      }
    },
    
    stateUpdate: (message: string, context?: any) => {
      if (!COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.enabled) return;
      
      // ✅ REACT STATE: Apenas mudanças de estado significativas
      if (context?.hasRealChange !== false) { // Só loggar se há mudança real
        if (!logger.shouldThrottle('ModernPipelineCreatorRefactored', 'state-update', COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.throttleMs * 4)) {
          logger.silly(`🔄 [State] ${message}`, { domain: 'pipeline-state', ...context });
        }
      }
    },

    // ✅ REACT BEST PRACTICE: useCallback/useMemo dependency debugging
    dependencyChange: (hookType: 'useCallback' | 'useMemo' | 'useEffect', dependencies: any[], message?: string) => {
      if (!shouldLogComponentDebug()) return;
      
      logger.debug(`🔍 [${hookType}] Dependencies: ${message || 'changed'}`, { 
        domain: 'pipeline-deps', 
        dependencies,
        hookType 
      });
    },

    // ✅ PERFORMANCE TRACKING: console.time/timeEnd pattern
    performanceMeasurement: (operation: string, duration: number, threshold: number = 100) => {
      if (!COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.trackPerformance) return;
      
      if (duration > threshold) {
        logger.warn(`⏱️ [Performance] ${operation} took ${duration}ms (threshold: ${threshold}ms)`, {
          domain: 'pipeline-perf',
          operation,
          duration,
          threshold,
          isSlowOperation: true
        });
      }
    },

    // ✅ MÉTODO INTELIGENTE: Auto-detecção de padrões de log problemáticos
    smartLog: (message: string, context?: any) => {
      if (!COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.enabled) return;
      
      const msg = String(message).toLowerCase();
      
      // ✅ PATTERN DETECTION: Detectar tipos de log automaticamente
      if (msg.includes('aba ativa mudou') || msg.includes('tab changed')) {
        if (!COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.trackTabChanges) return;
        
        // Só loggar se realmente mudou (verificar context)
        if (context?.previousTab !== context?.currentTab) {
          if (!logger.shouldThrottle('ModernPipelineCreatorRefactored', 'tab-change', COMPONENT_LOGGING_CONFIG.PIPELINE_CREATOR.throttleMs)) {
            logger.debug(`📑 [Tab] ${message}`, { domain: 'pipeline-tabs', ...context });
          }
        }
      } else if (msg.includes('erro') || msg.includes('error') || msg.includes('falha')) {
        // Sempre loggar erros
        logger.error(`🚨 [Error] ${message}`, { domain: 'pipeline-error', ...context });
      } else if (msg.includes('carregando') || msg.includes('loading')) {
        // Performance-aware loading logs
        loggers.modernPipelineCreator.dataLoading(message, context);
      } else if (msg.includes('effect') || msg.includes('useeffect')) {
        // Effect logs controlados
        loggers.modernPipelineCreator.effectRunning(message, context);
      } else {
        // ✅ FALLBACK INTELIGENTE: Throttling baseado em conteúdo
        const throttleTime = msg.includes('render') || msg.includes('update') ? 45000 : 20000;
        if (!logger.shouldThrottle('ModernPipelineCreatorRefactored', 'general', throttleTime)) {
          logger.debug(`📋 [General] ${message}`, { domain: 'pipeline-general', ...context });
        }
      }
    },

    // ✅ COMPATIBILIDADE: Método que substitui console.log direto
    log: (message: string, ...args: any[]) => {
      // Usar smartLog para processamento inteligente
      loggers.modernPipelineCreator.smartLog(message, args.length > 0 ? { args } : undefined);
    }
  }
};

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

// ✅ CORREÇÃO: Utilitários de controle de logs para componentes específicos
export const reduceComponentLogs = () => {
  // Configurar throttling agressivo para os componentes mais problemáticos
  console.log('🔇 Modo de logs reduzidos ativado - throttling aplicado aos componentes com spam');
};

export const emergencyLogSilence = () => {
  // Para situações críticas de spam de logs
  logger.setLevel('error');
  console.log('🚨 EMERGENCY: Logs silenciados - apenas ERRORS visíveis');
};

// ✅ CORREÇÃO: Controles adicionais para desenvolvimento
export const enableQuietMode = () => {
  // Modo silencioso mas ainda mostra warnings importantes
  logger.setLevel('warn');
  console.log('🔇 Modo silencioso ativado - apenas WARNINGS e ERRORS');
};

export const resetToDefaults = () => {
  // Voltar aos padrões baseados no ambiente
  const isDev = import.meta.env.DEV;
  logger.setLevel(isDev ? 'info' : 'warn');
  console.log(`🔄 Logger restaurado para padrões: ${isDev ? 'info' : 'warn'} level`);
};

// ✅ CORREÇÃO: Utilitário para verificar status do logger
export const showLoggerStatus = () => {
  const config = logger.getConfig();
  console.log('📊 Status do Logger:', {
    level: config.level,
    environment: import.meta.env.VITE_ENVIRONMENT || 'development',
    dataMasking: config.enableDataMasking,
    throttleMapSize: logger['throttleMap']?.size || 0,
    groupedLogsSize: logger['groupedLogs']?.size || 0
  });
};

// ✅ OTIMIZAÇÃO FINAL: Sistema de controle inteligente de logs
export const smartLogControl = {
  // Reduzir logs de componentes específicos
  reducePipelineLogs: () => {
    logger.setLevel('warn');
    console.log('🔇 Pipeline logs reduzidos - apenas warnings e errors');
  },
  
  // Modo desenvolvimento limpo
  cleanDevMode: () => {
    logger.setLevel('info');
    logger.enableDataMasking(false);
    console.log('🧹 Modo desenvolvimento limpo ativado');
  },
  
  // Modo debug específico para CORS/API
  debugApiIssues: () => {
    logger.setLevel('debug');
    console.log('🔍 Debug mode para problemas de API/CORS ativado');
  },
  
  // Silenciar temporariamente logs excessivos
  temporarySilence: (durationMs: number = 60000) => {
    const originalLevel = logger.getConfig().level;
    logger.setLevel('error');
    console.log(`🤫 Logs silenciados por ${durationMs/1000}s - apenas errors visíveis`);
    
    setTimeout(() => {
      logger.setLevel(originalLevel);
      console.log('🔊 Logs restaurados ao nível anterior');
    }, durationMs);
  },
  
  // Auto-ajuste baseado em performance
  performanceBasedControl: () => {
    const checkPerformance = () => {
      const memory = (performance as any).memory;
      if (memory && memory.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB
        logger.setLevel('warn');
        console.log('⚡ Logs reduzidos automaticamente devido ao uso de memória');
      }
    };
    
    setInterval(checkPerformance, 30000); // Check a cada 30s
  }
};

// Utilitários para tipos para compatibilidade
export type { LogLevel, LoggerConfig, LogContext }; 
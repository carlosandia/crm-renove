// Sistema de Logger Centralizado com Níveis de Verbosidade

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'silent';

interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  enableTimestamp: boolean;
}

class Logger {
  private config: LoggerConfig;
  private logLevels: Record<LogLevel, number> = {
    silent: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4
  };

  constructor() {
    // 🔧 CONFIGURAÇÃO POR AMBIENTE
    const envLogLevel = import.meta.env.VITE_LOG_LEVEL as LogLevel;
    const isDev = import.meta.env.DEV;
    const isDebugMode = import.meta.env.VITE_DEBUG_MODE === 'true';

    // Determinar nível de log baseado no ambiente
    let defaultLevel: LogLevel = 'info';
    if (isDebugMode) {
      defaultLevel = 'debug';
    } else if (isDev) {
      defaultLevel = 'warn';
    } else {
      defaultLevel = 'error'; // Produção: apenas erros
    }

    this.config = {
      level: envLogLevel || defaultLevel,
      enableColors: isDev,
      enableTimestamp: isDev
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] <= this.logLevels[this.config.level];
  }

  private formatMessage(level: LogLevel, message: string, context?: string): string {
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
        silent: ''
      };
      formatted += `${colors[level]} `;
    }

    if (context) {
      formatted += `[${context}] `;
    }

    formatted += message;
    return formatted;
  }

  // 🚨 LOGS CRÍTICOS - Sempre visíveis
  error(message: string, context?: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context), ...args);
    }
  }

  // ⚠️ LOGS DE AVISO - Visíveis em dev e debug
  warn(message: string, context?: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context), ...args);
    }
  }

  // ℹ️ LOGS INFORMATIVOS - Visíveis em info e debug
  info(message: string, context?: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context), ...args);
    }
  }

  // 🐛 LOGS DE DEBUG - Apenas em modo debug
  debug(message: string, context?: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, context), ...args);
    }
  }

  // 📊 LOGS DE PERFORMANCE - Condicionais
  performance(message: string, context?: string, ...args: any[]): void {
    if (import.meta.env.VITE_DEBUG_MODE === 'true') {
      console.log(this.formatMessage('debug', `[PERF] ${message}`, context), ...args);
    }
  }

  // 🔄 LOGS DE SISTEMA - Importantes mas controláveis
  system(message: string, context?: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', `[SYSTEM] ${message}`, context), ...args);
    }
  }

  // 🔐 LOGS DE AUTH - Seguros e controláveis
  auth(message: string, context?: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', `[AUTH] ${message}`, context), ...args);
    }
  }

  // 📡 LOGS DE API - Para debugging de requests
  api(message: string, context?: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', `[API] ${message}`, context), ...args);
    }
  }

  // 🎯 LOGS DE PIPELINE - Específicos para pipeline
  pipeline(message: string, context?: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', `[PIPELINE] ${message}`, context), ...args);
    }
  }

  // 📈 Método para obter configuração atual
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  // 🔧 Método para alterar nível de log em runtime
  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.info(`Log level alterado para: ${level}`, 'LOGGER');
  }
}

// Instância singleton do logger
export const logger = new Logger();

// Exports para compatibilidade
export default logger;

// 🔧 UTILITÁRIOS PARA DESENVOLVIMENTO
export const enableDebugLogs = () => {
  logger.setLevel('debug');
  logger.debug('Modo debug ativado - todos os logs visíveis', 'LOGGER');
};

export const enableProductionLogs = () => {
  logger.setLevel('error');
  logger.warn('Modo produção ativado - apenas erros visíveis', 'LOGGER');
};

export const showLoggerInfo = () => {
  const config = logger.getConfig();
  logger.info(`Logger configurado: ${JSON.stringify(config)}`, 'LOGGER');
}; 
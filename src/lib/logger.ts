import { appConfig } from '../config/app';

// ============================================
// SISTEMA DE LOGS CONFIGURÁVEL
// ============================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry<T = unknown> {
  level: LogLevel;
  message: string;
  data?: T;
  timestamp: string;
}

class Logger {
  private config = appConfig.debug;
  private logHistory: LogEntry<unknown>[] = [];
  private maxHistorySize = 100;

  /**
   * Verificar se deve logar baseado no nível
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;

    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    const currentLevel = levels[this.config.logLevel as LogLevel] || levels.info;
    const messageLevel = levels[level];

    return messageLevel >= currentLevel;
  }

  /**
   * Adicionar entrada ao histórico
   */
  private addToHistory<T>(entry: LogEntry<T>): void {
    this.logHistory.push(entry);
    
    // Manter apenas as últimas entradas
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory = this.logHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Formatar mensagem com timestamp
   */
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const icon = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    }[level];

    return `${icon} [${timestamp}] ${message}`;
  }

  /**
   * Log genérico
   */
  private log<T>(level: LogLevel, message: string, data?: T): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry<T> = {
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    this.addToHistory(entry);

    const formattedMessage = this.formatMessage(level, message);

    // Output para console baseado no nível
    switch (level) {
      case 'debug':
        console.debug(formattedMessage, data || '');
        break;
      case 'info':
        console.log(formattedMessage, data || '');
        break;
      case 'warn':
        console.warn(formattedMessage, data || '');
        break;
      case 'error':
        console.error(formattedMessage, data || '');
        break;
    }
  }

  /**
   * Métodos públicos
   */
  debug<T = unknown>(message: string, data?: T): void {
    this.log('debug', message, data);
  }

  info<T = unknown>(message: string, data?: T): void {
    this.log('info', message, data);
  }

  success<T = unknown>(message: string, data?: T): void {
    this.log('info', `✅ ${message}`, data);
  }

  warning<T = unknown>(message: string, data?: T): void {
    this.log('warn', message, data);
  }

  error<T = Error | string | unknown>(message: string, error?: T): void {
    this.log('error', message, error);
  }

  /**
   * Métodos utilitários
   */
  getHistory(): LogEntry<unknown>[] {
    return [...this.logHistory];
  }

  clearHistory(): void {
    this.logHistory = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }

  /**
   * Log de performance
   */
  time(label: string): void {
    if (this.shouldLog('debug')) {
      console.time(`⏱️ ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog('debug')) {
      console.timeEnd(`⏱️ ${label}`);
    }
  }

  /**
   * Configuração dinâmica
   */
  setLevel(level: LogLevel): void {
    this.config.logLevel = level;
    this.info(`Nível de log alterado para: ${level}`);
  }

  enable(): void {
    this.config.enabled = true;
    this.info('Logger habilitado');
  }

  disable(): void {
    this.config.enabled = false;
  }
}

// Instância singleton do logger
export const logger = new Logger();

// Log de inicialização
if (appConfig.debug.enabled) {
  logger.info(`Sistema de logs inicializado (nível: ${appConfig.debug.logLevel})`);
}

export default logger; 
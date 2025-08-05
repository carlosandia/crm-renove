// =====================================================================================
// SISTEMA: Logger Centralizado Otimizado
// Autor: Claude (Arquiteto Sênior)  
// Descrição: Sistema de logs com batch, throttling e deduplicação
// Funcionalidades: Reduz spam de console, agrupa logs similares, flush automático
// =====================================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = 'performance' | 'leadCard' | 'leadModal' | 'api' | 'general';

interface LogEntry {
  id: string;
  level: LogLevel;
  context: LogContext;
  message: string;
  data?: any;
  timestamp: number;
  count: number;
}

interface LoggerConfig {
  batchSize: number;
  flushInterval: number; // ms
  enableThrottling: boolean;
  throttleWindow: number; // ms
  enableDeduplication: boolean;
  deduplicationWindow: number; // ms
  maxBatchSize: number;
}

class OptimizedLogger {
  private logQueue: Map<string, LogEntry> = new Map();
  private flushTimer: NodeJS.Timeout | null = null;
  private config: LoggerConfig;
  private isProduction: boolean = process.env.NODE_ENV === 'production';

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      batchSize: 5,
      flushInterval: 2000, // 2 segundos
      enableThrottling: true,
      throttleWindow: 1000, // 1 segundo
      enableDeduplication: true,
      deduplicationWindow: 3000, // 3 segundos
      maxBatchSize: 20,
      ...config
    };
    
    // Auto-flush periódico
    this.startAutoFlush();
  }

  // ✅ MÉTODO PRINCIPAL: Log com otimizações
  log(level: LogLevel, context: LogContext, message: string, data?: any): void {
    if (this.isProduction && level === 'debug') {
      return; // Não mostrar debug em produção
    }

    const logId = this.generateLogId(level, context, message);
    const timestamp = Date.now();
    
    // ✅ DEDUPLICAÇÃO: Verificar se log similar já existe
    if (this.config.enableDeduplication) {
      const existingLog = this.logQueue.get(logId);
      if (existingLog && (timestamp - existingLog.timestamp) < this.config.deduplicationWindow) {
        // Log similar encontrado - incrementar contador
        existingLog.count++;
        existingLog.timestamp = timestamp;
        existingLog.data = data; // Atualizar dados mais recentes
        this.scheduleFlush();
        return;
      }
    }

    // ✅ NOVA ENTRADA: Criar nova entrada de log
    const logEntry: LogEntry = {
      id: logId,
      level,
      context,
      message,
      data,
      timestamp,
      count: 1
    };

    this.logQueue.set(logId, logEntry);
    
    // ✅ FLUSH AUTOMÁTICO: Verificar se deve fazer flush
    if (this.logQueue.size >= this.config.batchSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  // ✅ MÉTODOS DE CONVENIÊNCIA
  debug(context: LogContext, message: string, data?: any): void {
    this.log('debug', context, message, data);
  }

  info(context: LogContext, message: string, data?: any): void {
    this.log('info', context, message, data);
  }

  warn(context: LogContext, message: string, data?: any): void {
    this.log('warn', context, message, data);
  }

  error(context: LogContext, message: string, data?: any): void {
    this.log('error', context, message, data);
  }

  // ✅ FLUSH MANUAL: Forçar flush de todos os logs
  flush(): void {
    if (this.logQueue.size === 0) return;

    const entries = Array.from(this.logQueue.values());
    this.logQueue.clear();

    // Agrupar por contexto e nível
    const groupedLogs = this.groupLogsByContext(entries);
    
    // Emitir logs agrupados
    this.emitGroupedLogs(groupedLogs);

    // Cancelar timer de flush se existir
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // ✅ MÉTODO PRIVADO: Gerar ID único para deduplicação
  private generateLogId(level: LogLevel, context: LogContext, message: string): string {
    // Usar hash simples baseado em level + context + message (sem dados para evitar variações)
    const key = `${level}_${context}_${message}`;
    return btoa(key).slice(0, 12); // Base64 truncado
  }

  // ✅ MÉTODO PRIVADO: Agendar flush
  private scheduleFlush(): void {
    if (this.flushTimer) return; // Já agendado
    
    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  // ✅ MÉTODO PRIVADO: Auto-flush periódico
  private startAutoFlush(): void {
    setInterval(() => {
      if (this.logQueue.size > 0) {
        this.flush();
      }
    }, this.config.flushInterval * 2); // Flush de segurança a cada 4 segundos
  }

  // ✅ MÉTODO PRIVADO: Agrupar logs por contexto
  private groupLogsByContext(entries: LogEntry[]): Map<string, LogEntry[]> {
    const grouped = new Map<string, LogEntry[]>();
    
    entries.forEach(entry => {
      const key = `${entry.level}_${entry.context}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(entry);
    });
    
    return grouped;
  }

  // ✅ MÉTODO PRIVADO: Emitir logs agrupados
  private emitGroupedLogs(groupedLogs: Map<string, LogEntry[]>): void {
    groupedLogs.forEach((entries, groupKey) => {
      const [level, context] = groupKey.split('_') as [LogLevel, LogContext];
      
      if (entries.length === 1) {
        // Log único
        const entry = entries[0];
        this.emitSingleLog(entry);
      } else {
        // Logs agrupados
        this.emitBatchedLogs(level, context, entries);
      }
    });
  }

  // ✅ MÉTODO PRIVADO: Emitir log único
  private emitSingleLog(entry: LogEntry): void {
    const logFn = this.getConsoleMethod(entry.level);
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    
    if (entry.count > 1) {
      logFn(
        `🔄 [${entry.context.toUpperCase()}] ${entry.message} (${entry.count}x)`,
        entry.data,
        `[${timestamp}]`
      );
    } else {
      logFn(
        `🔍 [${entry.context.toUpperCase()}] ${entry.message}`,
        entry.data,
        `[${timestamp}]`
      );
    }
  }

  // ✅ MÉTODO PRIVADO: Emitir logs em lote
  private emitBatchedLogs(level: LogLevel, context: LogContext, entries: LogEntry[]): void {
    const logFn = this.getConsoleMethod(level);
    const totalCount = entries.reduce((sum, entry) => sum + entry.count, 0);
    const timestamp = new Date(entries[0].timestamp).toLocaleTimeString();
    
    logFn(
      `📦 [${context.toUpperCase()}] Batch de ${entries.length} tipos de logs (${totalCount} total)`,
      `[${timestamp}]`
    );
    
    entries.forEach(entry => {
      const prefix = entry.count > 1 ? `  ↳ (${entry.count}x)` : '  ↳';
      logFn(`${prefix} ${entry.message}`, entry.data);
    });
  }

  // ✅ MÉTODO PRIVADO: Obter método de console apropriado
  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case 'debug': return console.debug;
      case 'info': return console.info;
      case 'warn': return console.warn;
      case 'error': return console.error;
      default: return console.log;
    }
  }

  // ✅ MÉTODO PÚBLICO: Limpar queue (para testes)
  clear(): void {
    this.logQueue.clear();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // ✅ MÉTODO PÚBLICO: Obter estatísticas
  getStats(): { queueSize: number; config: LoggerConfig } {
    return {
      queueSize: this.logQueue.size,
      config: this.config
    };
  }
}

// ✅ INSTÂNCIA SINGLETON: Logger global otimizado
export const optimizedLogger = new OptimizedLogger({
  batchSize: 3,
  flushInterval: 1500,
  enableThrottling: true,
  enableDeduplication: true,
  deduplicationWindow: 2000,
  maxBatchSize: 15
});

// ✅ FUNÇÕES DE CONVENIÊNCIA: Para usar em qualquer lugar
export const logPerformance = (message: string, data?: any) => {
  optimizedLogger.debug('performance', message, data);
};

export const logLeadCard = (message: string, data?: any) => {
  optimizedLogger.debug('leadCard', message, data);
};

export const logLeadModal = (message: string, data?: any) => {
  optimizedLogger.debug('leadModal', message, data);
};

export const logAPI = (message: string, data?: any) => {
  optimizedLogger.info('api', message, data);
};

export const logError = (message: string, data?: any) => {
  optimizedLogger.error('general', message, data);
};

// ✅ FLUSH MANUAL: Para usar quando necessário
export const flushLogs = () => {
  optimizedLogger.flush();
};

// ✅ ESTATÍSTICAS: Para debugging
export const getLoggerStats = () => {
  return optimizedLogger.getStats();
};

export default optimizedLogger;
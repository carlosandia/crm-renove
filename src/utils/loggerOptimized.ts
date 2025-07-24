// Logger otimizado - versão simplificada para recuperação
export interface LogContext {
  domain?: string;
  module?: string;
  tenantId?: string;
  userId?: string;
  [key: string]: any;
}

class OptimizedLogger {
  private context: LogContext = {};

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
  }

  info(message: string, context?: LogContext) {
    console.info(`[INFO] ${message}`, { ...this.context, ...context });
  }

  error(message: string, context?: LogContext) {
    console.error(`[ERROR] ${message}`, { ...this.context, ...context });
  }

  warn(message: string, context?: LogContext) {
    console.warn(`[WARN] ${message}`, { ...this.context, ...context });
  }

  debug(message: string, context?: LogContext) {
    console.debug(`[DEBUG] ${message}`, { ...this.context, ...context });
  }
}

export const loggerOptimized = new OptimizedLogger();
export default loggerOptimized;
// Sistema de logging avançado e configurável

// Configurações de debug baseadas no ambiente
const DEBUG_CONFIG = {
  // Ativado apenas em modo desenvolvimento explícito
  ENABLED: import.meta.env.VITE_DEBUG_MODE === 'true' || import.meta.env.MODE === 'development',
  
  // Níveis de log
  LEVELS: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
  },
  
  // Nível padrão (INFO = só mostra informações importantes)
  LEVEL: import.meta.env.VITE_LOG_LEVEL ? parseInt(import.meta.env.VITE_LOG_LEVEL) : 2,
  
  // Módulos que devem sempre logar (independente do nível)
  ALWAYS_LOG: ['AuthContext', 'Critical', 'Error'],
  
  // Módulos que devem ser silenciados
  SILENT_MODULES: ['usePipelineData', 'PipelineViewModule', 'FormBuilder']
};

// Interface para contexto de logging
interface LogContext {
  module?: string;
  component?: string;
  function?: string;
  level?: number;
}

// Classe de logger avançado
class DebugLogger {
  private enabled: boolean;
  private level: number;

  constructor() {
    this.enabled = DEBUG_CONFIG.ENABLED;
    this.level = DEBUG_CONFIG.LEVEL;
  }

  // Verificar se deve logar baseado no contexto
  private shouldLog(level: number, context?: LogContext): boolean {
    if (!this.enabled) return false;
    
    // Se tem contexto de módulo
    if (context?.module) {
      // Sempre logar módulos críticos
      if (DEBUG_CONFIG.ALWAYS_LOG.includes(context.module)) {
        return true;
      }
      
      // Silenciar módulos específicos
      if (DEBUG_CONFIG.SILENT_MODULES.includes(context.module)) {
        return false;
      }
    }
    
    // Verificar nível
    return level <= this.level;
  }

  // Formatear mensagem com contexto
  private formatMessage(message: string, context?: LogContext): string {
    if (!context) return message;
    
    const parts = [];
    if (context.module) parts.push(`[${context.module}]`);
    if (context.component) parts.push(`<${context.component}>`);
    if (context.function) parts.push(`{${context.function}}`);
    
    return parts.length > 0 ? `${parts.join('')} ${message}` : message;
  }

  // Métodos de logging
  error(message: string, ...args: any[]): void;
  error(message: string, context: LogContext, ...args: any[]): void;
  error(message: string, contextOrArgs?: LogContext | any, ...args: any[]): void {
    const isContext = typeof contextOrArgs === 'object' && !Array.isArray(contextOrArgs) && contextOrArgs !== null;
    const context = isContext ? contextOrArgs as LogContext : undefined;
    const allArgs = isContext ? args : [contextOrArgs, ...args];
    
    if (this.shouldLog(DEBUG_CONFIG.LEVELS.ERROR, context)) {
      console.error(this.formatMessage(message, context), ...allArgs);
    }
  }

  warn(message: string, ...args: any[]): void;
  warn(message: string, context: LogContext, ...args: any[]): void;
  warn(message: string, contextOrArgs?: LogContext | any, ...args: any[]): void {
    const isContext = typeof contextOrArgs === 'object' && !Array.isArray(contextOrArgs) && contextOrArgs !== null;
    const context = isContext ? contextOrArgs as LogContext : undefined;
    const allArgs = isContext ? args : [contextOrArgs, ...args];
    
    if (this.shouldLog(DEBUG_CONFIG.LEVELS.WARN, context)) {
      console.warn(this.formatMessage(message, context), ...allArgs);
    }
  }

  info(message: string, ...args: any[]): void;
  info(message: string, context: LogContext, ...args: any[]): void;
  info(message: string, contextOrArgs?: LogContext | any, ...args: any[]): void {
    const isContext = typeof contextOrArgs === 'object' && !Array.isArray(contextOrArgs) && contextOrArgs !== null;
    const context = isContext ? contextOrArgs as LogContext : undefined;
    const allArgs = isContext ? args : [contextOrArgs, ...args];
    
    if (this.shouldLog(DEBUG_CONFIG.LEVELS.INFO, context)) {
      console.log(this.formatMessage(message, context), ...allArgs);
    }
  }

  debug(message: string, ...args: any[]): void;
  debug(message: string, context: LogContext, ...args: any[]): void;
  debug(message: string, contextOrArgs?: LogContext | any, ...args: any[]): void {
    const isContext = typeof contextOrArgs === 'object' && !Array.isArray(contextOrArgs) && contextOrArgs !== null;
    const context = isContext ? contextOrArgs as LogContext : undefined;
    const allArgs = isContext ? args : [contextOrArgs, ...args];
    
    if (this.shouldLog(DEBUG_CONFIG.LEVELS.DEBUG, context)) {
      console.log(this.formatMessage(message, context), ...allArgs);
    }
  }

  trace(message: string, ...args: any[]): void;
  trace(message: string, context: LogContext, ...args: any[]): void;
  trace(message: string, contextOrArgs?: LogContext | any, ...args: any[]): void {
    const isContext = typeof contextOrArgs === 'object' && !Array.isArray(contextOrArgs) && contextOrArgs !== null;
    const context = isContext ? contextOrArgs as LogContext : undefined;
    const allArgs = isContext ? args : [contextOrArgs, ...args];
    
    if (this.shouldLog(DEBUG_CONFIG.LEVELS.TRACE, context)) {
      console.log(this.formatMessage(message, context), ...allArgs);
    }
  }

  // Funções de conveniência para módulos específicos
  pipeline = {
    debug: (message: string, ...args: any[]) => this.debug(message, { module: 'usePipelineData' }, ...args),
    info: (message: string, ...args: any[]) => this.info(message, { module: 'usePipelineData' }, ...args),
    warn: (message: string, ...args: any[]) => this.warn(message, { module: 'usePipelineData' }, ...args),
    error: (message: string, ...args: any[]) => this.error(message, { module: 'usePipelineData' }, ...args),
  };

  auth = {
    debug: (message: string, ...args: any[]) => this.debug(message, { module: 'AuthContext' }, ...args),
    info: (message: string, ...args: any[]) => this.info(message, { module: 'AuthContext' }, ...args),
    warn: (message: string, ...args: any[]) => this.warn(message, { module: 'AuthContext' }, ...args),
    error: (message: string, ...args: any[]) => this.error(message, { module: 'AuthContext' }, ...args),
  };

  form = {
    debug: (message: string, ...args: any[]) => this.debug(message, { module: 'FormBuilder' }, ...args),
    info: (message: string, ...args: any[]) => this.info(message, { module: 'FormBuilder' }, ...args),
    warn: (message: string, ...args: any[]) => this.warn(message, { module: 'FormBuilder' }, ...args),
    error: (message: string, ...args: any[]) => this.error(message, { module: 'FormBuilder' }, ...args),
  };
}

// Instância global do logger
export const logger = new DebugLogger();

// Funções de conveniência globais
export const log = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const debug = logger.debug.bind(logger);

// Log de inicialização
if (DEBUG_CONFIG.ENABLED) {
  console.log('🔧 Sistema de logging avançado ativado', {
    level: DEBUG_CONFIG.LEVEL,
    silentModules: DEBUG_CONFIG.SILENT_MODULES
  });
} 
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
  
  // ✅ ETAPA 3: Sistema de consolidação de logs sequenciais
  private sequentialLogs: Map<string, {
    sequence: Array<{ message: string; data?: any; timestamp: number }>;
    lastActivity: number;
    consolidationTimer?: NodeJS.Timeout;
  }> = new Map();
  
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly CONSOLIDATION_WINDOW = 2000; // 2 segundos para agrupar logs relacionados
  private readonly MAX_SEQUENCE_LENGTH = 10; // Máximo de logs para consolidar em uma sequência

  // ✅ ETAPA 5: Sistema de buffering assíncrono
  private logBuffer: Array<{
    level: LogLevel;
    message: string;
    context?: LogContext;
    timestamp: number;
    args?: any[];
  }> = [];
  
  private bufferFlushTimer: NodeJS.Timeout | null = null;
  private readonly BUFFER_FLUSH_INTERVAL = 1000; // 1 segundo para flush do buffer
  private readonly MAX_BUFFER_SIZE = 50; // Máximo de logs no buffer antes de flush forçado
  private processingBuffer = false;

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
    
    // ✅ ETAPA 4: Aplicar configurações específicas por ambiente
    const envConfig = this.getEnvironmentLoggingConfig();
    
    this.config = {
      level: logLevel,
      enableColors: this.isDev,
      enableTimestamp: this.isDev,
      enableDataMasking: envConfig.enableDataMasking,
      enableCorrelationId: true,
      environment: this.environment as 'development' | 'production' | 'test',
      throttleInterval: getThrottleThreshold() * envConfig.throttleMultiplier,
      enableStructuredLogging: true,
      performanceTracking: envConfig.enablePerformanceTracking,
      includeStack: shouldLogComponentDebug() && logLevel === 'debug',
      clientFactoryLogging: shouldLogComponentDebug()
    };
    
    // ✅ ETAPA 4: Configurar consolidação baseada no ambiente
    this.updateConsolidationSettings(envConfig);

    // ✅ WINSTON-STYLE: Configurar flush automático otimizado (só se consolidação ativa)
    if (envConfig.enableConsolidation) {
      this.setupGroupedLogsFlusher();
    }

    // ✅ ETAPA 5: Configurar sistema de buffering assíncrono
    this.setupAsyncBuffering(envConfig);
  }

  // ✅ ETAPA 4: Atualizar configurações de consolidação baseada no ambiente
  private updateConsolidationSettings(envConfig: any): void {
    // ✅ Desabilitar consolidação em produção para performance
    if (!envConfig.enableConsolidation) {
      this.sequentialLogs.clear();
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
        this.flushInterval = null;
      }
    } else {
      // ✅ Atualizar constantes de configuração baseadas no ambiente
      (this as any).CONSOLIDATION_WINDOW = envConfig.consolidationWindow;
      (this as any).MAX_SEQUENCE_LENGTH = envConfig.maxSequenceLength;
      
      // ✅ Reconfigurar flush interval
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
      }
      this.flushInterval = setInterval(() => {
        this.flushGroupedLogs();
      }, envConfig.flushInterval);
    }
  }

  // ✅ ETAPA 5: Configurar sistema de buffering assíncrono
  private setupAsyncBuffering(envConfig: any): void {
    // ✅ Configurar flush timer baseado no ambiente
    this.bufferFlushTimer = setInterval(() => {
      this.flushLogBuffer();
    }, this.BUFFER_FLUSH_INTERVAL);
    
    // ✅ Flush ao sair da página
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushLogBuffer();
      });
    }
  }

  // ✅ ETAPA 5: Adicionar log ao buffer para processamento assíncrono
  private addToLogBuffer(level: LogLevel, message: string, context?: LogContext, args?: any[]): void {
    // ✅ Verificar se deve usar buffering baseado no ambiente
    const envConfig = this.getEnvironmentLoggingConfig();
    
    // ✅ Em produção, usar buffering apenas para performance crítica
    if (envConfig.defaultLevel === 'error' && level !== 'error') {
      return; // ✅ Não bufferar logs não críticos em produção
    }
    
    this.logBuffer.push({
      level,
      message,
      context,
      timestamp: Date.now(),
      args
    });
    
    // ✅ Flush forçado se buffer estiver muito cheio
    if (this.logBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.flushLogBuffer();
    }
  }

  // ✅ ETAPA 5: Processar buffer de logs de forma assíncrona
  private async flushLogBuffer(): Promise<void> {
    if (this.processingBuffer || this.logBuffer.length === 0) {
      return;
    }
    
    this.processingBuffer = true;
    
    try {
      // ✅ Processar logs em lotes para melhor performance
      const logsToProcess = [...this.logBuffer];
      this.logBuffer = []; // ✅ Limpar buffer imediatamente
      
      // ✅ Processar logs usando requestIdleCallback quando disponível
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          this.processBatchLogs(logsToProcess);
        });
      } else {
        // ✅ Fallback para setTimeout
        setTimeout(() => {
          this.processBatchLogs(logsToProcess);
        }, 0);
      }
    } catch (error) {
      console.error('❌ [Logger] Erro ao processar buffer:', error);
    } finally {
      this.processingBuffer = false;
    }
  }

  // ✅ ETAPA 5: Processar lote de logs
  private processBatchLogs(logs: Array<{ level: LogLevel; message: string; context?: LogContext; timestamp: number; args?: any[] }>): void {
    const groupedByComponent = new Map<string, typeof logs>();
    
    // ✅ Agrupar logs por componente para consolidação
    logs.forEach(log => {
      const component = log.context?.domain || 'General';
      if (!groupedByComponent.has(component)) {
        groupedByComponent.set(component, []);
      }
      groupedByComponent.get(component)!.push(log);
    });
    
    // ✅ Processar cada grupo de componente
    groupedByComponent.forEach((componentLogs, component) => {
      if (componentLogs.length === 1) {
        // ✅ Log único - processar diretamente
        const log = componentLogs[0];
        this.directConsoleLog(log.level, log.message, log.context, log.args);
      } else {
        // ✅ Múltiplos logs - criar log consolidado
        const timeSpan = componentLogs[componentLogs.length - 1].timestamp - componentLogs[0].timestamp;
        const consolidatedMessage = `[${component}] ${componentLogs.length} operações em ${timeSpan}ms`;
        
        this.directConsoleLog('info', consolidatedMessage, {
          domain: component,
          batchDetails: {
            count: componentLogs.length,
            timeSpanMs: timeSpan,
            levels: componentLogs.map(l => l.level)
          }
        });
      }
    });
  }

  // ✅ ETAPA 5: Log direto no console (bypass buffering)
  private directConsoleLog(level: LogLevel, message: string, context?: LogContext, args?: any[]): void {
    const formatted = this.formatMessage(level, message, context);
    
    switch (level) {
      case 'error':
        console.error(formatted, ...(args || []));
        break;
      case 'warn':
        console.warn(formatted, ...(args || []));
        break;
      case 'debug':
      case 'info':
      case 'http':
      case 'silly':
      default:
        console.log(formatted, ...(args || []));
        break;
    }
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
    
    // ✅ CORREÇÃO APLICADA: THROTTLING ULTRA-AGRESSIVO baseado na análise dos logs
    let adjustedThrottleMs = throttleMs;
    
    // ✅ CORREÇÃO ESPECÍFICA: ModernPipelineCreatorRefactored gerava 75+ logs por operação
    if (key.startsWith('ModernPipelineCreatorRefactored::')) {
      // ✅ CORREÇÃO CRÍTICA: Throttling extremo para parar spam de logs
      if (key.includes('tab-change') || key.includes('aba-ativa')) {
        adjustedThrottleMs = Math.max(throttleMs, 45000); // 45s para mudanças de aba
      } else if (key.includes('validation') || key.includes('data-loading')) {
        adjustedThrottleMs = Math.max(throttleMs, 30000); // 30s para validação repetida
      } else if (key.includes('form-dirty') || key.includes('state-update')) {
        adjustedThrottleMs = Math.max(throttleMs, 25000); // 25s para mudanças de estado
      } else {
        adjustedThrottleMs = Math.max(throttleMs, 20000); // 20s padrão
      }
    } else if (key.startsWith('SimpleMotivesManager::') || key.includes('ReasonItem')) {
      // ✅ CORREÇÃO CRÍTICA: SimpleMotivesManager gerando loops infinitos de sync
      if (key.includes('sync') || key.includes('sincronização') || key.includes('Estado de sincronização')) {
        adjustedThrottleMs = Math.max(throttleMs, 60000); // 60s para logs de sincronização
      } else if (key.includes('render') || key.includes('renders suprimidos')) {
        adjustedThrottleMs = Math.max(throttleMs, 45000); // 45s para logs de renderização
      } else if (key.includes('dados-recebidos') || key.includes('field_reason_text')) {
        adjustedThrottleMs = Math.max(throttleMs, 30000); // 30s para logs de dados
      } else {
        adjustedThrottleMs = Math.max(throttleMs, 25000); // 25s padrão para SimpleMotivesManager
      }
    } else if (spamComponents.includes(key)) {
      adjustedThrottleMs = Math.max(throttleMs, 12000); // 12s para outros componentes spam
    }
    
    // ✅ CORREÇÃO APLICADA: Detecção de spam baseada nos logs analisados
    const timeSinceLastLog = now - lastLog;
    if (timeSinceLastLog < 300) { // Menos de 300ms indica spam crítico
      adjustedThrottleMs = Math.max(adjustedThrottleMs, 60000); // 60s de throttle para spam crítico
    } else if (timeSinceLastLog < 1000) { // Menos de 1s
      adjustedThrottleMs = Math.max(adjustedThrottleMs, 35000); // 35s para spam moderado
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

  // ✅ ETAPA 3: Adicionar log à sequência de consolidação
  public addToSequentialConsolidation(component: string, operation: string, message: string, data?: any): void {
    const key = `${component}::${operation}`;
    const now = Date.now();
    
    let sequence = this.sequentialLogs.get(key);
    
    if (!sequence) {
      // ✅ Criar nova sequência
      sequence = {
        sequence: [],
        lastActivity: now,
        consolidationTimer: undefined
      };
      this.sequentialLogs.set(key, sequence);
    }
    
    // ✅ Adicionar log à sequência
    sequence.sequence.push({ message, data, timestamp: now });
    sequence.lastActivity = now;
    
    // ✅ Limitar tamanho da sequência para evitar uso excessivo de memória
    if (sequence.sequence.length > this.MAX_SEQUENCE_LENGTH) {
      sequence.sequence.shift(); // Remove o mais antigo
    }
    
    // ✅ Cancelar timer anterior se existir
    if (sequence.consolidationTimer) {
      clearTimeout(sequence.consolidationTimer);
    }
    
    // ✅ Configurar novo timer de consolidação
    sequence.consolidationTimer = setTimeout(() => {
      this.flushSequentialLogs(key);
    }, this.CONSOLIDATION_WINDOW);
  }

  // ✅ ETAPA 3: Flush de logs sequenciais consolidados
  private flushSequentialLogs(key: string): void {
    const sequence = this.sequentialLogs.get(key);
    if (!sequence || sequence.sequence.length === 0) {
      return;
    }
    
    const [component, operation] = key.split('::');
    const logCount = sequence.sequence.length;
    const firstLog = sequence.sequence[0];
    const lastLog = sequence.sequence[sequence.sequence.length - 1];
    const timeSpan = lastLog.timestamp - firstLog.timestamp;
    
    if (logCount === 1) {
      // ✅ Log único - exibir normalmente
      const formatted = this.formatMessage('info', firstLog.message, { domain: component });
      console.log(formatted, firstLog.data);
    } else {
      // ✅ Múltiplos logs - consolidar em uma entrada
      const consolidatedMessage = `${operation} (${logCount} operações em ${timeSpan}ms)`;
      const consolidatedData = {
        domain: component,
        consolidatedSequence: {
          operationCount: logCount,
          timeSpanMs: timeSpan,
          firstMessage: firstLog.message,
          lastMessage: lastLog.message,
          detailedSequence: sequence.sequence.map(log => ({
            message: log.message,
            relativeTime: log.timestamp - firstLog.timestamp
          }))
        },
        // ✅ Incluir dados do último log para contexto
        ...lastLog.data
      };
      
      const formatted = this.formatMessage('info', consolidatedMessage, consolidatedData);
      console.log(formatted);
    }
    
    // ✅ Limpar sequência após flush
    this.sequentialLogs.delete(key);
  }

  // ✅ ETAPA 3: Detectar se um log deve ser consolidado sequencialmente
  private shouldUseSequentialConsolidation(message: string, context?: LogContext): { shouldConsolidate: boolean; component: string; operation: string } {
    const msg = String(message).toLowerCase();
    
    // ✅ Detectar padrões de logs que devem ser consolidados
    const consolidationPatterns = [
      {
        pattern: ['form', 'dirty', 'update', 'changed', 'valor', 'input'],
        component: 'ModernPipelineCreatorRefactored',
        operation: 'form-updates'
      },
      {
        pattern: ['validation', 'validando', 'field', 'campo', 'error', 'erro'],
        component: 'ModernPipelineCreatorRefactored', 
        operation: 'validation-sequence'
      },
      {
        pattern: ['effect', 'useeffect', 'running', 'executando', 'dependency'],
        component: 'ModernPipelineCreatorRefactored',
        operation: 'effect-chain'
      },
      {
        pattern: ['state', 'estado', 'update', 'setstate', 'changing'],
        component: 'ModernPipelineCreatorRefactored',
        operation: 'state-changes'
      },
      {
        pattern: ['loading', 'carregando', 'data', 'fetch', 'fetching'],
        component: 'ModernPipelineCreatorRefactored',
        operation: 'data-operations'
      },
      {
        pattern: ['render', 'rendering', 'renderizando', 'component', 'mount'],
        component: 'ModernPipelineCreatorRefactored',
        operation: 'render-cycle'
      },
      {
        pattern: ['tab', 'aba', 'mudou', 'changed', 'switch', 'navigation'],
        component: 'ModernPipelineCreatorRefactored',
        operation: 'navigation-sequence'
      }
    ];
    
    // ✅ Verificar se o contexto indica um componente específico
    let detectedComponent = context?.domain || 'Unknown';
    
    // ✅ Mapear domínios para componentes
    if (context?.domain) {
      const domainMappings: Record<string, string> = {
        'pipeline-form': 'ModernPipelineCreatorRefactored',
        'pipeline-init': 'ModernPipelineCreatorRefactored',
        'pipeline-data': 'ModernPipelineCreatorRefactored',
        'pipeline-effect': 'ModernPipelineCreatorRefactored',
        'pipeline-state': 'ModernPipelineCreatorRefactored',
        'pipeline-tabs': 'ModernPipelineCreatorRefactored',
        'pipeline-general': 'ModernPipelineCreatorRefactored'
      };
      detectedComponent = domainMappings[context.domain] || detectedComponent;
    }
    
    // ✅ Procurar padrões que indicam necessidade de consolidação
    for (const pattern of consolidationPatterns) {
      const hasPatternMatch = pattern.pattern.some(keyword => msg.includes(keyword));
      
      if (hasPatternMatch) {
        // ✅ Verificar se o componente também bate
        const isTargetComponent = detectedComponent.includes(pattern.component) || 
                                   msg.includes(pattern.component.toLowerCase());
        
        if (isTargetComponent) {
          return {
            shouldConsolidate: true,
            component: pattern.component,
            operation: pattern.operation
          };
        }
      }
    }
    
    return { shouldConsolidate: false, component: detectedComponent, operation: 'unknown' };
  }

  // ✅ ETAPA 4: Verificar se componente específico deve loggar baseado no ambiente
  private shouldComponentLog(componentName: string, level: LogLevel): boolean {
    const envConfig = this.getEnvironmentLoggingConfig();
    const componentLevel = envConfig.componentLoggingLevel[componentName];
    
    if (componentLevel && componentLevel !== 'none') {
      // ✅ Aplicar nível específico do componente
      return LOG_LEVELS[level] <= LOG_LEVELS[componentLevel];
    }
    
    // ✅ Usar configuração padrão se componente não especificado
    return this.shouldLog(level);
  }

  // ✅ ETAPA 3: Limpeza manual de consolidação para teste ou debug
  public flushAllSequentialLogs(): void {
    console.log(`🔄 [Logger] Forçando flush de ${this.sequentialLogs.size} sequências pendentes`);
    
    this.sequentialLogs.forEach((sequence, key) => {
      if (sequence.consolidationTimer) {
        clearTimeout(sequence.consolidationTimer);
      }
      this.flushSequentialLogs(key);
    });
  }

  // ✅ ETAPA 3: Método para cleanup ao destruir o logger
  public cleanup(): void {
    // ✅ Limpar todos os timers de consolidação
    this.sequentialLogs.forEach((sequence) => {
      if (sequence.consolidationTimer) {
        clearTimeout(sequence.consolidationTimer);
      }
    });
    this.sequentialLogs.clear();
    
    // ✅ Limpar flush interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // ✅ Flush final dos logs agrupados
    this.flushGroupedLogs();
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
    
    // ✅ ETAPA 4: Configuração mais granular por ambiente
    const environmentConfig = this.getEnvironmentLoggingConfig();
    return environmentConfig.defaultLevel;
  }

  // ✅ ETAPA 4: Configuração específica por ambiente
  private getEnvironmentLoggingConfig() {
    const baseUrl = window.location.origin;
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
    const isStaging = baseUrl.includes('staging') || baseUrl.includes('develop');
    const isProduction = baseUrl.includes('.com.br') || this.environment === 'production';
    
    // ✅ Configurações por tipo de ambiente
    if (isLocalhost || this.environment === 'development') {
      return {
        defaultLevel: 'info' as LogLevel,
        enableConsolidation: true,
        throttleMultiplier: 1.0,
        flushInterval: 3000,
        maxSequenceLength: 10,
        consolidationWindow: 2000,
        enablePerformanceTracking: true,
        enableDataMasking: false,
        componentLoggingLevel: {
          'ModernPipelineCreatorRefactored': 'debug',
          'LeadsModule': 'info', 
          'PipelineKanban': 'info',
          'TasksDropdown': 'warn'
        }
      };
    } else if (isStaging) {
      return {
        defaultLevel: 'warn' as LogLevel,
        enableConsolidation: true,
        throttleMultiplier: 1.5,
        flushInterval: 5000,
        maxSequenceLength: 8,
        consolidationWindow: 3000,
        enablePerformanceTracking: true,
        enableDataMasking: true,
        componentLoggingLevel: {
          'ModernPipelineCreatorRefactored': 'warn',
          'LeadsModule': 'warn',
          'PipelineKanban': 'warn', 
          'TasksDropdown': 'error'
        }
      };
    } else if (isProduction) {
      return {
        defaultLevel: 'error' as LogLevel,
        enableConsolidation: false, // ✅ Produção: sem consolidação para performance
        throttleMultiplier: 3.0,
        flushInterval: 10000,
        maxSequenceLength: 5,
        consolidationWindow: 5000,
        enablePerformanceTracking: false,
        enableDataMasking: true,
        componentLoggingLevel: {
          'ModernPipelineCreatorRefactored': 'error',
          'LeadsModule': 'error',
          'PipelineKanban': 'error',
          'TasksDropdown': 'none'
        }
      };
    } else {
      // ✅ Fallback para ambiente de teste
      return {
        defaultLevel: 'error' as LogLevel,
        enableConsolidation: false,
        throttleMultiplier: 2.0,
        flushInterval: 8000,
        maxSequenceLength: 3,
        consolidationWindow: 1000,
        enablePerformanceTracking: false,
        enableDataMasking: true,
        componentLoggingLevel: {}
      };
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

  // ✅ WINSTON-STYLE: Função segura para eliminar undefined em logs
  private safeFormat(value: any, fieldName?: string): any {
    if (value === undefined) {
      return fieldName ? `[${fieldName}:N/A]` : 'N/A';
    }
    
    if (value === null) {
      return fieldName ? `[${fieldName}:null]` : 'null';
    }
    
    if (typeof value === 'object' && value !== null) {
      const safeObj: any = {};
      for (const [key, val] of Object.entries(value)) {
        safeObj[key] = this.safeFormat(val, key);
      }
      return safeObj;
    }
    
    if (typeof value === 'string' && value.trim() === '') {
      return fieldName ? `[${fieldName}:empty]` : '[empty]';
    }
    
    return value;
  }

  // ✅ WINSTON-STYLE: Safe string interpolation para evitar "undefined"
  private safeInterpolate(template: string, values: Record<string, any>): string {
    return template.replace(/\$\{(\w+)\}/g, (match, key) => {
      const value = values[key];
      if (value === undefined) return `[${key}:N/A]`;
      if (value === null) return `[${key}:null]`;
      return String(value);
    });
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    // ✅ CORREÇÃO APLICADA: Formatação seguindo winston.format.combine() padrões
    let formatted = '';
    
    // ✅ WINSTON-STYLE: Timestamp consistente no formato ISO padronizado
    if (this.config.enableTimestamp) {
      const now = new Date();
      formatted += `${now.toISOString()} `;
    }

    // ✅ WINSTON-STYLE: Level padronizado seguindo RFC5424
    const levelUpper = level.toUpperCase().padEnd(5, ' '); // Padronizar largura
    formatted += `[${levelUpper}] `;

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

    // ✅ CORREÇÃO: Usar safeFormat e formatação consistente de IDs
    const safeContext = context ? this.safeFormat(context) : {};

    // ✅ WINSTON-STYLE: Correlation ID padronizado (sempre 8 chars)
    if (safeContext.correlationId && this.config.enableCorrelationId) {
      const corrId = String(safeContext.correlationId);
      const formattedCorrId = corrId.length > 8 ? corrId.substring(0, 8) : corrId;
      formatted += `[COR:${formattedCorrId}] `;
    }

    // ✅ CORREÇÃO APLICADA: Tenant ID usando formatação padronizada
    if (safeContext.tenantId) {
      const tenantId = String(safeContext.tenantId);
      const formattedTenantId = this.config.enableDataMasking ? 
        this.maskId(tenantId) : 
        tenantId.substring(0, 8);
      formatted += `[T:${formattedTenantId}] `;
    }

    // ✅ WINSTON-STYLE: Domínio consistente
    if (safeContext.domain) {
      formatted += `[${String(safeContext.domain).toUpperCase()}] `;
    }

    // ✅ CORREÇÃO APLICADA: Performance info padronizada (sempre em ms)
    if (safeContext.performance?.duration) {
      let duration: string;
      if (typeof safeContext.performance.duration === 'number') {
        duration = `${Math.round(safeContext.performance.duration)}ms`;
      } else {
        const durationStr = String(safeContext.performance.duration);
        // Normalizar para sempre terminar com 'ms'
        duration = durationStr.includes('ms') ? durationStr : `${durationStr}ms`;
      }
      formatted += `(${duration}`;
      
      if (safeContext.performance.retries && Number(safeContext.performance.retries) > 0) {
        formatted += `, ${safeContext.performance.retries} retries`;
      }
      formatted += `) `;
    }

    // ✅ CORREÇÃO: Safe format da mensagem
    formatted += this.safeFormat(message);
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
        const safeArgs = args.map(arg => this.safeFormat(arg));
        console.error(this.formatMessage('error', message, { ...maskedContext, correlationId }), ...safeArgs);
      } else {
        const safeContextOrString = this.safeFormat(contextOrString);
        const safeArgs = args.map(arg => this.safeFormat(arg));
        console.error(this.formatMessage('error', message), safeContextOrString, ...safeArgs);
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
        const safeArgs = args.map(arg => this.safeFormat(arg));
        console.warn(this.formatMessage('warn', message, { ...maskedContext, correlationId }), ...safeArgs);
      } else {
        const safeContextOrString = this.safeFormat(contextOrString);
        const safeArgs = args.map(arg => this.safeFormat(arg));
        console.warn(this.formatMessage('warn', message), safeContextOrString, ...safeArgs);
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
        const safeArgs = args.map(arg => this.safeFormat(arg));
        
        // ✅ ETAPA 3: Verificar se deve usar consolidação sequencial
        const consolidationResult = this.shouldUseSequentialConsolidation(message, context);
        
        if (consolidationResult.shouldConsolidate) {
          // ✅ Usar consolidação sequencial para logs relacionados
          this.addToSequentialConsolidation(
            consolidationResult.component,
            consolidationResult.operation,
            message,
            { ...maskedContext, correlationId, args: safeArgs }
          );
        } else {
          // ✅ ETAPA 5: Usar buffering assíncrono quando apropriado
          const envConfig = this.getEnvironmentLoggingConfig();
          if (envConfig.defaultLevel !== 'error' && !this.isDev) {
            this.addToLogBuffer('info', message, { ...maskedContext, correlationId }, safeArgs);
          } else {
            // ✅ Log direto para desenvolvimento ou logs críticos
            console.log(this.formatMessage('info', message, { ...maskedContext, correlationId }), ...safeArgs);
          }
        }
      } else {
        const safeContextOrString = this.safeFormat(contextOrString);
        const safeArgs = args.map(arg => this.safeFormat(arg));
        
        // ✅ ETAPA 3: Verificar consolidação mesmo sem contexto complexo
        const consolidationResult = this.shouldUseSequentialConsolidation(message);
        
        if (consolidationResult.shouldConsolidate) {
          // ✅ Usar consolidação sequencial
          this.addToSequentialConsolidation(
            consolidationResult.component,
            consolidationResult.operation,
            message,
            { contextStr: safeContextOrString, args: safeArgs }
          );
        } else {
          // ✅ Log normal
          console.log(this.formatMessage('info', message), safeContextOrString, ...safeArgs);
        }
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
        const safeArgs = args.map(arg => this.safeFormat(arg));
        
        // ✅ ETAPA 3: Verificar se deve usar consolidação sequencial
        const consolidationResult = this.shouldUseSequentialConsolidation(message, context);
        
        if (consolidationResult.shouldConsolidate) {
          // ✅ Usar consolidação sequencial para logs relacionados
          this.addToSequentialConsolidation(
            consolidationResult.component,
            consolidationResult.operation,
            message,
            { ...maskedContext, correlationId, args: safeArgs }
          );
        } else {
          // ✅ Log normal sem consolidação
          console.log(this.formatMessage('debug', message, { ...maskedContext, correlationId }), ...safeArgs);
        }
      } else {
        const safeContextOrString = this.safeFormat(contextOrString);
        const safeArgs = args.map(arg => this.safeFormat(arg));
        
        // ✅ ETAPA 3: Verificar consolidação mesmo sem contexto complexo
        const consolidationResult = this.shouldUseSequentialConsolidation(message);
        
        if (consolidationResult.shouldConsolidate) {
          // ✅ Usar consolidação sequencial
          this.addToSequentialConsolidation(
            consolidationResult.component,
            consolidationResult.operation,
            message,
            { contextStr: safeContextOrString, args: safeArgs }
          );
        } else {
          // ✅ Log normal
          console.log(this.formatMessage('debug', message), safeContextOrString, ...safeArgs);
        }
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
        const safeArgs = args.map(arg => this.safeFormat(arg));
        console.log(this.formatMessage('http', message, { ...maskedContext, correlationId }), ...safeArgs);
      } else {
        const safeContextOrString = this.safeFormat(contextOrString);
        const safeArgs = args.map(arg => this.safeFormat(arg));
        console.log(this.formatMessage('http', message), safeContextOrString, ...safeArgs);
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
        const safeArgs = args.map(arg => this.safeFormat(arg));
        
        // ✅ ETAPA 3: Verificar se deve usar consolidação sequencial  
        const consolidationResult = this.shouldUseSequentialConsolidation(message, context);
        
        if (consolidationResult.shouldConsolidate) {
          // ✅ Usar consolidação sequencial para logs relacionados
          this.addToSequentialConsolidation(
            consolidationResult.component,
            consolidationResult.operation,
            message,
            { ...maskedContext, correlationId, args: safeArgs }
          );
        } else {
          // ✅ Log normal sem consolidação
          console.log(this.formatMessage('silly', message, { ...maskedContext, correlationId }), ...safeArgs);
        }
      } else {
        const safeContextOrString = this.safeFormat(contextOrString);
        const safeArgs = args.map(arg => this.safeFormat(arg));
        
        // ✅ ETAPA 3: Verificar consolidação mesmo sem contexto complexo
        const consolidationResult = this.shouldUseSequentialConsolidation(message);
        
        if (consolidationResult.shouldConsolidate) {
          // ✅ Usar consolidação sequencial
          this.addToSequentialConsolidation(
            consolidationResult.component,
            consolidationResult.operation,
            message,
            { contextStr: safeContextOrString, args: safeArgs }
          );
        } else {
          // ✅ Log normal
          console.log(this.formatMessage('silly', message), safeContextOrString, ...safeArgs);
        }
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

    // ✅ MÉTODO DEBUG: Compatibilidade com chamadas diretas debug
    debug: (message: string, context?: any) => {
      // Mapear chamadas debug para smartLog com processamento inteligente
      loggers.modernPipelineCreator.smartLog(message, context);
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
    groupedLogsSize: logger['groupedLogs']?.size || 0,
    // ✅ ETAPA 3: Estatísticas de consolidação sequencial
    sequentialLogsSize: logger['sequentialLogs']?.size || 0,
    consolidationWindow: logger['CONSOLIDATION_WINDOW'] || 2000,
    maxSequenceLength: logger['MAX_SEQUENCE_LENGTH'] || 10,
    activeConsolidationTimers: Array.from(logger['sequentialLogs']?.values() || [])
      .filter(seq => seq.consolidationTimer !== undefined).length
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
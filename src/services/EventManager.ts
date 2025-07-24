// =====================================================================================
// EVENT MANAGER SINGLETON OTIMIZADO
// Integrado com sistema de logging otimizado e feature flags
// =====================================================================================

import { logIfEnabled, LogContext, LogFeatures } from '../utils/loggerOptimized';

/**
 * Tipos de eventos personalizados do sistema
 */
export interface PipelineEvents {
  'pipeline-create-requested': { detail: any };
  'pipeline-edit-requested': { detail: { pipelineId: string; pipeline: any } };
  'pipeline-archive-requested': { detail: { pipelineId: string; shouldArchive: boolean } };
  'pipeline-unarchive-requested': { detail: { pipelineId: string } };
  'pipeline-view-changed': { detail: { pipelineId: string; pipelineName: string } };
  'pipeline-view-entered': { detail: { pipelineId: string; pipelineName: string; userRole: string; fromCache: boolean; directAccess: boolean } };
  'admin-activated': { detail: any };
  'leads-data-updated': { detail: any };
}

type EventName = keyof PipelineEvents;
type EventHandler<T extends EventName> = (event: PipelineEvents[T]) => void;

/**
 * Interface para registro de listeners otimizada
 */
interface ListenerRegistry {
  [key: string]: {
    handler: EventListener;
    component: string;
    active: boolean;
    createdAt: number;
    lastUsed: number;
  };
}

interface DebouncedOperation {
  timeout: NodeJS.Timeout;
  count: number;
}

/**
 * EventManager Singleton Otimizado - Gerencia todos os event listeners do sistema
 */
class EventManager {
  private static instance: EventManager;
  private listeners: ListenerRegistry = {};
  private debouncedOps: Map<string, DebouncedOperation> = new Map();
  private readonly DEBOUNCE_DELAY = 100; // 100ms debounce para operações frequentes
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutos
  private cleanupTimer?: NodeJS.Timeout;

  private constructor() {
    logIfEnabled('ENABLE_EVENT_MANAGER_LOGGING', 'debug', 'Singleton inicializado', LogContext.EVENT_MANAGER);
    
    // Agendar limpeza periódica de listeners inativos
    this.schedulePeriodicCleanup();
  }

  public static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  /**
   * Agenda limpeza periódica de listeners inativos
   */
  private schedulePeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupInactiveListeners();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Remove listeners inativos há mais de 10 minutos
   */
  private cleanupInactiveListeners(): void {
    const now = Date.now();
    const INACTIVE_THRESHOLD = 10 * 60 * 1000; // 10 minutos
    
    let cleanedCount = 0;
    Object.keys(this.listeners).forEach(key => {
      const listener = this.listeners[key];
      if (!listener.active && (now - listener.lastUsed) > INACTIVE_THRESHOLD) {
        delete this.listeners[key];
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      logIfEnabled('ENABLE_EVENT_MANAGER_LOGGING', 'debug', 
        `Limpeza periódica: ${cleanedCount} listeners inativos removidos`, LogContext.EVENT_MANAGER);
    }
  }

  /**
   * Debounce para operações frequentes de logging
   */
  private debouncedLog(key: string, message: string): void {
    const existing = this.debouncedOps.get(key);
    
    if (existing) {
      clearTimeout(existing.timeout);
      existing.count++;
    }

    const operation: DebouncedOperation = {
      timeout: setTimeout(() => {
        const count = this.debouncedOps.get(key)?.count || 1;
        const finalMessage = count > 1 ? `${message} (${count}x)` : message;
        
        logIfEnabled('ENABLE_EVENT_MANAGER_LOGGING', 'debug', finalMessage, LogContext.EVENT_MANAGER);
        this.debouncedOps.delete(key);
      }, this.DEBOUNCE_DELAY),
      count: existing ? existing.count + 1 : 1
    };

    this.debouncedOps.set(key, operation);
  }

  /**
   * Registra um listener de forma otimizada com debounce
   */
  public subscribe<T extends EventName>(
    eventName: T,
    handler: EventHandler<T>,
    componentName: string,
    options?: { once?: boolean; passive?: boolean }
  ): () => void {
    const listenerKey = `${eventName}:${componentName}`;
    const now = Date.now();
    
    // Verifica se já existe um listener ativo para este componente/evento
    if (this.listeners[listenerKey]?.active) {
      logIfEnabled('ENABLE_EVENT_MANAGER_LOGGING', 'warn', 
        `Listener ${listenerKey} já ativo - ignorando duplicado`, LogContext.EVENT_MANAGER);
      return () => {}; // Retorna função vazia se já está registrado
    }

    const eventListener = (event: Event) => {
      try {
        // Atualizar timestamp de último uso
        if (this.listeners[listenerKey]) {
          this.listeners[listenerKey].lastUsed = Date.now();
        }
        
        handler(event as PipelineEvents[T]);
      } catch (error) {
        logIfEnabled('ENABLE_EVENT_MANAGER_LOGGING', 'error', 
          `Erro no handler ${listenerKey}: ${error}`, LogContext.EVENT_MANAGER);
      }
    };

    // Configurar opções do listener
    const listenerOptions: AddEventListenerOptions = {
      once: options?.once || false,
      passive: options?.passive || true
    };

    // Registrar no DOM
    window.addEventListener(eventName, eventListener, listenerOptions);

    // Armazenar no registry com timestamps
    this.listeners[listenerKey] = {
      handler: eventListener,
      component: componentName,
      active: true,
      createdAt: now,
      lastUsed: now
    };

    // Log com debounce para reduzir spam
    this.debouncedLog(`register-${componentName}`, `Listener registrado: ${listenerKey}`);

    // Retornar função de unsubscribe
    return () => this.unsubscribe(eventName, componentName);
  }

  /**
   * Remove um listener específico de forma otimizada
   */
  public unsubscribe<T extends EventName>(eventName: T, componentName: string): void {
    const listenerKey = `${eventName}:${componentName}`;
    const listener = this.listeners[listenerKey];

    if (listener && listener.active) {
      window.removeEventListener(eventName, listener.handler);
      listener.active = false;
      listener.lastUsed = Date.now();

      // Log com debounce para reduzir spam
      this.debouncedLog(`unsubscribe-${componentName}`, `Listener removido: ${listenerKey}`);
    }
  }

  /**
   * Remove todos os listeners de um componente com debounce
   */
  public unsubscribeAll(componentName: string): void {
    const componentListeners = Object.keys(this.listeners).filter(key => 
      key.includes(componentName) && this.listeners[key].active
    );

    componentListeners.forEach(listenerKey => {
      const [eventName] = listenerKey.split(':');
      const listener = this.listeners[listenerKey];
      
      if (listener && listener.active) {
        window.removeEventListener(eventName, listener.handler);
        listener.active = false;
        listener.lastUsed = Date.now();
      }
    });

    if (componentListeners.length > 0) {
      // Log consolidado com debounce
      this.debouncedLog(`unsubscribe-all-${componentName}`, 
        `${componentListeners.length} listeners removidos de ${componentName}`);
    }
  }

  /**
   * Dispara um evento customizado de forma otimizada
   */
  public emit<T extends EventName>(eventName: T, detail: PipelineEvents[T]['detail']): void {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);

    // Log apenas eventos importantes com debounce
    if (eventName.includes('create') || eventName.includes('archive')) {
      this.debouncedLog(`emit-${eventName}`, `Evento disparado: ${eventName}`);
    }
  }

  /**
   * Verifica se um listener está ativo
   */
  public isActive(eventName: EventName, componentName: string): boolean {
    const listenerKey = `${eventName}:${componentName}`;
    return this.listeners[listenerKey]?.active || false;
  }

  /**
   * Retorna estatísticas detalhadas dos listeners
   */
  public getStats(): { 
    total: number; 
    active: number; 
    inactive: number; 
    byComponent: Record<string, number>;
    oldestListener: number;
    memoryUsage: number;
  } {
    const allListeners = Object.values(this.listeners);
    const activeListeners = allListeners.filter(l => l.active);
    const inactiveListeners = allListeners.filter(l => !l.active);
    const now = Date.now();

    const byComponent: Record<string, number> = {};
    activeListeners.forEach(listener => {
      byComponent[listener.component] = (byComponent[listener.component] || 0) + 1;
    });

    const oldestListener = allListeners.length > 0 ? 
      Math.min(...allListeners.map(l => l.createdAt)) : now;

    return {
      total: allListeners.length,
      active: activeListeners.length,
      inactive: inactiveListeners.length,
      byComponent,
      oldestListener: Math.floor((now - oldestListener) / 1000), // segundos
      memoryUsage: JSON.stringify(this.listeners).length // aproximação
    };
  }

  /**
   * Limpa todos os listeners de forma otimizada
   */
  public cleanup(): void {
    // Limpar todos os timeouts debounced
    this.debouncedOps.forEach(op => clearTimeout(op.timeout));
    this.debouncedOps.clear();

    // Limpar timer de cleanup periódico
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Remover todos os listeners ativos
    let removedCount = 0;
    Object.keys(this.listeners).forEach(listenerKey => {
      const [eventName] = listenerKey.split(':');
      const listener = this.listeners[listenerKey];
      
      if (listener.active) {
        window.removeEventListener(eventName, listener.handler);
        removedCount++;
      }
    });

    this.listeners = {};

    logIfEnabled('ENABLE_EVENT_MANAGER_LOGGING', 'debug', 
      `Cleanup completo - ${removedCount} listeners removidos`, LogContext.EVENT_MANAGER);
  }
}

// ============================================
// HOOKS REACT PARA USO OTIMIZADO
// ============================================

import { useEffect, useRef } from 'react';

/**
 * Hook React para gerenciamento otimizado de event listeners
 */
export function useEventManager() {
  const eventManager = useRef(EventManager.getInstance());
  
  return {
    subscribe: eventManager.current.subscribe.bind(eventManager.current),
    unsubscribe: eventManager.current.unsubscribe.bind(eventManager.current),
    unsubscribeAll: eventManager.current.unsubscribeAll.bind(eventManager.current),
    emit: eventManager.current.emit.bind(eventManager.current),
    isActive: eventManager.current.isActive.bind(eventManager.current),
    getStats: eventManager.current.getStats.bind(eventManager.current)
  };
}

/**
 * Hook para auto-cleanup em componentes com logging otimizado
 */
export function useAutoCleanupEventManager(componentName: string) {
  const eventManager = useEventManager();

  useEffect(() => {
    return () => {
      eventManager.unsubscribeAll(componentName);
    };
  }, [eventManager, componentName]);

  return eventManager;
}

export default EventManager;
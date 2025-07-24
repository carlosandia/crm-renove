/**
 * ============================================
 * ⚡ OTIMIZAÇÕES DE PERFORMANCE
 * ============================================
 * 
 * Utilitários para reduzir re-renders e melhorar performance
 * AIDEV-NOTE: Centraliza patterns de otimização para hooks e componentes
 */

import { useCallback, useRef, useMemo } from 'react';
import { createLogger } from './optimizedLogger';

const perfLogger = createLogger('Performance');

/**
 * ✅ DEBOUNCE HOOK PARA REDUZIR CALLS EXCESSIVAS
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
};

/**
 * ✅ THROTTLE HOOK PARA LIMITAR FREQUÊNCIA DE CALLS
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        // Executar imediatamente se passou o tempo suficiente
        lastCallRef.current = now;
        callback(...args);
      } else {
        // Agendar para executar quando o delay for atingido
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastCall);
      }
    }) as T,
    [callback, delay]
  );
};

/**
 * ✅ MEMOIZAÇÃO PROFUNDA PARA OBJETOS COMPLEXOS
 */
export const useDeepMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  const dependenciesRef = useRef<React.DependencyList>();
  const valueRef = useRef<T>();

  // Comparação profunda simples para arrays e objetos primitivos
  const depsChanged = useMemo(() => {
    if (!dependenciesRef.current) return true;
    if (dependenciesRef.current.length !== deps.length) return true;
    
    return deps.some((dep, index) => {
      const prevDep = dependenciesRef.current![index];
      
      // Comparação básica para primitivos
      if (dep !== prevDep) {
        // Para objetos, fazer comparação superficial
        if (typeof dep === 'object' && typeof prevDep === 'object' && dep && prevDep) {
          const depKeys = Object.keys(dep);
          const prevDepKeys = Object.keys(prevDep);
          
          if (depKeys.length !== prevDepKeys.length) return true;
          
          return depKeys.some(key => (dep as any)[key] !== (prevDep as any)[key]);
        }
        return true;
      }
      return false;
    });
  }, deps);

  if (depsChanged) {
    dependenciesRef.current = deps;
    valueRef.current = factory();
    perfLogger.debug('useDeepMemo: Valor recalculado');
  }

  return valueRef.current!;
};

/**
 * ✅ HOOK PARA DETECTAR MUDANÇAS DESNECESSÁRIAS
 */
export const useWhyDidYouUpdate = (name: string, props: Record<string, any>) => {
  const previousProps = useRef<Record<string, any>>();

  if (import.meta.env.DEV && import.meta.env.VITE_LOG_LEVEL === 'debug') {
    if (previousProps.current) {
      const allKeys = Object.keys({...previousProps.current, ...props});
      const changedProps: Record<string, { from: any; to: any }> = {};

      allKeys.forEach(key => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key]
          };
        }
      });

      if (Object.keys(changedProps).length) {
        perfLogger.debug(`[${name}] Props que mudaram:`, changedProps);
      }
    }

    previousProps.current = props;
  }
};

/**
 * ✅ CACHE DE FUNÇÕES COM BASE EM KEYS
 */
const functionCache = new Map<string, any>();

export const useCachedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  cacheKey: string,
  deps: React.DependencyList
): T => {
  return useCallback(() => {
    const key = `${cacheKey}_${JSON.stringify(deps)}`;
    
    if (!functionCache.has(key)) {
      functionCache.set(key, callback);
      perfLogger.debug(`Função cached: ${cacheKey}`);
    }
    
    return functionCache.get(key);
  }, deps) as T;
};

/**
 * ✅ HOOK PARA PREVENIR RE-RENDERS EM COMPONENTES FILHOS
 */
export const useStableReference = <T>(value: T): T => {
  const ref = useRef<T>(value);
  
  // Atualizar apenas se realmente mudou (comparação superficial)
  if (JSON.stringify(ref.current) !== JSON.stringify(value)) {
    ref.current = value;
  }
  
  return ref.current;
};

/**
 * ✅ BATCH DE ATUALIZAÇÕES DE ESTADO
 */
let pendingUpdates: (() => void)[] = [];
let isUpdatePending = false;

export const batchUpdates = (updateFn: () => void) => {
  pendingUpdates.push(updateFn);
  
  if (!isUpdatePending) {
    isUpdatePending = true;
    
    // Usar React 18 automatic batching ou fallback para setTimeout
    Promise.resolve().then(() => {
      const updates = [...pendingUpdates];
      pendingUpdates = [];
      isUpdatePending = false;
      
      updates.forEach(update => update());
    });
  }
};

/**
 * ✅ HOOK PARA MEDIR PERFORMANCE DE RENDERS
 */
export const useRenderPerformance = (componentName: string) => {
  const renderCountRef = useRef(0);
  const startTimeRef = useRef<number>(performance.now());

  renderCountRef.current += 1;

  if (import.meta.env.DEV && import.meta.env.VITE_LOG_LEVEL === 'debug') {
    const renderTime = performance.now() - startTimeRef.current;
    
    if (renderTime > 16) { // Mais de 16ms pode causar janks
      perfLogger.warn(`${componentName} render lento:`, {
        renderCount: renderCountRef.current,
        renderTime: `${renderTime.toFixed(2)}ms`
      });
    }
  }

  startTimeRef.current = performance.now();
};
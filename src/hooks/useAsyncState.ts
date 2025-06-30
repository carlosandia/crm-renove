import { useState, useCallback } from 'react';

/**
 * 🔧 Hook padronizado para operações assíncronas
 * Elimina duplicação de loading/error states em 25+ componentes
 * 
 * @template T Tipo dos dados retornados pela operação assíncrona
 */
export interface UseAsyncStateReturn<T> {
  // Estados
  data: T | null;
  loading: boolean;
  error: string | null;
  
  // Operações
  execute: (asyncFn: () => Promise<T>) => Promise<T | null>;
  executeWithParams: <P extends any[]>(asyncFn: (...params: P) => Promise<T>, ...params: P) => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  
  // Computed
  isIdle: boolean;
  isSuccess: boolean;
  isError: boolean;
  hasData: boolean;
}

export const useAsyncState = <T = any>(initialData: T | null = null): UseAsyncStateReturn<T> => {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Executa uma função assíncrona gerenciando estados automaticamente
   */
  const execute = useCallback(async (asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await asyncFn();
      setData(result);
      return result;
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('🚨 [useAsyncState] Erro na execução:', errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Executa uma função assíncrona com parâmetros
   */
  const executeWithParams = useCallback(async <P extends any[]>(
    asyncFn: (...params: P) => Promise<T>, 
    ...params: P
  ): Promise<T | null> => {
    return execute(() => asyncFn(...params));
  }, [execute]);

  /**
   * Reseta todos os estados
   */
  const reset = useCallback(() => {
    setData(initialData);
    setLoading(false);
    setError(null);
  }, [initialData]);

  // Computed values
  const isIdle = !loading && !error && data === null;
  const isSuccess = !loading && !error && data !== null;
  const isError = !loading && error !== null;
  const hasData = data !== null;

  return {
    // Estados
    data,
    loading,
    error,
    
    // Operações
    execute,
    executeWithParams,
    reset,
    setData,
    setError,
    setLoading,
    
    // Computed
    isIdle,
    isSuccess,
    isError,
    hasData,
  };
};

 
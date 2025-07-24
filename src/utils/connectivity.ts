import React from 'react';

/**
 * Utilitários para gerenciar conectividade com o backend
 */

export interface ConnectivityStatus {
  isOnline: boolean;
  lastCheck: number;
  consecutiveFailures: number;
}

/**
 * Verifica se o backend está disponível
 */
export const checkBackendHealth = async (timeoutMs: number = 3000): Promise<boolean> => {
  try {
    // Criar AbortController para timeout manual (compatibilidade total)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('http://127.0.0.1:3001/health', {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    return response.ok;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('⏱️ [CONNECTIVITY] Timeout na verificação do backend');
    } else {
      console.log('🔌 [CONNECTIVITY] Backend indisponível:', error.message);
    }
    return false;
  }
};

/**
 * Hook personalizado para gerenciar conectividade
 */
export const useConnectivity = () => {
  const [status, setStatus] = React.useState<ConnectivityStatus>({
    isOnline: true,
    lastCheck: Date.now(),
    consecutiveFailures: 0
  });

  const checkConnectivity = React.useCallback(async (): Promise<boolean> => {
    const isOnline = await checkBackendHealth();
    
    setStatus(prev => ({
      isOnline,
      lastCheck: Date.now(),
      consecutiveFailures: isOnline ? 0 : prev.consecutiveFailures + 1
    }));

    return isOnline;
  }, []);

  return {
    ...status,
    checkConnectivity
  };
};

/**
 * Executa uma função apenas se o backend estiver online
 */
export const withConnectivity = async <T>(
  fn: () => Promise<T>,
  fallback?: () => T,
  showUserMessage: boolean = true
): Promise<T | undefined> => {
  const isOnline = await checkBackendHealth(2000);
  
  if (isOnline) {
    try {
      return await fn();
    } catch (error: any) {
      if (showUserMessage && error.message?.includes('fetch')) {
        console.warn('⚠️ [CONNECTIVITY] Erro de conectividade durante execução');
      }
      throw error;
    }
  } else {
    if (showUserMessage) {
      console.warn('🔌 [CONNECTIVITY] Backend offline, operação cancelada');
    }
    return fallback ? fallback() : undefined;
  }
};

export default {
  checkBackendHealth,
  useConnectivity,
  withConnectivity
}; 
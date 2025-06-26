import React from 'react';

// ============================================
// SISTEMA DE HEALTH CHECK UNIVERSAL
// ============================================

interface HealthCheckResult {
  isHealthy: boolean;
  service: string;
  latency: number;
  error?: string;
  timestamp: number;
}

interface NetworkStatus {
  backend: HealthCheckResult;
  supabase: HealthCheckResult;
  overall: 'healthy' | 'degraded' | 'offline';
}

class NetworkHealthManager {
  private static instance: NetworkHealthManager;
  private healthCache = new Map<string, HealthCheckResult>();
  private readonly CACHE_TTL = 30000; // 30 segundos
  private readonly BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  private readonly SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  static getInstance(): NetworkHealthManager {
    if (!NetworkHealthManager.instance) {
      NetworkHealthManager.instance = new NetworkHealthManager();
    }
    return NetworkHealthManager.instance;
  }

  // ============================================
  // HEALTH CHECK BACKEND
  // ============================================
  async checkBackendHealth(): Promise<HealthCheckResult> {
    const cacheKey = 'backend';
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const startTime = Date.now();
    
    try {
      // Múltiplas tentativas com timeouts progressivos
      const endpoints = [
        `${this.BACKEND_URL}/health`,
        `${this.BACKEND_URL}/api/health`,
        `${this.BACKEND_URL}/api`
      ];

      for (const endpoint of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(endpoint, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const result: HealthCheckResult = {
              isHealthy: true,
              service: 'backend',
              latency: Date.now() - startTime,
              timestamp: Date.now()
            };
            this.setCachedResult(cacheKey, result);
            return result;
          }
        } catch (error) {
          // Continuar tentando próximo endpoint
          continue;
        }
      }

      throw new Error('Todos os endpoints falharam');

    } catch (error) {
      const result: HealthCheckResult = {
        isHealthy: false,
        service: 'backend',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: Date.now()
      };
      this.setCachedResult(cacheKey, result);
      return result;
    }
  }

  // ============================================
  // HEALTH CHECK SUPABASE
  // ============================================
  async checkSupabaseHealth(): Promise<HealthCheckResult> {
    const cacheKey = 'supabase';
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const startTime = Date.now();

    try {
      if (!this.SUPABASE_URL) {
        throw new Error('SUPABASE_URL não configurada');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
        }
      });

      clearTimeout(timeoutId);

      const result: HealthCheckResult = {
        isHealthy: response.ok,
        service: 'supabase',
        latency: Date.now() - startTime,
        error: response.ok ? undefined : `HTTP ${response.status}`,
        timestamp: Date.now()
      };

      this.setCachedResult(cacheKey, result);
      return result;

    } catch (error) {
      const result: HealthCheckResult = {
        isHealthy: false,
        service: 'supabase',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: Date.now()
      };
      this.setCachedResult(cacheKey, result);
      return result;
    }
  }

  // ============================================
  // STATUS GERAL DA REDE
  // ============================================
  async getNetworkStatus(): Promise<NetworkStatus> {
    const [backend, supabase] = await Promise.all([
      this.checkBackendHealth(),
      this.checkSupabaseHealth()
    ]);

    let overall: 'healthy' | 'degraded' | 'offline';
    
    if (backend.isHealthy && supabase.isHealthy) {
      overall = 'healthy';
    } else if (backend.isHealthy || supabase.isHealthy) {
      overall = 'degraded';
    } else {
      overall = 'offline';
    }

    return { backend, supabase, overall };
  }

  // ============================================
  // FALLBACK INTELIGENTE
  // ============================================
  async executeWithFallback<T>(
    primaryFn: () => Promise<T>,
    fallbackFn: () => T,
    serviceName: string = 'unknown'
  ): Promise<T> {
    try {
      // Verificar health primeiro
      const health = serviceName === 'backend' 
        ? await this.checkBackendHealth()
        : await this.checkSupabaseHealth();

      if (!health.isHealthy) {
        // Usar fallback imediatamente se service não está saudável
        return fallbackFn();
      }

      // Tentar execução primária
      return await primaryFn();

    } catch (error) {
      // Log apenas em modo debug
      if (import.meta.env.VITE_LOG_LEVEL === 'debug') {
        console.warn(`🔄 Fallback ativado para ${serviceName}:`, error);
      }
      
      return fallbackFn();
    }
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================
  private getCachedResult(key: string): HealthCheckResult | null {
    const cached = this.healthCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached;
    }
    return null;
  }

  private setCachedResult(key: string, result: HealthCheckResult): void {
    this.healthCache.set(key, result);
  }

  // ============================================
  // UTILITÁRIOS
  // ============================================
  isOnline(): boolean {
    return navigator.onLine;
  }

  getConnectionType(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection?.effectiveType || 'unknown';
  }

  // ============================================
  // CONFIGURAÇÃO DE RETRY
  // ============================================
  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Backoff exponencial
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}

// ============================================
// EXPORTAÇÕES
// ============================================
export const networkHealth = NetworkHealthManager.getInstance();

// Hook React para usar o health check
export function useNetworkHealth() {
  const [status, setStatus] = React.useState<NetworkStatus | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const checkHealth = async () => {
      setIsLoading(true);
      try {
        const networkStatus = await networkHealth.getNetworkStatus();
        setStatus(networkStatus);
      } catch (error) {
        // Fallback para status offline
        setStatus({
          backend: { isHealthy: false, service: 'backend', latency: 0, error: 'Check failed', timestamp: Date.now() },
          supabase: { isHealthy: false, service: 'supabase', latency: 0, error: 'Check failed', timestamp: Date.now() },
          overall: 'offline'
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkHealth();

    // Verificar a cada 30 segundos
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return { status, isLoading };
}

// Utilitário para criar fetch com fallback automático
export function createFetchWithFallback(fallbackData: any = null) {
  return async (url: string, options?: RequestInit) => {
    return networkHealth.executeWithFallback(
      () => fetch(url, options),
      () => new Response(JSON.stringify(fallbackData), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }),
      'fetch'
    );
  };
}

export default networkHealth; 
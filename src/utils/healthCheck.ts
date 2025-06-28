// CRM Marketing - Sistema de Health Checks Enterprise
// Monitoramento de saúde do sistema em tempo real

import React from 'react';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  timestamp: number;
  details?: Record<string, any>;
  error?: string;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthCheckResult[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    total: number;
  };
  lastCheck: number;
}

class HealthCheckService {
  private checks: Map<string, () => Promise<HealthCheckResult>> = new Map();
  private results: Map<string, HealthCheckResult> = new Map();
  private isRunning: boolean = false;
  private interval: number = 30000; // 30 segundos
  private timeoutMs: number = 5000; // 5 segundos timeout

  constructor() {
    this.registerDefaultChecks();
  }

  // Registrar checks padrão
  private registerDefaultChecks(): void {
    // Check da API backend
    this.registerCheck('backend-api', this.checkBackendAPI.bind(this));
    
    // Check do Supabase
    this.registerCheck('supabase', this.checkSupabase.bind(this));
    
    // Check de conectividade
    this.registerCheck('network', this.checkNetwork.bind(this));
    
    // Check de performance do frontend
    this.registerCheck('frontend-performance', this.checkFrontendPerformance.bind(this));
    
    // Check de localStorage
    this.registerCheck('local-storage', this.checkLocalStorage.bind(this));
    
    // Check de Service Worker
    this.registerCheck('service-worker', this.checkServiceWorker.bind(this));
    
    // Check de memória
    this.registerCheck('memory', this.checkMemoryUsage.bind(this));
  }

  // Registrar um novo health check
  public registerCheck(name: string, checkFunction: () => Promise<HealthCheckResult>): void {
    this.checks.set(name, checkFunction);
  }

  // Remover um health check
  public unregisterCheck(name: string): void {
    this.checks.delete(name);
    this.results.delete(name);
  }

  // Executar todos os health checks
  public async runAllChecks(): Promise<SystemHealth> {
    const startTime = Date.now();
    const results: HealthCheckResult[] = [];

    // Executar todos os checks em paralelo
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkFn]) => {
      try {
        const result = await Promise.race([
          checkFn(),
          this.timeoutPromise(name)
        ]);
        
        this.results.set(name, result);
        return result;
      } catch (error) {
        const errorResult: HealthCheckResult = {
          service: name,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        
        this.results.set(name, errorResult);
        return errorResult;
      }
    });

    const checkResults = await Promise.all(checkPromises);
    results.push(...checkResults);

    // Calcular saúde geral do sistema
    const summary = this.calculateSummary(results);
    const overall = this.calculateOverallHealth(summary);

    const systemHealth: SystemHealth = {
      overall,
      services: results,
      summary,
      lastCheck: Date.now()
    };

    // Log em desenvolvimento
    if (import.meta.env.DEV) {
      console.log('[HealthCheck] System health:', systemHealth);
    }

    return systemHealth;
  }

  // Promise com timeout
  private timeoutPromise(serviceName: string): Promise<HealthCheckResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check timeout for ${serviceName}`));
      }, this.timeoutMs);
    });
  }

  // Check da API backend
  private async checkBackendAPI(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:3001/api/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok;
      
      let details = {};
      try {
        details = await response.json();
      } catch {
        // Ignore JSON parse errors
      }

      return {
        service: 'backend-api',
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime,
        timestamp: Date.now(),
        details
      };
    } catch (error) {
      return {
        service: 'backend-api',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  // Check do Supabase
  private async checkSupabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Importar dinamicamente para evitar problemas de build
      const { supabase } = await import('../lib/supabase');
      
      // Fazer uma query simples
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .limit(1);
      
      const responseTime = Date.now() - startTime;
      
      if (error) {
        return {
          service: 'supabase',
          status: 'unhealthy',
          responseTime,
          timestamp: Date.now(),
          error: error.message
        };
      }

      return {
        service: 'supabase',
        status: 'healthy',
        responseTime,
        timestamp: Date.now(),
        details: { recordsFound: data?.length || 0 }
      };
    } catch (error) {
      return {
        service: 'supabase',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Connection error'
      };
    }
  }

  // Check de conectividade
  private async checkNetwork(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Usar navigator.onLine e fazer ping para um endpoint confiável
      const isOnline = navigator.onLine;
      
      if (!isOnline) {
        return {
          service: 'network',
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          timestamp: Date.now(),
          error: 'Browser reports offline'
        };
      }

      // Ping para verificar conectividade real
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'network',
        status: 'healthy',
        responseTime,
        timestamp: Date.now(),
        details: {
          onlineStatus: isOnline,
          connectionType: this.getConnectionType()
        }
      };
    } catch (error) {
      return {
        service: 'network',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        timestamp: Date.now(),
        error: 'Limited connectivity'
      };
    }
  }

  // Check de performance do frontend
  private async checkFrontendPerformance(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Verificar métricas de performance
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const memory = (performance as any).memory;
      
      const metrics = {
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
        loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
        memoryUsed: memory?.usedJSHeapSize || 0,
        memoryTotal: memory?.totalJSHeapSize || 0,
        memoryLimit: memory?.jsHeapSizeLimit || 0
      };
      
      // Determinar status baseado nas métricas
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (metrics.domContentLoaded > 3000 || metrics.loadComplete > 5000) {
        status = 'degraded';
      }
      
      if (metrics.domContentLoaded > 5000 || metrics.loadComplete > 10000) {
        status = 'unhealthy';
      }
      
      // Check de uso de memória
      if (memory && metrics.memoryUsed / metrics.memoryLimit > 0.8) {
        status = 'degraded';
      }
      
      if (memory && metrics.memoryUsed / metrics.memoryLimit > 0.9) {
        status = 'unhealthy';
      }

      return {
        service: 'frontend-performance',
        status,
        responseTime: Date.now() - startTime,
        timestamp: Date.now(),
        details: metrics
      };
    } catch (error) {
      return {
        service: 'frontend-performance',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Performance check failed'
      };
    }
  }

  // Check de localStorage
  private async checkLocalStorage(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const testKey = 'health-check-test';
      const testValue = Date.now().toString();
      
      // Testar escrita
      localStorage.setItem(testKey, testValue);
      
      // Testar leitura
      const readValue = localStorage.getItem(testKey);
      
      // Limpar teste
      localStorage.removeItem(testKey);
      
      const isWorking = readValue === testValue;
      
      // Verificar espaço disponível
      let usedSpace = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          usedSpace += localStorage[key].length + key.length;
        }
      }
      
      return {
        service: 'local-storage',
        status: isWorking ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: Date.now(),
        details: {
          working: isWorking,
          usedSpace,
          itemCount: localStorage.length
        }
      };
    } catch (error) {
      return {
        service: 'local-storage',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'localStorage not available'
      };
    }
  }

  // Check de Service Worker
  private async checkServiceWorker(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!('serviceWorker' in navigator)) {
        return {
          service: 'service-worker',
          status: 'degraded',
          responseTime: Date.now() - startTime,
          timestamp: Date.now(),
          details: { supported: false }
        };
      }

      const registration = await navigator.serviceWorker.getRegistration();
      
      const details = {
        supported: true,
        registered: !!registration,
        active: !!registration?.active,
        installing: !!registration?.installing,
        waiting: !!registration?.waiting,
        scope: registration?.scope
      };

      const status = registration?.active ? 'healthy' : 'degraded';

      return {
        service: 'service-worker',
        status,
        responseTime: Date.now() - startTime,
        timestamp: Date.now(),
        details
      };
    } catch (error) {
      return {
        service: 'service-worker',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Service Worker check failed'
      };
    }
  }

  // Check de uso de memória
  private async checkMemoryUsage(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!('memory' in performance)) {
        return {
          service: 'memory',
          status: 'degraded',
          responseTime: Date.now() - startTime,
          timestamp: Date.now(),
          details: { supported: false }
        };
      }

      const memory = (performance as any).memory;
      const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (usagePercentage > 70) status = 'degraded';
      if (usagePercentage > 85) status = 'unhealthy';

      return {
        service: 'memory',
        status,
        responseTime: Date.now() - startTime,
        timestamp: Date.now(),
        details: {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          usagePercentage: Math.round(usagePercentage)
        }
      };
    } catch (error) {
      return {
        service: 'memory',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Memory check failed'
      };
    }
  }

  // Utilitários
  private getConnectionType(): string {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection?.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  private calculateSummary(results: HealthCheckResult[]) {
    return results.reduce(
      (acc, result) => {
        acc[result.status]++;
        acc.total++;
        return acc;
      },
      { healthy: 0, degraded: 0, unhealthy: 0, total: 0 }
    );
  }

  private calculateOverallHealth(summary: { healthy: number; degraded: number; unhealthy: number }): 'healthy' | 'degraded' | 'unhealthy' {
    if (summary.unhealthy > 0) return 'unhealthy';
    if (summary.degraded > 0) return 'degraded';
    return 'healthy';
  }

  // Iniciar monitoramento contínuo
  public startMonitoring(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Executar check inicial
    this.runAllChecks();
    
    // Executar periodicamente
    const intervalId = setInterval(() => {
      if (this.isRunning) {
        this.runAllChecks();
      } else {
        clearInterval(intervalId);
      }
    }, this.interval);
  }

  // Parar monitoramento
  public stopMonitoring(): void {
    this.isRunning = false;
  }

  // Configurar intervalo
  public setInterval(ms: number): void {
    this.interval = ms;
  }

  // Obter último resultado
  public getLastResult(): SystemHealth | null {
    if (this.results.size === 0) return null;
    
    const services = Array.from(this.results.values());
    const summary = this.calculateSummary(services);
    const overall = this.calculateOverallHealth(summary);
    
    return {
      overall,
      services,
      summary,
      lastCheck: Math.max(...services.map(s => s.timestamp))
    };
  }

  // Obter resultado de um serviço específico
  public getServiceHealth(serviceName: string): HealthCheckResult | null {
    return this.results.get(serviceName) || null;
  }
}

// Instância global
export const healthCheckService = new HealthCheckService();

// Hook React para health checks
export const useHealthCheck = () => {
  const [health, setHealth] = React.useState<SystemHealth | null>(null);
  const [loading, setLoading] = React.useState(false);

  const runCheck = async () => {
    setLoading(true);
    try {
      const result = await healthCheckService.runAllChecks();
      setHealth(result);
    } catch (error) {
      console.error('[HealthCheck] Failed to run health check:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    runCheck();
  }, []);

  return {
    health,
    loading,
    runCheck,
    startMonitoring: healthCheckService.startMonitoring.bind(healthCheckService),
    stopMonitoring: healthCheckService.stopMonitoring.bind(healthCheckService)
  };
};

export default healthCheckService; 
// CRM Marketing - Sistema de Monitoramento de Performance Enterprise
// Core Web Vitals + Métricas Customizadas

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
  userAgent: string;
  connectionType?: string;
}

interface CustomMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Sistema de logs condicionais
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'warn';
const isDebugMode = LOG_LEVEL === 'debug';
const isVerboseMode = LOG_LEVEL === 'verbose';

// Configurações de threshold por nível
const THRESHOLDS = {
  debug: 50,    // Logs tudo acima de 50ms
  info: 200,    // Logs tudo acima de 200ms
  warn: 500,    // Logs tudo acima de 500ms (padrão)
  error: 1000   // Logs apenas acima de 1s
};

const currentThreshold = THRESHOLDS[LOG_LEVEL as keyof typeof THRESHOLDS] || THRESHOLDS.warn;

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private customMetrics: CustomMetric[] = [];
  private isEnabled: boolean = true;
  private endpoint: string = '/api/performance';
  private maxMetrics = 100;

  constructor() {
    this.init();
  }

  private init(): void {
    if (!this.isEnabled || typeof window === 'undefined') return;

    // Core Web Vitals
    this.observeCLS();
    this.observeFID();
    this.observeLCP();
    this.observeFCP();
    this.observeTTFB();
    this.observeINP();

    // Métricas customizadas
    this.observeNavigationTiming();
    this.observeResourceTiming();
    this.observeMemoryUsage();

    // Enviar métricas periodicamente
    this.startPeriodicReporting();
  }

  // Cumulative Layout Shift (CLS)
  private observeCLS(): void {
    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries: PerformanceEntry[] = [];

    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

          if (sessionValue && 
              entry.startTime - lastSessionEntry.startTime < 1000 &&
              entry.startTime - firstSessionEntry.startTime < 5000) {
            sessionValue += (entry as any).value;
            sessionEntries.push(entry);
          } else {
            sessionValue = (entry as any).value;
            sessionEntries = [entry];
          }

          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            this.recordMetric('CLS', clsValue, this.getCLSRating(clsValue));
          }
        }
      }
    });

    observer.observe({ entryTypes: ['layout-shift'] });
  }

  // First Input Delay (FID)
  private observeFID(): void {
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const perfEntry = entry as any; // Type assertion para acessar propriedades específicas
        const fid = perfEntry.processingStart - perfEntry.startTime;
        this.recordMetric('FID', fid, this.getFIDRating(fid));
      }
    });

    observer.observe({ entryTypes: ['first-input'] });
  }

  // Largest Contentful Paint (LCP)
  private observeLCP(): void {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      const lcp = lastEntry.startTime;
      this.recordMetric('LCP', lcp, this.getLCPRating(lcp));
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  }

  // First Contentful Paint (FCP)
  private observeFCP(): void {
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          const fcp = entry.startTime;
          this.recordMetric('FCP', fcp, this.getFCPRating(fcp));
        }
      }
    });

    observer.observe({ entryTypes: ['paint'] });
  }

  // Time to First Byte (TTFB)
  private observeTTFB(): void {
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          const ttfb = navEntry.responseStart - navEntry.requestStart;
          this.recordMetric('TTFB', ttfb, this.getTTFBRating(ttfb));
        }
      }
    });

    observer.observe({ entryTypes: ['navigation'] });
  }

  // Interaction to Next Paint (INP)
  private observeINP(): void {
    let maxINP = 0;

    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const perfEntry = entry as any; // Type assertion para acessar propriedades específicas
        const inp = perfEntry.processingStart - perfEntry.startTime;
        if (inp > maxINP) {
          maxINP = inp;
          this.recordMetric('INP', inp, this.getINPRating(inp));
        }
      }
    });

    observer.observe({ entryTypes: ['event'] });
  }

  // Navigation Timing
  private observeNavigationTiming(): void {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        // DOM Content Loaded
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
        this.recordCustomMetric('DOM_CONTENT_LOADED', domContentLoaded, 'ms');

        // Load Complete
        const loadComplete = navigation.loadEventEnd - navigation.loadEventStart;
        this.recordCustomMetric('LOAD_COMPLETE', loadComplete, 'ms');

        // DNS Lookup
        const dnsLookup = navigation.domainLookupEnd - navigation.domainLookupStart;
        this.recordCustomMetric('DNS_LOOKUP', dnsLookup, 'ms');

        // TCP Connection
        const tcpConnection = navigation.connectEnd - navigation.connectStart;
        this.recordCustomMetric('TCP_CONNECTION', tcpConnection, 'ms');

        // Server Response
        const serverResponse = navigation.responseEnd - navigation.responseStart;
        this.recordCustomMetric('SERVER_RESPONSE', serverResponse, 'ms');
      }
    });
  }

  // Resource Timing
  private observeResourceTiming(): void {
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const resource = entry as PerformanceResourceTiming;
        
        // Recursos grandes
        if (resource.transferSize > 100000) { // > 100KB
          this.recordCustomMetric('LARGE_RESOURCE', resource.transferSize, 'bytes', {
            name: resource.name,
            type: this.getResourceType(resource.name)
          });
        }

        // Recursos lentos
        const loadTime = resource.responseEnd - resource.requestStart;
        if (loadTime > 1000) { // > 1s
          this.recordCustomMetric('SLOW_RESOURCE', loadTime, 'ms', {
            name: resource.name,
            type: this.getResourceType(resource.name)
          });
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  // Memory Usage
  private observeMemoryUsage(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        
        this.recordCustomMetric('MEMORY_USED', memory.usedJSHeapSize, 'bytes');
        this.recordCustomMetric('MEMORY_TOTAL', memory.totalJSHeapSize, 'bytes');
        this.recordCustomMetric('MEMORY_LIMIT', memory.jsHeapSizeLimit, 'bytes');
        
        // 🔇 REDUZIR ALERTAS: Só alertar se memória > 90% (crítico)
        const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        if (memoryUsage > 0.9) { // Aumentado de 80% para 90%
          this.recordCustomMetric('MEMORY_CRITICAL', memoryUsage * 100, 'percent');
        }
      }, 60000); // 🔇 REDUZIR FREQUÊNCIA: A cada 60 segundos (era 30s)
    }
  }

  // Gravar métrica Core Web Vitals
  private recordMetric(name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor'): void {
    const metric: PerformanceMetric = {
      name,
      value,
      rating,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType()
    };

    this.metrics.push(metric);
    
    // Manter apenas as últimas métricas
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log condicional baseado no threshold
    if (value > currentThreshold) {
      if (isDebugMode || isVerboseMode) {
        console.log(`⚡ Performance: ${name} took ${value.toFixed(2)}ms`);
      } else if (value > THRESHOLDS.warn) {
        console.warn(`⚠️ Slow operation: ${name} took ${value.toFixed(2)}ms`);
      }
    }

    // Alerta apenas para métricas críticas
    if (rating === 'poor' && value > 3000) { // Só alertar se > 3 segundos
      console.warn(`[Performance] Critical ${name} detected: ${value.toFixed(2)}ms`);
    }
  }

  // Gravar métrica customizada
  private recordCustomMetric(name: string, value: number, unit: string, metadata?: Record<string, any>): void {
    const metric: CustomMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata
    };

    this.customMetrics.push(metric);
    
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${name}: ${value} ${unit}`, metadata);
    }
  }

  // Ratings para Core Web Vitals
  private getCLSRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  private getFIDRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 100) return 'good';
    if (value <= 300) return 'needs-improvement';
    return 'poor';
  }

  private getLCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  private getFCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 1800) return 'good';
    if (value <= 3000) return 'needs-improvement';
    return 'poor';
  }

  private getTTFBRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 800) return 'good';
    if (value <= 1800) return 'needs-improvement';
    return 'poor';
  }

  private getINPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 200) return 'good';
    if (value <= 500) return 'needs-improvement';
    return 'poor';
  }

  // Utilitários
  private getConnectionType(): string {
    if ('connection' in navigator) {
      return (navigator as any).connection?.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  // Relatório de performance
  public getPerformanceReport(): {
    coreWebVitals: PerformanceMetric[];
    customMetrics: CustomMetric[];
    summary: Record<string, any>;
  } {
    const summary = this.generateSummary();
    
    return {
      coreWebVitals: this.metrics,
      customMetrics: this.customMetrics,
      summary
    };
  }

  private generateSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    // Resumo Core Web Vitals
    ['CLS', 'FID', 'LCP', 'FCP', 'TTFB', 'INP'].forEach(metric => {
      const values = this.metrics.filter(m => m.name === metric);
      if (values.length > 0) {
        const latest = values[values.length - 1];
        summary[metric] = {
          value: latest.value,
          rating: latest.rating,
          timestamp: latest.timestamp
        };
      }
    });

    // Estatísticas gerais
    summary.totalMetrics = this.metrics.length;
    summary.customMetrics = this.customMetrics.length;
    summary.poorMetrics = this.metrics.filter(m => m.rating === 'poor').length;
    summary.connectionType = this.getConnectionType();
    
    return summary;
  }

  // Envio periódico de métricas
  private startPeriodicReporting(): void {
    // Enviar a cada 5 minutos
    setInterval(() => {
      this.sendMetrics();
    }, 5 * 60 * 1000);

    // Enviar ao fechar a página
    window.addEventListener('beforeunload', () => {
      this.sendMetrics(true);
    });
  }

  // Enviar métricas para servidor
  private async sendMetrics(isBeacon: boolean = false): Promise<void> {
    if (this.metrics.length === 0 && this.customMetrics.length === 0) return;

    const payload = {
      coreWebVitals: this.metrics,
      customMetrics: this.customMetrics,
      summary: this.generateSummary(),
      sessionId: this.getSessionId(),
      timestamp: Date.now()
    };

    try {
      if (isBeacon && 'sendBeacon' in navigator) {
        // Usar sendBeacon para envio garantido ao fechar página
        navigator.sendBeacon(this.endpoint, JSON.stringify(payload));
      } else {
        // Envio normal
        await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      // Limpar métricas enviadas
      this.metrics = [];
      this.customMetrics = [];
      
    } catch (error) {
      console.error('[Performance] Failed to send metrics:', error);
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('performance-session-id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('performance-session-id', sessionId);
    }
    return sessionId;
  }

  // Métricas manuais para componentes React
  public measureComponentRender(componentName: string, renderTime: number): void {
    this.recordCustomMetric('COMPONENT_RENDER', renderTime, 'ms', {
      component: componentName
    });
  }

  public measureAPICall(endpoint: string, duration: number, status: number): void {
    this.recordCustomMetric('API_CALL', duration, 'ms', {
      endpoint,
      status,
      rating: duration < 500 ? 'good' : duration < 1000 ? 'needs-improvement' : 'poor'
    });
  }

  public measureUserInteraction(action: string, duration: number): void {
    this.recordCustomMetric('USER_INTERACTION', duration, 'ms', {
      action,
      rating: duration < 100 ? 'good' : duration < 300 ? 'needs-improvement' : 'poor'
    });
  }

  // Controle do monitor
  public enable(): void {
    this.isEnabled = true;
  }

  public disable(): void {
    this.isEnabled = false;
  }

  public clear(): void {
    this.metrics = [];
    this.customMetrics = [];
  }
}

// Instância global
export const performanceMonitor = new PerformanceMonitor();

// Hook React para medir renders
export const usePerformanceMonitor = () => {
  return {
    measureRender: performanceMonitor.measureComponentRender.bind(performanceMonitor),
    measureAPI: performanceMonitor.measureAPICall.bind(performanceMonitor),
    measureInteraction: performanceMonitor.measureUserInteraction.bind(performanceMonitor),
    getReport: performanceMonitor.getPerformanceReport.bind(performanceMonitor)
  };
};

export default performanceMonitor; 
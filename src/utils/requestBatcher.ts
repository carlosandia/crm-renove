import { logger } from './logger';

interface BatchRequest {
  id: string;
  url: string;
  method: string;
  data?: any;
  resolve: (result: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

interface BatchConfig {
  batchDelay: number; // Tempo para agrupar requests (ms)
  maxBatchSize: number; // Máximo de requests por batch
  dedupWindow: number; // Janela para deduplicação (ms)
}

class RequestBatcher {
  private pendingRequests: Map<string, BatchRequest[]> = new Map();
  private dedupCache: Map<string, { result: any; timestamp: number }> = new Map();
  // ✅ CORREÇÃO: Usar logger padrão ao invés de createContext inexistente
  private batchLogger = logger;
  
  // ✅ PRIORIDADE 1: Estatísticas de monitoramento para corrigir undefined
  private stats = {
    totalRequests: 0,
    dedupHits: 0,
    batchExecutions: 0,
    throttledRequests: 0
  };
  
  private defaultConfig: BatchConfig = {
    batchDelay: 50, // 50ms para agrupar requests
    maxBatchSize: 10, // Máximo 10 requests por batch
    dedupWindow: 1000 // 1 segundo para deduplicação
  };

  /**
   * ✅ BATCHING: Agrupar requests similares
   */
  public batch<T>(
    url: string,
    method: string = 'GET',
    data?: any,
    config: Partial<BatchConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const requestKey = this.getRequestKey(url, method, data);
    const dedupKey = this.getDedupKey(url, method, data);
    
    // ✅ DEDUPLICAÇÃO: Verificar cache recente
    const cached = this.dedupCache.get(dedupKey);
    if (cached && (Date.now() - cached.timestamp) < finalConfig.dedupWindow) {
      this.batchLogger.debug(`Cache hit para ${method} ${url}`);
      // ✅ PRIORIDADE 1: Incrementar contador de cache hits
      this.stats.dedupHits++;
      return Promise.resolve(cached.result);
    }

    return new Promise<T>((resolve, reject) => {
      const request: BatchRequest = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url,
        method,
        data,
        resolve,
        reject,
        timestamp: Date.now()
      };

      // ✅ PRIORIDADE 1: Incrementar contador de requests totais
      this.stats.totalRequests++;

      // Adicionar à lista de requests pendentes
      if (!this.pendingRequests.has(requestKey)) {
        this.pendingRequests.set(requestKey, []);
      }
      
      const requests = this.pendingRequests.get(requestKey)!;
      requests.push(request);

      this.batchLogger.debug(`Request adicionado ao batch: ${method} ${url} (${requests.length} na fila)`);

      // Executar batch se atingiu o máximo ou definir timer
      if (requests.length >= finalConfig.maxBatchSize) {
        this.executeBatch(requestKey, finalConfig);
      } else if (requests.length === 1) {
        // Primeiro request do batch - definir timer
        setTimeout(() => {
          this.executeBatch(requestKey, finalConfig);
        }, finalConfig.batchDelay);
      }
    });
  }

  /**
   * ✅ DEDUPLICAÇÃO: Requests idênticos dentro da janela de tempo
   */
  public dedupe<T>(
    url: string,
    method: string = 'GET',
    data?: any,
    windowMs: number = 1000
  ): Promise<T> {
    return this.batch<T>(url, method, data, { dedupWindow: windowMs });
  }

  /**
   * ✅ THROTTLING: Limitar frequência de requests específicos
   */
  private throttleCache: Map<string, number> = new Map();
  
  public throttle<T>(
    url: string,
    method: string = 'GET',
    data?: any,
    throttleMs: number = 500
  ): Promise<T> {
    const throttleKey = this.getRequestKey(url, method, data);
    const lastCall = this.throttleCache.get(throttleKey) || 0;
    const now = Date.now();
    
    if (now - lastCall < throttleMs) {
      this.batchLogger.warn(`Request throttled: ${method} ${url} (${now - lastCall}ms desde último)`);
      // ✅ PRIORIDADE 1: Incrementar contador de requests throttled
      this.stats.throttledRequests++;
      return Promise.reject(new Error('Request throttled'));
    }
    
    this.throttleCache.set(throttleKey, now);
    return this.batch<T>(url, method, data);
  }

  /**
   * ✅ EXECUTAR BATCH: Processar grupo de requests
   */
  private async executeBatch(requestKey: string, config: BatchConfig): Promise<void> {
    const requests = this.pendingRequests.get(requestKey);
    if (!requests || requests.length === 0) return;

    // Remover da lista de pendentes
    this.pendingRequests.delete(requestKey);

    this.batchLogger.info(`Executando batch: ${requests.length} requests para ${requestKey}`);
    
    // ✅ PRIORIDADE 1: Incrementar contador de execuções de batch
    this.stats.batchExecutions++;

    // Para requests GET similares, executar apenas um e compartilhar resultado
    if (requests[0].method === 'GET' && this.areRequestsSimilar(requests)) {
      await this.executeSingleRequest(requests);
    } else {
      // Para outros casos, executar todos (mas agrupados)
      await this.executeMultipleRequests(requests);
    }
  }

  /**
   * ✅ EXECUTAR REQUEST ÚNICO: Para GET requests similares
   */
  private async executeSingleRequest(requests: BatchRequest[]): Promise<void> {
    const firstRequest = requests[0];
    
    try {
      this.batchLogger.debug(`Executando request único para ${requests.length} requests similares`);
      
      // Simular execução do request (aqui você integraria com api.ts)
      const result = await this.performActualRequest(firstRequest);
      
      // Armazenar no cache de deduplicação
      const dedupKey = this.getDedupKey(firstRequest.url, firstRequest.method, firstRequest.data);
      this.dedupCache.set(dedupKey, {
        result,
        timestamp: Date.now()
      });

      // Resolver todos os requests com o mesmo resultado
      requests.forEach(request => {
        request.resolve(result);
      });

    } catch (error) {
      this.batchLogger.error(`Erro no batch request:`, error);
      requests.forEach(request => {
        request.reject(error);
      });
    }
  }

  /**
   * ✅ EXECUTAR MÚLTIPLOS REQUESTS: Para casos que não podem ser agrupados
   */
  private async executeMultipleRequests(requests: BatchRequest[]): Promise<void> {
    this.batchLogger.debug(`Executando ${requests.length} requests individuais em paralelo`);
    
    // Executar todos em paralelo
    const promises = requests.map(async (request) => {
      try {
        const result = await this.performActualRequest(request);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * ✅ EXECUTAR REQUEST REAL: Integração com sistema de API
   */
  private async performActualRequest(request: BatchRequest): Promise<any> {
    // Aqui você integraria com o sistema real de API (api.ts)
    // Por ora, simular uma chamada
    
    const { api } = await import('../lib/api');
    
    switch (request.method.toUpperCase()) {
      case 'GET':
        return await api.get(request.url);
      case 'POST':
        return await api.post(request.url, request.data);
      case 'PUT':
        return await api.put(request.url, request.data);
      case 'DELETE':
        return await api.delete(request.url);
      default:
        throw new Error(`Método não suportado: ${request.method}`);
    }
  }

  /**
   * ✅ HELPER: Gerar chave única para request
   */
  private getRequestKey(url: string, method: string, data?: any): string {
    const dataHash = data ? this.hashObject(data) : '';
    return `${method.toUpperCase()}:${url}:${dataHash}`;
  }

  /**
   * ✅ HELPER: Gerar chave para deduplicação
   */
  private getDedupKey(url: string, method: string, data?: any): string {
    return this.getRequestKey(url, method, data);
  }

  /**
   * ✅ HELPER: Verificar se requests são similares (podem ser agrupados)
   */
  private areRequestsSimilar(requests: BatchRequest[]): boolean {
    if (requests.length <= 1) return true;
    
    const first = requests[0];
    return requests.every(req => 
      req.method === first.method && 
      req.url === first.url &&
      JSON.stringify(req.data) === JSON.stringify(first.data)
    );
  }

  /**
   * ✅ HELPER: Hash simples para objeto
   */
  private hashObject(obj: any): string {
    return JSON.stringify(obj, Object.keys(obj).sort()).slice(0, 100);
  }

  /**
   * ✅ LIMPEZA: Limpar caches antigos
   */
  public cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutos

    // Limpar cache de deduplicação
    for (const [key, cached] of this.dedupCache.entries()) {
      if (now - cached.timestamp > maxAge) {
        this.dedupCache.delete(key);
      }
    }

    // Limpar cache de throttling
    for (const [key, timestamp] of this.throttleCache.entries()) {
      if (now - timestamp > maxAge) {
        this.throttleCache.delete(key);
      }
    }

    this.batchLogger.debug('Cache cleanup executado');
  }

  /**
   * ✅ ESTATÍSTICAS: Para monitoramento
   */
  public getStats() {
    return {
      pendingBatches: this.pendingRequests.size,
      dedupCacheSize: this.dedupCache.size,
      throttleCacheSize: this.throttleCache.size,
      // ✅ CORREÇÃO PRIORIDADE 1: Incluir estatísticas rastreadas para corrigir undefined
      totalRequests: this.stats.totalRequests,
      dedupHits: this.stats.dedupHits,
      batchExecutions: this.stats.batchExecutions,
      throttledRequests: this.stats.throttledRequests
    };
  }
}

// ✅ SINGLETON: Instância global para toda a aplicação
export const requestBatcher = new RequestBatcher();

// ✅ LIMPEZA AUTOMÁTICA: Executar cleanup periodicamente
if (typeof window !== 'undefined') {
  setInterval(() => {
    requestBatcher.cleanup();
  }, 5 * 60 * 1000); // A cada 5 minutos
}

// ✅ EXPORTS CONVENIENTES
export const batchRequest = requestBatcher.batch.bind(requestBatcher);
export const dedupeRequest = requestBatcher.dedupe.bind(requestBatcher);
export const throttleRequest = requestBatcher.throttle.bind(requestBatcher);
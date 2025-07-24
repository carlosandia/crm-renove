/**
 * Cache Service - Interface compatível para services existentes
 * Usa o cache em memória de /lib/cache.ts
 */

import { cache, CacheKeys, CacheTTL } from '../lib/cache';

// Interfaces para compatibilidade com código existente
interface CacheMetrics {
  hitRate: number;
  totalRequests: number;
  hits: number;
  misses: number;
  errors: number;
}

interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
}

interface CacheInterface {
  get<T = any>(key: string): Promise<T | null>;
  set(key: string, value: any, options?: CacheOptions): Promise<boolean>;
  del(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>; // Alias para del
  deletePattern(pattern: string): Promise<number>;
  getMetrics(): CacheMetrics;
  getInfo(): Promise<any>;
}

/**
 * Wrapper do cache em memória para interface compatível
 */
class CacheServiceWrapper implements CacheInterface {
  async get<T = any>(key: string): Promise<T | null> {
    return await cache.get<T>(key);
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    const ttl = options.ttl || CacheTTL.medium;
    return await cache.set(key, value, ttl);
  }

  async del(key: string): Promise<boolean> {
    return await cache.del(key);
  }

  async delete(key: string): Promise<boolean> {
    return await cache.del(key);
  }

  async deletePattern(pattern: string): Promise<number> {
    return await cache.clearPattern(pattern);
  }

  getMetrics(): CacheMetrics {
    const stats = cache.getStats();
    const total = stats.hits + stats.misses;
    
    return {
      hitRate: total > 0 ? (stats.hits / total) * 100 : 0,
      totalRequests: total,
      hits: stats.hits,
      misses: stats.misses,
      errors: 0 // Cache em memória não tem erros trackados
    };
  }

  async getInfo(): Promise<any> {
    const stats = cache.getStats();
    return {
      status: 'connected',
      type: 'memory',
      uptime: stats.uptime,
      isEnabled: stats.isEnabled
    };
  }
}

// Instância singleton
const cacheService = new CacheServiceWrapper();

/**
 * Função getCache para compatibilidade com código existente
 */
export function getCache(): CacheInterface {
  return cacheService;
}

// Exportar constantes para compatibilidade
export { CacheKeys, CacheTTL };

// Exportar cache diretamente para casos específicos
export { cache };

export default cacheService;
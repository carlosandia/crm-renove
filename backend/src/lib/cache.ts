/**
 * Sistema de Cache em Memória
 * Otimiza consultas e melhora performance
 */

interface CacheEntry {
  value: any;
  expiry: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  startTime: Date;
}

class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private isEnabled: boolean = true;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    startTime: new Date()
  };

  private config = {
    keyPrefix: process.env.CACHE_KEY_PREFIX || 'crm:',
    defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '3600'), // 1 hora
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '10000') // Máximo 10k entradas
  };

  constructor() {
    this.init();
  }

  private init() {
    // Limpeza periódica de entradas expiradas
    setInterval(() => {
      this.cleanExpired();
    }, 60000); // A cada minuto
    
    console.log('🔗 Cache em memória iniciado');
  }

  private cleanExpired() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cache: ${cleaned} entradas expiradas removidas`);
    }
  }

  private getFullKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Buscar valor do cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const fullKey = this.getFullKey(key);
      const entry = this.cache.get(fullKey);
      
      if (entry) {
        // Verificar se não expirou
        if (entry.expiry > Date.now()) {
          this.stats.hits++;
          return entry.value;
        } else {
          // Remover entrada expirada
          this.cache.delete(fullKey);
          this.stats.misses++;
          return null;
        }
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      console.warn('Cache GET error:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Armazenar valor no cache
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      const cacheTTL = ttl || this.config.defaultTTL;
      const expiry = Date.now() + (cacheTTL * 1000);

      // Verificar limite de tamanho
      if (this.cache.size >= this.config.maxSize) {
        // Remover uma entrada aleatória
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }
      
      this.cache.set(fullKey, { value, expiry });
      this.stats.sets++;
      return true;
    } catch (error) {
      console.warn('Cache SET error:', error);
      return false;
    }
  }

  /**
   * Remover chave do cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      const result = this.cache.delete(fullKey);
      if (result) {
        this.stats.deletes++;
      }
      return result;
    } catch (error) {
      console.warn('Cache DEL error:', error);
      return false;
    }
  }

  /**
   * Limpar cache por padrão
   */
  async clearPattern(pattern: string): Promise<number> {
    if (!this.isEnabled) {
      return 0;
    }

    try {
      const searchPattern = this.getFullKey(pattern);
      let deleted = 0;
      
      for (const key of this.cache.keys()) {
        if (key.includes(searchPattern.replace('*', ''))) {
          this.cache.delete(key);
          deleted++;
        }
      }
      
      this.stats.deletes += deleted;
      return deleted;
    } catch (error) {
      console.warn('Cache CLEAR PATTERN error:', error);
      return 0;
    }
  }

  /**
   * Verificar se chave existe
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      const entry = this.cache.get(fullKey);
      
      if (entry && entry.expiry > Date.now()) {
        return true;
      } else if (entry) {
        // Remover entrada expirada
        this.cache.delete(fullKey);
      }
      
      return false;
    } catch (error) {
      console.warn('Cache EXISTS error:', error);
      return false;
    }
  }

  /**
   * Definir TTL para chave existente
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      const entry = this.cache.get(fullKey);
      
      if (entry) {
        entry.expiry = Date.now() + (ttl * 1000);
        this.cache.set(fullKey, entry);
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('Cache EXPIRE error:', error);
      return false;
    }
  }

  /**
   * Incrementar valor numérico
   */
  async incr(key: string, ttl?: number): Promise<number | null> {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const fullKey = this.getFullKey(key);
      const entry = this.cache.get(fullKey);
      let newValue = 1;
      
      if (entry && entry.expiry > Date.now()) {
        newValue = (typeof entry.value === 'number' ? entry.value : 0) + 1;
      }
      
      const expiry = ttl ? Date.now() + (ttl * 1000) : 
                     (entry ? entry.expiry : Date.now() + (this.config.defaultTTL * 1000));
      
      this.cache.set(fullKey, { value: newValue, expiry });
      return newValue;
    } catch (error) {
      console.warn('Cache INCR error:', error);
      return null;
    }
  }

  /**
   * Operação atômica: buscar ou definir
   */
  async getOrSet<T = any>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl?: number
  ): Promise<T | null> {
    // Tentar buscar do cache primeiro
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    try {
      // Buscar dados originais
      const data = await fetcher();
      
      // Armazenar no cache
      if (data !== null && data !== undefined) {
        await this.set(key, data, ttl);
      }
      
      return data;
    } catch (error) {
      console.warn('Cache GET_OR_SET fetcher error:', error);
      return null;
    }
  }

  /**
   * Limpar cache relacionado a tenant
   */
  async clearTenantCache(tenantId: string): Promise<number> {
    return await this.clearPattern(`tenant:${tenantId}:*`);
  }

  /**
   * Limpar cache relacionado a usuário
   */
  async clearUserCache(userId: string): Promise<number> {
    return await this.clearPattern(`user:${userId}:*`);
  }

  /**
   * Estatísticas do cache
   */
  getStats(): CacheStats & { isEnabled: boolean; uptime: number } {
    return {
      ...this.stats,
      isEnabled: this.isEnabled,
      uptime: Date.now() - this.stats.startTime.getTime()
    };
  }

  /**
   * Resetar estatísticas
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      startTime: new Date()
    };
  }

  /**
   * Status da conexão
   */
  isConnected(): boolean {
    return this.isEnabled;
  }

  /**
   * Fechar conexão
   */
  async disconnect(): Promise<void> {
    this.cache.clear();
    this.isEnabled = false;
  }
}

/**
 * Chaves de cache padronizadas
 */
export const CacheKeys = {
  // Usuários
  user: (id: string) => `user:${id}`,
  userByEmail: (email: string) => `user:email:${email}`,
  usersByTenant: (tenantId: string, page: number = 1) => `users:tenant:${tenantId}:page:${page}`,
  
  // Empresas
  company: (id: string) => `company:${id}`,
  companies: (page: number = 1) => `companies:page:${page}`,
  
  // Pipelines
  pipeline: (id: string) => `pipeline:${id}`,
  pipelinesByTenant: (tenantId: string) => `pipelines:tenant:${tenantId}`,
  pipelineStages: (pipelineId: string) => `pipeline:${pipelineId}:stages`,
  pipelineFields: (pipelineId: string) => `pipeline:${pipelineId}:fields`,
  
  // Leads
  lead: (id: string) => `lead:${id}`,
  leadsByPipeline: (pipelineId: string, page: number = 1) => `leads:pipeline:${pipelineId}:page:${page}`,
  leadsByStage: (stageId: string) => `leads:stage:${stageId}`,
  leadsByUser: (userId: string, page: number = 1) => `leads:user:${userId}:page:${page}`,
  
  // Estatísticas
  userStats: (userId: string) => `stats:user:${userId}`,
  tenantStats: (tenantId: string) => `stats:tenant:${tenantId}`,
  pipelineStats: (pipelineId: string) => `stats:pipeline:${pipelineId}`,
  
  // Sessões e Rate Limiting
  userSession: (userId: string) => `session:${userId}`,
  rateLimit: (ip: string, endpoint: string) => `rate:${ip}:${endpoint}`,
  
  // Configurações
  tenantConfig: (tenantId: string) => `config:tenant:${tenantId}`,
  userPreferences: (userId: string) => `prefs:user:${userId}`
};

/**
 * TTLs padrão (em segundos)
 */
export const CacheTTL = {
  short: 300,      // 5 minutos
  medium: 1800,    // 30 minutos
  long: 3600,      // 1 hora
  daily: 86400,    // 24 horas
  weekly: 604800   // 7 dias
};

// Instância singleton do cache
export const cache = new CacheManager();

/**
 * Função helper para cache automático
 */
export async function withCache<T>(
  key: string, 
  fetcher: () => Promise<T>, 
  ttl: number = CacheTTL.medium
): Promise<T | null> {
  // Tentar buscar do cache
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Executar função original
  const result = await fetcher();
  
  // Armazenar no cache
  if (result !== null && result !== undefined) {
    await cache.set(key, result, ttl);
  }

  return result;
} 
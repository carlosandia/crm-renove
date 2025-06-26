import Redis from 'ioredis';
import { logger } from '../utils/logger';

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  enableOfflineQueue: boolean;
  lazyConnect: boolean;
}

interface CacheOptions {
  ttl?: number;
  compress?: boolean;
  tags?: string[];
}

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  totalRequests: number;
  hitRate: number;
}

class CacheService {
  private redis: Redis;
  private localCache: Map<string, { data: any; expires: number; tags?: string[] }>;
  private metrics: CacheMetrics;
  private readonly maxLocalCacheSize = 1000;
  private readonly defaultTTL = 300; // 5 minutes

  constructor(config: CacheConfig) {
    // Redis client configuration
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      enableOfflineQueue: config.enableOfflineQueue,
      lazyConnect: config.lazyConnect,
      keyPrefix: 'crm:',
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    // Local in-memory cache (L1)
    this.localCache = new Map();

    // Initialize metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalRequests: 0,
      hitRate: 0
    };

    this.setupEventHandlers();
    this.startCleanupTimer();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    this.redis.on('error', (err) => {
      logger.error('Redis connection error:', err);
      this.metrics.errors++;
    });

    this.redis.on('ready', () => {
      logger.info('Redis is ready to receive commands');
    });

    this.redis.on('reconnecting', () => {
      logger.warn('Redis reconnecting...');
    });
  }

  private startCleanupTimer(): void {
    // Clean expired local cache entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.localCache.entries()) {
        if (entry.expires < now) {
          this.localCache.delete(key);
        }
      }

      // Limit local cache size
      if (this.localCache.size > this.maxLocalCacheSize) {
        const entries = Array.from(this.localCache.entries());
        entries.sort((a, b) => a[1].expires - b[1].expires);
        const toDelete = entries.slice(0, entries.length - this.maxLocalCacheSize);
        toDelete.forEach(([key]) => this.localCache.delete(key));
      }
    }, 60000);
  }

  /**
   * Get value from cache (L1 -> L2 -> fallback)
   */
  async get<T>(key: string): Promise<T | null> {
    this.metrics.totalRequests++;

    try {
      // L1: Local cache (fastest)
      const localEntry = this.localCache.get(key);
      if (localEntry && localEntry.expires > Date.now()) {
        this.metrics.hits++;
        this.updateHitRate();
        return localEntry.data as T;
      }

      // L2: Redis cache
      const cached = await this.redis.get(key);
      if (cached) {
        const data = JSON.parse(cached) as T;
        
        // Store in local cache for faster future access
        this.localCache.set(key, {
          data,
          expires: Date.now() + 60000 // 1 minute local cache
        });

        this.metrics.hits++;
        this.updateHitRate();
        return data;
      }

      // Cache miss
      this.metrics.misses++;
      this.updateHitRate();
      return null;

    } catch (error) {
      logger.error('Cache get error:', error);
      this.metrics.errors++;
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Set value in cache (both L1 and L2)
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    const ttl = options.ttl || this.defaultTTL;
    
    try {
      // Serialize value
      const serialized = JSON.stringify(value);

      // L2: Redis cache
      if (ttl > 0) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }

      // L1: Local cache (shorter TTL)
      const localTTL = Math.min(ttl * 1000, 60000); // Max 1 minute local cache
      this.localCache.set(key, {
        data: value,
        expires: Date.now() + localTTL,
        tags: options.tags
      });

      this.metrics.sets++;
      return true;

    } catch (error) {
      logger.error('Cache set error:', error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      // Remove from local cache
      this.localCache.delete(key);

      // Remove from Redis
      const result = await this.redis.del(key);
      
      this.metrics.deletes++;
      return result > 0;

    } catch (error) {
      logger.error('Cache delete error:', error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      // Clear matching local cache entries
      let localDeleted = 0;
      for (const [key] of this.localCache.entries()) {
        if (key.includes(pattern.replace('*', ''))) {
          this.localCache.delete(key);
          localDeleted++;
        }
      }

      // Clear matching Redis entries
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        const deleted = await this.redis.del(...keys);
        this.metrics.deletes += deleted;
        return deleted + localDeleted;
      }

      return localDeleted;

    } catch (error) {
      logger.error('Cache delete pattern error:', error);
      this.metrics.errors++;
      return 0;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let deleted = 0;

    try {
      // Clear local cache by tags
      for (const [key, entry] of this.localCache.entries()) {
        if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
          this.localCache.delete(key);
          deleted++;
        }
      }

      // For Redis, we'd need to maintain a tag->keys mapping
      // This is a simplified version - in production, consider using Redis Sets
      for (const tag of tags) {
        const tagDeleted = await this.deletePattern(`*:${tag}:*`);
        deleted += tagDeleted;
      }

      return deleted;

    } catch (error) {
      logger.error('Cache invalidate by tags error:', error);
      this.metrics.errors++;
      return 0;
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const data = await fetchFunction();
    
    // Store in cache
    await this.set(key, data, options);
    
    return data;
  }

  /**
   * Batch get multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const results: (T | null)[] = [];
      const redisKeys: string[] = [];
      const redisIndexes: number[] = [];

      // Check local cache first
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const localEntry = this.localCache.get(key);
        
        if (localEntry && localEntry.expires > Date.now()) {
          results[i] = localEntry.data as T;
          this.metrics.hits++;
        } else {
          results[i] = null;
          redisKeys.push(key);
          redisIndexes.push(i);
        }
      }

      // Fetch remaining from Redis
      if (redisKeys.length > 0) {
        const redisResults = await this.redis.mget(...redisKeys);
        
        for (let i = 0; i < redisResults.length; i++) {
          const redisResult = redisResults[i];
          const originalIndex = redisIndexes[i];
          
          if (redisResult) {
            const data = JSON.parse(redisResult) as T;
            results[originalIndex] = data;
            
            // Store in local cache
            this.localCache.set(keys[originalIndex], {
              data,
              expires: Date.now() + 60000
            });
            
            this.metrics.hits++;
          } else {
            this.metrics.misses++;
          }
        }
      }

      this.metrics.totalRequests += keys.length;
      this.updateHitRate();
      
      return results;

    } catch (error) {
      logger.error('Cache mget error:', error);
      this.metrics.errors++;
      return keys.map(() => null);
    }
  }

  /**
   * Batch set multiple keys
   */
  async mset<T>(entries: Array<{ key: string; value: T; options?: CacheOptions }>): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      
      for (const entry of entries) {
        const ttl = entry.options?.ttl || this.defaultTTL;
        const serialized = JSON.stringify(entry.value);
        
        if (ttl > 0) {
          pipeline.setex(entry.key, ttl, serialized);
        } else {
          pipeline.set(entry.key, serialized);
        }

        // Store in local cache
        const localTTL = Math.min(ttl * 1000, 60000);
        this.localCache.set(entry.key, {
          data: entry.value,
          expires: Date.now() + localTTL,
          tags: entry.options?.tags
        });
      }

      await pipeline.exec();
      this.metrics.sets += entries.length;
      
      return true;

    } catch (error) {
      logger.error('Cache mset error:', error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      // Check local cache first
      const localEntry = this.localCache.get(key);
      if (localEntry && localEntry.expires > Date.now()) {
        return true;
      }

      // Check Redis
      const exists = await this.redis.exists(key);
      return exists === 1;

    } catch (error) {
      logger.error('Cache exists error:', error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalRequests: 0,
      hitRate: 0
    };
  }

  /**
   * Get cache info
   */
  async getInfo(): Promise<any> {
    try {
      const redisInfo = await this.redis.info();
      return {
        redis: redisInfo,
        local: {
          size: this.localCache.size,
          maxSize: this.maxLocalCacheSize
        },
        metrics: this.metrics
      };
    } catch (error) {
      logger.error('Cache info error:', error);
      return {
        redis: 'unavailable',
        local: {
          size: this.localCache.size,
          maxSize: this.maxLocalCacheSize
        },
        metrics: this.metrics
      };
    }
  }

  /**
   * Flush all caches
   */
  async flush(): Promise<boolean> {
    try {
      // Clear local cache
      this.localCache.clear();
      
      // Clear Redis cache
      await this.redis.flushdb();
      
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit();
      this.localCache.clear();
    } catch (error) {
      logger.error('Cache close error:', error);
    }
  }

  private updateHitRate(): void {
    if (this.metrics.totalRequests > 0) {
      this.metrics.hitRate = (this.metrics.hits / this.metrics.totalRequests) * 100;
    }
  }
}

// Cache TTL constants
export const CacheTTL = {
  short: 60,        // 1 minute
  medium: 300,      // 5 minutes
  long: 1800,       // 30 minutes
  veryLong: 3600,   // 1 hour
  session: 86400    // 24 hours
} as const;

// Cache key generators
export const CacheKeys = {
  user: (id: string) => `user:${id}`,
  userSession: (id: string) => `session:${id}`,
  pipeline: (id: string) => `pipeline:${id}`,
  pipelineLeads: (pipelineId: string) => `pipeline:${pipelineId}:leads`,
  leadStats: (tenantId: string) => `stats:leads:${tenantId}`,
  pipelineStats: (pipelineId: string) => `stats:pipeline:${pipelineId}`,
  userStats: (userId: string) => `stats:user:${userId}`,
  systemConfig: () => 'config:system',
  notifications: (userId: string) => `notifications:${userId}`,
  leadTasks: (leadId: string) => `tasks:lead:${leadId}`
} as const;

// Default cache service instance
let cacheService: CacheService | null = null;

export const initializeCache = (config: CacheConfig): CacheService => {
  if (cacheService) {
    return cacheService;
  }

  cacheService = new CacheService(config);
  return cacheService;
};

export const getCache = (): CacheService => {
  if (!cacheService) {
    throw new Error('Cache service not initialized. Call initializeCache() first.');
  }
  return cacheService;
};

export { CacheService };
export type { CacheConfig, CacheOptions, CacheMetrics }; 
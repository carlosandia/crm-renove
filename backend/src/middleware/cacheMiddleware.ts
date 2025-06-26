import { Request, Response, NextFunction } from 'express';
import { getCache, CacheKeys, CacheTTL } from '../services/cacheService';
import crypto from 'crypto';

interface CacheMiddlewareOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
  tags?: string[];
  compress?: boolean;
}

interface CachedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
}

/**
 * Cache middleware for Express routes
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip cache for non-GET requests by default
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache if condition is met
    if (options.skipCache && options.skipCache(req)) {
      return next();
    }

    try {
      const cache = getCache();
      
      // Generate cache key
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(req)
        : generateCacheKey(req);

      // Try to get from cache
      const cachedResponse = await cache.get<CachedResponse>(cacheKey);
      
      if (cachedResponse) {
        // Cache hit - return cached response
        res.set(cachedResponse.headers);
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        res.status(cachedResponse.statusCode).json(cachedResponse.body);
        return;
      }

      // Cache miss - intercept response
      const originalJson = res.json;
      const originalStatus = res.status;
      let statusCode = 200;

      // Override status method to capture status code
      res.status = function(code: number) {
        statusCode = code;
        return originalStatus.call(this, code);
      };

      // Override json method to cache response
      res.json = function(body: any) {
        // Only cache successful responses
        if (statusCode >= 200 && statusCode < 300) {
          const responseToCache: CachedResponse = {
            statusCode,
            headers: extractCacheableHeaders(res),
            body,
            timestamp: Date.now()
          };

          // Cache the response
          cache.set(cacheKey, responseToCache, {
            ttl: options.ttl || CacheTTL.medium,
            tags: options.tags,
            compress: options.compress
          }).catch(err => {
            console.error('Failed to cache response:', err);
          });
        }

        // Set cache headers
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);
        
        return originalJson.call(this, body);
      };

      next();

    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Cache invalidation middleware
 */
export function invalidateCacheMiddleware(patterns: string[] | ((req: Request) => string[])) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original end method
    const originalEnd = res.end;

    // Override end method to invalidate cache after response
    res.end = function(chunk?: any, encoding?: any) {
      // Call original end method first
      const result = originalEnd.call(this, chunk, encoding);

      // Invalidate cache patterns after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const cache = getCache();
        const patternsToInvalidate = typeof patterns === 'function' 
          ? patterns(req) 
          : patterns;

        Promise.all(
          patternsToInvalidate.map(pattern => cache.deletePattern(pattern))
        ).catch(err => {
          console.error('Failed to invalidate cache:', err);
        });
      }

      return result;
    };

    next();
  };
}

/**
 * Specific cache middleware for different entity types
 */
export const cacheMiddlewares = {
  // User data cache
  user: (ttl: number = CacheTTL.medium) => cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const userId = req.user?.id || 'anonymous';
      return CacheKeys.user(userId);
    },
    tags: ['user']
  }),

  // Pipeline data cache
  pipeline: (ttl: number = CacheTTL.medium) => cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const pipelineId = req.params.pipelineId || req.params.id;
      const userId = req.user?.id || 'anonymous';
      return `${CacheKeys.pipeline(pipelineId)}:user:${userId}`;
    },
    tags: ['pipeline']
  }),

  // Lead data cache
  leads: (ttl: number = CacheTTL.short) => cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const pipelineId = req.params.pipelineId;
      const tenantId = req.user?.tenant_id || 'default';
      const query = JSON.stringify(req.query);
      const queryHash = crypto.createHash('md5').update(query).digest('hex');
      return `${CacheKeys.pipelineLeads(pipelineId)}:tenant:${tenantId}:${queryHash}`;
    },
    tags: ['leads', 'pipeline']
  }),

  // Statistics cache
  stats: (ttl: number = CacheTTL.medium) => cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const type = req.params.type || 'general';
      const tenantId = req.user?.tenant_id || 'default';
      const period = req.query.period || '30d';
      return `stats:${type}:${tenantId}:${period}`;
    },
    tags: ['stats']
  }),

  // Notifications cache
  notifications: (ttl: number = CacheTTL.short) => cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const userId = req.user?.id || 'anonymous';
      const unreadOnly = req.query.unread_only === 'true';
      return `${CacheKeys.notifications(userId)}:unread:${unreadOnly}`;
    },
    tags: ['notifications']
  })
};

/**
 * Cache invalidation patterns for different operations
 */
export const cacheInvalidations = {
  // Invalidate user-related caches
  user: (userId: string) => invalidateCacheMiddleware([
    CacheKeys.user(userId),
    `${CacheKeys.userSession(userId)}*`,
    `${CacheKeys.userStats(userId)}*`
  ]),

  // Invalidate pipeline-related caches
  pipeline: (pipelineId: string) => invalidateCacheMiddleware([
    `${CacheKeys.pipeline(pipelineId)}*`,
    `${CacheKeys.pipelineLeads(pipelineId)}*`,
    `${CacheKeys.pipelineStats(pipelineId)}*`,
    'stats:*' // Invalidate all stats
  ]),

  // Invalidate lead-related caches
  leads: (req: Request) => {
    const pipelineId = req.body.pipeline_id || req.params.pipelineId;
    const tenantId = req.user?.tenant_id || 'default';
    
    return [
      `${CacheKeys.pipelineLeads(pipelineId)}*`,
      `${CacheKeys.leadStats(tenantId)}*`,
      'stats:*'
    ];
  },

  // Invalidate notification caches
  notifications: (userId: string) => invalidateCacheMiddleware([
    `${CacheKeys.notifications(userId)}*`,
    'stats:notifications:*'
  ])
};

/**
 * Helper functions
 */

function generateCacheKey(req: Request): string {
  const { method, originalUrl, user } = req;
  const userId = user?.id || 'anonymous';
  const tenantId = user?.tenant_id || 'default';
  
  // Create a hash of the request
  const requestData = {
    method,
    url: originalUrl,
    query: req.query,
    userId,
    tenantId
  };
  
  const requestString = JSON.stringify(requestData);
  const hash = crypto.createHash('md5').update(requestString).digest('hex');
  
  return `request:${hash}`;
}

function extractCacheableHeaders(res: Response): Record<string, string> {
  const cacheableHeaders: Record<string, string> = {};
  
  // Headers that should be cached
  const headersToCopy = [
    'content-type',
    'content-encoding',
    'content-language',
    'last-modified',
    'etag'
  ];
  
  headersToCopy.forEach(header => {
    const value = res.get(header);
    if (value) {
      cacheableHeaders[header] = value;
    }
  });
  
  return cacheableHeaders;
}

/**
 * Cache warming functions
 */
export const cacheWarmers = {
  // Warm up user session cache
  async warmUserSession(userId: string) {
    try {
      const cache = getCache();
      // This would typically fetch user data and cache it
      // Implementation depends on your user data structure
      console.log(`Warming cache for user: ${userId}`);
    } catch (error) {
      console.error('Failed to warm user session cache:', error);
    }
  },

  // Warm up pipeline data cache
  async warmPipelineData(pipelineId: string) {
    try {
      const cache = getCache();
      // This would typically fetch pipeline data and cache it
      console.log(`Warming cache for pipeline: ${pipelineId}`);
    } catch (error) {
      console.error('Failed to warm pipeline cache:', error);
    }
  }
};

/**
 * Cache health check
 */
export async function cacheHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  metrics: any;
  info: any;
}> {
  try {
    const cache = getCache();
    const metrics = cache.getMetrics();
    const info = await cache.getInfo();
    
    const isHealthy = metrics.hitRate > 50 && metrics.errors < 10;
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      metrics,
      info
    };
  } catch (error) {
    const err = error as Error;
    return {
      status: 'unhealthy',
      metrics: null,
      info: { error: err.message }
    };
  }
}

/**
 * Express middleware to add cache metrics to response headers
 */
export function cacheMetricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const cache = getCache();
      const metrics = cache.getMetrics();
      
      res.set({
        'X-Cache-Hit-Rate': metrics.hitRate.toFixed(2),
        'X-Cache-Total-Requests': metrics.totalRequests.toString(),
        'X-Cache-Hits': metrics.hits.toString(),
        'X-Cache-Misses': metrics.misses.toString()
      });
    } catch (error) {
      // Silently fail - don't break the request
    }
    
    next();
  };
}

export default cacheMiddleware; 
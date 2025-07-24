import { Request, Response, NextFunction } from 'express';

// Cache middleware simplified - no external cache dependency

interface CacheMiddlewareOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
  tags?: string[];
  compress?: boolean;
}

/**
 * Simplified cache middleware (no-op) - cache functionality removed
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // No caching - pass through
    next();
  };
}

/**
 * Cache invalidation middleware (no-op)
 */
export function invalidateCacheMiddleware(patterns: string[] | ((req: Request) => string[])) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // No cache to invalidate - pass through
    next();
  };
}

/**
 * Simplified cache middleware exports (no-op functions)
 */
export const cacheMiddlewares = {
  user: (ttl: number = 300) => cacheMiddleware(),
  pipeline: (ttl: number = 300) => cacheMiddleware(),
  leads: (ttl: number = 60) => cacheMiddleware(),
  stats: (ttl: number = 300) => cacheMiddleware(),
  notifications: (ttl: number = 60) => cacheMiddleware()
};

/**
 * Cache invalidation patterns (no-op functions)
 */
export const cacheInvalidations = {
  user: (userId: string) => invalidateCacheMiddleware([]),
  pipeline: (pipelineId: string) => invalidateCacheMiddleware([]),
  leads: (req: Request) => [],
  notifications: (userId: string) => invalidateCacheMiddleware([])
};

/**
 * Cache warming functions (no-op)
 */
export const cacheWarmers = {
  async warmUserSession(userId: string) {
    // No cache to warm
    console.log(`Cache warming disabled for user: ${userId}`);
  },

  async warmPipelineData(pipelineId: string) {
    // No cache to warm
    console.log(`Cache warming disabled for pipeline: ${pipelineId}`);
  }
};

/**
 * Cache health check (simplified)
 */
export async function cacheHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  metrics: any;
  info: any;
}> {
  return {
    status: 'healthy',
    metrics: { message: 'Cache disabled' },
    info: { message: 'Running without cache dependency' }
  };
}

/**
 * Cache metrics middleware (no-op)
 */
export function cacheMetricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set({
      'X-Cache-Status': 'disabled',
      'X-Cache-Mode': 'simplified'
    });
    next();
  };
}

export default cacheMiddleware;
import { CacheConfig } from '../services/cacheService';

// Cache configuration based on environment
export const cacheConfig: CacheConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
  lazyConnect: true
};

// Cache configuration for different environments
export const cacheConfigs = {
  development: {
    ...cacheConfig,
    host: 'localhost',
    port: 6379,
    db: 0
  },
  
  production: {
    ...cacheConfig,
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: 5,
    retryDelayOnFailover: 200
  },
  
  test: {
    ...cacheConfig,
    host: 'localhost',
    port: 6379,
    db: 1 // Use different DB for tests
  }
};

// Get cache config for current environment
export function getCacheConfig(): CacheConfig {
  const env = process.env.NODE_ENV || 'development';
  return cacheConfigs[env as keyof typeof cacheConfigs] || cacheConfigs.development;
}

// Cache settings
export const cacheSettings = {
  // Default TTL values (in seconds)
  ttl: {
    short: 60,        // 1 minute
    medium: 300,      // 5 minutes
    long: 1800,       // 30 minutes
    veryLong: 3600,   // 1 hour
    session: 86400    // 24 hours
  },
  
  // Cache key prefixes
  prefixes: {
    user: 'user:',
    pipeline: 'pipeline:',
    leads: 'leads:',
    stats: 'stats:',
    notifications: 'notifications:',
    session: 'session:'
  },
  
  // Performance settings
  performance: {
    maxLocalCacheSize: 1000,
    cleanupInterval: 60000, // 1 minute
    compressionThreshold: 1024 // 1KB
  }
};

export default getCacheConfig; 
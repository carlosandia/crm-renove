// CRM Marketing - Configuração Enterprise para Produção
// Sistema de configuração centralizada com validação

interface DatabaseConfig {
  url: string;
  key: string;
  schema: string;
  poolSize: number;
  timeout: number;
  ssl: boolean;
}

interface CacheConfig {
  enabled: boolean;
  provider: 'memory'; // ✅ Cache simplificado conforme CLAUDE.md
  ttl: number;
  maxSize: number;
}

interface SecurityConfig {
  csp: {
    enabled: boolean;
    directives: Record<string, string[]>;
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  cors: {
    enabled: boolean;
    origins: string[];
    credentials: boolean;
  };
  headers: {
    hsts: boolean;
    noSniff: boolean;
    frameOptions: string;
    xssProtection: boolean;
  };
}

interface MonitoringConfig {
  performance: {
    enabled: boolean;
    endpoint: string;
    sampleRate: number;
    bufferSize: number;
  };
  healthChecks: {
    enabled: boolean;
    interval: number;
    timeout: number;
    endpoints: string[];
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destination: 'console' | 'file' | 'service';
    endpoint?: string;
  };
  analytics: {
    enabled: boolean;
    provider: 'google' | 'mixpanel' | 'custom';
    trackingId?: string;
    endpoint?: string;
  };
}

interface FeatureFlags {
  useModernComponents: boolean;
  enableOfflineMode: boolean;
  enablePushNotifications: boolean;
  enableAdvancedAnalytics: boolean;
  enableA11yFeatures: boolean;
  enableExperimentalFeatures: boolean;
}

interface ProductionConfig {
  environment: 'development' | 'staging' | 'production';
  version: string;
  buildNumber: string;
  database: DatabaseConfig;
  cache: CacheConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  features: FeatureFlags;
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
    retryDelay: number;
  };
  cdn: {
    enabled: boolean;
    baseUrl?: string;
    version?: string;
  };
  serviceWorker: {
    enabled: boolean;
    scope: string;
    updateCheckInterval: number;
  };
}

class ConfigurationManager {
  private config: ProductionConfig;
  private validated: boolean = false;

  constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  private loadConfiguration(): ProductionConfig {
    // Carregar configuração baseada no ambiente
    const environment = (import.meta.env.MODE || 'development') as 'development' | 'staging' | 'production';
    
    return {
      environment,
      version: import.meta.env.VITE_APP_VERSION || '4.0.0',
      buildNumber: import.meta.env.VITE_BUILD_NUMBER || Date.now().toString(),
      
      database: {
        url: import.meta.env.VITE_SUPABASE_URL || '',
        key: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        schema: import.meta.env.VITE_DB_SCHEMA || 'public',
        poolSize: parseInt(import.meta.env.VITE_DB_POOL_SIZE || '10'),
        timeout: parseInt(import.meta.env.VITE_DB_TIMEOUT || '30000'),
        ssl: import.meta.env.VITE_DB_SSL === 'true'
      },
      
      cache: {
        enabled: import.meta.env.VITE_CACHE_ENABLED !== 'false',
        provider: 'memory', // ✅ Cache simplificado para desenvolvimento
        ttl: parseInt(import.meta.env.VITE_CACHE_TTL || '300000'), // 5 minutos
        maxSize: parseInt(import.meta.env.VITE_CACHE_MAX_SIZE || '100')
      },
      
      security: {
        csp: {
          enabled: import.meta.env.VITE_CSP_ENABLED === 'true',
          directives: this.parseCSPDirectives()
        },
        rateLimit: {
          enabled: import.meta.env.VITE_RATE_LIMIT_ENABLED === 'true',
          windowMs: parseInt(import.meta.env.VITE_RATE_LIMIT_WINDOW || '900000'), // 15 minutos
          maxRequests: parseInt(import.meta.env.VITE_RATE_LIMIT_MAX || '100'),
          skipSuccessfulRequests: import.meta.env.VITE_RATE_LIMIT_SKIP_SUCCESS === 'true'
        },
        cors: {
          enabled: import.meta.env.VITE_CORS_ENABLED === 'true',
          origins: this.parseArray(import.meta.env.VITE_CORS_ORIGINS || '*'),
          credentials: import.meta.env.VITE_CORS_CREDENTIALS === 'true'
        },
        headers: {
          hsts: import.meta.env.VITE_SECURITY_HSTS === 'true',
          noSniff: import.meta.env.VITE_SECURITY_NO_SNIFF !== 'false',
          frameOptions: import.meta.env.VITE_SECURITY_FRAME_OPTIONS || 'DENY',
          xssProtection: import.meta.env.VITE_SECURITY_XSS_PROTECTION !== 'false'
        }
      },
      
      monitoring: {
        performance: {
          enabled: import.meta.env.VITE_MONITORING_PERFORMANCE === 'true',
          endpoint: import.meta.env.VITE_MONITORING_ENDPOINT || '/api/performance',
          sampleRate: parseFloat(import.meta.env.VITE_MONITORING_SAMPLE_RATE || '0.1'),
          bufferSize: parseInt(import.meta.env.VITE_MONITORING_BUFFER_SIZE || '100')
        },
        healthChecks: {
          enabled: import.meta.env.VITE_HEALTH_CHECKS_ENABLED !== 'false',
          interval: parseInt(import.meta.env.VITE_HEALTH_CHECK_INTERVAL || '30000'),
          timeout: parseInt(import.meta.env.VITE_HEALTH_CHECK_TIMEOUT || '5000'),
          endpoints: this.parseArray(import.meta.env.VITE_HEALTH_CHECK_ENDPOINTS || '/api/health')
        },
        logging: {
          level: (import.meta.env.VITE_LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
          format: (import.meta.env.VITE_LOG_FORMAT || 'json') as 'json' | 'text',
          destination: (import.meta.env.VITE_LOG_DESTINATION || 'console') as 'console' | 'file' | 'service',
          endpoint: import.meta.env.VITE_LOG_ENDPOINT
        },
        analytics: {
          enabled: import.meta.env.VITE_ANALYTICS_ENABLED === 'true',
          provider: (import.meta.env.VITE_ANALYTICS_PROVIDER || 'google') as 'google' | 'mixpanel' | 'custom',
          trackingId: import.meta.env.VITE_ANALYTICS_TRACKING_ID,
          endpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT
        }
      },
      
      features: {
        useModernComponents: import.meta.env.VITE_FEATURE_MODERN_COMPONENTS !== 'false',
        enableOfflineMode: import.meta.env.VITE_FEATURE_OFFLINE_MODE === 'true',
        enablePushNotifications: import.meta.env.VITE_FEATURE_PUSH_NOTIFICATIONS === 'true',
        enableAdvancedAnalytics: import.meta.env.VITE_FEATURE_ADVANCED_ANALYTICS === 'true',
        enableA11yFeatures: import.meta.env.VITE_FEATURE_A11Y === 'true',
        enableExperimentalFeatures: import.meta.env.VITE_FEATURE_EXPERIMENTAL === 'true' && environment !== 'production'
      },
      
      api: {
        baseUrl: import.meta.env.VITE_API_URL || 'https://crm.renovedigital.com.br/api',
        timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
        retries: parseInt(import.meta.env.VITE_API_RETRIES || '3'),
        retryDelay: parseInt(import.meta.env.VITE_API_RETRY_DELAY || '1000')
      },
      
      cdn: {
        enabled: import.meta.env.VITE_CDN_ENABLED === 'true',
        baseUrl: import.meta.env.VITE_CDN_BASE_URL,
        version: import.meta.env.VITE_CDN_VERSION
      },
      
      serviceWorker: {
        enabled: import.meta.env.VITE_SW_ENABLED !== 'false',
        scope: import.meta.env.VITE_SW_SCOPE || '/',
        updateCheckInterval: parseInt(import.meta.env.VITE_SW_UPDATE_INTERVAL || '60000')
      }
    };
  }

  private parseArray(value: string): string[] {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }

  private parseCSPDirectives(): Record<string, string[]> {
    const defaultDirectives = {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'https://api.supabase.co', 'wss://realtime.supabase.co'],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"]
    };

    // Permitir override via variável de ambiente
    const customCSP = import.meta.env.VITE_CSP_DIRECTIVES;
    if (customCSP) {
      try {
        const parsed = JSON.parse(customCSP);
        return { ...defaultDirectives, ...parsed };
      } catch (error) {
        console.warn('[Config] Failed to parse custom CSP directives:', error);
      }
    }

    return defaultDirectives;
  }

  private validateConfiguration(): void {
    const errors: string[] = [];

    // Validações críticas
    if (!this.config.database.url) {
      errors.push('Database URL is required');
    }

    if (!this.config.database.key) {
      errors.push('Database key is required');
    }

    if (this.config.environment === 'production') {
      // Validações específicas para produção
      if (!this.config.security.csp.enabled) {
        console.warn('[Config] CSP is disabled in production');
      }

      if (!this.config.security.rateLimit.enabled) {
        console.warn('[Config] Rate limiting is disabled in production');
      }

      if (this.config.features.enableExperimentalFeatures) {
        console.warn('[Config] Experimental features should not be enabled in production');
      }

      if (this.config.monitoring.logging.level === 'debug') {
        console.warn('[Config] Debug logging should not be used in production');
      }
    }

    // Validações de rede
    if (this.config.api.timeout < 1000) {
      errors.push('API timeout should be at least 1000ms');
    }

    if (this.config.api.retries < 0 || this.config.api.retries > 10) {
      errors.push('API retries should be between 0 and 10');
    }

    // Validações de cache
    if (this.config.cache.ttl < 1000) {
      console.warn('[Config] Cache TTL is very low (< 1s)');
    }

    if (this.config.cache.maxSize < 10) {
      console.warn('[Config] Cache max size is very low (< 10 items)');
    }

    // Validações de monitoramento
    if (this.config.monitoring.healthChecks.interval < 5000) {
      console.warn('[Config] Health check interval is very low (< 5s)');
    }

    if (this.config.monitoring.performance.sampleRate > 1 || this.config.monitoring.performance.sampleRate < 0) {
      errors.push('Performance sample rate should be between 0 and 1');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    this.validated = true;
    console.log(`[Config] Configuration validated for ${this.config.environment} environment`);
  }

  // Getters públicos
  public get(): ProductionConfig {
    if (!this.validated) {
      throw new Error('Configuration not validated');
    }
    return { ...this.config }; // Retornar cópia para evitar mutação
  }

  public getDatabase(): DatabaseConfig {
    return { ...this.config.database };
  }

  public getCache(): CacheConfig {
    return { ...this.config.cache };
  }

  public getSecurity(): SecurityConfig {
    return { ...this.config.security };
  }

  public getMonitoring(): MonitoringConfig {
    return { ...this.config.monitoring };
  }

  public getFeatures(): FeatureFlags {
    return { ...this.config.features };
  }

  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  public isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  public isStaging(): boolean {
    return this.config.environment === 'staging';
  }

  public isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.config.features[feature];
  }

  // Utilitários
  public getCSPHeader(): string {
    if (!this.config.security.csp.enabled) {
      return '';
    }

    const directives = Object.entries(this.config.security.csp.directives)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');

    return directives;
  }

  public getCORSOrigins(): string[] {
    return this.config.security.cors.origins;
  }

  public getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.security.headers.hsts) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    }

    if (this.config.security.headers.noSniff) {
      headers['X-Content-Type-Options'] = 'nosniff';
    }

    if (this.config.security.headers.frameOptions) {
      headers['X-Frame-Options'] = this.config.security.headers.frameOptions;
    }

    if (this.config.security.headers.xssProtection) {
      headers['X-XSS-Protection'] = '1; mode=block';
    }

    if (this.config.security.csp.enabled) {
      headers['Content-Security-Policy'] = this.getCSPHeader();
    }

    return headers;
  }

  // Debug info
  public getDebugInfo(): Record<string, any> {
    return {
      environment: this.config.environment,
      version: this.config.version,
      buildNumber: this.config.buildNumber,
      validated: this.validated,
      features: this.config.features,
      timestamp: new Date().toISOString()
    };
  }
}

// Instância global
export const config = new ConfigurationManager();

// Exports
export default config;
export type { ProductionConfig, DatabaseConfig, CacheConfig, SecurityConfig, MonitoringConfig, FeatureFlags }; 
// ============================================
// SISTEMA DE CONFIGURAÇÃO DE AMBIENTE CENTRALIZADO
// ============================================

export type Environment = 'development' | 'production' | 'staging' | 'test';

export interface EnvironmentConfig {
  // Application
  app: {
    name: string;
    version: string;
    environment: Environment;
  };
  
  // URLs
  urls: {
    api: string;
    frontend: string;
    backend: string;
  };
  
  // Supabase
  supabase: {
    url: string;
    anonKey: string;
  };
  
  // Debug & Features
  debug: {
    enabled: boolean;
    logLevel: string;
    performanceMonitoring: boolean;
  };
  
  // Features
  features: {
    analytics: boolean;
    realTime: boolean;
    notifications: boolean;
  };
  
  // Integrations
  integrations: {
    google: {
      clientId?: string;
      clientSecret?: string;
      redirectUri: string;
    };
  };
  
  // Security
  security: {
    cspEnabled: boolean;
    rateLimitEnabled: boolean;
    corsOrigins: string[];
  };
}

/**
 * Detecta o ambiente atual baseado em variáveis de ambiente
 */
export function detectEnvironment(): Environment {
  const viteEnv = import.meta.env.VITE_APP_ENV;
  const nodeEnv = import.meta.env.NODE_ENV;
  const mode = import.meta.env.MODE;
  
  // Prioridade: VITE_APP_ENV > NODE_ENV > MODE
  if (viteEnv) {
    return viteEnv as Environment;
  }
  
  if (nodeEnv === 'production') {
    return 'production';
  }
  
  if (nodeEnv === 'test') {
    return 'test';
  }
  
  if (mode === 'development' || !mode) {
    return 'development';
  }
  
  return 'development'; // fallback
}

/**
 * Configurações específicas por ambiente
 */
const environmentConfigs: Record<Environment, Partial<EnvironmentConfig>> = {
  development: {
    app: {
      name: 'CRM Marketing System [DEV]',
      version: '1.0.0-dev',
      environment: 'development',
    },
    urls: {
      api: 'http://127.0.0.1:3001/api',
      frontend: 'http://127.0.0.1:8080',
      backend: 'http://127.0.0.1:3001',
    },
    debug: {
      enabled: true,
      logLevel: 'debug',
      performanceMonitoring: true,
    },
    features: {
      analytics: false,
      realTime: true,
      notifications: true,
    },
    integrations: {
      google: {
        redirectUri: 'http://127.0.0.1:8080/auth/google/callback',
      },
    },
    security: {
      cspEnabled: false,
      rateLimitEnabled: false,
      corsOrigins: ['http://127.0.0.1:8080', 'http://127.0.0.1:8081', 'http://127.0.0.1:3000'],
    },
  },
  
  production: {
    app: {
      name: 'CRM Marketing System',
      version: '1.0.0',
      environment: 'production',
    },
    urls: {
      api: 'https://crm.renovedigital.com.br/api',
      frontend: 'https://crm.renovedigital.com.br',
      backend: 'https://crm.renovedigital.com.br/api',
    },
    debug: {
      enabled: false,
      logLevel: 'error',
      performanceMonitoring: true,
    },
    features: {
      analytics: true,
      realTime: true,
      notifications: true,
    },
    integrations: {
      google: {
        redirectUri: 'https://crm.renovedigital.com.br/auth/google/callback',
      },
    },
    security: {
      cspEnabled: true,
      rateLimitEnabled: true,
      corsOrigins: ['https://crm.renovedigital.com.br'],
    },
  },
  
  staging: {
    app: {
      name: 'CRM Marketing System [STAGING]',
      version: '1.0.0-staging',
      environment: 'staging',
    },
    urls: {
      api: 'https://staging.crm.renovedigital.com.br/api',
      frontend: 'https://staging.crm.renovedigital.com.br',
      backend: 'https://staging.crm.renovedigital.com.br/api',
    },
    debug: {
      enabled: true,
      logLevel: 'info',
      performanceMonitoring: true,
    },
    features: {
      analytics: false,
      realTime: true,
      notifications: true,
    },
    integrations: {
      google: {
        redirectUri: 'https://staging.crm.renovedigital.com.br/auth/google/callback',
      },
    },
    security: {
      cspEnabled: true,
      rateLimitEnabled: true,
      corsOrigins: ['https://staging.crm.renovedigital.com.br'],
    },
  },
  
  test: {
    app: {
      name: 'CRM Marketing System [TEST]',
      version: '1.0.0-test',
      environment: 'test',
    },
    urls: {
      api: 'http://127.0.0.1:3001/api',
      frontend: 'http://127.0.0.1:8080',
      backend: 'http://127.0.0.1:3001',
    },
    debug: {
      enabled: false,
      logLevel: 'silent',
      performanceMonitoring: false,
    },
    features: {
      analytics: false,
      realTime: false,
      notifications: false,
    },
    integrations: {
      google: {
        redirectUri: 'http://127.0.0.1:8080/auth/google/callback',
      },
    },
    security: {
      cspEnabled: false,
      rateLimitEnabled: false,
      corsOrigins: ['http://127.0.0.1:8080'],
    },
  },
};

/**
 * Mescla configurações de ambiente com variáveis de ambiente
 */
function mergeWithEnvVars(config: Partial<EnvironmentConfig>): EnvironmentConfig {
  return {
    app: {
      name: import.meta.env.VITE_APP_NAME || config.app?.name || 'CRM Marketing System',
      version: import.meta.env.VITE_APP_VERSION || config.app?.version || '1.0.0',
      environment: (import.meta.env.VITE_APP_ENV || config.app?.environment || 'development') as Environment,
    },
    
    urls: {
      // AIDEV-NOTE: Fallback inteligente - produção primeiro, depois desenvolvimento
      api: import.meta.env.VITE_API_URL || config.urls?.api || 
           (import.meta.env.VITE_ENVIRONMENT === 'production' 
             ? 'https://crm.renovedigital.com.br/api' 
             : 'http://127.0.0.1:3001/api'),
      frontend: import.meta.env.VITE_FRONTEND_URL || config.urls?.frontend || 
               (import.meta.env.VITE_ENVIRONMENT === 'production' 
                 ? 'https://crm.renovedigital.com.br' 
                 : 'http://127.0.0.1:8080'),
      backend: import.meta.env.VITE_BACKEND_URL || config.urls?.backend || 
              (import.meta.env.VITE_ENVIRONMENT === 'production' 
                ? 'https://crm.renovedigital.com.br' 
                : 'http://127.0.0.1:3001'),
    },
    
    supabase: {
      url: import.meta.env.VITE_SUPABASE_URL || 'https://marajvabdwkpgopytvhh.supabase.co',
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
    
    debug: {
      enabled: import.meta.env.VITE_DEBUG_MODE === 'true' || config.debug?.enabled || false,
      logLevel: import.meta.env.VITE_LOG_LEVEL || config.debug?.logLevel || 'warn',
      performanceMonitoring: import.meta.env.VITE_PERFORMANCE_MONITORING === 'true' || config.debug?.performanceMonitoring || false,
    },
    
    features: {
      analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true' || config.features?.analytics || false,
      realTime: import.meta.env.VITE_ENABLE_REAL_TIME !== 'false',
      notifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS !== 'false',
    },
    
    integrations: {
      google: {
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
        redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || config.integrations?.google?.redirectUri || 'http://127.0.0.1:8080/auth/google/callback',
      },
    },
    
    security: {
      cspEnabled: import.meta.env.VITE_CSP_ENABLED === 'true' || config.security?.cspEnabled || false,
      rateLimitEnabled: import.meta.env.VITE_RATE_LIMIT_ENABLED === 'true' || config.security?.rateLimitEnabled || false,
      corsOrigins: import.meta.env.VITE_CORS_ORIGINS?.split(',') || config.security?.corsOrigins || ['http://127.0.0.1:8080'],
    },
  };
}

/**
 * Configuração atual do ambiente
 */
export const currentEnvironment = detectEnvironment();
export const environmentConfig = mergeWithEnvVars(environmentConfigs[currentEnvironment] || {});

/**
 * Validação de configuração crítica
 */
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!environmentConfig.supabase.url) {
    errors.push('VITE_SUPABASE_URL é obrigatória');
  }
  
  if (!environmentConfig.supabase.anonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY é obrigatória');
  }
  
  if (!environmentConfig.urls.api) {
    errors.push('VITE_API_URL é obrigatória');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Log de inicialização
if (environmentConfig.debug.enabled) {
  console.log('🚀 Configuração de ambiente carregada:', {
    environment: currentEnvironment,
    app: environmentConfig.app,
    urls: environmentConfig.urls,
    features: environmentConfig.features,
  });
  
  const validation = validateConfig();
  if (!validation.isValid) {
    console.error('❌ Erros na configuração:', validation.errors);
  } else {
    console.log('✅ Configuração válida');
  }
}

export default environmentConfig; 
// ========================================
// CONFIGURAÇÃO BACKEND - AMBIENTE CENTRALIZADO
// CRM RENOVE - Multi-tenant SaaS
// ========================================

export type Environment = 'development' | 'production' | 'staging' | 'test';

export interface BackendConfig {
  // Application
  app: {
    name: string;
    version: string;
    environment: Environment;
  };
  
  // Server
  server: {
    port: number;
    host: string;
    trustProxy: boolean;
  };
  
  // URLs
  urls: {
    frontend: string;
    backend: string;
    app: string; // Para emails e links
  };
  
  // CORS
  cors: {
    origins: string[];
    credentials: boolean;
  };
  
  // Supabase
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  
  // Security
  security: {
    jwtSecret: string;
    helmetEnabled: boolean;
    rateLimitEnabled: boolean;
    httpsOnly: boolean;
  };
  
  // Features
  features: {
    emailEnabled: boolean;
    googleIntegration: boolean;
    rateLimiting: boolean;
  };
  
  // Logging
  logging: {
    level: string;
    toFile: boolean;
    enableMorgan: boolean;
  };
}

/**
 * Detecta o ambiente atual baseado em variáveis de ambiente
 */
export function detectEnvironment(): Environment {
  const nodeEnv = process.env.NODE_ENV;
  const viteEnv = process.env.VITE_ENVIRONMENT;
  
  // Prioridade: NODE_ENV > VITE_ENVIRONMENT
  if (nodeEnv === 'production') {
    return 'production';
  }
  
  if (nodeEnv === 'test') {
    return 'test';
  }
  
  if (viteEnv === 'staging') {
    return 'staging';
  }
  
  return 'development'; // fallback
}

/**
 * Função para obter variável obrigatória
 */
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`❌ Variável de ambiente obrigatória não encontrada: ${key}`);
  }
  return value;
};

/**
 * Configurações específicas por ambiente
 */
const environmentConfigs: Record<Environment, Partial<BackendConfig>> = {
  development: {
    app: {
      name: 'CRM Backend [DEV]',
      version: '1.0.0-dev',
      environment: 'development',
    },
    server: {
      port: 3001,
      host: '127.0.0.1',
      trustProxy: false,
    },
    urls: {
      frontend: 'http://127.0.0.1:8080',
      backend: 'http://127.0.0.1:3001',
      app: 'http://127.0.0.1:8080',
    },
    cors: {
      origins: [
        'http://127.0.0.1:8080',
        'http://localhost:8080',
        'http://127.0.0.1:5173',
        'http://localhost:5173'
      ],
      credentials: true,
    },
    security: {
      helmetEnabled: false,
      rateLimitEnabled: false,
      httpsOnly: false,
    },
    features: {
      emailEnabled: true,
      googleIntegration: true,
      rateLimiting: false,
    },
    logging: {
      level: 'debug',
      toFile: false,
      enableMorgan: true,
    },
  },
  
  production: {
    app: {
      name: 'CRM Backend',
      version: '1.0.0',
      environment: 'production',
    },
    server: {
      port: 3001,
      host: '127.0.0.1', // Nginx faz proxy reverso
      trustProxy: true,
    },
    urls: {
      frontend: 'https://crm.renovedigital.com.br',
      backend: 'https://crm.renovedigital.com.br/api',
      app: 'https://crm.renovedigital.com.br',
    },
    cors: {
      origins: ['https://crm.renovedigital.com.br'],
      credentials: true,
    },
    security: {
      helmetEnabled: true,
      rateLimitEnabled: true,
      httpsOnly: true,
    },
    features: {
      emailEnabled: true,
      googleIntegration: true,
      rateLimiting: true,
    },
    logging: {
      level: 'error',
      toFile: true,
      enableMorgan: false,
    },
  },
  
  staging: {
    app: {
      name: 'CRM Backend [STAGING]',
      version: '1.0.0-staging',
      environment: 'staging',
    },
    server: {
      port: 3001,
      host: '127.0.0.1',
      trustProxy: true,
    },
    urls: {
      frontend: 'https://staging.crm.renovedigital.com.br',
      backend: 'https://staging.crm.renovedigital.com.br/api',
      app: 'https://staging.crm.renovedigital.com.br',
    },
    cors: {
      origins: ['https://staging.crm.renovedigital.com.br'],
      credentials: true,
    },
    security: {
      helmetEnabled: true,
      rateLimitEnabled: true,
      httpsOnly: true,
    },
    features: {
      emailEnabled: true,
      googleIntegration: true,
      rateLimiting: true,
    },
    logging: {
      level: 'info',
      toFile: true,
      enableMorgan: true,
    },
  },
  
  test: {
    app: {
      name: 'CRM Backend [TEST]',
      version: '1.0.0-test',
      environment: 'test',
    },
    server: {
      port: 3001,
      host: '127.0.0.1',
      trustProxy: false,
    },
    urls: {
      frontend: 'http://127.0.0.1:8080',
      backend: 'http://127.0.0.1:3001',
      app: 'http://127.0.0.1:8080',
    },
    cors: {
      origins: ['http://127.0.0.1:8080'],
      credentials: true,
    },
    security: {
      helmetEnabled: false,
      rateLimitEnabled: false,
      httpsOnly: false,
    },
    features: {
      emailEnabled: false,
      googleIntegration: false,
      rateLimiting: false,
    },
    logging: {
      level: 'silent',
      toFile: false,
      enableMorgan: false,
    },
  },
};

/**
 * Mescla configurações de ambiente com variáveis de ambiente
 */
function mergeWithEnvVars(config: Partial<BackendConfig>): BackendConfig {
  return {
    app: {
      name: process.env.APP_NAME || config.app?.name || 'CRM Backend',
      version: process.env.APP_VERSION || config.app?.version || '1.0.0',
      environment: (process.env.NODE_ENV || process.env.VITE_ENVIRONMENT || config.app?.environment || 'development') as Environment,
    },
    
    server: {
      port: parseInt(process.env.PORT || String(config.server?.port || 3001), 10),
      host: process.env.HOST || config.server?.host || '127.0.0.1',
      trustProxy: process.env.TRUST_PROXY === 'true' || config.server?.trustProxy || false,
    },
    
    urls: {
      frontend: process.env.VITE_FRONTEND_URL || process.env.FRONTEND_URL || config.urls?.frontend || 'http://127.0.0.1:8080',
      backend: process.env.VITE_BACKEND_URL || process.env.BACKEND_URL || config.urls?.backend || 'http://127.0.0.1:3001',
      app: process.env.APP_URL || config.urls?.app || process.env.VITE_FRONTEND_URL || 'http://127.0.0.1:8080',
    },
    
    cors: {
      origins: (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean) || config.cors?.origins || ['http://127.0.0.1:8080'],
      credentials: process.env.CORS_CREDENTIALS !== 'false',
    },
    
    supabase: {
      url: getEnvVar('VITE_SUPABASE_URL', 'https://marajvabdwkpgopytvhh.supabase.co'),
      anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY'),
      serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
    },
    
    security: {
      jwtSecret: getEnvVar('JWT_SECRET'),
      helmetEnabled: process.env.HELMET_ENABLED === 'true' || config.security?.helmetEnabled || false,
      rateLimitEnabled: process.env.RATE_LIMIT_ENABLED === 'true' || config.security?.rateLimitEnabled || false,
      httpsOnly: process.env.HTTPS_ONLY === 'true' || config.security?.httpsOnly || false,
    },
    
    features: {
      emailEnabled: process.env.EMAIL_ENABLED !== 'false',
      googleIntegration: process.env.GOOGLE_INTEGRATION !== 'false',
      rateLimiting: process.env.RATE_LIMITING !== 'false',
    },
    
    logging: {
      level: process.env.LOG_LEVEL || config.logging?.level || 'info',
      toFile: process.env.LOG_TO_FILE === 'true' || config.logging?.toFile || false,
      enableMorgan: process.env.ENABLE_MORGAN !== 'false',
    },
  };
}

/**
 * Configuração atual do ambiente
 */
export const currentEnvironment = detectEnvironment();
export const backendConfig = mergeWithEnvVars(environmentConfigs[currentEnvironment] || {});

/**
 * Validação de configuração crítica
 */
export function validateBackendConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!backendConfig.supabase.url) {
    errors.push('VITE_SUPABASE_URL é obrigatória');
  }
  
  if (!backendConfig.supabase.anonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY é obrigatória');
  }
  
  if (!backendConfig.supabase.serviceRoleKey) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY é obrigatória');
  }
  
  if (!backendConfig.security.jwtSecret) {
    errors.push('JWT_SECRET é obrigatória');
  }
  
  if (backendConfig.server.port < 1 || backendConfig.server.port > 65535) {
    errors.push('PORT deve estar entre 1 e 65535');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Log de inicialização
if (backendConfig.app.environment === 'development') {
  console.group('🔧 Backend Configuration');
  console.log('Environment:', currentEnvironment);
  console.log('Server:', `http://${backendConfig.server.host}:${backendConfig.server.port}`);
  console.log('Frontend URL:', backendConfig.urls.frontend);
  console.log('CORS Origins:', backendConfig.cors.origins);
  console.log('Features:', {
    email: backendConfig.features.emailEnabled,
    google: backendConfig.features.googleIntegration,
    rateLimit: backendConfig.features.rateLimiting,
  });
  console.groupEnd();
  
  const validation = validateBackendConfig();
  if (!validation.isValid) {
    console.error('❌ Backend configuration errors:', validation.errors);
  } else {
    console.log('✅ Backend configuration is valid');
  }
}

export default backendConfig;
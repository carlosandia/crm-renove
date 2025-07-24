// ============================================
// CONFIGURAÇÃO CENTRALIZADA DA APLICAÇÃO
// ============================================

export interface AppConfig {
  // Informações da aplicação
  app: {
    name: string;
    version: string;
    environment: string;
  };
  
  // URLs e APIs
  api: {
    baseUrl: string;
    timeout: number;
  };
  
  // Supabase
  supabase: {
    url: string;
    anonKey: string;
  };
  
  // Debug e logs
  debug: {
    enabled: boolean;
    logLevel: string;
  };
  
  // Features
  features: {
    analytics: boolean;
    realTime: boolean;
    notifications: boolean;
    performanceMonitoring: boolean;
  };
  
  // Integrações
  integrations: {
    meta: {
      appId?: string;
      pixelId?: string;
    };
    google: {
      adsClientId?: string;
      analyticsId?: string;
    };
    sentry: {
      dsn?: string;
      environment: string;
    };
  };
}

// Função para obter configuração com fallbacks seguros
function getConfig(): AppConfig {
  return {
    app: {
      name: import.meta.env.VITE_APP_NAME || 'CRM Marketing System',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development'
    },
    
    api: {
      baseUrl: import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001',
      timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10)
    },
    
    supabase: {
      url: import.meta.env.VITE_SUPABASE_URL || 'https://marajvabdwkpgopytvhh.supabase.co',
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU'
    },
    
    debug: {
      enabled: import.meta.env.VITE_DEBUG_MODE === 'true' || import.meta.env.MODE === 'development',
      logLevel: import.meta.env.VITE_LOG_LEVEL || 'info'
    },
    
    features: {
      analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
      realTime: import.meta.env.VITE_ENABLE_REAL_TIME !== 'false', // habilitado por padrão
      notifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS !== 'false', // habilitado por padrão
      performanceMonitoring: import.meta.env.VITE_PERFORMANCE_MONITORING === 'true'
    },
    
    integrations: {
      meta: {
        appId: import.meta.env.VITE_META_APP_ID,
        pixelId: import.meta.env.VITE_META_PIXEL_ID
      },
      google: {
        adsClientId: import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID,
        analyticsId: import.meta.env.VITE_GOOGLE_ANALYTICS_ID
      },
      sentry: {
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development'
      }
    }
  };
}

// Configuração da aplicação
export const appConfig = getConfig();

// Validação de configurações críticas
function validateConfig() {
  const errors: string[] = [];
  
  if (!appConfig.supabase.url) {
    errors.push('VITE_SUPABASE_URL é obrigatória');
  }
  
  if (!appConfig.supabase.anonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY é obrigatória');
  }
  
  if (!appConfig.api.baseUrl) {
    errors.push('VITE_API_URL é obrigatória');
  }
  
  if (errors.length > 0) {
    console.error('❌ Erros de configuração:', errors);
    if (appConfig.app.environment === 'production') {
      throw new Error(`Configuração inválida: ${errors.join(', ')}`);
    }
  }
}

// Executar validação
validateConfig();

// Log de inicialização (apenas em desenvolvimento)
if (appConfig.debug.enabled && appConfig.app.environment === 'development') {
  console.log('🚀 CRM iniciado:', appConfig.app.name, appConfig.app.version);
}

export default appConfig; 
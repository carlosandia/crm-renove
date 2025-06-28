// ============================================================================
// CONFIGURAÇÃO CENTRALIZADA DE BANCO DE DADOS
// ============================================================================

export interface DatabaseConfig {
  connection: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };
  timeouts: {
    query: number;
    connection: number;
    realtime: number;
    healthCheck: number;
  };
  retries: {
    maxAttempts: number;
    delay: number;
    backoff: boolean;
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  features: {
    realtime: boolean;
    auth: boolean;
    storage: boolean;
  };
}

// Configuração padrão otimizada para produção
export const databaseConfig: DatabaseConfig = {
  connection: {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://marajvabdwkpgopytvhh.supabase.co',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU',
    serviceRoleKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  },
  
  timeouts: {
    query: 10000,        // 10s para queries
    connection: 15000,   // 15s para conexão inicial
    realtime: 30000,     // 30s para realtime
    healthCheck: 5000    // 5s para health check
  },
  
  retries: {
    maxAttempts: 3,
    delay: 1000,         // 1s base delay
    backoff: true        // exponential backoff
  },
  
  cache: {
    enabled: true,
    ttl: 300000,         // 5 minutos
    maxSize: 100         // 100 entradas
  },
  
  features: {
    realtime: import.meta.env.VITE_ENABLE_REALTIME !== 'false',
    auth: true,
    storage: import.meta.env.VITE_ENABLE_STORAGE !== 'false'
  }
};

// Validação de configuração
export function validateDatabaseConfig(): void {
  const errors: string[] = [];
  
  if (!databaseConfig.connection.url) {
    errors.push('Database URL is required');
  }
  
  if (!databaseConfig.connection.anonKey) {
    errors.push('Database anonymous key is required');
  }
  
  if (databaseConfig.timeouts.query <= 0) {
    errors.push('Query timeout must be positive');
  }
  
  if (databaseConfig.retries.maxAttempts <= 0) {
    errors.push('Max retry attempts must be positive');
  }
  
  if (errors.length > 0) {
    const environment = import.meta.env.MODE || 'development';
    console.error('❌ Database configuration errors:', errors);
    
    if (environment === 'production') {
      throw new Error(`Invalid database configuration: ${errors.join(', ')}`);
    }
  }
}

// Função para criar headers padronizados
export function createStandardHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'apikey': databaseConfig.connection.anonKey,
    'Authorization': `Bearer ${databaseConfig.connection.anonKey}`,
    'X-Client-Info': 'crm-marketing-frontend',
    'X-Frontend-Request': 'true'
  };
}

// Função para criar timeout controller
export function createTimeoutController(timeoutMs: number): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  const cleanup = () => {
    clearTimeout(timeoutId);
  };
  
  return { controller, cleanup };
}

// Função de retry com backoff exponencial
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  attempts: number = databaseConfig.retries.maxAttempts,
  delay: number = databaseConfig.retries.delay
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (attempts <= 1) {
      throw error;
    }
    
    // Aguardar com backoff exponencial se habilitado
    const waitTime = databaseConfig.retries.backoff ? delay * (2 ** (databaseConfig.retries.maxAttempts - attempts)) : delay;
    
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    return retryWithBackoff(fn, attempts - 1, delay);
  }
}

// Health check específico
export async function performDatabaseHealthCheck(): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const { controller, cleanup } = createTimeoutController(databaseConfig.timeouts.healthCheck);
    
    try {
      // Importar supabase dinamicamente para evitar dependências circulares
      const { supabase } = await import('../lib/supabase');
      
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        .abortSignal(controller.signal);
      
      if (error) {
        return {
          success: false,
          error: error.message,
          latency: Date.now() - startTime
        };
      }
      
      return {
        success: true,
        latency: Date.now() - startTime
      };
      
    } finally {
      cleanup();
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      error: errorMessage,
      latency: Date.now() - startTime
    };
  }
}

// Executar validação ao importar
validateDatabaseConfig();

// Log de configuração em desenvolvimento
if (import.meta.env.MODE === 'development') {
  console.log('🗄️ Database configuration:', {
    url: databaseConfig.connection.url,
    hasAnonKey: Boolean(databaseConfig.connection.anonKey),
    timeouts: databaseConfig.timeouts,
    features: databaseConfig.features
  });
} 
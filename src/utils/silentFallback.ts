// 🛡️ SISTEMA DE FALLBACK SILENCIOSO - SUBSTITUI networkHealthCheck
// ============================================
// SOLUÇÃO DEFINITIVA PARA ERROS DE FETCH
// ============================================

const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'warn';
const isDebugMode = LOG_LEVEL === 'debug';

// ============================================
// FETCH SILENCIOSO COM TIMEOUT
// ============================================
export const silentFetch = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Log apenas em modo debug
      if (isDebugMode) {
        console.warn(`🔧 API ${response.status}: ${url}`);
      }
      return null;
    }
    
    return response;
  } catch (error) {
    // Falha completamente silenciosa - sem logs excessivos
    if (isDebugMode) {
      console.warn(`🔧 Fetch failed: ${url}`, error);
    }
    return null;
  }
};

// ============================================
// EXECUTOR COM FALLBACK AUTOMÁTICO
// ============================================
export const executeWithFallback = async <T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  errorMessage?: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    // Log apenas em modo debug
    if (isDebugMode && errorMessage) {
      console.warn(`🔧 Fallback: ${errorMessage}`, error);
    }
    return fallbackValue;
  }
};

// ============================================
// HEALTH CHECK SIMPLES (SEM LOOPS)
// ============================================
export const simpleHealthCheck = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    // Falha silenciosa
    return false;
  }
};

// ============================================
// FETCH COM RETRY INTELIGENTE
// ============================================
export const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  maxRetries: number = 2
): Promise<Response | null> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await silentFetch(url, options);
    
    if (result) {
      return result;
    }
    
    // Esperar antes de tentar novamente (exceto na última tentativa)
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  
  return null;
};

// ============================================
// HELPER PARA APIS COM FALLBACK
// ============================================
export const apiCall = async <T>(
  endpoint: string,
  options: RequestInit = {},
  fallbackValue: T | null = null
): Promise<T | null> => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  
  return executeWithFallback(
    async () => {
      const response = await silentFetch(url, options);
      if (!response) return fallbackValue;
      
      const data = await response.json();
      return data;
    },
    fallbackValue,
    `API call failed: ${endpoint}`
  );
};

// ============================================
// STATUS SIMPLES SEM LOOPS
// ============================================
export const getSystemStatus = async (): Promise<'online' | 'degraded' | 'offline'> => {
  const backendUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  const [backendOk, supabaseOk] = await Promise.all([
    simpleHealthCheck(`${backendUrl}/health`),
    supabaseUrl ? simpleHealthCheck(`${supabaseUrl}/rest/v1/`) : Promise.resolve(true)
  ]);
  
  if (backendOk && supabaseOk) return 'online';
  if (backendOk || supabaseOk) return 'degraded';
  return 'offline';
}; 
/**
 * SUPABASE RETRY UTILITY - WINSTON-OPTIMIZED
 * Sistema de retry inteligente com logging otimizado - só loga falhas reais
 * Implementa Winston best practices para reduzir spam de logs
 */

import { loggers } from './logger';

// ================================================================================
// TIPOS E CONFIGURAÇÕES
// ================================================================================

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  retryOnNetworkError: boolean;
  retryOnTimeout: boolean;
}

interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attemptsMade: number;
  totalTime: number;
}

// Configuração padrão otimizada para Supabase
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 segundo
  maxDelay: 5000,  // 5 segundos máximo
  exponentialBackoff: true,
  retryOnNetworkError: true,
  retryOnTimeout: true
};

// ================================================================================
// IDENTIFICAÇÃO DE ERROS RETRY-APTOS
// ================================================================================

/**
 * Identifica se um erro é passível de retry
 */
function isRetryableError(error: any): boolean {
  // Erros de rede/conectividade
  const networkErrors = [
    'ERR_CONNECTION_CLOSED',
    'ERR_NETWORK',
    'ERR_INTERNET_DISCONNECTED',
    'ERR_CONNECTION_REFUSED',
    'NETWORK_ERROR',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT'
  ];

  // Verificar código de erro
  if (error?.code && networkErrors.includes(error.code)) {
    return true;
  }

  // Verificar mensagem de erro
  if (error?.message) {
    const message = error.message.toLowerCase();
    const retryableMessages = [
      'network error',
      'connection closed',
      'connection refused', 
      'timeout',
      'fetch failed',
      'failed to fetch',
      'network request failed'
    ];
    
    return retryableMessages.some(msg => message.includes(msg));
  }

  // Status codes HTTP que podem ser retry-aptos
  if (error?.response?.status) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.response.status);
  }

  return false;
}

// ================================================================================
// FUNÇÃO PRINCIPAL DE RETRY
// ================================================================================

/**
 * ✅ WINSTON-OPTIMIZED: Retry inteligente com logging minimal
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  operationName = 'Supabase Operation'
): Promise<RetryResult<T>> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startTime = Date.now();
  
  let lastError: Error | null = null;
  let attemptsMade = 0;

  // ✅ NÃO LOGAR INÍCIO - apenas rodar a operação

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    attemptsMade = attempt;
    
    try {
      // ✅ NÃO LOGAR CADA TENTATIVA - apenas rodar
      const result = await operation();
      
      const totalTime = Date.now() - startTime;
      
      // ✅ LOGAR APENAS SE HOUVE RETRY OU FOI MUITO LENTO
      loggers.retry.success(operationName, attemptsMade, totalTime);
      
      return {
        success: true,
        data: result,
        attemptsMade,
        totalTime
      };
      
    } catch (error: any) {
      lastError = error;
      const isRetryable = isRetryableError(error);
      
      // ✅ LOGAR APENAS SE VAI TENTAR NOVAMENTE (retry real)
      if (isRetryable && attempt < finalConfig.maxAttempts) {
        loggers.retry.onlyIfFailed(operationName, attempt, finalConfig.maxAttempts, error);
      }

      // Se não é retry-able ou é a última tentativa, falhar
      if (!isRetryable || attempt === finalConfig.maxAttempts) {
        break;
      }

      // Calcular delay para próxima tentativa
      let delay = finalConfig.baseDelay;
      if (finalConfig.exponentialBackoff) {
        delay = Math.min(
          finalConfig.baseDelay * Math.pow(2, attempt - 1),
          finalConfig.maxDelay
        );
      }

      // ✅ NÃO LOGAR DELAY - apenas aguardar
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // ✅ LOGAR FALHA FINAL APENAS SE HOUVE MÚLTIPLAS TENTATIVAS
  const totalTime = Date.now() - startTime;
  if (attemptsMade > 1) {
    loggers.api.error(`${operationName} (após ${attemptsMade} tentativas)`, lastError);
  }

  return {
    success: false,
    error: lastError || new Error('Operação falhou após todas as tentativas'),
    attemptsMade,
    totalTime
  };
}

// ================================================================================
// HELPERS ESPECÍFICOS PARA SUPABASE
// ================================================================================

/**
 * Retry específico para operações de API HTTP
 */
export async function withApiRetry<T>(
  operation: () => Promise<T>,
  operationName = 'API Call'
): Promise<T> {
  const result = await withRetry(
    operation,
    {
      maxAttempts: 3,
      baseDelay: 1000,
      exponentialBackoff: true
    },
    operationName
  );

  if (!result.success) {
    throw result.error || new Error(`${operationName} falhou após todas as tentativas`);
  }

  return result.data!;
}

/**
 * Retry específico para operações críticas (salvamento)
 */
export async function withCriticalRetry<T>(
  operation: () => Promise<T>,
  operationName = 'Critical Operation'
): Promise<T> {
  const result = await withRetry(
    operation,
    {
      maxAttempts: 5, // Mais tentativas para operações críticas
      baseDelay: 2000, // Delay maior
      maxDelay: 10000,
      exponentialBackoff: true
    },
    operationName
  );

  if (!result.success) {
    throw result.error || new Error(`${operationName} falhou após todas as tentativas`);
  }

  return result.data!;
}

/**
 * ✅ WINSTON-OPTIMIZED: Retry silencioso com fallback (sem logs de spam)
 */
export async function withSilentRetry<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  operationName = 'Background Operation'
): Promise<T> {
  const result = await withRetry(
    operation,
    {
      maxAttempts: 2, // Poucas tentativas para operações background
      baseDelay: 500,
      exponentialBackoff: false
    },
    operationName
  );

  if (result.success) {
    return result.data!;
  } else {
    // ✅ LOGAR APENAS ERROS DE CACHE IMPORTANTES (não operações background normais)
    if (operationName.includes('Cache')) {
      loggers.cache.error(operationName, result.error);
    }
    return fallbackValue;
  }
}

// ================================================================================
// HEALTH CHECK PARA SUPABASE
// ================================================================================

/**
 * Verifica conectividade básica com Supabase
 */
export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const { supabase } = await import('../lib/supabase');
    
    // Teste simples de conectividade
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('⚠️ [SupabaseHealth] Erro ao verificar sessão:', error.message);
      return false;
    }
    
    console.log('✅ [SupabaseHealth] Conectividade OK');
    return true;
    
  } catch (error: any) {
    console.error('❌ [SupabaseHealth] Falha na conectividade:', error.message);
    return false;
  }
}
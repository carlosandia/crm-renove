// ✅ UTILITÁRIO DE RETRY COM EXPONENTIAL BACKOFF
// Implementação baseada nas melhores práticas para requisições resilientes

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  totalTime: number;
}

/**
 * ✅ FUNÇÃO PRINCIPAL DE RETRY COM EXPONENTIAL BACKOFF
 * Implementa padrão resiliente para chamadas de API
 */
export async function retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = defaultRetryCondition,
    onRetry
  } = options;

  let lastError: any;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts: attempt,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      lastError = error;

      // Se é a última tentativa ou erro não deve ser retriado
      if (attempt === maxAttempts || !retryCondition(error)) {
        break;
      }

      // Calcular delay com exponential backoff
      const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
      
      // Callback opcional para log de retry
      if (onRetry) {
        onRetry(attempt, error);
      }

      // Aguardar antes da próxima tentativa
      await sleep(delay);
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxAttempts,
    totalTime: Date.now() - startTime
  };
}

/**
 * ✅ CONDIÇÃO PADRÃO PARA RETRY
 * Define quais erros devem ser retriados
 */
function defaultRetryCondition(error: any): boolean {
  // Não retryr erros de autenticação
  if (error?.response?.status === 401 || error?.response?.status === 403) {
    return false;
  }

  // Não retryr erros de dados inválidos
  if (error?.response?.status === 400 || error?.response?.status === 422) {
    return false;
  }

  // Retry para erros de rede, timeout, 500, 502, 503, 504
  if (
    error?.name === 'NetworkError' ||
    error?.name === 'TimeoutError' ||
    error?.message?.includes('fetch') ||
    error?.message?.includes('network') ||
    error?.message?.includes('timeout') ||
    error?.message?.includes('CORS') ||
    error?.response?.status >= 500
  ) {
    return true;
  }

  return false;
}

/**
 * ✅ UTILITÁRIO DE SLEEP
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * ✅ RETRY ESPECÍFICO PARA SUPABASE
 * Com lógica especializada para erros do Supabase
 */
export async function retrySupabaseQuery<T>(
  query: () => Promise<{ data: T | null; error: any }>,
  options: Omit<RetryOptions, 'retryCondition'> = {}
): Promise<RetryResult<T>> {
  return retryWithExponentialBackoff(
    async () => {
      const result = await query();
      if (result.error) {
        throw result.error;
      }
      return result.data;
    },
    {
      ...options,
      retryCondition: (error) => {
        // Não retry para erros de RLS ou permissão
        if (error?.code === 'PGRST116' || error?.code === '42501') {
          return false;
        }
        
        // Retry para erros de conexão, timeout, etc.
        return defaultRetryCondition(error);
      }
    }
  );
}

/**
 * ✅ RETRY ESPECÍFICO PARA FETCH/API
 * Com lógica especializada para chamadas HTTP
 */
export async function retryFetchOperation<T>(
  fetchOperation: () => Promise<Response>,
  parseResponse: (response: Response) => Promise<T>,
  options: Omit<RetryOptions, 'retryCondition'> = {}
): Promise<RetryResult<T>> {
  return retryWithExponentialBackoff(
    async () => {
      const response = await fetchOperation();
      
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).response = response;
        throw error;
      }
      
      return await parseResponse(response);
    },
    {
      ...options,
      retryCondition: (error) => {
        // Não retry para erros de dados inválidos
        if (error?.response?.status === 400 || error?.response?.status === 422) {
          return false;
        }
        
        return defaultRetryCondition(error);
      }
    }
  );
}

/**
 * ✅ CIRCUIT BREAKER SIMPLES
 * Para evitar cascata de falhas
 */
class SimpleCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold = 5,
    private recoveryTimeout = 30000 // 30 segundos
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Exportar instância global do circuit breaker
export const globalCircuitBreaker = new SimpleCircuitBreaker();

/**
 * ✅ HOOK PARA MONITORAMENTO DE RETRY
 * Para debugging e observabilidade
 */
export function createRetryLogger(context: string) {
  return {
    onRetry: (attempt: number, error: any) => {
      console.warn(`🔄 [${context}] Tentativa ${attempt} falhou:`, {
        error: error?.message || 'Unknown error',
        isNetworkError: error?.name === 'NetworkError',
        isCorsError: error?.message?.includes('CORS'),
        statusCode: error?.response?.status
      });
    },
    
    onSuccess: (attempts: number, totalTime: number) => {
      if (attempts > 1) {
        console.log(`✅ [${context}] Sucesso após ${attempts} tentativas (${totalTime}ms)`);
      }
    },

    onFinalFailure: (attempts: number, totalTime: number, error: any) => {
      console.error(`❌ [${context}] Falha final após ${attempts} tentativas (${totalTime}ms):`, {
        error: error?.message || 'Unknown error',
        stack: error?.stack
      });
    }
  };
}
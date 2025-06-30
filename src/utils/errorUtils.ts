/**
 * 🔧 Sistema de Error Handling Unificado - Elimina duplicação de tratamentos
 * Centraliza todas as lógicas de tratamento de erro
 */

import { NOTIFICATION } from '@/utils/constants';

// ============================================
// TIPOS DE ERRO
// ============================================

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  userMessage: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: ValidationError[];
  code?: string;
}

export type ErrorLevel = 'info' | 'warning' | 'error' | 'critical';

// ============================================
// CÓDIGOS DE ERRO PADRÃO
// ============================================

export const ERROR_CODES = {
  // Rede e API
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  SERVER_ERROR: 'SERVER_ERROR',
  
  // Validação
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  // Aplicação
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  RATE_LIMIT: 'RATE_LIMIT',
  
  // Dados
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  INVALID_DATA: 'INVALID_DATA',
  OUTDATED_DATA: 'OUTDATED_DATA',
  
  // Upload
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED'
} as const;

// ============================================
// MENSAGENS AMIGÁVEIS
// ============================================

export const ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK_ERROR]: 'Problema de conexão. Verifique sua internet.',
  [ERROR_CODES.API_ERROR]: 'Erro no servidor. Tente novamente em alguns minutos.',
  [ERROR_CODES.TIMEOUT_ERROR]: 'Operação demorou muito. Tente novamente.',
  [ERROR_CODES.UNAUTHORIZED]: 'Acesso negado. Faça login novamente.',
  [ERROR_CODES.FORBIDDEN]: 'Você não tem permissão para esta ação.',
  [ERROR_CODES.NOT_FOUND]: 'Registro não encontrado.',
  [ERROR_CODES.SERVER_ERROR]: 'Erro interno do servidor. Nossa equipe foi notificada.',
  
  [ERROR_CODES.VALIDATION_ERROR]: 'Dados inválidos. Verifique os campos.',
  [ERROR_CODES.REQUIRED_FIELD]: 'Este campo é obrigatório.',
  [ERROR_CODES.INVALID_FORMAT]: 'Formato inválido.',
  [ERROR_CODES.DUPLICATE_ENTRY]: 'Registro já existe.',
  
  [ERROR_CODES.UNKNOWN_ERROR]: 'Erro inesperado. Tente novamente.',
  [ERROR_CODES.PERMISSION_DENIED]: 'Permissão insuficiente.',
  [ERROR_CODES.FEATURE_DISABLED]: 'Funcionalidade temporariamente indisponível.',
  [ERROR_CODES.RATE_LIMIT]: 'Muitas tentativas. Aguarde um momento.',
  
  [ERROR_CODES.DATA_NOT_FOUND]: 'Dados não encontrados.',
  [ERROR_CODES.INVALID_DATA]: 'Dados corrompidos ou inválidos.',
  [ERROR_CODES.OUTDATED_DATA]: 'Dados desatualizados. Recarregue a página.',
  
  [ERROR_CODES.FILE_TOO_LARGE]: 'Arquivo muito grande. Máximo 5MB.',
  [ERROR_CODES.INVALID_FILE_TYPE]: 'Tipo de arquivo não permitido.',
  [ERROR_CODES.UPLOAD_FAILED]: 'Falha no upload. Tente novamente.'
} as const;

// ============================================
// HANDLER DE ERRO PRINCIPAL
// ============================================

export class ErrorHandler {
  private static errorLog: AppError[] = [];
  private static maxLogSize = 100;

  /**
   * Processa qualquer tipo de erro
   */
  static handle(error: unknown, context?: string): AppError {
    const appError = this.parseError(error, context);
    this.logError(appError, context);
    return appError;
  }

  /**
   * Converte erro para formato padrão
   */
  private static parseError(error: unknown, context?: string): AppError {
    const timestamp = Date.now();

    // Erro já é do tipo AppError
    if (this.isAppError(error)) {
      return error;
    }

    // Erro de API/Fetch
    if (error instanceof Response) {
      return this.handleApiError(error, timestamp);
    }

    // Erro de validação
    if (this.isValidationError(error)) {
      return this.handleValidationError(error, timestamp);
    }

    // Erro de rede
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        code: ERROR_CODES.NETWORK_ERROR,
        message: error.message,
        userMessage: ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR],
        timestamp,
        details: { context }
      };
    }

    // Erro padrão do JavaScript
    if (error instanceof Error) {
      return {
        code: ERROR_CODES.UNKNOWN_ERROR,
        message: error.message,
        userMessage: ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
        timestamp,
        details: { 
          stack: error.stack,
          context,
          name: error.name
        }
      };
    }

    // Erro desconhecido
    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: String(error),
      userMessage: ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
      timestamp,
      details: { context, original: error }
    };
  }

  /**
   * Trata erros de API
   */
  private static handleApiError(response: Response, timestamp: number): AppError {
    const status = response.status;
    
    let code: keyof typeof ERROR_CODES;
    
    switch (status) {
      case 401:
        code = 'UNAUTHORIZED';
        break;
      case 403:
        code = 'FORBIDDEN';
        break;
      case 404:
        code = 'NOT_FOUND';
        break;
      case 422:
        code = 'VALIDATION_ERROR';
        break;
      case 429:
        code = 'RATE_LIMIT';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        code = 'SERVER_ERROR';
        break;
      default:
        code = 'API_ERROR';
    }

    return {
      code: ERROR_CODES[code],
      message: `API Error ${status}: ${response.statusText}`,
      userMessage: ERROR_MESSAGES[ERROR_CODES[code]],
      timestamp,
      details: { status, url: response.url }
    };
  }

  /**
   * Trata erros de validação
   */
  private static handleValidationError(error: any, timestamp: number): AppError {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Validation failed',
      userMessage: ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR],
      timestamp,
      details: { validationErrors: error.errors || error.details }
    };
  }

  /**
   * Verifica se é AppError
   */
  private static isAppError(error: unknown): error is AppError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      'userMessage' in error &&
      'timestamp' in error
    );
  }

  /**
   * Verifica se é erro de validação
   */
  private static isValidationError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      ('errors' in error || 'validationErrors' in error)
    );
  }

  /**
   * Log do erro
   */
  private static logError(error: AppError, context?: string) {
    // Add to internal log
    this.errorLog.unshift(error);
    
    // Manter apenas os últimos erros
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Console log baseado no nível
    const level = this.getErrorLevel(error.code);
    
    if (level === 'critical' || level === 'error') {
      console.error('❌ Error:', error, context);
    } else if (level === 'warning') {
      console.warn('⚠️ Warning:', error, context);
    } else {
      console.info('ℹ️ Info:', error, context);
    }

    // Enviar para serviço de monitoramento em produção
    if (import.meta.env.PROD && level === 'critical') {
      this.reportError(error, context);
    }
  }

  /**
   * Determina o nível do erro
   */
  private static getErrorLevel(code: string): ErrorLevel {
    const criticalErrors = [
      ERROR_CODES.SERVER_ERROR,
      ERROR_CODES.UNKNOWN_ERROR
    ];
    
    const errorCodes = [
      ERROR_CODES.API_ERROR,
      ERROR_CODES.NETWORK_ERROR,
      ERROR_CODES.TIMEOUT_ERROR,
      ERROR_CODES.PERMISSION_DENIED
    ];
    
    const warningCodes = [
      ERROR_CODES.VALIDATION_ERROR,
      ERROR_CODES.NOT_FOUND,
      ERROR_CODES.DUPLICATE_ENTRY,
      ERROR_CODES.RATE_LIMIT
    ];

    if (criticalErrors.includes(code as any)) return 'critical';
    if (errorCodes.includes(code as any)) return 'error';
    if (warningCodes.includes(code as any)) return 'warning';
    
    return 'info';
  }

  /**
   * Envia erro para serviço de monitoramento
   */
  private static reportError(error: AppError, context?: string) {
    // Implementar integração com Sentry, LogRocket, etc.
    try {
      fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error, context, timestamp: Date.now() })
      }).catch(() => {
        // Falha silenciosa no report
      });
    } catch {
      // Falha silenciosa
    }
  }

  /**
   * Retorna histórico de erros
   */
  static getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  /**
   * Limpa histórico
   */
  static clearErrorLog() {
    this.errorLog = [];
  }
}

// ============================================
// HELPERS ESPECÍFICOS
// ============================================

/**
 * Trata erros de fetch
 */
export const handleFetchError = (error: unknown, url?: string): AppError => {
  return ErrorHandler.handle(error, `Fetch: ${url}`);
};

/**
 * Trata erros de validação de formulário
 */
export const handleFormError = (error: unknown, formName?: string): AppError => {
  return ErrorHandler.handle(error, `Form: ${formName}`);
};

/**
 * Trata erros de upload
 */
export const handleUploadError = (error: unknown, fileName?: string): AppError => {
  return ErrorHandler.handle(error, `Upload: ${fileName}`);
};

/**
 * Cria erro customizado
 */
export const createError = (
  code: keyof typeof ERROR_CODES,
  customMessage?: string,
  details?: any
): AppError => {
  return {
    code: ERROR_CODES[code],
    message: customMessage || ERROR_MESSAGES[ERROR_CODES[code]],
    userMessage: customMessage || ERROR_MESSAGES[ERROR_CODES[code]],
    timestamp: Date.now(),
    details
  };
};

/**
 * Verifica se erro é recuperável
 */
export const isRecoverableError = (error: AppError): boolean => {
  const recoverableCodes = [
    ERROR_CODES.NETWORK_ERROR,
    ERROR_CODES.TIMEOUT_ERROR,
    ERROR_CODES.RATE_LIMIT,
    ERROR_CODES.SERVER_ERROR
  ];
  
  return recoverableCodes.includes(error.code as any);
};

/**
 * Verifica se erro requer reautenticação
 */
export const requiresReauth = (error: AppError): boolean => {
  return error.code === ERROR_CODES.UNAUTHORIZED;
};

/**
 * Formata erro para exibição
 */
export const formatErrorForDisplay = (error: AppError): string => {
  return error.userMessage || error.message;
};

/**
 * Extrai mensagens de validação
 */
export const extractValidationMessages = (error: AppError): Record<string, string> => {
  const messages: Record<string, string> = {};
  
  if (error.details?.validationErrors) {
    error.details.validationErrors.forEach((validation: ValidationError) => {
      messages[validation.field] = validation.message;
    });
  }
  
  return messages;
};

export default ErrorHandler; 
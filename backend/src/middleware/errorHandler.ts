import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/express';

/**
 * Error Handler Global
 * Captura e padroniza todos os erros da aplicação
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log do erro para monitoramento
  console.error('🚨 Erro capturado:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.user?.email || 'Não autenticado',
    timestamp: new Date().toISOString(),
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Resposta padrão de erro
  const response: ApiResponse = {
    success: false,
    timestamp: new Date().toISOString()
  };

  // Determinar status code e mensagem baseado no tipo de erro
  let statusCode = 500;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    response.error = 'Dados inválidos';
    response.message = err.message;
  } else if (err.name === 'UnauthorizedError' || err.message.includes('token')) {
    statusCode = 401;
    response.error = 'Não autorizado';
    response.message = 'Token de acesso inválido ou expirado';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    response.error = 'Acesso negado';
    response.message = 'Você não tem permissão para acessar este recurso';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    response.error = 'Recurso não encontrado';
    response.message = err.message || 'O recurso solicitado não foi encontrado';
  } else if (err.name === 'ConflictError') {
    statusCode = 409;
    response.error = 'Conflito';
    response.message = err.message || 'Recurso já existe';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    response.error = 'Arquivo muito grande';
    response.message = 'O arquivo enviado excede o limite permitido';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    response.error = 'JSON inválido';
    response.message = 'Formato JSON malformado';
  } else if (err.message === 'Não permitido pelo CORS') {
    statusCode = 403;
    response.error = 'CORS bloqueado';
    response.message = 'Origem não permitida pela política CORS';
  } else if (err.code === 'EBADCSRFTOKEN') {
    statusCode = 403;
    response.error = 'Token CSRF inválido';
    response.message = 'Token de segurança inválido';
  } else {
    // Erro genérico
    response.error = 'Erro interno do servidor';
    response.message = process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Erro interno. Tente novamente mais tarde.';
  }

  // Adicionar detalhes extras em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    (response as any).debug = {
      stack: err.stack,
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method
    };
  }

  // Responder com erro
  res.status(statusCode).json(response);
}

/**
 * Wrapper para async functions
 * Evita try/catch repetitivo em rotas async
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Criar erro customizado
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erros específicos
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Não autorizado') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acesso negado') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso não encontrado') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Recurso já existe') {
    super(message, 409);
    this.name = 'ConflictError';
  }
} 
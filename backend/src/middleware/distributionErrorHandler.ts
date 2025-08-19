import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de Error Handling para APIs de Distribuição
 * ✅ Implementa padrão Express.js 4-parameter error handler
 * ✅ Baseado em documentação oficial Express.js Context7
 */

// AIDEV-NOTE: Middleware com signature (err, req, res, next) para capturar erros
export function distributionErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // ✅ LOGGING ESTRUTURADO: Informações detalhadas para debugging
  console.error('❌ [DISTRIBUTION-ERROR]:', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
    correlationId: generateCorrelationId()
  });

  // ✅ TIPOS ESPECÍFICOS DE ERRO: Handling baseado em Context7 Express.js docs
  
  // Erro de autenticação/autorização
  if (err.message.includes('Tenant ID não encontrado') || 
      err.message.includes('não autenticado') ||
      err.message.includes('tenant inválido')) {
    return res.status(401).json({
      success: false,
      error: 'Usuário não autenticado ou tenant inválido',
      code: 'AUTH_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Erro de acesso negado
  if (err.message.includes('Acesso negado') || 
      err.message.includes('não autorizado')) {
    return res.status(403).json({
      success: false,
      error: 'Acesso negado para este recurso',
      code: 'ACCESS_DENIED',
      timestamp: new Date().toISOString()
    });
  }

  // Erro de validação de dados
  if (err.message.includes('Validation failed') || 
      err.message.includes('Invalid data') ||
      err.message.includes('campos obrigatórios')) {
    return res.status(400).json({
      success: false,
      error: 'Dados de entrada inválidos',
      details: err.message,
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Erro de recurso não encontrado
  if (err.message.includes('não encontrado') || 
      err.message.includes('not found')) {
    return res.status(404).json({
      success: false,
      error: 'Recurso não encontrado',
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString()
    });
  }

  // Erro de database/Supabase
  if (err.message.includes('supabase') || 
      err.message.includes('database') ||
      err.message.includes('PGRST')) {
    return res.status(503).json({
      success: false,
      error: 'Serviço temporariamente indisponível',
      code: 'SERVICE_UNAVAILABLE',
      timestamp: new Date().toISOString()
    });
  }

  // ✅ ERROR HANDLING PADRÃO: Para erros não mapeados
  console.error('🔥 [DISTRIBUTION-ERROR] Erro não mapeado:', {
    message: err.message,
    name: err.name,
    stack: err.stack
  });

  // Status 500 para erros internos não específicos
  return res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    // ✅ DEBUGGING INFO: Apenas em desenvolvimento
    ...(process.env.NODE_ENV === 'development' && {
      debug: {
        message: err.message,
        stack: err.stack
      }
    })
  });
}

/**
 * ✅ ASYNC ERROR WRAPPER: Para capturar erros de funções async
 * Baseado em padrões Express.js Context7 documentation
 */
export function asyncErrorHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // ✅ CAPTURA AUTOMÁTICA: Erros async são automaticamente passados para next()
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * ✅ CORRELATION ID: Para tracking de requests
 */
function generateCorrelationId(): string {
  return `dist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * ✅ VALIDATION ERROR HANDLER: Para erros específicos de validação Zod
 */
export function validationErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Se é erro de validação Zod
  if (err.name === 'ZodError') {
    const validationErrors = err.errors.map((error: any) => ({
      field: error.path.join('.'),
      message: error.message,
      received: error.received
    }));

    return res.status(400).json({
      success: false,
      error: 'Erro de validação',
      code: 'VALIDATION_ERROR',
      details: validationErrors,
      timestamp: new Date().toISOString()
    });
  }

  // Se não é erro de validação, passa para o próximo handler
  next(err);
}

/**
 * ✅ MIDDLEWARE STACK COMPLETO: Para ser usado nas rotas
 */
export const distributionMiddlewares = {
  // Error handlers (devem ser os últimos na stack)
  validationError: validationErrorHandler,
  distributionError: distributionErrorHandler,
  
  // Async wrapper para routes
  asyncHandler: asyncErrorHandler
};
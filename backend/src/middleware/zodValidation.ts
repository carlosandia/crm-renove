/**
 * ============================================
 * 🛡️ ZOD VALIDATION MIDDLEWARE
 * ============================================
 * 
 * Middleware para validação usando Zod schemas
 * AIDEV-NOTE: Preferir sobre validation.ts para consistência com frontend
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export interface ZodValidationSchema {
  body?: ZodSchema<any>;
  params?: ZodSchema<any>;
  query?: ZodSchema<any>;
}

/**
 * Middleware de validação Zod
 */
export function validateRequest(schema: ZodValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    try {
      // ✅ Validar body
      if (schema.body) {
        const result = schema.body.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({
            message: 'Dados do corpo da requisição inválidos',
            errors: formatZodErrors(result.error)
          });
        }
        req.body = result.data; // Usar dados validados e transformados
      }

      // ✅ Validar params
      if (schema.params) {
        const result = schema.params.safeParse(req.params);
        if (!result.success) {
          return res.status(400).json({
            message: 'Parâmetros da URL inválidos',
            errors: formatZodErrors(result.error)
          });
        }
        req.params = result.data;
      }

      // ✅ Validar query
      if (schema.query) {
        const result = schema.query.safeParse(req.query);
        if (!result.success) {
          return res.status(400).json({
            message: 'Parâmetros de consulta inválidos',
            errors: formatZodErrors(result.error)
          });
        }
        req.query = result.data;
      }

      next();
    } catch (error) {
      console.error('Erro no middleware de validação Zod:', error);
      res.status(500).json({
        message: 'Erro interno do servidor na validação'
      });
    }
  };
}

/**
 * Formatar erros do Zod para resposta amigável
 */
function formatZodErrors(error: ZodError): Array<{ field: string; message: string }> {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
}
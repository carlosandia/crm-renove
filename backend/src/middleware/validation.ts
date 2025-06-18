import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errorHandler';

// Schemas de validação básicos
export interface ValidationSchema {
  body?: any;
  params?: any;
  query?: any;
}

/**
 * Middleware genérico de validação
 */
export function validateRequest(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validar body
      if (schema.body) {
        const bodyResult = validateData(req.body, schema.body);
        if (!bodyResult.isValid) {
          throw new ValidationError(`Body inválido: ${bodyResult.errors.join(', ')}`);
        }
      }

      // Validar params
      if (schema.params) {
        const paramsResult = validateData(req.params, schema.params);
        if (!paramsResult.isValid) {
          throw new ValidationError(`Parâmetros inválidos: ${paramsResult.errors.join(', ')}`);
        }
      }

      // Validar query
      if (schema.query) {
        const queryResult = validateData(req.query, schema.query);
        if (!queryResult.isValid) {
          throw new ValidationError(`Query inválida: ${queryResult.errors.join(', ')}`);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Função auxiliar para validar dados
 */
function validateData(data: any, rules: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validação básica por agora (pode ser expandida com Joi/Zod depois)
  for (const [field, rule] of Object.entries(rules as any)) {
    const value = data[field];
    
    // Campo obrigatório
    if ((rule as any).required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} é obrigatório`);
      continue;
    }

    // Se campo não é obrigatório e está vazio, pular validações
    if (!value && !(rule as any).required) {
      continue;
    }

    // Validar tipo
    if ((rule as any).type) {
      if (!validateType(value, (rule as any).type)) {
        errors.push(`${field} deve ser do tipo ${(rule as any).type}`);
      }
    }

    // Validar email
    if ((rule as any).email && !validateEmail(value)) {
      errors.push(`${field} deve ser um email válido`);
    }

    // Validar mínimo
    if ((rule as any).min !== undefined) {
      if (typeof value === 'string' && value.length < (rule as any).min) {
        errors.push(`${field} deve ter pelo menos ${(rule as any).min} caracteres`);
      }
      if (typeof value === 'number' && value < (rule as any).min) {
        errors.push(`${field} deve ser maior que ${(rule as any).min}`);
      }
    }

    // Validar máximo
    if ((rule as any).max !== undefined) {
      if (typeof value === 'string' && value.length > (rule as any).max) {
        errors.push(`${field} deve ter no máximo ${(rule as any).max} caracteres`);
      }
      if (typeof value === 'number' && value > (rule as any).max) {
        errors.push(`${field} deve ser menor que ${(rule as any).max}`);
      }
    }

    // Validar UUID
    if ((rule as any).uuid && !validateUUID(value)) {
      errors.push(`${field} deve ser um UUID válido`);
    }

    // Validar enum
    if ((rule as any).enum && !(rule as any).enum.includes(value)) {
      errors.push(`${field} deve ser um dos valores: ${(rule as any).enum.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validadores específicos
 */
function validateType(value: any, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && !Array.isArray(value) && value !== null;
    default:
      return true;
  }
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Esquemas de validação reutilizáveis
 */
export const schemas = {
  // Validação de UUID em parâmetros
  uuidParam: {
    params: {
      id: { required: true, type: 'string', uuid: true }
    }
  },

  // Validação para criação de usuário
  createUser: {
    body: {
      email: { required: true, type: 'string', email: true, max: 255 },
      first_name: { required: true, type: 'string', min: 2, max: 50 },
      last_name: { required: true, type: 'string', min: 2, max: 50 },
      role: { type: 'string', enum: ['super_admin', 'admin', 'member'] },
      tenant_id: { type: 'string', uuid: true }
    }
  },

  // Validação para login
  login: {
    body: {
      email: { required: true, type: 'string', email: true },
      password: { required: true, type: 'string', min: 6 }
    }
  },

  // Validação para refresh token
  refreshToken: {
    body: {
      refresh_token: { required: true, type: 'string' }
    }
  },

  // Validação de UUID simples
  uuid: {
    type: 'string',
    uuid: true
  },

  // Paginação
  pagination: {
    query: {
      page: { type: 'number', min: 1 },
      limit: { type: 'number', min: 1, max: 100 },
      search: { type: 'string', max: 255 }
    }
  }
}; 
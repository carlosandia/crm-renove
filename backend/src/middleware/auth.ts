import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import { JWTPayload, User } from '../types/express';
import { UnauthorizedError, ForbiddenError, asyncHandler } from './errorHandler';

// Configurações JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // 15 minutos
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // 7 dias

/**
 * Gerar tokens JWT (access + refresh)
 */
export function generateTokens(user: User) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenant_id
  };

  const accessToken = jwt.sign(payload, JWT_SECRET);
  const refreshToken = jwt.sign({ userId: user.id, tokenType: 'refresh' }, JWT_REFRESH_SECRET);

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutos em segundos
    tokenType: 'Bearer' as const
  };
}

/**
 * Verificar token JWT
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expirado');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Token inválido');
    } else {
      throw new Error('Erro ao verificar token');
    }
  }
}

/**
 * Verificar refresh token
 */
export function verifyRefreshToken(token: string): { userId: string } {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as any;

    if (payload.tokenType !== 'refresh') {
      throw new Error('Tipo de token inválido');
    }

    return { userId: payload.userId };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expirado');
    } else {
      throw new Error('Refresh token inválido');
    }
  }
}

/**
 * Buscar usuário pelo ID
 */
async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return null;
  }
}

/**
 * Middleware de autenticação principal
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Extrair token do header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Token de acesso requerido',
        message: 'Forneça um token válido no header Authorization'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // 2. Verificar e decodificar token
    let payload: JWTPayload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Token inválido',
        message: error instanceof Error ? error.message : 'Token malformado'
      });
      return;
    }

    // 3. Buscar usuário no banco de dados
    const user = await getUserById(payload.userId);
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não encontrado',
        message: 'O usuário associado ao token não existe ou está inativo'
      });
      return;
    }

    // 4. Verificar se o tenant_id do token confere com o do usuário
    if (user.tenant_id !== payload.tenantId) {
      res.status(401).json({
        success: false,
        error: 'Token inválido',
        message: 'Inconsistência nos dados do token'
      });
      return;
    }

    // 5. Adicionar usuário ao request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
      first_name: user.first_name,
      last_name: user.last_name
    };

    // 6. Continuar para próximo middleware
    next();

  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Erro ao processar autenticação'
    });
  }
}

/**
 * Middleware para verificar se o usuário tem um dos roles especificados
 */
export const requireRole = (allowedRoles: string[]) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Token de acesso inválido');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(`Acesso negado. Roles permitidos: ${allowedRoles.join(', ')}`);
    }

    next();
  });
};

/**
 * Middleware para verificar se o usuário é admin ou dono do recurso
 */
export const requireAdminOrOwner = (getResourceOwnerId: (req: Request) => string) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Token de acesso inválido');
    }

    // Super admins e admins sempre têm acesso
    if (['super_admin', 'admin'].includes(req.user.role)) {
      return next();
    }

    // Para members, verificar se é o dono do recurso
    const resourceOwnerId = getResourceOwnerId(req);
    if (req.user.role === 'member' && req.user.id === resourceOwnerId) {
      return next();
    }

    throw new ForbiddenError('Acesso negado. Você só pode acessar seus próprios recursos');
  });
};

/**
 * Middleware opcional - não falha se não houver token
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Sem token, mas continua sem erro
    next();
    return;
  }

  try {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    const user = await getUserById(payload.userId);
    
    if (user && user.tenant_id === payload.tenantId) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        first_name: user.first_name,
        last_name: user.last_name
      };
    }
  } catch (error) {
    // Ignorar erros em auth opcional
    console.log('Token opcional inválido:', error);
  }

  next();
} 
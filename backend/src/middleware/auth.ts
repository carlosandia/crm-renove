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
 * 🔧 CORREÇÃO: Incluir expiresIn nos tokens para funcionar corretamente
 */
export function generateTokens(user: User) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenant_id
  };

  // 🔧 CORREÇÃO: Incluir expiresIn para ambos os tokens  
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId: user.id, tokenType: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutos em segundos
    tokenType: 'Bearer' as const
  };
}

/**
 * Verificar token JWT
 * 🔧 CORREÇÃO: Validação JWT corrigida
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

    // 🛠️ MODO TESTE: Rejeitar token antigo e aceitar apenas JWT real
    console.log('🔍 [AUTH] Token recebido:', token);
    if (token === 'test-jwt-token-básico') {
      console.log('❌ [AUTH] Token antigo rejeitado - forçando renovação');
      res.status(401).json({
        success: false,
        error: 'Token expirado',
        message: 'Faça login novamente para obter novo token',
        forceLogout: true
      });
      return;
    }

    // 🔧 CORREÇÃO: MODO DEMO com headers case-insensitive melhorados
    if (token.startsWith('demo_')) {
      // Função helper para obter header case-insensitive
      const getHeader = (name: string): string | undefined => {
        const lowerName = name.toLowerCase();
        const headerKeys = Object.keys(req.headers);
        const foundKey = headerKeys.find(key => key.toLowerCase() === lowerName);
        const value = foundKey ? req.headers[foundKey] : undefined;
        return Array.isArray(value) ? value[0] : value;
      };
      
      const userId = getHeader('x-user-id');
      const userRole = getHeader('x-user-role');
      const tenantId = getHeader('x-tenant-id');

      console.log('🔍 [DEMO AUTH] Headers processados (case-insensitive):', {
        allHeaders: Object.keys(req.headers),
        resolvedUserId: userId,
        resolvedUserRole: userRole,
        resolvedTenantId: tenantId,
        tokenPrefix: token.substring(0, 20) + '...'
      });

      if (!userId || !userRole) {
        console.error('❌ [DEMO AUTH] Headers faltando:', {
          userId,
          userRole,
          allHeaders: Object.keys(req.headers)
        });
        res.status(401).json({
          success: false,
          error: 'Headers de usuário requeridos',
          message: 'X-User-ID e X-User-Role são obrigatórios para tokens demo'
        });
        return;
      }

      // Buscar usuário no banco para validar
      console.log('🔍 [DEMO AUTH] Buscando usuário no banco:', {
        userId,
        query: `SELECT * FROM users WHERE id = '${userId}' AND is_active = true`
      });
      
      const user = await getUserById(userId);
      
      console.log('🔍 [DEMO AUTH] Resultado da busca:', {
        userFound: !!user,
        userId: userId,
        userEmail: user?.email || 'N/A',
        userActive: user?.is_active || 'N/A'
      });
      
      if (!user) {
        console.error('❌ [DEMO AUTH] Usuário não encontrado no banco:', {
          userId,
          searchedId: userId,
          userRole,
          tenantId
        });
        res.status(401).json({
          success: false,
          error: 'Usuário não encontrado',
          message: 'O usuário não existe ou está inativo'
        });
        return;
      }

      // Adicionar usuário ao request (modo demo)
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        first_name: user.first_name,
        last_name: user.last_name
      };

      console.log(`🔧 [DEMO AUTH] Usuário autenticado via modo demo: ${user.email}`);
      next();
      return;
    }

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
    // 🛠️ MODO TESTE: Aceitar usuário de teste sem consulta ao banco
    let user;
    if (payload.userId === 'bbaf8441-23c9-44dc-9a4c-a4da787f829c') {
      user = {
        id: 'bbaf8441-23c9-44dc-9a4c-a4da787f829c',
        email: payload.email,
        role: payload.role,
        tenant_id: payload.tenantId,
        first_name: 'seraquevai',
        last_name: '',
        is_active: true
      };
    } else {
      user = await getUserById(payload.userId);
    }
    
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

    // 5. Adicionar usuário e token ao request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
      first_name: user.first_name,
      last_name: user.last_name
    };
    
    // Adicionar token JWT original para usar com client Supabase específico do usuário
    (req as any).jwtToken = token;

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

// Export alias para compatibilidade com código existente
export { authMiddleware as authenticateToken };
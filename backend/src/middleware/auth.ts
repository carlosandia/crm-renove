import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { User } from '../types/express';
import { UnauthorizedError, ForbiddenError, asyncHandler } from './errorHandler';

// AIDEV-NOTE: Autenticação básica Supabase - padrão oficial CLAUDE.md
// Simplificado sem fallbacks complexos ou parsing JWT manual

/**
 * Middleware de autenticação básica usando Supabase
 * Seguindo padrão oficial CLAUDE.md - sem complexidade JWT manual
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log('🔐 [AUTH] Autenticação básica Supabase iniciada');
    
    // Extrair token Authorization do header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [AUTH] Token Authorization não encontrado');
      res.status(401).json({
        success: false,
        error: 'Token de acesso requerido'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer "
    
    // ✅ AUTENTICAÇÃO BÁSICA SUPABASE: Validar token diretamente
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ [AUTH] Usuário inválido:', userError?.message || 'Token inválido');
      res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado'
      });
      return;
    }

    // ✅ EXTRAIR METADADOS DIRETAMENTE - sem fallbacks complexos
    const tenantId = user.user_metadata?.tenant_id;
    const userRole = user.user_metadata?.role;

    // ✅ VALIDAÇÃO SIMPLES: Falhar rapidamente se metadados incompletos
    if (!tenantId || !userRole) {
      console.error('❌ [AUTH] Metadados obrigatórios ausentes:', {
        hasTenantId: !!tenantId,
        hasRole: !!userRole,
        userId: user.id.substring(0, 8)
      });
      res.status(401).json({
        success: false,
        error: 'Metadados de usuário incompletos - contate o administrador'
      });
      return;
    }

    // ✅ CONFIGURAR req.user com dados básicos do Supabase
    req.user = {
      id: user.id,
      email: user.email || 'email@unknown.com',
      role: userRole,
      tenant_id: tenantId,
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || ''
    };

    // Adicionar cliente Supabase para queries
    (req as any).userSupabase = supabase;

    console.log('✅ [AUTH] Autenticação básica bem-sucedida:', {
      userId: req.user.id.substring(0, 8),
      email: req.user.email,
      role: req.user.role,
      tenant_id: req.user.tenant_id.substring(0, 8)
    });

    next();

  } catch (error) {
    console.error('❌ [AUTH] Erro na autenticação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
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
 * Usa autenticação básica Supabase quando token está presente
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log('🔓 [OPTIONAL-AUTH] Verificando autenticação opcional');
    
    // Extrair token Authorization do header (se existir)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('ℹ️ [OPTIONAL-AUTH] Sem token - prosseguindo sem autenticação');
      req.user = null;
      (req as any).userSupabase = supabase;
      return next();
    }

    const token = authHeader.substring(7); // Remove "Bearer "
    
    // ✅ AUTENTICAÇÃO BÁSICA SUPABASE: Validar token se fornecido
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.log('⚠️ [OPTIONAL-AUTH] Token inválido - prosseguindo sem autenticação');
      req.user = null;
      (req as any).userSupabase = supabase;
      return next();
    }

    // ✅ EXTRAIR METADADOS BÁSICOS - falhar silenciosamente se incompletos
    const tenantId = user.user_metadata?.tenant_id;
    const userRole = user.user_metadata?.role;

    if (!tenantId || !userRole) {
      console.log('⚠️ [OPTIONAL-AUTH] Metadados incompletos - prosseguindo sem autenticação');
      req.user = null;
      (req as any).userSupabase = supabase;
      return next();
    }

    // ✅ CONFIGURAR req.user com dados básicos do Supabase
    req.user = {
      id: user.id,
      email: user.email || 'email@unknown.com',
      role: userRole,
      tenant_id: tenantId,
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || ''
    };

    (req as any).userSupabase = supabase;

    console.log('✅ [OPTIONAL-AUTH] Autenticação opcional bem-sucedida:', {
      userId: req.user.id.substring(0, 8),
      role: req.user.role,
      tenant_id: req.user.tenant_id.substring(0, 8)
    });

    next();

  } catch (error) {
    console.error('❌ [OPTIONAL-AUTH] Erro - prosseguindo sem autenticação:', error);
    req.user = null;
    (req as any).userSupabase = supabase;
    next();
  }
}

// Export alias para compatibilidade com código existente
export { authMiddleware as authenticateToken };
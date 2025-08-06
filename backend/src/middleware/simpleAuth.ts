import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

// AIDEV-NOTE: Autenticação simplificada usando token Supabase diretamente
// Elimina complexidade JWT manual e usa session do Supabase

// Usar interface existente do sistema

/**
 * Middleware de autenticação simples usando Supabase token diretamente
 * Compatível com frontend que envia session.access_token
 */
export async function simpleAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log('🔐 [SIMPLE-AUTH] Verificando autenticação Supabase...');
    
    // Extrair token do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [SIMPLE-AUTH] Token não encontrado');
      res.status(401).json({
        success: false,
        error: 'Token de acesso requerido'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer "
    
    // ✅ AUTENTICAÇÃO DIRETA SUPABASE: Verificar token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ [SIMPLE-AUTH] Token inválido:', userError?.message);
      res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado'
      });
      return;
    }

    // ✅ EXTRAIR DADOS BÁSICOS do usuário Supabase - preservar role real
    req.user = {
      id: user.id,
      email: user.email || 'unknown@email.com',
      tenant_id: user.user_metadata?.tenant_id || '',
      role: user.user_metadata?.role || 'member', // ✅ Preserva role real (admin, member, etc.)
      first_name: user.user_metadata?.first_name,
      last_name: user.user_metadata?.last_name
    };

    console.log('✅ [SIMPLE-AUTH] Autenticação bem-sucedida:', {
      userId: req.user.id.substring(0, 8),
      email: req.user.email,
      role: req.user.role, // ✅ Mostrar role real (admin/member podem configurar email)
      tenant_id: req.user.tenant_id?.substring(0, 8) || 'N/A'
    });

    next();

  } catch (error) {
    console.error('❌ [SIMPLE-AUTH] Erro interno:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}

/**
 * Middleware opcional - não falha se não houver token
 * Para rotas que podem funcionar com ou sem autenticação
 */
export async function optionalSimpleAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('ℹ️ [OPTIONAL-AUTH] Sem token - prosseguindo sem autenticação');
      req.user = undefined;
      return next();
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.log('⚠️ [OPTIONAL-AUTH] Token inválido - prosseguindo sem autenticação');
      req.user = undefined;
      return next();
    }

    // Configurar usuário se token válido - preservar role real
    req.user = {
      id: user.id,
      email: user.email || 'unknown@email.com',
      tenant_id: user.user_metadata?.tenant_id || '',
      role: user.user_metadata?.role || 'member', // ✅ Preserva role real (admin, member, etc.)
      first_name: user.user_metadata?.first_name,
      last_name: user.user_metadata?.last_name
    };

    console.log('✅ [OPTIONAL-AUTH] Autenticação opcional bem-sucedida:', {
      role: req.user.role,
      email: req.user.email
    });
    next();

  } catch (error) {
    console.error('❌ [OPTIONAL-AUTH] Erro - prosseguindo sem autenticação:', error);
    req.user = undefined;
    next();
  }
}

// Export para compatibilidade com código existente
export { simpleAuth as authenticateToken };
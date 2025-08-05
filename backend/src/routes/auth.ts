import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authMiddleware } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateRequest, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { User } from '../types/express';

const router = Router();

// AIDEV-NOTE: Função de verificação de senha removida
// O sistema agora usa 100% Supabase Auth no frontend

// AIDEV-NOTE: Função getUserByEmail removida
// Não é mais necessária com Supabase Auth nativo

/**
 * Rota de login simplificada - apenas para compatibilidade
 * O login real deve ser feito via Supabase Auth no frontend
 */
router.post('/login', async (req: Request, res: Response) => {
  res.status(400).json({
    success: false,
    error: 'Endpoint descontinuado',
    message: 'Use Supabase Auth no frontend com supabase.auth.signInWithPassword()',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /regenerate-token
 * DESATIVADO - Endpoint descontinuado 
 * Use Supabase Auth no frontend
 */
router.post('/regenerate-token', async (req, res) => {
  res.status(410).json({
    success: false,
    error: 'Endpoint descontinuado',
    message: 'Use Supabase Auth no frontend com supabase.auth.signInWithPassword()',
    migration: 'Sistema migrado para 100% Supabase Auth nativo',
    timestamp: new Date().toISOString()
  });
});

/**
 * Rota para refresh token
 * DESATIVADO - Supabase Auth gerencia tokens automaticamente
 */
router.post('/refresh', 
  asyncHandler(async (req: Request, res: Response) => {
    res.status(410).json({
      success: false,
      error: 'Endpoint descontinuado',
      message: 'Supabase Auth gerencia refresh de tokens automaticamente',
      migration: 'Use supabase.auth.refreshSession() no frontend se necessário',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * 🔧 CORREÇÃO: Endpoint de validação de token (health check)
 */
router.post('/validate',
  authMiddleware, // Usar o middleware de auth para validar token
  asyncHandler(async (req: Request, res: Response) => {
    // Se chegou aqui, o token foi validado com sucesso pelo middleware
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Token inválido',
        message: 'Usuário não encontrado no token'
      });
      return;
    }

    // Retornar informações básicas de validação
    res.json({
      success: true,
      message: 'Token válido',
      data: {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenant_id: user.tenant_id
        },
        validatedAt: new Date().toISOString()
      }
    });
  })
);

/**
 * Rota de logout
 */
router.post('/logout', 
  asyncHandler(async (req: Request, res: Response) => {
    // Sistema de blacklist de tokens pode ser implementado para segurança adicional
    // Por enquanto, apenas confirmação
    
    res.json({
      success: true,
      message: 'Logout realizado com sucesso',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * Rota para verificar se token é válido
 */
router.post('/verify', 
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Token requerido'
      });
      return;
    }

    try {
      // Usar o middleware de auth para validar
      const authHeader = `Bearer ${token}`;
      req.headers.authorization = authHeader;

      // Simular middleware de auth
      const { authMiddleware } = await import('../middleware/auth');
      
      authMiddleware(req, res, () => {
        if (req.user) {
          res.json({
            success: true,
            message: 'Token válido',
            data: {
              user: req.user
            }
          });
        } else {
          res.status(401).json({
            success: false,
            error: 'Token inválido'
          });
        }
      });

    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Token inválido',
        message: error instanceof Error ? error.message : 'Token malformado'
      });
    }
  })
);

/**
 * Rota de registro (apenas para admins criarem usuários)
 */
router.post('/register', 
  authRateLimiter,
  validateRequest(schemas.createUser),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, first_name, last_name, role = 'member', tenant_id } = req.body;

    // 1. Verificar se usuário já existe usando Supabase
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'Usuário já existe',
        message: 'Este email já está cadastrado no sistema'
      });
      return;
    }

    // 2. Criar usuário na tabela
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        email,
        first_name,
        last_name,
        role,
        tenant_id,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao criar usuário',
        message: 'Erro interno do servidor'
      });
      return;
    }

    // 3. Log de criação
    console.log(`✅ Usuário criado: ${email} (${role}) em ${new Date().toISOString()}`);

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          role: newUser.role,
          tenant_id: newUser.tenant_id
        }
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * Rota para obter informações do usuário atual
 */
router.get('/me', 
  asyncHandler(async (req: Request, res: Response) => {
    // Esta rota será protegida pelo authMiddleware no index.ts
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: req.user
      },
      timestamp: new Date().toISOString()
    });
  })
);



export default router; 
import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { generateTokens, verifyRefreshToken } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateRequest, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { User } from '../types/express';

const router = Router();

/**
 * Verificar senha (implementação básica - pode usar bcrypt futuramente)
 */
function verifyPassword(inputPassword: string, storedPassword: string): boolean {
  // Por enquanto, senhas padrão para desenvolvimento
  const defaultPasswords = ['123456', '123', 'SuperAdmin123!'];
  
  if (defaultPasswords.includes(inputPassword)) {
    return true;
  }
  
  // TODO: Implementar bcrypt para senhas hash
  return inputPassword === storedPassword;
}

/**
 * Buscar usuário por email
 */
async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
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
 * Rota de login com JWT
 */
router.post('/login', 
  authRateLimiter, // Rate limiting mais restritivo para login
  validateRequest(schemas.login),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // 1. Buscar usuário no banco
    const user = await getUserByEmail(email);
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Credenciais inválidas',
        message: 'Email ou senha incorretos'
      });
      return;
    }

    // 2. Verificar senha
    const isPasswordValid = verifyPassword(password, ''); // Senha vazia = usar padrões
    
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Credenciais inválidas',
        message: 'Email ou senha incorretos'
      });
      return;
    }

    // 3. Gerar tokens JWT
    const tokens = generateTokens(user);

    // 4. Log de segurança
    console.log(`✅ Login bem-sucedido: ${email} (${user.role}) em ${new Date().toISOString()}`);

    // 5. Resposta com tokens
    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          tenant_id: user.tenant_id
        },
        tokens: tokens
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * Rota para refresh token
 */
router.post('/refresh', 
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token requerido',
        message: 'Forneça um refresh token válido'
      });
      return;
    }

    try {
      // 1. Verificar refresh token
      const { userId } = verifyRefreshToken(refreshToken);

      // 2. Buscar usuário atualizado
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (error || !userData) {
        res.status(401).json({
          success: false,
          error: 'Usuário não encontrado',
          message: 'O usuário associado ao refresh token não existe ou está inativo'
        });
        return;
      }

      // 3. Gerar novos tokens
      const tokens = generateTokens(userData as User);

      res.json({
        success: true,
        message: 'Tokens renovados com sucesso',
        data: {
          tokens: tokens
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Refresh token inválido',
        message: error instanceof Error ? error.message : 'Token malformado'
      });
    }
  })
);

/**
 * Rota de logout
 */
router.post('/logout', 
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Implementar blacklist de tokens para logout real
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

    // 1. Verificar se usuário já existe
    const existingUser = await getUserByEmail(email);
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
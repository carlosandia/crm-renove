import { Router, Request, Response } from 'express';
import { supabase } from '../index';

const router = Router();

// Rota de login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email e senha são obrigatórios'
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        details: error.message
      });
    }

    // Buscar dados do usuário na tabela única
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      message: 'Login realizado com sucesso',
      user: data.user,
      session: data.session,
      userData: userData, // ✅ Dados da tabela única com role e tenant_id
      redirect: '/app' // ✅ Redirecionamento único para /app
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota de registro seguindo boas práticas
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role = 'user', tenant_id } = req.body;

    if (!email || !password || !name || !tenant_id) {
      return res.status(400).json({
        error: 'Email, senha, nome e tenant_id são obrigatórios'
      });
    }

    // Validar role
    if (!['admin', 'manager', 'user'].includes(role)) {
      return res.status(400).json({
        error: 'Role deve ser: admin, manager ou user'
      });
    }

    // Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
          tenant_id
        }
      }
    });

    if (authError) {
      return res.status(400).json({
        error: 'Erro ao criar usuário',
        details: authError.message
      });
    }

    // Criar registro na tabela única de usuários
    if (authData.user) {
      const { error: dbError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email,
          name,
          role,
          tenant_id,
          is_active: true
        }]);

      if (dbError) {
        console.error('Erro ao inserir usuário na tabela:', dbError);
      }
    }

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: authData.user,
      redirect: '/app' // ✅ Redirecionamento único para /app
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota de logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({
        error: 'Erro ao fazer logout',
        details: error.message
      });
    }

    res.json({
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router; 
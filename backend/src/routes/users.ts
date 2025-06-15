import { Router, Request, Response } from 'express';
import { supabase } from '../index';

const router = Router();

// Listar usuários com filtros
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role, tenant_id } = req.query;

    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    // Aplicar filtros se fornecidos
    if (role && ['super_admin', 'admin', 'member'].includes(role as string)) {
      query = query.eq('role', role);
    }

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        error: 'Erro ao buscar usuários',
        details: error.message
      });
    }

    res.json({
      message: 'Usuários encontrados com sucesso',
      users: data || [],
      total: data?.length || 0
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Buscar usuário por ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        details: error.message
      });
    }

    res.json({
      message: 'Usuário encontrado com sucesso',
      user: data
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Criar novo usuário
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, first_name, last_name, role = 'member', tenant_id, avatar_url } = req.body;

    if (!email || !first_name || !tenant_id) {
      return res.status(400).json({
        error: 'Email, primeiro nome e tenant_id são obrigatórios'
      });
    }

    // Validar role
    if (!['super_admin', 'admin', 'member'].includes(role)) {
      return res.status(400).json({
        error: 'Role deve ser: super_admin, admin ou member'
      });
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{
        email,
        first_name,
        last_name,
        role,
        tenant_id,
        avatar_url,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: 'Erro ao criar usuário',
        details: error.message
      });
    }

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: data
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Atualizar role do usuário
router.patch('/:id/role', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['super_admin', 'admin', 'member'].includes(role)) {
      return res.status(400).json({
        error: 'Role deve ser: super_admin, admin ou member'
      });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: 'Erro ao atualizar role do usuário',
        details: error.message
      });
    }

    res.json({
      message: 'Role do usuário atualizada com sucesso',
      user: data
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Atualizar usuário
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: 'Erro ao atualizar usuário',
        details: error.message
      });
    }

    res.json({
      message: 'Usuário atualizado com sucesso',
      user: data
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Deletar usuário
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({
        error: 'Erro ao deletar usuário',
        details: error.message
      });
    }

    res.json({
      message: 'Usuário deletado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router; 
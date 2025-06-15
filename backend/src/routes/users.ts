import { Router, Request, Response } from 'express';
import { supabase } from '../index';

const router = Router();

// Listar todos os usuários
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        error: 'Erro ao buscar usuários',
        details: error.message
      });
    }

    res.json({
      users: data,
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
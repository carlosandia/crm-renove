import { Router, Request, Response } from 'express';
import { supabase } from '../index';

const router = Router();

// Listar todos os clientes
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        error: 'Erro ao buscar clientes',
        details: error.message
      });
    }

    res.json({
      customers: data,
      total: data?.length || 0
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Buscar cliente por ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        error: 'Cliente não encontrado',
        details: error.message
      });
    }

    res.json({
      customer: data
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Criar novo cliente
router.post('/', async (req: Request, res: Response) => {
  try {
    const customerData = req.body;

    const { data, error } = await supabase
      .from('customers')
      .insert([customerData])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: 'Erro ao criar cliente',
        details: error.message
      });
    }

    res.status(201).json({
      message: 'Cliente criado com sucesso',
      customer: data
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Atualizar cliente
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: 'Erro ao atualizar cliente',
        details: error.message
      });
    }

    res.json({
      message: 'Cliente atualizado com sucesso',
      customer: data
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Deletar cliente
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({
        error: 'Erro ao deletar cliente',
        details: error.message
      });
    }

    res.json({
      message: 'Cliente deletado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router; 
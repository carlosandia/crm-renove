import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET /api/customers
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenant_id } = req.query;

    let query = supabase
      .from('companies')
      .select('*');

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: customers, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return res.json({ customers });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao buscar clientes',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// POST /api/customers
router.post('/', async (req: Request, res: Response) => {
  try {
    const customerData = req.body;
    
    const { data: customer, error } = await supabase
      .from('companies')
      .insert([customerData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({
      message: 'Cliente criado com sucesso',
      customer 
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao criar cliente',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customerData = req.body;
    
    const { data: customer, error } = await supabase
      .from('companies')
      .update(customerData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.json({
      message: 'Cliente atualizado com sucesso',
      customer 
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao atualizar cliente',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return res.json({
      message: 'Cliente removido com sucesso'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao remover cliente',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router; 
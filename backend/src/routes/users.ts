
import express from 'express';
import { supabase } from '../index';

const router = express.Router();

// Listar usuários
router.get('/', async (req, res) => {
  try {
    const { role, tenant_id } = req.query;
    
    let query = supabase.from('users').select('*');
    
    if (role) {
      query = query.eq('role', role);
    }
    
    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: users, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      throw error;
    }

    res.json({
      users: users || []
    });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({
      message: 'Erro ao buscar usuários',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Alterar status do usuário
router.patch('/:userId/toggle-status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;

    console.log('Alterando status do usuário:', { userId, is_active });

    const { data: user, error } = await supabase
      .from('users')
      .update({ is_active })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao alterar status:', error);
      throw error;
    }

    console.log('Status alterado com sucesso:', user);

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    res.status(500).json({
      message: 'Erro ao alterar status',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;

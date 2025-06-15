import express from 'express';
import { supabase } from '../index';

const router = express.Router();

// GET /api/vendedores - Listar vendedores por tenant
router.get('/', async (req, res) => {
  try {
    const { tenant_id } = req.query;

    if (!tenant_id) {
      return res.status(400).json({ message: 'tenant_id é obrigatório' });
    }

    console.log('🔍 Buscando vendedores para tenant:', tenant_id);

    const { data: vendedores, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, is_active, created_at')
      .eq('tenant_id', tenant_id)
      .eq('role', 'member')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar vendedores:', error);
      return res.status(500).json({ message: 'Erro ao buscar vendedores', error: error.message });
    }

    console.log(`✅ Encontrados ${vendedores?.length || 0} vendedores`);

    res.json({
      success: true,
      vendedores: vendedores || []
    });

  } catch (error) {
    console.error('💥 Erro no endpoint de vendedores:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// POST /api/vendedores - Criar novo vendedor
router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, email, password, tenant_id } = req.body;

    if (!first_name || !email || !password || !tenant_id) {
      return res.status(400).json({ 
        message: 'Campos obrigatórios: first_name, email, password, tenant_id' 
      });
    }

    console.log('👤 Criando vendedor:', { first_name, last_name, email, tenant_id });

    // Verificar se email já existe no tenant
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('tenant_id', tenant_id)
      .single();

    if (existingUser) {
      return res.status(400).json({ message: 'Email já cadastrado nesta empresa' });
    }

    // Criar vendedor (senha será gerenciada pelo sistema de autenticação)
    const { data: newVendedor, error } = await supabase
      .from('users')
      .insert([{
        first_name,
        last_name: last_name || '',
        email,
        role: 'member',
        tenant_id,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar vendedor:', error);
      return res.status(500).json({ message: 'Erro ao criar vendedor', error: error.message });
    }

    console.log('✅ Vendedor criado com sucesso:', newVendedor.id);

    res.status(201).json({
      success: true,
      message: 'Vendedor criado com sucesso',
      vendedor: {
        id: newVendedor.id,
        first_name: newVendedor.first_name,
        last_name: newVendedor.last_name,
        email: newVendedor.email,
        is_active: newVendedor.is_active,
        created_at: newVendedor.created_at
      }
    });

  } catch (error) {
    console.error('💥 Erro ao criar vendedor:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// PUT /api/vendedores/:id - Atualizar vendedor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, password } = req.body;

    if (!first_name || !email) {
      return res.status(400).json({ 
        message: 'Campos obrigatórios: first_name, email' 
      });
    }

    console.log('✏️ Atualizando vendedor:', id);

    const updateData: any = {
      first_name,
      last_name: last_name || '',
      email
    };

    // Senha será gerenciada pelo sistema de autenticação simplificado
    // Por enquanto, ignoramos a atualização de senha

    const { data: updatedVendedor, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .eq('role', 'member')
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar vendedor:', error);
      return res.status(500).json({ message: 'Erro ao atualizar vendedor', error: error.message });
    }

    if (!updatedVendedor) {
      return res.status(404).json({ message: 'Vendedor não encontrado' });
    }

    console.log('✅ Vendedor atualizado com sucesso');

    res.json({
      success: true,
      message: 'Vendedor atualizado com sucesso',
      vendedor: {
        id: updatedVendedor.id,
        first_name: updatedVendedor.first_name,
        last_name: updatedVendedor.last_name,
        email: updatedVendedor.email,
        is_active: updatedVendedor.is_active
      }
    });

  } catch (error) {
    console.error('💥 Erro ao atualizar vendedor:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// PATCH /api/vendedores/:id/toggle-active - Ativar/Desativar vendedor
router.patch('/:id/toggle-active', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔄 Alterando status do vendedor:', id);

    // Buscar vendedor atual
    const { data: currentVendedor, error: fetchError } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', id)
      .eq('role', 'member')
      .single();

    if (fetchError || !currentVendedor) {
      return res.status(404).json({ message: 'Vendedor não encontrado' });
    }

    // Alternar status
    const newStatus = !currentVendedor.is_active;

    const { data: updatedVendedor, error } = await supabase
      .from('users')
      .update({ is_active: newStatus })
      .eq('id', id)
      .eq('role', 'member')
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao alterar status:', error);
      return res.status(500).json({ message: 'Erro ao alterar status', error: error.message });
    }

    console.log(`✅ Status alterado para: ${newStatus ? 'ativo' : 'inativo'}`);

    res.json({
      success: true,
      message: `Vendedor ${newStatus ? 'ativado' : 'desativado'} com sucesso`,
      is_active: newStatus
    });

  } catch (error) {
    console.error('💥 Erro ao alterar status:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// DELETE /api/vendedores/:id - Excluir vendedor
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Excluindo vendedor:', id);

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('role', 'member');

    if (error) {
      console.error('❌ Erro ao excluir vendedor:', error);
      return res.status(500).json({ message: 'Erro ao excluir vendedor', error: error.message });
    }

    console.log('✅ Vendedor excluído com sucesso');

    res.json({
      success: true,
      message: 'Vendedor excluído com sucesso'
    });

  } catch (error) {
    console.error('💥 Erro ao excluir vendedor:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

export default router;
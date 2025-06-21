import express from 'express';
import { supabase } from '../config/supabase';

const router = express.Router();

// GET /api/forms - Listar formulários do tenant
router.get('/', async (req, res) => {
  try {
    const { user } = req as any;
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { data: forms, error } = await supabase
      .from('custom_forms')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar formulários:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json(forms || []);
  } catch (error) {
    console.error('Erro ao listar formulários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/forms/:id - Buscar formulário específico
router.get('/:id', async (req, res) => {
  try {
    const { user } = req as any;
    const { id } = req.params;
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { data: form, error } = await supabase
      .from('custom_forms')
      .select(`
        *,
        form_fields (*)
      `)
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .single();

    if (error) {
      console.error('Erro ao buscar formulário:', error);
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    res.json(form);
  } catch (error) {
    console.error('Erro ao buscar formulário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/forms - Criar novo formulário
router.post('/', async (req, res) => {
  try {
    const { user } = req as any;
    const formData = req.body;
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Criar formulário
    const { data: form, error: formError } = await supabase
      .from('custom_forms')
      .insert({
        ...formData,
        tenant_id: user.tenant_id,
        created_by: user.id
      })
      .select()
      .single();

    if (formError) {
      console.error('Erro ao criar formulário:', formError);
      return res.status(500).json({ error: 'Erro ao criar formulário' });
    }

    res.status(201).json(form);
  } catch (error) {
    console.error('Erro ao criar formulário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/forms/:id - Atualizar formulário
router.put('/:id', async (req, res) => {
  try {
    const { user } = req as any;
    const { id } = req.params;
    const formData = req.body;
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verificar se o formulário existe e pertence ao tenant
    const { data: existingForm } = await supabase
      .from('custom_forms')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .single();

    if (!existingForm) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    // Atualizar formulário
    const { data: form, error: formError } = await supabase
      .from('custom_forms')
      .update(formData)
      .eq('id', id)
      .select()
      .single();

    if (formError) {
      console.error('Erro ao atualizar formulário:', formError);
      return res.status(500).json({ error: 'Erro ao atualizar formulário' });
    }

    // Atualizar campos se fornecidos
    if (formData.fields) {
      // Remover campos existentes
      await supabase
        .from('form_fields')
        .delete()
        .eq('form_id', id);

      // Inserir novos campos
      if (formData.fields.length > 0) {
        const fieldsToInsert = formData.fields.map((field: any) => ({
          ...field,
          form_id: id
        }));

        const { error: fieldsError } = await supabase
          .from('form_fields')
          .insert(fieldsToInsert);

        if (fieldsError) {
          console.error('Erro ao atualizar campos:', fieldsError);
          return res.status(500).json({ error: 'Erro ao atualizar campos do formulário' });
        }
      }
    }

    res.json(form);
  } catch (error) {
    console.error('Erro ao atualizar formulário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/forms/:id - Excluir formulário
router.delete('/:id', async (req, res) => {
  try {
    const { user } = req as any;
    const { id } = req.params;
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verificar se o formulário existe e pertence ao tenant
    const { data: existingForm } = await supabase
      .from('custom_forms')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .single();

    if (!existingForm) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    // Excluir formulário (campos serão excluídos automaticamente devido ao CASCADE)
    const { error } = await supabase
      .from('custom_forms')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir formulário:', error);
      return res.status(500).json({ error: 'Erro ao excluir formulário' });
    }

    res.json({ message: 'Formulário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir formulário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/forms/:id/submissions - Listar submissões do formulário
router.get('/:id/submissions', async (req, res) => {
  try {
    const { user } = req as any;
    const { id } = req.params;
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verificar se o formulário pertence ao tenant
    const { data: form } = await supabase
      .from('custom_forms')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .single();

    if (!form) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    // Buscar submissões
    const { data: submissions, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('form_id', id)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar submissões:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json(submissions || []);
  } catch (error) {
    console.error('Erro ao listar submissões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router; 
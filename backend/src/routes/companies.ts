
import express from 'express';
import { supabase, supabaseAdmin } from '../index';

const router = express.Router();

// Listar empresas (usando a tabela companies existente)
router.get('/', async (req, res) => {
  try {
    const { data: companies, error } = await supabaseAdmin
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar empresas:', error);
      throw error;
    }

    res.json({
      companies: companies || []
    });
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    res.status(500).json({
      message: 'Erro ao buscar empresas',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Criar empresa + admin (usando as tabelas corretas do schema)
router.post('/', async (req, res) => {
  try {
    const { companyName, segment, adminName, adminEmail, adminPassword } = req.body;

    console.log('Dados recebidos:', { companyName, segment, adminName, adminEmail });

    // Verificar se email já existe na tabela users
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .single();

    if (existingUser) {
      return res.status(400).json({
        message: 'Email já está em uso'
      });
    }

    // Criar empresa na tabela companies
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert([{ 
        name: companyName, 
        segment: segment 
      }])
      .select()
      .single();

    if (companyError) {
      console.error('Erro ao criar empresa:', companyError);
      throw companyError;
    }

    console.log('Empresa criada:', company);

    // Criar usuário admin na tabela users
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('users')
      .insert([{
        email: adminEmail,
        first_name: adminName.split(' ')[0],
        last_name: adminName.split(' ').slice(1).join(' ') || '',
        role: 'admin',
        tenant_id: company.id, // Usar o ID da empresa como tenant_id
        is_active: true
      }])
      .select()
      .single();

    if (adminError) {
      console.error('Erro ao criar admin:', adminError);
      // Se erro ao criar admin, remover empresa criada
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      throw adminError;
    }

    console.log('Admin criado:', admin);

    // Criar registro de integração vazio (se a tabela integrations existe)
    try {
      const { error: integrationError } = await supabaseAdmin
        .from('integrations')
        .insert([{
          company_id: company.id
        }]);

      if (integrationError) {
        console.warn('Erro ao criar registro de integração:', integrationError);
        // Não falhar por causa disso, apenas log de warning
      }
    } catch (integrationErr) {
      console.warn('Erro ao criar integração (tabela pode não existir):', integrationErr);
    }

    res.json({
      success: true,
      company,
      admin,
      message: 'Empresa e gestor criados com sucesso'
    });
  } catch (error) {
    console.error('Erro completo ao criar empresa:', error);
    res.status(500).json({
      message: 'Erro ao criar empresa',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

export default router;

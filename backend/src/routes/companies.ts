
import express from 'express';
import { supabase, supabaseAdmin } from '../index';

const router = express.Router();

// Listar empresas
router.get('/', async (req, res) => {
  try {
    const { data: companies, error } = await supabaseAdmin
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
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

// Criar empresa + admin
router.post('/', async (req, res) => {
  try {
    const { companyName, segment, adminName, adminEmail, adminPassword } = req.body;

    console.log('Dados recebidos:', { companyName, segment, adminName, adminEmail });

    // Verificar se email já existe
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

    // Criar empresa
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

    // Criar usuário admin
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('users')
      .insert([{
        email: adminEmail,
        first_name: adminName.split(' ')[0],
        last_name: adminName.split(' ').slice(1).join(' '),
        role: 'admin',
        tenant_id: company.id,
        is_active: true
      }])
      .select()
      .single();

    if (adminError) {
      console.error('Erro ao criar admin:', adminError);
      throw adminError;
    }

    console.log('Admin criado:', admin);

    // Criar registro de integração vazio
    const { error: integrationError } = await supabaseAdmin
      .from('integrations')
      .insert([{
        company_id: company.id
      }]);

    if (integrationError) {
      console.warn('Erro ao criar registro de integração:', integrationError);
    }

    res.json({
      success: true,
      company,
      admin,
      message: 'Empresa e gestor criados com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    res.status(500).json({
      message: 'Erro ao criar empresa',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;

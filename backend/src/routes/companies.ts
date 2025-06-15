
import express from 'express';
import { supabase } from '../index';

const router = express.Router();

// Listar empresas
router.get('/', async (req, res) => {
  try {
    const { data: companies, error } = await supabase
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

    // Verificar se email já existe
    const { data: existingUser } = await supabase
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
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([{ 
        name: companyName, 
        segment: segment 
      }])
      .select()
      .single();

    if (companyError) {
      throw companyError;
    }

    // Criar usuário admin
    const { data: admin, error: adminError } = await supabase
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
      throw adminError;
    }

    // Criar registro de integração vazio
    const { error: integrationError } = await supabase
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

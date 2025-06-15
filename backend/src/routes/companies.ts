import express from 'express';
import { supabase } from '../index';

const router = express.Router();

// Listar empresas
router.get('/', async (req, res) => {
  try {
    console.log('📋 Buscando empresas...');
    
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar empresas:', error);
      throw error;
    }

    console.log('✅ Empresas encontradas:', companies?.length || 0);

    res.json({
      companies: companies || []
    });
  } catch (error) {
    console.error('💥 Erro ao buscar empresas:', error);
    res.status(500).json({
      message: 'Erro ao buscar empresas',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Criar empresa + admin (versão simplificada)
router.post('/', async (req, res) => {
  try {
    const { companyName, segment, adminName, adminEmail, adminPassword } = req.body;

    console.log('🚀 Iniciando criação de empresa...');
    console.log('📋 Dados recebidos:', { 
      companyName, 
      segment, 
      adminName, 
      adminEmail,
      hasPassword: !!adminPassword 
    });

    // Validações básicas
    if (!companyName || !adminName || !adminEmail) {
      console.log('❌ Dados obrigatórios faltando');
      return res.status(400).json({
        message: 'Nome da empresa, nome do admin e email são obrigatórios'
      });
    }

    // Verificar se email já existe
    console.log('🔍 Verificando se email já existe...');
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', adminEmail)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Erro ao verificar email:', checkError);
      throw checkError;
    }

    if (existingUser) {
      console.log('❌ Email já existe:', adminEmail);
      return res.status(400).json({
        message: `Email já está em uso: ${adminEmail}`
      });
    }

    console.log('✅ Email disponível');

    // 1. Criar empresa
    console.log('🏢 Criando empresa...');
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([{ 
        name: companyName, 
        segment: segment || null
      }])
      .select()
      .single();

    if (companyError) {
      console.error('❌ Erro ao criar empresa:', companyError);
      throw companyError;
    }

    console.log('✅ Empresa criada:', {
      id: company.id,
      name: company.name,
      segment: company.segment
    });

    // 2. Preparar dados do admin
    const adminNames = adminName.trim().split(' ');
    const firstName = adminNames[0];
    const lastName = adminNames.slice(1).join(' ') || '';
    const finalPassword = adminPassword || '123456';

    console.log('👤 Criando admin na tabela users...');

    // 3. Criar admin na tabela users (sem Supabase Auth por enquanto)
    const { data: admin, error: adminError } = await supabase
      .from('users')
      .insert([{
        email: adminEmail,
        first_name: firstName,
        last_name: lastName,
        role: 'admin',
        tenant_id: company.id,
        is_active: true
      }])
      .select()
      .single();

    if (adminError) {
      console.error('❌ Erro ao criar admin:', adminError);
      
      // Rollback: remover empresa criada
      console.log('🔄 Fazendo rollback da empresa...');
      await supabase.from('companies').delete().eq('id', company.id);
      
      throw adminError;
    }

    console.log('✅ Admin criado na tabela:', {
      id: admin.id,
      email: admin.email,
      name: `${admin.first_name} ${admin.last_name}`,
      role: admin.role,
      tenant_id: admin.tenant_id
    });

    // 4. Criar registro de integração (opcional)
    try {
      console.log('🔗 Criando registro de integração...');
      const { error: integrationError } = await supabase
        .from('integrations')
        .insert([{
          company_id: company.id
        }]);

      if (integrationError) {
        console.warn('⚠️ Erro ao criar integração (não crítico):', integrationError.message);
      } else {
        console.log('✅ Integração criada');
      }
    } catch (integrationErr) {
      console.warn('⚠️ Erro ao criar integração (tabela pode não existir):', integrationErr);
    }

    // 5. Resposta de sucesso
    console.log('🎉 Empresa e admin criados com sucesso!');

    res.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        segment: company.segment
      },
      admin: {
        id: admin.id,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        role: admin.role,
        tenant_id: admin.tenant_id
      },
      credentials: {
        email: adminEmail,
        password: finalPassword
      },
      message: `Empresa "${companyName}" e gestor "${adminName}" criados com sucesso!`
    });

  } catch (error) {
    console.error('💥 Erro completo ao criar empresa:', error);
    res.status(500).json({
      message: 'Erro interno ao criar empresa',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

export default router;
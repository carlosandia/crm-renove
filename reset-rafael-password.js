/**
 * 🔧 SCRIPT DE CORREÇÃO: Reset de senha para Rafael
 * 
 * Problema identificado:
 * - Rafael existe no banco: ID 73238695-5f86-4d2b-a875-0da1b71eefeb
 * - Email: rafael@renovedigital.com.br
 * - Tenant: c983a983-b1c6-451f-b528-64a5d1c831a0
 * - Auth user criado mas last_sign_in_at é null (nunca logou)
 * - Senha não configurada corretamente durante criação
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variáveis de ambiente não configuradas');
  console.error('SUPABASE_URL:', !!SUPABASE_URL);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);
  process.exit(1);
}

// Criar cliente Supabase com service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetRafaelPassword() {
  console.log('🔧 INICIANDO RESET DE SENHA PARA RAFAEL');
  console.log('=====================================');
  
  try {
    // 1. Verificar dados atuais do Rafael
    console.log('\n📋 1. Verificando dados atuais do Rafael...');
    
    const { data: rafaelUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'rafael@renovedigital.com.br')
      .single();

    if (userError || !rafaelUser) {
      console.error('❌ Rafael não encontrado na tabela users:', userError);
      return;
    }

    console.log('✅ Rafael encontrado:', {
      id: rafaelUser.id,
      email: rafaelUser.email,
      name: `${rafaelUser.first_name} ${rafaelUser.last_name}`,
      role: rafaelUser.role,
      tenant_id: rafaelUser.tenant_id,
      auth_user_id: rafaelUser.auth_user_id,
      is_active: rafaelUser.is_active
    });

    // 2. Verificar auth user
    console.log('\n📋 2. Verificando auth user...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erro ao listar auth users:', authError);
      return;
    }

    const rafaelAuthUser = authUsers.users.find(u => u.email === 'rafael@renovedigital.com.br');
    
    if (!rafaelAuthUser) {
      console.error('❌ Rafael não encontrado em auth.users');
      return;
    }

    console.log('✅ Auth user encontrado:', {
      id: rafaelAuthUser.id,
      email: rafaelAuthUser.email,
      email_confirmed: !!rafaelAuthUser.email_confirmed_at,
      last_sign_in: rafaelAuthUser.last_sign_in_at,
      created_at: rafaelAuthUser.created_at
    });

    // 3. Resetar senha usando service role
    console.log('\n🔧 3. Resetando senha...');
    
    const newPassword = 'Rafael123@2025'; // Senha temporária forte
    
    const { data: updateResult, error: updateError } = await supabase.auth.admin.updateUserById(
      rafaelAuthUser.id,
      {
        password: newPassword,
        email_confirm: true, // Confirmar email se necessário
        user_metadata: {
          first_name: rafaelUser.first_name,
          last_name: rafaelUser.last_name,
          role: rafaelUser.role,
          tenant_id: rafaelUser.tenant_id,
          password_reset: true,
          reset_timestamp: new Date().toISOString()
        }
      }
    );

    if (updateError) {
      console.error('❌ Erro ao resetar senha:', updateError);
      return;
    }

    console.log('✅ Senha resetada com sucesso!');
    console.log('✅ Auth user atualizado:', {
      id: updateResult.user.id,
      email: updateResult.user.email,
      email_confirmed: !!updateResult.user.email_confirmed_at,
      metadata_updated: !!updateResult.user.user_metadata
    });

    // 4. Atualizar registro na tabela users
    console.log('\n📋 4. Atualizando registro na tabela users...');
    
    const { data: userUpdateResult, error: userUpdateError } = await supabase
      .from('users')
      .update({
        updated_at: new Date().toISOString(),
        // Marcar que a senha foi resetada
        password_reset_at: new Date().toISOString()
      })
      .eq('id', rafaelUser.id)
      .select()
      .single();

    if (userUpdateError) {
      console.warn('⚠️ Erro ao atualizar tabela users (não crítico):', userUpdateError);
    } else {
      console.log('✅ Registro atualizado na tabela users');
    }

    // 5. Resultado final
    console.log('\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('================================');
    console.log(`📧 Email: rafael@renovedigital.com.br`);
    console.log(`🔑 Senha temporária: ${newPassword}`);
    console.log(`🏢 Tenant ID: ${rafaelUser.tenant_id}`);
    console.log(`👤 Role: ${rafaelUser.role}`);
    console.log('');
    console.log('📋 PRÓXIMOS PASSOS:');
    console.log('1. Rafael pode agora fazer login com a senha temporária');
    console.log('2. Recomende que ele altere a senha no primeiro login');
    console.log('3. Teste o login na interface do sistema');
    console.log('4. Verifique se Rafael aparece na lista de "Vendedores Vinculados"');

    return {
      success: true,
      email: 'rafael@renovedigital.com.br',
      temporaryPassword: newPassword,
      tenant_id: rafaelUser.tenant_id,
      user_id: rafaelUser.id
    };

  } catch (error) {
    console.error('❌ ERRO GERAL NO RESET DE SENHA:', error);
    throw error;
  }
}

// Executar o script
resetRafaelPassword()
  .then((result) => {
    if (result) {
      console.log('\n✅ Script executado com sucesso!');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('\n❌ Falha na execução do script:', error);
    process.exit(1);
  });
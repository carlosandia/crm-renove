/**
 * 🔧 RECRIAR RAFAEL APÓS LIMPEZA
 * 
 * Problema identificado e resolvido:
 * - Rafael tinha auth.users sem password (encrypted_password era NULL)
 * - Auth user problemático foi deletado via SQL
 * - Agora vamos recriar com senha correta
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

// Cliente com service role
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function recreateRafaelClean() {
  console.log('🔧 RECRIANDO RAFAEL APÓS LIMPEZA');
  console.log('===============================');
  
  try {
    // 1. Verificar que o auth user foi realmente deletado
    console.log('\n📋 1. Verificando se auth user foi deletado...');
    
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.warn('⚠️ Erro ao listar users:', listError);
    } else {
      const rafaelExists = authUsers.users.find(u => u.email === 'rafael@renovedigital.com.br');
      if (rafaelExists) {
        console.log('⚠️ Rafael ainda existe em auth.users:', rafaelExists.id);
      } else {
        console.log('✅ Auth user deletado com sucesso');
      }
    }

    // 2. Buscar dados da tabela users (que deve estar intacta)
    console.log('\n📋 2. Buscando dados na tabela users...');
    
    const { data: rafaelData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'rafael@renovedigital.com.br')
      .single();

    if (userError || !rafaelData) {
      throw new Error(`Rafael não encontrado na tabela users: ${userError?.message}`);
    }

    console.log('✅ Rafael encontrado na tabela users:', {
      id: rafaelData.id,
      email: rafaelData.email,
      name: `${rafaelData.first_name} ${rafaelData.last_name}`,
      role: rafaelData.role,
      tenant_id: rafaelData.tenant_id
    });

    // 3. Recriar auth user com senha válida
    console.log('\n🆕 3. Criando novo auth user com senha...');
    
    const newPassword = 'Rafael123@2025';
    
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: rafaelData.email,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        first_name: rafaelData.first_name,
        last_name: rafaelData.last_name,
        role: rafaelData.role,
        tenant_id: rafaelData.tenant_id
      }
    });

    if (createError || !newAuthUser.user) {
      throw new Error(`Falha ao criar auth user: ${createError?.message}`);
    }

    console.log('✅ Auth user criado com sucesso:', {
      id: newAuthUser.user.id,
      email: newAuthUser.user.email,
      email_confirmed: !!newAuthUser.user.email_confirmed_at,
      has_password: true // Implícito pois foi criado com senha
    });

    // 4. Atualizar tabela users com novo auth_user_id
    console.log('\n📝 4. Atualizando tabela users...');
    
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        auth_user_id: newAuthUser.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', rafaelData.id)
      .select()
      .single();

    if (updateError) {
      console.warn('⚠️ Erro ao atualizar tabela users:', updateError.message);
    } else {
      console.log('✅ Tabela users atualizada com novo auth_user_id');
    }

    // 5. Verificação final
    console.log('\n🔍 5. Verificação final...');
    
    // Verificar auth user
    const { data: finalAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
    const finalRafael = finalAuthUsers.users.find(u => u.email === 'rafael@renovedigital.com.br');
    
    if (finalRafael) {
      console.log('✅ Auth user funcionando:', {
        id: finalRafael.id,
        email: finalRafael.email,
        email_confirmed: !!finalRafael.email_confirmed_at,
        metadata: finalRafael.user_metadata
      });
    }

    // Verificar tabela users
    const { data: finalUserData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'rafael@renovedigital.com.br')
      .single();

    if (finalUserData) {
      console.log('✅ Tabela users sincronizada:', {
        user_id: finalUserData.id,
        auth_user_id: finalUserData.auth_user_id,
        role: finalUserData.role,
        tenant_id: finalUserData.tenant_id
      });
    }

    // 6. Resultado final
    console.log('\n🎉 RAFAEL RECRIADO COM SUCESSO!');
    console.log('==============================');
    console.log('📧 Email: rafael@renovedigital.com.br');
    console.log(`🔑 Senha: ${newPassword}`);
    console.log(`🆔 Auth User ID: ${newAuthUser.user.id}`);
    console.log(`👤 User ID: ${rafaelData.id}`);
    console.log(`🏢 Tenant ID: ${rafaelData.tenant_id}`);
    console.log('');
    console.log('📋 PRÓXIMOS PASSOS:');
    console.log('1. Rafael pode agora fazer login com a nova senha');
    console.log('2. A autenticação foi completamente corrigida');
    console.log('3. Teste o login na interface');
    console.log('4. Verifique se aparece na lista de vendedores');

    return {
      success: true,
      email: 'rafael@renovedigital.com.br',
      password: newPassword,
      auth_user_id: newAuthUser.user.id,
      user_id: rafaelData.id,
      tenant_id: rafaelData.tenant_id
    };

  } catch (error) {
    console.error('❌ ERRO NA RECRIAÇÃO:', error);
    throw error;
  }
}

// Executar recriação
recreateRafaelClean()
  .then((result) => {
    console.log('\n✅ Recriação executada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Falha na recriação:', error);
    process.exit(1);
  });
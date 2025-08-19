/**
 * 🔧 CORREÇÃO DIRETA: Reset autenticação do Rafael usando service role
 * 
 * PROBLEMA IDENTIFICADO:
 * - Rafael existe na tabela users com dados corretos
 * - Rafael existe em auth.users mas last_sign_in_at é null (nunca logou)
 * - Senha não foi configurada corretamente na criação
 * 
 * SOLUÇÃO:
 * - Deletar auth user existente
 * - Recriar com senha válida
 * - Manter dados na tabela users
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

async function fixRafaelAuth() {
  console.log('🔧 CORREÇÃO DIRETA DA AUTENTICAÇÃO DO RAFAEL');
  console.log('===========================================');
  
  try {
    // 1. Buscar dados do Rafael na tabela users
    console.log('\n📋 1. Buscando dados do Rafael...');
    
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
      role: rafaelData.role,
      tenant_id: rafaelData.tenant_id
    });

    // 2. Deletar auth user existente (para limpar estado inconsistente)
    console.log('\n🗑️ 2. Deletando auth user existente...');
    
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      rafaelData.auth_user_id || rafaelData.id
    );

    if (deleteError) {
      console.warn('⚠️ Erro ao deletar auth user (pode não existir):', deleteError.message);
    } else {
      console.log('✅ Auth user deletado com sucesso');
    }

    // 3. Recriar auth user com senha válida
    console.log('\n🆕 3. Recriando auth user com nova senha...');
    
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

    console.log('✅ Auth user recriado:', {
      id: newAuthUser.user.id,
      email: newAuthUser.user.email,
      email_confirmed: !!newAuthUser.user.email_confirmed_at
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
    
    const { data: finalCheck, error: checkError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'rafael@renovedigital.com.br')
      .single();

    if (!checkError && finalCheck) {
      console.log('✅ Verificação final bem-sucedida:', {
        user_id: finalCheck.id,
        auth_user_id: finalCheck.auth_user_id,
        email: finalCheck.email,
        role: finalCheck.role,
        tenant_id: finalCheck.tenant_id,
        is_active: finalCheck.is_active
      });
    }

    // 6. Resultado final
    console.log('\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('================================');
    console.log('📧 Email: rafael@renovedigital.com.br');
    console.log(`🔑 Nova senha: ${newPassword}`);
    console.log(`🆔 Auth User ID: ${newAuthUser.user.id}`);
    console.log(`🏢 Tenant ID: ${rafaelData.tenant_id}`);
    console.log('');
    console.log('📋 PRÓXIMOS PASSOS:');
    console.log('1. Rafael pode agora fazer login com a nova senha');
    console.log('2. A autenticação foi completamente resetada');
    console.log('3. Teste o login na interface');
    console.log('4. Verifique se aparece na lista de vendedores');

    return {
      success: true,
      email: 'rafael@renovedigital.com.br',
      password: newPassword,
      auth_user_id: newAuthUser.user.id,
      tenant_id: rafaelData.tenant_id
    };

  } catch (error) {
    console.error('❌ ERRO NA CORREÇÃO:', error);
    throw error;
  }
}

// Executar correção
fixRafaelAuth()
  .then((result) => {
    console.log('\n✅ Correção executada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Falha na correção:', error);
    process.exit(1);
  });
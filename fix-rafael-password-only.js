/**
 * 🔧 CORREÇÃO SIMPLES: Apenas resetar senha do Rafael
 * 
 * PROBLEMA IDENTIFICADO:
 * - Rafael existe em auth.users (ID: 73238695-5f86-4d2b-a875-0da1b71eefeb)
 * - Email confirmado mas last_sign_in_at é null (nunca logou)
 * - Senha não está funcionando
 * 
 * SOLUÇÃO SIMPLES:
 * - Apenas resetar a senha do usuário existente
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

async function resetRafaelPasswordOnly() {
  console.log('🔧 RESET SIMPLES DE SENHA PARA RAFAEL');
  console.log('===================================');
  
  try {
    // 1. Verificar dados do Rafael
    console.log('\n📋 1. Verificando dados do Rafael...');
    
    const { data: rafaelData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'rafael@renovedigital.com.br')
      .single();

    if (userError || !rafaelData) {
      throw new Error(`Rafael não encontrado: ${userError?.message}`);
    }

    console.log('✅ Rafael encontrado na tabela users:', {
      id: rafaelData.id,
      email: rafaelData.email,
      role: rafaelData.role,
      tenant_id: rafaelData.tenant_id,
      auth_user_id: rafaelData.auth_user_id
    });

    // 2. Resetar senha usando updateUserById
    console.log('\n🔑 2. Resetando senha...');
    
    const newPassword = 'Rafael123@2025';
    const authUserId = rafaelData.auth_user_id || rafaelData.id;
    
    const { data: resetResult, error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
      authUserId,
      {
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          first_name: rafaelData.first_name,
          last_name: rafaelData.last_name,
          role: rafaelData.role,
          tenant_id: rafaelData.tenant_id,
          password_reset: true,
          reset_at: new Date().toISOString()
        }
      }
    );

    if (resetError) {
      throw new Error(`Erro ao resetar senha: ${resetError.message}`);
    }

    console.log('✅ Senha resetada com sucesso!');
    console.log('✅ Usuário atualizado:', {
      id: resetResult.user.id,
      email: resetResult.user.email,
      email_confirmed: !!resetResult.user.email_confirmed_at,
      last_sign_in: resetResult.user.last_sign_in_at
    });

    // 3. Atualizar timestamp na tabela users
    console.log('\n📝 3. Atualizando timestamp...');
    
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        updated_at: new Date().toISOString(),
        password_reset_at: new Date().toISOString()
      })
      .eq('id', rafaelData.id);

    if (updateError) {
      console.warn('⚠️ Erro ao atualizar timestamp (não crítico):', updateError.message);
    } else {
      console.log('✅ Timestamp atualizado');
    }

    // 4. Resultado final
    console.log('\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('================================');
    console.log('📧 Email: rafael@renovedigital.com.br');
    console.log(`🔑 Nova senha: ${newPassword}`);
    console.log(`🆔 Auth User ID: ${authUserId}`);
    console.log(`🏢 Tenant ID: ${rafaelData.tenant_id}`);
    console.log('');
    console.log('📋 PRÓXIMOS PASSOS:');
    console.log('1. Rafael pode agora fazer login com a nova senha');
    console.log('2. Teste o login na interface');
    console.log('3. Verifique se aparece na lista de vendedores');

    return {
      success: true,
      email: 'rafael@renovedigital.com.br',
      password: newPassword,
      auth_user_id: authUserId,
      tenant_id: rafaelData.tenant_id
    };

  } catch (error) {
    console.error('❌ ERRO NA CORREÇÃO:', error);
    throw error;
  }
}

// Executar correção
resetRafaelPasswordOnly()
  .then((result) => {
    console.log('\n✅ Correção executada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Falha na correção:', error);
    process.exit(1);
  });
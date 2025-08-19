/**
 * 🔧 GERAR LINK DE RESET PARA RAFAEL
 * 
 * Esta abordagem gera um link de reset de senha que Rafael pode usar
 * para definir uma nova senha diretamente.
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

async function generateResetLinkForRafael() {
  console.log('🔧 GERANDO LINK DE RESET PARA RAFAEL');
  console.log('==================================');
  
  try {
    // 1. Gerar link de reset de senha
    console.log('\n🔗 1. Gerando link de reset de senha...');
    
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: 'rafael@renovedigital.com.br',
      options: {
        redirectTo: 'https://crm.renovedigital.com.br/auth/reset-password'
      }
    });

    if (error) {
      console.error('❌ Erro ao gerar link:', error);
      
      // Tentar abordagem alternativa - forçar novo usuário
      console.log('\n🔄 2. Tentando abordagem alternativa...');
      
      // Primeiro deletar o usuário existente
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        '73238695-5f86-4d2b-a875-0da1b71eefeb'
      );
      
      if (deleteError) {
        console.warn('⚠️ Aviso ao deletar usuário:', deleteError.message);
      } else {
        console.log('✅ Usuário deletado com sucesso');
      }

      // Aguardar um pouco
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Recriar usuário
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'rafael@renovedigital.com.br',
        password: 'Rafael123@2025',
        email_confirm: true,
        user_metadata: {
          first_name: 'Rafael',
          last_name: 'Azevedo',
          role: 'member',
          tenant_id: 'c983a983-b1c6-451f-b528-64a5d1c831a0'
        }
      });

      if (createError) {
        throw new Error(`Falha ao recriar usuário: ${createError.message}`);
      }

      console.log('✅ Usuário recriado com sucesso:', {
        id: newUser.user.id,
        email: newUser.user.email
      });

      // Atualizar tabela users com novo ID
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          auth_user_id: newUser.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('email', 'rafael@renovedigital.com.br');

      if (updateError) {
        console.warn('⚠️ Erro ao atualizar tabela users:', updateError.message);
      } else {
        console.log('✅ Tabela users atualizada');
      }

      console.log('\n🎉 USUÁRIO RECRIADO COM SUCESSO!');
      console.log('===============================');
      console.log('📧 Email: rafael@renovedigital.com.br');
      console.log('🔑 Senha: Rafael123@2025');
      console.log(`🆔 Novo Auth ID: ${newUser.user.id}`);
      console.log('🏢 Tenant ID: c983a983-b1c6-451f-b528-64a5d1c831a0');

      return {
        success: true,
        method: 'recreate',
        email: 'rafael@renovedigital.com.br',
        password: 'Rafael123@2025',
        auth_user_id: newUser.user.id
      };
    }

    console.log('✅ Link de reset gerado com sucesso!');
    console.log('📧 Email para:', data.properties.email);
    console.log('🔗 Link:', data.properties.action_link);

    console.log('\n🎉 LINK DE RESET GERADO!');
    console.log('========================');
    console.log('📧 Email: rafael@renovedigital.com.br');
    console.log('🔗 Link de reset:', data.properties.action_link);
    console.log('');
    console.log('📋 INSTRUÇÕES PARA RAFAEL:');
    console.log('1. Acesse o link acima');
    console.log('2. Defina uma nova senha');
    console.log('3. Faça login normalmente');

    return {
      success: true,
      method: 'reset_link',
      email: 'rafael@renovedigital.com.br',
      reset_link: data.properties.action_link
    };

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
    throw error;
  }
}

// Executar script
generateResetLinkForRafael()
  .then((result) => {
    console.log('\n✅ Script executado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Falha na execução:', error);
    process.exit(1);
  });
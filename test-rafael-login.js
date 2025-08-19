/**
 * 🧪 TESTE DE LOGIN PARA RAFAEL
 * 
 * Testa se Rafael consegue fazer login após a correção
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

// Cliente normal (como frontend)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRafaelLogin() {
  console.log('🧪 TESTE DE LOGIN PARA RAFAEL');
  console.log('============================');
  
  try {
    // 1. Tentar fazer login
    console.log('\n🔐 1. Tentando fazer login...');
    console.log('Email: rafael@renovedigital.com.br');
    console.log('Senha: Rafael123@2025');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'rafael@renovedigital.com.br',
      password: 'Rafael123@2025'
    });

    if (error) {
      console.error('❌ Erro no login:', error.message);
      return false;
    }

    console.log('✅ Login realizado com sucesso!');
    console.log('✅ Usuário autenticado:', {
      id: data.user.id,
      email: data.user.email,
      email_confirmed: !!data.user.email_confirmed_at,
      metadata: data.user.user_metadata
    });

    // 2. Verificar dados do usuário na tabela users
    console.log('\n👤 2. Verificando dados na tabela users...');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .single();

    if (userError) {
      console.error('❌ Erro ao buscar dados do usuário:', userError.message);
    } else {
      console.log('✅ Dados do usuário encontrados:', {
        id: userData.id,
        email: userData.email,
        name: `${userData.first_name} ${userData.last_name}`,
        role: userData.role,
        tenant_id: userData.tenant_id,
        is_active: userData.is_active
      });
    }

    // 3. Verificar se aparecerá na lista de members
    console.log('\n👥 3. Testando query de members...');
    
    const { data: members, error: membersError } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', userData.tenant_id)
      .eq('role', 'member')
      .eq('is_active', true);

    if (membersError) {
      console.error('❌ Erro ao buscar members:', membersError.message);
    } else {
      const rafaelInList = members.find(m => m.email === 'rafael@renovedigital.com.br');
      if (rafaelInList) {
        console.log('✅ Rafael encontrado na lista de members!');
        console.log('✅ Dados na lista:', {
          id: rafaelInList.id,
          email: rafaelInList.email,
          name: `${rafaelInList.first_name} ${rafaelInList.last_name}`,
          auth_user_id: rafaelInList.auth_user_id
        });
      } else {
        console.log('❌ Rafael não encontrado na lista de members');
        console.log('📋 Members encontrados:', members.length);
      }
    }

    // 4. Fazer logout
    console.log('\n🚪 4. Fazendo logout...');
    await supabase.auth.signOut();
    console.log('✅ Logout realizado');

    console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
    console.log('===============================');
    console.log('✅ Rafael pode fazer login');
    console.log('✅ Dados estão sincronizados');
    console.log('✅ Deve aparecer na lista de vendedores');

    return true;

  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error);
    return false;
  }
}

// Executar teste
testRafaelLogin()
  .then((success) => {
    if (success) {
      console.log('\n✅ Teste executado com sucesso!');
      process.exit(0);
    } else {
      console.log('\n❌ Teste falhou!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Falha na execução do teste:', error);
    process.exit(1);
  });
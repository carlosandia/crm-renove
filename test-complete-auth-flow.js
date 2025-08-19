#!/usr/bin/env node

/**
 * 🔍 TESTE COMPLETO: Basic Supabase Authentication + Persistência de Motivos
 * 
 * Este script irá:
 * 1. Fazer login real no Supabase com credenciais
 * 2. Testar criação de motivos via API backend
 * 3. Verificar persistência dos dados
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://marajvabdwkpgopytvhh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

const BACKEND_URL = 'http://127.0.0.1:3001';
const TEST_PIPELINE_ID = 'eb0d170f-9618-4bde-9a28-2a1a65cc90b8';

// Cliente Supabase para autenticação
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Processar sessão válida e executar testes de motivos
 */
async function processarSessaoValida(user, session) {
  console.log('✅ Processando sessão válida:', {
    user_id: user.id.substring(0, 8),
    email: user.email,
    tenant_id: user.user_metadata?.tenant_id?.substring(0, 8) || 'N/A',
    role: user.user_metadata?.role || 'N/A',
    session_valid: !!session?.access_token
  });

  // TESTE 3: Verificar sessão atual
  console.log('\n📋 TESTE 3: Verificar sessão Supabase atual');
  const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !currentSession) {
    console.error('❌ Erro ao obter sessão:', sessionError);
    return;
  }
  
  console.log('✅ Sessão válida obtida:', {
    token_length: currentSession.access_token?.length || 0,
    expires_at: new Date(currentSession.expires_at * 1000).toISOString()
  });

  // TESTE 4: Criar motivo via API backend com autenticação
  console.log('\n📋 TESTE 4: Criar motivo via API backend COM autenticação');
  const motivoData = {
    pipeline_id: TEST_PIPELINE_ID,
    reason_type: 'ganho',
    reason_text: 'TESTE COMPLETO AUTH - ' + new Date().toISOString(),
    display_order: 0,
    is_active: true
  };

  const createResponse = await fetch(`${BACKEND_URL}/api/outcome-reasons`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentSession.access_token}`
    },
    body: JSON.stringify(motivoData)
  });

  const createData = await createResponse.json();
  console.log('🎯 Resultado criação:', {
    status: createResponse.status,
    success: createData.success,
    data: createData.data ? `ID: ${createData.data.id?.substring(0, 8)}` : null,
    error: createData.error
  });

  if (createResponse.status === 200 || createResponse.status === 201) {
    console.log('🎉 SUCESSO! Motivo criado via API com autenticação');

    // TESTE 5: Verificar se motivo persistiu via API
    console.log('\n📋 TESTE 5: Verificar persistência via API backend');
    const listResponse = await fetch(`${BACKEND_URL}/api/outcome-reasons?pipeline_id=${TEST_PIPELINE_ID}`, {
      headers: {
        'Authorization': `Bearer ${currentSession.access_token}`
      }
    });

    const listData = await listResponse.json();
    console.log('📋 Motivos via API:', {
      status: listResponse.status,
      count: listData.data?.length || 0,
      success: listData.success
    });

    if (listData.data && listData.data.length > 0) {
      console.log('✅ PERSISTÊNCIA CONFIRMADA VIA API!');
      listData.data.slice(0, 3).forEach((reason, i) => {
        console.log(`  ${i + 1}. ${reason.reason_type}: ${reason.reason_text.substring(0, 50)}...`);
      });
    } else {
      console.log('❌ PROBLEMA: Motivos não foram listados via API');
    }

    // TESTE 6: Verificar diretamente no banco
    console.log('\n📋 TESTE 6: Verificar diretamente no Supabase');
    const { data: directData, error: directError } = await supabase
      .from('pipeline_outcome_reasons')
      .select('*')
      .eq('pipeline_id', TEST_PIPELINE_ID)
      .order('created_at', { ascending: false })
      .limit(3);

    if (directError) {
      console.error('❌ Erro ao consultar banco direto:', directError);
    } else {
      console.log('✅ Dados diretos do banco:', {
        count: directData?.length || 0
      });
      
      if (directData && directData.length > 0) {
        console.log('✅ CONFIRMAÇÃO DUPLA: Dados estão no banco!');
        directData.forEach((reason, i) => {
          console.log(`  ${i + 1}. DB: ${reason.reason_type} | ${reason.reason_text.substring(0, 40)}...`);
        });
      } else {
        console.log('❌ PROBLEMA CRÍTICO: Dados não estão no banco!');
      }
    }

  } else {
    console.log('❌ FALHA na criação via API:', createData);
    
    // Diagnóstico adicional
    console.log('\n🔍 DIAGNÓSTICO ADICIONAL:');
    console.log('Headers enviados:', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentSession.access_token.substring(0, 20)}...`
    });
    console.log('Payload enviado:', motivoData);
    console.log('Response recebido:', createData);
  }
}

// 🔐 CREDENCIAIS DE TESTE (usar email existente do sistema)
const TEST_CREDENTIALS = {
  email: 'seraquevai@seraquevai.com', // Email existente no sistema
  password: 'TesteMotivos123!' // Senha que vamos definir
};

async function testarFluxoCompletoAuth() {
  console.log('🔐 TESTE COMPLETO: Basic Supabase Authentication + Motivos');
  console.log('===============================================================');

  try {
    // TESTE 1: Health check
    console.log('\n📋 TESTE 1: Health check do backend');
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Backend health:', healthResponse.status, healthData);

    // TESTE 2: Login real no Supabase
    console.log('\n📋 TESTE 2: Login no Supabase com credenciais reais');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_CREDENTIALS.email,
      password: TEST_CREDENTIALS.password,
    });

    if (authError) {
      console.error('❌ Erro no login:', authError.message);
      
      // Tentar criar usuário se não existir
      console.log('🔄 Tentando criar usuário de teste...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password,
        options: {
          data: {
            tenant_id: 'd7caffc1-c923-47c8-9301-ca9eeff1a243',
            role: 'admin',
            first_name: 'Admin',
            last_name: 'Teste'
          }
        }
      });
      
      if (signUpError) {
        console.error('❌ Erro ao criar usuário:', signUpError.message);
        return;
      }
      
      console.log('✅ Usuário criado:', {
        user_id: signUpData.user?.id.substring(0, 8),
        email: signUpData.user?.email,
        session_exists: !!signUpData.session
      });
      
      // Se usuário foi criado mas ainda não confirmado por email, tentar login direto
      if (!signUpData.session) {
        console.log('🔄 Usuário criado sem sessão, tentando login novamente...');
        const { data: retryAuth, error: retryError } = await supabase.auth.signInWithPassword({
          email: TEST_CREDENTIALS.email,
          password: TEST_CREDENTIALS.password,
        });
        
        if (retryError) {
          console.error('❌ Erro no retry login:', retryError.message);
          return;
        }
        
        // Usar dados do retry
        return await processarSessaoValida(retryAuth.user, retryAuth.session);
      }
      
      // Usar dados da criação
      return await processarSessaoValida(signUpData.user, signUpData.session);
    } else {
      // Login existente bem-sucedido
      return await processarSessaoValida(authData.user, authData.session);
    }

  } catch (error) {
    console.error('💥 ERRO CRÍTICO no teste:', error.message);
    console.error('Stack trace:', error.stack);
  }

  console.log('\n🏁 TESTE COMPLETO CONCLUÍDO');
  console.log('==============================');
}

// Executar teste
testarFluxoCompletoAuth().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
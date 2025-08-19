#!/usr/bin/env node
/**
 * Teste das APIs de distribuição com autenticação real
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://marajvabdwkpgopytvhh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';
const BACKEND_URL = 'http://127.0.0.1:3001';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testWithAuth() {
  console.log('🧪 TESTE COM AUTENTICAÇÃO REAL');
  console.log('==============================\n');

  try {
    // Tentar fazer login com usuário conhecido
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'carlos@renovedigital.com.br',
      password: 'Carlos455460@' // Senha de desenvolvimento
    });

    if (authError || !authData.session) {
      console.log('⚠️ Não foi possível fazer login automático');
      console.log('   Teste manual: acesse o frontend e faça login');
      console.log('   Em seguida, abra DevTools e execute:');
      console.log('   ```');
      console.log('   const session = await supabase.auth.getSession();');
      console.log('   console.log(session.data.session.access_token);');
      console.log('   ```');
      return;
    }

    const token = authData.session.access_token;
    console.log('✅ Login realizado com sucesso');
    console.log(`📋 Token: ${token.substring(0, 20)}...`);
    
    // Testar APIs com token real
    const pipelineId = 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8'; // Pipeline conhecida
    
    const tests = [
      {
        name: 'GET distribution-rule',
        method: 'GET',
        url: `${BACKEND_URL}/api/pipelines/${pipelineId}/distribution-rule`
      },
      {
        name: 'GET distribution-stats', 
        method: 'GET',
        url: `${BACKEND_URL}/api/pipelines/${pipelineId}/distribution-stats`
      },
      {
        name: 'POST distribution-test',
        method: 'POST',
        url: `${BACKEND_URL}/api/pipelines/${pipelineId}/distribution-test`
      }
    ];

    console.log('\n📋 Testando APIs com autenticação...');
    
    for (const test of tests) {
      try {
        const response = await fetch(test.url, {
          method: test.method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const responseText = await response.text();
        let responseJson = null;
        
        try {
          responseJson = JSON.parse(responseText);
        } catch {
          // Resposta não é JSON
        }

        console.log(`\n🧪 ${test.name}:`);
        console.log(`   Status: HTTP ${response.status} ${response.status < 400 ? '✅' : '❌'}`);
        
        if (response.status === 200 && responseJson) {
          console.log(`   Success: ${responseJson.success ? '✅' : '❌'}`);
          if (responseJson.data) {
            console.log(`   Data: ${JSON.stringify(responseJson.data).substring(0, 100)}...`);
          }
        } else if (response.status >= 400) {
          console.log(`   Error: ${responseText.substring(0, 200)}...`);
        }
        
      } catch (error) {
        console.log(`\n❌ ${test.name}: ${error.message}`);
      }
    }

    // Logout
    await supabase.auth.signOut();
    console.log('\n✅ Logout realizado');

  } catch (error) {
    console.error('❌ Erro durante teste:', error.message);
  }
}

// Executar teste
testWithAuth().catch(console.error);
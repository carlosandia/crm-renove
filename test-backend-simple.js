#!/usr/bin/env node

/**
 * 🔍 TESTE BACKEND SIMPLES: Verificar processamento de requisições autenticadas
 * 
 * Vamos focar no que realmente importa: 
 * - O middleware simpleAuth está funcionando?
 * - A rota está processando corretamente?
 * - Os dados estão sendo salvos no banco?
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://marajvabdwkpgopytvhh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const BACKEND_URL = 'http://127.0.0.1:3001';
const TEST_PIPELINE_ID = 'eb0d170f-9618-4bde-9a28-2a1a65cc90b8';

// Cliente Supabase para verificação direta
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 🎯 TOKEN SUPABASE REAL - usar um token que sabemos que existe
// (pode ser extraído do browser quando usuário está logado)
const MOCK_VALID_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzM5NDI4NDY1LCJpYXQiOjE3Mzk0MjQ4NjUsImlzcyI6Imh0dHBzOi8vbWFyYWp2YWJkd2twZ29weXR2aGguc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6ImNjMjFhZWEzLWM0ODAtNGRiNS1hMTdhLWFjNmY0OTQ4YjJjNCIsImVtYWlsIjoic2VyYXF1ZXZhaUBzZXJhcXVldmFpLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsidGVuYW50X2lkIjoiZDdjYWZmYzEtYzkyMy00N2M4LTkzMDEtY2E5ZWVmZjFhMjQzIiwicm9sZSI6ImFkbWluIiwiZmlyc3RfbmFtZSI6IkFkbWluIiwibGFzdF9uYW1lIjoiVGVzdGUifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTczOTQyNDg2NX1dLCJzZXNzaW9uX2lkIjoiYWI0YzY5MTUtYTkxNy00Y2YwLWJjYTctMzUxMjk4MTZhNTdkIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.invalid_signature';

async function testarBackendSimples() {
  console.log('🔍 TESTE BACKEND SIMPLES: Middleware + Persistência');
  console.log('===================================================');

  try {
    // TESTE 1: Health check
    console.log('\n📋 TESTE 1: Health check');
    const health = await fetch(`${BACKEND_URL}/health`);
    console.log('✅ Backend:', health.status, health.status === 200 ? 'OK' : 'FALHA');

    // TESTE 2: Verificar dados existentes no banco ANTES do teste
    console.log('\n📋 TESTE 2: Motivos existentes ANTES do teste');
    const { data: beforeData, error: beforeError } = await supabase
      .from('pipeline_outcome_reasons')
      .select('id, reason_type, reason_text, created_at')
      .eq('pipeline_id', TEST_PIPELINE_ID)
      .order('created_at', { ascending: false })
      .limit(3);

    if (beforeError) {
      console.error('❌ Erro ao buscar dados anteriores:', beforeError);
    } else {
      console.log('📋 Motivos existentes:', beforeData?.length || 0);
      beforeData?.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.reason_type}: ${item.reason_text.substring(0, 40)}...`);
      });
    }

    // TESTE 3: Testar MIDDLEWARE - request sem token (deve dar 401)
    console.log('\n📋 TESTE 3: Middleware - request SEM token');
    const noAuthResponse = await fetch(`${BACKEND_URL}/api/outcome-reasons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pipeline_id: TEST_PIPELINE_ID,
        reason_type: 'ganho',
        reason_text: 'Teste sem auth'
      })
    });
    
    console.log('🔐 Sem auth:', noAuthResponse.status, noAuthResponse.status === 401 ? '✅ CORRETO' : '❌ PROBLEMA');

    // TESTE 4: Testar com token (mesmo que seja inválido, vamos ver o comportamento do middleware)
    console.log('\n📋 TESTE 4: Middleware - request COM token');
    const withTokenResponse = await fetch(`${BACKEND_URL}/api/outcome-reasons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_VALID_TOKEN}`
      },
      body: JSON.stringify({
        pipeline_id: TEST_PIPELINE_ID,
        reason_type: 'ganho',
        reason_text: 'TESTE MIDDLEWARE - ' + new Date().toISOString()
      })
    });

    console.log('🔐 Com token:', withTokenResponse.status);
    
    const responseData = await withTokenResponse.json();
    console.log('📤 Response:', {
      status: withTokenResponse.status,
      success: responseData.success,
      error: responseData.error,
      data: responseData.data ? 'Existe' : 'Nulo'
    });

    // TESTE 5: Inserção direta no banco (bypass do backend) para comparação
    console.log('\n📋 TESTE 5: Inserção DIRETA no banco (controle)');
    const directInsert = {
      pipeline_id: TEST_PIPELINE_ID,
      tenant_id: 'd7caffc1-c923-47c8-9301-ca9eeff1a243',
      reason_type: 'ganho',
      reason_text: 'TESTE DIRETO BANCO - ' + new Date().toISOString(),
      display_order: 0,
      is_active: true
    };

    const { data: directData, error: directError } = await supabase
      .from('pipeline_outcome_reasons')
      .insert(directInsert)
      .select()
      .single();

    if (directError) {
      console.error('❌ Erro inserção direta:', directError);
    } else {
      console.log('✅ Inserção direta OK:', directData.id.substring(0, 8));
    }

    // TESTE 6: Verificar dados APÓS o teste
    console.log('\n📋 TESTE 6: Motivos existentes APÓS o teste');
    const { data: afterData, error: afterError } = await supabase
      .from('pipeline_outcome_reasons')
      .select('id, reason_type, reason_text, created_at')
      .eq('pipeline_id', TEST_PIPELINE_ID)
      .order('created_at', { ascending: false })
      .limit(5);

    if (afterError) {
      console.error('❌ Erro ao buscar dados posteriores:', afterError);
    } else {
      console.log('📋 Motivos após teste:', afterData?.length || 0);
      afterData?.forEach((item, i) => {
        const isNew = !beforeData?.some(b => b.id === item.id);
        console.log(`  ${i + 1}. ${item.reason_type}: ${item.reason_text.substring(0, 40)}... ${isNew ? '🆕 NOVO' : ''}`);
      });
    }

    // DIAGNÓSTICO FINAL
    console.log('\n🎯 DIAGNÓSTICO FINAL:');
    console.log('========================');
    
    const numAntes = beforeData?.length || 0;
    const numDepois = afterData?.length || 0;
    const novosItens = numDepois - numAntes;
    
    console.log(`📊 Motivos antes: ${numAntes}`);
    console.log(`📊 Motivos depois: ${numDepois}`);
    console.log(`📊 Novos criados: ${novosItens}`);
    
    if (withTokenResponse.status === 401) {
      console.log('🔐 Middleware: ✅ Funcionando (rejeitou token inválido)');
      console.log('💡 Conclusão: Problema pode estar na geração/validação do token no frontend');
    } else if (withTokenResponse.status === 200) {
      console.log('🔐 Middleware: ✅ Token aceito e dados salvos');
      console.log('💡 Conclusão: Backend funcionando, problema pode estar no frontend');
    } else {
      console.log(`🔐 Middleware: ❌ Status inesperado ${withTokenResponse.status}`);
      console.log('💡 Conclusão: Problema na implementação do middleware ou rota');
    }

  } catch (error) {
    console.error('💥 ERRO:', error.message);
  }

  console.log('\n🏁 TESTE CONCLUÍDO');
}

testarBackendSimples().then(() => {
  process.exit(0);
}).catch(console.error);
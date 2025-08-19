#!/usr/bin/env node

/**
 * 🔍 TESTE DE AUTENTICAÇÃO: Basic Supabase Authentication
 * 
 * Testar autenticação usando access_token do Supabase (não JWT)
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://marajvabdwkpgopytvhh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

const BACKEND_URL = 'http://127.0.0.1:3001';
const TEST_PIPELINE_ID = 'eb0d170f-9618-4bde-9a28-2a1a65cc90b8';

// Cliente Supabase para autenticação
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testarSupabaseAuth() {
  console.log('🔐 TESTANDO BASIC SUPABASE AUTHENTICATION');
  console.log('==========================================');

  try {
    // TESTE 1: Health check
    console.log('\n📋 TESTE 1: Health check do backend');
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Backend health:', healthResponse.status, healthData);

    // TESTE 2: Criar sessão Supabase válida (simular usuário logado)
    console.log('\n📋 TESTE 2: Fazer login no Supabase para obter token válido');
    
    // ⚠️ Para o teste funcionar, precisaríamos de credenciais válidas
    // Por enquanto, vou simular verificando se há usuário ativo
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('User atual:', user ? `${user.email} (${user.id.substring(0, 8)})` : 'Nenhum');
    
    if (user) {
      // TESTE 3: Obter token de acesso válido
      console.log('\n📋 TESTE 3: Obter token de acesso Supabase');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ Erro ao obter sessão:', sessionError);
        return;
      }
      
      console.log('✅ Token obtido:', {
        user_id: user.id.substring(0, 8),
        email: user.email,
        tenant_id: user.user_metadata?.tenant_id?.substring(0, 8) || 'N/A',
        role: user.user_metadata?.role || 'N/A',
        token_length: session.access_token?.length || 0
      });

      // TESTE 4: Testar criação de motivo COM autenticação válida
      console.log('\n📋 TESTE 4: Criar motivo COM token Supabase válido');
      const authResponse = await fetch(`${BACKEND_URL}/api/outcome-reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          pipeline_id: TEST_PIPELINE_ID,
          reason_type: 'ganho',
          reason_text: 'TESTE AUTH SUPABASE - ' + new Date().toISOString()
        })
      });
      
      const authData = await authResponse.json();
      console.log('🎯 Resultado com auth:', {
        status: authResponse.status,
        success: authData.success,
        data: authData.data ? `ID: ${authData.data.id?.substring(0, 8)}` : null,
        error: authData.error
      });
      
      if (authResponse.status === 200 || authResponse.status === 201) {
        console.log('🎉 SUCESSO! Motivo criado com autenticação válida');
        
        // TESTE 5: Verificar se motivo persistiu
        console.log('\n📋 TESTE 5: Verificar persistência do motivo criado');
        const listResponse = await fetch(`${BACKEND_URL}/api/outcome-reasons?pipeline_id=${TEST_PIPELINE_ID}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        const listData = await listResponse.json();
        console.log('📋 Motivos listados:', {
          status: listResponse.status,
          count: listData.data?.length || 0,
          success: listData.success
        });
        
        if (listData.data && listData.data.length > 0) {
          console.log('✅ PERSISTÊNCIA CONFIRMADA! Motivos estão salvos no banco');
          listData.data.slice(0, 3).forEach((reason, i) => {
            console.log(`  ${i + 1}. ${reason.reason_type}: ${reason.reason_text.substring(0, 50)}...`);
          });
        } else {
          console.log('❌ PROBLEMA: Motivos não estão persistindo após criação');
        }
        
      } else {
        console.log('❌ FALHA na criação com auth:', authData);
      }
      
    } else {
      console.log('⚠️ Nenhum usuário logado - testando apenas endpoints sem auth');
    }

    // TESTE EXTRA: Sem autenticação (deve retornar 401)
    console.log('\n📋 TESTE EXTRA: Criar motivo SEM autenticação (deve ser 401)');
    const noAuthResponse = await fetch(`${BACKEND_URL}/api/outcome-reasons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pipeline_id: TEST_PIPELINE_ID,
        reason_type: 'ganho',
        reason_text: 'Teste sem auth'
      })
    });
    const noAuthData = await noAuthResponse.json();
    console.log('❌ Sem auth (esperado 401):', noAuthResponse.status, noAuthData.error);

  } catch (error) {
    console.error('💥 ERRO no teste:', error.message);
  }

  console.log('\n🏁 TESTE DE AUTENTICAÇÃO SUPABASE CONCLUÍDO');
}

testarSupabaseAuth().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
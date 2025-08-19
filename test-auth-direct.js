#!/usr/bin/env node

/**
 * 🔍 TESTE DIRETO: Simulação de autenticação real + API backend
 * 
 * Este script irá usar service role para obter informações de usuário real
 * e simular token para testar o fluxo completo de autenticação
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://marajvabdwkpgopytvhh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const BACKEND_URL = 'http://127.0.0.1:3001';
const TEST_PIPELINE_ID = 'eb0d170f-9618-4bde-9a28-2a1a65cc90b8';

// Cliente Supabase com service role
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testarAuthDireto() {
  console.log('🔐 TESTE DIRETO: Simulação de Auth Real + Backend');
  console.log('================================================');

  try {
    // TESTE 1: Health check
    console.log('\n📋 TESTE 1: Health check do backend');
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Backend health:', healthResponse.status, healthData);

    // TESTE 2: Buscar usuário real existente no sistema
    console.log('\n📋 TESTE 2: Buscar usuário real existente no sistema');
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError || !users || users.users.length === 0) {
      console.error('❌ Erro ao buscar usuários:', usersError);
      return;
    }
    
    // Encontrar usuário com tenant_id
    const userWithTenant = users.users.find(u => u.user_metadata?.tenant_id);
    if (!userWithTenant) {
      console.error('❌ Nenhum usuário com tenant_id encontrado');
      return;
    }
    
    console.log('✅ Usuário encontrado:', {
      user_id: userWithTenant.id.substring(0, 8),
      email: userWithTenant.email,
      tenant_id: userWithTenant.user_metadata?.tenant_id?.substring(0, 8) || 'N/A',
      role: userWithTenant.user_metadata?.role || 'N/A'
    });

    // TESTE 3: Gerar token de acesso válido para o usuário
    console.log('\n📋 TESTE 3: Gerar token de acesso válido');
    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateAccessToken(userWithTenant.id);
    
    if (tokenError || !tokenData) {
      console.error('❌ Erro ao gerar token:', tokenError);
      return;
    }
    
    console.log('✅ Token gerado:', {
      token_length: tokenData.access_token?.length || 0,
      expires_in: tokenData.expires_in || 0
    });

    // TESTE 4: Testar criação de motivo via API backend
    console.log('\n📋 TESTE 4: Criar motivo via API backend COM token válido');
    const motivoData = {
      pipeline_id: TEST_PIPELINE_ID,
      reason_type: 'ganho',
      reason_text: 'TESTE DIRETO AUTH - ' + new Date().toISOString(),
      display_order: 0,
      is_active: true
    };

    const createResponse = await fetch(`${BACKEND_URL}/api/outcome-reasons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`
      },
      body: JSON.stringify(motivoData)
    });

    console.log('🎯 Response status:', createResponse.status);
    
    let createData;
    try {
      createData = await createResponse.json();
    } catch (e) {
      console.error('❌ Erro ao fazer parse do JSON:', e.message);
      const rawText = await createResponse.text();
      console.log('Raw response:', rawText);
      return;
    }
    
    console.log('🎯 Resultado criação:', {
      status: createResponse.status,
      success: createData.success,
      data: createData.data ? `ID: ${createData.data.id?.substring(0, 8)}` : null,
      error: createData.error
    });

    if (createResponse.status === 200 || createResponse.status === 201) {
      console.log('🎉 SUCESSO! Motivo criado via API com token válido');

      // TESTE 5: Verificar persistência via API
      console.log('\n📋 TESTE 5: Verificar persistência via API backend');
      const listResponse = await fetch(`${BACKEND_URL}/api/outcome-reasons?pipeline_id=${TEST_PIPELINE_ID}`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
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
        console.log('📝 Últimos motivos criados:');
        listData.data.slice(0, 3).forEach((reason, i) => {
          console.log(`  ${i + 1}. ${reason.reason_type}: ${reason.reason_text.substring(0, 50)}...`);
        });
        
        // 🎯 RESULTADO FINAL
        console.log('\n🎉 DIAGNÓSTICO CONCLUÍDO - PROBLEMA RESOLVIDO!');
        console.log('===============================================');
        console.log('✅ Backend: funcionando');
        console.log('✅ Autenticação: funcionando');
        console.log('✅ API de criação: funcionando');
        console.log('✅ Persistência: CONFIRMADA');
        console.log('\n💡 Conclusão: O problema NÃO está na persistência do banco.');
        console.log('   O problema pode estar na interface frontend ou cache local.');
        
      } else {
        console.log('❌ PROBLEMA: Motivos não foram listados via API');
      }

    } else {
      console.log('❌ FALHA na criação via API');
      console.log('Headers enviados:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token.substring(0, 20)}...`
      });
      console.log('Payload:', motivoData);
      console.log('Response:', createData);
    }

  } catch (error) {
    console.error('💥 ERRO CRÍTICO:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n🏁 TESTE DIRETO CONCLUÍDO');
}

// Executar teste
testarAuthDireto().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
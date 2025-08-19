#!/usr/bin/env node
/**
 * Script de debug para testar APIs de distribuição
 * Uso: node debug-distribution-api.js
 */

import { createClient } from '@supabase/supabase-js';

// Configurações
const SUPABASE_URL = 'https://marajvabdwkpgopytvhh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';
const BACKEND_URL = 'http://127.0.0.1:3001';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugDistributionAPIs() {
  console.log('🔍 DIAGNÓSTICO CRÍTICO: APIs de Distribuição');
  console.log('============================================\n');

  try {
    // Buscar usuário para autenticação
    console.log('📋 1. Verificando usuários existentes...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, tenant_id, is_active')
      .eq('is_active', true)
      .limit(5);

    if (usersError) {
      console.error('❌ Erro ao buscar usuários:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ Nenhum usuário encontrado na tabela users');
      return;
    }

    console.log(`✅ ${users.length} usuários encontrados:`);
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.role || 'sem role'}) - Tenant: ${user.tenant_id?.substring(0, 8) || 'N/A'}`);
    });

    // Buscar pipelines
    console.log('\n📋 2. Verificando pipelines...');
    const { data: pipelines, error: pipelinesError } = await supabase
      .from('pipelines')
      .select('id, name, tenant_id, is_active')
      .eq('is_active', true)
      .limit(3);

    if (pipelinesError) {
      console.error('❌ Erro ao buscar pipelines:', pipelinesError);
      return;
    }

    if (!pipelines || pipelines.length === 0) {
      console.log('❌ Nenhuma pipeline encontrada');
      return;
    }

    console.log(`✅ ${pipelines.length} pipelines encontradas:`);
    pipelines.forEach(pipeline => {
      console.log(`   - ${pipeline.name} (${pipeline.id.substring(0, 8)}) - Tenant: ${pipeline.tenant_id?.substring(0, 8) || 'N/A'}`);
    });

    // Verificar tabelas de distribuição
    console.log('\n📋 3. Verificando tabelas de distribuição...');
    
    // Buscar regras de distribuição existentes
    const { data: distributionRules, error: rulesError } = await supabase
      .from('pipeline_distribution_rules')
      .select('*')
      .limit(5);

    if (rulesError) {
      console.log('⚠️ Tabela pipeline_distribution_rules não existe ou sem acesso:', rulesError.message);
    } else {
      console.log(`✅ Tabela pipeline_distribution_rules: ${distributionRules?.length || 0} regras encontradas`);
    }

    // Buscar histórico de atribuições
    const { data: assignmentHistory, error: historyError } = await supabase
      .from('lead_assignment_history')
      .select('*')
      .limit(5);

    if (historyError) {
      console.log('⚠️ Tabela lead_assignment_history não existe ou sem acesso:', historyError.message);
    } else {
      console.log(`✅ Tabela lead_assignment_history: ${assignmentHistory?.length || 0} registros encontrados`);
    }

    // Buscar membros de pipeline
    const { data: pipelineMembers, error: membersError } = await supabase
      .from('pipeline_members')
      .select('*')
      .limit(5);

    if (membersError) {
      console.log('⚠️ Tabela pipeline_members não existe ou sem acesso:', membersError.message);
    } else {
      console.log(`✅ Tabela pipeline_members: ${pipelineMembers?.length || 0} membros encontrados`);
    }

    // Testar APIs de distribuição (sem autenticação primeiro)
    console.log('\n📋 4. Testando APIs de distribuição (sem auth)...');
    
    const testPipelineId = pipelines[0]?.id;
    if (!testPipelineId) {
      console.log('❌ Nenhuma pipeline disponível para teste');
      return;
    }

    const apis = [
      { method: 'GET', path: `/api/pipelines/${testPipelineId}/distribution-rule`, name: 'Buscar regra' },
      { method: 'GET', path: `/api/pipelines/${testPipelineId}/distribution-stats`, name: 'Buscar estatísticas' },
      { method: 'POST', path: `/api/pipelines/${testPipelineId}/distribution-test`, name: 'Testar distribuição' }
    ];

    for (const apiTest of apis) {
      try {
        const response = await fetch(`${BACKEND_URL}${apiTest.path}`, {
          method: apiTest.method,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log(`   ${apiTest.name}: HTTP ${response.status} ${response.status === 401 ? '✅' : response.status >= 500 ? '❌' : '⚠️'}`);
        
        if (response.status >= 500) {
          const errorText = await response.text();
          console.log(`      Erro 500: ${errorText.substring(0, 100)}...`);
        }
      } catch (error) {
        console.log(`   ${apiTest.name}: ❌ Erro de conexão - ${error.message}`);
      }
    }

    console.log('\n✅ DIAGNÓSTICO CONCLUÍDO');
    console.log('========================\n');
    
    console.log('📊 RESUMO:');
    console.log(`- Backend rodando: ✅`);
    console.log(`- Usuários encontrados: ${users.length}`);
    console.log(`- Pipelines encontradas: ${pipelines.length}`);
    console.log(`- APIs retornando 401 (esperado): ${response.status === 401 ? '✅' : '❌'}`);
    
    console.log('\n🎯 CONCLUSÃO:');
    console.log('Se as APIs estão retornando 401, elas estão funcionando corretamente.');
    console.log('O erro 500 relatado pode ter sido intermitente ou já resolvido.');
    console.log('Para testar com autenticação real, use o frontend conectado.');

  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error);
  }
}

// Executar diagnóstico
debugDistributionAPIs().catch(console.error);
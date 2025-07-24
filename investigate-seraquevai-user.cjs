// Investigar usuário seraquevai@seraquevai.com
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateSeraquevaiUser() {
  console.log('🔍 INVESTIGANDO USUÁRIO seraquevai@seraquevai.com\n');
  
  try {
    // 1. Buscar dados do usuário
    console.log('👤 Buscando dados do usuário...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'seraquevai@seraquevai.com')
      .single();
      
    if (userError) {
      console.error('❌ Erro ao buscar usuário:', userError.message);
      return;
    }
    
    if (!user) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    console.log('✅ Usuário encontrado:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nome: ${user.first_name} ${user.last_name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Tenant ID: ${user.tenant_id}`);
    console.log(`   Ativo: ${user.is_active}`);
    console.log(`   Criado em: ${user.created_at}`);
    
    // 2. Buscar pipelines que o usuário deveria ver
    console.log(`\n📋 Buscando pipelines do tenant ${user.tenant_id}...`);
    const { data: tenantPipelines, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id, name, tenant_id, created_by, is_active, description')
      .eq('tenant_id', user.tenant_id);
      
    if (pipelineError) {
      console.error('❌ Erro ao buscar pipelines do tenant:', pipelineError.message);
    } else {
      console.log(`📊 Pipelines do tenant encontradas: ${tenantPipelines?.length || 0}`);
      if (tenantPipelines && tenantPipelines.length > 0) {
        tenantPipelines.forEach((p, index) => {
          const isArchived = !p.is_active || (p.description?.includes('[ARCHIVED:') || false);
          console.log(`   ${index + 1}. "${p.name}" (${p.id})`);
          console.log(`      Status: ${isArchived ? '📦 ARQUIVADA' : '✅ ATIVA'}`);
          console.log(`      is_active: ${p.is_active}`);
          console.log(`      created_by: ${p.created_by}`);
        });
      }
    }
    
    // 3. Buscar todas as pipelines visíveis (sem filtro de tenant)
    console.log('\n📊 Verificando todas as pipelines visíveis...');
    const { data: allPipelines, error: allError } = await supabase
      .from('pipelines')
      .select('id, name, tenant_id, created_by, is_active')
      .limit(20);
      
    if (allError) {
      console.error('❌ Erro ao buscar todas as pipelines:', allError.message);
    } else {
      console.log(`📊 Total de pipelines no sistema: ${allPipelines?.length || 0}`);
      
      // Agrupar por tenant_id
      const tenantGroups = {};
      allPipelines?.forEach(p => {
        if (!tenantGroups[p.tenant_id]) {
          tenantGroups[p.tenant_id] = [];
        }
        tenantGroups[p.tenant_id].push(p);
      });
      
      console.log('\n📊 Distribuição por tenant:');
      Object.entries(tenantGroups).forEach(([tenantId, pipelines]) => {
        const isUserTenant = tenantId === user.tenant_id;
        console.log(`   ${isUserTenant ? '✅' : '⚠️'} ${tenantId}: ${pipelines.length} pipelines`);
        if (isUserTenant) {
          pipelines.forEach(p => console.log(`      - ${p.name} (ativa: ${p.is_active})`));
        }
      });
    }
    
    // 4. Testar arquivamento em uma pipeline específica
    const testPipelineIds = [
      '1f8cbd83-f437-4097-aa13-967377109f40', // ID do erro no console
      'bb8f481-23c9-44dc-9a4c-a4da797f739c'    // Outro ID do erro
    ];
    
    for (const pipelineId of testPipelineIds) {
      console.log(`\n🧪 Testando pipeline ${pipelineId}...`);
      
      const { data: testPipeline, error: testError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('id', pipelineId)
        .single();
        
      if (testError) {
        console.log(`   ❌ Pipeline não encontrada: ${testError.message}`);
        continue;
      }
      
      console.log(`   ✅ Pipeline encontrada: "${testPipeline.name}"`);
      console.log(`   📊 Tenant ID: ${testPipeline.tenant_id}`);
      console.log(`   👤 Created by: ${testPipeline.created_by}`);
      console.log(`   ⚡ Status: is_active=${testPipeline.is_active}`);
      console.log(`   🏢 Pertence ao usuário: ${testPipeline.tenant_id === user.tenant_id ? '✅ SIM' : '❌ NÃO'}`);
      
      // Testar update simples
      if (testPipeline.tenant_id === user.tenant_id) {
        console.log(`   🔧 Testando update na pipeline...`);
        
        const { data: updateTest, error: updateError } = await supabase
          .from('pipelines')
          .update({
            updated_at: new Date().toISOString()
          })
          .eq('id', pipelineId)
          .select();
          
        if (updateError) {
          console.log(`   ❌ Erro no update: ${updateError.message}`);
          console.log(`   🔍 Detalhes: ${JSON.stringify(updateError)}`);
        } else {
          console.log(`   ✅ Update funcionou! Registros afetados: ${updateTest?.length || 0}`);
        }
      }
    }
    
    // 5. Verificar RLS policies
    console.log('\n🔒 Verificando possíveis problemas de RLS...');
    
    // Tentar buscar com diferentes abordagens
    const testUpdates = [
      {
        name: 'Update simples sem filtros',
        query: () => supabase.from('pipelines').update({ updated_at: new Date().toISOString() }).eq('id', '00000000-0000-0000-0000-000000000000')
      },
      {
        name: 'Select com filtro de tenant',
        query: () => supabase.from('pipelines').select('id').eq('tenant_id', user.tenant_id).limit(1)
      }
    ];
    
    for (const test of testUpdates) {
      try {
        const { data, error } = await test.query();
        if (error) {
          console.log(`   ❌ ${test.name}: ${error.message}`);
        } else {
          console.log(`   ✅ ${test.name}: OK`);
        }
      } catch (err) {
        console.log(`   ❌ ${test.name}: ${err.message}`);
      }
    }
    
    console.log('\n🎯 RECOMENDAÇÕES:');
    console.log('1. Verificar se RLS está bloqueando updates');
    console.log('2. Confirmar tenant_id do usuário vs pipelines');
    console.log('3. Testar com pipeline do tenant correto');
    console.log('4. Verificar permissões do usuário no Supabase');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

investigateSeraquevaiUser().catch(console.error);
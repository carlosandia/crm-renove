// Script para investigar e corrigir o problema de tenant_id
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTenantMismatch() {
  console.log('🔍 INVESTIGANDO PROBLEMA DE TENANT_ID\n');
  
  try {
    // 1. Verificar usuário teste3@teste3.com
    console.log('👤 Verificando usuário teste3@teste3.com...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'teste3@teste3.com')
      .single();
      
    if (userError) {
      console.error('❌ Erro ao buscar usuário:', userError.message);
      return;
    }
    
    console.log('✅ Usuário encontrado:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Tenant ID: ${user.tenant_id}`);
    console.log(`   Role: ${user.role}`);
    
    // 2. Buscar pipelines da interface (que aparecem para o usuário)
    console.log('\n📋 Buscando pipelines que aparecem na interface...');
    
    // Pipelines que o usuário vê (provavelmente filtradas incorretamente)
    const { data: visiblePipelines, error: visibleError } = await supabase
      .from('pipelines')
      .select('id, name, tenant_id, created_by, is_active')
      .limit(10);
      
    if (visibleError) {
      console.error('❌ Erro ao buscar pipelines visíveis:', visibleError.message);
      return;
    }
    
    console.log(`📊 Total de pipelines encontradas: ${visiblePipelines.length}`);
    
    // Analisar tenant_ids
    const tenantStats = {};
    visiblePipelines.forEach(p => {
      if (!tenantStats[p.tenant_id]) {
        tenantStats[p.tenant_id] = { count: 0, names: [] };
      }
      tenantStats[p.tenant_id].count++;
      tenantStats[p.tenant_id].names.push(p.name);
    });
    
    console.log('\n📊 Distribuição por tenant_id:');
    Object.entries(tenantStats).forEach(([tenantId, stats]) => {
      const isUserTenant = tenantId === user.tenant_id;
      console.log(`   ${isUserTenant ? '✅' : '❌'} ${tenantId}: ${stats.count} pipelines`);
      if (stats.count <= 5) {
        stats.names.forEach(name => console.log(`      - ${name}`));
      }
    });
    
    // 3. Verificar pipelines do tenant correto do usuário
    console.log(`\n🎯 Buscando pipelines do tenant do usuário (${user.tenant_id})...`);
    const { data: correctTenantPipelines, error: correctError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('tenant_id', user.tenant_id);
      
    if (correctError) {
      console.error('❌ Erro ao buscar pipelines do tenant correto:', correctError.message);
    } else {
      console.log(`✅ Pipelines do tenant correto: ${correctTenantPipelines?.length || 0}`);
      if (correctTenantPipelines && correctTenantPipelines.length > 0) {
        correctTenantPipelines.forEach(p => {
          console.log(`   - ${p.name} (${p.id}) - is_active: ${p.is_active}`);
        });
      }
    }
    
    // 4. Identificar o problema específico
    console.log('\n🔍 DIAGNÓSTICO:');
    
    const userTenantPipelineCount = tenantStats[user.tenant_id]?.count || 0;
    const otherTenantCount = Object.keys(tenantStats).length - (userTenantPipelineCount > 0 ? 1 : 0);
    
    if (otherTenantCount > 0) {
      console.log('❌ PROBLEMA IDENTIFICADO: Usuário vê pipelines de outros tenants');
      console.log('   Causa provável: Filtro de tenant_id não está sendo aplicado no frontend');
      console.log('   Solução: Corrigir filtro no usePipelineData ou no backend');
    }
    
    if (userTenantPipelineCount === 0) {
      console.log('⚠️  PROBLEMA: Usuário não tem pipelines no seu tenant');
      console.log('   Solução: Criar pipelines para o tenant do usuário ou verificar permissões');
    }
    
    // 5. Criar pipeline de teste para o tenant correto se necessário
    if (userTenantPipelineCount === 0) {
      console.log('\n🔧 Criando pipeline de teste para o tenant correto...');
      
      const { data: newPipeline, error: createError } = await supabase
        .from('pipelines')
        .insert({
          name: 'Pipeline Teste Arquivamento',
          description: 'Pipeline criada para teste de arquivamento',
          tenant_id: user.tenant_id,
          created_by: user.email,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (createError) {
        console.error('❌ Erro ao criar pipeline de teste:', createError.message);
      } else {
        console.log('✅ Pipeline de teste criada:');
        console.log(`   Nome: ${newPipeline.name}`);
        console.log(`   ID: ${newPipeline.id}`);
        console.log(`   Tenant ID: ${newPipeline.tenant_id}`);
      }
    }
    
    // 6. Soluções recomendadas
    console.log('\n💡 SOLUÇÕES RECOMENDADAS:');
    console.log('1. ✅ Verificar filtro de tenant_id no usePipelineData.ts');
    console.log('2. ✅ Garantir que apenas pipelines do tenant do usuário sejam carregadas');
    console.log('3. ✅ Usar pipeline do tenant correto para testes');
    console.log('4. ✅ Verificar RLS (Row Level Security) no Supabase');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

fixTenantMismatch().catch(console.error);
// Teste para verificar sincronia entre frontend e backend
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFrontendBackendSync() {
  console.log('🔄 TESTE: Sincronia Frontend x Backend\n');
  
  try {
    const userTenantId = 'd7caffc1-c923-47c8-9301-ca9eeff1a243';
    
    // 1. Buscar exatamente como o usePipelineData faz
    console.log('📋 Simulando usePipelineData...');
    const { data: pipelinesData, error: pipelinesError } = await supabase
      .from('pipelines')
      .select(`
        id,
        name,
        description,
        tenant_id,
        created_by,
        is_active,
        created_at,
        updated_at
      `)
      .eq('tenant_id', userTenantId)
      .order('created_at', { ascending: false });
      
    if (pipelinesError) {
      console.error('❌ Erro no usePipelineData:', pipelinesError.message);
      return;
    }
    
    console.log(`✅ usePipelineData retornou: ${pipelinesData?.length || 0} pipelines`);
    
    // 2. Verificar se a pipeline problemática está na lista
    const problemPipelineId = '1f81cb63-f437-4897-aa13-9b7377109f40';
    const problemPipeline = pipelinesData?.find(p => p.id === problemPipelineId);
    
    if (problemPipeline) {
      console.log('\n🎯 Pipeline problemática encontrada na lista:');
      console.log(`   Nome: ${problemPipeline.name}`);
      console.log(`   ID: ${problemPipeline.id}`);
      console.log(`   Tenant ID: ${problemPipeline.tenant_id}`);
      console.log(`   Is Active: ${problemPipeline.is_active}`);
      console.log(`   Description: ${problemPipeline.description}`);
      
      // 3. Simular busca individual (como handleArchivePipeline faz)
      console.log('\n🔍 Simulando busca individual...');
      const { data: individualData, error: individualError } = await supabase
        .from('pipelines')
        .select('description, tenant_id, is_active, name')
        .eq('id', problemPipelineId)
        .single();
        
      if (individualError) {
        console.error('❌ Erro na busca individual:', individualError.message);
      } else {
        console.log('✅ Busca individual funcionou:');
        console.log('📊 Dados retornados:', individualData);
        
        // 4. Comparar dados
        console.log('\n🔍 Comparação de dados:');
        console.log('Lista vs Individual:');
        console.log(`   Tenant ID (lista): ${problemPipeline.tenant_id}`);
        console.log(`   Tenant ID (individual): ${individualData.tenant_id}`);
        console.log(`   Is Active (lista): ${problemPipeline.is_active}`);
        console.log(`   Is Active (individual): ${individualData.is_active}`);
        console.log(`   Description (lista): ${problemPipeline.description}`);
        console.log(`   Description (individual): ${individualData.description}`);
        
        const dataConsistent = (
          problemPipeline.tenant_id === individualData.tenant_id &&
          problemPipeline.is_active === individualData.is_active &&
          problemPipeline.description === individualData.description
        );
        
        console.log(`🎯 Dados consistentes: ${dataConsistent ? '✅ SIM' : '❌ NÃO'}`);
        
        // 5. Testar update se os dados estão consistentes
        if (dataConsistent && individualData.tenant_id) {
          console.log('\n🔧 Testando update...');
          
          const { data: updateResult, error: updateError } = await supabase
            .from('pipelines')
            .update({
              updated_at: new Date().toISOString()
            })
            .eq('id', problemPipelineId)
            .select();
            
          if (updateError) {
            console.error('❌ Erro no update:', updateError.message);
            console.error('   Details:', updateError.details);
          } else {
            console.log('✅ Update funcionou!');
            console.log(`📊 Registros afetados: ${updateResult?.length || 0}`);
            
            if (updateResult && updateResult.length === 0) {
              console.log('⚠️ Update não afetou registros - possível problema de RLS');
            }
          }
        } else {
          console.log('❌ Não testando update devido a dados inconsistentes');
        }
      }
    } else {
      console.log('\n❌ Pipeline problemática NÃO encontrada na lista do usePipelineData');
      console.log('   Isso pode indicar problema no filtro ou cache');
      
      // Buscar todas as pipelines sem filtro para debug
      console.log('\n🔍 Buscando todas as pipelines (sem filtro)...');
      const { data: allPipelines, error: allError } = await supabase
        .from('pipelines')
        .select('id, name, tenant_id')
        .limit(20);
        
      if (!allError && allPipelines) {
        console.log(`📊 Total de pipelines no sistema: ${allPipelines.length}`);
        const targetPipeline = allPipelines.find(p => p.id === problemPipelineId);
        if (targetPipeline) {
          console.log(`🎯 Pipeline encontrada com tenant: ${targetPipeline.tenant_id}`);
          console.log(`   Deveria aparecer: ${targetPipeline.tenant_id === userTenantId ? '✅ SIM' : '❌ NÃO'}`);
        } else {
          console.log('❌ Pipeline não encontrada em lugar nenhum');
        }
      }
    }
    
    console.log('\n💡 DIAGNÓSTICO:');
    if (problemPipeline && problemPipeline.tenant_id) {
      console.log('✅ Pipeline está sendo carregada corretamente pelo usePipelineData');
      console.log('❓ Problema pode estar no handleArchivePipeline ou no estado do React');
      console.log('🔧 Sugestão: Verificar se o estado está sendo atualizado corretamente');
    } else {
      console.log('❌ Pipeline não está sendo carregada pelo usePipelineData');
      console.log('🔧 Sugestão: Verificar filtros e cache');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testFrontendBackendSync().catch(console.error);
// Debug da pipeline específica que está falhando
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSpecificPipeline() {
  console.log('🔍 DEBUG: Pipeline específica que está falhando\n');
  
  try {
    const pipelineId = '1f81cb63-f437-4897-aa13-9b7377109f40';
    const userTenantId = 'd7caffc1-c923-47c8-9301-ca9eeff1a243';
    
    console.log(`🎯 Pipeline ID: ${pipelineId}`);
    console.log(`🏢 User Tenant ID: ${userTenantId}`);
    
    // 1. Tentar buscar a pipeline com diferentes selects
    console.log('\n📋 Teste 1: Select completo...');
    const { data: fullData, error: fullError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('id', pipelineId);
      
    if (fullError) {
      console.error('❌ Erro no select completo:', fullError.message);
    } else {
      console.log(`✅ Select completo retornou: ${fullData?.length || 0} registros`);
      if (fullData && fullData.length > 0) {
        const pipeline = fullData[0];
        console.log('📊 Dados completos da pipeline:');
        console.log(`   ID: ${pipeline.id}`);
        console.log(`   Nome: ${pipeline.name}`);
        console.log(`   Tenant ID: ${pipeline.tenant_id}`);
        console.log(`   Created by: ${pipeline.created_by}`);
        console.log(`   Is active: ${pipeline.is_active}`);
        console.log(`   Description: ${pipeline.description || 'Sem descrição'}`);
        console.log(`   Created at: ${pipeline.created_at}`);
        console.log(`   Updated at: ${pipeline.updated_at}`);
      }
    }
    
    // 2. Tentar select específico como o frontend
    console.log('\n📋 Teste 2: Select específico (como frontend)...');
    const { data: specificData, error: specificError } = await supabase
      .from('pipelines')
      .select('description, tenant_id, is_active, name')
      .eq('id', pipelineId)
      .single();
      
    if (specificError) {
      console.error('❌ Erro no select específico:', specificError.message);
      console.error('   Details:', specificError.details);
      console.error('   Hint:', specificError.hint);
      console.error('   Code:', specificError.code);
    } else {
      console.log('✅ Select específico funcionou!');
      console.log('📊 Dados retornados:', specificData);
    }
    
    // 3. Tentar select sem single()
    console.log('\n📋 Teste 3: Select sem single()...');
    const { data: noSingleData, error: noSingleError } = await supabase
      .from('pipelines')
      .select('description, tenant_id, is_active, name')
      .eq('id', pipelineId);
      
    if (noSingleError) {
      console.error('❌ Erro no select sem single:', noSingleError.message);
    } else {
      console.log(`✅ Select sem single retornou: ${noSingleData?.length || 0} registros`);
      if (noSingleData && noSingleData.length > 0) {
        console.log('📊 Primeiro registro:', noSingleData[0]);
      }
    }
    
    // 4. Verificar se a pipeline existe e pertence ao tenant
    if (fullData && fullData.length > 0) {
      const pipeline = fullData[0];
      const belongsToUser = pipeline.tenant_id === userTenantId;
      
      console.log('\n🔍 Análise de Permissões:');
      console.log(`   Pipeline existe: ✅ SIM`);
      console.log(`   Tenant ID pipeline: ${pipeline.tenant_id}`);
      console.log(`   Tenant ID usuário: ${userTenantId}`);
      console.log(`   Pertence ao usuário: ${belongsToUser ? '✅ SIM' : '❌ NÃO'}`);
      
      if (belongsToUser) {
        // 5. Testar update simples
        console.log('\n🔧 Teste 4: Update simples...');
        const { data: updateData, error: updateError } = await supabase
          .from('pipelines')
          .update({
            updated_at: new Date().toISOString()
          })
          .eq('id', pipelineId)
          .select();
          
        if (updateError) {
          console.error('❌ Erro no update simples:', updateError.message);
          console.error('   Details:', updateError.details);
          console.error('   Hint:', updateError.hint);
        } else {
          console.log('✅ Update simples funcionou!');
          console.log(`📊 Registros afetados: ${updateData?.length || 0}`);
        }
        
        // 6. Testar update de arquivamento exato
        console.log('\n🔧 Teste 5: Update de arquivamento...');
        const archiveMetadata = `[ARCHIVED:${new Date().toISOString()}:seraquevai@seraquevai.com]`;
        const testDescription = `${archiveMetadata} ${pipeline.description || ''}`.trim();
        
        const { data: archiveData, error: archiveError } = await supabase
          .from('pipelines')
          .update({
            is_active: false,
            description: testDescription,
            updated_at: new Date().toISOString()
          })
          .eq('id', pipelineId)
          .select();
          
        if (archiveError) {
          console.error('❌ Erro no update de arquivamento:', archiveError.message);
          console.error('   Details:', archiveError.details);
          console.error('   Hint:', archiveError.hint);
        } else {
          console.log('✅ Update de arquivamento funcionou!');
          console.log(`📊 Registros afetados: ${archiveData?.length || 0}`);
          
          // Limpar teste - desarquivar
          console.log('\n🔄 Limpeza: Desarquivando...');
          await supabase
            .from('pipelines')
            .update({
              is_active: true,
              description: pipeline.description,
              updated_at: new Date().toISOString()
            })
            .eq('id', pipelineId);
          console.log('✅ Estado original restaurado');
        }
        
      } else {
        console.log('\n❌ PROBLEMA: Pipeline não pertence ao tenant do usuário');
        console.log('   Solução: Verificar filtros no frontend para não mostrar esta pipeline');
      }
    } else {
      console.log('\n❌ PROBLEMA: Pipeline não encontrada');
      console.log('   Possíveis causas:');
      console.log('   1. ID incorreto');
      console.log('   2. RLS bloqueando acesso');
      console.log('   3. Pipeline foi deletada');
    }
    
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    if (specificError) {
      console.log('1. ❌ Corrigir erro no select específico do frontend');
      console.log('2. 🔍 Verificar RLS policies no Supabase');
      console.log('3. 🛠️ Usar select sem single() como workaround');
    } else {
      console.log('1. ✅ Select funcionando - problema pode ser no update');
      console.log('2. 🔧 Verificar condições do update no frontend');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

debugSpecificPipeline().catch(console.error);
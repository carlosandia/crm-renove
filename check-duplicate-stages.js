// Script para verificar etapas duplicadas nas pipelines
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Verificando etapas duplicadas...\n');

async function checkDuplicateStages() {
  try {
    // Buscar pipelines do test-tenant
    const { data: pipelines, error: pipelinesError } = await supabase
      .from('pipelines')
      .select('id, name')
      .eq('tenant_id', 'test-tenant');

    if (pipelinesError) {
      console.error('❌ Erro ao buscar pipelines:', pipelinesError);
      return;
    }

    console.log(`✅ Pipelines encontradas: ${pipelines?.length || 0}`);

    for (const pipeline of pipelines || []) {
      console.log(`\n🔍 Pipeline: "${pipeline.name}" (ID: ${pipeline.id})`);
      
      // Buscar TODAS as etapas relacionadas a esta pipeline (incluindo órfãs)
      const { data: allStages, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('id, name, order_index, is_system_stage, created_at')
        .eq('pipeline_id', pipeline.id)
        .order('order_index');

      if (stagesError) {
        console.error(`❌ Erro ao buscar etapas:`, stagesError);
        continue;
      }

      console.log(`   📈 Total de etapas encontradas: ${allStages?.length || 0}`);
      
      if (allStages && allStages.length > 0) {
        console.log('   📋 Todas as etapas:');
        allStages.forEach((stage, index) => {
          console.log(`      ${index + 1}. ${stage.name} (Order: ${stage.order_index}, System: ${stage.is_system_stage || false}, ID: ${stage.id})`);
        });

        // Verificar duplicatas por nome
        const stageNames = allStages.map(s => s.name);
        const duplicateNames = stageNames.filter((name, index) => stageNames.indexOf(name) !== index);
        
        if (duplicateNames.length > 0) {
          console.log(`   ⚠️ DUPLICATAS ENCONTRADAS: ${[...new Set(duplicateNames)].join(', ')}`);
        } else {
          console.log(`   ✅ Nenhuma duplicata por nome`);
        }

        // Verificar etapas que deveriam estar na pipeline mas não aparecem na API
        const { data: apiStages, error: apiError } = await supabase
          .from('pipeline_stages')
          .select('id, name')
          .eq('pipeline_id', pipeline.id)
          .order('order_index');

        if (!apiError) {
          console.log(`   🔗 Etapas retornadas pela API: ${apiStages?.length || 0}`);
          if (allStages.length !== apiStages.length) {
            console.log(`   ⚠️ DISCREPÂNCIA: ${allStages.length} no total vs ${apiStages.length} na API`);
          }
        }
      }
    }

    // Verificar se existem etapas órfãs que pertencem às pipelines do test-tenant
    console.log('\n🔍 Verificando etapas órfãs que pertencem às pipelines do test-tenant...');
    
    const pipelineIds = (pipelines || []).map(p => p.id);
    
    const { data: orphanStages, error: orphanError } = await supabase
      .from('pipeline_stages')
      .select(`
        id,
        name,
        pipeline_id,
        pipelines!left(id, name, tenant_id)
      `)
      .in('pipeline_id', pipelineIds)
      .is('pipelines.id', null);

    if (orphanError) {
      console.error('❌ Erro ao buscar etapas órfãs:', orphanError);
    } else {
      console.log(`✅ Etapas órfãs das pipelines test-tenant: ${orphanStages?.length || 0}`);
      
      if (orphanStages && orphanStages.length > 0) {
        orphanStages.forEach((stage, index) => {
          console.log(`   ${index + 1}. ${stage.name} (Pipeline ID: ${stage.pipeline_id})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar verificação
checkDuplicateStages()
  .then(() => {
    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro na verificação:', error);
    process.exit(1);
  });
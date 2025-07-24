// Script para limpar etapas órfãs (sem pipeline válida)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧹 Limpando etapas órfãs do banco de dados...\n');

async function cleanOrphanStages() {
  try {
    // 1. Identificar etapas órfãs
    console.log('📊 ETAPA 1: Identificando etapas órfãs...');
    
    const { data: orphanStages, error: orphanError } = await supabase
      .from('pipeline_stages')
      .select(`
        id,
        name,
        pipeline_id,
        pipelines!left(id, name, tenant_id)
      `)
      .is('pipelines.id', null);

    if (orphanError) {
      console.error('❌ Erro ao buscar etapas órfãs:', orphanError);
      return;
    }

    console.log(`✅ Encontradas ${orphanStages?.length || 0} etapas órfãs`);

    if (!orphanStages || orphanStages.length === 0) {
      console.log('🎉 Nenhuma etapa órfã encontrada! Banco limpo.');
      return;
    }

    // 2. Mostrar algumas etapas órfãs para confirmação
    console.log('\n📋 Primeiras 10 etapas órfãs:');
    orphanStages.slice(0, 10).forEach((stage, index) => {
      console.log(`   ${index + 1}. ${stage.name} (ID: ${stage.id}, Pipeline ID: ${stage.pipeline_id})`);
    });

    // 3. Confirmar limpeza
    console.log(`\n⚠️ ATENÇÃO: Isso irá REMOVER ${orphanStages.length} etapas órfãs do banco!`);
    console.log('🔄 Procedendo com a limpeza...\n');

    // 4. Remover etapas órfãs em lotes (para evitar timeout)
    const batchSize = 50;
    let removedCount = 0;

    for (let i = 0; i < orphanStages.length; i += batchSize) {
      const batch = orphanStages.slice(i, i + batchSize);
      const stageIds = batch.map(stage => stage.id);

      console.log(`🔄 Removendo lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(orphanStages.length/batchSize)} (${batch.length} etapas)...`);

      const { error: deleteError } = await supabase
        .from('pipeline_stages')
        .delete()
        .in('id', stageIds);

      if (deleteError) {
        console.error(`❌ Erro ao remover lote ${Math.floor(i/batchSize) + 1}:`, deleteError);
        continue;
      }

      removedCount += batch.length;
      console.log(`✅ Lote removido com sucesso (${removedCount}/${orphanStages.length})`);
    }

    console.log(`\n🎉 Limpeza concluída! ${removedCount} etapas órfãs removidas.`);

    // 5. Verificar resultado final
    console.log('\n📊 ETAPA 2: Verificando resultado...');
    
    const { data: finalOrphanStages, error: finalError } = await supabase
      .from('pipeline_stages')
      .select(`
        id,
        name,
        pipeline_id,
        pipelines!left(id, name, tenant_id)
      `)
      .is('pipelines.id', null);

    if (finalError) {
      console.error('❌ Erro na verificação final:', finalError);
    } else {
      console.log(`✅ Etapas órfãs restantes: ${finalOrphanStages?.length || 0}`);
    }

    // 6. Verificar contagem de etapas para test-tenant
    console.log('\n📊 ETAPA 3: Verificando pipelines do test-tenant...');
    
    const { data: testPipelines, error: testError } = await supabase
      .from('pipelines')
      .select('id, name')
      .eq('tenant_id', 'test-tenant');

    if (testError) {
      console.error('❌ Erro ao buscar pipelines de teste:', testError);
    } else {
      console.log(`✅ Pipelines do test-tenant: ${testPipelines?.length || 0}`);
      
      for (const pipeline of testPipelines || []) {
        const { data: stages, error: stagesError } = await supabase
          .from('pipeline_stages')
          .select('id, name')
          .eq('pipeline_id', pipeline.id);

        if (stagesError) {
          console.error(`❌ Erro ao buscar etapas de ${pipeline.name}:`, stagesError);
        } else {
          console.log(`   📈 ${pipeline.name}: ${stages?.length || 0} etapas`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar limpeza
cleanOrphanStages()
  .then(() => {
    console.log('\n✅ Script de limpeza concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro no script de limpeza:', error);
    process.exit(1);
  });
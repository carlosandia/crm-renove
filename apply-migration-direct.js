import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 Aplicando correção das etapas fantasma...');

// 1. Primeiro, vamos investigar quantas etapas cada pipeline tem
console.log('📊 Verificando estado atual...');

try {
  // Buscar pipeline 'new13' especificamente
  const { data: pipelineData, error: pipelineError } = await supabase
    .from('pipelines')
    .select('id, name')
    .eq('name', 'new13')
    .single();

  if (pipelineError) {
    console.error('❌ Erro ao buscar pipeline:', pipelineError);
    process.exit(1);
  }

  console.log('📋 Pipeline encontrada:', pipelineData);

  // Buscar todas as etapas desta pipeline
  const { data: stages, error: stagesError } = await supabase
    .from('pipeline_stages')
    .select('id, name, order_index, is_system_stage, color, created_at')
    .eq('pipeline_id', pipelineData.id)
    .order('order_index');

  if (stagesError) {
    console.error('❌ Erro ao buscar etapas:', stagesError);
    process.exit(1);
  }

  console.log(`📈 Total de etapas encontradas: ${stages.length}`);
  console.log('📋 Lista de etapas:');
  stages.forEach((stage, index) => {
    console.log(`  ${index + 1}. ${stage.name} (ordem: ${stage.order_index}, sistema: ${stage.is_system_stage}, cor: ${stage.color})`);
  });

  // Identificar etapas a serem removidas (extras/fantasma)
  const stagesToKeep = [];
  const stagesToRemove = [];

  // Manter apenas: Lead, teste, envio, Ganho, Perdido
  const allowedStages = ['Lead', 'teste', 'envio', 'Ganho', 'Perdido'];
  
  stages.forEach(stage => {
    if (allowedStages.includes(stage.name)) {
      stagesToKeep.push(stage);
    } else {
      stagesToRemove.push(stage);
    }
  });

  console.log(`\n🎯 Etapas a manter: ${stagesToKeep.length}`);
  stagesToKeep.forEach(stage => {
    console.log(`  ✅ ${stage.name}`);
  });

  console.log(`\n🗑️ Etapas a remover: ${stagesToRemove.length}`);
  stagesToRemove.forEach(stage => {
    console.log(`  ❌ ${stage.name}`);
  });

  // Remover etapas extras
  if (stagesToRemove.length > 0) {
    console.log('\n🔧 Removendo etapas extras...');
    
    for (const stage of stagesToRemove) {
      const { error: deleteError } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stage.id);

      if (deleteError) {
        console.error(`❌ Erro ao remover etapa ${stage.name}:`, deleteError);
      } else {
        console.log(`✅ Etapa ${stage.name} removida`);
      }
    }
  }

  // Verificar resultado final
  const { data: finalStages, error: finalError } = await supabase
    .from('pipeline_stages')
    .select('id, name, order_index, is_system_stage')
    .eq('pipeline_id', pipelineData.id)
    .order('order_index');

  if (finalError) {
    console.error('❌ Erro ao verificar resultado:', finalError);
  } else {
    console.log(`\n🎉 RESULTADO FINAL: ${finalStages.length} etapas`);
    finalStages.forEach((stage, index) => {
      console.log(`  ${index + 1}. ${stage.name} (ordem: ${stage.order_index})`);
    });
  }

  console.log('\n✅ Limpeza concluída! A pipeline new13 agora deve mostrar a contagem correta.');

} catch (error) {
  console.error('❌ Erro geral:', error);
}

process.exit(0);
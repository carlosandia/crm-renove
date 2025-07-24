// Script para investigar pipeline new13 e verificar etapas MQL
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Investigando pipeline new13...\n');

async function investigatePipelineNew13() {
  try {
    // 1. Buscar pipeline new13
    console.log('📊 ETAPA 1: Buscando pipeline new13...');
    const { data: pipelines, error: pipelineError } = await supabase
      .from('pipelines')
      .select('*')
      .ilike('name', '%new13%');

    if (pipelineError) {
      console.error('❌ Erro ao buscar pipeline new13:', pipelineError);
      return;
    }

    console.log(`✅ Pipelines encontradas com "new13": ${pipelines?.length || 0}`);
    
    if (!pipelines || pipelines.length === 0) {
      console.log('⚠️ Nenhuma pipeline com nome "new13" encontrada');
      // Tentar buscar todas as pipelines para ver quais existem
      const { data: allPipelines } = await supabase
        .from('pipelines')
        .select('id, name, tenant_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      console.log('\n📋 Últimas 10 pipelines criadas:');
      allPipelines?.forEach((p, index) => {
        console.log(`   ${index + 1}. "${p.name}" (ID: ${p.id}, Tenant: ${p.tenant_id})`);
      });
      return;
    }

    // Mostrar informações das pipelines encontradas
    pipelines.forEach((pipeline, index) => {
      console.log(`\n🔍 Pipeline ${index + 1}: "${pipeline.name}"`);
      console.log(`   ID: ${pipeline.id}`);
      console.log(`   Tenant: ${pipeline.tenant_id}`);
      console.log(`   Criado em: ${new Date(pipeline.created_at).toLocaleString()}`);
      console.log(`   Criado por: ${pipeline.created_by}`);
    });

    // 2. Para cada pipeline new13, buscar suas etapas
    for (const pipeline of pipelines) {
      console.log(`\n📊 ETAPA 2: Investigando etapas da pipeline "${pipeline.name}"...`);
      
      const { data: stages, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipeline.id)
        .order('order_index');

      if (stagesError) {
        console.error(`❌ Erro ao buscar etapas:`, stagesError);
        continue;
      }

      console.log(`   📈 Total de etapas encontradas: ${stages?.length || 0}`);
      
      if (stages && stages.length > 0) {
        console.log('   📋 Lista completa de etapas:');
        stages.forEach((stage, index) => {
          console.log(`      ${index + 1}. "${stage.name}" (Order: ${stage.order_index}, System: ${stage.is_system_stage || false}, Color: ${stage.color})`);
          console.log(`          ID: ${stage.id}`);
          console.log(`          Descrição: ${stage.description || 'N/A'}`);
          console.log(`          Criado em: ${new Date(stage.created_at).toLocaleString()}`);
        });

        // Verificar especificamente por etapa MQL
        const mqlStage = stages.find(s => s.name.toLowerCase().includes('mql'));
        if (mqlStage) {
          console.log(`\n   ✅ ETAPA MQL ENCONTRADA:`);
          console.log(`      Nome: ${mqlStage.name}`);
          console.log(`      ID: ${mqlStage.id}`);
          console.log(`      Order Index: ${mqlStage.order_index}`);
          console.log(`      É sistema: ${mqlStage.is_system_stage}`);
          console.log(`      Cor: ${mqlStage.color}`);
          console.log(`      Descrição: ${mqlStage.description}`);
        } else {
          console.log(`\n   ❌ ETAPA MQL NÃO ENCONTRADA`);
        }
      } else {
        console.log('   ⚠️ Nenhuma etapa encontrada para esta pipeline');
      }

      // 3. Verificar se há leads nesta pipeline
      console.log(`\n📊 ETAPA 3: Verificando leads na pipeline "${pipeline.name}"...`);
      const { data: leads, error: leadsError } = await supabase
        .from('pipeline_leads')
        .select('id, name, current_stage_id, created_at')
        .eq('pipeline_id', pipeline.id)
        .limit(5);

      if (leadsError) {
        console.error(`❌ Erro ao buscar leads:`, leadsError);
      } else {
        console.log(`   📈 Total de leads: ${leads?.length || 0}`);
        if (leads && leads.length > 0) {
          console.log('   📋 Primeiros 5 leads:');
          leads.forEach((lead, index) => {
            console.log(`      ${index + 1}. "${lead.name}" (Stage ID: ${lead.current_stage_id})`);
          });
        }
      }
    }

    // 4. Verificar se há etapas órfãs que deveriam pertencer à pipeline new13
    console.log(`\n📊 ETAPA 4: Verificando etapas órfãs relacionadas...`);
    const pipelineIds = pipelines.map(p => p.id);
    
    const { data: orphanStages, error: orphanError } = await supabase
      .from('pipeline_stages')
      .select(`
        id,
        name,
        pipeline_id,
        order_index,
        is_system_stage,
        created_at,
        pipelines!left(id, name, tenant_id)
      `)
      .in('pipeline_id', pipelineIds)
      .is('pipelines.id', null);

    if (orphanError) {
      console.error('❌ Erro ao buscar etapas órfãs:', orphanError);
    } else {
      console.log(`✅ Etapas órfãs relacionadas: ${orphanStages?.length || 0}`);
      
      if (orphanStages && orphanStages.length > 0) {
        orphanStages.forEach((stage, index) => {
          console.log(`   ${index + 1}. "${stage.name}" (Pipeline ID: ${stage.pipeline_id}) - ÓRFÃ`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar investigação
investigatePipelineNew13()
  .then(() => {
    console.log('\n✅ Investigação da pipeline new13 concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro na investigação:', error);
    process.exit(1);
  });
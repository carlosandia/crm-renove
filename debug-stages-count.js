// Script para investigar contagem de etapas por pipeline
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Investigando contagem de etapas por pipeline...\n');

async function investigateStagesCount() {
  try {
    // 1. Buscar todas as pipelines de todos os tenants primeiro
    console.log('📊 ETAPA 1: Buscando todos os tenants disponíveis...');
    const { data: allPipelines, error: allPipelinesError } = await supabase
      .from('pipelines')
      .select('id, name, tenant_id, created_at')
      .order('created_at', { ascending: false });

    if (allPipelinesError) {
      console.error('❌ Erro ao buscar todas as pipelines:', allPipelinesError);
      return;
    }

    console.log(`✅ Total de pipelines no sistema: ${allPipelines?.length || 0}`);

    // Agrupar por tenant_id
    const pipelinesByTenant = (allPipelines || []).reduce((acc, pipeline) => {
      if (!acc[pipeline.tenant_id]) {
        acc[pipeline.tenant_id] = [];
      }
      acc[pipeline.tenant_id].push(pipeline);
      return acc;
    }, {});

    console.log('\n📊 Pipelines por tenant:');
    Object.entries(pipelinesByTenant).forEach(([tenantId, pipelines]) => {
      console.log(`   ${tenantId}: ${pipelines.length} pipelines`);
    });

    // 2. Agora buscar especificamente do test-tenant (que parece ser o correto)
    console.log('\n📊 ETAPA 2: Buscando pipelines do tenant test-tenant...');
    const { data: pipelines, error: pipelinesError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('tenant_id', 'test-tenant')
      .order('created_at', { ascending: false });

    if (pipelinesError) {
      console.error('❌ Erro ao buscar pipelines:', pipelinesError);
      return;
    }

    console.log(`✅ Encontradas ${pipelines?.length || 0} pipelines\n`);

    // 2. Para cada pipeline, buscar suas etapas
    for (const pipeline of pipelines || []) {
      console.log(`🔍 Pipeline: "${pipeline.name}" (ID: ${pipeline.id})`);
      
      // Buscar etapas
      const { data: stages, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipeline.id)
        .order('order_index');

      if (stagesError) {
        console.error(`❌ Erro ao buscar etapas da pipeline ${pipeline.name}:`, stagesError);
        continue;
      }

      console.log(`   📈 Total de etapas: ${stages?.length || 0}`);
      
      if (stages && stages.length > 0) {
        console.log('   📋 Lista de etapas:');
        stages.forEach((stage, index) => {
          console.log(`      ${index + 1}. ${stage.name} (Order: ${stage.order_index}, System: ${stage.is_system_stage || false})`);
        });
      } else {
        console.log('   ⚠️ Nenhuma etapa encontrada');
      }
      
      console.log(''); // Linha em branco
    }

    // 3. Verificar se há etapas órfãs (sem pipeline)
    console.log('🔍 ETAPA 2: Verificando etapas órfãs...');
    const { data: orphanStages, error: orphanError } = await supabase
      .from('pipeline_stages')
      .select(`
        *,
        pipelines!left(id, name, tenant_id)
      `)
      .is('pipelines.id', null);

    if (orphanError) {
      console.error('❌ Erro ao buscar etapas órfãs:', orphanError);
    } else {
      console.log(`✅ Encontradas ${orphanStages?.length || 0} etapas órfãs`);
      
      if (orphanStages && orphanStages.length > 0) {
        console.log('📋 Etapas órfãs:');
        orphanStages.forEach((stage, index) => {
          console.log(`   ${index + 1}. ${stage.name} (ID: ${stage.id}, Pipeline ID: ${stage.pipeline_id})`);
        });
      }
    }

    // 4. Verificar contagem por SQL direta
    console.log('\n🔍 ETAPA 3: Contagem por SQL...');
    const { data: sqlCounts, error: sqlError } = await supabase
      .rpc('get_pipeline_stages_count', { target_tenant_id: 'demo-tenant-teste3' });

    if (sqlError) {
      console.warn('⚠️ Função SQL não disponível, usando query manual:', sqlError.message);
      
      // Query manual
      const { data: manualCount, error: manualError } = await supabase
        .from('pipeline_stages')
        .select(`
          pipeline_id,
          pipelines!inner(id, name, tenant_id)
        `)
        .eq('pipelines.tenant_id', 'demo-tenant-teste3');

      if (manualError) {
        console.error('❌ Erro na query manual:', manualError);
      } else {
        const countByPipeline = (manualCount || []).reduce((acc, stage) => {
          const pipelineId = stage.pipeline_id;
          acc[pipelineId] = (acc[pipelineId] || 0) + 1;
          return acc;
        }, {});

        console.log('📊 Contagem manual por pipeline:');
        Object.entries(countByPipeline).forEach(([pipelineId, count]) => {
          const pipelineName = pipelines?.find(p => p.id === pipelineId)?.name || 'Desconhecida';
          console.log(`   ${pipelineName}: ${count} etapas`);
        });
      }
    } else {
      console.log('✅ Resultado da função SQL:', sqlCounts);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar investigação
investigateStagesCount()
  .then(() => {
    console.log('\n✅ Investigação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro na investigação:', error);
    process.exit(1);
  });
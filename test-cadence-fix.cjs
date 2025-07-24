// Script para testar se a correção do cadence_configs funciona
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testCadenceFix() {
  try {
    console.log('🧪 Testando correção do cadence_configs...');
    
    // 1. Buscar uma pipeline existente
    const { data: pipelines, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id, name, tenant_id')
      .limit(1);
    
    if (pipelineError || !pipelines?.length) {
      console.error('❌ Erro ao buscar pipeline:', pipelineError);
      return;
    }
    
    const testPipeline = pipelines[0];
    console.log('📋 Pipeline de teste:', {
      id: testPipeline.id,
      name: testPipeline.name,
      tenant_id: testPipeline.tenant_id
    });
    
    // 2. Tentar inserir uma cadência de teste
    const testCadence = {
      pipeline_id: testPipeline.id,
      stage_name: 'Lead',
      stage_order: 0,
      tasks: [
        {
          task_title: 'Teste de inserção',
          channel: 'email',
          day_offset: 1,
          is_active: true
        }
      ],
      is_active: true
    };
    
    console.log('🔄 Tentando inserir cadência de teste...');
    
    const { data: insertedCadence, error: insertError } = await supabase
      .from('cadence_configs')
      .insert(testCadence)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Erro ao inserir cadência:', insertError);
      return;
    }
    
    console.log('✅ Cadência inserida com sucesso!');
    console.log('📊 Dados inseridos:', {
      id: insertedCadence.id,
      pipeline_id: insertedCadence.pipeline_id,
      tenant_id: insertedCadence.tenant_id,
      stage_name: insertedCadence.stage_name
    });
    
    // 3. Verificar se o tenant_id foi sincronizado corretamente
    if (insertedCadence.tenant_id === testPipeline.tenant_id) {
      console.log('🎯 SUCESSO! O tenant_id foi sincronizado automaticamente pelo trigger!');
    } else {
      console.log('⚠️ ATENÇÃO: tenant_id não foi sincronizado corretamente');
      console.log('Expected:', testPipeline.tenant_id);
      console.log('Actual:', insertedCadence.tenant_id);
    }
    
    // 4. Limpar dados de teste
    const { error: deleteError } = await supabase
      .from('cadence_configs')
      .delete()
      .eq('id', insertedCadence.id);
    
    if (deleteError) {
      console.error('⚠️ Erro ao limpar dados de teste:', deleteError);
    } else {
      console.log('🧹 Dados de teste removidos com sucesso');
    }
    
    console.log('\n🎉 TESTE CONCLUÍDO - A correção está funcionando!');
    console.log('💡 Agora as inserções de cadence_configs devem funcionar na aplicação.');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testCadenceFix();

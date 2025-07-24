// Script para debugar problema de cadências
const { createClient } = require('@supabase/supabase-js');

// Usar as configurações do projeto
const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub25fa2V5IiwiaWF0IjoxNzM3NDg0MTk1LCJleHAiOjIwNTMwNjAxOTV9.VKnpHBebhZGZVz2yyAtJPy0j9GQJ0sBWLOLGfLLjEao';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCadences() {
  console.log('🔍 Investigando problema das cadências...\n');
  
  // 1. Verificar se a tabela existe
  console.log('1️⃣ Verificando estrutura da tabela cadence_configs:');
  try {
    const { data, error } = await supabase
      .from('cadence_configs')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao acessar tabela:', error.message);
      return;
    }
    
    console.log('✅ Tabela acessível');
  } catch (err) {
    console.error('❌ Erro de conexão:', err.message);
    return;
  }
  
  // 2. Buscar pipeline new13
  console.log('\n2️⃣ Buscando pipeline new13:');
  const { data: pipelines, error: pipelineError } = await supabase
    .from('pipelines')
    .select('id, name')
    .eq('name', 'new13');
    
  if (pipelineError || !pipelines || pipelines.length === 0) {
    console.error('❌ Pipeline new13 não encontrada:', pipelineError?.message);
    return;
  }
  
  const pipelineId = pipelines[0].id;
  console.log('✅ Pipeline encontrada:', pipelineId);
  
  // 3. Verificar cadências existentes
  console.log('\n3️⃣ Verificando cadências existentes para new13:');
  const { data: cadences, error: cadenceError } = await supabase
    .from('cadence_configs')
    .select('*')
    .eq('pipeline_id', pipelineId);
    
  if (cadenceError) {
    console.error('❌ Erro ao buscar cadências:', cadenceError.message);
    return;
  }
  
  console.log(`📊 Encontradas ${cadences?.length || 0} cadências:`);
  if (cadences && cadences.length > 0) {
    cadences.forEach((cadence, index) => {
      console.log(`  [${index + 1}] Stage: ${cadence.stage_name}, Active: ${cadence.is_active}`);
      console.log(`      Tasks: ${JSON.stringify(cadence.tasks).substring(0, 100)}...`);
    });
  }
  
  // 4. Tentar criar uma cadência de teste
  console.log('\n4️⃣ Testando criação de cadência:');
  const testCadence = {
    pipeline_id: pipelineId,
    stage_name: 'Lead',
    stage_order: 0,
    tasks: JSON.stringify([
      {
        day_offset: 0,
        task_order: 1,
        channel: 'email',
        action_type: 'mensagem',
        task_title: 'Teste - Primeiro contato',
        task_description: 'Email de teste',
        template_content: 'Olá, este é um teste.',
        is_active: true
      }
    ]),
    is_active: true,
    tenant_id: 'dc2f1fc5-53b5-4f54-bb56-009f58481b97'
  };
  
  const { data: createdCadence, error: createError } = await supabase
    .from('cadence_configs')
    .insert(testCadence)
    .select();
    
  if (createError) {
    console.error('❌ Erro ao criar cadência de teste:', createError.message);
  } else {
    console.log('✅ Cadência de teste criada:', createdCadence[0].id);
    
    // 5. Tentar excluir a cadência de teste
    console.log('\n5️⃣ Testando exclusão de cadência:');
    const { error: deleteError } = await supabase
      .from('cadence_configs')
      .delete()
      .eq('id', createdCadence[0].id);
      
    if (deleteError) {
      console.error('❌ Erro ao excluir cadência de teste:', deleteError.message);
    } else {
      console.log('✅ Cadência de teste excluída com sucesso');
    }
  }
  
  // 6. Verificar state final
  console.log('\n6️⃣ Estado final das cadências:');
  const { data: finalCadences } = await supabase
    .from('cadence_configs')
    .select('*')
    .eq('pipeline_id', pipelineId);
    
  console.log(`📊 Cadências finais: ${finalCadences?.length || 0}`);
}

debugCadences().catch(console.error);
// Script para debugar problema de cadências
const { createClient } = require('@supabase/supabase-js');

// Usar as configurações do projeto
const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

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
      console.log(`  [${index + 1}] ID: ${cadence.id}`);
      console.log(`      Stage: ${cadence.stage_name}, Active: ${cadence.is_active}`);
      console.log(`      Tasks: ${JSON.stringify(cadence.tasks).substring(0, 100)}...`);
    });
  }
  
  // 4. Se há cadências, tentar excluir todas
  if (cadences && cadences.length > 0) {
    console.log('\n4️⃣ Testando exclusão de todas as cadências:');
    const { error: deleteError } = await supabase
      .from('cadence_configs')
      .delete()
      .eq('pipeline_id', pipelineId);
      
    if (deleteError) {
      console.error('❌ Erro ao excluir cadências:', deleteError.message);
    } else {
      console.log('✅ Todas as cadências excluídas com sucesso');
    }
    
    // Verificar se realmente foram excluídas
    const { data: afterDelete } = await supabase
      .from('cadence_configs')
      .select('*')
      .eq('pipeline_id', pipelineId);
      
    console.log(`📊 Cadências após exclusão: ${afterDelete?.length || 0}`);
  }
  
  console.log('\n✅ Debug concluído!');
}

debugCadences().catch(console.error);
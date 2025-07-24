// Script para verificar valores válidos para stage_type
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Verificando valores válidos para stage_type...\n');

async function checkStageTypes() {
  try {
    console.log('📊 ETAPA 1: Consultando todos os stage_type existentes...');
    
    const { data: stages, error: stagesError } = await supabase
      .from('pipeline_stages')
      .select('stage_type, name, is_system_stage')
      .order('stage_type');

    if (stagesError) {
      console.error('❌ Erro ao consultar etapas:', stagesError);
      return;
    }

    console.log(`✅ Total de etapas encontradas: ${stages?.length || 0}`);
    
    // Agrupar por stage_type
    const stageTypeGroups = {};
    stages?.forEach(stage => {
      const type = stage.stage_type || 'null';
      if (!stageTypeGroups[type]) {
        stageTypeGroups[type] = [];
      }
      stageTypeGroups[type].push(stage);
    });

    console.log('\n📋 Valores de stage_type encontrados:');
    Object.keys(stageTypeGroups).forEach(type => {
      const group = stageTypeGroups[type];
      console.log(`\n   "${type}": ${group.length} etapas`);
      group.slice(0, 3).forEach(stage => {
        console.log(`      - "${stage.name}" (System: ${stage.is_system_stage})`);
      });
      if (group.length > 3) {
        console.log(`      ... e mais ${group.length - 3} etapas`);
      }
    });

    console.log('\n📊 ETAPA 2: Testando valores comuns para stage_type...');
    
    // Testar alguns valores comuns
    const testValues = ['custom', 'customizada', 'user_defined', 'personal', 'manual'];
    
    for (const testValue of testValues) {
      console.log(`\n🧪 Testando stage_type: "${testValue}"`);
      
      const testStage = {
        pipeline_id: 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8',
        name: `TEST_${testValue.toUpperCase()}`,
        order_index: 999,
        color: '#FF0000',
        is_system_stage: false,
        stage_type: testValue,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('pipeline_stages')
        .insert(testStage)
        .select();

      if (error) {
        console.log(`   ❌ "${testValue}" - Inválido: ${error.message}`);
      } else {
        console.log(`   ✅ "${testValue}" - Válido! Inserção bem-sucedida`);
        // Limpar o teste
        await supabase.from('pipeline_stages').delete().eq('name', `TEST_${testValue.toUpperCase()}`);
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar verificação
checkStageTypes()
  .then(() => {
    console.log('\n✅ Verificação de stage_type concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro na verificação:', error);
    process.exit(1);
  });
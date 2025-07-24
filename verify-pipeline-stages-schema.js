// Script para verificar schema da tabela pipeline_stages
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Verificando schema da tabela pipeline_stages...\n');

async function verifyPipelineStagesSchema() {
  try {
    // 1. Tentar inserir um registro de teste para descobrir quais colunas existem
    console.log('📊 ETAPA 1: Tentando uma inserção de teste para descobrir colunas válidas...');
    
    const testInsert = {
      pipeline_id: '123e4567-e89b-12d3-a456-426614174000', // UUID fake
      name: 'TEST_STAGE',
      order_index: 1,
      color: '#FF0000',
      is_system_stage: false,
      tenant_id: 'test', // Esta coluna provavelmente não existe
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('pipeline_stages')
      .insert(testInsert)
      .select();

    if (error) {
      console.log('❌ Erro esperado ao inserir teste (isso nos ajuda a descobrir o schema):');
      console.log('   Código:', error.code);
      console.log('   Mensagem:', error.message);
      console.log('   Detalhes:', error.details);
      console.log('   Hint:', error.hint);
    } else {
      console.log('⚠️ Inserção de teste inesperadamente bem-sucedida:', data);
      // Limpar o teste se funcionou
      await supabase.from('pipeline_stages').delete().eq('name', 'TEST_STAGE');
    }

    // 2. Consultar registros existentes para ver estrutura real
    console.log('\n📊 ETAPA 2: Consultando registros existentes para ver estrutura...');
    
    const { data: existingStages, error: selectError } = await supabase
      .from('pipeline_stages')
      .select('*')
      .limit(1);

    if (selectError) {
      console.error('❌ Erro ao consultar registros existentes:', selectError);
    } else if (existingStages && existingStages.length > 0) {
      console.log('✅ Estrutura de uma etapa existente:');
      const stage = existingStages[0];
      console.log('   Colunas encontradas:');
      Object.keys(stage).forEach(key => {
        console.log(`      - ${key}: ${typeof stage[key]} = ${stage[key]}`);
      });
    } else {
      console.log('⚠️ Nenhum registro encontrado na tabela pipeline_stages');
    }

    // 3. Tentar inserção com apenas colunas básicas
    console.log('\n📊 ETAPA 3: Tentando inserção apenas com colunas básicas...');
    
    const basicInsert = {
      pipeline_id: '123e4567-e89b-12d3-a456-426614174000', // UUID fake
      name: 'TEST_BASIC',
      order_index: 1,
      color: '#FF0000',
      is_system_stage: false
    };

    const { data: basicData, error: basicError } = await supabase
      .from('pipeline_stages')
      .insert(basicInsert)
      .select();

    if (basicError) {
      console.log('❌ Erro na inserção básica:');
      console.log('   Código:', basicError.code);
      console.log('   Mensagem:', basicError.message);
    } else {
      console.log('✅ Inserção básica bem-sucedida! Colunas válidas:');
      console.log('   pipeline_id, name, order_index, color, is_system_stage');
      
      // Limpar o teste
      await supabase.from('pipeline_stages').delete().eq('name', 'TEST_BASIC');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar verificação
verifyPipelineStagesSchema()
  .then(() => {
    console.log('\n✅ Verificação do schema concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro na verificação:', error);
    process.exit(1);
  });
// Script para verificar campos customizados da pipeline new13
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Verificando campos customizados da pipeline new13...\n');

async function verificarCamposCustomizados() {
  const pipelineId = 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8'; // Pipeline new13
  
  try {
    console.log('📋 ETAPA 1: Verificando campos customizados no banco...');
    
    const { data: customFields, error } = await supabase
      .from('pipeline_custom_fields')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('field_order');

    if (error) {
      console.error('❌ Erro ao buscar campos customizados:', error);
      return;
    }

    console.log(`✅ Total de campos encontrados: ${customFields?.length || 0}`);
    
    if (customFields && customFields.length > 0) {
      console.log('\n📋 Campos customizados encontrados:');
      customFields.forEach((field, index) => {
        console.log(`   ${index + 1}. "${field.field_label}" (${field.field_name})`);
        console.log(`      - Tipo: ${field.field_type}`);
        console.log(`      - Obrigatório: ${field.is_required ? 'Sim' : 'Não'}`);
        console.log(`      - Ordem: ${field.field_order}`);
        console.log(`      - Exibir no card: ${field.show_in_card ? 'Sim' : 'Não'}`);
        console.log(`      - ID: ${field.id}`);
        console.log(`      - Criado: ${field.created_at}`);
        console.log('');
      });
      
      // Verificar especificamente o campo "remarketing teste"
      const remarketingField = customFields.find(field => 
        field.field_label?.toLowerCase().includes('remarketing') ||
        field.field_name?.toLowerCase().includes('remarketing')
      );
      
      if (remarketingField) {
        console.log('✅ CAMPO "REMARKETING TESTE" ENCONTRADO!');
        console.log(`   - Label: ${remarketingField.field_label}`);
        console.log(`   - Name: ${remarketingField.field_name}`);
        console.log(`   - Tipo: ${remarketingField.field_type}`);
        console.log(`   - ID: ${remarketingField.id}`);
      } else {
        console.log('❌ CAMPO "REMARKETING TESTE" NÃO ENCONTRADO NO BANCO!');
      }
    } else {
      console.log('⚠️ Nenhum campo customizado encontrado para esta pipeline');
    }

    console.log('\n📋 ETAPA 2: Verificando informações da pipeline...');
    
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('id', pipelineId)
      .single();

    if (pipelineError) {
      console.error('❌ Erro ao buscar pipeline:', pipelineError);
    } else {
      console.log('✅ Pipeline encontrada:');
      console.log(`   - Nome: ${pipeline.name}`);
      console.log(`   - ID: ${pipeline.id}`);
      console.log(`   - Criada por: ${pipeline.created_by}`);
      console.log(`   - Tenant ID: ${pipeline.tenant_id}`);
    }

    console.log('\n📋 ETAPA 3: Verificando schema da tabela pipeline_custom_fields...');
    
    // Tentar inserir um campo de teste para verificar se há problemas de schema
    const testField = {
      pipeline_id: pipelineId,
      field_name: 'test_schema_verification',
      field_label: 'Teste Schema',
      field_type: 'text',
      is_required: false,
      field_order: 999,
      show_in_card: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('🧪 Testando inserção de campo de teste...');
    const { data: testInsert, error: testError } = await supabase
      .from('pipeline_custom_fields')
      .insert(testField)
      .select();

    if (testError) {
      console.error('❌ Erro ao inserir campo de teste:', testError);
      console.log('   Código:', testError.code);
      console.log('   Mensagem:', testError.message);
      console.log('   Detalhes:', testError.details);
    } else {
      console.log('✅ Campo de teste inserido com sucesso!');
      console.log(`   ID: ${testInsert[0]?.id}`);
      
      // Remover campo de teste
      await supabase
        .from('pipeline_custom_fields')
        .delete()
        .eq('id', testInsert[0].id);
      
      console.log('🗑️ Campo de teste removido');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar verificação
verificarCamposCustomizados()
  .then(() => {
    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro na verificação:', error);
    process.exit(1);
  });
// Script para testar salvamento correto de cadências
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCadenceSave() {
  console.log('🧪 Testando salvamento correto de cadências...\n');
  
  // Buscar pipeline new13
  const { data: pipelines } = await supabase
    .from('pipelines')
    .select('id, name')
    .eq('name', 'new13')
    .limit(1);
    
  if (!pipelines || pipelines.length === 0) {
    console.error('❌ Pipeline new13 não encontrada');
    return;
  }
  
  const pipelineId = pipelines[0].id;
  console.log('✅ Pipeline encontrada:', pipelineId);
  
  // Criar cadência de teste com tasks completas
  const testCadence = {
    pipeline_id: pipelineId,
    stage_name: 'Lead',
    stage_order: 0,
    tasks: [ // JSONB direto, não string
      {
        day_offset: 0,
        task_order: 1,
        channel: 'email',
        action_type: 'mensagem',
        task_title: 'Primeiro contato',
        task_description: 'Enviar e-mail de boas-vindas',
        template_content: 'Olá [NOME], bem-vindo(a)! Como posso ajudar?',
        is_active: true
      },
      {
        day_offset: 1,
        task_order: 2,
        channel: 'whatsapp',
        action_type: 'mensagem',
        task_title: 'Follow-up WhatsApp',
        task_description: 'Mensagem de acompanhamento',
        template_content: 'Oi [NOME]! Tem alguma dúvida sobre nossos serviços?',
        is_active: true
      },
      {
        day_offset: 3,
        task_order: 3,
        channel: 'ligacao',
        action_type: 'ligacao',
        task_title: 'Ligação de qualificação',
        task_description: 'Realizar ligação para qualificar o lead',
        template_content: 'Roteiro: apresentar empresa, entender necessidades',
        is_active: true
      }
    ],
    is_active: true,
    tenant_id: 'dc2f1fc5-53b5-4f54-bb56-009f58481b97'
  };
  
  console.log('📝 Criando cadência com 3 tasks...');
  
  const { data: createdCadence, error: createError } = await supabase
    .from('cadence_configs')
    .insert(testCadence)
    .select();
    
  if (createError) {
    console.error('❌ Erro ao criar cadência:', createError.message);
    return;
  }
  
  console.log('✅ Cadência criada:', createdCadence[0].id);
  
  // Verificar se as tasks foram salvas corretamente
  const { data: savedCadence, error: fetchError } = await supabase
    .from('cadence_configs')
    .select('*')
    .eq('id', createdCadence[0].id)
    .single();
    
  if (fetchError) {
    console.error('❌ Erro ao buscar cadência salva:', fetchError.message);
    return;
  }
  
  console.log('📊 Verificando tasks salvas:');
  console.log(`   Type: ${typeof savedCadence.tasks}`);
  console.log(`   IsArray: ${Array.isArray(savedCadence.tasks)}`);
  console.log(`   Length: ${Array.isArray(savedCadence.tasks) ? savedCadence.tasks.length : 'N/A'}`);
  
  if (Array.isArray(savedCadence.tasks) && savedCadence.tasks.length > 0) {
    console.log('✅ Tasks salvas corretamente!');
    savedCadence.tasks.forEach((task, index) => {
      console.log(`   [${index + 1}] ${task.task_title} - Dia ${task.day_offset} - ${task.channel}`);
    });
  } else {
    console.log('❌ Tasks não foram salvas corretamente');
    console.log('   Tasks raw:', JSON.stringify(savedCadence.tasks));
  }
  
  // Limpar teste
  await supabase
    .from('cadence_configs')
    .delete()
    .eq('id', createdCadence[0].id);
    
  console.log('\n🧹 Teste limpo - cadência removida');
}

testCadenceSave().catch(console.error);
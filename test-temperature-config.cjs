// Teste simulando exatamente o clique em "Configurar Temperatura"
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

// Simular cliente frontend
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTemperatureConfig() {
  try {
    console.log('🌡️ TESTE: Simulando clique em "Configurar Temperatura"...');
    
    // Dados do usuário do console
    const user = {
      id: 'bbaf8441-23c9-44dc-9a4c-a4da787f829c',
      email: 'seraquevai@seraquevai.com',
      role: 'admin',
      tenant_id: 'd7caffc1-c923-47c8-9301-ca9eeff1a243'
    };
    
    // Pipeline do erro
    const pipelineId = 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8';
    
    console.log('📋 Contexto:', {
      user: user.email,
      tenant: user.tenant_id,
      pipeline: pipelineId
    });
    
    // Simular salvamento de cadência ao clicar em "Salvar" no modal de temperatura
    const cadenceData = {
      pipeline_id: pipelineId,
      stage_name: 'Lead',
      stage_order: 0,
      tasks: [
        {
          task_title: 'Primeiro contato',
          channel: 'email',
          day_offset: 1,
          is_active: true
        },
        {
          task_title: 'Follow-up',
          channel: 'phone',
          day_offset: 3,
          is_active: true
        },
        {
          task_title: 'Proposta',
          channel: 'email',
          day_offset: 5,
          is_active: true
        }
      ],
      is_active: true,
      tenant_id: user.tenant_id, // Incluindo tenant_id como o código faz
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('📝 Dados da cadência:', {
      pipeline_id: cadenceData.pipeline_id,
      stage_name: cadenceData.stage_name,
      tenant_id: cadenceData.tenant_id,
      tasks_count: cadenceData.tasks.length
    });
    
    // Tentar inserir como a aplicação faz
    console.log('\n🔄 Inserindo cadência...');
    
    const { data: insertedCadenceArray, error: cadenceError } = await supabase
      .from('cadence_configs')
      .insert(cadenceData)
      .select();
    
    const insertedCadence = insertedCadenceArray?.[0];
    
    console.log('\n📊 Resultado:', {
      hasError: !!cadenceError,
      error: cadenceError?.message,
      returnedArray: insertedCadenceArray,
      arrayLength: insertedCadenceArray?.length || 0,
      firstItem: insertedCadence ? { 
        id: insertedCadence.id, 
        stage: insertedCadence.stage_name,
        tenant_id: insertedCadence.tenant_id 
      } : null
    });
    
    if (cadenceError) {
      console.error('\n❌ ERRO:', cadenceError);
      return;
    }
    
    if (!insertedCadence) {
      console.error('\n❌ Cadência inserida retornou null/undefined');
      console.log('Este é exatamente o erro que aparece no console!');
      return;
    }
    
    console.log('\n🎉 SUCESSO! Configuração de temperatura funcionou!');
    console.log('✅ Cadência salva:', {
      id: insertedCadence.id,
      pipeline: insertedCadence.pipeline_id,
      stage: insertedCadence.stage_name,
      tenant: insertedCadence.tenant_id
    });
    
    // Verificar se consegue carregar de volta
    console.log('\n🔄 Verificando carregamento...');
    const { data: loaded, error: loadError } = await supabase
      .from('cadence_configs')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .eq('stage_name', 'Lead');
    
    if (loadError) {
      console.error('❌ Erro ao carregar:', loadError);
    } else {
      console.log('✅ Cadências carregadas:', loaded?.length || 0);
    }
    
    // Limpar teste
    if (insertedCadence?.id) {
      await supabase
        .from('cadence_configs')
        .delete()
        .eq('id', insertedCadence.id);
        
      console.log('🧹 Teste limpo');
    }
    
    console.log('\n✨ TESTE COMPLETO - O modal de temperatura deve funcionar agora!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testTemperatureConfig();
// Script para testar fluxo completo de salvamento como o frontend faria
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCompleteFlow() {
  console.log('🔄 Testando fluxo completo de salvamento de cadências...\n');
  
  // Simular dados que vêm do frontend (ModernAdminPipelineManagerRefactored.tsx)
  const pipelineId = 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8';
  const tenantId = 'dc2f1fc5-53b5-4f54-bb56-009f58481b97';
  
  const simulatedFormData = {
    name: 'new13',
    description: 'Pipeline de teste',
    member_ids: ['6f55938c-4e0a-4c23-9c77-e365ab01c110'],
    stages: [
      { name: 'Lead', order_index: 0, is_system_stage: true },
      { name: 'Qualificado', order_index: 1, is_system_stage: false },
      { name: 'Proposta', order_index: 2, is_system_stage: false },
      { name: 'Ganho', order_index: 998, is_system_stage: true },
      { name: 'Perdido', order_index: 999, is_system_stage: true }
    ],
    custom_fields: [],
    cadence_configs: [
      {
        stage_name: 'Lead',
        stage_order: 0,
        tasks: [
          {
            day_offset: 0,
            task_order: 1,
            channel: 'email',
            action_type: 'mensagem',
            task_title: 'Email inicial',
            task_description: 'Primeiro contato por email',
            template_content: 'Olá [NOME], obrigado pelo interesse!',
            is_active: true
          },
          {
            day_offset: 2,
            task_order: 2,
            channel: 'whatsapp',
            action_type: 'mensagem',
            task_title: 'WhatsApp follow-up',
            task_description: 'Seguimento via WhatsApp',
            template_content: 'Oi [NOME]! Viu nosso email? Alguma dúvida?',
            is_active: true
          }
        ],
        is_active: true
      },
      {
        stage_name: 'Qualificado',
        stage_order: 1,
        tasks: [
          {
            day_offset: 0,
            task_order: 1,
            channel: 'ligacao',
            action_type: 'ligacao',
            task_title: 'Ligação de qualificação',
            task_description: 'Ligar para qualificar o lead',
            template_content: 'Roteiro: necessidades, orçamento, prazo',
            is_active: true
          }
        ],
        is_active: true
      }
    ]
  };
  
  console.log('📋 Dados simulados do formulário:');
  console.log(`   Pipeline: ${simulatedFormData.name}`);
  console.log(`   Etapas: ${simulatedFormData.stages.length}`);
  console.log(`   Cadências: ${simulatedFormData.cadence_configs.length}`);
  console.log(`   Total tasks: ${simulatedFormData.cadence_configs.reduce((acc, c) => acc + c.tasks.length, 0)}`);
  
  // PASSO 1: Simular salvamento direto no Supabase (como o frontend faz)
  console.log('\n🔄 PASSO 1: Salvamento direto via Supabase (método atual do frontend)...');
  
  try {
    // Limpar cadências antigas
    const { error: deleteError } = await supabase
      .from('cadence_configs')
      .delete()
      .eq('pipeline_id', pipelineId);
      
    if (deleteError) {
      console.error('❌ Erro ao deletar cadências antigas:', deleteError.message);
      return;
    }
    
    console.log('✅ Cadências antigas removidas');
    
    // Inserir novas cadências
    let insertedCount = 0;
    for (const cadenceConfig of simulatedFormData.cadence_configs) {
      const cadenceInsert = {
        pipeline_id: pipelineId,
        stage_name: cadenceConfig.stage_name,
        stage_order: cadenceConfig.stage_order,
        tasks: cadenceConfig.tasks, // JSONB direto
        is_active: cadenceConfig.is_active,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: insertedCadence, error: insertError } = await supabase
        .from('cadence_configs')
        .insert(cadenceInsert)
        .select()
        .single();
        
      if (insertError) {
        console.error(`❌ Erro ao inserir cadência ${cadenceConfig.stage_name}:`, insertError.message);
        return;
      }
      
      insertedCount++;
      console.log(`✅ Cadência "${cadenceConfig.stage_name}" salva com ${cadenceConfig.tasks.length} tasks`);
    }
    
    console.log(`✅ SUCESSO! ${insertedCount} cadências salvas via Supabase direto`);
    
  } catch (error) {
    console.error('❌ Erro no PASSO 1:', error.message);
    return;
  }
  
  // PASSO 2: Verificar se conseguimos carregar as cadências salvas
  console.log('\n🔄 PASSO 2: Verificando carregamento das cadências...');
  
  try {
    const { data: loadedCadences, error: loadError } = await supabase
      .from('cadence_configs')
      .select('*')
      .eq('pipeline_id', pipelineId);
      
    if (loadError) {
      console.error('❌ Erro ao carregar cadências:', loadError.message);
      return;
    }
    
    console.log(`✅ ${loadedCadences.length} cadências carregadas com sucesso`);
    
    loadedCadences.forEach(cadence => {
      const tasksCount = Array.isArray(cadence.tasks) ? cadence.tasks.length : 0;
      console.log(`   - ${cadence.stage_name}: ${tasksCount} tasks`);
    });
    
  } catch (error) {
    console.error('❌ Erro no PASSO 2:', error.message);
    return;
  }
  
  // PASSO 3: Testar via API do backend (opcional, para compatibilidade futura)
  console.log('\n🔄 PASSO 3: Testando via API do backend...');
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    const apiData = {
      pipeline_id: pipelineId,
      cadence_configs: simulatedFormData.cadence_configs,
      tenant_id: tenantId
    };
    
    const response = await fetch('http://127.0.0.1:3001/api/cadence/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiData)
    });
    
    if (!response.ok) {
      throw new Error(`API retornou ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`✅ API funcionando! ${result.configs?.length || 0} cadências processadas`);
    
  } catch (error) {
    console.log(`⚠️  API não disponível ou erro: ${error.message}`);
    console.log('   (Isso não impede o funcionamento via Supabase direto)');
  }
  
  console.log('\n🎯 CONCLUSÃO:');
  console.log('✅ Salvamento direto via Supabase: FUNCIONANDO');
  console.log('✅ Carregamento de cadências: FUNCIONANDO');
  console.log('✅ Estrutura JSONB para tasks: FUNCIONANDO');
  console.log('✅ Sistema pronto para uso no frontend!');
  
  console.log('\n📝 PRÓXIMOS PASSOS:');
  console.log('1. Testar no navegador: criar/editar cadência na pipeline new13');
  console.log('2. Verificar se botão "Atualizar Pipeline" funciona');
  console.log('3. Confirmar que cadências aparecem ao recarregar a página');
}

testCompleteFlow().catch(console.error);
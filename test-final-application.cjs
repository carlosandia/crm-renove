// Teste final simulando exatamente o que a aplicação faz
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

// Cliente simulando o frontend (com anon key)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testApplicationFlow() {
  try {
    console.log('🎯 TESTE FINAL: Simulando exatamente o fluxo da aplicação...');
    
    // Simular dados de usuário (como vem do contexto)
    const user = {
      id: 'user-test-id',
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      role: 'admin'
    };
    
    console.log('👤 Usuário simulado:', user);
    
    // Buscar uma pipeline real
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id, name, tenant_id')
      .eq('tenant_id', user.tenant_id)
      .limit(1)
      .single();
    
    if (pipelineError) {
      console.error('❌ Erro ao buscar pipeline:', pipelineError);
      return;
    }
    
    console.log('📋 Pipeline encontrada:', pipeline);
    
    // Simular cadência exatamente como a aplicação faz
    const cadenceConfig = {
      stage_name: 'Lead',
      stage_order: 0,
      tasks: [
        {
          task_title: 'Enviar email de boas-vindas',
          channel: 'email',
          day_offset: 1,
          is_active: true
        },
        {
          task_title: 'Ligar para qualificar',
          channel: 'phone',
          day_offset: 3,
          is_active: true
        }
      ],
      is_active: true,
      applies_to_entire_pipeline: true,
      pause_resume_capability: true,
      trigger_stage: 'Lead'
    };
    
    // Preparar dados EXATAMENTE como o código da aplicação faz
    const cadenceInsert = {
      pipeline_id: pipeline.id,
      stage_name: cadenceConfig.stage_name,
      stage_order: cadenceConfig.stage_order,
      tasks: cadenceConfig.tasks || [],
      is_active: cadenceConfig.is_active,
      tenant_id: user?.tenant_id,  // EXATAMENTE como no código
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('📝 Dados da cadência para inserção:', {
      pipeline_id: cadenceInsert.pipeline_id,
      stage_name: cadenceInsert.stage_name,
      tenant_id: cadenceInsert.tenant_id,
      tasks_count: cadenceInsert.tasks.length,
      has_tenant_id: cadenceInsert.tenant_id !== null && cadenceInsert.tenant_id !== undefined
    });
    
    // Inserir EXATAMENTE como a aplicação faz
    console.log('🔄 Inserindo cadência...');
    
    const { data: insertedCadenceArray, error: cadenceError } = await supabase
      .from('cadence_configs')
      .insert(cadenceInsert)
      .select();
      
    const insertedCadence = insertedCadenceArray?.[0];
    
    console.log('📊 Resultado da inserção:', {
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
      console.error('❌ Erro ao inserir cadência:', {
        error: cadenceError,
        stage: cadenceConfig.stage_name,
        pipelineId: pipeline.id,
        errorCode: cadenceError.code,
        errorMessage: cadenceError.message,
        errorDetails: cadenceError.details
      });
      
      // Diagnóstico adicional
      console.log('🔍 Diagnóstico RLS...');
      
      // Verificar se o usuário tem permissão para inserir
      const { data: testInsert, error: testError } = await supabase
        .from('cadence_configs')
        .insert({
          pipeline_id: pipeline.id,
          stage_name: 'Test',
          stage_order: 99,
          tasks: [],
          is_active: false,
          tenant_id: user.tenant_id
        })
        .select();
      
      if (testError) {
        console.error('❌ Teste de inserção também falhou:', testError);
      } else {
        console.log('✅ Teste de inserção funcionou:', testInsert);
        
        // Limpar
        await supabase
          .from('cadence_configs')
          .delete()
          .eq('id', testInsert[0].id);
      }
      
      return;
    }
    
    if (!insertedCadence) {
      console.error('❌ Cadência inserida retornou null/undefined:', {
        stage: cadenceConfig.stage_name,
        pipelineId: pipeline.id,
        cadenceData: cadenceInsert,
        returnedArray: insertedCadenceArray,
        arrayLength: insertedCadenceArray?.length || 0,
        possibleCause: 'RLS policy rejeitando inserção'
      });
      return;
    }
    
    console.log('🎉 SUCESSO! Cadência inserida:');
    console.log('📊 Dados finais:', {
      id: insertedCadence.id,
      pipeline_id: insertedCadence.pipeline_id,
      stage_name: insertedCadence.stage_name,
      tenant_id: insertedCadence.tenant_id,
      tasks_count: insertedCadence.tasks?.length || 0,
      tenant_sync_success: insertedCadence.tenant_id === user.tenant_id
    });
    
    // Testar se consegue carregar de volta
    console.log('🔄 Testando carregamento...');
    
    const { data: loadedCadences, error: loadError } = await supabase
      .from('cadence_configs')
      .select('*')
      .eq('pipeline_id', pipeline.id);
    
    if (loadError) {
      console.error('❌ Erro ao carregar cadências:', loadError);
    } else {
      console.log('✅ Cadências carregadas:', loadedCadences.length);
    }
    
    // Limpar teste
    await supabase
      .from('cadence_configs')
      .delete()
      .eq('id', insertedCadence.id);
    
    console.log('🧹 Teste limpo');
    console.log('🎊 TESTE COMPLETO COM SUCESSO!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testApplicationFlow();
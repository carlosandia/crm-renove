// Investigação dos dados da pipeline new13
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function investigatePipelineNew13() {
  try {
    console.log('🔍 Investigando pipeline "new13"...\n');
    
    // 1. Buscar a pipeline new13
    console.log('📋 Buscando pipeline "new13"...');
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('name', 'new13')
      .single();
    
    if (pipelineError) {
      console.error('❌ Erro ao buscar pipeline:', pipelineError);
      return;
    }
    
    if (!pipeline) {
      console.log('❌ Pipeline "new13" não encontrada');
      return;
    }
    
    console.log('✅ Pipeline encontrada:', {
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description,
      tenant_id: pipeline.tenant_id,
      created_by: pipeline.created_by
    });
    
    // 2. Verificar etapas da pipeline
    console.log('\n🎯 Verificando etapas da pipeline...');
    const { data: stages, error: stagesError } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', pipeline.id)
      .order('order_index');
    
    if (stagesError) {
      console.error('❌ Erro ao buscar etapas:', stagesError);
    } else {
      console.log(`✅ Etapas encontradas: ${stages?.length || 0}`);
      if (stages && stages.length > 0) {
        stages.forEach((stage, index) => {
          console.log(`  ${index + 1}. ${stage.name} (ordem: ${stage.order_index}, sistema: ${stage.is_system_stage})`);
        });
      } else {
        console.log('⚠️ Nenhuma etapa encontrada para esta pipeline');
      }
    }
    
    // 3. Verificar membros da pipeline
    console.log('\n👥 Verificando membros da pipeline...');
    const { data: members, error: membersError } = await supabase
      .from('pipeline_members')
      .select(`
        *,
        users:member_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('pipeline_id', pipeline.id);
    
    if (membersError) {
      console.error('❌ Erro ao buscar membros:', membersError);
    } else {
      console.log(`✅ Membros encontrados: ${members?.length || 0}`);
      if (members && members.length > 0) {
        members.forEach((member, index) => {
          const user = member.users;
          console.log(`  ${index + 1}. ${user?.first_name} ${user?.last_name} (${user?.email})`);
        });
      } else {
        console.log('⚠️ Nenhum membro encontrado para esta pipeline');
      }
    }
    
    // 4. Verificar campos customizados
    console.log('\n📝 Verificando campos customizados...');
    const { data: customFields, error: fieldsError } = await supabase
      .from('pipeline_custom_fields')
      .select('*')
      .eq('pipeline_id', pipeline.id)
      .order('field_order');
    
    if (fieldsError) {
      console.error('❌ Erro ao buscar campos customizados:', fieldsError);
    } else {
      console.log(`✅ Campos customizados encontrados: ${customFields?.length || 0}`);
      if (customFields && customFields.length > 0) {
        customFields.forEach((field, index) => {
          console.log(`  ${index + 1}. ${field.field_label} (${field.field_type})`);
        });
      }
    }
    
    // 5. Resumo final
    console.log('\n📊 RESUMO FINAL:');
    console.log(`Pipeline: ${pipeline.name}`);
    console.log(`Etapas: ${stages?.length || 0}`);
    console.log(`Membros: ${members?.length || 0}`);
    console.log(`Campos Customizados: ${customFields?.length || 0}`);
    
    // 6. Verificar se há etapas do sistema criadas automaticamente
    console.log('\n🔧 Verificando etapas do sistema...');
    const systemStages = stages?.filter(stage => stage.is_system_stage) || [];
    const customStages = stages?.filter(stage => !stage.is_system_stage) || [];
    
    console.log(`Etapas do sistema: ${systemStages.length}`);
    console.log(`Etapas customizadas: ${customStages.length}`);
    
    if (systemStages.length === 0) {
      console.log('⚠️ PROBLEMA: Nenhuma etapa do sistema encontrada! Deveria ter pelo menos Lead, Ganho, Perdido');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

investigatePipelineNew13();
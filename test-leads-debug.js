// TESTE DIRETO DE LEADS - Execute no console do navegador
// Copie e cole no console da página do CRM (F12)

console.log('🔍 TESTE DIRETO DE LEADS');
console.log('========================');

async function testLeadsDirectly() {
  try {
    // Pegar referência do Supabase
    const supabase = window.supabase || window.__SUPABASE_CLIENT__;
    if (!supabase) {
      console.error('❌ Supabase não encontrado');
      return;
    }

    // 1. Verificar usuário atual
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    console.log('👤 Usuário atual:', {
      id: user?.id,
      email: user?.email,
      tenant_id: user?.user_metadata?.tenant_id
    });

    // 2. Buscar dados básicos da tabela users
    const { data: userFromDB } = await supabase
      .from('users')
      .select('*')
      .eq('id', user?.id)
      .single();
    
    console.log('👥 Dados do usuário no DB:', userFromDB);

    // 3. Verificar todas as pipelines
    const { data: allPipelines } = await supabase
      .from('pipelines')
      .select('*')
      .eq('is_active', true);
    
    console.log('🔗 Pipelines disponíveis:', allPipelines);

    // 4. Verificar todos os pipeline_leads
    const { data: allPipelineLeads } = await supabase
      .from('pipeline_leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('📊 Todos os pipeline_leads:', allPipelineLeads);

    // 5. Verificar todos os leads_master
    const { data: allLeadsMaster } = await supabase
      .from('leads_master')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('👥 Todos os leads_master:', allLeadsMaster);

    // 6. Verificar filtros específicos para o usuário
    if (userFromDB?.role === 'member') {
      console.log('\n🔍 FILTROS ESPECÍFICOS PARA MEMBER:');
      
      // Pipeline leads do member
      const { data: memberPipelineLeads } = await supabase
        .from('pipeline_leads')
        .select('*')
        .eq('assigned_to', user?.id);
      
      console.log('📊 Pipeline leads do member:', memberPipelineLeads);

      // Leads master do member
      const { data: memberLeadsMaster } = await supabase
        .from('leads_master')
        .select('*')
        .eq('assigned_to', user?.id);
      
      console.log('👥 Leads master do member:', memberLeadsMaster);

      // Verificar também por tenant_id
      const { data: tenantLeadsMaster } = await supabase
        .from('leads_master')
        .select('*')
        .eq('tenant_id', userFromDB.tenant_id);
      
      console.log('🏢 Leads master por tenant_id:', tenantLeadsMaster);
    }

    // 7. Verificar stages
    const { data: allStages } = await supabase
      .from('pipeline_stages')
      .select('*')
      .order('order_index');
    
    console.log('📋 Todas as stages:', allStages);

    console.log('\n✅ TESTE COMPLETO FINALIZADO');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Função para criar um lead de teste completo
async function createCompleteTestLead() {
  try {
    const supabase = window.supabase || window.__SUPABASE_CLIENT__;
    if (!supabase) {
      console.error('❌ Supabase não encontrado');
      return;
    }

    // Buscar usuário atual
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    // Buscar dados do usuário
    const { data: userFromDB } = await supabase
      .from('users')
      .select('*')
      .eq('id', user?.id)
      .single();

    // Buscar primeira pipeline ativa
    const { data: pipelines } = await supabase
      .from('pipelines')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (!pipelines || pipelines.length === 0) {
      console.error('❌ Nenhuma pipeline encontrada');
      return;
    }

    // Buscar primeira stage
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', pipelines[0].id)
      .order('order_index')
      .limit(1);

    if (!stages || stages.length === 0) {
      console.error('❌ Nenhuma stage encontrada');
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    
    // 1. Criar pipeline_lead
    const pipelineLeadData = {
      pipeline_id: pipelines[0].id,
      stage_id: stages[0].id,
      lead_data: {
        nome_oportunidade: `Teste Completo ${timestamp}`,
        valor_oportunidade: 5000,
        responsavel: userFromDB?.first_name || 'Teste',
        nome_lead: `João Teste ${timestamp}`,
        email_lead: `joao.teste.${Date.now()}@email.com`,
        telefone_lead: '(11) 99999-9999'
      },
      created_by: user?.id,
      assigned_to: user?.id
    };

    console.log('🚀 Criando pipeline_lead:', pipelineLeadData);

    const { data: pipelineLead, error: pipelineError } = await supabase
      .from('pipeline_leads')
      .insert([pipelineLeadData])
      .select()
      .single();

    if (pipelineError) {
      console.error('❌ Erro ao criar pipeline_lead:', pipelineError);
      return;
    }

    console.log('✅ Pipeline lead criado:', pipelineLead);

    // 2. Criar leads_master correspondente
    const leadsMasterData = {
      first_name: pipelineLeadData.lead_data.nome_lead.split(' ')[0],
      last_name: pipelineLeadData.lead_data.nome_lead.split(' ').slice(1).join(' '),
      email: pipelineLeadData.lead_data.email_lead,
      phone: pipelineLeadData.lead_data.telefone_lead,
      estimated_value: pipelineLeadData.lead_data.valor_oportunidade,
      lead_source: 'Pipeline',
      tenant_id: userFromDB?.tenant_id,
      assigned_to: user?.id,
      pipeline_lead_id: pipelineLead.id
    };

    console.log('🚀 Criando leads_master:', leadsMasterData);

    const { data: leadMaster, error: leadError } = await supabase
      .from('leads_master')
      .insert([leadsMasterData])
      .select()
      .single();

    if (leadError) {
      console.error('❌ Erro ao criar leads_master:', leadError);
    } else {
      console.log('✅ Lead master criado:', leadMaster);
    }

    console.log('\n🎉 LEAD COMPLETO CRIADO COM SUCESSO!');
    console.log('Agora execute testLeadsDirectly() para ver os resultados');

  } catch (error) {
    console.error('❌ Erro ao criar lead completo:', error);
  }
}

// Função para limpar leads de teste
async function clearTestLeads() {
  try {
    const supabase = window.supabase || window.__SUPABASE_CLIENT__;
    if (!supabase) {
      console.error('❌ Supabase não encontrado');
      return;
    }

    // Deletar leads de teste
    await supabase
      .from('pipeline_leads')
      .delete()
      .like('lead_data->nome_oportunidade', '%Teste%');

    await supabase
      .from('leads_master')
      .delete()
      .like('first_name', '%Teste%');

    console.log('🧹 Leads de teste removidos');

  } catch (error) {
    console.error('❌ Erro ao limpar leads:', error);
  }
}

// Instruções
console.log('\n🎯 COMANDOS DISPONÍVEIS:');
console.log('1. testLeadsDirectly() - Verificar todos os dados');
console.log('2. createCompleteTestLead() - Criar lead de teste completo');
console.log('3. clearTestLeads() - Limpar leads de teste');

// Auto-executar
setTimeout(() => {
  testLeadsDirectly();
}, 500); 
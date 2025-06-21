// TESTE RÁPIDO CORRIGIDO - Execute no console do navegador
console.log('🔧 TESTE RÁPIDO CORRIGIDO');
console.log('=========================');

async function testCreateLeadFixed() {
  try {
    const supabase = window.supabase || window.__SUPABASE_CLIENT__;
    if (!supabase) {
      console.error('❌ Supabase não encontrado');
      return;
    }

    // Buscar usuário atual
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    console.log('👤 Usuário:', user?.email);

    // Buscar dados do usuário
    const { data: userFromDB } = await supabase
      .from('users')
      .select('*')
      .eq('id', user?.id)
      .single();
    
    console.log('👥 Dados do usuário:', userFromDB);

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

    console.log('🔗 Pipeline selecionada:', pipelines[0].name);

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

    console.log('📋 Stage selecionada:', stages[0].name);

    const timestamp = new Date().toLocaleTimeString();
    
    // Dados corretos SEM as colunas que causam erro
    const leadData = {
      pipeline_id: pipelines[0].id,
      stage_id: stages[0].id,
      lead_data: {
        nome_oportunidade: `Teste Corrigido ${timestamp}`,
        valor_oportunidade: 'R$ 5.000,00',
        responsavel: userFromDB?.first_name || 'Teste',
        nome_lead: `João Teste ${timestamp}`,
        email_lead: `joao.teste.${Date.now()}@email.com`,
        telefone_lead: '(11) 99999-9999'
      },
      created_by: user?.id,
      assigned_to: user?.id
    };

    console.log('🚀 Criando pipeline_lead (CORRIGIDO):', leadData);

    // 1. Criar pipeline_lead
    const { data: pipelineLead, error: pipelineError } = await supabase
      .from('pipeline_leads')
      .insert([leadData])
      .select()
      .single();

    if (pipelineError) {
      console.error('❌ Erro ao criar pipeline_lead:', pipelineError);
      return;
    }

    console.log('✅ Pipeline lead criado com sucesso:', pipelineLead);

    // 2. Criar leads_master correspondente
    const leadsMasterData = {
      first_name: 'João',
      last_name: `Teste ${timestamp}`,
      email: leadData.lead_data.email_lead,
      phone: leadData.lead_data.telefone_lead,
      estimated_value: 5000,
      lead_source: 'Pipeline',
      lead_temperature: 'warm',
      status: 'active',
      tenant_id: userFromDB?.tenant_id,
      assigned_to: user?.id,
      created_by: user?.id,
      origem: 'Pipeline'
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
      console.log('✅ Lead master criado com sucesso:', leadMaster);
    }

    console.log('\n🎉 TESTE COMPLETO COM SUCESSO!');
    console.log('Agora recarregue a página e verifique:');
    console.log('1. Pipeline de Vendas - etapa "Novos Leads"');
    console.log('2. Menu Leads - deve aparecer o lead criado');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Função para verificar se os leads aparecem
async function checkLeadsAfterCreation() {
  try {
    const supabase = window.supabase || window.__SUPABASE_CLIENT__;
    
    // Verificar pipeline_leads
    const { data: pipelineLeads } = await supabase
      .from('pipeline_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
    console.log('📊 Últimos pipeline_leads:', pipelineLeads);

    // Verificar leads_master
    const { data: leadsMaster } = await supabase
      .from('leads_master')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
    console.log('👥 Últimos leads_master:', leadsMaster);

    console.log('\n✅ Verificação completa!');

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  }
}

// Instruções
console.log('\n🎯 COMANDOS:');
console.log('1. testCreateLeadFixed() - Criar lead com correções');
console.log('2. checkLeadsAfterCreation() - Verificar leads criados');

// Auto-executar teste
setTimeout(() => {
  console.log('🚀 Executando teste automaticamente em 2 segundos...');
  setTimeout(testCreateLeadFixed, 2000);
}, 1000); 
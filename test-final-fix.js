// TESTE FINAL CORRIGIDO - Execute no console do navegador
console.log('🔧 TESTE FINAL CORRIGIDO');
console.log('========================');

async function createLeadFinalFixed() {
  try {
    const supabase = window.supabase || window.__SUPABASE_CLIENT__;
    if (!supabase) {
      console.error('❌ Supabase não encontrado');
      return;
    }

    console.log('🚀 Iniciando teste final...');

    // 1. Buscar usuário atual
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    console.log('👤 Usuário:', user?.email);

    // 2. Buscar dados do usuário na tabela users
    const { data: userFromDB } = await supabase
      .from('users')
      .select('*')
      .eq('id', user?.id)
      .single();
    
    console.log('👥 Dados do usuário no DB:', userFromDB);

    // 3. Buscar primeira pipeline ativa
    const { data: pipelines } = await supabase
      .from('pipelines')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (!pipelines || pipelines.length === 0) {
      console.error('❌ Nenhuma pipeline encontrada');
      return;
    }

    console.log('🔗 Pipeline encontrada:', pipelines[0]);

    // 4. Buscar primeira stage da pipeline
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

    console.log('📋 Stage encontrada:', stages[0]);

    const timestamp = new Date().toLocaleTimeString();
    const uniqueEmail = `joao.teste.${Date.now()}@email.com`;
    
    // 5. Criar pipeline_lead (SEM colunas problemáticas)
    const pipelineLeadData = {
      pipeline_id: pipelines[0].id,
      stage_id: stages[0].id,
      lead_data: {
        nome_oportunidade: `Teste Final ${timestamp}`,
        valor_oportunidade: 'R$ 5.000,00',
        responsavel: userFromDB?.first_name || 'Teste',
        nome_lead: `João Teste ${timestamp}`,
        email_lead: uniqueEmail,
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

    console.log('✅ Pipeline lead criado com sucesso!', pipelineLead);

    // 6. Criar leads_master (SEM colunas problemáticas)
    const leadsMasterData = {
      first_name: 'João',
      last_name: `Teste ${timestamp}`,
      email: uniqueEmail,
      phone: '(11) 99999-9999',
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
      return;
    }

    console.log('✅ Lead master criado com sucesso!', leadMaster);

    // 7. Verificar se foram criados
    console.log('\n🔍 VERIFICAÇÃO FINAL:');
    
    const { data: checkPipeline } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('id', pipelineLead.id)
      .single();
    
    const { data: checkLeads } = await supabase
      .from('leads_master')
      .select('*')
      .eq('id', leadMaster.id)
      .single();

    console.log('📊 Pipeline lead verificado:', checkPipeline);
    console.log('👥 Lead master verificado:', checkLeads);

    console.log('\n🎉 SUCESSO TOTAL!');
    console.log('====================');
    console.log('✅ Pipeline lead criado e salvo');
    console.log('✅ Lead master criado e salvo');
    console.log('\n📍 PRÓXIMOS PASSOS:');
    console.log('1. Recarregue a página (F5)');
    console.log('2. Vá para Pipeline de Vendas → etapa "Novos Leads"');
    console.log('3. Vá para menu Leads');
    console.log('4. Ambos devem mostrar o lead criado!');

    return { pipelineLead, leadMaster };

  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
  }
}

// Função para verificar estrutura das tabelas
async function checkTableStructure() {
  try {
    const supabase = window.supabase || window.__SUPABASE_CLIENT__;
    
    console.log('🔍 Verificando estrutura das tabelas...');
    
    // Tentar inserir dados vazios para ver quais colunas existem
    try {
      await supabase.from('pipeline_leads').insert([{}]);
    } catch (error) {
      console.log('📊 Estrutura pipeline_leads:', error.message);
    }
    
    try {
      await supabase.from('leads_master').insert([{}]);
    } catch (error) {
      console.log('👥 Estrutura leads_master:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error);
  }
}

// Instruções
console.log('\n🎯 COMANDOS DISPONÍVEIS:');
console.log('1. createLeadFinalFixed() - Criar lead com todas as correções');
console.log('2. checkTableStructure() - Verificar estrutura das tabelas');

// Auto-executar
console.log('\n⏰ Executando teste automaticamente em 3 segundos...');
setTimeout(() => {
  createLeadFinalFixed();
}, 3000);

// Script de teste - Cole no console do navegador
async function testarCorrecaoCompleta() {
  console.log('🧪 TESTE DA CORREÇÃO COMPLETA');
  console.log('=====================================');
  
  const supabase = window.supabase || window.__SUPABASE_CLIENT__;
  if (!supabase) {
    console.error('❌ Supabase não encontrado');
    return;
  }

  try {
    // 1. Verificar usu
  } catch (error) {
    console.error('❌ Erro ao testar correção completa:', error);
  }
} 
// DEBUG SCRIPT - Execute no console do navegador (F12)
// Copie e cole este código no console da página do CRM

console.log('🔍 DEBUG: Verificando sincronização de leads');
console.log('================================================');

// Função principal de debug
async function debugLeadSync() {
  try {
    // Verificar se estamos no contexto correto
    if (typeof window === 'undefined') {
      console.error('❌ Execute este script no console do navegador');
      return;
    }

    // Verificar se temos acesso ao Supabase
    const supabase = window.supabase || window.__SUPABASE_CLIENT__;
    if (!supabase) {
      console.error('❌ Cliente Supabase não encontrado');
      return;
    }

    console.log('✅ Cliente Supabase encontrado');

    // 1. Verificar usuário atual
    console.log('\n👤 Verificando usuário atual...');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('❌ Erro ao buscar usuário:', userError);
    } else if (userData.user) {
      console.log('✅ Usuário logado:', {
        id: userData.user.id,
        email: userData.user.email,
        tenant_id: userData.user.user_metadata?.tenant_id
      });
    }

    // 2. Verificar pipeline_leads
    console.log('\n📊 Verificando pipeline_leads...');
    const { data: pipelineLeads, error: pipelineError } = await supabase
      .from('pipeline_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (pipelineError) {
      console.error('❌ Erro ao buscar pipeline_leads:', pipelineError);
    } else {
      console.log(`✅ Pipeline leads encontrados: ${pipelineLeads?.length || 0}`);
      if (pipelineLeads && pipelineLeads.length > 0) {
        console.table(pipelineLeads.map(lead => ({
          id: lead.id,
          pipeline_id: lead.pipeline_id,
          stage_id: lead.stage_id,
          created_by: lead.created_by,
          assigned_to: lead.assigned_to,
          created_at: lead.created_at,
          nome: lead.lead_data?.nome_oportunidade || lead.lead_data?.nome || 'N/A'
        })));
      }
    }

    // 3. Verificar leads_master
    console.log('\n👥 Verificando leads_master...');
    const { data: leadsMaster, error: leadsError } = await supabase
      .from('leads_master')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (leadsError) {
      console.error('❌ Erro ao buscar leads_master:', leadsError);
    } else {
      console.log(`✅ Leads master encontrados: ${leadsMaster?.length || 0}`);
      if (leadsMaster && leadsMaster.length > 0) {
        console.table(leadsMaster.map(lead => ({
          id: lead.id,
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email,
          tenant_id: lead.tenant_id,
          assigned_to: lead.assigned_to,
          pipeline_lead_id: lead.pipeline_lead_id,
          created_at: lead.created_at
        })));
      }
    }

    // 4. Verificar pipelines
    console.log('\n🔗 Verificando pipelines...');
    const { data: pipelines, error: pipelinesError } = await supabase
      .from('pipelines')
      .select('id, name, tenant_id, created_by, is_active')
      .eq('is_active', true);

    if (pipelinesError) {
      console.error('❌ Erro ao buscar pipelines:', pipelinesError);
    } else {
      console.log(`✅ Pipelines encontradas: ${pipelines?.length || 0}`);
      if (pipelines && pipelines.length > 0) {
        console.table(pipelines);
      }
    }

    // 5. Verificar stages
    console.log('\n📋 Verificando pipeline_stages...');
    const { data: stages, error: stagesError } = await supabase
      .from('pipeline_stages')
      .select('*')
      .order('order_index');

    if (stagesError) {
      console.error('❌ Erro ao buscar stages:', stagesError);
    } else {
      console.log(`✅ Stages encontrados: ${stages?.length || 0}`);
      if (stages && stages.length > 0) {
        console.table(stages.map(stage => ({
          id: stage.id,
          name: stage.name,
          pipeline_id: stage.pipeline_id,
          order_index: stage.order_index
        })));
      }
    }

    // 6. Verificar usuários
    console.log('\n👥 Verificando usuários...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, tenant_id, first_name, last_name')
      .limit(5);

    if (usersError) {
      console.error('❌ Erro ao buscar usuários:', usersError);
    } else {
      console.log(`✅ Usuários encontrados: ${users?.length || 0}`);
      if (users && users.length > 0) {
        console.table(users);
      }
    }

    console.log('\n🎯 ANÁLISE COMPLETA FINALIZADA');
    console.log('================================================');

  } catch (error) {
    console.error('❌ Erro geral no debug:', error);
  }
}

// Função para criar um lead de teste
async function createTestLead() {
  try {
    const supabase = window.supabase || window.__SUPABASE_CLIENT__;
    if (!supabase) {
      console.error('❌ Cliente Supabase não encontrado');
      return;
    }

    // Buscar primeira pipeline
    const { data: pipelines } = await supabase
      .from('pipelines')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (!pipelines || pipelines.length === 0) {
      console.error('❌ Nenhuma pipeline encontrada');
      return;
    }

    // Buscar primeira stage da pipeline
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

         const testData = {
       pipeline_id: pipelines[0].id,
       stage_id: stages[0].id,
       lead_data: {
         nome_oportunidade: 'Teste Debug ' + new Date().toLocaleTimeString(),
         valor_oportunidade: 5000,
         responsavel: 'Teste',
         nome_lead: 'João Teste',
         email_lead: 'joao.teste@email.com',
         telefone_lead: '(11) 99999-9999'
       }
     };

    console.log('🚀 Criando lead de teste:', testData);

    const { data, error } = await supabase
      .from('pipeline_leads')
      .insert([testData])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar lead de teste:', error);
    } else {
      console.log('✅ Lead de teste criado:', data);
    }

  } catch (error) {
    console.error('❌ Erro ao criar lead de teste:', error);
  }
}

// Instruções
console.log('\n🎯 INSTRUÇÕES:');
console.log('1. Execute: debugLeadSync() - para ver todos os dados');
console.log('2. Execute: createTestLead() - para criar um lead de teste');
console.log('3. Execute: debugLeadSync() - novamente para ver o resultado');

// Auto-executar se estiver no navegador
if (typeof window !== 'undefined') {
  // Aguardar um pouco para garantir que tudo carregou
  setTimeout(() => {
    debugLeadSync();
  }, 1000);
} 
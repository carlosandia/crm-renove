// TESTE COM CORREÇÃO DE RLS - Execute no console do navegador
console.log('🔐 TESTE COM CORREÇÃO DE RLS');
console.log('============================');

async function testWithRLSFix() {
  try {
    const supabase = window.supabase || window.__SUPABASE_CLIENT__;
    if (!supabase) {
      console.error('❌ Supabase não encontrado');
      return;
    }

    console.log('🔍 Verificando usuário e permissões...');

    // 1. Verificar usuário atual
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error('❌ Erro ao obter usuário:', userError);
      return;
    }

    const user = userData.user;
    console.log('👤 Usuário autenticado:', {
      id: user.id,
      email: user.email
    });

    // 2. Verificar dados do usuário na tabela users
    const { data: userFromDB, error: userDBError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userDBError) {
      console.error('❌ Erro ao buscar dados do usuário:', userDBError);
      return;
    }

    console.log('👥 Dados do usuário no DB:', userFromDB);

    // 3. Verificar se o usuário tem permissões adequadas
    if (!userFromDB.role || !['admin', 'super_admin', 'member'].includes(userFromDB.role)) {
      console.error('❌ Usuário sem role adequado:', userFromDB.role);
      return;
    }

    // 4. Buscar pipeline e stage
    const { data: pipelines, error: pipelineError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (pipelineError || !pipelines || pipelines.length === 0) {
      console.error('❌ Erro ao buscar pipeline:', pipelineError);
      return;
    }

    const pipeline = pipelines[0];
    console.log('🔗 Pipeline encontrada:', pipeline.name);

    const { data: stages, error: stageError } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', pipeline.id)
      .order('order_index')
      .limit(1);

    if (stageError || !stages || stages.length === 0) {
      console.error('❌ Erro ao buscar stage:', stageError);
      return;
    }

    const stage = stages[0];
    console.log('📋 Stage encontrada:', stage.name);

    // 5. Preparar dados únicos
    const timestamp = new Date().toLocaleTimeString();
    const uniqueId = Date.now();
    const uniqueEmail = `teste.${uniqueId}@email.com`;

    // 6. Tentar criar pipeline_lead com dados mínimos necessários
    console.log('🚀 Tentando criar pipeline_lead...');
    
    const pipelineLeadData = {
      pipeline_id: pipeline.id,
      stage_id: stage.id,
      lead_data: {
        nome_oportunidade: `Teste RLS ${timestamp}`,
        valor_oportunidade: 'R$ 1.000,00',
        responsavel: userFromDB.first_name || 'Teste',
        nome_lead: `Lead Teste ${timestamp}`,
        email_lead: uniqueEmail,
        telefone_lead: '(11) 99999-9999'
      },
      created_by: user.id,
      assigned_to: user.id  // Importante: atribuir ao próprio usuário
    };

    const { data: pipelineLead, error: pipelineInsertError } = await supabase
      .from('pipeline_leads')
      .insert([pipelineLeadData])
      .select()
      .single();

    if (pipelineInsertError) {
      console.error('❌ Erro ao inserir pipeline_lead:', pipelineInsertError);
      
      // Tentar diagnóstico
      console.log('🔍 Diagnóstico do erro:');
      console.log('- Código do erro:', pipelineInsertError.code);
      console.log('- Mensagem:', pipelineInsertError.message);
      console.log('- Detalhes:', pipelineInsertError.details);
      
      if (pipelineInsertError.message.includes('row-level security')) {
        console.log('🔐 Problema de RLS detectado!');
        console.log('📋 Execute o SQL no painel do Supabase:');
        console.log(`
-- CORREÇÃO RLS TEMPORÁRIA (Execute no SQL Editor do Supabase)
ALTER TABLE pipeline_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads_master DISABLE ROW LEVEL SECURITY;
        `);
      }
      
      return;
    }

    console.log('✅ Pipeline lead criado com sucesso!', pipelineLead);

    // 7. Tentar criar leads_master
    console.log('🚀 Tentando criar leads_master...');
    
    const leadsMasterData = {
      first_name: 'Lead',
      last_name: `Teste ${timestamp}`,
      email: uniqueEmail,
      phone: '(11) 99999-9999',
      estimated_value: 1000,
      lead_source: 'Pipeline',
      lead_temperature: 'warm',
      status: 'active',
      tenant_id: userFromDB.tenant_id,
      assigned_to: user.id,  // Importante: atribuir ao próprio usuário
      created_by: user.id,
      origem: 'Pipeline'
    };

    const { data: leadMaster, error: leadInsertError } = await supabase
      .from('leads_master')
      .insert([leadsMasterData])
      .select()
      .single();

    if (leadInsertError) {
      console.error('❌ Erro ao inserir leads_master:', leadInsertError);
      
      // Diagnóstico
      console.log('🔍 Diagnóstico do erro leads_master:');
      console.log('- Código do erro:', leadInsertError.code);
      console.log('- Mensagem:', leadInsertError.message);
      
      return;
    }

    console.log('✅ Lead master criado com sucesso!', leadMaster);

    // 8. Verificação final
    console.log('\n🔍 VERIFICAÇÃO FINAL:');
    
    const { data: verifyPipeline } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('id', pipelineLead.id);
    
    const { data: verifyLeads } = await supabase
      .from('leads_master')
      .select('*')
      .eq('id', leadMaster.id);

    console.log('📊 Pipeline lead verificado:', verifyPipeline);
    console.log('👥 Lead master verificado:', verifyLeads);

    console.log('\n🎉 SUCESSO COMPLETO!');
    console.log('==================');
    console.log('✅ Ambos os registros foram criados');
    console.log('✅ Políticas RLS estão funcionando');
    console.log('\n📍 PRÓXIMOS PASSOS:');
    console.log('1. Recarregue a página (F5)');
    console.log('2. Verifique Pipeline de Vendas');
    console.log('3. Verifique menu Leads');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Função para desabilitar RLS temporariamente (só para debug)
async function disableRLSTemporarily() {
  console.log('⚠️ ATENÇÃO: Esta função desabilita RLS temporariamente');
  console.log('Execute apenas para debug e reabilite depois!');
  console.log('\nSQL para executar no painel do Supabase:');
  console.log(`
-- DESABILITAR RLS (TEMPORÁRIO)
ALTER TABLE pipeline_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads_master DISABLE ROW LEVEL SECURITY;

-- Para REABILITAR depois:
-- ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE leads_master ENABLE ROW LEVEL SECURITY;
  `);
}

// Função para verificar políticas RLS atuais
async function checkRLSPolicies() {
  console.log('🔍 Para verificar políticas RLS, execute no SQL Editor:');
  console.log(`
SELECT 
    tablename,
    policyname,
    cmd,
    permissive,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('pipeline_leads', 'leads_master')
ORDER BY tablename, policyname;
  `);
}

// Instruções
console.log('\n🎯 COMANDOS DISPONÍVEIS:');
console.log('1. testWithRLSFix() - Teste com correção de RLS');
console.log('2. disableRLSTemporarily() - Mostrar SQL para desabilitar RLS');
console.log('3. checkRLSPolicies() - Mostrar SQL para verificar políticas');

// Auto-executar
console.log('\n⏰ Executando teste em 2 segundos...');
setTimeout(() => {
  testWithRLSFix();
}, 2000); 
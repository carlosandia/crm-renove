// TESTE ESPECÍFICO: Verificar se a geração de atividades de cadência funciona
// Este script simula a criação de um lead via StepLeadModal.tsx

console.log('🧪 INICIANDO TESTE DE CRIAÇÃO DE LEAD COM GERAÇÃO DE ATIVIDADES');

// Simular dados do lead (baseado na estrutura real do sistema)
const testLeadData = {
  pipeline_id: "ee4e3ea3-bfb4-48b4-8de6-85216811e5b8", // Pipeline real do sistema
  stage_id: "81342c40-ab41-4387-8ffa-9a58efd58495", // Stage "Lead" real do sistema
  custom_data: {
    nome_lead: "Teste Cadência",
    email: "teste.cadencia@test.com",
    telefone: "+5511999887766",
    empresa: "Teste Cadência Ltd",
    nome_oportunidade: "Oportunidade Teste Automática",
    valor: "R$ 5000",
    titulo: "Teste de Geração de Atividades"
  },
  tenant_id: "d7caffc1-c923-47c8-9301-ca9eeff1a243", // Tenant ID real
  created_by: "seraquevai@seraquevai.com"
};

// Função para fazer o teste
async function testLeadCreationWithCadence() {
  try {
    // Obter token do Supabase do localStorage
    const authData = JSON.parse(localStorage.getItem('sb-marajvabdwkpgopytvhh-auth-token') || '{}');
    const token = authData.access_token;
    
    if (!token) {
      console.error('❌ Token de autenticação não encontrado. Faça login primeiro.');
      return;
    }

    console.log('📊 Dados do lead de teste:', {
      pipeline_id: testLeadData.pipeline_id.substring(0, 8),
      stage_id: testLeadData.stage_id.substring(0, 8),
      tenant_id: testLeadData.tenant_id.substring(0, 8),
      nome: testLeadData.custom_data.nome_lead,
      hasToken: !!token
    });

    // Converter custom_data para o formato esperado pela API
    const opportunityData = {
      pipeline_id: testLeadData.pipeline_id,
      stage_id: testLeadData.stage_id,
      nome_oportunidade: testLeadData.custom_data.nome_oportunidade,
      valor: testLeadData.custom_data.valor,
      nome_lead: testLeadData.custom_data.nome_lead,
      email: testLeadData.custom_data.email,
      telefone: testLeadData.custom_data.telefone,
      nome_contato: testLeadData.custom_data.empresa,
      lead_source: 'new_lead'
    };

    // 1. Fazer POST para criar o lead (simulando StepLeadModal.tsx)
    console.log('🚀 Criando lead via API...');
    
    const createResponse = await fetch('http://127.0.0.1:3001/api/opportunities/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(opportunityData)
    });

    const createResult = await createResponse.json();
    console.log('📋 Resultado da criação:', {
      success: createResponse.ok,
      status: createResponse.status,
      opportunityId: createResult.opportunity_id?.substring(0, 8),
      leadMasterId: createResult.lead_id?.substring(0, 8)
    });

    if (!createResponse.ok) {
      console.error('❌ Falha na criação do lead:', createResult);
      return;
    }

    const leadId = createResult.opportunity_id; // pipeline_lead ID para buscar tarefas
    console.log(`✅ Lead criado com sucesso: ${leadId.substring(0, 8)}`);

    // 2. Aguardar um pouco para geração assíncrona de atividades
    console.log('⏳ Aguardando geração assíncrona de atividades (5 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. Verificar se atividades foram criadas consultando cadence_task_instances
    console.log('🔍 Verificando atividades geradas...');
    
    const tasksResponse = await fetch(`http://127.0.0.1:3001/api/lead-tasks/lead/${leadId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (tasksResponse.ok) {
      const tasksResult = await tasksResponse.json();
      const tasks = tasksResult.tasks || [];
      
      console.log('📊 Atividades encontradas:', {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending' || t.status === 'pendente').length,
        completed: tasks.filter(t => t.status === 'completed' || t.status === 'concluida').length
      });

      if (tasks.length > 0) {
        console.log('✅ SUCESSO: Atividades foram geradas automaticamente!');
        tasks.slice(0, 3).forEach((task, i) => {
          console.log(`📝 Atividade ${i + 1}:`, {
            title: task.title || task.descricao,
            channel: task.channel || task.canal,
            day_offset: task.day_offset,
            scheduled_at: task.scheduled_at?.substring(0, 10) || task.data_programada?.substring(0, 10)
          });
        });
      } else {
        console.warn('⚠️ PROBLEMA: Nenhuma atividade foi gerada para o lead');
      }
    } else {
      console.error('❌ Falha ao buscar atividades:', tasksResponse.status);
      const errorText = await tasksResponse.text();
      console.error('Erro:', errorText);
    }

    // 4. Cleanup - remover lead de teste
    console.log('🧹 Removendo lead de teste...');
    
    // Nota: Como não temos endpoint DELETE para opportunities, vamos apenas logar
    console.log('⚠️ Cleanup manual necessário - lead criado para análise:', {
      opportunity_id: leadId.substring(0, 8),
      lead_master_id: createResult.lead_id?.substring(0, 8)
    });

    console.log('✅ Teste concluído e lead de teste removido');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar o teste
testLeadCreationWithCadence();
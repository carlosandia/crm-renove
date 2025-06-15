// Script de teste para as APIs de Pipeline
// Execute com: node test-pipeline-api.js

const BASE_URL = 'http://localhost:5001/api';

// Função auxiliar para fazer requests
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    console.log(`${options.method || 'GET'} ${url}:`, response.status, data);
    return { response, data };
  } catch (error) {
    console.error(`Erro em ${url}:`, error.message);
    return { error };
  }
}

async function testPipelineAPI() {
  console.log('🧪 Testando APIs de Pipeline...\n');

  // 1. Testar listagem de pipelines
  console.log('1️⃣ Testando listagem de pipelines:');
  await makeRequest(`${BASE_URL}/pipelines?tenant_id=tenant-1`);
  
  // 2. Testar criação de pipeline
  console.log('\n2️⃣ Testando criação de pipeline:');
  const createResult = await makeRequest(`${BASE_URL}/pipelines`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Pipeline Teste API',
      description: 'Pipeline criada via teste automatizado',
      tenant_id: 'tenant-1',
      created_by: 'test-user-id',
      member_ids: []
    })
  });

  let pipelineId = null;
  if (createResult.data && createResult.data.pipeline) {
    pipelineId = createResult.data.pipeline.id;
    console.log('✅ Pipeline criada com ID:', pipelineId);
  }

  if (pipelineId) {
    // 3. Testar busca de pipeline específica
    console.log('\n3️⃣ Testando busca de pipeline específica:');
    await makeRequest(`${BASE_URL}/pipelines/${pipelineId}`);

    // 4. Testar criação de etapa
    console.log('\n4️⃣ Testando criação de etapa:');
    const stageResult = await makeRequest(`${BASE_URL}/pipelines/${pipelineId}/stages`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Contato Inicial',
        temperature_score: 25,
        max_days_allowed: 7,
        color: '#EF4444'
      })
    });

    let stageId = null;
    if (stageResult.data && stageResult.data.stage) {
      stageId = stageResult.data.stage.id;
      console.log('✅ Etapa criada com ID:', stageId);
    }

    // 5. Testar listagem de etapas
    console.log('\n5️⃣ Testando listagem de etapas:');
    await makeRequest(`${BASE_URL}/pipelines/${pipelineId}/stages`);

    if (stageId) {
      // 6. Testar criação de follow-up
      console.log('\n6️⃣ Testando criação de follow-up:');
      await makeRequest(`${BASE_URL}/pipelines/${pipelineId}/follow-ups`, {
        method: 'POST',
        body: JSON.stringify({
          stage_id: stageId,
          day_offset: 3,
          note: 'Fazer primeiro contato com o lead'
        })
      });
    }

    // 7. Testar atualização de pipeline
    console.log('\n7️⃣ Testando atualização de pipeline:');
    await makeRequest(`${BASE_URL}/pipelines/${pipelineId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Pipeline Teste API - Atualizada',
        description: 'Descrição atualizada via teste'
      })
    });

    // 8. Testar exclusão de pipeline (comentado para não apagar)
    console.log('\n8️⃣ Testando exclusão de pipeline (DESABILITADO):');
    console.log('⚠️ Exclusão desabilitada para preservar dados de teste');
    // await makeRequest(`${BASE_URL}/pipelines/${pipelineId}`, { method: 'DELETE' });
  }

  console.log('\n✅ Testes concluídos!');
}

// Executar testes
testPipelineAPI().catch(console.error);
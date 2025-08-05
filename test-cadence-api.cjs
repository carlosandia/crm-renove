#!/usr/bin/env node

/**
 * Script de teste para verificar se a API de Cadência está funcionando corretamente
 * Testa os endpoints principais e operações CRUD
 */

const API_BASE = 'http://127.0.0.1:3001/api';

// Dados de teste
const testData = {
  pipelineId: 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8', // Pipeline "new13" ativa
  tenantId: 'd7caffc1-c923-47c8-9301-ca9eeff1a243',   // Tenant de teste
  userId: '123e4567-e89b-12d3-a456-426614174000',     // User de teste
  cadenceConfigs: [
    {
      stage_name: 'Lead',
      stage_order: 0,
      tasks: [
        {
          day_offset: 0,
          task_order: 1,
          channel: 'email',
          action_type: 'mensagem',
          task_title: 'E-mail de boas-vindas',
          task_description: 'Enviar e-mail de boas-vindas para o lead',
          template_content: 'Olá {{nome}}, bem-vindo!',
          is_active: true
        },
        {
          day_offset: 1,
          task_order: 2,
          channel: 'whatsapp',
          action_type: 'mensagem',
          task_title: 'WhatsApp follow-up',
          task_description: 'Fazer contato via WhatsApp',
          template_content: 'Oi {{nome}}, como você está?',
          is_active: true
        }
      ],
      is_active: true,
      tenant_id: 'd7caffc1-c923-47c8-9301-ca9eeff1a243'
    }
  ]
};

// Função auxiliar para fazer requests
async function makeRequest(method, endpoint, data = null) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token' // Token de teste
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  console.log(`\n🔄 ${method} ${endpoint}`);
  if (data) {
    console.log('📝 Dados enviados:', JSON.stringify(data, null, 2));
  }
  
  try {
    const response = await fetch(url, options);
    const responseData = await response.text();
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    try {
      const jsonData = JSON.parse(responseData);
      console.log('📋 Resposta:', JSON.stringify(jsonData, null, 2));
      return { success: response.ok, data: jsonData, status: response.status };
    } catch (e) {
      console.log('📋 Resposta (texto):', responseData);
      return { success: response.ok, data: responseData, status: response.status };
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    return { success: false, error: error.message };
  }
}

// Função principal de teste
async function testCadenceAPI() {
  console.log('🧪 TESTE DA API DE CADÊNCIA');
  console.log('============================');
  console.log(`API Base: ${API_BASE}`);
  console.log(`Pipeline ID: ${testData.pipelineId}`);
  console.log(`Tenant ID: ${testData.tenantId}`);
  
  const results = {
    healthCheck: false,
    loadCadence: false,
    saveCadence: false,
    loadAfterSave: false,
    deleteCadence: false
  };
  
  try {
    // 1. Teste de saúde básico
    console.log('\n📡 1. TESTE DE SAÚDE DO BACKEND');
    console.log('================================');
    const healthResult = await makeRequest('GET', '/health');
    results.healthCheck = healthResult.success;
    
    // 2. Tentar carregar configurações existentes
    console.log('\n📖 2. CARREGAR CONFIGURAÇÕES EXISTENTES');
    console.log('=========================================');
    const loadResult = await makeRequest('GET', `/cadence/load/${testData.pipelineId}`);
    results.loadCadence = loadResult.success;
    
    // 3. Salvar nova configuração
    console.log('\n💾 3. SALVAR NOVA CONFIGURAÇÃO');
    console.log('==============================');
    const savePayload = {
      pipeline_id: testData.pipelineId,
      cadence_configs: testData.cadenceConfigs,
      tenant_id: testData.tenantId,
      created_by: testData.userId
    };
    
    const saveResult = await makeRequest('POST', '/cadence/save', savePayload);
    results.saveCadence = saveResult.success;
    
    // 4. Verificar se foi salvo corretamente
    console.log('\n🔍 4. VERIFICAR DADOS SALVOS');
    console.log('============================');
    const verifyResult = await makeRequest('GET', `/cadence/load/${testData.pipelineId}`);
    results.loadAfterSave = verifyResult.success;
    
    if (verifyResult.success && verifyResult.data.configs) {
      console.log(`✅ Configurações carregadas: ${verifyResult.data.configs.length}`);
      if (verifyResult.data.configs.length > 0) {
        const config = verifyResult.data.configs[0];
        console.log(`📋 Primeira config: ${config.stage_name} com ${config.tasks?.length || 0} tarefas`);
      }
    }
    
    // 5. Testar endpoint de etapa específica
    console.log('\n🎯 5. TESTAR BUSCA POR ETAPA');
    console.log('============================');
    const stageResult = await makeRequest('GET', `/cadence/stage/${testData.pipelineId}/Lead?tenant_id=${testData.tenantId}`);
    
    // 6. Deletar configurações (opcional)
    console.log('\n🗑️ 6. DELETAR CONFIGURAÇÕES (LIMPEZA)');
    console.log('======================================');
    const deleteResult = await makeRequest('DELETE', `/cadence/delete/${testData.pipelineId}?tenant_id=${testData.tenantId}`);
    results.deleteCadence = deleteResult.success;
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
  }
  
  // Relatório final
  console.log('\n📊 RELATÓRIO FINAL');
  console.log('==================');
  console.log(`Health Check: ${results.healthCheck ? '✅' : '❌'}`);
  console.log(`Load Cadence: ${results.loadCadence ? '✅' : '❌'}`);
  console.log(`Save Cadence: ${results.saveCadence ? '✅' : '❌'}`);
  console.log(`Load After Save: ${results.loadAfterSave ? '✅' : '❌'}`);
  console.log(`Delete Cadence: ${results.deleteCadence ? '✅' : '❌'}`);
  
  const successCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n📈 RESULTADO: ${successCount}/${totalTests} testes passaram`);
  
  if (successCount === totalTests) {
    console.log('🎉 TODOS OS TESTES PASSARAM! API está funcional.');
  } else {
    console.log('⚠️ Alguns testes falharam. Verifique os logs acima.');
  }
  
  return results;
}

// Executar teste se for chamado diretamente
if (require.main === module) {
  testCadenceAPI().catch(console.error);
}

module.exports = { testCadenceAPI };
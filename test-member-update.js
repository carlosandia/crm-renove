#!/usr/bin/env node

const API_BASE = 'http://127.0.0.1:3001/api';
const PIPELINE_ID = 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8';
const TENANT_ID = 'd7caffc1-c923-47c8-9301-ca9eeff1a243';

// Token de teste - simulando autenticação
const TEST_TOKEN = 'Bearer test-token';

// Member IDs para teste (baseado na query anterior)
const MEMBER_IDS = [
  '538389a4-fbc1-4f23-a0d4-b03e52d0bc8d', // new2@new2.com
  'f35fccec-424c-4a2c-aeb6-5385c21a1f21'  // new3@new3.com
];

async function testPipelineUpdate() {
  console.log('🧪 TESTE: Simulando atualização de pipeline com member_ids');
  console.log('==========================================');
  
  const payload = {
    name: 'new13',
    description: 'Pipeline de teste',
    member_ids: MEMBER_IDS,
    tenant_id: TENANT_ID
  };

  console.log('📋 Payload a ser enviado:', JSON.stringify(payload, null, 2));
  console.log('\n🔄 Enviando requisição PUT...');

  try {
    const response = await fetch(`${API_BASE}/pipelines/${PIPELINE_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TEST_TOKEN
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    
    console.log('📊 Resposta do servidor:');
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Body:', responseText);

    if (response.status === 401) {
      console.log('\n⚠️  Erro de autenticação - isso é esperado no teste');
      console.log('O importante é ver se o payload chegou ao backend com os logs');
    }

  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }

  console.log('\n✅ Teste concluído - verifique os logs do backend para ver o processamento');
}

testPipelineUpdate();
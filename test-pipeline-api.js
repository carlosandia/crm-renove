/**
 * TESTE DA API DE PIPELINES
 * Script para testar se as correções estão funcionando
 */

const API_BASE_URL = 'http://127.0.0.1:3001';
const PIPELINE_ID = 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8'; // new13
const TENANT_ID = 'd7caffc1-c923-47c8-9301-ca9eeff1a243'; // seraquevai

// Token válido para seraquevai@seraquevai.com
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiYmFmODQ0MS0yM2M5LTQ0ZGMtOWE0Yy1hNGRhNzg3ZjgyOWMiLCJlbWFpbCI6InNlcmFxdWV2YWlAc2VyYXF1ZXZhaS5jb20iLCJ0ZW5hbnRJZCI6ImQ3Y2FmZmMxLWM5MjMtNDdjOC05MzAxLWNhOWVlZmYxYTI0MyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MjY5MjE1MCwiZXhwIjoxNzUyNzc4NTUwfQ.TKx50lINcBAWAuaP2JQF8ERY011toPNuskCFALRso7s';

async function testPipelineAPI() {
  console.log('🧪 [TEST] Iniciando teste da API de pipelines...\n');

  // Teste 1: Buscar pipeline específica
  console.log('📋 [TEST] 1. Testando GET /api/pipelines/:id');
  try {
    const pipelineResponse = await fetch(`${API_BASE_URL}/api/pipelines/${PIPELINE_ID}`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const pipelineData = await pipelineResponse.json();
    
    console.log('✅ [TEST] Pipeline response:', {
      status: pipelineResponse.status,
      hasData: !!pipelineData,
      hasPipelineStages: !!pipelineData?.pipeline_stages,
      stagesCount: pipelineData?.pipeline_stages?.length || 0,
      pipelineName: pipelineData?.name
    });
    
    if (pipelineData?.pipeline_stages) {
      console.log('📊 [TEST] Stages encontrados:', 
        pipelineData.pipeline_stages.map(s => ({ name: s.name, order: s.order_index }))
      );
    }
  } catch (error) {
    console.error('❌ [TEST] Erro ao buscar pipeline:', error.message);
  }

  console.log('\n');

  // Teste 2: Buscar leads da pipeline
  console.log('👥 [TEST] 2. Testando GET /api/pipelines/:id/leads');
  try {
    const leadsResponse = await fetch(`${API_BASE_URL}/api/pipelines/${PIPELINE_ID}/leads?tenant_id=${TENANT_ID}`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const leadsData = await leadsResponse.json();
    
    console.log('✅ [TEST] Leads response:', {
      status: leadsResponse.status,
      isArray: Array.isArray(leadsData),
      count: Array.isArray(leadsData) ? leadsData.length : 0,
      firstLead: Array.isArray(leadsData) && leadsData[0] ? {
        id: leadsData[0].id?.substring(0, 8),
        stage_id: leadsData[0].stage_id,
        has_custom_data: !!leadsData[0].custom_data
      } : null
    });
    
    if (Array.isArray(leadsData) && leadsData.length > 0) {
      console.log('📊 [TEST] Distribuição por stages:', 
        leadsData.reduce((acc, lead) => {
          acc[lead.stage_id] = (acc[lead.stage_id] || 0) + 1;
          return acc;
        }, {})
      );
    }
  } catch (error) {
    console.error('❌ [TEST] Erro ao buscar leads:', error.message);
  }

  console.log('\n🧪 [TEST] Teste concluído!');
}

testPipelineAPI().catch(console.error);
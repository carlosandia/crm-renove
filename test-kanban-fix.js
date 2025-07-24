/**
 * TESTE DO KANBAN CORRIGIDO
 * Script para testar se as correções do usePipelineKanban estão funcionando
 */

const API_BASE_URL = 'http://127.0.0.1:3001';
const PIPELINE_ID = 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8'; // new13
const TENANT_ID = 'd7caffc1-c923-47c8-9301-ca9eeff1a243'; // seraquevai

// Token válido para seraquevai@seraquevai.com
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiYmFmODQ0MS0yM2M5LTQ0ZGMtOWE0Yy1hNGRhNzg3ZjgyOWMiLCJlbWFpbCI6InNlcmFxdWV2YWlAc2VyYXF1ZXZhaS5jb20iLCJ0ZW5hbnRJZCI6ImQ3Y2FmZmMxLWM5MjMtNDdjOC05MzAxLWNhOWVlZmYxYTI0MyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MjY5MjE1MCwiZXhwIjoxNzUyNzc4NTUwfQ.TKx50lINcBAWAuaP2JQF8ERY011toPNuskCFALRso7s';

async function testKanbanCorrigido() {
  console.log('🧪 [TEST] Iniciando teste do kanban corrigido...\n');

  try {
    // Teste 1: Buscar pipeline com stages
    console.log('📋 [TEST] 1. Testando dados da pipeline');
    const pipelineResponse = await fetch(`${API_BASE_URL}/api/pipelines/${PIPELINE_ID}?tenant_id=${TENANT_ID}`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const pipelineData = await pipelineResponse.json();
    console.log('✅ [TEST] Pipeline data:', {
      status: pipelineResponse.status,
      hasData: !!pipelineData,
      isValid: pipelineData && typeof pipelineData === 'object' && pipelineData.id && pipelineData.name,
      name: pipelineData?.name,
      hasStages: !!pipelineData?.pipeline_stages,
      stagesCount: pipelineData?.pipeline_stages?.length || 0,
      stagesArray: Array.isArray(pipelineData?.pipeline_stages)
    });

    // Teste 2: Buscar leads
    console.log('\n👥 [TEST] 2. Testando dados dos leads');
    const leadsResponse = await fetch(`${API_BASE_URL}/api/pipelines/${PIPELINE_ID}/leads?tenant_id=${TENANT_ID}`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const leadsData = await leadsResponse.json();
    console.log('✅ [TEST] Leads data:', {
      status: leadsResponse.status,
      hasData: !!leadsData,
      isArray: Array.isArray(leadsData),
      count: Array.isArray(leadsData) ? leadsData.length : 0,
      firstLeadValid: leadsData && leadsData[0] && leadsData[0].id && leadsData[0].stage_id,
      allLeadsValid: Array.isArray(leadsData) && leadsData.every(lead => lead && lead.id && lead.stage_id)
    });

    // Teste 3: Verificar type guards
    console.log('\n🔍 [TEST] 3. Testando type guards');
    
    // Simular type guard para pipeline
    function isPipelineValid(data) {
      return (
        data !== null &&
        data !== undefined &&
        typeof data === 'object' &&
        'id' in data &&
        'name' in data &&
        typeof data.id === 'string' &&
        typeof data.name === 'string'
      );
    }
    
    // Simular type guard para leads
    function isLeadsArrayValid(data) {
      return Array.isArray(data) && data.every(lead => 
        lead !== null &&
        lead !== undefined &&
        typeof lead === 'object' &&
        'id' in lead &&
        'stage_id' in lead &&
        typeof lead.id === 'string' &&
        typeof lead.stage_id === 'string'
      );
    }

    console.log('✅ [TEST] Type guards:', {
      pipelineValid: isPipelineValid(pipelineData),
      leadsValid: isLeadsArrayValid(leadsData),
      stagesValid: pipelineData?.pipeline_stages && Array.isArray(pipelineData.pipeline_stages)
    });

    // Teste 4: Simular processamento do kanban
    console.log('\n🎯 [TEST] 4. Simulando processamento do kanban');
    
    if (isPipelineValid(pipelineData) && isLeadsArrayValid(leadsData)) {
      const stages = pipelineData.pipeline_stages || [];
      const validStages = stages.filter(stage => stage && stage.id && stage.name);
      
      // Agrupar leads por stage
      const leadsByStage = {};
      validStages.forEach(stage => {
        leadsByStage[stage.id] = [];
      });
      
      leadsData.forEach(lead => {
        if (lead.stage_id && leadsByStage[lead.stage_id]) {
          leadsByStage[lead.stage_id].push(lead);
        }
      });
      
      console.log('✅ [TEST] Kanban processado com sucesso:', {
        stagesCount: validStages.length,
        totalLeads: leadsData.length,
        distribution: Object.entries(leadsByStage).map(([stageId, leads]) => ({
          stageId: stageId.substring(0, 8),
          count: leads.length
        }))
      });
      
      console.log('\n🎉 [TEST] SUCESSO! Os dados estão corretos e o kanban deveria funcionar.');
    } else {
      console.error('❌ [TEST] FALHA! Dados inválidos detectados pelos type guards.');
    }

  } catch (error) {
    console.error('❌ [TEST] Erro durante o teste:', error.message);
  }

  console.log('\n🧪 [TEST] Teste concluído!');
}

testKanbanCorrigido().catch(console.error);
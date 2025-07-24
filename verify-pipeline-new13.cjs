const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyPipelineNew13() {
  console.log('🔍 Investigando pipeline "new13"...\n');
  
  const tenantId = 'd7caffc1-c923-47c8-9301-ca9eeff1a243';
  
  try {
    // 1. Primeiro, buscar a pipeline pelo nome "new13"
    console.log('1️⃣ Buscando pipeline pelo nome "new13":');
    const { data: pipelineData, error: pipelineError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('name', 'new13')
      .eq('tenant_id', tenantId);
    
    if (pipelineError) {
      console.error('❌ Erro ao buscar pipeline:', pipelineError);
      return;
    } 
    
    if (!pipelineData || pipelineData.length === 0) {
      console.log('❌ Pipeline "new13" não encontrada!');
      return;
    }
    
    const pipeline = pipelineData[0];
    const pipelineId = pipeline.id;
    console.log('✅ Pipeline encontrada:', {
      id: pipeline.id,
      name: pipeline.name,
      tenant_id: pipeline.tenant_id,
      created_at: pipeline.created_at,
      is_archived: pipeline.is_archived || false
    });
    
    // 2. Verificar se existem leads/cards na tabela pipeline_leads
    console.log('\n2️⃣ Verificando leads na tabela "pipeline_leads":');
    const { data: pipelineLeads, error: leadsError } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .eq('tenant_id', tenantId);
    
    if (leadsError) {
      console.error('❌ Erro ao buscar pipeline_leads:', leadsError);
    } else {
      console.log(`Total de leads encontrados: ${pipelineLeads?.length || 0}`);
      if (pipelineLeads && pipelineLeads.length > 0) {
        console.log('Primeiros 3 leads:', JSON.stringify(pipelineLeads.slice(0, 3), null, 2));
      }
    }
    
    // 3. Verificar dados na tabela leads_master relacionados
    console.log('\n3️⃣ Verificando dados na tabela "leads_master":');
    
    // Primeiro, pegar os lead_master_ids dos pipeline_leads
    if (pipelineLeads && pipelineLeads.length > 0) {
      const leadMasterIds = pipelineLeads.map(pl => pl.lead_master_id).filter(Boolean);
      
      if (leadMasterIds.length > 0) {
        const { data: leadsMaster, error: masterError } = await supabase
          .from('leads_master')
          .select('*')
          .in('id', leadMasterIds)
          .eq('tenant_id', tenantId);
        
        if (masterError) {
          console.error('❌ Erro ao buscar leads_master:', masterError);
        } else {
          console.log(`Total de leads_master encontrados: ${leadsMaster?.length || 0}`);
          if (leadsMaster && leadsMaster.length > 0) {
            console.log('Primeiros 3 leads_master:', JSON.stringify(leadsMaster.slice(0, 3), null, 2));
          }
        }
      } else {
        console.log('⚠️ Nenhum lead_master_id encontrado nos pipeline_leads');
      }
    }
    
    // 4. Verificar etapas da pipeline na tabela pipeline_stages
    console.log('\n4️⃣ Verificando etapas na tabela "pipeline_stages":');
    const { data: stages, error: stagesError } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('order_index');
    
    if (stagesError) {
      console.error('❌ Erro ao buscar pipeline_stages:', stagesError);
    } else {
      console.log(`Total de etapas encontradas: ${stages?.length || 0}`);
      if (stages && stages.length > 0) {
        console.log('Etapas:', stages.map(s => ({ 
          id: s.id, 
          name: s.name, 
          order: s.order_index,
          type: s.stage_type 
        })));
      }
    }
    
    // 5. Verificar distribuição dos leads pelas etapas
    console.log('\n5️⃣ Verificando distribuição dos leads pelas etapas:');
    if (pipelineLeads && pipelineLeads.length > 0) {
      const stageDistribution = {};
      pipelineLeads.forEach(lead => {
        const stage = lead.current_stage_id || 'sem_etapa';
        stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
      });
      
      console.log('Distribuição por etapa:', stageDistribution);
      
      // Verificar se há leads sem etapa válida
      const leadsWithoutStage = pipelineLeads.filter(lead => !lead.current_stage_id);
      if (leadsWithoutStage.length > 0) {
        console.log(`⚠️ ${leadsWithoutStage.length} leads sem current_stage_id`);
      }
    }
    
    // 6. Verificar campos customizados da pipeline
    console.log('\n6️⃣ Verificando campos customizados:');
    if (pipelineData && pipelineData.length > 0) {
      const pipeline = pipelineData[0];
      if (pipeline.custom_fields) {
        console.log('Campos customizados:', JSON.stringify(pipeline.custom_fields, null, 2));
      } else {
        console.log('Nenhum campo customizado encontrado');
      }
    }
    
    // 7. Verificar usuários do tenant (possíveis membros)
    console.log('\n7️⃣ Verificando usuários do tenant:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role')
      .eq('tenant_id', tenantId);
    
    if (usersError) {
      console.error('❌ Erro ao buscar users:', usersError);
    } else {
      console.log(`Total de usuários no tenant: ${users?.length || 0}`);
      if (users && users.length > 0) {
        users.forEach(user => {
          console.log(`- ${user.first_name} ${user.last_name} (${user.email}) - Role: ${user.role}`);
        });
      }
    }
    
    // 8. Verificar se existe configuração de distribuição
    console.log('\n8️⃣ Verificando configuração de distribuição:');
    if (pipeline.distribution_config) {
      console.log('Configuração de distribuição:', JSON.stringify(pipeline.distribution_config, null, 2));
    } else {
      console.log('Nenhuma configuração de distribuição encontrada');
    }
    
    console.log('\n✅ Investigação concluída!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

verifyPipelineNew13().catch(console.error);
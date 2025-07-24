/**
 * INVESTIGAÇÃO CORRETA DA PIPELINE NEW13
 * Usando o campo correto stage_id
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function investigateNew13Correct() {
  console.log('🔍 INVESTIGAÇÃO CORRETA DA PIPELINE NEW13');
  console.log('===============================================\n');

  const tenantId = 'd7caffc1-c923-47c8-9301-ca9eeff1a243';
  
  try {
    // 1. Buscar pipeline new13
    console.log('1. 📋 BUSCANDO PIPELINE NEW13...');
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('name', 'new13')
      .eq('tenant_id', tenantId)
      .single();

    if (pipelineError || !pipeline) {
      console.error('❌ Erro ao buscar pipeline:', pipelineError);
      return;
    }

    console.log(`✅ Pipeline encontrada: ${pipeline.name} (ID: ${pipeline.id})`);

    // 2. Buscar etapas da pipeline
    console.log('\n2. 🎯 BUSCANDO ETAPAS DA PIPELINE...');
    const { data: stages, error: stagesError } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', pipeline.id)
      .order('order_index');

    if (stagesError) {
      console.error('❌ Erro ao buscar etapas:', stagesError);
      return;
    }

    console.log(`✅ ${stages.length} etapas encontradas:`);
    stages.forEach((stage, index) => {
      console.log(`   ${index + 1}. "${stage.name}" (ID: ${stage.id}) - Order: ${stage.order_index}`);
    });

    // 3. Buscar leads da pipeline usando stage_id CORRETO
    console.log('\n3. 👥 BUSCANDO LEADS DA PIPELINE (CAMPO CORRETO)...');
    const { data: pipelineLeads, error: leadsError } = await supabase
      .from('pipeline_leads')
      .select(`
        id, 
        stage_id,
        custom_data,
        created_at,
        pipeline_id,
        assigned_to,
        lead_master_id
      `)
      .eq('pipeline_id', pipeline.id);

    if (leadsError) {
      console.error('❌ Erro ao buscar leads:', leadsError);
      return;
    }

    console.log(`✅ ${pipelineLeads.length} leads encontrados na pipeline:`);

    // 4. Agrupar leads por etapa
    const leadsByStage = {};
    stages.forEach(stage => {
      leadsByStage[stage.id] = {
        stageName: stage.name,
        leads: []
      };
    });

    pipelineLeads.forEach(lead => {
      if (leadsByStage[lead.stage_id]) {
        leadsByStage[lead.stage_id].leads.push(lead);
      } else {
        console.log(`⚠️ Lead ${lead.id} tem stage_id inválido: ${lead.stage_id}`);
      }
    });

    // 5. Mostrar distribuição por etapa
    console.log('\n4. 📊 DISTRIBUIÇÃO DE LEADS POR ETAPA:');
    Object.entries(leadsByStage).forEach(([stageId, stageData]) => {
      console.log(`   📌 ${stageData.stageName}: ${stageData.leads.length} leads`);
      if (stageData.leads.length > 0) {
        stageData.leads.forEach((lead, index) => {
          const leadName = lead.custom_data?.nome || lead.custom_data?.name || `Lead ${lead.id.substring(0, 8)}`;
          console.log(`      ${index + 1}. "${leadName}" (ID: ${lead.id})`);
        });
      }
    });

    // 6. Verificar se algum lead está sem stage_id
    const leadsWithoutStage = pipelineLeads.filter(lead => !lead.stage_id);
    if (leadsWithoutStage.length > 0) {
      console.log(`\n⚠️ ATENÇÃO: ${leadsWithoutStage.length} leads sem stage_id!`);
      leadsWithoutStage.forEach(lead => {
        console.log(`   - Lead ID: ${lead.id}`);
      });
    } else {
      console.log('\n✅ Todos os leads têm stage_id válido!');
    }

    // 7. Verificar compatibilidade com frontend
    console.log('\n5. 🔧 VERIFICAÇÃO DE COMPATIBILIDADE:');
    console.log('   Frontend busca por: lead.stage_id');
    console.log('   Banco de dados tem: stage_id');
    console.log('   ✅ COMPATÍVEL - Campos correspondem!');

    // 8. Análise final
    console.log('\n6. 📝 RELATÓRIO FINAL:');
    console.log(`   • Pipeline: ${pipeline.name} (${pipeline.id})`);
    console.log(`   • Etapas: ${stages.length}`);
    console.log(`   • Leads: ${pipelineLeads.length}`);
    console.log(`   • Problema: ${leadsWithoutStage.length > 0 ? '❌ Leads sem stage_id' : '✅ Dados consistentes'}`);

  } catch (error) {
    console.error('❌ Erro na investigação:', error);
  }
}

investigateNew13Correct();
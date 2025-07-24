/**
 * VERIFICAR QUAL PIPELINE ESTÁ SENDO SELECIONADA INCORRETAMENTE
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWrongPipeline() {
  console.log('🔍 VERIFICANDO PIPELINE INCORRETA');
  console.log('======================================\n');

  const tenantId = 'd7caffc1-c923-47c8-9301-ca9eeff1a243';
  const wrongPipelineId = '37cf1087-cce1-4ec0-b18f-1b32aed4fffc';
  const correctPipelineId = 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8';
  
  try {
    // 1. Verificar pipeline incorreta
    console.log('1. 🔍 VERIFICANDO PIPELINE INCORRETA...');
    const { data: wrongPipeline, error: wrongError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('id', wrongPipelineId)
      .single();

    if (wrongError) {
      console.log('❌ Pipeline incorreta não encontrada:', wrongError.message);
    } else {
      console.log('✅ Pipeline incorreta encontrada:', {
        name: wrongPipeline.name,
        id: wrongPipeline.id,
        tenant_id: wrongPipeline.tenant_id
      });
    }

    // 2. Verificar pipeline correta  
    console.log('\n2. 🎯 VERIFICANDO PIPELINE CORRETA...');
    const { data: correctPipeline, error: correctError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('id', correctPipelineId)
      .single();

    if (correctError) {
      console.log('❌ Pipeline correta não encontrada:', correctError.message);
    } else {
      console.log('✅ Pipeline correta encontrada:', {
        name: correctPipeline.name,
        id: correctPipeline.id,
        tenant_id: correctPipeline.tenant_id
      });
    }

    // 3. Listar todas as pipelines do tenant para debug
    console.log('\n3. 📋 TODAS AS PIPELINES DO TENANT:');
    const { data: allPipelines, error: allError } = await supabase
      .from('pipelines')
      .select('id, name, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at');

    if (allError) {
      console.error('❌ Erro ao buscar pipelines:', allError);
    } else {
      console.log(`✅ ${allPipelines.length} pipelines encontradas:`);
      allPipelines.forEach((pipeline, index) => {
        const isNew13 = pipeline.name === 'new13';
        const isWrong = pipeline.id === wrongPipelineId;
        
        let marker = '';
        if (isNew13) marker += ' ← NEW13';
        if (isWrong) marker += ' ← INCORRETA SELECIONADA';
        
        console.log(`   ${index + 1}. "${pipeline.name}" (${pipeline.id})${marker}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  }
}

checkWrongPipeline();
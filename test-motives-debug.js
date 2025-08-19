#!/usr/bin/env node

/**
 * 🔍 SCRIPT DE DIAGNÓSTICO: Teste de Persistência de Motivos
 * 
 * Este script irá testar diretamente as operações CRUD nos motivos
 * para identificar onde exatamente está falhando a persistência.
 */

import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const SUPABASE_URL = 'https://marajvabdwkpgopytvhh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

// Cliente Supabase com service role (bypass RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Dados de teste
const TEST_PIPELINE_ID = 'eb0d170f-9618-4bde-9a28-2a1a65cc90b8'; // Pipeline existente
const TEST_TENANT_ID = 'd7caffc1-c923-47c8-9301-ca9eeff1a243'; // Tenant existente

async function diagnosticoPersistencia() {
  console.log('🚀 INICIANDO DIAGNÓSTICO DE PERSISTÊNCIA DOS MOTIVOS');
  console.log('=====================================================');
  
  try {
    // ETAPA 1: Verificar estrutura da tabela
    console.log('\n📋 ETAPA 1: Verificar estrutura da tabela pipeline_outcome_reasons');
    const { data: structure, error: structureError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = 'pipeline_outcome_reasons' 
          ORDER BY ordinal_position;
        `
      });
    
    if (structureError) {
      console.error('❌ Erro ao verificar estrutura:', structureError);
      // Fallback: usar describe manual
      console.log('🔄 Tentando abordagem alternativa...');
    } else {
      console.log('✅ Estrutura da tabela:', structure);
    }

    // ETAPA 2: Verificar constraints CHECK
    console.log('\n📋 ETAPA 2: Verificar constraints CHECK');
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            conname as constraint_name,
            consrc as constraint_definition
          FROM pg_constraint 
          WHERE conrelid = 'pipeline_outcome_reasons'::regclass 
          AND contype = 'c';
        `
      });
    
    if (constraintsError) {
      console.error('❌ Erro ao verificar constraints:', constraintsError);
    } else {
      console.log('✅ Constraints encontrados:', constraints);
    }

    // ETAPA 3: Verificar dados existentes
    console.log('\n📋 ETAPA 3: Verificar motivos existentes para o pipeline de teste');
    const { data: existingReasons, error: existingError } = await supabase
      .from('pipeline_outcome_reasons')
      .select('*')
      .eq('pipeline_id', TEST_PIPELINE_ID)
      .eq('tenant_id', TEST_TENANT_ID);
    
    if (existingError) {
      console.error('❌ Erro ao buscar motivos existentes:', existingError);
    } else {
      console.log('✅ Motivos existentes:', existingReasons?.length || 0, 'registros');
      existingReasons?.forEach((reason, index) => {
        console.log(`  ${index + 1}. ID: ${reason.id.substring(0, 8)}... | Tipo: ${reason.reason_type} | Texto: ${reason.reason_text}`);
      });
    }

    // ETAPA 4: Teste de inserção com 'ganho'
    console.log('\n📋 ETAPA 4: Testar inserção de motivo tipo "ganho"');
    const motivoGanho = {
      pipeline_id: TEST_PIPELINE_ID,
      tenant_id: TEST_TENANT_ID,
      reason_type: 'ganho',
      reason_text: 'TESTE DIAGNÓSTICO GANHO - ' + new Date().toISOString(),
      display_order: 0,
      is_active: true
    };

    const { data: newGanho, error: ganhoError } = await supabase
      .from('pipeline_outcome_reasons')
      .insert(motivoGanho)
      .select()
      .single();

    if (ganhoError) {
      console.error('❌ ERRO ao inserir motivo GANHO:', ganhoError);
      console.error('   Detalhes:', ganhoError.message);
      console.error('   Código:', ganhoError.code);
    } else {
      console.log('✅ Motivo GANHO inserido com sucesso:', newGanho.id.substring(0, 8));
    }

    // ETAPA 5: Teste de inserção com 'perdido'
    console.log('\n📋 ETAPA 5: Testar inserção de motivo tipo "perdido"');
    const motivoPerdido = {
      pipeline_id: TEST_PIPELINE_ID,
      tenant_id: TEST_TENANT_ID,
      reason_type: 'perdido',
      reason_text: 'TESTE DIAGNÓSTICO PERDIDO - ' + new Date().toISOString(),
      display_order: 0,
      is_active: true
    };

    const { data: newPerdido, error: perdidoError } = await supabase
      .from('pipeline_outcome_reasons')
      .insert(motivoPerdido)
      .select()
      .single();

    if (perdidoError) {
      console.error('❌ ERRO ao inserir motivo PERDIDO:', perdidoError);
      console.error('   Detalhes:', perdidoError.message);
      console.error('   Código:', perdidoError.code);
      console.error('   Hint:', perdidoError.hint);
    } else {
      console.log('✅ Motivo PERDIDO inserido com sucesso:', newPerdido.id.substring(0, 8));
    }

    // ETAPA 6: Verificar se dados persistiram
    console.log('\n📋 ETAPA 6: Verificar persistência após inserção');
    const { data: finalCheck, error: finalError } = await supabase
      .from('pipeline_outcome_reasons')
      .select('*')
      .eq('pipeline_id', TEST_PIPELINE_ID)
      .eq('tenant_id', TEST_TENANT_ID)
      .order('created_at', { ascending: false })
      .limit(5);

    if (finalError) {
      console.error('❌ Erro na verificação final:', finalError);
    } else {
      console.log('✅ Motivos após teste (últimos 5):');
      finalCheck?.forEach((reason, index) => {
        console.log(`  ${index + 1}. ID: ${reason.id.substring(0, 8)}... | Tipo: ${reason.reason_type} | Texto: ${reason.reason_text.substring(0, 50)}...`);
      });
    }

  } catch (error) {
    console.error('💥 ERRO CRÍTICO no diagnóstico:', error);
  }

  console.log('\n🏁 DIAGNÓSTICO CONCLUÍDO');
  console.log('=========================');
}

// Executar diagnóstico
diagnosticoPersistencia().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
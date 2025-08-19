#!/usr/bin/env node

/**
 * Script de teste para verificar carregamento de motivos
 * Simula a função loadOutcomeReasons
 */

const { createClient } = require('@supabase/supabase-js');

// Configuração Supabase (usando as mesmas variáveis do projeto)
const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLoadOutcomeReasons() {
  const pipelineId = 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8';
  const tenantId = 'd7caffc1-c923-47c8-9301-ca9eeff1a243';

  console.log('🔄 [TEST] Testando carregamento de motivos...');
  console.log('🎯 [TEST] Pipeline ID:', pipelineId.substring(0, 8));
  console.log('🏢 [TEST] Tenant ID:', tenantId.substring(0, 8));

  try {
    // Simular a mesma query da função loadOutcomeReasons
    const { data: motivosExistentes, error } = await supabase
      .from('pipeline_outcome_reasons')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('reason_type', { ascending: true })
      .order('display_order', { ascending: true });

    if (error) {
      console.error('❌ [TEST] Erro ao carregar motivos:', error);
      return;
    }

    console.log('📊 [TEST] Motivos carregados:', {
      totalEncontrados: motivosExistentes?.length || 0,
      ganhoCount: motivosExistentes?.filter(m => m.reason_type === 'ganho').length || 0,
      perdidoCount: motivosExistentes?.filter(m => m.reason_type === 'perdido').length || 0,
      amostras: motivosExistentes?.slice(0, 3).map(m => ({ 
        tipo: m.reason_type, 
        texto: m.reason_text.substring(0, 30) 
      })) || []
    });

    // Normalizar dados como na função original
    const motivosGanho = motivosExistentes?.filter(motivo => motivo.reason_type === 'ganho') || [];
    const motivosPerdido = motivosExistentes?.filter(motivo => motivo.reason_type === 'perdido') || [];

    const normalizedData = {
      ganho_reasons: motivosGanho.map(motivo => ({
        reason_text: motivo.reason_text,
        reason_type: motivo.reason_type,
        display_order: motivo.display_order || 0,
        is_active: motivo.is_active !== undefined ? motivo.is_active : true,
        tenant_id: motivo.tenant_id,
        pipeline_id: motivo.pipeline_id,
        created_by: motivo.created_by,
        id: motivo.id
      })),
      perdido_reasons: motivosPerdido.map(motivo => ({
        reason_text: motivo.reason_text,
        reason_type: motivo.reason_type,
        display_order: motivo.display_order || 0,
        is_active: motivo.is_active !== undefined ? motivo.is_active : true,
        tenant_id: motivo.tenant_id,
        pipeline_id: motivo.pipeline_id,
        created_by: motivo.created_by,
        id: motivo.id
      }))
    };

    console.log('✅ [TEST] Dados normalizados:', {
      ganhoCount: normalizedData.ganho_reasons?.length || 0,
      perdidoCount: normalizedData.perdido_reasons?.length || 0,
      ganhoTexts: normalizedData.ganho_reasons?.map(r => r.reason_text.substring(0, 30)) || [],
      perdidoTexts: normalizedData.perdido_reasons?.map(r => r.reason_text.substring(0, 30)) || []
    });

    if (normalizedData.ganho_reasons.length > 0 || normalizedData.perdido_reasons.length > 0) {
      console.log('🎉 [TEST] SUCESSO! Motivos carregados corretamente - loadOutcomeReasons funcionando');
    } else {
      console.log('⚠️ [TEST] PROBLEMA: Nenhum motivo carregado após normalização');
    }

  } catch (error) {
    console.error('❌ [TEST] Erro durante teste:', error.message);
  }
}

// Executar teste
testLoadOutcomeReasons().then(() => {
  console.log('🏁 [TEST] Teste concluído');
  process.exit(0);
}).catch(error => {
  console.error('💥 [TEST] Erro fatal:', error);
  process.exit(1);
});
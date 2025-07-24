// Script para verificar políticas RLS na tabela pipelines
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLSPolicies() {
  console.log('🔍 Verificando políticas RLS para tabela pipelines...');
  
  try {
    // Verificar políticas RLS
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'pipelines');
      
    if (policiesError) {
      console.error('❌ Erro ao buscar políticas:', policiesError);
    } else {
      console.log('📋 Políticas RLS encontradas:', policies.length);
      policies.forEach(policy => {
        console.log(`\n📜 Política: ${policy.policyname}`);
        console.log(`   Comando: ${policy.cmd}`);
        console.log(`   Roles: ${policy.roles}`);
        console.log(`   Qual: ${policy.qual}`);
        console.log(`   With Check: ${policy.with_check}`);
      });
    }
    
    // Testar update direto com service role
    console.log('\n🧪 Testando update direto com Service Role...');
    const testPipelineId = '56e16d1a-e462-4bef-abdf-65f93ee4cdff';
    
    const { data: updateResult, error: updateError } = await supabase
      .from('pipelines')
      .update({
        description: '[TESTE_SERVICE_ROLE] Pipeline para testar service role',
        updated_at: new Date().toISOString()
      })
      .eq('id', testPipelineId)
      .select();
      
    if (updateError) {
      console.error('❌ Erro no update com service role:', updateError);
    } else {
      console.log('✅ Update com service role funcionou:', updateResult?.length || 0, 'registros afetados');
    }
    
    // Verificar se campos de arquivamento existem
    console.log('\n🔍 Verificando se campos de arquivamento existem...');
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'pipelines')
      .in('column_name', ['is_archived', 'archived_at', 'archived_by']);
      
    if (schemaError) {
      console.error('❌ Erro ao verificar schema:', schemaError);
    } else {
      console.log('📊 Campos de arquivamento encontrados:', schemaData.length);
      schemaData.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkRLSPolicies().catch(console.error);
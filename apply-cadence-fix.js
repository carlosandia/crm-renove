// Script para aplicar correção do cadence_configs
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxODcxMzMwNiwiZXhwIjoyMDM0Mjg5MzA2fQ.79LJaJ2iJZgfQvOBH8QoZGnhO_s6_bYd3OMYOWa2Pco';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyCadenceFix() {
  try {
    console.log('🔧 Aplicando correção para cadence_configs...');
    
    // Ler o arquivo de migração
    const migration = fs.readFileSync('./supabase/migrations/20250715061000-fix-cadence-configs-tenant-sync.sql', 'utf8');
    
    // Aplicar a migração
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: migration 
    });
    
    if (error) {
      console.error('❌ Erro ao aplicar migração:', error);
      return;
    }
    
    console.log('✅ Migração aplicada com sucesso!');
    console.log('📊 Resultado:', data);
    
    // Verificar se a função foi atualizada
    const { data: testData, error: testError } = await supabase
      .from('cadence_configs')
      .select('id, pipeline_id, tenant_id')
      .limit(1);
      
    if (testError) {
      console.error('❌ Erro ao testar:', testError);
    } else {
      console.log('✅ Teste da tabela cadence_configs:', testData);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

applyCadenceFix();
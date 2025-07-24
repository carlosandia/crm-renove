// Script para aplicar migração via Supabase MCP
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

console.log('🔧 Iniciando aplicação da migração...');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('1. Verificando estrutura atual da tabela pipelines...');
    
    // Verificar estrutura atual
    const { data: currentData, error: currentError } = await supabase
      .from('pipelines')
      .select('id, name, is_active')
      .limit(1);
    
    if (currentError) {
      console.error('Erro ao verificar estrutura atual:', currentError);
      return;
    }
    
    console.log('✅ Estrutura atual confirmada:', currentData?.[0] || 'Nenhuma pipeline encontrada');
    
    console.log('\n2. Tentando adicionar campos de arquivamento...');
    
    // Tentar executar comandos SQL usando RPC (se disponível)
    const migrationCommands = [
      'ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;',
      'ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;',
      'ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_by TEXT;'
    ];
    
    for (let i = 0; i < migrationCommands.length; i++) {
      const command = migrationCommands[i];
      console.log(`Executando comando ${i + 1}/${migrationCommands.length}:`, command);
      
      try {
        // Tentar usar RPC genérico
        const { data, error } = await supabase.rpc('exec', { sql: command });
        
        if (error) {
          console.log(`Comando ${i + 1} - Erro RPC:`, error.message);
        } else {
          console.log(`✅ Comando ${i + 1} executado com sucesso`);
        }
      } catch (rpcError) {
        console.log(`Comando ${i + 1} - RPC não disponível:`, rpcError.message);
      }
    }
    
    console.log('\n3. Testando se os novos campos existem...');
    
    // Testar se os campos foram criados
    const { data: testData, error: testError } = await supabase
      .from('pipelines')
      .select('id, name, is_active, is_archived, archived_at, archived_by')
      .limit(1);
    
    if (testError) {
      console.error('❌ Novos campos ainda não existem:', testError.message);
      
      console.log('\n📋 SOLUÇÃO MANUAL NECESSÁRIA:');
      console.log('Acesse o Dashboard do Supabase e execute:');
      console.log('URL: https://supabase.com/dashboard/project/marajvabdwkpgopytvhh/sql');
      console.log('\nSQL a executar:');
      console.log('ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;');
      console.log('ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;');
      console.log('ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_by TEXT;');
      console.log('CREATE INDEX IF NOT EXISTS idx_pipelines_archived_tenant ON pipelines(tenant_id, is_archived);');
      console.log('UPDATE pipelines SET is_archived = FALSE WHERE is_archived IS NULL;');
      
    } else {
      console.log('✅ Migração aplicada com sucesso! Campos disponíveis:', Object.keys(testData?.[0] || {}));
      
      console.log('\n4. Aplicando configurações finais...');
      
      // Garantir que pipelines existentes tenham is_archived = false
      const { error: updateError } = await supabase
        .from('pipelines')
        .update({ is_archived: false })
        .is('is_archived', null);
      
      if (updateError) {
        console.log('Aviso ao configurar is_archived:', updateError.message);
      } else {
        console.log('✅ Pipelines existentes configuradas com is_archived = false');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

applyMigration().catch(console.error);
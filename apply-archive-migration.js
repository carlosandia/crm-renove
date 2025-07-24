// Script para aplicar migração de arquivamento
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyArchiveMigration() {
  console.log('🔧 Aplicando migração de arquivamento...');

  // SQL da migração
  const migrationSQL = `
    -- Adicionar campos de arquivamento à tabela pipelines
    ALTER TABLE pipelines 
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS archived_by TEXT;

    -- Comentários para documentação
    COMMENT ON COLUMN pipelines.is_archived IS 'Indica se a pipeline está arquivada (não excluída)';
    COMMENT ON COLUMN pipelines.archived_at IS 'Data e hora do arquivamento';
    COMMENT ON COLUMN pipelines.archived_by IS 'ID ou email do usuário que arquivou';

    -- Índice para performance em consultas de pipelines ativas/arquivadas
    CREATE INDEX IF NOT EXISTS idx_pipelines_archived_tenant 
    ON pipelines(tenant_id, is_archived);

    -- Verificação final: garantir que todas as pipelines existentes tenham is_archived = false
    UPDATE pipelines 
    SET is_archived = FALSE 
    WHERE is_archived IS NULL;
  `;

  try {
    // Aplicar cada comando separadamente
    const commands = migrationSQL.split(';').filter(cmd => cmd.trim());
    
    for (const command of commands) {
      if (command.trim()) {
        console.log('Executando:', command.trim().substring(0, 50) + '...');
        
        const { error } = await supabase.rpc('exec_sql', {
          sql_text: command.trim()
        });

        if (error) {
          console.error('❌ Erro ao executar comando:', error);
          console.log('Comando que falhou:', command.trim());
        } else {
          console.log('✅ Comando executado com sucesso');
        }
      }
    }

    // Testar se funcionou
    console.log('\n🔍 Testando se migração funcionou...');
    const { data: testData, error: testError } = await supabase
      .from('pipelines')
      .select('id, name, is_archived')
      .limit(1);

    if (testError) {
      console.error('❌ Teste falhou:', testError);
    } else {
      console.log('✅ Migração aplicada com sucesso!', testData);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

applyArchiveMigration().catch(console.error);
// Script para aplicar migração usando MCP Supabase
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function applyArchiveMigrationMCP() {
  console.log('🔧 Aplicando migração de arquivamento via MCP...');

  try {
    // Comando 1: Adicionar coluna is_archived
    console.log('1. Adicionando coluna is_archived...');
    const cmd1 = `echo "ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;" | npx supabase db push --local=false`;
    
    // Comando 2: Adicionar coluna archived_at
    console.log('2. Adicionando coluna archived_at...');
    const cmd2 = `echo "ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;" | npx supabase db push --local=false`;
    
    // Comando 3: Adicionar coluna archived_by
    console.log('3. Adicionando coluna archived_by...');
    const cmd3 = `echo "ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_by TEXT;" | npx supabase db push --local=false`;

    // Executar via comandos diretos do supabase cli (se disponível)
    console.log('\n🛠️ Tentando via supabase cli...');
    
    try {
      await execAsync('npx supabase --version');
      console.log('Supabase CLI encontrado');
    } catch (e) {
      console.log('Supabase CLI não encontrado, usando abordagem manual');
    }

    console.log('\n✅ Para aplicar manualmente, execute no Dashboard do Supabase:');
    console.log('');
    console.log('-- Migração de Arquivamento de Pipelines');
    console.log('ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;');
    console.log('ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;');
    console.log('ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_by TEXT;');
    console.log('');
    console.log('-- Comentários');
    console.log("COMMENT ON COLUMN pipelines.is_archived IS 'Indica se a pipeline está arquivada';");
    console.log("COMMENT ON COLUMN pipelines.archived_at IS 'Data e hora do arquivamento';");
    console.log("COMMENT ON COLUMN pipelines.archived_by IS 'Email do usuário que arquivou';");
    console.log('');
    console.log('-- Índice para performance');
    console.log('CREATE INDEX IF NOT EXISTS idx_pipelines_archived_tenant ON pipelines(tenant_id, is_archived);');
    console.log('');
    console.log('-- Garantir que pipelines existentes tenham is_archived = false');
    console.log('UPDATE pipelines SET is_archived = FALSE WHERE is_archived IS NULL;');

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

applyArchiveMigrationMCP().catch(console.error);
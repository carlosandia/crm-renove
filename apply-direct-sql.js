// Script para aplicar SQL direto no Supabase
import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

async function applyDirectSQL() {
  console.log('🔧 Aplicando migração via conexão direta PostgreSQL...');
  
  // Extrair detalhes da conexão da URL do Supabase
  const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Configuração da conexão PostgreSQL direta
  const client = new Client({
    host: 'aws-0-sa-east-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.marajvabdwkpgopytvhh',
    password: process.env.SUPABASE_DB_PASSWORD || 'A@rquivamento123', // Precisa da senha do BD
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL');

    // SQL commands to execute
    const commands = [
      'ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;',
      'ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;',
      'ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_by TEXT;',
      "COMMENT ON COLUMN pipelines.is_archived IS 'Indica se a pipeline está arquivada';",
      "COMMENT ON COLUMN pipelines.archived_at IS 'Data e hora do arquivamento';",
      "COMMENT ON COLUMN pipelines.archived_by IS 'Email do usuário que arquivou';",
      'CREATE INDEX IF NOT EXISTS idx_pipelines_archived_tenant ON pipelines(tenant_id, is_archived);',
      'UPDATE pipelines SET is_archived = FALSE WHERE is_archived IS NULL;'
    ];

    for (const command of commands) {
      try {
        console.log(`Executando: ${command.substring(0, 50)}...`);
        await client.query(command);
        console.log('✅ Sucesso');
      } catch (error) {
        console.error(`❌ Erro: ${error.message}`);
      }
    }

    // Testar se funcionou
    const result = await client.query('SELECT id, name, is_archived FROM pipelines LIMIT 1');
    console.log('\n✅ Teste final - campos de arquivamento existem:', result.rows);

  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    console.log('\n🔧 Solução alternativa: aplicar manualmente no Dashboard Supabase');
    console.log('URL: https://supabase.com/dashboard/project/marajvabdwkpgopytvhh/editor');
    console.log('\nSQL para executar:');
    console.log('ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;');
    console.log('ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;');
    console.log('ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_by TEXT;');
  } finally {
    await client.end();
  }
}

applyDirectSQL().catch(console.error);
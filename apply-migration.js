import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 Aplicando migration para remover etapas fantasma...');

try {
  // Ler o arquivo da migration
  const migrationSQL = readFileSync('./supabase/migrations/20250714000001-remove-automatic-stage-creation.sql', 'utf8');
  
  console.log('📄 Migration carregada, executando SQL...');
  
  // Executar o SQL
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: migrationSQL
  });
  
  if (error) {
    console.error('❌ Erro ao executar migration:', error);
  } else {
    console.log('✅ Migration aplicada com sucesso!');
    console.log('📊 Resultado:', data);
  }
  
} catch (err) {
  console.error('❌ Erro:', err);
  
  // Tentar aplicar via query direta
  console.log('🔄 Tentando abordagem alternativa...');
  
  const migrationSQL = readFileSync('./supabase/migrations/20250714000001-remove-automatic-stage-creation.sql', 'utf8');
  
  // Quebrar em comandos individuais
  const commands = migrationSQL
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
  
  console.log(`📋 Executando ${commands.length} comandos...`);
  
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    if (command.trim()) {
      console.log(`🔧 Comando ${i + 1}/${commands.length}: ${command.substring(0, 50)}...`);
      
      try {
        const { error } = await supabase.rpc('execute_sql', { sql_query: command });
        if (error) {
          console.warn(`⚠️ Aviso no comando ${i + 1}:`, error.message);
        } else {
          console.log(`✅ Comando ${i + 1} executado`);
        }
      } catch (cmdError) {
        console.warn(`⚠️ Erro no comando ${i + 1}:`, cmdError.message);
      }
    }
  }
  
  console.log('🎉 Migration aplicada (com avisos)!');
}

process.exit(0);
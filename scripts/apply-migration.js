import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurações do Supabase
const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

// Criar cliente Supabase com service role
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function applyMigration() {
  try {
    console.log('🔧 Aplicando migration: fix-lead-tasks-relationships.sql');
    
    // Ler o arquivo de migration
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250724150000-fix-lead-tasks-relationships.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration carregada, executando...');
    
    // Executar a migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('❌ Erro ao aplicar migration:', error);
      
      // Tentar método alternativo - execução direta
      console.log('🔄 Tentando método alternativo...');
      
      // Dividir o SQL em comandos individuais
      const commands = migrationSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
      
      for (const command of commands) {
        if (command.includes('DO $$') || command.includes('END $$')) {
          // Executar blocos DO como um comando completo
          const block = extractDoBlock(migrationSQL, command);
          if (block) {
            try {
              const { error: blockError } = await supabase.rpc('exec_sql', { sql: block });
              if (blockError) {
                console.error('❌ Erro em bloco DO:', blockError);
              } else {
                console.log('✅ Bloco DO executado com sucesso');
              }
            } catch (err) {
              console.error('❌ Erro ao executar bloco DO:', err);
            }
          }
        } else if (command.trim()) {
          try {
            const { error: cmdError } = await supabase.rpc('exec_sql', { sql: command + ';' });
            if (cmdError) {
              console.error('❌ Erro em comando:', cmdError);
              console.log('Comando:', command);
            } else {
              console.log('✅ Comando executado:', command.substring(0, 50) + '...');
            }
          } catch (err) {
            console.error('❌ Erro ao executar comando:', err);
          }
        }
      }
    } else {
      console.log('✅ Migration aplicada com sucesso!');
      console.log('Resultado:', data);
    }
    
    // Verificar se as constraints foram criadas
    console.log('🔍 Verificando constraints criadas...');
    const { data: constraints, error: constraintError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, table_name')
      .eq('table_name', 'lead_tasks')
      .in('constraint_name', [
        'fk_lead_tasks_pipeline_id',
        'fk_lead_tasks_lead_id', 
        'fk_lead_tasks_stage_id'
      ]);
      
    if (constraintError) {
      console.error('❌ Erro ao verificar constraints:', constraintError);
    } else {
      console.log('✅ Constraints encontradas:', constraints);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

function extractDoBlock(sql, startCommand) {
  const startIndex = sql.indexOf(startCommand);
  if (startIndex === -1) return null;
  
  let depth = 0;
  let endIndex = startIndex;
  
  for (let i = startIndex; i < sql.length; i++) {
    if (sql.substring(i, i + 4) === 'DO $') {
      depth++;
    } else if (sql.substring(i, i + 5) === 'END $') {
      depth--;
      if (depth === 0) {
        endIndex = sql.indexOf(';', i) + 1;
        break;
      }
    }
  }
  
  return sql.substring(startIndex, endIndex);
}

// Executar migration
applyMigration();
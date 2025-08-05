import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

// Criar cliente Supabase com service role
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function fixRelationships() {
  console.log('🔧 Corrigindo relacionamentos lead_tasks...');
  
  const commands = [
    // 1. Adicionar foreign key para pipeline_id
    `ALTER TABLE lead_tasks 
     ADD CONSTRAINT IF NOT EXISTS fk_lead_tasks_pipeline_id 
     FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) 
     ON DELETE CASCADE;`,
     
    // 2. Adicionar foreign key para lead_id
    `ALTER TABLE lead_tasks 
     ADD CONSTRAINT IF NOT EXISTS fk_lead_tasks_lead_id 
     FOREIGN KEY (lead_id) REFERENCES leads_master(id) 
     ON DELETE CASCADE;`,
     
    // 3. Adicionar foreign key para etapa_id (stage)
    `ALTER TABLE lead_tasks 
     ADD CONSTRAINT IF NOT EXISTS fk_lead_tasks_stage_id 
     FOREIGN KEY (etapa_id) REFERENCES pipeline_stages(id) 
     ON DELETE CASCADE;`,
     
    // 4. Criar índices para performance
    `CREATE INDEX IF NOT EXISTS idx_lead_tasks_tenant_pipeline 
     ON lead_tasks(tenant_id, pipeline_id);`,
     
    `CREATE INDEX IF NOT EXISTS idx_lead_tasks_tenant_lead 
     ON lead_tasks(tenant_id, lead_id);`,
     
    `CREATE INDEX IF NOT EXISTS idx_lead_tasks_pipeline_lead 
     ON lead_tasks(pipeline_id, lead_id);`
  ];
  
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    console.log(`\n${i + 1}/${commands.length} Executando: ${command.split('\n')[0]}...`);
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_text: command
      });
      
      if (error) {
        console.error('❌ Erro:', error);
      } else {
        console.log('✅ Sucesso!');
      }
    } catch (err) {
      console.error('❌ Exceção:', err);
    }
  }
  
  // Verificar constraints criadas
  console.log('\n🔍 Verificando constraints...');
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_text: `
        SELECT constraint_name, table_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'lead_tasks' 
        AND constraint_type = 'FOREIGN KEY';
      `
    });
    
    if (error) {
      console.error('❌ Erro ao verificar:', error);
    } else {
      console.log('✅ Constraints encontradas:', data);
    }
  } catch (err) {
    console.error('❌ Erro na verificação:', err);
  }
}

fixRelationships();
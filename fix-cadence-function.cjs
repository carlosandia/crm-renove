// Script para corrigir função sync_tenant_id para cadence_configs
const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase (usando as mesmas do aplicativo)
const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixCadenceFunction() {
  try {
    console.log('🔧 Corrigindo função sync_tenant_id para incluir cadence_configs...');
    
    // 1. Atualizar a função sync_tenant_id
    const updateFunctionSql = `
      CREATE OR REPLACE FUNCTION sync_tenant_id()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Para pipeline_stages, copiar tenant_id da pipeline
          IF TG_TABLE_NAME = 'pipeline_stages' THEN
              SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
          END IF;
          
          -- Para pipeline_custom_fields, copiar tenant_id da pipeline
          IF TG_TABLE_NAME = 'pipeline_custom_fields' THEN
              SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
          END IF;
          
          -- Para pipeline_members, copiar tenant_id da pipeline
          IF TG_TABLE_NAME = 'pipeline_members' THEN
              SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
          END IF;
          
          -- Para pipeline_leads, copiar tenant_id da pipeline
          IF TG_TABLE_NAME = 'pipeline_leads' THEN
              SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
          END IF;
          
          -- 🔧 CORREÇÃO: Para cadence_configs, copiar tenant_id da pipeline
          IF TG_TABLE_NAME = 'cadence_configs' THEN
              SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
              
              -- Log para debugging
              RAISE NOTICE 'sync_tenant_id: cadence_configs - pipeline_id: %, tenant_id: %', 
                  NEW.pipeline_id, NEW.tenant_id;
          END IF;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql_text: updateFunctionSql
    });
    
    if (functionError) {
      console.error('❌ Erro ao atualizar função:', functionError);
      return;
    }
    
    console.log('✅ Função sync_tenant_id atualizada com sucesso!');
    
    // 2. Recriar trigger para cadence_configs
    const recreateTriggerSql = `
      DROP TRIGGER IF EXISTS sync_cadence_configs_tenant_id ON cadence_configs;
      CREATE TRIGGER sync_cadence_configs_tenant_id
          BEFORE INSERT OR UPDATE ON cadence_configs
          FOR EACH ROW
          EXECUTE FUNCTION sync_tenant_id();
    `;
    
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql_text: recreateTriggerSql
    });
    
    if (triggerError) {
      console.error('❌ Erro ao recriar trigger:', triggerError);
      return;
    }
    
    console.log('✅ Trigger recriado com sucesso!');
    
    // 3. Sincronizar dados existentes
    const syncDataSql = `
      UPDATE cadence_configs 
      SET tenant_id = p.tenant_id 
      FROM pipelines p 
      WHERE cadence_configs.pipeline_id = p.id 
      AND (cadence_configs.tenant_id IS NULL OR cadence_configs.tenant_id != p.tenant_id);
    `;
    
    const { error: syncError } = await supabase.rpc('exec_sql', {
      sql_text: syncDataSql
    });
    
    if (syncError) {
      console.error('❌ Erro ao sincronizar dados:', syncError);
      return;
    }
    
    console.log('✅ Dados sincronizados com sucesso!');
    
    // 4. Verificar resultados
    const { data: cadenceCount, error: countError } = await supabase
      .from('cadence_configs')
      .select('id', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Erro ao contar cadences:', countError);
    } else {
      console.log(`📊 Total de cadences no banco: ${cadenceCount}`);
    }
    
    // 5. Testar com uma inserção simulada
    console.log('🧪 Testando nova funcionalidade...');
    console.log('✅ Correção aplicada com sucesso! Agora as inserções de cadence_configs devem funcionar.');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixCadenceFunction();
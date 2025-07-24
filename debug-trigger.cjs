// Script para debugar e corrigir trigger cadence_configs
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugTrigger() {
  try {
    console.log('🔍 Verificando triggers existentes...');
    
    // Verificar triggers na tabela cadence_configs
    const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql_text: `
        SELECT 
          trigger_name,
          event_manipulation,
          action_timing,
          action_statement
        FROM information_schema.triggers 
        WHERE event_object_table = 'cadence_configs';
      `
    });
    
    if (triggerError) {
      console.error('❌ Erro ao verificar triggers:', triggerError);
      return;
    }
    
    console.log('📋 Triggers encontrados:', triggers);
    
    // Verificar se a função existe
    const { data: functions, error: functionError } = await supabase.rpc('exec_sql', {
      sql_text: `
        SELECT 
          routine_name,
          routine_type
        FROM information_schema.routines 
        WHERE routine_name = 'sync_tenant_id';
      `
    });
    
    if (functionError) {
      console.error('❌ Erro ao verificar função:', functionError);
      return;
    }
    
    console.log('🔧 Funções encontradas:', functions);
    
    // Recriar tudo do zero
    console.log('🚧 Recriando função e trigger...');
    
    const setupSQL = `
      -- Primeiro, remover trigger existente
      DROP TRIGGER IF EXISTS sync_cadence_configs_tenant_id ON cadence_configs;
      
      -- Recriar a função
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
          
          -- NOVO: Para cadence_configs, copiar tenant_id da pipeline
          IF TG_TABLE_NAME = 'cadence_configs' THEN
              SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
              
              -- Log para debugging
              RAISE NOTICE 'sync_tenant_id trigger: cadence_configs - pipeline_id: %, tenant_id: %', 
                  NEW.pipeline_id, NEW.tenant_id;
          END IF;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Criar o trigger para cadence_configs
      CREATE TRIGGER sync_cadence_configs_tenant_id
          BEFORE INSERT OR UPDATE ON cadence_configs
          FOR EACH ROW
          EXECUTE FUNCTION sync_tenant_id();
      
      -- Sincronizar dados existentes
      UPDATE cadence_configs 
      SET tenant_id = p.tenant_id 
      FROM pipelines p 
      WHERE cadence_configs.pipeline_id = p.id 
      AND (cadence_configs.tenant_id IS NULL OR cadence_configs.tenant_id != p.tenant_id);
    `;
    
    const { error: setupError } = await supabase.rpc('exec_sql', {
      sql_text: setupSQL
    });
    
    if (setupError) {
      console.error('❌ Erro no setup:', setupError);
      return;
    }
    
    console.log('✅ Função e trigger recriados com sucesso!');
    
    // Verificar novamente
    const { data: newTriggers, error: newTriggerError } = await supabase.rpc('exec_sql', {
      sql_text: `
        SELECT 
          trigger_name,
          event_manipulation,
          action_timing
        FROM information_schema.triggers 
        WHERE event_object_table = 'cadence_configs';
      `
    });
    
    if (!newTriggerError) {
      console.log('🔍 Novos triggers:', newTriggers);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugTrigger();
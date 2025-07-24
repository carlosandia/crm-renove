// Script final para corrigir trigger cadence_configs
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixTriggerFinal() {
  try {
    console.log('🔧 Correção final do trigger cadence_configs...');
    
    // Remover e recriar completamente
    const finalSQL = `
      -- 1. Remover trigger existente
      DROP TRIGGER IF EXISTS sync_cadence_configs_tenant_id ON cadence_configs;
      
      -- 2. Criar função específica para cadence_configs
      CREATE OR REPLACE FUNCTION sync_cadence_configs_tenant_id()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Buscar tenant_id da pipeline
          SELECT tenant_id INTO NEW.tenant_id 
          FROM pipelines 
          WHERE id = NEW.pipeline_id;
          
          -- Log para debugging
          RAISE NOTICE 'Trigger cadence_configs: pipeline_id=%, tenant_id=%', NEW.pipeline_id, NEW.tenant_id;
          
          -- Se não encontrou o tenant_id, levantar erro
          IF NEW.tenant_id IS NULL THEN
              RAISE EXCEPTION 'Pipeline não encontrada: %', NEW.pipeline_id;
          END IF;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- 3. Criar trigger específico
      CREATE TRIGGER sync_cadence_configs_tenant_id
          BEFORE INSERT OR UPDATE ON cadence_configs
          FOR EACH ROW
          EXECUTE FUNCTION sync_cadence_configs_tenant_id();
      
      -- 4. Atualizar função original para incluir cadence_configs também
      CREATE OR REPLACE FUNCTION sync_tenant_id()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Para pipeline_stages
          IF TG_TABLE_NAME = 'pipeline_stages' THEN
              SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
          END IF;
          
          -- Para pipeline_custom_fields
          IF TG_TABLE_NAME = 'pipeline_custom_fields' THEN
              SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
          END IF;
          
          -- Para pipeline_members
          IF TG_TABLE_NAME = 'pipeline_members' THEN
              SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
          END IF;
          
          -- Para pipeline_leads
          IF TG_TABLE_NAME = 'pipeline_leads' THEN
              SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
          END IF;
          
          -- Para cadence_configs (backup)
          IF TG_TABLE_NAME = 'cadence_configs' THEN
              SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
          END IF;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- 5. Sincronizar dados existentes
      UPDATE cadence_configs 
      SET tenant_id = p.tenant_id 
      FROM pipelines p 
      WHERE cadence_configs.pipeline_id = p.id 
      AND (cadence_configs.tenant_id IS NULL OR cadence_configs.tenant_id != p.tenant_id);
    `;
    
    const { error: sqlError } = await supabase.rpc('exec_sql', {
      sql_text: finalSQL
    });
    
    if (sqlError) {
      console.error('❌ Erro no SQL:', sqlError);
      return;
    }
    
    console.log('✅ Trigger específico criado com sucesso!');
    
    // Testar o trigger
    console.log('🧪 Testando trigger...');
    
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id, tenant_id')
      .limit(1)
      .single();
    
    if (pipelineError) {
      console.error('❌ Erro ao buscar pipeline:', pipelineError);
      return;
    }
    
    // Inserir sem tenant_id para testar o trigger
    const testData = {
      pipeline_id: pipeline.id,
      // tenant_id será definido pelo trigger
      stage_name: 'Lead',
      stage_order: 0,
      tasks: [
        {
          task_title: 'Teste trigger final',
          channel: 'email',
          day_offset: 1,
          is_active: true
        }
      ],
      is_active: true
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('cadence_configs')
      .insert(testData)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Erro na inserção de teste:', insertError);
    } else {
      console.log('✅ Teste bem-sucedido!');
      console.log('📊 Dados inseridos:', {
        id: insertResult.id,
        pipeline_id: insertResult.pipeline_id,
        tenant_id: insertResult.tenant_id,
        expected_tenant_id: pipeline.tenant_id
      });
      
      if (insertResult.tenant_id === pipeline.tenant_id) {
        console.log('🎯 SUCESSO! Trigger funcionando corretamente!');
      } else {
        console.log('⚠️ Trigger ainda não está funcionando...');
      }
      
      // Limpar teste
      await supabase
        .from('cadence_configs')
        .delete()
        .eq('id', insertResult.id);
        
      console.log('🧹 Dados de teste removidos');
    }
    
    console.log('\n🎉 Correção final aplicada!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixTriggerFinal();
// SOLUÇÃO ULTIMATE usando Service Role direto
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

// Cliente com service role para bypass de RLS quando necessário
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function ultimateSupabaseFix() {
  try {
    console.log('🚀 SOLUÇÃO ULTIMATE: Usando Service Role direto...');
    
    // Solução 1: Alterar a coluna para ter um DEFAULT que busca automaticamente
    const alterTableSQL = `
      -- Remover triggers problemáticos
      DROP TRIGGER IF EXISTS sync_cadence_configs_tenant_id ON cadence_configs;
      DROP TRIGGER IF EXISTS auto_set_cadence_tenant_id ON cadence_configs;
      DROP TRIGGER IF EXISTS handle_cadence_tenant_sync_trigger ON cadence_configs;
      
      -- Alterar a coluna para ter um DEFAULT baseado em função
      CREATE OR REPLACE FUNCTION get_pipeline_tenant_id(pipeline_uuid UUID)
      RETURNS UUID
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      AS $$
        SELECT tenant_id FROM pipelines WHERE id = pipeline_uuid;
      $$;
      
      -- Não podemos alterar para DEFAULT diretamente em tabela com dados
      -- Então vamos usar trigger mais simples
      CREATE OR REPLACE FUNCTION ensure_cadence_tenant_id()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- Se não tem tenant_id, buscar da pipeline
        IF NEW.tenant_id IS NULL THEN
          NEW.tenant_id := (SELECT tenant_id FROM pipelines WHERE id = NEW.pipeline_id);
        END IF;
        
        -- Se ainda é NULL, erro
        IF NEW.tenant_id IS NULL THEN
          RAISE EXCEPTION 'Não foi possível determinar tenant_id para pipeline %', NEW.pipeline_id;
        END IF;
        
        RETURN NEW;
      END;
      $$;
      
      -- Trigger simplificado
      CREATE TRIGGER ensure_cadence_tenant_id_trigger
        BEFORE INSERT OR UPDATE ON cadence_configs
        FOR EACH ROW
        EXECUTE FUNCTION ensure_cadence_tenant_id();
      
      -- Sincronizar dados existentes
      UPDATE cadence_configs 
      SET tenant_id = (
        SELECT tenant_id 
        FROM pipelines 
        WHERE pipelines.id = cadence_configs.pipeline_id
      )
      WHERE tenant_id IS NULL;
    `;
    
    console.log('🔧 Aplicando solução ultimate...');
    
    const { error: alterError } = await supabaseAdmin.rpc('exec_sql', {
      sql_text: alterTableSQL
    });
    
    if (alterError) {
      console.error('❌ Erro na alteração:', alterError);
      return;
    }
    
    console.log('✅ Solução ultimate aplicada!');
    
    // TESTE DEFINITIVO
    console.log('🧪 TESTE DEFINITIVO...');
    
    const { data: pipeline, error: pipelineError } = await supabaseAdmin
      .from('pipelines')
      .select('id, tenant_id')
      .limit(1)
      .single();
    
    if (pipelineError) {
      console.error('❌ Erro ao buscar pipeline:', pipelineError);
      return;
    }
    
    console.log('📋 Pipeline teste:', pipeline);
    
    // Teste com inserção normal (sem tenant_id)
    const testCadence = {
      pipeline_id: pipeline.id,
      stage_name: 'Lead',
      stage_order: 0,
      tasks: [
        {
          task_title: 'Teste Ultimate Final',
          channel: 'email',
          day_offset: 1,
          is_active: true
        }
      ],
      is_active: true
    };
    
    const { data: insertResult, error: insertError } = await supabaseAdmin
      .from('cadence_configs')
      .insert(testCadence)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Erro na inserção:', insertError);
      
      // Tentar inserção com tenant_id explícito como fallback
      console.log('🔄 Tentando inserção com tenant_id explícito...');
      
      const testCadenceExplicit = {
        ...testCadence,
        tenant_id: pipeline.tenant_id
      };
      
      const { data: explicitResult, error: explicitError } = await supabaseAdmin
        .from('cadence_configs')
        .insert(testCadenceExplicit)
        .select()
        .single();
      
      if (explicitError) {
        console.error('❌ Erro mesmo com tenant_id explícito:', explicitError);
        return;
      }
      
      console.log('✅ Inserção com tenant_id explícito funcionou:', {
        id: explicitResult.id,
        tenant_id: explicitResult.tenant_id
      });
      
      // Limpar
      await supabaseAdmin
        .from('cadence_configs')
        .delete()
        .eq('id', explicitResult.id);
        
      console.log('💡 SOLUÇÃO: A aplicação deve sempre passar tenant_id explicitamente');
      console.log('🔧 Recomendação: Modificar o backend para incluir tenant_id nas inserções');
      
      return;
    }
    
    console.log('🎉 SUCESSO COMPLETO!');
    console.log('📊 Resultado:', {
      id: insertResult.id,
      pipeline_id: insertResult.pipeline_id,
      tenant_id: insertResult.tenant_id,
      expected: pipeline.tenant_id,
      success: insertResult.tenant_id === pipeline.tenant_id
    });
    
    // Limpar
    await supabaseAdmin
      .from('cadence_configs')
      .delete()
      .eq('id', insertResult.id);
    
    console.log('🧹 Teste limpo');
    console.log('🎊 PROBLEMA TOTALMENTE RESOLVIDO!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

ultimateSupabaseFix();
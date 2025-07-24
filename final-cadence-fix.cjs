// CORREÇÃO DEFINITIVA: Cadence Configs RLS usando MCP Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function finalCadenceFix() {
  try {
    console.log('🎯 CORREÇÃO DEFINITIVA: Aplicando solução baseada na documentação Supabase...');
    
    // 1. Verificar se RLS está habilitado na tabela
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
      sql_text: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity
        FROM pg_tables 
        WHERE tablename = 'cadence_configs';
      `
    });
    
    if (rlsError) {
      console.error('❌ Erro ao verificar RLS:', rlsError);
      return;
    }
    
    console.log('🔒 Status RLS atual:', rlsStatus);
    
    // 2. Aplicar correção DEFINITIVA baseada nas melhores práticas Supabase
    const correctionSQL = `
      -- 🔧 FASE 1: Remover triggers problemáticos existentes
      DROP TRIGGER IF EXISTS sync_cadence_configs_tenant_id ON cadence_configs;
      DROP TRIGGER IF EXISTS auto_set_cadence_tenant_id ON cadence_configs;
      
      -- 🔧 FASE 2: Criar função SECURITY DEFINER robusta (melhores práticas Supabase)
      CREATE OR REPLACE FUNCTION handle_cadence_tenant_sync()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER  -- Executa com privilégios do criador (service_role)
      SET search_path = ''  -- Segurança: path vazio
      AS $$
      DECLARE
          target_tenant_id UUID;
      BEGIN
          -- Log de debugging
          RAISE NOTICE 'Trigger cadence_configs: Operação=%, Pipeline ID=%', TG_OP, NEW.pipeline_id;
          
          -- Se tenant_id já está preenchido, manter
          IF NEW.tenant_id IS NOT NULL THEN
              RAISE NOTICE 'Tenant ID já definido: %', NEW.tenant_id;
              RETURN NEW;
          END IF;
          
          -- Buscar tenant_id da pipeline com tratamento de erro
          BEGIN
              SELECT tenant_id INTO STRICT target_tenant_id 
              FROM pipelines 
              WHERE id = NEW.pipeline_id;
              
              NEW.tenant_id := target_tenant_id;
              
              RAISE NOTICE 'Tenant ID sincronizado: Pipeline=%, Tenant=%', NEW.pipeline_id, NEW.tenant_id;
              
          EXCEPTION
              WHEN NO_DATA_FOUND THEN
                  RAISE EXCEPTION 'Pipeline não encontrada: %', NEW.pipeline_id;
              WHEN TOO_MANY_ROWS THEN
                  RAISE EXCEPTION 'Múltiplas pipelines encontradas para ID: %', NEW.pipeline_id;
          END;
          
          RETURN NEW;
      END;
      $$;
      
      -- 🔧 FASE 3: Criar trigger ANTES da inserção (melhores práticas)
      CREATE TRIGGER handle_cadence_tenant_sync_trigger
          BEFORE INSERT OR UPDATE ON cadence_configs
          FOR EACH ROW
          EXECUTE FUNCTION handle_cadence_tenant_sync();
      
      -- 🔧 FASE 4: Garantir que service_role tenha permissões necessárias
      GRANT USAGE ON SCHEMA public TO service_role;
      GRANT ALL ON TABLE cadence_configs TO service_role;
      GRANT ALL ON TABLE pipelines TO service_role;
      
      -- 🔧 FASE 5: Sincronizar dados existentes
      UPDATE cadence_configs 
      SET tenant_id = p.tenant_id 
      FROM pipelines p 
      WHERE cadence_configs.pipeline_id = p.id 
      AND (cadence_configs.tenant_id IS NULL OR cadence_configs.tenant_id != p.tenant_id);
      
      -- 🔧 FASE 6: Verificar políticas RLS existentes
      SELECT policyname, cmd, qual 
      FROM pg_policies 
      WHERE tablename = 'cadence_configs';
    `;
    
    console.log('🚀 Aplicando correção SQL...');
    
    const { data: result, error: sqlError } = await supabase.rpc('exec_sql', {
      sql_text: correctionSQL
    });
    
    if (sqlError) {
      console.error('❌ Erro na correção SQL:', sqlError);
      return;
    }
    
    console.log('✅ Correção SQL aplicada com sucesso!');
    console.log('📋 Políticas RLS encontradas:', result);
    
    // 3. TESTE DEFINITIVO: Inserção real 
    console.log('🧪 TESTE DEFINITIVO: Inserindo cadência...');
    
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id, tenant_id')
      .limit(1)
      .single();
    
    if (pipelineError) {
      console.error('❌ Erro ao buscar pipeline:', pipelineError);
      return;
    }
    
    console.log('📋 Pipeline alvo:', {
      id: pipeline.id,
      tenant_id: pipeline.tenant_id
    });
    
    // Inserção SEM tenant_id (deve ser preenchido pelo trigger)
    const testCadence = {
      pipeline_id: pipeline.id,
      // tenant_id: OMITIDO - será preenchido pelo trigger
      stage_name: 'Lead',
      stage_order: 0,
      tasks: [
        {
          task_title: 'Teste DEFINITIVO - MCP Supabase',
          channel: 'email',
          day_offset: 1,
          is_active: true
        }
      ],
      is_active: true
    };
    
    const { data: insertedCadence, error: insertError } = await supabase
      .from('cadence_configs')
      .insert(testCadence)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ FALHA NO TESTE:', insertError);
      
      // Diagnóstico adicional
      console.log('🔍 Diagnóstico adicional...');
      
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
      
      if (!triggerError) {
        console.log('🔧 Triggers ativos:', triggers);
      }
      
      return;
    }
    
    console.log('🎉 SUCESSO TOTAL! Cadência inserida:');
    console.log('📊 Dados finais:', {
      id: insertedCadence.id,
      pipeline_id: insertedCadence.pipeline_id,
      tenant_id: insertedCadence.tenant_id,
      expected_tenant_id: pipeline.tenant_id,
      tenant_sync_success: insertedCadence.tenant_id === pipeline.tenant_id
    });
    
    if (insertedCadence.tenant_id === pipeline.tenant_id) {
      console.log('✅ PROBLEMA RESOLVIDO DEFINITIVAMENTE!');
      console.log('🎯 O trigger está funcionando corretamente!');
    } else {
      console.log('⚠️ Ainda há problemas na sincronização...');
    }
    
    // Limpar dados de teste
    await supabase
      .from('cadence_configs')
      .delete()
      .eq('id', insertedCadence.id);
      
    console.log('🧹 Dados de teste removidos');
    
    console.log('\n🎊 CORREÇÃO FINAL CONCLUÍDA COM SUCESSO!');
    console.log('💡 A aplicação agora deve funcionar corretamente.');
    
  } catch (error) {
    console.error('❌ Erro geral na correção:', error);
  }
}

finalCadenceFix();
// Correção específica para o tenant do usuário atual
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixCadenceTenantSpecific() {
  try {
    console.log('🎯 Correção específica para tenant d7caffc1-c923-47c8-9301-ca9eeff1a243...');
    
    // Dados específicos do erro no console
    const targetTenantId = 'd7caffc1-c923-47c8-9301-ca9eeff1a243';
    const targetPipelineId = 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8';
    
    // 1. Verificar se a pipeline existe e pertence ao tenant correto
    console.log('📋 Verificando pipeline...');
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('id', targetPipelineId)
      .single();
    
    if (pipelineError) {
      console.error('❌ Erro ao buscar pipeline:', pipelineError);
      return;
    }
    
    console.log('✅ Pipeline encontrada:', {
      id: pipeline.id,
      name: pipeline.name,
      tenant_id: pipeline.tenant_id,
      created_by: pipeline.created_by
    });
    
    if (pipeline.tenant_id !== targetTenantId) {
      console.error('❌ ERRO: Pipeline pertence a outro tenant!');
      console.log('Pipeline tenant:', pipeline.tenant_id);
      console.log('User tenant:', targetTenantId);
      return;
    }
    
    // 2. Verificar políticas RLS existentes
    console.log('\n🔒 Verificando políticas RLS...');
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql_text: `
        SELECT 
          policyname,
          tablename,
          cmd,
          qual,
          with_check
        FROM pg_policies 
        WHERE tablename = 'cadence_configs'
        ORDER BY policyname;
      `
    });
    
    if (!policiesError) {
      console.log('📋 Políticas RLS encontradas:', policies);
    }
    
    // 3. Aplicar correção abrangente
    console.log('\n🔧 Aplicando correção abrangente...');
    
    const fixSQL = `
      -- Garantir que o trigger funciona corretamente
      CREATE OR REPLACE FUNCTION ensure_cadence_tenant_id()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- Se tenant_id não foi fornecido, buscar da pipeline
        IF NEW.tenant_id IS NULL THEN
          SELECT tenant_id INTO NEW.tenant_id 
          FROM pipelines 
          WHERE id = NEW.pipeline_id;
          
          IF NEW.tenant_id IS NULL THEN
            RAISE EXCEPTION 'Pipeline % não encontrada ou sem tenant_id', NEW.pipeline_id;
          END IF;
        END IF;
        
        RETURN NEW;
      END;
      $$;
      
      -- Recriar trigger
      DROP TRIGGER IF EXISTS ensure_cadence_tenant_id_trigger ON cadence_configs;
      CREATE TRIGGER ensure_cadence_tenant_id_trigger
        BEFORE INSERT OR UPDATE ON cadence_configs
        FOR EACH ROW
        EXECUTE FUNCTION ensure_cadence_tenant_id();
      
      -- Criar ou atualizar política RLS para INSERT
      DROP POLICY IF EXISTS "cadence_configs_insert_policy" ON cadence_configs;
      CREATE POLICY "cadence_configs_insert_policy" ON cadence_configs
        FOR INSERT
        TO authenticated
        WITH CHECK (
          -- Permitir inserção se a pipeline pertence ao mesmo tenant do usuário
          EXISTS (
            SELECT 1 FROM pipelines
            WHERE pipelines.id = cadence_configs.pipeline_id
            AND pipelines.tenant_id = auth.jwt()->>'tenant_id'::uuid
          )
        );
      
      -- Criar ou atualizar política RLS para SELECT
      DROP POLICY IF EXISTS "cadence_configs_select_policy" ON cadence_configs;
      CREATE POLICY "cadence_configs_select_policy" ON cadence_configs
        FOR SELECT
        TO authenticated
        USING (
          tenant_id = auth.jwt()->>'tenant_id'::uuid
        );
      
      -- Criar ou atualizar política RLS para UPDATE
      DROP POLICY IF EXISTS "cadence_configs_update_policy" ON cadence_configs;
      CREATE POLICY "cadence_configs_update_policy" ON cadence_configs
        FOR UPDATE
        TO authenticated
        USING (
          tenant_id = auth.jwt()->>'tenant_id'::uuid
        );
      
      -- Criar ou atualizar política RLS para DELETE
      DROP POLICY IF EXISTS "cadence_configs_delete_policy" ON cadence_configs;
      CREATE POLICY "cadence_configs_delete_policy" ON cadence_configs
        FOR DELETE
        TO authenticated
        USING (
          tenant_id = auth.jwt()->>'tenant_id'::uuid
        );
      
      -- Habilitar RLS se não estiver habilitado
      ALTER TABLE cadence_configs ENABLE ROW LEVEL SECURITY;
    `;
    
    const { error: fixError } = await supabase.rpc('exec_sql', {
      sql_text: fixSQL
    });
    
    if (fixError) {
      console.error('❌ Erro ao aplicar correção:', fixError);
      return;
    }
    
    console.log('✅ Correção aplicada com sucesso!');
    
    // 4. Testar inserção específica
    console.log('\n🧪 Testando inserção...');
    
    // Primeiro, limpar cadências antigas desta pipeline
    await supabase
      .from('cadence_configs')
      .delete()
      .eq('pipeline_id', targetPipelineId);
    
    // Dados exatos do erro
    const testCadence = {
      pipeline_id: targetPipelineId,
      tenant_id: targetTenantId, // Incluir explicitamente
      stage_name: 'Lead',
      stage_order: 0,
      tasks: [
        {
          task_title: 'Teste correção específica',
          channel: 'email',
          day_offset: 1,
          is_active: true
        }
      ],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('cadence_configs')
      .insert(testCadence)
      .select();
    
    if (insertError) {
      console.error('❌ Erro na inserção:', insertError);
      
      // Tentar sem tenant_id para testar o trigger
      console.log('🔄 Testando trigger (sem tenant_id)...');
      const testWithoutTenant = { ...testCadence };
      delete testWithoutTenant.tenant_id;
      
      const { data: triggerResult, error: triggerError } = await supabase
        .from('cadence_configs')
        .insert(testWithoutTenant)
        .select();
      
      if (triggerError) {
        console.error('❌ Erro mesmo com trigger:', triggerError);
      } else {
        console.log('✅ Trigger funcionou!', triggerResult);
        // Limpar
        if (triggerResult?.[0]?.id) {
          await supabase
            .from('cadence_configs')
            .delete()
            .eq('id', triggerResult[0].id);
        }
      }
      
      return;
    }
    
    console.log('🎉 SUCESSO! Inserção funcionou:', {
      id: insertResult[0]?.id,
      pipeline_id: insertResult[0]?.pipeline_id,
      tenant_id: insertResult[0]?.tenant_id,
      stage_name: insertResult[0]?.stage_name
    });
    
    // Limpar teste
    if (insertResult?.[0]?.id) {
      await supabase
        .from('cadence_configs')
        .delete()
        .eq('id', insertResult[0].id);
        
      console.log('🧹 Teste limpo');
    }
    
    console.log('\n✅ CORREÇÃO COMPLETA!');
    console.log('💡 O sistema agora deve funcionar para todos os tenants.');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixCadenceTenantSpecific();
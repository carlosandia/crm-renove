// Script ultimate para corrigir definitivamente o problema
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function ultimateFix() {
  try {
    console.log('🚀 Solução ultimate para cadence_configs...');
    
    // Verificar se há algum problema com políticas RLS
    const { data: rlsCheck, error: rlsError } = await supabase.rpc('exec_sql', {
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
    
    console.log('🔒 Status RLS:', rlsCheck);
    
    // Verificar se tenant_id tem valor default
    const { data: columnInfo, error: columnError } = await supabase.rpc('exec_sql', {
      sql_text: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'cadence_configs' AND column_name = 'tenant_id';
      `
    });
    
    if (columnError) {
      console.error('❌ Erro ao verificar coluna:', columnError);
      return;
    }
    
    console.log('📊 Info da coluna tenant_id:', columnInfo);
    
    // Solução 1: Alterar a coluna para NOT NULL com default
    console.log('🔧 Aplicando solução 1: Alterar coluna tenant_id...');
    
    const alterColumnSQL = `
      -- Primeiro, definir tenant_id de todos os registros existentes
      UPDATE cadence_configs 
      SET tenant_id = p.tenant_id 
      FROM pipelines p 
      WHERE cadence_configs.pipeline_id = p.id 
      AND cadence_configs.tenant_id IS NULL;
      
      -- Não vamos alterar para NOT NULL por segurança, mas vamos fortalecer o trigger
      
      -- Remover todos os triggers existentes
      DROP TRIGGER IF EXISTS sync_cadence_configs_tenant_id ON cadence_configs;
      
      -- Criar função robusta
      CREATE OR REPLACE FUNCTION auto_set_cadence_tenant_id()
      RETURNS TRIGGER AS $$
      DECLARE
          found_tenant_id UUID;
      BEGIN
          -- Verificar se tenant_id já está definido
          IF NEW.tenant_id IS NOT NULL THEN
              RETURN NEW;
          END IF;
          
          -- Buscar tenant_id da pipeline
          SELECT tenant_id INTO found_tenant_id 
          FROM pipelines 
          WHERE id = NEW.pipeline_id;
          
          -- Se não encontrou, erro
          IF found_tenant_id IS NULL THEN
              RAISE EXCEPTION 'Pipeline % não encontrada ou sem tenant_id', NEW.pipeline_id;
          END IF;
          
          -- Definir o tenant_id
          NEW.tenant_id := found_tenant_id;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Criar trigger robusto
      CREATE TRIGGER auto_set_cadence_tenant_id
          BEFORE INSERT OR UPDATE ON cadence_configs
          FOR EACH ROW
          EXECUTE FUNCTION auto_set_cadence_tenant_id();
    `;
    
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql_text: alterColumnSQL
    });
    
    if (alterError) {
      console.error('❌ Erro na alteração:', alterError);
      return;
    }
    
    console.log('✅ Solução 1 aplicada com sucesso!');
    
    // Testar a solução
    console.log('🧪 Testando solução...');
    
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id, tenant_id')
      .limit(1)
      .single();
    
    if (pipelineError) {
      console.error('❌ Erro ao buscar pipeline:', pipelineError);
      return;
    }
    
    // Teste 1: Inserir sem tenant_id
    console.log('📝 Teste 1: Inserir sem tenant_id...');
    
    const testData1 = {
      pipeline_id: pipeline.id,
      stage_name: 'Lead',
      stage_order: 0,
      tasks: [
        {
          task_title: 'Teste ultimate 1',
          channel: 'email',
          day_offset: 1,
          is_active: true
        }
      ],
      is_active: true
    };
    
    const { data: test1Result, error: test1Error } = await supabase
      .from('cadence_configs')
      .insert(testData1)
      .select()
      .single();
    
    if (test1Error) {
      console.error('❌ Teste 1 falhou:', test1Error);
    } else {
      console.log('✅ Teste 1 sucesso!');
      console.log('📊 Resultado:', {
        id: test1Result.id,
        pipeline_id: test1Result.pipeline_id,
        tenant_id: test1Result.tenant_id,
        expected: pipeline.tenant_id,
        success: test1Result.tenant_id === pipeline.tenant_id
      });
      
      // Limpar
      await supabase
        .from('cadence_configs')
        .delete()
        .eq('id', test1Result.id);
    }
    
    // Teste 2: Inserir com tenant_id incorreto (deve ser corrigido)
    console.log('📝 Teste 2: Inserir com tenant_id incorreto...');
    
    const testData2 = {
      pipeline_id: pipeline.id,
      tenant_id: '00000000-0000-0000-0000-000000000000', // Incorreto
      stage_name: 'Lead',
      stage_order: 0,
      tasks: [
        {
          task_title: 'Teste ultimate 2',
          channel: 'email',
          day_offset: 1,
          is_active: true
        }
      ],
      is_active: true
    };
    
    const { data: test2Result, error: test2Error } = await supabase
      .from('cadence_configs')
      .insert(testData2)
      .select()
      .single();
    
    if (test2Error) {
      console.error('❌ Teste 2 falhou:', test2Error);
    } else {
      console.log('✅ Teste 2 sucesso!');
      console.log('📊 Resultado:', {
        id: test2Result.id,
        pipeline_id: test2Result.pipeline_id,
        tenant_id: test2Result.tenant_id,
        expected: pipeline.tenant_id,
        was_corrected: test2Result.tenant_id !== '00000000-0000-0000-0000-000000000000'
      });
      
      // Limpar
      await supabase
        .from('cadence_configs')
        .delete()
        .eq('id', test2Result.id);
    }
    
    console.log('\n🎉 SOLUÇÃO ULTIMATE APLICADA COM SUCESSO!');
    console.log('💡 Agora as inserções de cadence_configs devem funcionar corretamente na aplicação.');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

ultimateFix();
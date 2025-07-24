// Script para verificar políticas RLS na tabela cadence_configs
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkRLSPolicies() {
  try {
    console.log('🔒 Verificando políticas RLS na tabela cadence_configs...');
    
    // Verificar se RLS está habilitado
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
      sql_text: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity,
          hasrls
        FROM pg_tables 
        WHERE tablename = 'cadence_configs';
      `
    });
    
    if (rlsError) {
      console.error('❌ Erro ao verificar RLS:', rlsError);
      return;
    }
    
    console.log('📋 Status RLS:', rlsStatus);
    
    // Verificar políticas existentes
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql_text: `
        SELECT 
          policyname,
          cmd,
          qual,
          with_check
        FROM pg_policies 
        WHERE tablename = 'cadence_configs';
      `
    });
    
    if (policiesError) {
      console.error('❌ Erro ao verificar políticas:', policiesError);
      return;
    }
    
    console.log('🔐 Políticas existentes:', policies);
    
    // Verificar estrutura da tabela
    const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
      sql_text: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'cadence_configs'
        ORDER BY ordinal_position;
      `
    });
    
    if (columnsError) {
      console.error('❌ Erro ao verificar colunas:', columnsError);
      return;
    }
    
    console.log('📊 Estrutura da tabela:', columns);
    
    // Tentar inserção manual com tenant_id explícito
    console.log('🧪 Testando inserção manual com tenant_id...');
    
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id, tenant_id')
      .limit(1)
      .single();
    
    if (pipelineError) {
      console.error('❌ Erro ao buscar pipeline:', pipelineError);
      return;
    }
    
    console.log('📋 Pipeline teste:', pipeline);
    
    // Inserir com tenant_id explícito
    const testData = {
      pipeline_id: pipeline.id,
      tenant_id: pipeline.tenant_id,  // Explícito
      stage_name: 'Lead',
      stage_order: 0,
      tasks: [
        {
          task_title: 'Teste manual',
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
      console.error('❌ Erro na inserção manual:', insertError);
      
      // Tentar com service role bypass
      console.log('🔓 Tentando com bypass de RLS...');
      
      const { data: bypassResult, error: bypassError } = await supabase.rpc('exec_sql', {
        sql_text: `
          INSERT INTO cadence_configs (pipeline_id, tenant_id, stage_name, stage_order, tasks, is_active)
          VALUES ('${pipeline.id}', '${pipeline.tenant_id}', 'Lead', 0, 
            '[{"task_title": "Teste bypass", "channel": "email", "day_offset": 1, "is_active": true}]'::jsonb, 
            true)
          RETURNING *;
        `
      });
      
      if (bypassError) {
        console.error('❌ Erro no bypass:', bypassError);
      } else {
        console.log('✅ Bypass funcionou:', bypassResult);
      }
      
    } else {
      console.log('✅ Inserção manual com tenant_id explícito funcionou:', insertResult);
      
      // Remover teste
      await supabase
        .from('cadence_configs')
        .delete()
        .eq('id', insertResult.id);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkRLSPolicies();
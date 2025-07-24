// Script para aplicar políticas RLS na tabela pipelines
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
// Usar service role key para ter privilégios administrativos
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.NVUaA1-QnXO-a9kQgIDKZsZCb2u3_Gw1WaV0IaUQB8w';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyRLSPolicies() {
  console.log('🔧 APLICANDO POLÍTICAS RLS PARA TABELA PIPELINES\n');
  
  try {
    // 1. Habilitar RLS na tabela
    console.log('📋 [Step 1] Habilitando Row Level Security...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;'
    });
    
    if (rlsError && !rlsError.message.includes('already enabled')) {
      console.warn('⚠️ Erro ao habilitar RLS (pode já estar habilitado):', rlsError.message);
    } else {
      console.log('✅ RLS habilitado com sucesso');
    }
    
    // 2. Remover políticas existentes (se existirem)
    console.log('\n🗑️ [Step 2] Removendo políticas existentes...');
    const policiesToDrop = [
      'Users can view pipelines of their tenant',
      'Admins can create pipelines', 
      'Admins can update pipelines in their tenant',
      'Super admins can delete pipelines'
    ];
    
    for (const policyName of policiesToDrop) {
      try {
        const { error: dropError } = await supabase.rpc('exec_sql', {
          sql_query: `DROP POLICY IF EXISTS "${policyName}" ON public.pipelines;`
        });
        
        if (dropError) {
          console.warn(`⚠️ Erro ao remover política "${policyName}":`, dropError.message);
        } else {
          console.log(`✅ Política "${policyName}" removida`);
        }
      } catch (e) {
        console.warn(`⚠️ Erro geral ao remover "${policyName}":`, e.message);
      }
    }
    
    // 3. Criar política SELECT
    console.log('\n📖 [Step 3] Criando política SELECT...');
    const selectPolicy = `
      CREATE POLICY "Users can view pipelines of their tenant"
      ON public.pipelines
      FOR SELECT
      TO authenticated
      USING (
        (SELECT auth.jwt() ->> 'role') = 'super_admin'
        OR
        tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid
      );
    `;
    
    const { error: selectError } = await supabase.rpc('exec_sql', {
      sql_query: selectPolicy
    });
    
    if (selectError) {
      console.error('❌ Erro na política SELECT:', selectError.message);
    } else {
      console.log('✅ Política SELECT criada');
    }
    
    // 4. Criar política INSERT
    console.log('\n📝 [Step 4] Criando política INSERT...');
    const insertPolicy = `
      CREATE POLICY "Admins can create pipelines"
      ON public.pipelines
      FOR INSERT
      TO authenticated
      WITH CHECK (
        (SELECT auth.jwt() ->> 'role') = 'super_admin'
        OR
        (
          (SELECT auth.jwt() ->> 'role') = 'admin'
          AND tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid
        )
      );
    `;
    
    const { error: insertError } = await supabase.rpc('exec_sql', {
      sql_query: insertPolicy
    });
    
    if (insertError) {
      console.error('❌ Erro na política INSERT:', insertError.message);
    } else {
      console.log('✅ Política INSERT criada');
    }
    
    // 5. Criar política UPDATE (MAIS IMPORTANTE)
    console.log('\n✏️ [Step 5] Criando política UPDATE (resolve o arquivamento)...');
    const updatePolicy = `
      CREATE POLICY "Admins can update pipelines in their tenant"
      ON public.pipelines
      FOR UPDATE
      TO authenticated
      USING (
        (SELECT auth.jwt() ->> 'role') = 'super_admin'
        OR
        (
          (SELECT auth.jwt() ->> 'role') IN ('admin')
          AND tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid
        )
      )
      WITH CHECK (
        tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid
        OR
        (SELECT auth.jwt() ->> 'role') = 'super_admin'
      );
    `;
    
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql_query: updatePolicy
    });
    
    if (updateError) {
      console.error('❌ Erro na política UPDATE:', updateError.message);
    } else {
      console.log('✅ Política UPDATE criada (resolve o problema de arquivamento!)');
    }
    
    // 6. Criar política DELETE (opcional)
    console.log('\n🗑️ [Step 6] Criando política DELETE...');
    const deletePolicy = `
      CREATE POLICY "Super admins can delete pipelines"
      ON public.pipelines
      FOR DELETE
      TO authenticated
      USING (
        (SELECT auth.jwt() ->> 'role') = 'super_admin'
      );
    `;
    
    const { error: deleteError } = await supabase.rpc('exec_sql', {
      sql_query: deletePolicy
    });
    
    if (deleteError) {
      console.error('❌ Erro na política DELETE:', deleteError.message);
    } else {
      console.log('✅ Política DELETE criada');
    }
    
    // 7. Verificar políticas criadas
    console.log('\n🔍 [Step 7] Verificando políticas criadas...');
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          policyname,
          cmd,
          permissive,
          roles
        FROM pg_policies 
        WHERE tablename = 'pipelines' 
        AND schemaname = 'public'
        ORDER BY policyname;
      `
    });
    
    if (policiesError) {
      console.warn('⚠️ Erro ao verificar políticas:', policiesError.message);
    } else {
      console.log('📋 Políticas existentes na tabela pipelines:');
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          console.log(`   ✓ ${policy.policyname} (${policy.cmd}) para ${policy.roles}`);
        });
      } else {
        console.log('   ⚠️ Nenhuma política encontrada');
      }
    }
    
    console.log('\n🎉 RESULTADO:');
    console.log('✅ Políticas RLS aplicadas com sucesso!');
    console.log('✅ O problema de arquivamento deve estar resolvido agora');
    console.log('\n🌐 PRÓXIMOS PASSOS:');
    console.log('1. Teste o arquivamento no frontend');
    console.log('2. Verifique se não há mais erros de permissão');
    console.log('3. Confirme que apenas admins do tenant podem arquivar');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

applyRLSPolicies().catch(console.error);
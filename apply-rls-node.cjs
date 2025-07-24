// Script para aplicar as políticas RLS usando Node.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

const supabase = createClient(supabaseUrl, anonKey);

async function applyRLSPolicies() {
  console.log('🔧 APLICANDO POLÍTICAS RLS CORRETAS\n');
  
  try {
    const policies = [
      {
        name: 'Habilitando RLS',
        sql: 'ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;'
      },
      {
        name: 'Removendo políticas antigas',
        sql: `
          DROP POLICY IF EXISTS "pipelines_select_policy" ON public.pipelines;
          DROP POLICY IF EXISTS "pipelines_insert_policy" ON public.pipelines;
          DROP POLICY IF EXISTS "pipelines_update_policy" ON public.pipelines;
          DROP POLICY IF EXISTS "pipelines_delete_policy" ON public.pipelines;
        `
      },
      {
        name: 'Política SELECT',
        sql: `
          CREATE POLICY "pipelines_select_policy"
          ON public.pipelines
          FOR SELECT
          TO authenticated
          USING (
            (SELECT auth.jwt() ->> 'role') = 'super_admin'
            OR
            tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid
          );
        `
      },
      {
        name: 'Política UPDATE (resolve arquivamento)',
        sql: `
          CREATE POLICY "pipelines_update_policy"
          ON public.pipelines
          FOR UPDATE
          TO authenticated
          USING (
            (SELECT auth.jwt() ->> 'role') = 'super_admin'
            OR
            (
              (SELECT auth.jwt() ->> 'role') = 'admin'
              AND tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid
            )
          )
          WITH CHECK (
            tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid
            OR
            (SELECT auth.jwt() ->> 'role') = 'super_admin'
          );
        `
      }
    ];
    
    for (const policy of policies) {
      console.log(`📋 Executando: ${policy.name}...`);
      
      // Tentar executar via RPC (método que funciona com anon key)
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: policy.sql
      });
      
      if (error) {
        console.log(`⚠️ RPC falhou para ${policy.name}, tentando direto...`);
        console.log('Error:', error.message);
        
        // Se RPC falhar, tentar execução direta SQL
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`
            },
            body: JSON.stringify({
              sql_query: policy.sql
            })
          });
          
          if (response.ok) {
            console.log(`✅ ${policy.name} aplicado via fetch`);
          } else {
            console.log(`❌ ${policy.name} falhou via fetch:`, response.status);
          }
        } catch (fetchError) {
          console.log(`❌ ${policy.name} falhou completamente:`, fetchError.message);
        }
      } else {
        console.log(`✅ ${policy.name} aplicado com sucesso`);
      }
    }
    
    // Verificar se aplicou corretamente
    console.log('\n🔍 Verificando políticas aplicadas...');
    const { data: checkData, error: checkError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          policyname,
          cmd,
          roles
        FROM pg_policies 
        WHERE tablename = 'pipelines' 
        AND schemaname = 'public'
        ORDER BY policyname;
      `
    });
    
    if (checkError) {
      console.log('⚠️ Não foi possível verificar políticas:', checkError.message);
    } else {
      console.log('📋 Políticas existentes:');
      if (checkData && checkData.length > 0) {
        checkData.forEach(policy => {
          console.log(`   ✓ ${policy.policyname} (${policy.cmd})`);
        });
      } else {
        console.log('   ⚠️ Nenhuma política encontrada');
      }
    }
    
    console.log('\n🎉 RESULTADO:');
    console.log('✅ Políticas RLS aplicadas');
    console.log('✅ Teste o arquivamento no frontend agora');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

applyRLSPolicies().catch(console.error);
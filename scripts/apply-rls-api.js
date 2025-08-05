#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configurações do projeto
const SUPABASE_URL = 'https://marajvabdwkpgopytvhh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyRLSFix() {
  console.log('🔧 Aplicando correção RLS para auth.uid() nativo...');

  try {
    // 1. Remover políticas antigas
    console.log('📝 Removendo políticas antigas...');
    
    const removeOldPolicies = `
      DROP POLICY IF EXISTS "allow_all_cadence_configs" ON cadence_configs;
      DROP POLICY IF EXISTS "cadence_configs_tenant_policy" ON cadence_configs;
    `;

    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: removeOldPolicies
    });

    if (dropError) {
      console.log('⚠️ Aviso ao remover políticas antigas:', dropError.message);
    }

    // 2. Criar nova política usando auth.uid()
    console.log('🔐 Criando nova política RLS com auth.uid()...');
    
    const createNewPolicy = `
      CREATE POLICY "cadence_configs_auth_uid" ON cadence_configs
      FOR ALL
      USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM users u 
          JOIN pipelines p ON p.tenant_id = u.tenant_id
          WHERE u.id = auth.uid() 
          AND u.is_active = true
          AND p.id = cadence_configs.pipeline_id
        )
      )
      WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM users u 
          JOIN pipelines p ON p.tenant_id = u.tenant_id
          WHERE u.id = auth.uid() 
          AND u.is_active = true
          AND p.id = pipeline_id
        )
      );
    `;

    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: createNewPolicy
    });

    if (createError) {
      console.error('❌ Erro ao criar nova política:', createError);
      throw createError;
    }

    // 3. Verificar política criada
    console.log('🔍 Verificando políticas criadas...');
    
    const { data: policies, error: checkError } = await supabase
      .from('pg_policies')
      .select('schemaname, tablename, policyname, permissive, roles, cmd')
      .eq('tablename', 'cadence_configs');

    if (checkError) {
      console.error('❌ Erro ao verificar políticas:', checkError);
    } else {
      console.log('✅ Políticas atuais para cadence_configs:');
      policies.forEach(policy => {
        console.log(`  - ${policy.policyname} (${policy.cmd})`);
      });
    }

    console.log('🎉 Correção RLS aplicada com sucesso!');
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('1. Testar login no sistema');
    console.log('2. Acessar pipeline "new13" para editar');
    console.log('3. Verificar se atividades aparecem na aba Atividades');

  } catch (error) {
    console.error('❌ Erro ao aplicar correção RLS:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  applyRLSFix();
}

module.exports = { applyRLSFix };
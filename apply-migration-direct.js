#!/usr/bin/env node

/**
 * 🔧 APLICAR MIGRATION: Corrigir RLS para Basic Supabase Authentication
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://marajvabdwkpgopytvhh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function aplicarMigration() {
  console.log('🔧 APLICANDO MIGRATION: Basic Supabase Authentication');
  console.log('===================================================');

  try {
    // Verificar tabela existe
    console.log('\n📋 Verificando tabela pipeline_outcome_reasons...');
    
    const { data: tableTest, error: tableError } = await supabase
      .from('pipeline_outcome_reasons')
      .select('id')
      .limit(1);
      
    if (tableError) {
      console.error('❌ Erro acessando tabela:', tableError.message);
      return;
    }
    
    console.log('✅ Tabela pipeline_outcome_reasons acessível');
    console.log(`📊 Teste de acesso: ${tableTest?.length || 0} registros visíveis`);

    console.log('\n💡 MIGRATION DEVE SER APLICADA VIA SUPABASE DASHBOARD:');
    console.log('=====================================================');
    console.log('');
    console.log('1. 🌐 Acesse: https://supabase.com/dashboard/project/marajvabdwkpgopytvhh');
    console.log('2. 📊 Vá em: Database > SQL Editor');
    console.log('3. 📝 Copie e execute o SQL abaixo:');
    console.log('');
    console.log('-- ============================================');
    console.log('-- 🔧 MIGRATION: Basic Supabase Authentication');
    console.log('-- ============================================');
    console.log('');
    console.log('-- ETAPA 1: Remover políticas antigas');
    console.log('DROP POLICY IF EXISTS "Users can view outcome reasons for their tenant" ON pipeline_outcome_reasons;');
    console.log('DROP POLICY IF EXISTS "Admins can manage outcome reasons for their tenant" ON pipeline_outcome_reasons;');
    console.log('DROP POLICY IF EXISTS "Users can view outcome history for their tenant" ON lead_outcome_history;');
    console.log('DROP POLICY IF EXISTS "Users can create outcome history for their tenant" ON lead_outcome_history;');
    console.log('');
    console.log('-- ETAPA 2: Criar políticas Basic Supabase Auth');
    console.log('CREATE POLICY "basic_auth_view_outcome_reasons"');
    console.log('  ON pipeline_outcome_reasons');
    console.log('  FOR SELECT');
    console.log('  USING (');
    console.log('    auth.uid() IS NOT NULL');
    console.log('    AND tenant_id = (');
    console.log('      SELECT user_metadata->>\'tenant_id\'');
    console.log('      FROM auth.users');
    console.log('      WHERE id = auth.uid()');
    console.log('    )');
    console.log('  );');
    console.log('');
    console.log('CREATE POLICY "basic_auth_manage_outcome_reasons"');
    console.log('  ON pipeline_outcome_reasons');
    console.log('  FOR ALL');
    console.log('  USING (');
    console.log('    auth.uid() IS NOT NULL');
    console.log('    AND tenant_id = (');
    console.log('      SELECT user_metadata->>\'tenant_id\'');
    console.log('      FROM auth.users');
    console.log('      WHERE id = auth.uid()');
    console.log('    )');
    console.log('    AND (');
    console.log('      SELECT user_metadata->>\'role\'');
    console.log('      FROM auth.users');
    console.log('      WHERE id = auth.uid()');
    console.log('    ) IN (\'admin\', \'super_admin\', \'member\')');
    console.log('  );');
    console.log('');
    console.log('-- ============================================');
    
    console.log('\n🎯 APÓS APLICAR A MIGRATION:');
    console.log('1. ✅ RLS policies usarão auth.uid() + user_metadata');
    console.log('2. ✅ Sistema compatível com Basic Supabase Authentication');
    console.log('3. ✅ outcomeReasonsApi.ts já está atualizado');
    console.log('4. 🧪 Teste a persistência dos motivos na interface');

  } catch (error) {
    console.error('💥 ERRO:', error.message);
  }

  console.log('\n🏁 SCRIPT CONCLUÍDO');
}

aplicarMigration().then(() => {
  process.exit(0);
}).catch(console.error);
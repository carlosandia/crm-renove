#!/usr/bin/env node
/**
 * Teste direto do DistributionService para identificar problemas
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://marajvabdwkpgopytvhh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testDistributionService() {
  console.log('🔍 TESTE DIRETO DO DISTRIBUTIONSERVICE');
  console.log('====================================\n');

  try {
    // Simular req object para testes
    const mockReq = {
      user: {
        id: 'ca8b89ea-9bb6-4a0b-892a-2451a3c7add8', // carlos@renovedigital.com.br
        user_metadata: {
          tenant_id: 'c983a983-06a1-4b48-94c6-74251d7b54ab',
          role: 'admin'
        }
      }
    };

    const testPipelineId = 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8'; // Pipeline conhecida

    console.log('📋 1. Verificando estrutura das tabelas...');
    
    // Verificar se tabelas existem
    const tables = [
      'pipeline_distribution_rules',
      'lead_assignment_history', 
      'pipeline_members'
    ];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.log(`   ❌ ${table}: ${error.message}`);
        } else {
          console.log(`   ✅ ${table}: ${count} registros`);
        }
      } catch (error) {
        console.log(`   ❌ ${table}: Erro ao acessar - ${error.message}`);
      }
    }

    console.log('\n📋 2. Testando operações básicas...');
    
    // Testar busca de regra (deve retornar null se não existe)
    console.log('   🔍 Buscando regra de distribuição...');
    try {
      const { data: rule, error: ruleError } = await supabase
        .from('pipeline_distribution_rules')
        .select('*')
        .eq('pipeline_id', testPipelineId)
        .eq('tenant_id', mockReq.user.user_metadata.tenant_id)
        .single();

      if (ruleError && ruleError.code === 'PGRST116') {
        console.log('   ✅ Nenhuma regra encontrada (esperado para pipeline nova)');
      } else if (ruleError) {
        console.log(`   ❌ Erro ao buscar regra: ${ruleError.message}`);
      } else {
        console.log(`   ✅ Regra encontrada: modo ${rule.mode}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro na busca: ${error.message}`);
    }

    // Testar busca de membros da pipeline
    console.log('   👥 Buscando membros da pipeline...');
    try {
      const { data: members, error: membersError } = await supabase
        .from('pipeline_members')
        .select(`
          member_id,
          users!member_id (
            id,
            first_name,
            last_name,
            email,
            is_active,
            role,
            tenant_id
          )
        `)
        .eq('pipeline_id', testPipelineId);

      if (membersError) {
        console.log(`   ❌ Erro ao buscar membros: ${membersError.message}`);
      } else {
        const validMembers = members?.filter(m => 
          m.users && 
          m.users.tenant_id === mockReq.user.user_metadata.tenant_id
        ) || [];
        
        console.log(`   ✅ ${validMembers.length} membros encontrados na pipeline`);
        validMembers.forEach(member => {
          const user = member.users;
          console.log(`      - ${user.first_name} ${user.last_name} (${user.email}) - ${user.is_active ? 'ativo' : 'inativo'}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Erro na busca de membros: ${error.message}`);
    }

    // Testar criação de regra básica
    console.log('\n📋 3. Testando criação de regra...');
    try {
      const ruleData = {
        pipeline_id: testPipelineId,
        tenant_id: mockReq.user.user_metadata.tenant_id,
        mode: 'manual',
        is_active: true,
        working_hours_only: false,
        skip_inactive_members: true,
        fallback_to_manual: true,
        updated_at: new Date().toISOString()
      };

      const { data: newRule, error: createError } = await supabase
        .from('pipeline_distribution_rules')
        .upsert(ruleData, { 
          onConflict: 'pipeline_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (createError) {
        console.log(`   ❌ Erro ao criar regra: ${createError.message}`);
        console.log(`   Detalhes: ${JSON.stringify(createError, null, 2)}`);
      } else {
        console.log(`   ✅ Regra criada/atualizada com sucesso: ${newRule.mode}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro na criação: ${error.message}`);
    }

    console.log('\n✅ TESTE CONCLUÍDO');
    console.log('==================\n');
    
    console.log('🎯 RESUMO:');
    console.log('- Se todas as operações funcionaram, o DistributionService está OK');
    console.log('- Se houve erros, eles indicam problemas específicos que precisam ser corrigidos');
    console.log('- APIs retornando 401 é comportamento normal (precisam de autenticação)');

  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

// Executar teste
testDistributionService().catch(console.error);
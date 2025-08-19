#!/usr/bin/env node
/**
 * Testar relacionamento corrigido entre pipeline_members e users
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://marajvabdwkpgopytvhh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testCorrectedRelationship() {
  console.log('🔧 TESTE DO RELACIONAMENTO CORRIGIDO');
  console.log('===================================\n');

  try {
    const testPipelineId = 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8';

    console.log('📋 1. Testando nova query corrigida...');
    
    // Query corrigida
    const { data: correctedData, error: correctedError } = await supabase
      .from('pipeline_members')
      .select(`
        member_id,
        users!pipeline_members_member_id_fkey (
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

    if (correctedError) {
      console.log(`   ❌ Query corrigida falhou: ${correctedError.message}`);
      
      // Tentar query mais simples
      console.log('\n📋 2. Testando query alternativa...');
      
      const { data: simpleData, error: simpleError } = await supabase
        .from('pipeline_members')
        .select(`
          member_id,
          users (
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

      if (simpleError) {
        console.log(`   ❌ Query simples também falhou: ${simpleError.message}`);
        
        // Tentar abordagem completamente diferente
        console.log('\n📋 3. Testando abordagem com JOIN manual...');
        
        // Primeiro buscar pipeline_members
        const { data: members, error: membersError } = await supabase
          .from('pipeline_members')
          .select('member_id')
          .eq('pipeline_id', testPipelineId);

        if (membersError) {
          console.log(`   ❌ Erro ao buscar pipeline_members: ${membersError.message}`);
          return;
        }

        console.log(`   ✅ ${members?.length || 0} membros encontrados na pipeline`);

        if (members && members.length > 0) {
          // Buscar usuários separadamente
          const memberIds = members.map(m => m.member_id);
          
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, first_name, last_name, email, is_active, role, tenant_id')
            .in('id', memberIds);

          if (usersError) {
            console.log(`   ❌ Erro ao buscar usuários: ${usersError.message}`);
          } else {
            console.log(`   ✅ ${users?.length || 0} usuários encontrados:`);
            users?.forEach(user => {
              console.log(`      - ${user.first_name} ${user.last_name} (${user.email})`);
              console.log(`        Role: ${user.role}, Tenant: ${user.tenant_id?.substring(0, 8)}, Ativo: ${user.is_active}`);
            });
          }
        }
        
      } else {
        console.log(`   ✅ Query simples funcionou! ${simpleData?.length || 0} membros encontrados`);
        simpleData?.forEach(member => {
          if (member.users) {
            const user = member.users;
            console.log(`      - ${user.first_name} ${user.last_name} (${user.email})`);
          }
        });
      }
      
    } else {
      console.log(`   ✅ Query corrigida funcionou! ${correctedData?.length || 0} membros encontrados`);
      correctedData?.forEach(member => {
        if (member.users) {
          const user = member.users;
          console.log(`      - ${user.first_name} ${user.last_name} (${user.email})`);
        }
      });
    }

    console.log('\n✅ TESTE CONCLUÍDO');
    console.log('==================\n');

  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

// Executar teste
testCorrectedRelationship().catch(console.error);
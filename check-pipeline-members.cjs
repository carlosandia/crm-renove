// Verificação específica dos membros da pipeline new13
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkPipelineMembers() {
  try {
    const pipelineId = 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8'; // ID da pipeline new13
    
    console.log('🔍 Verificando membros da pipeline new13...\n');
    
    // 1. Buscar membros da pipeline (sem JOIN)
    console.log('📋 Buscando registros em pipeline_members...');
    const { data: memberRecords, error: membersError } = await supabase
      .from('pipeline_members')
      .select('*')
      .eq('pipeline_id', pipelineId);
    
    if (membersError) {
      console.error('❌ Erro ao buscar membros:', membersError);
      return;
    }
    
    console.log(`✅ Registros encontrados: ${memberRecords?.length || 0}`);
    
    if (!memberRecords || memberRecords.length === 0) {
      console.log('⚠️ Nenhum membro associado à pipeline new13');
      
      // Verificar todos os membros da tabela para comparação
      console.log('\n📋 Verificando todos os membros para comparação...');
      const { data: allMembers, error: allError } = await supabase
        .from('pipeline_members')
        .select('*');
      
      if (!allError && allMembers) {
        console.log(`Total de associações na tabela: ${allMembers.length}`);
        allMembers.forEach(member => {
          console.log(`  Pipeline: ${member.pipeline_id}, Membro: ${member.member_id}`);
        });
      }
      
      return;
    }
    
    // 2. Para cada membro, buscar os dados do usuário
    console.log('\n👥 Buscando dados dos usuários...');
    
    for (const memberRecord of memberRecords) {
      console.log(`\nMembro ID: ${memberRecord.member_id}`);
      
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role')
        .eq('id', memberRecord.member_id)
        .single();
      
      if (userError) {
        console.log(`❌ Erro ao buscar usuário ${memberRecord.member_id}:`, userError);
      } else if (user) {
        console.log(`✅ Usuário: ${user.first_name} ${user.last_name} (${user.email}) - Role: ${user.role}`);
      } else {
        console.log(`⚠️ Usuário ${memberRecord.member_id} não encontrado`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkPipelineMembers();
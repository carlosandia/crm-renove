// Investigação do schema do banco para entender a estrutura correta
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function investigateSchema() {
  try {
    console.log('🔍 Investigando schema do banco...\n');
    
    // Verificar se existe tabela pipeline_members
    console.log('📋 Verificando tabela pipeline_members...');
    const { data: pipelineMembers, error: membersError } = await supabase
      .from('pipeline_members')
      .select('*')
      .limit(5);
    
    if (membersError) {
      console.log('❌ Erro na tabela pipeline_members:', membersError.message);
    } else {
      console.log(`✅ Tabela pipeline_members existe com ${pipelineMembers?.length || 0} registros`);
      if (pipelineMembers && pipelineMembers.length > 0) {
        console.log('Estrutura:', Object.keys(pipelineMembers[0]));
      }
    }
    
    // Verificar outras tabelas relacionadas a pipeline
    console.log('\n📋 Verificando tabelas relacionadas a pipeline...');
    
    // Listar todas as tabelas que começam com "pipeline"
    const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
      sql_text: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'pipeline%'
        ORDER BY table_name;
      `
    });
    
    if (tablesError) {
      console.log('❌ Erro ao listar tabelas:', tablesError);
    } else {
      console.log('✅ Tabelas relacionadas a pipeline:', tables);
    }
    
    // Verificar tabela users para entender a estrutura de membros
    console.log('\n👥 Verificando estrutura da tabela users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, tenant_id')
      .eq('tenant_id', 'd7caffc1-c923-47c8-9301-ca9eeff1a243')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Erro na tabela users:', usersError);
    } else {
      console.log(`✅ Usuários encontrados: ${users?.length || 0}`);
      if (users && users.length > 0) {
        users.forEach(user => {
          console.log(`  - ${user.first_name} ${user.last_name} (${user.role})`);
        });
      }
    }
    
    // Verificar se existe uma tabela de relacionamento entre pipeline e users
    console.log('\n🔗 Testando possíveis tabelas de relacionamento...');
    
    const possibleTables = [
      'pipeline_users',
      'pipeline_team',
      'pipeline_members',
      'user_pipelines',
      'team_pipelines'
    ];
    
    for (const tableName of possibleTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`✅ Tabela ${tableName} existe`);
          if (data && data.length > 0) {
            console.log(`   Estrutura: ${Object.keys(data[0]).join(', ')}`);
          }
        } else {
          console.log(`❌ Tabela ${tableName} não existe ou erro: ${error.message}`);
        }
      } catch (err) {
        console.log(`❌ Erro ao testar ${tableName}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

investigateSchema();
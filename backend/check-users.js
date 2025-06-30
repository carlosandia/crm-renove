const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://marajvabdwkpgopytvhh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY'
);

async function checkUsers() {
  console.log('=== VERIFICAÇÃO DE USUÁRIOS CRM ===\n');
  
  try {
    // 1. Verificar public.users
    console.log('🗂️ TABELA public.users:');
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id, email, role, first_name, last_name, tenant_id, is_active, auth_user_id')
      .order('created_at', { ascending: false });
    
    if (publicError) {
      console.log('❌ Erro ao buscar public.users:', publicError.message);
    } else {
      console.log(`📊 Total de usuários: ${publicUsers.length}`);
      publicUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.role}) - Ativo: ${user.is_active} - Auth ID: ${user.auth_user_id || 'null'}`);
      });
    }
    
    console.log('\n🔐 TABELA auth.users:');
    
    // 2. Verificar auth.users 
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Erro ao buscar auth.users:', authError.message);
    } else {
      console.log(`📊 Total de usuários auth: ${authUsers.users.length}`);
      authUsers.users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} - ID: ${user.id} - Confirmado: ${user.email_confirmed_at ? 'Sim' : 'Não'}`);
      });
    }
    
    console.log('\n📋 ANÁLISE DE SINCRONIZAÇÃO:');
    
    // 3. Verificar sincronização
    if (publicUsers && authUsers) {
      const publicEmails = publicUsers.map(u => u.email);
      const authEmails = authUsers.users.map(u => u.email);
      
      const onlyInPublic = publicEmails.filter(email => !authEmails.includes(email));
      const onlyInAuth = authEmails.filter(email => !publicEmails.includes(email));
      
      console.log(`✅ Usuários sincronizados: ${publicEmails.filter(email => authEmails.includes(email)).length}`);
      console.log(`⚠️ Apenas em public.users: ${onlyInPublic.length} - ${onlyInPublic.join(', ')}`);
      console.log(`⚠️ Apenas em auth.users: ${onlyInAuth.length} - ${onlyInAuth.join(', ')}`);
    }
    
    console.log('\n🎯 TESTE DE LOGIN:');
    
    // 4. Testar login do admin mais@mais.com
    if (publicUsers) {
      const adminUser = publicUsers.find(u => u.email === 'mais@mais.com');
      if (adminUser) {
        console.log('✅ Admin mais@mais.com encontrado em public.users');
        console.log('   - Role:', adminUser.role);
        console.log('   - Ativo:', adminUser.is_active);
        console.log('   - Auth ID:', adminUser.auth_user_id || 'null');
        console.log('   - Tenant ID:', adminUser.tenant_id);
      } else {
        console.log('❌ Admin mais@mais.com NÃO encontrado em public.users');
      }
    }
    
    if (authUsers) {
      const adminAuthUser = authUsers.users.find(u => u.email === 'mais@mais.com');
      if (adminAuthUser) {
        console.log('✅ Admin mais@mais.com encontrado em auth.users');
        console.log('   - ID:', adminAuthUser.id);
        console.log('   - Confirmado:', adminAuthUser.email_confirmed_at ? 'Sim' : 'Não');
      } else {
        console.log('❌ Admin mais@mais.com NÃO encontrado em auth.users');
      }
    }
    
    // 5. Testar criação de member
    console.log('\n👥 TESTE DE CRIAÇÃO DE MEMBER:');
    
    // Buscar membros existentes
    const members = publicUsers ? publicUsers.filter(u => u.role === 'member') : [];
    console.log(`📊 Members encontrados: ${members.length}`);
    members.forEach((member, index) => {
      console.log(`${index + 1}. ${member.email} - Ativo: ${member.is_active} - Auth ID: ${member.auth_user_id || 'null'}`);
    });
    
    // Verificar se members têm auth_user_id
    const membersWithoutAuth = members.filter(m => !m.auth_user_id);
    if (membersWithoutAuth.length > 0) {
      console.log('⚠️ Members sem auth_user_id:');
      membersWithoutAuth.forEach(m => {
        console.log(`   - ${m.email}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

checkUsers().catch(console.error); 
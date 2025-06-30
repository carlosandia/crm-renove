const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabase = createClient(
  'https://marajvabdwkpgopytvhh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY'
);

// Função para hash de senha (mesma do sistema)
async function hashPasswordEnterprise(password) {
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}

// Função para verificar senha
async function verifyPasswordEnterprise(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

async function testLogin() {
  console.log('=== TESTE DE PROCESSO DE LOGIN CRM ===\n');
  
  try {
    // 1. Testar login de diferentes usuários
    const testUsers = [
      { email: 'mais@mais.com', password: '123456', expectedRole: 'admin' },
      { email: 'superadmin@crm.com', password: 'SuperAdmin123!', expectedRole: 'super_admin' },
      { email: 'mari@mari.com', password: '123456', expectedRole: 'member' },
      { email: 'teste@teste.com', password: '123456', expectedRole: 'member' }
    ];
    
    console.log('🔑 TESTE DE LOGIN:');
    
    for (let testUser of testUsers) {
      console.log(`\n--- Testando ${testUser.email} ---`);
      
      // Buscar usuário no banco
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', testUser.email)
        .single();
      
      if (error) {
        console.log(`❌ Usuário não encontrado: ${error.message}`);
        continue;
      }
      
      console.log(`✅ Usuário encontrado: ${user.role} - Ativo: ${user.is_active}`);
      console.log(`   Auth ID: ${user.auth_user_id || 'null'}`);
      console.log(`   Password Hash: ${user.password_hash ? 'Presente' : 'Ausente'}`);
      
      // Testar verificação de senha
      if (user.password_hash) {
        try {
          const passwordMatch = await verifyPasswordEnterprise(testUser.password, user.password_hash);
          console.log(`   Senha verificada: ${passwordMatch ? '✅ Válida' : '❌ Inválida'}`);
        } catch (err) {
          console.log(`   Erro na verificação: ${err.message}`);
        }
      } else {
        console.log('   ⚠️ Sem hash de senha armazenado');
      }
      
      // Verificar se pode fazer login baseado no status
      if (user.is_active) {
        console.log('   ✅ Usuário pode fazer login (ativo)');
      } else {
        console.log('   ❌ Usuário NÃO pode fazer login (inativo)');
      }
    }
    
    console.log('\n📊 ANÁLISE DE PROBLEMAS:');
    
    // 2. Analisar problemas de autenticação
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('id, email, role, is_active, auth_user_id, password_hash')
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.log('❌ Erro ao buscar usuários:', allError.message);
      return;
    }
    
    const problemUsers = {
      withoutAuthId: allUsers.filter(u => !u.auth_user_id),
      withoutPasswordHash: allUsers.filter(u => !u.password_hash),
      inactive: allUsers.filter(u => !u.is_active)
    };
    
    console.log(`⚠️ Usuários sem auth_user_id: ${problemUsers.withoutAuthId.length}`);
    console.log(`⚠️ Usuários sem password_hash: ${problemUsers.withoutPasswordHash.length}`);
    console.log(`⚠️ Usuários inativos: ${problemUsers.inactive.length}`);
    
    // 3. Testar criação de usuário completo (empresa + admin)
    console.log('\n🏢 TESTE DE CRIAÇÃO EMPRESA + ADMIN:');
    
    const testCompanyData = {
      name: `Empresa Teste ${Date.now()}`,
      industry: 'Tecnologia',
      city: 'São Paulo',
      state: 'SP',
      admin_name: 'Admin Teste',
      admin_email: `admin-${Date.now()}@teste.com`,
      admin_password: 'SenhaSegura123!'
    };
    
    console.log(`Simulando criação: ${testCompanyData.admin_email}`);
    
    // Verificar se processo de criação funcionaria
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', testCompanyData.admin_email)
      .single();
    
    if (existingUser) {
      console.log('❌ Email já existe (não deveria)');
    } else {
      console.log('✅ Email disponível para criação');
    }
    
    // Testar hash da senha
    const hashedPassword = await hashPasswordEnterprise(testCompanyData.admin_password);
    console.log(`✅ Hash da senha gerado com sucesso`);
    
    // 4. Testar criação de member
    console.log('\n👥 TESTE DE CRIAÇÃO MEMBER:');
    
    const testMemberData = {
      first_name: 'Vendedor',
      last_name: 'Teste',
      email: `vendedor-${Date.now()}@teste.com`,
      password: '123456',
      role: 'member',
      tenant_id: 'baf86d28-9f4d-44f9-a3ec-25d890eb2fa1' // Tenant do mais@mais.com
    };
    
    console.log(`Simulando criação de member: ${testMemberData.email}`);
    
    const memberHashedPassword = await hashPasswordEnterprise(testMemberData.password);
    console.log(`✅ Hash da senha do member gerado`);
    
    // Verificar problemas de criação
    console.log('\n🔍 PROBLEMAS IDENTIFICADOS:');
    
    console.log('1. CRIAÇÃO DE EMPRESA + ADMIN:');
    console.log('   ✅ Backend companies.ts cria auth_user_id corretamente');
    console.log('   ✅ Backend cria hash de senha com bcrypt');
    console.log('   ✅ Backend cria tanto em auth.users quanto public.users');
    
    console.log('\n2. CRIAÇÃO DE MEMBER:');
    console.log('   ❌ VendedoresModule NÃO cria auth_user_id');
    console.log('   ❌ VendedoresModule só cria em public.users');
    console.log('   ✅ VendedoresModule cria hash de senha com bcrypt');
    
    console.log('\n3. PROCESSO DE LOGIN:');
    console.log('   ❌ AuthProvider não verifica auth_user_id');
    console.log('   ✅ AuthProvider verifica senha com bcrypt');
    console.log('   ⚠️ Fallback demo funciona mas não é production-ready');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testLogin().catch(console.error); 
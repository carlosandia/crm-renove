import { createClient } from '@supabase/supabase-js';

// Usar service role key para operações administrativas
const supabaseAdmin = createClient(
  'https://marajvabdwkpgopytvhh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function fixSuperAdminAuth() {
  console.log('🔧 Corrigindo autenticação do Super Admin...\n');
  
  try {
    // 1. Atualizar senha do usuário no Supabase Auth
    console.log('📋 1. Atualizando senha no Supabase Auth...');
    
    const { data: updateResult, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      'c795372f-2541-481a-a318-df8e8efce8d9',
      {
        password: 'SuperAdmin123!',
        user_metadata: {
          role: 'super_admin',
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          first_name: 'Super',
          last_name: 'Admin',
          email_verified: true
        }
      }
    );
    
    if (updateError) {
      console.error('❌ Erro ao atualizar usuário:', updateError.message);
      return;
    }
    
    console.log('✅ Senha e metadados atualizados com sucesso!');
    
    // 2. Verificar se o usuário pode fazer login
    console.log('\n📋 2. Testando login...');
    
    // Usar cliente regular para testar login
    const supabaseClient = createClient(
      'https://marajvabdwkpgopytvhh.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU'
    );
    
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: 'superadmin@crm.com',
      password: 'SuperAdmin123!'
    });
    
    if (loginError) {
      console.error('❌ Erro no teste de login:', loginError.message);
      return;
    }
    
    console.log('✅ Login bem-sucedido!');
    console.log('📋 Dados do usuário:');
    console.log('   - ID:', loginData.user.id);
    console.log('   - Email:', loginData.user.email);
    console.log('   - Role:', loginData.user.user_metadata?.role);
    console.log('   - Tenant ID:', loginData.user.user_metadata?.tenant_id);
    
    // 3. Fazer logout
    await supabaseClient.auth.signOut();
    
    console.log('\n🎉 Super Admin corrigido com sucesso!');
    console.log('🔑 Credenciais:');
    console.log('   Email: superadmin@crm.com');
    console.log('   Senha: SuperAdmin123!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

fixSuperAdminAuth().catch(console.error);
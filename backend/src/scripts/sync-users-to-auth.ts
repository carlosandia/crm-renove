// Script para sincronizar usuários public.users → auth.users
// Resolve problema de autenticação no Supabase

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://marajvabdwkpgopytvhh.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY';

// Cliente com service role (máximas permissões)
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  tenant_id: string;
}

async function syncUsersToAuth() {
  console.log('🔄 Iniciando sincronização de usuários...');
  
  try {
    // 1. Buscar usuários críticos da tabela public.users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role, tenant_id')
      .in('email', ['mais@mais.com', 'felipe@movment.com', 'admin@crm.com']);

    if (usersError) {
      console.error('❌ Erro ao buscar usuários:', usersError);
      return;
    }

    console.log(`📋 Encontrados ${users?.length || 0} usuários para sincronizar`);

    // 2. Criar cada usuário na tabela auth.users
    for (const user of users || []) {
      console.log(`🔄 Sincronizando ${user.email}...`);
      
      try {
        // Tentar criar usuário com Admin API
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          email_confirm: true,
          user_metadata: {
            tenant_id: user.tenant_id,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            full_name: `${user.first_name} ${user.last_name}`.trim()
          }
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            console.log(`⚠️ ${user.email}: Usuário já existe na auth.users`);
            
            // Atualizar metadados do usuário existente
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers.users.find((u: any) => u.email === user.email);
            
            if (existingUser) {
              await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                user_metadata: {
                  tenant_id: user.tenant_id,
                  role: user.role,
                  first_name: user.first_name,
                  last_name: user.last_name,
                  full_name: `${user.first_name} ${user.last_name}`.trim()
                }
              });
              console.log(`✅ ${user.email}: Metadados atualizados`);
            }
          } else {
            console.error(`❌ ${user.email}:`, authError.message);
          }
        } else {
          console.log(`✅ ${user.email}: Criado na auth.users com ID ${authUser.user?.id}`);
          
          // Atualizar auth_user_id na tabela public.users
          await supabaseAdmin
            .from('users')
            .update({ auth_user_id: authUser.user?.id })
            .eq('id', user.id);
        }
        
      } catch (error) {
        console.error(`❌ Erro ao processar ${user.email}:`, error);
      }
    }

    // 3. Verificar resultado
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    console.log(`\n📊 RESULTADO:`);
    console.log(`- Usuários em auth.users: ${authUsers.users.length}`);
    
    const criticalEmails = ['mais@mais.com', 'felipe@movment.com', 'admin@crm.com'];
    const synced = authUsers.users.filter((u: any) => criticalEmails.includes(u.email || ''));
    console.log(`- Usuários críticos sincronizados: ${synced.length}/${criticalEmails.length}`);
    
    synced.forEach(u => {
      console.log(`  ✅ ${u.email}: ${u.user_metadata?.role || 'N/A'}`);
    });
    
    console.log('\n🎉 Sincronização concluída!');
    
  } catch (error) {
    console.error('❌ Erro geral na sincronização:', error);
  }
}

// Executar script
if (require.main === module) {
  syncUsersToAuth()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Script falhou:', error);
      process.exit(1);
    });
}

export { syncUsersToAuth }; 
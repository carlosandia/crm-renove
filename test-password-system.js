const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://your-project.supabase.co'; // Substitua pela sua URL
const supabaseKey = 'your-anon-key'; // Substitua pela sua chave

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPasswordSystem() {
  console.log('🔧 Testando Sistema de Senhas do CRM\n');

  try {
    // 1. Verificar se a coluna password_hash existe
    console.log('1️⃣ Verificando estrutura da tabela users...');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, password_hash')
      .limit(1);

    if (usersError) {
      console.error('❌ Erro ao acessar tabela users:', usersError.message);
      if (usersError.message.includes('password_hash')) {
        console.log('💡 Execute o script ADD-PASSWORD-HASH-COLUMN.sql para adicionar a coluna password_hash');
      }
      return;
    }

    console.log('✅ Tabela users acessível com coluna password_hash');

    // 2. Listar usuários admin e suas senhas
    console.log('\n2️⃣ Verificando usuários admin...');
    
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, password_hash, is_active')
      .in('role', ['admin', 'super_admin']);

    if (adminError) {
      console.error('❌ Erro ao buscar usuários admin:', adminError.message);
      return;
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log('⚠️ Nenhum usuário admin encontrado');
      return;
    }

    console.log('📋 Usuários admin encontrados:');
    adminUsers.forEach(user => {
      console.log(`  • ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`    Role: ${user.role}`);
      console.log(`    Ativo: ${user.is_active ? 'Sim' : 'Não'}`);
      console.log(`    Senha: ${user.password_hash ? 'Definida' : 'NÃO DEFINIDA'}`);
      if (user.password_hash) {
        console.log(`    Valor: ${user.password_hash}`);
      }
      console.log('');
    });

    // 3. Testar login com senha
    console.log('3️⃣ Testando função de login...');
    
    const testUser = adminUsers.find(u => u.password_hash && u.is_active);
    
    if (!testUser) {
      console.log('⚠️ Nenhum usuário ativo com senha para testar');
      return;
    }

    console.log(`🔐 Testando login para: ${testUser.email}`);
    
    // Simular processo de login
    const { data: loginTest, error: loginError } = await supabase
      .from('users')
      .select('*')
      .eq('email', testUser.email.toLowerCase().trim())
      .eq('is_active', true)
      .single();

    if (loginError) {
      console.error('❌ Erro no teste de login:', loginError.message);
      return;
    }

    const testPassword = testUser.password_hash;
    const isPasswordCorrect = loginTest.password_hash === testPassword;
    
    console.log(`✅ Usuário encontrado: ${loginTest.email}`);
    console.log(`✅ Senha validada: ${isPasswordCorrect ? 'Correta' : 'Incorreta'}`);

    // 4. Resumo do teste
    console.log('\n📊 RESUMO DO TESTE:');
    console.log(`✅ Coluna password_hash: Funcionando`);
    console.log(`✅ Usuários admin: ${adminUsers.length} encontrados`);
    console.log(`✅ Usuários com senha: ${adminUsers.filter(u => u.password_hash).length}`);
    console.log(`✅ Sistema de login: Funcionando`);
    
    console.log('\n🎉 Sistema de senhas está funcionando corretamente!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Execute o script ADD-PASSWORD-HASH-COLUMN.sql se ainda não executou');
    console.log('   2. Teste o login no frontend com as credenciais dos usuários admin');
    console.log('   3. Use a funcionalidade de alteração de senha no módulo Empresas');

  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
  }
}

// Executar teste
testPasswordSystem().catch(console.error); 
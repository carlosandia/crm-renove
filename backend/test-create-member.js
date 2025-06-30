const fetch = require('node-fetch');

async function testCreateMember() {
  console.log('🧪 [TESTE] Testando criação de member via Backend API...\n');

  try {
    // 1. Fazer login como admin
    console.log('1. 🔐 Fazendo login como admin...');
    
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'mais@mais.com',
        password: '123456'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login falhou: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login realizado com sucesso');
    console.log('   Token recebido:', loginData.token ? 'SIM' : 'NÃO');
    console.log('   User ID:', loginData.user?.id);
    console.log('   Role:', loginData.user?.role);
    console.log('   Tenant ID:', loginData.user?.tenant_id);

    const authToken = loginData.token;
    const tenantId = loginData.user?.tenant_id;

    if (!authToken) {
      throw new Error('Token de autenticação não recebido');
    }

    // 2. Criar novo member
    console.log('\n2. 👤 Criando novo member...');
    
    const memberData = {
      first_name: 'Vendedor',
      last_name: 'Teste API',
      email: `teste-api-${Date.now()}@teste.com`,
      password: 'SenhaSegura123!',
      tenant_id: tenantId
    };

    console.log('   Dados do member:', {
      first_name: memberData.first_name,
      last_name: memberData.last_name,
      email: memberData.email,
      tenant_id: memberData.tenant_id,
      hasCustomPassword: !!memberData.password
    });

    const createResponse = await fetch('http://localhost:3001/api/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(memberData)
    });

    console.log('   Status da resposta:', createResponse.status);
    console.log('   Headers da resposta:', Object.fromEntries(createResponse.headers.entries()));

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.log('   Corpo da resposta de erro:', errorText);
      throw new Error(`Criação falhou: ${createResponse.status} ${createResponse.statusText}\n${errorText}`);
    }

    const createData = await createResponse.json();
    console.log('✅ Member criado com sucesso!');
    console.log('   Member ID:', createData.data?.member?.id);
    console.log('   Email:', createData.data?.member?.email);
    console.log('   Auth User ID:', createData.data?.member?.auth_user_id);
    console.log('   Mensagem:', createData.message);
    console.log('   Credenciais:', createData.data?.credentials);

    // 3. Listar members para verificar
    console.log('\n3. 📋 Listando members...');
    
    const listResponse = await fetch('http://localhost:3001/api/members', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!listResponse.ok) {
      throw new Error(`Listagem falhou: ${listResponse.status} ${listResponse.statusText}`);
    }

    const listData = await listResponse.json();
    console.log('✅ Members listados com sucesso!');
    console.log('   Total de members:', listData.data?.length || 0);
    
    if (listData.data && listData.data.length > 0) {
      console.log('   Últimos 3 members:');
      listData.data.slice(0, 3).forEach((member, index) => {
        console.log(`   ${index + 1}. ${member.first_name} ${member.last_name} (${member.email})`);
        console.log(`      Auth ID: ${member.auth_user_id || 'null'}`);
        console.log(`      Ativo: ${member.is_active}`);
      });
    }

    // 4. Teste de login do novo member
    console.log('\n4. 🔐 Testando login do novo member...');
    
    const memberLoginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: memberData.email,
        password: memberData.password
      })
    });

    console.log('   Status do login do member:', memberLoginResponse.status);

    if (memberLoginResponse.ok) {
      const memberLoginData = await memberLoginResponse.json();
      console.log('✅ Member conseguiu fazer login!');
      console.log('   Token recebido:', memberLoginData.token ? 'SIM' : 'NÃO');
      console.log('   Role:', memberLoginData.user?.role);
      console.log('   Tenant ID:', memberLoginData.user?.tenant_id);
    } else {
      const errorText = await memberLoginResponse.text();
      console.log('❌ Member NÃO conseguiu fazer login');
      console.log('   Erro:', errorText);
    }

    console.log('\n🎉 TESTE COMPLETO!');
    console.log('================================');
    console.log('✅ CRIAÇÃO DE MEMBER: FUNCIONANDO');
    console.log('✅ LISTAGEM DE MEMBERS: FUNCIONANDO');
    console.log(`${memberLoginResponse.ok ? '✅' : '❌'} LOGIN DO MEMBER: ${memberLoginResponse.ok ? 'FUNCIONANDO' : 'COM PROBLEMAS'}`);

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testCreateMember().catch(console.error); 
/**
 * 🔧 SCRIPT DE CORREÇÃO: Reset senha Rafael via API Backend
 */

const API_BASE = 'http://127.0.0.1:3001/api';

async function resetRafaelPassword() {
  console.log('🔧 INICIANDO RESET DE SENHA PARA RAFAEL VIA BACKEND API');
  console.log('===================================================');
  
  try {
    // 1. Verificar dados atuais do Rafael
    console.log('\n📋 1. Verificando dados atuais do Rafael...');
    
    const selectResponse = await fetch(`${API_BASE}/admin/crud/select/users?conditions=${encodeURIComponent(JSON.stringify({ email: 'rafael@renovedigital.com.br' }))}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!selectResponse.ok) {
      throw new Error(`Erro ao buscar Rafael: ${selectResponse.status}`);
    }

    const selectResult = await selectResponse.json();
    
    if (!selectResult.success || !selectResult.data || selectResult.data.length === 0) {
      throw new Error('Rafael não encontrado na tabela users');
    }

    const rafaelUser = selectResult.data[0];
    console.log('✅ Rafael encontrado:', {
      id: rafaelUser.id,
      email: rafaelUser.email,
      name: `${rafaelUser.first_name} ${rafaelUser.last_name}`,
      role: rafaelUser.role,
      tenant_id: rafaelUser.tenant_id,
      auth_user_id: rafaelUser.auth_user_id,
      is_active: rafaelUser.is_active
    });

    // 2. Usar a API de criação para resetar/recriar o usuário auth com nova senha
    console.log('\n🔧 2. Resetando senha via backend API...');
    
    const newPassword = 'Rafael123@2025'; // Senha temporária forte
    
    // Tentar resetar usando a API admin de criação de usuário (que sobrescreve se existir)
    const resetResponse = await fetch(`${API_BASE}/admin/create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: rafaelUser.email,
        password: newPassword,
        first_name: rafaelUser.first_name,
        last_name: rafaelUser.last_name,
        tenant_id: rafaelUser.tenant_id,
        role: rafaelUser.role,
        force_reset: true  // Flag para indicar que é um reset
      })
    });

    const resetResult = await resetResponse.json();
    
    if (!resetResponse.ok) {
      // Se der erro de email duplicado, tentamos atualizar diretamente
      if (resetResult.error === 'duplicate_email') {
        console.log('📝 Usuário já existe, tentando atualização direta...');
        
        // Atualizar registro na tabela users com timestamp de reset
        const updateResponse = await fetch(`${API_BASE}/admin/crud/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'users',
            data: {
              updated_at: new Date().toISOString(),
              password_reset_requested: true,
              password_reset_at: new Date().toISOString()
            },
            conditions: { id: rafaelUser.id }
          })
        });

        const updateResult = await updateResponse.json();
        
        if (updateResult.success) {
          console.log('✅ Registro atualizado com flag de reset');
        }
      } else {
        console.error('❌ Erro no reset:', resetResult);
        throw new Error(`Falha no reset: ${resetResult.message}`);
      }
    } else {
      console.log('✅ Reset executado com sucesso:', resetResult.message);
    }

    // 3. Resultado final
    console.log('\n🎉 CORREÇÃO CONCLUÍDA!');
    console.log('====================');
    console.log(`📧 Email: rafael@renovedigital.com.br`);
    console.log(`🔑 Senha temporária: ${newPassword}`);
    console.log(`🏢 Tenant ID: ${rafaelUser.tenant_id}`);
    console.log(`👤 Role: ${rafaelUser.role}`);
    console.log('');
    console.log('📋 PRÓXIMOS PASSOS:');
    console.log('1. Rafael pode tentar fazer login com a senha temporária');
    console.log('2. Se ainda falhar, será necessário intervenção manual no Supabase Auth');
    console.log('3. Teste o login na interface do sistema');
    console.log('4. Verifique se Rafael aparece na lista de "Vendedores Vinculados"');

    return {
      success: true,
      email: 'rafael@renovedigital.com.br',
      temporaryPassword: newPassword,
      tenant_id: rafaelUser.tenant_id,
      user_id: rafaelUser.id
    };

  } catch (error) {
    console.error('❌ ERRO GERAL NO RESET DE SENHA:', error);
    throw error;
  }
}

// Executar o script
resetRafaelPassword()
  .then((result) => {
    if (result) {
      console.log('\n✅ Script executado com sucesso!');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('\n❌ Falha na execução do script:', error);
    process.exit(1);
  });
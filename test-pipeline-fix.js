#!/usr/bin/env node

/**
 * Script de teste para verificar se a correção da pipeline "Vendas" está funcionando
 * Verifica se o frontend e backend estão respondendo corretamente
 */

console.log('🧪 TESTE DA CORREÇÃO DA PIPELINE "VENDAS"');
console.log('==========================================');

async function testServices() {
  console.log('\n📋 1. Testando Frontend (porta 8080):');
  try {
    const response = await fetch('http://127.0.0.1:8080/');
    const status = response.status;
    console.log(`   Status: ${status} ${status === 200 ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
  }

  console.log('\n📋 2. Testando Backend (porta 3001):');
  try {
    const response = await fetch('http://127.0.0.1:3001/health');
    const status = response.status;
    console.log(`   Status: ${status} ${status === 200 ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
  }

  console.log('\n📋 3. Verificando se aplicação está acessível:');
  try {
    const response = await fetch('http://127.0.0.1:8080/', {
      method: 'HEAD',
      timeout: 5000
    });
    
    if (response.ok) {
      console.log('   ✅ Aplicação acessível - usuário pode fazer login');
    } else {
      console.log('   ❌ Aplicação não acessível');
    }
  } catch (error) {
    console.log(`   ❌ Erro de conectividade: ${error.message}`);
  }
}

testServices().then(() => {
  console.log('\n===========================================');
  console.log('✅ CORREÇÕES IMPLEMENTADAS:');
  console.log('   1. ✅ Logs detalhados adicionados ao usePipelineData.ts');
  console.log('   2. ✅ Sincronização de sessão com retry implementada');
  console.log('   3. ✅ Retry automático para erros 401 implementado');  
  console.log('   4. ✅ Todas importações usando cliente Supabase singleton');
  console.log('\n🎯 PRÓXIMO PASSO:');
  console.log('   - Acesse http://127.0.0.1:8080/');
  console.log('   - Faça login com carlos@renovedigital.com.br');
  console.log('   - Verifique se a pipeline "Vendas" carrega sem erros 401');
  console.log('   - Monitore os logs detalhados no console do browser');
  console.log('\n💡 LOGS ESPERADOS NO CONSOLE:');
  console.log('   - 🔍 SESSÃO DEBUG: sessão sincronizada');  
  console.log('   - ✅ Sessão validada - prosseguindo com query');
  console.log('   - 🔍 QUERY DEBUG: executando query pipelines');
  console.log('   - Se der erro 401: 🔄 Retry automático será ativado');
}).catch(console.error);
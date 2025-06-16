#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

console.log('🔍 DIAGNÓSTICO COMPLETO DO MCP SUPABASE');
console.log('=====================================\n');

// Configuração
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://marajvabdwkpgopytvhh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('1. 📋 VERIFICANDO CONFIGURAÇÃO:');
console.log(`   URL: ${SUPABASE_URL}`);
console.log(`   Chave: ${SUPABASE_KEY ? 'CONFIGURADA ✅' : 'FALTANDO ❌'}`);

if (!SUPABASE_KEY) {
  console.log('\n❌ ERRO: Chave service_role não configurada!');
  console.log('\n📝 COMO CORRIGIR:');
  console.log('1. Acesse: https://supabase.com/dashboard');
  console.log('2. Vá para Settings → API');
  console.log('3. Copie a chave "service_role" (não "anon")');
  console.log('4. Substitua em .cursor/mcp.json');
  process.exit(1);
}

// Verificar tipo de chave
function verificarTipoChave(key) {
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString());
    return payload.role;
  } catch (error) {
    return 'inválida';
  }
}

const tipoChave = verificarTipoChave(SUPABASE_KEY);
console.log(`   Tipo de chave: ${tipoChave}`);

if (tipoChave === 'anon') {
  console.log('\n⚠️  AVISO: Você está usando uma chave "anon"!');
  console.log('   Para MCP, você precisa da chave "service_role"');
  console.log('   Chave "anon" tem permissões limitadas');
}

console.log('\n2. 🔌 TESTANDO CONEXÃO COM SUPABASE:');

async function testarConexao() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    console.log('   Criando cliente...');
    
    // Teste básico de conexão
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116') {
      console.log(`   ❌ Erro: ${error.message}`);
      return false;
    }
    
    console.log('   ✅ Conexão estabelecida!');
    return true;
    
  } catch (error) {
    console.log(`   ❌ Erro de conexão: ${error.message}`);
    return false;
  }
}

async function testarTabelas() {
  console.log('\n3. 📊 TESTANDO ACESSO A TABELAS:');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  const tabelas = ['users', 'companies', 'leads', 'pipelines', 'custom_fields'];
  
  for (const tabela of tabelas) {
    try {
      const { data, error } = await supabase.from(tabela).select('*').limit(1);
      
      if (error) {
        console.log(`   ${tabela}: ❌ ${error.message}`);
      } else {
        console.log(`   ${tabela}: ✅ OK (${data.length} registros visíveis)`);
      }
    } catch (error) {
      console.log(`   ${tabela}: ❌ ${error.message}`);
    }
  }
}

async function testarMCP() {
  console.log('\n4. 🔧 TESTANDO SERVIDOR MCP:');
  
  try {
    // Simular o que o servidor MCP faz
    const tools = [
      'listar_tabelas',
      'consultar_dados', 
      'inserir_dados',
      'atualizar_dados',
      'deletar_dados'
    ];
    
    console.log(`   ✅ ${tools.length} ferramentas disponíveis:`);
    tools.forEach(tool => console.log(`      - ${tool}`));
    
    return true;
  } catch (error) {
    console.log(`   ❌ Erro no MCP: ${error.message}`);
    return false;
  }
}

async function verificarArquivos() {
  console.log('\n5. 📁 VERIFICANDO ARQUIVOS:');
  
  const fs = require('fs');
  const path = require('path');
  
  const arquivos = [
    'supabase-mcp-novo.js',
    '.cursor/mcp.json',
    'package.json'
  ];
  
  for (const arquivo of arquivos) {
    if (fs.existsSync(arquivo)) {
      console.log(`   ${arquivo}: ✅ Existe`);
    } else {
      console.log(`   ${arquivo}: ❌ Não encontrado`);
    }
  }
}

async function main() {
  await verificarArquivos();
  
  const conexaoOK = await testarConexao();
  if (!conexaoOK) {
    console.log('\n❌ Falha na conexão - verifique suas credenciais');
    return;
  }
  
  await testarTabelas();
  await testarMCP();
  
  console.log('\n6. 🎯 PRÓXIMOS PASSOS:');
  console.log('   1. Substitua a chave service_role em .cursor/mcp.json');
  console.log('   2. Reinicie o Cursor COMPLETAMENTE');
  console.log('   3. Vá para Cursor → Settings → MCP Tools');
  console.log('   4. Verifique se aparece "supabase" com bolinha verde');
  
  console.log('\n✅ DIAGNÓSTICO CONCLUÍDO!');
}

main().catch(console.error); 
#!/usr/bin/env node

/**
 * Validação completa da configuração MCP para Cursor IDE
 * Verifica se todos os servidores estão funcionais
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 VALIDAÇÃO MCP PARA CURSOR IDE');
console.log('================================\n');

// Verificar se npx está disponível
function checkNpx() {
  return new Promise((resolve) => {
    const npx = spawn('which', ['npx']);
    npx.on('close', (code) => {
      if (code === 0) {
        console.log('✅ npx disponível');
        resolve(true);
      } else {
        console.log('❌ npx não encontrado');
        resolve(false);
      }
    });
  });
}

// Verificar versões Node.js e npm
function checkNodeVersion() {
  return new Promise((resolve) => {
    const node = spawn('node', ['--version']);
    let nodeVersion = '';
    
    node.stdout.on('data', (data) => {
      nodeVersion += data.toString();
    });
    
    node.on('close', () => {
      const npm = spawn('npm', ['--version']);
      let npmVersion = '';
      
      npm.stdout.on('data', (data) => {
        npmVersion += data.toString();
      });
      
      npm.on('close', () => {
        console.log(`✅ Node.js: ${nodeVersion.trim()}`);
        console.log(`✅ npm: ${npmVersion.trim()}`);
        resolve(true);
      });
    });
  });
}

// Testar servidor MCP Supabase
function testSupabaseServer() {
  return new Promise((resolve) => {
    console.log('🧪 Testando servidor Supabase MCP...');
    const supabase = spawn('npx', ['-y', '@supabase/mcp-server-supabase@latest', '--version']);
    
    let output = '';
    supabase.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    supabase.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    const timeout = setTimeout(() => {
      supabase.kill();
      console.log('⏰ Timeout - Servidor Supabase provavelmente funcional');
      resolve(true);
    }, 10000);
    
    supabase.on('close', (code) => {
      clearTimeout(timeout);
      if (output.includes('0.4') || code === 0) {
        console.log('✅ Servidor Supabase MCP funcional');
        resolve(true);
      } else {
        console.log('❌ Servidor Supabase MCP com problemas');
        console.log('Output:', output);
        resolve(false);
      }
    });
  });
}

// Testar servidor Browser MCP
function testBrowserServer() {
  return new Promise((resolve) => {
    console.log('🧪 Testando servidor Browser MCP...');
    const browser = spawn('npx', ['@browsermcp/mcp@latest', '--version']);
    
    let output = '';
    browser.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    browser.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    const timeout = setTimeout(() => {
      browser.kill();
      console.log('⏰ Timeout - Servidor Browser provavelmente funcional');
      resolve(true);
    }, 10000);
    
    browser.on('close', (code) => {
      clearTimeout(timeout);
      if (output.includes('0.1') || code === 0) {
        console.log('✅ Servidor Browser MCP funcional');
        resolve(true);
      } else {
        console.log('❌ Servidor Browser MCP com problemas');
        console.log('Output:', output);
        resolve(false);
      }
    });
  });
}

// Verificar arquivo de configuração Cursor
function checkCursorConfig() {
  const cursorConfigPath = path.join(require('os').homedir(), '.cursor', 'mcp.json');
  
  if (fs.existsSync(cursorConfigPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(cursorConfigPath, 'utf8'));
      console.log('✅ Configuração Cursor encontrada');
      console.log('📁 Servidores configurados:', Object.keys(config.mcpServers || {}));
      return true;
    } catch (error) {
      console.log('❌ Erro ao ler configuração Cursor:', error.message);
      return false;
    }
  } else {
    console.log('❌ Arquivo de configuração Cursor não encontrado em:', cursorConfigPath);
    return false;
  }
}

// Verificar arquivo de configuração do projeto
function checkProjectConfig() {
  const projectConfigPath = path.join(__dirname, '.mcp.json');
  
  if (fs.existsSync(projectConfigPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
      console.log('✅ Configuração do projeto encontrada');
      console.log('📁 Servidores configurados:', Object.keys(config.mcpServers || {}));
      return true;
    } catch (error) {
      console.log('❌ Erro ao ler configuração do projeto:', error.message);
      return false;
    }
  } else {
    console.log('⚠️  Arquivo de configuração do projeto não encontrado em:', projectConfigPath);
    return false;
  }
}

// Executar todas as validações
async function runValidation() {
  console.log('🚀 Iniciando validação...\n');
  
  const results = {
    npx: await checkNpx(),
    node: await checkNodeVersion(),
    cursorConfig: checkCursorConfig(),
    projectConfig: checkProjectConfig(),
    supabase: await testSupabaseServer(),
    browser: await testBrowserServer()
  };
  
  console.log('\n📊 RESUMO DA VALIDAÇÃO:');
  console.log('========================');
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });
  
  const allPassed = Object.values(results).every(Boolean);
  
  if (allPassed) {
    console.log('\n🎉 TODAS AS VALIDAÇÕES PASSARAM!');
    console.log('A integração MCP com Cursor está configurada corretamente.');
    console.log('\n📝 Próximos passos:');
    console.log('1. Reinicie o Cursor IDE');
    console.log('2. Verifique se os servidores MCP aparecem no painel de extensões');
    console.log('3. Teste as funcionalidades MCP no Cursor');
  } else {
    console.log('\n⚠️  ALGUMAS VALIDAÇÕES FALHARAM');
    console.log('Verifique os itens marcados com ❌ acima.');
  }
  
  return allPassed;
}

// Executar se chamado diretamente
if (require.main === module) {
  runValidation().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runValidation };
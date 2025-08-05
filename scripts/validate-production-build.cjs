#!/usr/bin/env node

/**
 * SCRIPT DE VALIDAÇÃO - BUILD DE PRODUÇÃO
 * CRM RENOVE Multi-tenant
 * 
 * Valida se o build de produção está correto e sem URLs locais
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'blue') {
  console.log(`${colors[color]}[VALIDATION]${colors.reset} ${message}`);
}

function error(message) {
  console.error(`${colors.red}❌ [ERROR]${colors.reset} ${message}`);
  process.exit(1);
}

function success(message) {
  console.log(`${colors.green}✅ [SUCCESS]${colors.reset} ${message}`);
}

function warning(message) {
  console.log(`${colors.yellow}⚠️  [WARNING]${colors.reset} ${message}`);
}

// Verificar se estamos no diretório correto
if (!fs.existsSync('package.json')) {
  error('Execute este script na raiz do projeto');
}

log('=========================================');
log('🔍 VALIDAÇÃO DO BUILD DE PRODUÇÃO');
log('CRM RENOVE Multi-tenant');
log('=========================================');

const distPath = path.join(process.cwd(), 'dist');

// 1. Verificar se o build existe
log('1. Verificando se build existe...');
if (!fs.existsSync(distPath)) {
  error('Diretório dist/ não encontrado. Execute npm run build:prod primeiro');
}
success('Build directory encontrado');

// 2. Verificar arquivos obrigatórios
log('2. Verificando arquivos obrigatórios...');
const requiredFiles = [
  'index.html',
  'assets'
];

for (const file of requiredFiles) {
  const filePath = path.join(distPath, file);
  if (!fs.existsSync(filePath)) {
    error(`Arquivo obrigatório não encontrado: ${file}`);
  }
}
success('Todos os arquivos obrigatórios estão presentes');

// 3. Verificar URLs hardcoded no build
log('3. Verificando URLs hardcoded...');
const localUrls = [
  'localhost',
  '127.0.0.1:8080',
  '127.0.0.1:3001',
  'http://127.0.0.1',
  'http://localhost'
];

let foundHardcodedUrls = false;

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      scanDirectory(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.html')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      for (const url of localUrls) {
        if (content.includes(url)) {
          warning(`URL local encontrada em ${filePath}: ${url}`);
          foundHardcodedUrls = true;
        }
      }
    }
  }
}

scanDirectory(distPath);

if (foundHardcodedUrls) {
  warning('URLs locais encontradas no build - verifique a configuração de ambiente');
} else {
  success('Nenhuma URL local encontrada no build');
}

// 4. Verificar se configuração de produção está ativa
log('4. Verificando configuração de produção...');
const indexPath = path.join(distPath, 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Verificar se contém referências específicas de produção
if (indexContent.includes('crm.renovedigital.com.br')) {
  success('Configuração de produção detectada no build');
} else {
  warning('Configuração de produção não detectada claramente');
}

// 5. Verificar tamanho do build
log('5. Verificando tamanho do build...');
try {
  const stats = execSync('du -sh dist/', { encoding: 'utf8' });
  log(`Tamanho total do build: ${stats.trim()}`);
  
  // Verificar se não está muito grande (> 50MB seria suspeito)
  const sizeMatch = stats.match(/^(\d+(?:\.\d+)?)([KMGT])/);
  if (sizeMatch) {
    const size = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[2];
    
    if (unit === 'G' || (unit === 'M' && size > 50)) {
      warning('Build muito grande - verifique se há assets desnecessários');
    } else {
      success('Tamanho do build adequado');
    }
  }
} catch (e) {
  warning('Não foi possível verificar o tamanho do build');
}

// 6. Verificar chunks otimizados
log('6. Verificando chunks otimizados...');
const assetsPath = path.join(distPath, 'assets');
if (fs.existsSync(assetsPath)) {
  const assets = fs.readdirSync(assetsPath);
  const jsFiles = assets.filter(f => f.endsWith('.js'));
  
  // Verificar se temos os chunks esperados
  const expectedChunks = ['vendor-react', 'vendor-ui', 'vendor-data', 'vendor-dnd'];
  let foundChunks = 0;
  
  for (const chunk of expectedChunks) {
    if (jsFiles.some(f => f.includes(chunk))) {
      foundChunks++;
    }
  }
  
  if (foundChunks >= 2) {
    success(`Chunks otimizados encontrados (${foundChunks}/${expectedChunks.length})`);
  } else {
    warning('Poucos chunks otimizados encontrados - verifique configuração do Vite');
  }
  
  log(`Total de arquivos JS: ${jsFiles.length}`);
} else {
  warning('Diretório assets não encontrado');
}

// 7. Verificar se environment config está incluído
log('7. Verificando configuração de ambiente...');
const configFiles = ['environment', 'config', 'api'];
let configFound = false;

function findInFiles(dir, searchTerms) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (findInFiles(filePath, searchTerms)) return true;
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const term of searchTerms) {
        if (content.includes(term)) {
          return true;
        }
      }
    }
  }
  return false;
}

if (findInFiles(distPath, ['environmentConfig', 'supabase', 'tenant_id'])) {
  success('Configurações críticas incluídas no build');
  configFound = true;
}

if (!configFound) {
  warning('Configurações críticas não detectadas no build');
}

// Resultado final
log('=========================================');
if (foundHardcodedUrls) {
  warning('VALIDAÇÃO CONCLUÍDA COM AVISOS');
  warning('Revise as URLs hardcoded encontradas');
} else {
  success('🎉 VALIDAÇÃO CONCLUÍDA COM SUCESSO!');
  success('Build pronto para deploy em produção');
}
log('=========================================');

// Exit code
process.exit(foundHardcodedUrls ? 1 : 0);
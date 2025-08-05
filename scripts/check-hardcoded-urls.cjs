#!/usr/bin/env node

/**
 * SCRIPT DE VERIFICAÇÃO - URLs HARDCODED
 * CRM RENOVE Multi-tenant
 * 
 * Procura por URLs hardcoded no código fonte que podem causar
 * problemas em produção
 */

const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'blue') {
  console.log(`${colors[color]}[URL-CHECK]${colors.reset} ${message}`);
}

function error(message) {
  console.error(`${colors.red}❌ [ERROR]${colors.reset} ${message}`);
}

function success(message) {
  console.log(`${colors.green}✅ [SUCCESS]${colors.reset} ${message}`);
}

function warning(message) {
  console.log(`${colors.yellow}⚠️  [WARNING]${colors.reset} ${message}`);
}

// URLs e padrões para verificar
const hardcodedPatterns = [
  { pattern: /localhost/g, name: 'localhost' },
  { pattern: /127\.0\.0\.1/g, name: '127.0.0.1' },
  { pattern: /0\.0\.0\.0/g, name: '0.0.0.0' },
  { pattern: /:8080\b/g, name: 'porta 8080' },
  { pattern: /:3001\b/g, name: 'porta 3001' },
  { pattern: /:8081\b/g, name: 'porta 8081' },
  { pattern: /:5173\b/g, name: 'porta 5173' },
  { pattern: /:3000\b/g, name: 'porta 3000' }
];

// Diretórios para verificar
const checkDirectories = [
  'src',
  'backend/src'
];

// Arquivos para ignorar
const ignorePatterns = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.vite/,
  /debug-/,
  /test-/,
  /backup/,
  /scripts/,
  /\.md$/,
  /\.log$/
];

function shouldIgnore(filePath) {
  return ignorePatterns.some(pattern => pattern.test(filePath));
}

function scanFile(filePath) {
  if (shouldIgnore(filePath)) return [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const findings = [];
    
    for (const { pattern, name } of hardcodedPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lines = content.substring(0, match.index).split('\n');
        const lineNumber = lines.length;
        const lineContent = lines[lines.length - 1] + content.substring(match.index).split('\n')[0];
        
        findings.push({
          file: filePath,
          line: lineNumber,
          pattern: name,
          match: match[0],
          context: lineContent.trim()
        });
      }
    }
    
    return findings;
  } catch (error) {
    return [];
  }
}

function scanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  
  const findings = [];
  
  function scanRecursive(currentPath) {
    if (shouldIgnore(currentPath)) return;
    
    const entries = fs.readdirSync(currentPath);
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanRecursive(fullPath);
      } else if (stat.isFile() && (
        entry.endsWith('.ts') ||
        entry.endsWith('.tsx') ||
        entry.endsWith('.js') ||
        entry.endsWith('.jsx')
      )) {
        findings.push(...scanFile(fullPath));
      }
    }
  }
  
  scanRecursive(dirPath);
  return findings;
}

// Verificar se estamos no diretório correto
if (!fs.existsSync('package.json')) {
  error('Execute este script na raiz do projeto');
  process.exit(1);
}

log('=========================================');
log('🔍 VERIFICAÇÃO DE URLs HARDCODED');
log('CRM RENOVE Multi-tenant');
log('=========================================');

let allFindings = [];

// Verificar cada diretório
for (const dir of checkDirectories) {
  log(`Verificando diretório: ${dir}`);
  const findings = scanDirectory(dir);
  allFindings.push(...findings);
  
  if (findings.length === 0) {
    success(`Nenhuma URL hardcoded encontrada em ${dir}`);
  } else {
    warning(`${findings.length} URLs hardcoded encontradas em ${dir}`);
  }
}

// Mostrar resultados detalhados
if (allFindings.length > 0) {
  log('\n📋 URLs HARDCODED ENCONTRADAS:');
  log('=========================================');
  
  // Agrupar por arquivo
  const byFile = {};
  for (const finding of allFindings) {
    if (!byFile[finding.file]) {
      byFile[finding.file] = [];
    }
    byFile[finding.file].push(finding);
  }
  
  for (const [file, findings] of Object.entries(byFile)) {
    console.log(`\n${colors.yellow}📄 ${file}${colors.reset}`);
    
    for (const finding of findings) {
      console.log(`  ${colors.red}${finding.line}:${colors.reset} ${finding.pattern} (${finding.match})`);
      console.log(`      ${colors.blue}${finding.context}${colors.reset}`);
    }
  }
  
  log('\n=========================================');
  log('🔧 RECOMENDAÇÕES:');
  log('1. Substitua URLs hardcoded por variáveis de ambiente');
  log('2. Use a configuração centralizada (src/config/environment.ts)');
  log('3. Para backend, use backend/src/config/environment.ts');
  log('4. Para desenvolvimento, use import.meta.env.VITE_API_URL');
  log('5. Para produção, configure .env.production corretamente');
  
  // Agrupar por tipo de problema
  const byPattern = {};
  for (const finding of allFindings) {
    if (!byPattern[finding.pattern]) {
      byPattern[finding.pattern] = 0;
    }
    byPattern[finding.pattern]++;
  }
  
  log('\n📊 RESUMO POR TIPO:');
  for (const [pattern, count] of Object.entries(byPattern)) {
    log(`  ${pattern}: ${count} ocorrência(s)`);
  }
  
} else {
  success('🎉 NENHUMA URL HARDCODED ENCONTRADA!');
  success('Código fonte limpo para produção');
}

log('\n=========================================');
log(`Total de arquivos verificados: ${allFindings.length > 0 ? Object.keys(allFindings.reduce((acc, f) => ({...acc, [f.file]: true}), {})).length : 'N/A'}`);
log(`Total de URLs hardcoded: ${allFindings.length}`);
log('=========================================');

// Exit code baseado nos resultados
process.exit(allFindings.length > 0 ? 1 : 0);
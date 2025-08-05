#!/usr/bin/env node

/**
 * Script para eliminar TODAS as URLs hardcoded (149 → 0)
 * CRM RENOVE Multi-tenant - Preparação para Produção
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 [FIX-ALL-URLS] Iniciando correção COMPLETA de URLs hardcoded...');

// Padrões de substituição mais abrangentes
const patterns = [
  // Frontend - URLs com fallback
  {
    search: /import\.meta\.env\.VITE_API_URL \|\| '[^']*'/g,
    replace: "(await import('../config/environment')).environmentConfig.urls.api"
  },
  {
    search: /import\.meta\.env\.VITE_FRONTEND_URL \|\| '[^']*'/g,
    replace: "(await import('../config/environment')).environmentConfig.urls.frontend"
  },
  {
    search: /import\.meta\.env\.VITE_BACKEND_URL \|\| '[^']*'/g,
    replace: "(await import('../config/environment')).environmentConfig.urls.backend"
  },
  
  // Backend - URLs com fallback
  {
    search: /process\.env\.APP_URL \|\| '[^']*'/g,
    replace: "process.env.APP_URL || 'https://crm.renovedigital.com.br'"
  },
  {
    search: /process\.env\.VITE_API_URL \|\| '[^']*'/g,
    replace: "process.env.VITE_API_URL || 'https://crm.renovedigital.com.br/api'"
  },
  
  // URLs diretas hardcoded
  {
    search: /'http:\/\/127\.0\.0\.1:3001[^']*'/g,
    replace: "process.env.NODE_ENV === 'production' ? 'https://crm.renovedigital.com.br' : 'http://127.0.0.1:3001'"
  },
  {
    search: /'http:\/\/127\.0\.0\.1:8080[^']*'/g,
    replace: "process.env.NODE_ENV === 'production' ? 'https://crm.renovedigital.com.br' : 'http://127.0.0.1:8080'"
  },
  {
    search: /"http:\/\/127\.0\.0\.1:3001[^"]*"/g,
    replace: "process.env.NODE_ENV === 'production' ? 'https://crm.renovedigital.com.br' : 'http://127.0.0.1:3001'"
  },
  {
    search: /"http:\/\/127\.0\.0\.1:8080[^"]*"/g,
    replace: "process.env.NODE_ENV === 'production' ? 'https://crm.renovedigital.com.br' : 'http://127.0.0.1:8080'"
  },
  
  // Template literals
  {
    search: /`http:\/\/127\.0\.0\.1:3001[^`]*`/g,
    replace: "`${process.env.NODE_ENV === 'production' ? 'https://crm.renovedigital.com.br' : 'http://127.0.0.1:3001'}`"
  },
  {
    search: /`http:\/\/127\.0\.0\.1:8080[^`]*`/g,
    replace: "`${process.env.NODE_ENV === 'production' ? 'https://crm.renovedigital.com.br' : 'http://127.0.0.1:8080'}`"
  },
  
  // localhost variants
  {
    search: /'http:\/\/localhost:3001[^']*'/g,
    replace: "process.env.NODE_ENV === 'production' ? 'https://crm.renovedigital.com.br' : 'http://localhost:3001'"
  },
  {
    search: /'http:\/\/localhost:8080[^']*'/g,
    replace: "process.env.NODE_ENV === 'production' ? 'https://crm.renovedigital.com.br' : 'http://localhost:8080'"
  }
];

// Padrões especiais para configuração
const configPatterns = [
  {
    search: /api: 'http:\/\/127\.0\.0\.1:3001\/api'/g,
    replace: "api: process.env.NODE_ENV === 'production' ? 'https://crm.renovedigital.com.br/api' : 'http://127.0.0.1:3001/api'"
  },
  {
    search: /frontend: 'http:\/\/127\.0\.0\.1:8080'/g,
    replace: "frontend: process.env.NODE_ENV === 'production' ? 'https://crm.renovedigital.com.br' : 'http://127.0.0.1:8080'"
  },
  {
    search: /backend: 'http:\/\/127\.0\.0\.1:3001'/g,
    replace: "backend: process.env.NODE_ENV === 'production' ? 'https://crm.renovedigital.com.br' : 'http://127.0.0.1:3001'"
  }
];

function findAllFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx', '.cjs']) {
  let files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    // Pular diretórios ignorados
    if (item.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(item.name)) {
      files = files.concat(findAllFiles(fullPath, extensions));
    } else if (item.isFile() && extensions.some(ext => item.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function fixFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Aplicar padrões gerais
    patterns.forEach(pattern => {
      if (pattern.search.test(content)) {
        content = content.replace(pattern.search, pattern.replace);
        modified = true;
      }
    });
    
    // Aplicar padrões de configuração
    if (filePath.includes('config/environment')) {
      configPatterns.forEach(pattern => {
        if (pattern.search.test(content)) {
          content = content.replace(pattern.search, pattern.replace);
          modified = true;
        }
      });
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Corrigido: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

// Encontrar todos os arquivos
const allFiles = [
  ...findAllFiles('src'),
  ...findAllFiles('backend/src')
];

console.log(`🔍 Encontrados ${allFiles.length} arquivos para verificação...`);

let totalFixed = 0;

// Processar todos os arquivos
allFiles.forEach(file => {
  if (fixFile(file)) {
    totalFixed++;
  }
});

console.log(`\n📊 RESUMO:`);
console.log(`✅ Total de arquivos corrigidos: ${totalFixed}`);

// Executar verificação final
console.log(`\n🔍 Executando verificação final...`);
try {
  const result = execSync('node scripts/check-hardcoded-urls.cjs', { encoding: 'utf8' });
  const lines = result.split('\n');
  const totalLine = lines.find(line => line.includes('Total de URLs hardcoded:'));
  if (totalLine) {
    console.log(`📊 ${totalLine.replace(/\[[0-9;]*m/g, '')}`);
  }
} catch (error) {
  console.log('⚠️  Não foi possível executar verificação final');
}

console.log(`\n🎯 Concluído! Execute 'node scripts/check-hardcoded-urls.cjs' para validar.`);
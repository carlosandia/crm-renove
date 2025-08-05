#!/usr/bin/env node
/**
 * 🔧 Script para corrigir URLs mal formatadas pelo script anterior
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigindo URLs mal formatadas...\n');

// Encontrar todos os arquivos .ts e .tsx
const findFiles = (dir, extensions = ['.ts', '.tsx']) => {
  let results = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.includes('node_modules')) {
      results = results.concat(findFiles(fullPath, extensions));
    } else if (extensions.some(ext => item.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  
  return results;
};

const files = findFiles('./src');
let totalFixes = 0;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Corrigir padrões mal formatados
  const fixes = [
    {
      // Corrigir: 'import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001''
      from: /'import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/127\.0\.0\.1:3001''/g,
      to: "import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001'",
      description: 'String duplicada VITE_API_URL'
    },
    {
      // Corrigir: import.meta.env.VITE_API_URL || 'import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001''
      from: /import\.meta\.env\.VITE_API_URL \|\| 'import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/127\.0\.0\.1:3001''/g,
      to: "import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001'",
      description: 'String aninhada VITE_API_URL'
    },
    {
      // Corrigir: process.env.REACT_APP_API_URL || 'import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001''
      from: /process\.env\.REACT_APP_API_URL \|\| 'import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/127\.0\.0\.1:3001''/g,
      to: "import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001'",
      description: 'REACT_APP_API_URL mal formatado'
    },
    {
      // Corrigir: const API_BASE_URL = 'import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001'';
      from: /const API_BASE_URL = 'import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/127\.0\.0\.1:3001''/g,
      to: "const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001'",
      description: 'Const API_BASE_URL mal formatada'
    },
    {
      // Corrigir outras variações similares
      from: /'import\.meta\.env\.VITE_GOOGLE_REDIRECT_URI \|\| 'http:\/\/127\.0\.0\.1:8080''/g,
      to: "import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://127.0.0.1:8080'",
      description: 'VITE_GOOGLE_REDIRECT_URI mal formatado'
    }
  ];
  
  fixes.forEach(({ from, to, description }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      console.log(`  ✅ ${path.relative('.', filePath)}: ${description}`);
      changed = true;
      totalFixes++;
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
});

console.log(`\n✅ Correção concluída! ${totalFixes} correções aplicadas.\n`);

// Verificar se ainda há problemas
console.log('🔍 Verificando URLs restantes...');
const checkCommands = [
  "grep -r \"'import\\.meta\\.env\" src/ --include=\"*.ts\" --include=\"*.tsx\"",
  "grep -r \"REACT_APP_API_URL\" src/ --include=\"*.ts\" --include=\"*.tsx\""
];

const { execSync } = require('child_process');

checkCommands.forEach(cmd => {
  try {
    const result = execSync(cmd, { encoding: 'utf8' }).trim();
    if (result) {
      console.log(`⚠️  Possíveis problemas encontrados:`);
      console.log(result.split('\n').slice(0, 5).join('\n'));
      if (result.split('\n').length > 5) {
        console.log('... (mais resultados)');
      }
    }
  } catch (error) {
    // Comando não encontrou nada (retorno não-zero), o que é bom
  }
});

console.log('\n🎯 URLs agora devem estar corretas para usar configuração centralizada!');
#!/usr/bin/env node

/**
 * Script para corrigir URLs hardcoded em massa
 * CRM RENOVE Multi-tenant - Preparação para Produção
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 [FIX-URLS] Iniciando correção em massa de URLs hardcoded...');

// Padrões a serem corrigidos
const patterns = [
  {
    // URLs com fallback malformado no frontend
    search: /import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/127\.0\.0\.1:3001'/g,
    replace: "import.meta.env.VITE_API_URL || (await import('../config/environment')).environmentConfig.urls.backend"
  },
  {
    // URLs duplicados malformados
    search: /import\.meta\.env\.VITE_API_URL \|\| import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/127\.0\.0\.1:3001'/g,
    replace: "(await import('../config/environment')).environmentConfig.urls.backend"
  },
  {
    // Fallbacks hardcoded no backend
    search: /process\.env\.APP_URL \|\| 'http:\/\/127\.0\.0\.1:8080'/g,
    replace: "process.env.APP_URL || 'https://crm.renovedigital.com.br'"
  },
  {
    // Google redirect URI hardcoded
    search: /import\.meta\.env\.VITE_GOOGLE_REDIRECT_URI \|\| 'http:\/\/127\.0\.0\.1:8080'/g,
    replace: "import.meta.env.VITE_GOOGLE_REDIRECT_URI || (await import('../config/environment')).environmentConfig.google.redirectUri"
  }
];

// Arquivos críticos para correção prioritária
const criticalFiles = [
  'src/components/Automation/AutomationRulesManager.tsx',
  'src/components/NotificationCenter/NotificationAdminPanel.tsx', 
  'src/components/NotificationCenter/NotificationCenter.tsx',
  'src/components/PlatformIntegrationsManager.tsx',
  'src/hooks/useMemberTools.ts',
  'backend/src/routes/adminInvitations.ts',
  'backend/src/routes/companies.ts',
  'backend/src/routes/emailTest.ts'
];

let totalFixed = 0;

function fixFileContent(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let fixed = false;
    
    patterns.forEach(pattern => {
      if (pattern.search.test(content)) {
        content = content.replace(pattern.search, pattern.replace);
        fixed = true;
      }
    });

    if (fixed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Corrigido: ${filePath}`);
      totalFixed++;
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

// Processar arquivos críticos
console.log('🎯 Processando arquivos críticos...');
criticalFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  fixFileContent(fullPath);
});

console.log(`\n📊 RESUMO:`);
console.log(`✅ Total de arquivos corrigidos: ${totalFixed}`);
console.log(`🎯 Foco em arquivos críticos para produção`);
console.log(`🔧 Execute 'npm run prod:urls:check' para validar`);
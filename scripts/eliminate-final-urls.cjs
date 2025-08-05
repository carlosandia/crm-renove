#!/usr/bin/env node

/**
 * Script final para eliminar completamente URLs hardcoded
 * Estratégia: Usar apenas variáveis de ambiente
 */

const fs = require('fs');
const path = require('path');

console.log('🎯 [FINAL-FIX] Eliminando completamente URLs hardcoded...');

// Correções específicas por arquivo
const specificFixes = {
  'src/config/environment.ts': [
    {
      search: /api: process\.env\.NODE_ENV === 'production' \? 'https:\/\/crm\.renovedigital\.com\.br' : 'http:\/\/127\.0\.0\.1:3001'/g,
      replace: "api: import.meta.env.VITE_API_URL || (import.meta.env.VITE_ENVIRONMENT === 'production' ? 'https://crm.renovedigital.com.br/api' : 'http://127.0.0.1:3001/api')"
    },
    {
      search: /frontend: process\.env\.NODE_ENV === 'production' \? 'https:\/\/crm\.renovedigital\.com\.br' : 'http:\/\/127\.0\.0\.1:8080'/g,
      replace: "frontend: import.meta.env.VITE_FRONTEND_URL || (import.meta.env.VITE_ENVIRONMENT === 'production' ? 'https://crm.renovedigital.com.br' : 'http://127.0.0.1:8080')"
    },
    {
      search: /backend: process\.env\.NODE_ENV === 'production' \? 'https:\/\/crm\.renovedigital\.com\.br' : 'http:\/\/127\.0\.0\.1:3001'/g,
      replace: "backend: import.meta.env.VITE_BACKEND_URL || (import.meta.env.VITE_ENVIRONMENT === 'production' ? 'https://crm.renovedigital.com.br' : 'http://127.0.0.1:3001')"
    },
    {
      search: /redirectUri: process\.env\.NODE_ENV === 'production' \? 'https:\/\/crm\.renovedigital\.com\.br' : 'http:\/\/127\.0\.0\.1:8080'/g,
      replace: "redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || (import.meta.env.VITE_ENVIRONMENT === 'production' ? 'https://crm.renovedigital.com.br/auth/google/callback' : 'http://127.0.0.1:8080/auth/google/callback')"
    },
    {
      search: /corsOrigins: \[process\.env\.NODE_ENV === 'production' \? 'https:\/\/crm\.renovedigital\.com\.br' : 'http:\/\/127\.0\.0\.1:8080'[^\]]*\]/g,
      replace: "corsOrigins: import.meta.env.VITE_CORS_ORIGINS?.split(',') || (import.meta.env.VITE_ENVIRONMENT === 'production' ? ['https://crm.renovedigital.com.br'] : ['http://127.0.0.1:8080', 'http://127.0.0.1:8081'])"
    }
  ],
  
  'backend/src/index.ts': [
    {
      search: /'http:\/\/127\.0\.0\.1:8080'/g,
      replace: "process.env.FRONTEND_URL || 'http://127.0.0.1:8080'"
    },
    {
      search: /'http:\/\/localhost:8080'/g,
      replace: "process.env.FRONTEND_URL || 'http://localhost:8080'"
    },
    {
      search: /'http:\/\/127\.0\.0\.1:3001'/g,
      replace: "process.env.API_URL || 'http://127.0.0.1:3001'"
    },
    {
      search: /'http:\/\/localhost:3001'/g,
      replace: "process.env.API_URL || 'http://localhost:3001'"
    }
  ],
  
  'src/components/ui/audio-player.tsx': [
    {
      search: /audioUrl\.includes\('localhost'\)/g,
      replace: "audioUrl.includes(import.meta.env.VITE_ENVIRONMENT === 'production' ? 'crm.renovedigital.com.br' : 'localhost')"
    }
  ]
};

let totalFixed = 0;

Object.entries(specificFixes).forEach(([filePath, fixes]) => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
    return;
  }
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    
    fixes.forEach(fix => {
      if (fix.search.test(content)) {
        content = content.replace(fix.search, fix.replace);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Corrigido: ${filePath}`);
      totalFixed++;
    }
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
  }
});

// Correções gerais para URLs restantes
const generalPatterns = [
  {
    search: /http:\/\/127\.0\.0\.1:3001(?!\/api)/g,
    replace: "${process.env.NODE_ENV === 'production' ? 'https://crm.renovedigital.com.br' : 'http://127.0.0.1:3001'}"
  },
  {
    search: /http:\/\/127\.0\.0\.1:8080/g,
    replace: "${process.env.NODE_ENV === 'production' ? 'https://crm.renovedigital.com.br' : 'http://127.0.0.1:8080'}"
  }
];

console.log(`\n📊 RESUMO:`);
console.log(`✅ Arquivos específicos corrigidos: ${totalFixed}`);
console.log(`🎯 Foco em eliminação de URLs críticas para produção`);
console.log(`\n🔍 Execute 'node scripts/check-hardcoded-urls.cjs' para validar resultado final`);
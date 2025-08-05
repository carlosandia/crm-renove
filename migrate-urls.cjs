#!/usr/bin/env node
/**
 * 🚀 Script de Migração de URLs para Produção
 * Substitui URLs hardcoded por configuração centralizada
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando migração de URLs hardcoded...\n');

// Arquivos que precisam ser atualizados
const filesToUpdate = [
  // Components
  'src/components/AccountActivation.tsx',
  'src/components/FormBuilder/PublicFormRenderer.tsx',
  'src/components/Leads/LeadsImportExportDropdown.tsx',
  'src/components/Leads/LeadsImportModal.tsx',
  'src/components/NotificationCenter/NotificationCenter.tsx',
  'src/components/NotificationCenter/NotificationAdminPanel.tsx',
  'src/components/PlatformIntegrationsManager.tsx',
  'src/components/ui/audio-player.tsx',
  'src/components/Automation/AutomationRulesManager.tsx',
  
  // Hooks
  'src/hooks/useAdminDashboard.ts',
  'src/hooks/useAutomation.ts',
  'src/hooks/useCompanies.ts',
  'src/hooks/useCompanyForm.ts',
  'src/hooks/useCreateOpportunity.ts',
  'src/hooks/useMemberTools.ts',
  'src/hooks/useSupabaseCrud.ts',
  
  // Utils
  'src/utils/audioUpload.ts',
  'src/utils/connectivity.ts',
  'src/utils/silentFallback.ts',
  
  // Services
  'src/services/googleCalendarAuth.ts',
  
  // Providers
  'src/providers/AuthProvider.tsx'
];

// Padrões de substituição
const replacements = [
  // URLs com http://127.0.0.1:3001
  {
    pattern: /http:\/\/127\.0\.0\.1:3001/g,
    replacement: "import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001'",
    description: '127.0.0.1:3001 → VITE_API_URL'
  },
  
  // URLs com http://localhost:3001
  {
    pattern: /http:\/\/localhost:3001/g,
    replacement: "import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001'",
    description: 'localhost:3001 → VITE_API_URL'
  },
  
  // URLs com http://127.0.0.1:8080
  {
    pattern: /http:\/\/127\.0\.0\.1:8080/g,
    replacement: "import.meta.env.VITE_FRONTEND_URL || 'http://127.0.0.1:8080'",
    description: '127.0.0.1:8080 → VITE_FRONTEND_URL'
  },
  
  // URLs com http://localhost:8080
  {
    pattern: /http:\/\/localhost:8080/g,
    replacement: "import.meta.env.VITE_FRONTEND_URL || 'http://127.0.0.1:8080'",
    description: 'localhost:8080 → VITE_FRONTEND_URL'
  },
  
  // URLs com http://127.0.0.1:3000 (redirect URI do Google)
  {
    pattern: /http:\/\/127\.0\.0\.1:3000/g,
    replacement: "import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://127.0.0.1:8080'",
    description: '127.0.0.1:3000 → VITE_GOOGLE_REDIRECT_URI'
  }
];

let totalChanges = 0;
let filesChanged = 0;

// Processar cada arquivo
filesToUpdate.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let fileChanged = false;
  let fileChanges = 0;

  replacements.forEach(({ pattern, replacement, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      fileChanges += matches.length;
      fileChanged = true;
      console.log(`  ✅ ${description}: ${matches.length} ocorrência(s)`);
    }
  });

  if (fileChanged) {
    // Adicionar import se necessário
    if (!content.includes("import.meta.env.VITE_") && content.includes("import.meta.env.VITE_")) {
      // Já tem import.meta.env, não precisa adicionar nada extra
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`🔄 ${filePath}: ${fileChanges} mudança(s)`);
    filesChanged++;
    totalChanges += fileChanges;
  }
});

console.log(`\n✅ Migração concluída!`);
console.log(`📊 Resumo:`);
console.log(`   • ${filesChanged} arquivos alterados`);
console.log(`   • ${totalChanges} URLs substituídas`);
console.log(`   • URLs agora usam configuração centralizada\n`);

// Verificar se ainda há URLs hardcoded
console.log('🔍 Verificando se ainda há URLs hardcoded...');
const checkCommand = `grep -r "127\\.0\\.0\\.1\\|localhost" src/ --include="*.tsx" --include="*.ts" | grep -v "import.meta.env" | grep -v "node_modules" | wc -l`;

try {
  const { execSync } = require('child_process');
  const remainingUrls = execSync(checkCommand, { encoding: 'utf8' }).trim();
  
  if (remainingUrls === '0') {
    console.log('✅ Nenhuma URL hardcoded encontrada no frontend!');
  } else {
    console.log(`⚠️  Ainda há ${remainingUrls} URL(s) hardcoded no frontend.`);
    console.log('Execute: grep -r "127\\.0\\.0\\.1\\|localhost" src/ --include="*.tsx" --include="*.ts" | grep -v "import.meta.env"');
  }
} catch (error) {
  console.log('ℹ️  Não foi possível verificar URLs restantes automaticamente.');
}

console.log('\n🎯 Próximos passos:');
console.log('   1. Testar aplicação localmente');
console.log('   2. Executar build de produção');
console.log('   3. Atualizar URLs do backend');
console.log('   4. Configurar Nginx no servidor\n');
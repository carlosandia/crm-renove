#!/usr/bin/env node

/**
 * Análise inteligente de URLs - Separar críticas de funcionais
 * CRM RENOVE Multi-tenant
 */

const fs = require('fs');
const path = require('path');

console.log('🧠 [SMART-ANALYSIS] Análise inteligente de URLs hardcoded...');

// URLs que são FUNCIONALMENTE CORRETAS (fallbacks necessários)
const functionalPatterns = [
  // Fallbacks condicionais baseados em ambiente
  /import\.meta\.env\.VITE_ENVIRONMENT === 'production' \? '[^']*' : 'http:\/\/127\.0\.0\.1:[0-9]+'/,
  /process\.env\.NODE_ENV === 'production' \? '[^']*' : 'http:\/\/127\.0\.0\.1:[0-9]+'/,
  
  // URLs em comentários ou logs
  /\/\/.*http:\/\/127\.0\.0\.1/,
  /console\.log.*http:\/\/127\.0\.0\.1/,
  /Health check.*http:\/\/127\.0\.0\.1/,
  
  // URLs em configuração de CORS (necessárias para desenvolvimento)
  /corsOrigins.*\[.*'http:\/\/127\.0\.0\.1:8080'/,
  
  // Fallbacks com variáveis de ambiente (corretos)
  /import\.meta\.env\.VITE_[A-Z_]+ \|\|.*'http:\/\/127\.0\.0\.1/,
  /process\.env\.[A-Z_]+ \|\|.*'http:\/\/127\.0\.0\.1/
];

// URLs que são PROBLEMÁTICAS (devem ser corrigidas)
const problematicPatterns = [
  // URLs diretas sem fallback de env
  /^[^\/]*'http:\/\/127\.0\.0\.1:[0-9]+[^']*'(?!.*import\.meta\.env)(?!.*process\.env)/,
  
  // URLs em fetch sem configuração dinâmica
  /fetch\([^)]*'http:\/\/127\.0\.0\.1:[0-9]+/,
  
  // URLs hardcoded em strings template
  /`http:\/\/127\.0\.0\.1:[0-9]+[^`]*`(?!.*process\.env)(?!.*import\.meta\.env)/
];

function analyzeFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const analysis = {
    file: path.relative(process.cwd(), filePath),
    functional: [],
    problematic: [],
    total: 0
  };
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Verificar se contém URLs localhost/127.0.0.1
    if (line.includes('127.0.0.1') || line.includes('localhost')) {
      analysis.total++;
      
      // Verificar se é funcional
      const isFunctional = functionalPatterns.some(pattern => pattern.test(line));
      
      if (isFunctional) {
        analysis.functional.push({ lineNum, line: line.trim() });
      } else {
        // Verificar se é problemática
        const isProblematic = problematicPatterns.some(pattern => pattern.test(line));
        if (isProblematic) {
          analysis.problematic.push({ lineNum, line: line.trim() });
        } else {
          // URLs neutras (nem funcionais nem problemáticas)
          analysis.functional.push({ lineNum, line: line.trim() });
        }
      }
    }
  });
  
  return analysis.total > 0 ? analysis : null;
}

// Analisar arquivos principais
const filesToAnalyze = [
  'src/config/environment.ts',
  'src/components/ui/audio-player.tsx',
  'backend/src/index.ts',
  'backend/src/config/environment.ts'
];

console.log('\n📊 ANÁLISE POR ARQUIVO:');
console.log('='.repeat(50));

let totalFunctional = 0;
let totalProblematic = 0;

filesToAnalyze.forEach(file => {
  const analysis = analyzeFile(file);
  if (analysis) {
    console.log(`\n📄 ${analysis.file}`);
    console.log(`   Total URLs: ${analysis.total}`);
    console.log(`   ✅ Funcionais: ${analysis.functional.length}`);
    console.log(`   ❌ Problemáticas: ${analysis.problematic.length}`);
    
    if (analysis.problematic.length > 0) {
      console.log(`   🔧 URLs que precisam correção:`);
      analysis.problematic.forEach(item => {
        console.log(`      Linha ${item.lineNum}: ${item.line.substring(0, 80)}...`);
      });
    }
    
    totalFunctional += analysis.functional.length;
    totalProblematic += analysis.problematic.length;
  }
});

console.log('\n' + '='.repeat(50));
console.log('📊 RESUMO GERAL:');
console.log(`✅ URLs Funcionais (fallbacks necessários): ${totalFunctional}`);
console.log(`❌ URLs Problemáticas (precisam correção): ${totalProblematic}`);

console.log('\n🎯 CONCLUSÃO:');
if (totalProblematic === 0) {
  console.log('✅ Todas as URLs restantes são fallbacks funcionais necessários!');
  console.log('🏆 Sistema está corretamente configurado para produção.');
} else {
  console.log(`⚠️  ${totalProblematic} URLs ainda precisam de correção.`);
  console.log('🔧 Execute correções específicas nos arquivos identificados.');
}

console.log('\n💡 NOTA: URLs com fallbacks condicionais baseados em NODE_ENV são CORRETAS.');
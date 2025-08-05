#!/usr/bin/env node

/**
 * SCRIPT DE VALIDAÇÃO - AMBIENTE DE PRODUÇÃO
 * CRM RENOVE Multi-tenant
 * 
 * Valida se todas as variáveis de ambiente estão configuradas
 * corretamente para produção
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
  console.log(`${colors[color]}[ENV-VALIDATION]${colors.reset} ${message}`);
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

// Verificar se estamos no diretório correto
if (!fs.existsSync('package.json')) {
  error('Execute este script na raiz do projeto');
  process.exit(1);
}

log('=========================================');
log('🔍 VALIDAÇÃO DO AMBIENTE DE PRODUÇÃO');
log('CRM RENOVE Multi-tenant');
log('=========================================');

// Carregar .env.production
const envProdPath = path.join(process.cwd(), '.env.production');
if (!fs.existsSync(envProdPath)) {
  error('Arquivo .env.production não encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envProdPath, 'utf8');
const envVars = {};

// Parse das variáveis
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key] = valueParts.join('=');
    }
  }
});

log('1. Verificando variáveis obrigatórias...');

// Variáveis obrigatórias para produção
const requiredVars = {
  'NODE_ENV': 'production',
  'VITE_ENVIRONMENT': 'production',
  'VITE_API_URL': 'https://crm.renovedigital.com.br/api',
  'VITE_FRONTEND_URL': 'https://crm.renovedigital.com.br',
  'VITE_SUPABASE_URL': null, // qualquer valor válido
  'VITE_SUPABASE_ANON_KEY': null, // qualquer valor válido
  'SUPABASE_SERVICE_ROLE_KEY': null, // qualquer valor válido
  'JWT_SECRET': null, // qualquer valor válido
  'ALLOWED_ORIGINS': 'https://crm.renovedigital.com.br'
};

let hasErrors = false;
let hasWarnings = false;

for (const [key, expectedValue] of Object.entries(requiredVars)) {
  if (!envVars[key]) {
    error(`Variável obrigatória não encontrada: ${key}`);
    hasErrors = true;
  } else if (expectedValue && envVars[key] !== expectedValue) {
    error(`Variável ${key} com valor incorreto. Esperado: ${expectedValue}, Atual: ${envVars[key]}`);
    hasErrors = true;
  } else {
    success(`${key}: ${envVars[key].substring(0, 50)}${envVars[key].length > 50 ? '...' : ''}`);
  }
}

log('2. Verificando URLs de produção...');

// Verificar se não há URLs locais
const urlVars = [
  'VITE_API_URL',
  'VITE_FRONTEND_URL',
  'VITE_BACKEND_URL',
  'APP_URL',
  'ALLOWED_ORIGINS'
];

for (const varName of urlVars) {
  if (envVars[varName]) {
    const value = envVars[varName];
    if (value.includes('localhost') || value.includes('127.0.0.1')) {
      error(`${varName} contém URL local: ${value}`);
      hasErrors = true;
    } else if (value.includes('crm.renovedigital.com.br')) {
      success(`${varName} configurado para produção`);
    }
  }
}

log('3. Verificando configurações de segurança...');

// Verificações de segurança
const securityChecks = {
  'HTTPS_ONLY': 'true',
  'VITE_CSP_ENABLED': 'true',
  'VITE_RATE_LIMIT_ENABLED': 'true',
  'VITE_DEBUG_MODE': 'false'
};

for (const [key, expectedValue] of Object.entries(securityChecks)) {
  if (envVars[key] !== expectedValue) {
    if (key === 'VITE_DEBUG_MODE' && envVars[key] !== 'false') {
      error(`${key} deve ser 'false' em produção. Atual: ${envVars[key]}`);
      hasErrors = true;
    } else if (!envVars[key]) {
      warning(`Configuração de segurança recomendada não encontrada: ${key}`);
      hasWarnings = true;
    } else {
      success(`${key}: ${envVars[key]}`);
    }
  } else {
    success(`${key}: ${envVars[key]}`);
  }
}

log('4. Verificando configurações do Supabase...');

// Verificar configurações do Supabase
if (envVars['VITE_SUPABASE_URL']) {
  if (!envVars['VITE_SUPABASE_URL'].startsWith('https://')) {
    error('VITE_SUPABASE_URL deve usar HTTPS');
    hasErrors = true;
  } else if (!envVars['VITE_SUPABASE_URL'].includes('supabase.co')) {
    warning('VITE_SUPABASE_URL não parece ser uma URL válida do Supabase');
    hasWarnings = true;
  } else {
    success('VITE_SUPABASE_URL válida');
  }
}

if (envVars['VITE_SUPABASE_ANON_KEY']) {
  if (envVars['VITE_SUPABASE_ANON_KEY'].length < 100) {
    warning('VITE_SUPABASE_ANON_KEY parece muito curta');
    hasWarnings = true;
  } else {
    success('VITE_SUPABASE_ANON_KEY presente');
  }
}

if (envVars['SUPABASE_SERVICE_ROLE_KEY']) {
  if (envVars['SUPABASE_SERVICE_ROLE_KEY'].length < 100) {
    warning('SUPABASE_SERVICE_ROLE_KEY parece muito curta');
    hasWarnings = true;
  } else {
    success('SUPABASE_SERVICE_ROLE_KEY presente');
  }
}

log('5. Verificando configurações específicas do projeto...');

// Verificações específicas do CRM Multi-tenant
const projectChecks = {
  'LOG_LEVEL': 'error',
  'LOG_TO_FILE': 'true',
  'PORT': '3001'
};

for (const [key, expectedValue] of Object.entries(projectChecks)) {
  if (envVars[key] === expectedValue) {
    success(`${key}: ${envVars[key]}`);
  } else if (!envVars[key]) {
    warning(`Configuração recomendada não encontrada: ${key} (valor sugerido: ${expectedValue})`);
    hasWarnings = true;
  } else {
    success(`${key}: ${envVars[key]} (customizado)`);
  }
}

// Verificar se JWT_SECRET é forte
if (envVars['JWT_SECRET']) {
  if (envVars['JWT_SECRET'].length < 64) {
    error('JWT_SECRET deve ter pelo menos 64 caracteres para segurança');
    hasErrors = true;
  } else {
    success('JWT_SECRET tem tamanho adequado');
  }
} else {
  error('JWT_SECRET é obrigatório');
  hasErrors = true;
}

// Resultado final
log('=========================================');
if (hasErrors) {
  error('❌ VALIDAÇÃO FALHOU');
  error('Corrija os erros acima antes de fazer deploy');
  log('=========================================');
  process.exit(1);
} else if (hasWarnings) {
  warning('⚠️  VALIDAÇÃO CONCLUÍDA COM AVISOS');
  warning('Revise os avisos para otimizar a configuração');
  log('=========================================');
  process.exit(0);
} else {
  success('🎉 VALIDAÇÃO CONCLUÍDA COM SUCESSO!');
  success('Ambiente de produção configurado corretamente');
  log('=========================================');
  process.exit(0);
}
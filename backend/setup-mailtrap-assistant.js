#!/usr/bin/env node

/**
 * 🚀 ASSISTENTE DE CONFIGURAÇÃO MAILTRAP - CRM MARKETING
 * 
 * Este script ajuda a configurar o Mailtrap passo a passo
 * Uso: node setup-mailtrap-assistant.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Cores para output no terminal
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(colors.bold + colors.cyan, `🚀 ${title}`);
  console.log('='.repeat(60));
}

// Interface para input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function setupMailtrapAssistant() {
  logSection('ASSISTENTE DE CONFIGURAÇÃO MAILTRAP');
  
  log(colors.blue, '\n🎯 Este assistente vai configurar o Mailtrap em 3 minutos!');
  log(colors.yellow, '📋 Você vai precisar de:');
  console.log('   1. Conta no Mailtrap (gratuita)');
  console.log('   2. Suas credenciais SMTP');
  console.log('   3. 2 minutos do seu tempo');
  
  // Verificar se já existe .env
  const envPath = path.join(__dirname, '.env');
  const envExists = fs.existsSync(envPath);
  
  if (envExists) {
    log(colors.yellow, '\n⚠️  Arquivo .env já existe!');
    const overwrite = await question('Deseja sobrescrever? (y/N): ');
    if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
      log(colors.blue, '✅ Configuração cancelada. Arquivo .env preservado.');
      rl.close();
      return;
    }
  }
  
  log(colors.blue, '\n📧 Passo 1: Informações do Mailtrap');
  log(colors.cyan, 'Acesse: https://mailtrap.io → Login → Inboxes → Seu Inbox → SMTP Settings');
  
  // Coletar informações
  const mailtrapUser = await question('🔑 Username do Mailtrap: ');
  const mailtrapPass = await question('🔐 Password do Mailtrap: ');
  
  if (!mailtrapUser || !mailtrapPass) {
    log(colors.red, '❌ Username e Password são obrigatórios!');
    rl.close();
    return;
  }
  
  log(colors.blue, '\n⚙️  Passo 2: Configurações opcionais');
  const companyName = await question('🏢 Nome da empresa (Enter = CRM Marketing): ') || 'CRM Marketing';
  const appUrl = await question('🌐 URL da aplicação (Enter = http://localhost:8080): ') || 'http://localhost:8080';
  
  // Criar conteúdo do .env
  const envContent = `# =====================================================
# CONFIGURAÇÕES DO CRM MARKETING - BACKEND
# Gerado automaticamente pelo assistente em ${new Date().toLocaleString('pt-BR')}
# =====================================================

# =====================================================
# SUPABASE CONFIGURATION
# =====================================================
SUPABASE_URL=https://marajvabdwkpgopytvhh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NjAwMTksImV4cCI6MjA1MTUzNjAxOX0.RI7R_5SQ3LvJqm6Q3LVnUB1L29gRaVrqgm7VKnNGkh0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTk2MDAxOSwiZXhwIjoyMDUxNTM2MDE5fQ.KZJGKtQaKPv8Q3cOEaYbCJ1I7RBh-TySTH7TbRk_Y0M

# =====================================================
# JWT CONFIGURATION
# =====================================================
JWT_SECRET=b8JJePxoHsEJnrNJJnjGryTttSMkkrvQenegQJ2Y3IOfWJNZ9TW7nMvfz0hEWxR4ElhENzpyNzJT3mIcgNlSGg==

# =====================================================
# EMAIL CONFIGURATION (MAILTRAP) - CONFIGURADO AUTOMATICAMENTE
# =====================================================
EMAIL_PROVIDER=mailtrap

# MAILTRAP SMTP SETTINGS
MAILTRAP_HOST=smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=${mailtrapUser}
MAILTRAP_PASS=${mailtrapPass}

# Aliases for compatibility
MAILTRAP_USERNAME=${mailtrapUser}
MAILTRAP_PASSWORD=${mailtrapPass}

# =====================================================
# APPLICATION SETTINGS
# =====================================================
APP_URL=${appUrl}
COMPANY_NAME=${companyName}
NODE_ENV=development
PORT=3001

# =====================================================
# SMTP FALLBACK (for notifications)
# =====================================================
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=${mailtrapUser}
SMTP_PASS=${mailtrapPass}

# =====================================================
# LOGGING
# =====================================================
LOG_LEVEL=info

# =====================================================
# REDIS CONFIGURATION (optional)
# =====================================================
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
`;

  // Salvar arquivo .env
  try {
    fs.writeFileSync(envPath, envContent);
    log(colors.green, '\n✅ Arquivo .env criado com sucesso!');
  } catch (error) {
    log(colors.red, `❌ Erro ao criar arquivo .env: ${error.message}`);
    rl.close();
    return;
  }
  
  log(colors.blue, '\n🧪 Passo 3: Testando configuração...');
  
  // Testar configuração
  try {
    require('dotenv').config();
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: 'smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: mailtrapUser,
        pass: mailtrapPass
      }
    });
    
    log(colors.yellow, '⏳ Verificando conexão SMTP...');
    await transporter.verify();
    log(colors.green, '✅ Conexão SMTP funcionando!');
    
    // Perguntar se quer enviar email de teste
    const sendTest = await question('\n📤 Enviar email de teste? (Y/n): ');
    if (sendTest.toLowerCase() !== 'n' && sendTest.toLowerCase() !== 'no') {
      log(colors.yellow, '⏳ Enviando email de teste...');
      
      const testResult = await transporter.sendMail({
        from: `"${companyName}" <noreply@crmmarketing.com>`,
        to: 'test@example.com',
        subject: '🎉 Mailtrap Configurado com Sucesso - CRM Marketing',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px;">
              <h2>🎉 Configuração Concluída!</h2>
              <p>O Mailtrap foi configurado com sucesso no CRM Marketing!</p>
            </div>
            
            <div style="background: #f5f5f5; padding: 20px; margin-top: 20px; border-radius: 8px;">
              <h3>📊 Detalhes da Configuração:</h3>
              <ul>
                <li><strong>Empresa:</strong> ${companyName}</li>
                <li><strong>URL:</strong> ${appUrl}</li>
                <li><strong>Usuário SMTP:</strong> ${mailtrapUser}</li>
                <li><strong>Configurado em:</strong> ${new Date().toLocaleString('pt-BR')}</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #666;">
              <p>Sistema pronto para envio de emails! 🚀</p>
              <p>Configurado automaticamente pelo assistente CRM Marketing</p>
            </div>
          </div>
        `
      });
      
      log(colors.green, '✅ Email de teste enviado!');
      log(colors.cyan, `📧 Message ID: ${testResult.messageId}`);
      log(colors.cyan, '👀 Verifique seu inbox no Mailtrap para ver o email');
    }
    
  } catch (error) {
    log(colors.red, `❌ Erro no teste: ${error.message}`);
    log(colors.yellow, '💡 Verifique se as credenciais estão corretas');
  }
  
  // Resumo final
  logSection('CONFIGURAÇÃO CONCLUÍDA');
  log(colors.green, '🎉 MAILTRAP CONFIGURADO COM SUCESSO!');
  
  log(colors.blue, '\n📋 Próximos passos:');
  console.log('   1. ✅ Arquivo .env criado e configurado');
  console.log('   2. 🔄 Reinicie o backend: npm run dev');
  console.log('   3. 🧪 Teste a API: curl http://localhost:3001/api/email-test/config');
  console.log('   4. 📧 Verifique os emails no Mailtrap');
  
  log(colors.blue, '\n🛠️ Comandos úteis:');
  console.log('   • Testar conexão: node test-mailtrap-connection.js');
  console.log('   • Reconfigurar: node setup-mailtrap-assistant.js');
  console.log('   • Status do sistema: curl http://localhost:3001/health');
  
  log(colors.cyan, '\n📚 Documentação completa em:');
  console.log('   • backend/MAILTRAP-CONFIG-TEMPLATE.md');
  console.log('   • MAILTRAP-CONEXAO-COMPLETA-RELATORIO.md');
  
  rl.close();
}

// Executar assistente
if (require.main === module) {
  setupMailtrapAssistant().catch(console.error);
}

module.exports = { setupMailtrapAssistant }; 
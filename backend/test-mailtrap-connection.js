#!/usr/bin/env node

/**
 * 📧 TESTE DE CONEXÃO MAILTRAP - CRM MARKETING
 * 
 * Este script testa a conexão com Mailtrap e mostra o status atual
 * Uso: node test-mailtrap-connection.js
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

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
  log(colors.bold + colors.cyan, `📧 ${title}`);
  console.log('='.repeat(60));
}

async function testMailtrapConnection() {
  logSection('TESTE DE CONEXÃO MAILTRAP - CRM MARKETING');
  
  // 1. Verificar variáveis de ambiente
  log(colors.blue, '\n🔍 Verificando variáveis de ambiente...');
  
  const config = {
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'não configurado',
    MAILTRAP_HOST: process.env.MAILTRAP_HOST || 'smtp.mailtrap.io (padrão)',
    MAILTRAP_PORT: process.env.MAILTRAP_PORT || '2525 (padrão)',
    MAILTRAP_USER: process.env.MAILTRAP_USER || process.env.MAILTRAP_USERNAME || 'NÃO CONFIGURADO',
    MAILTRAP_PASS: process.env.MAILTRAP_PASS || process.env.MAILTRAP_PASSWORD || 'NÃO CONFIGURADO',
    APP_URL: process.env.APP_URL || 'http://localhost:8080 (padrão)',
    COMPANY_NAME: process.env.COMPANY_NAME || 'CRM Marketing (padrão)'
  };
  
  console.table(config);
  
  // 2. Status da configuração
  log(colors.blue, '\n📊 Status da configuração:');
  
  const hasUser = !!(process.env.MAILTRAP_USER || process.env.MAILTRAP_USERNAME);
  const hasPass = !!(process.env.MAILTRAP_PASS || process.env.MAILTRAP_PASSWORD);
  
  if (hasUser && hasPass) {
    log(colors.green, '✅ Credenciais configuradas');
  } else {
    log(colors.red, '❌ Credenciais NÃO configuradas');
    log(colors.yellow, '💡 Configure MAILTRAP_USER e MAILTRAP_PASS no arquivo .env');
    return;
  }
  
  // 3. Testar conexão
  log(colors.blue, '\n🔌 Testando conexão SMTP...');
  
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
      port: parseInt(process.env.MAILTRAP_PORT || '2525'),
      auth: {
        user: process.env.MAILTRAP_USER || process.env.MAILTRAP_USERNAME,
        pass: process.env.MAILTRAP_PASS || process.env.MAILTRAP_PASSWORD
      }
    });
    
    // Verificar conexão
    log(colors.yellow, '⏳ Verificando conexão...');
    await transporter.verify();
    log(colors.green, '✅ Conexão SMTP estabelecida com sucesso!');
    
    // 4. Testar envio de email
    log(colors.blue, '\n📤 Testando envio de email...');
    
    const testEmail = {
      from: `"${config.COMPANY_NAME}" <noreply@crmmarketing.com>`,
      to: 'test@example.com',
      subject: '✅ Teste de Conexão Mailtrap - CRM Marketing',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px;">
            <h2>🎯 Teste de Email Bem-sucedido!</h2>
            <p>A conexão com Mailtrap está funcionando perfeitamente!</p>
          </div>
          
          <div style="background: #f5f5f5; padding: 20px; margin-top: 20px; border-radius: 8px;">
            <h3>📊 Detalhes da Configuração:</h3>
            <ul>
              <li><strong>Provedor:</strong> ${config.EMAIL_PROVIDER}</li>
              <li><strong>Host SMTP:</strong> ${config.MAILTRAP_HOST}</li>
              <li><strong>Porta:</strong> ${config.MAILTRAP_PORT}</li>
              <li><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666;">
            <p>Este é um email de teste automático do CRM Marketing</p>
            <p>Sistema funcionando em modo desenvolvimento com Mailtrap</p>
          </div>
        </div>
      `
    };
    
    log(colors.yellow, '⏳ Enviando email de teste...');
    const result = await transporter.sendMail(testEmail);
    
    log(colors.green, '✅ Email enviado com sucesso!');
    log(colors.cyan, `📧 Message ID: ${result.messageId}`);
    log(colors.cyan, `👀 Verifique seu inbox no Mailtrap para ver o email`);
    
    // 5. Resumo final
    logSection('RESUMO FINAL');
    log(colors.green, '🎉 MAILTRAP CONFIGURADO E FUNCIONANDO PERFEITAMENTE!');
    log(colors.blue, '\n📋 Próximos passos:');
    console.log('   1. ✅ Conexão testada e funcionando');
    console.log('   2. ✅ Email de teste enviado');
    console.log('   3. 👀 Verifique o email no seu inbox do Mailtrap');
    console.log('   4. 🚀 O sistema está pronto para enviar emails!');
    
  } catch (error) {
    log(colors.red, '❌ Erro na conexão SMTP:');
    log(colors.red, error.message);
    
    log(colors.yellow, '\n🛠️ Possíveis soluções:');
    console.log('   1. Verificar se MAILTRAP_USER e MAILTRAP_PASS estão corretos');
    console.log('   2. Verificar se o inbox no Mailtrap está ativo');
    console.log('   3. Verificar se não há caracteres especiais nas credenciais');
    console.log('   4. Tentar recriar as credenciais no Mailtrap');
  }
}

// Executar teste
if (require.main === module) {
  testMailtrapConnection().catch(console.error);
}

module.exports = { testMailtrapConnection }; 
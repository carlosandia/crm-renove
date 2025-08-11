const nodemailer = require('nodemailer');

console.log('🔧 Iniciando teste SMTP KingHost...');
console.log('📋 Versão Nodemailer:', require('nodemailer/package.json').version);

const transporter = nodemailer.createTransport({
  host: 'smtpi.uni5.net',
  port: 587,
  secure: false, // true para 465, false para outras portas
  auth: { 
    user: 'noreply@renovedigital.com.br', 
    pass: 'Renove@2025' 
  },
  tls: {
    servername: 'smtpi.uni5.net',
    ciphers: 'ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:\!aNULL:\!MD5:\!DSS',
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },
  connectionTimeout: 60000,    // 60 segundos
  greetingTimeout: 30000,      // 30 segundos
  socketTimeout: 60000,        // 60 segundos
  debug: true,
  logger: console
});

console.log('🧪 Executando transporter.verify()...');

const startTime = Date.now();

transporter.verify()
  .then(() => {
    const verifyTime = Date.now() - startTime;
    console.log(`✅ SMTP KINGHOST VERIFY OK em ${verifyTime}ms - Servidor aceita conexão`);
    
    console.log('📧 Testando envio real...');
    const sendStartTime = Date.now();
    
    return transporter.sendMail({
      from: '"Renove Digital" <noreply@renovedigital.com.br>',
      to: 'noreply@renovedigital.com.br',
      subject: 'Teste SMTP KingHost - ' + new Date().toISOString(),
      text: 'Teste de conectividade SMTP KingHost executado em ' + new Date(),
      html: '<p>Teste de conectividade SMTP KingHost executado em <strong>' + new Date() + '</strong></p>'
    }).then(info => ({ info, sendTime: Date.now() - sendStartTime }));
  })
  .then(({ info, sendTime }) => {
    console.log('✅ EMAIL ENVIADO COM SUCESSO\!');
    console.log(`⏱️  Tempo de envio: ${sendTime}ms`);
    console.log('📧 Message ID:', info.messageId);
    console.log('📤 Response:', info.response);
    console.log(`⏱️  Tempo total: ${Date.now() - startTime}ms`);
  })
  .catch(err => {
    const failTime = Date.now() - startTime;
    console.log('❌ ERRO SMTP após', failTime + 'ms');
    console.log('🔍 Mensagem:', err.message);
    console.log('🔍 Código:', err.code);
    console.log('🔍 Comando:', err.command);
    console.log('🔍 Stack:', err.stack?.split('\n')[0]);
    
    // Análise específica do erro
    if (err.code === 'ETIMEDOUT') {
      console.log('💡 Diagnóstico: Timeout de rede - servidor lento ou firewall');
    } else if (err.code === 'ENOTFOUND') {
      console.log('💡 Diagnóstico: DNS não resolve - problema de conectividade');
    } else if (err.code === 'ECONNREFUSED') {
      console.log('💡 Diagnóstico: Conexão recusada - porta bloqueada');
    } else if (err.code === 'EAUTH') {
      console.log('💡 Diagnóstico: Credenciais inválidas');
    }
  });

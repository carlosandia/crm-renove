const nodemailer = require('nodemailer');

console.log('🔧 Iniciando teste SMTP KingHost...');

const transporter = nodemailer.createTransporter({
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

transporter.verify()
  .then(() => {
    console.log('✅ SMTP KINGHOST VERIFY OK - Servidor aceita conexão');
    
    console.log('📧 Testando envio real...');
    return transporter.sendMail({
      from: '"Renove Digital" <noreply@renovedigital.com.br>',
      to: 'noreply@renovedigital.com.br',
      subject: 'Teste SMTP KingHost - ' + new Date().toISOString(),
      text: 'Teste de conectividade SMTP KingHost executado em ' + new Date(),
      html: '<p>Teste de conectividade SMTP KingHost executado em <strong>' + new Date() + '</strong></p>'
    });
  })
  .then(info => {
    console.log('✅ EMAIL ENVIADO COM SUCESSO\!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📤 Response:', info.response);
  })
  .catch(err => {
    console.log('❌ ERRO SMTP:', err.message);
    console.log('🔍 Código:', err.code);
    console.log('🔍 Comando:', err.command);
    console.log('🔍 Stack:', err.stack?.split('\n')[0]);
  });

const nodemailer = require('nodemailer');

console.log('🔧 TESTE ALTERNATIVO - Porta 465 SSL + Timeouts Estendidos');

const transporter = nodemailer.createTransport({
  host: 'smtpi.uni5.net',
  port: 465,
  secure: true, // SSL direto para porta 465
  auth: { 
    user: 'noreply@renovedigital.com.br', 
    pass: 'Renove@2025' 
  },
  tls: {
    servername: 'smtpi.uni5.net',
    rejectUnauthorized: false,  // Aceitar certificados auto-assinados
    ciphers: 'ALL'              // Máxima compatibilidade
  },
  connectionTimeout: 180000,   // 3 minutos (KingHost corporativo)
  greetingTimeout: 120000,     // 2 minutos
  socketTimeout: 240000,       // 4 minutos  
  debug: true,
  logger: console
});

console.log('🧪 Testando porta 465 SSL...');

const startTime = Date.now();

transporter.verify()
  .then(() => {
    const verifyTime = Date.now() - startTime;
    console.log(`✅ PORTA 465 SSL FUNCIONA em ${verifyTime}ms\!`);
    console.log('🎉 CONFIGURAÇÃO VÁLIDA ENCONTRADA\!');
  })
  .catch(err => {
    const failTime = Date.now() - startTime;
    console.log('❌ PORTA 465 também falhou após', failTime + 'ms');
    console.log('🔍 Erro:', err.message);
    console.log('🔍 Código:', err.code);
    
    console.log('');
    console.log('🔬 ANÁLISE FINAL:');
    if (err.code === 'ETIMEDOUT') {
      console.log('❌ Conclusão: Servidor KingHost inacessível desta rede');
      console.log('💡 Possível causa: Firewall/proxy corporativo bloqueando SMTP');
      console.log('🛠️  Soluções: 1) VPN, 2) Rede diferente, 3) Configurar proxy');
    }
  });

// Teste de servidor super simples para debug
const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`📥 Request recebido: ${req.method} ${req.url}`);
  
  res.writeHead(200, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  
  res.end(JSON.stringify({ 
    status: 'ok', 
    message: 'Servidor de teste funcionando',
    timestamp: new Date().toISOString()
  }));
});

const PORT = 3002; // Usar porta diferente para teste

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor de teste rodando na porta ${PORT}`);
  console.log(`🔗 Teste: http://127.0.0.1:${PORT}`);
});

server.on('error', (err) => {
  console.error('❌ Erro servidor:', err);
});

// Testar se o servidor está realmente escutando
setTimeout(() => {
  console.log('🧪 Testando própria conexão...');
  const testReq = http.request(`http://127.0.0.1:${PORT}`, (res) => {
    console.log(`✅ Auto-teste bem-sucedido! Status: ${res.statusCode}`);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(`📄 Resposta: ${data}`));
  });
  
  testReq.on('error', (err) => {
    console.error('❌ Auto-teste falhou:', err.message);
  });
  
  testReq.end();
}, 2000);
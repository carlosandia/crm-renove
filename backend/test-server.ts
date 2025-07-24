import express from 'express';

const app = express();
const PORT = 3002; // usar porta diferente para teste

app.get('/ping', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Servidor de teste rodando em http://127.0.0.1:${PORT}`);
  console.log(`🔗 Teste: http://127.0.0.1:${PORT}/ping`);
});
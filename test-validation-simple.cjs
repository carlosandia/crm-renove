/**
 * TESTE SIMPLES DE VALIDAÇÃO DE PIPELINE VIA API
 */

const http = require('http');

// Simular chamada para API de validação
function testValidationAPI(name, callback) {
  const data = new URLSearchParams({
    name: name
  });

  const options = {
    hostname: '127.0.0.1',
    port: 3001,
    path: `/api/pipelines/validate-name?${data}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Simulando um token de autenticação - substitua por um token real
      'Authorization': 'Bearer test-token'
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(body);
        callback(null, { statusCode: res.statusCode, data: result });
      } catch (error) {
        callback(error, null);
      }
    });
  });

  req.on('error', (error) => {
    callback(error, null);
  });

  req.end();
}

async function runTests() {
  console.log('🧪 TESTE DE VALIDAÇÃO DE PIPELINE VIA API\n');

  const testCases = [
    { name: 'Pipeline Teste Único', description: 'Nome único' },
    { name: '', description: 'Nome vazio' },
    { name: '   ', description: 'Apenas espaços' },
    { name: 'Pipeline de Vendas', description: 'Nome comum' }
  ];

  for (const testCase of testCases) {
    console.log(`📋 TESTE: ${testCase.description}`);
    console.log(`   Nome: "${testCase.name}"`);
    
    try {
      await new Promise((resolve, reject) => {
        testValidationAPI(testCase.name, (error, result) => {
          if (error) {
            console.log(`   ❌ Erro: ${error.message}`);
            reject(error);
          } else {
            console.log(`   ✅ Status: ${result.statusCode}`);
            console.log(`   📋 Resposta:`, JSON.stringify(result.data, null, 4));
            resolve();
          }
        });
      });
    } catch (error) {
      console.log(`   ❌ Falhou: ${error.message}`);
    }
    
    console.log(''); // Linha em branco entre testes
  }

  console.log('🎉 TESTES CONCLUÍDOS\n');
  
  // Verificar se a validação básica está funcionando
  console.log('📊 RESUMO ESPERADO:');
  console.log('✅ Nomes únicos devem retornar is_valid: true');
  console.log('❌ Nomes vazios devem retornar is_valid: false');
  console.log('❌ Nomes duplicados devem retornar is_valid: false com sugestão');
  console.log('🔧 Sistema deve ser case-insensitive e trim automático');
}

runTests().catch(console.error);
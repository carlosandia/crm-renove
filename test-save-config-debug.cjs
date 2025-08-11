#!/usr/bin/env node

/**
 * 🧪 TESTE DE DEBUG: Simular o problema de save-config 400 Bad Request
 * Reproduzir exatamente o que o frontend envia para encontrar o problema
 */

const fetch = require('node-fetch');

console.log('🧪 TESTE DEBUG: Endpoint save-config 400 Bad Request');
console.log('===============================================');
console.log('');

// Dados que o EmailPersonalTab.tsx enviaria
const testCases = [
  {
    name: 'Caso 1: Dados válidos completos',
    data: {
      host: 'smtp.gmail.com',
      port: 587,
      user: 'test@gmail.com',
      password: 'app-password-123'
    }
  },
  {
    name: 'Caso 2: Campo host vazio',
    data: {
      host: '',
      port: 587,
      user: 'test@gmail.com', 
      password: 'app-password-123'
    }
  },
  {
    name: 'Caso 3: Campo port zero',
    data: {
      host: 'smtp.gmail.com',
      port: 0,
      user: 'test@gmail.com',
      password: 'app-password-123'
    }
  },
  {
    name: 'Caso 4: Campo user vazio',
    data: {
      host: 'smtp.gmail.com',
      port: 587,
      user: '',
      password: 'app-password-123'
    }
  },
  {
    name: 'Caso 5: Campo password vazio',
    data: {
      host: 'smtp.gmail.com',
      port: 587,
      user: 'test@gmail.com',
      password: ''
    }
  },
  {
    name: 'Caso 6: Port como string (possível bug TypeScript)',
    data: {
      host: 'smtp.gmail.com',
      port: "587",  // String em vez de number
      user: 'test@gmail.com',
      password: 'app-password-123'
    }
  }
];

async function testEndpoint(testCase) {
  console.log(`📋 ${testCase.name}:`);
  console.log('   Payload:', JSON.stringify(testCase.data, null, 2));
  
  try {
    const response = await fetch('http://127.0.0.1:3001/api/simple-email/save-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCase.data)
    });
    
    const result = await response.text();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${result}`);
    
    if (response.status === 400) {
      console.log(`   ❌ Este caso gera 400 Bad Request!`);
    } else {
      console.log(`   ✅ Status diferente: ${response.status}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Erro na requisição: ${error.message}`);
  }
  
  console.log('');
}

async function runTests() {
  for (const testCase of testCases) {
    await testEndpoint(testCase);
  }
  
  console.log('🎯 TESTE CONCLUÍDO');
  console.log('================');
}

// Executar testes
runTests();
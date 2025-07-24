#!/usr/bin/env node

/**
 * GERADOR DE TOKEN DEMO PARA TESTES
 * 
 * Este script gera um token JWT demo válido para uso em testes
 * quando o token real está expirado.
 */

const jwt = require('jsonwebtoken');

// Dados do usuário demo
const demoUser = {
  id: '5ff91d1b-aab4-426d-b4b5-d14693f41d92',
  email: 'teste3@email.com',
  tenant_id: 'cd6c3df4-3dc9-4c10-ad23-f1a4b4b45e63',
  role: 'admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
};

// Secret do JWT (deve ser o mesmo usado no backend)
const JWT_SECRET = 'b8JJePxoHsEJnrNJJnjGryTttSMkkrvQenegQJ2Y3IOfWJNZ9TW7nMvfz0hEWxR4';

// Gerar token
const token = jwt.sign(demoUser, JWT_SECRET);

console.log('🎫 Token demo gerado:');
console.log('📋 Dados do usuário:', demoUser);
console.log('🔑 Token JWT:', token);
console.log('⏰ Válido até:', new Date(demoUser.exp * 1000).toLocaleString());

// Validar token
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ Token validado com sucesso:', decoded);
} catch (error) {
  console.error('❌ Erro ao validar token:', error.message);
}

// Instruções de uso
console.log('\n📝 Como usar:');
console.log('1. Copie o token JWT acima');
console.log('2. Substitua no arquivo test-pipeline-api.js');
console.log('3. Execute: node test-pipeline-api.js');
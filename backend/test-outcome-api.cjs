#!/usr/bin/env node

/**
 * TESTE OUTCOME REASONS API
 * 
 * Testa se o endpoint de outcome reasons está funcionando corretamente
 */

const jwt = require('jsonwebtoken');
const https = require('https');

// Payload JWT correto conforme interface JWTPayload
const testUser = {
  userId: 'bbaf8441-23c9-44dc-9a4c-a4da787f829c',
  email: 'seraquevai@seraquevai.com',
  tenantId: 'd7caffc1-c923-47c8-9301-ca9eeff1a243',
  role: 'admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
};

// Secret do JWT (mesmo do backend)
const JWT_SECRET = 'b8JJePxoHsEJnrNJJnjGryTttSMkkrvQenegQJ2Y3IOfWJNZ9TW7nMvfz0hEWxR4';

// Pipeline ID do "new13"
const PIPELINE_ID = 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8';

// Usar token demo que o middleware aceita
const token = 'demo_' + Date.now();

console.log('🎫 Testing Outcome Reasons API...');
console.log('👤 User:', testUser.email);
console.log('🏢 Tenant ID:', testUser.tenantId);
console.log('🔄 Pipeline ID:', PIPELINE_ID);
console.log('🔑 Token gerado:', token.substring(0, 50) + '...');

// Validar token localmente
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ Token validado localmente:', JSON.stringify(decoded, null, 2));
} catch (error) {
  console.error('❌ Erro na validação local:', error.message);
}

// Fazer request HTTP com headers demo
const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: `/api/outcome-reasons?pipeline_id=${PIPELINE_ID}&reason_type=all&active_only=true`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-User-ID': testUser.userId,
    'X-User-Role': testUser.role,
    'X-Tenant-ID': testUser.tenantId
  }
};

const req = require('http').request(options, (res) => {
  console.log('📊 Status Code:', res.statusCode);
  console.log('📋 Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('📦 Response Data:');
      console.log(JSON.stringify(parsed, null, 2));
    } catch (error) {
      console.log('📦 Raw Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request Error:', error);
});

req.end();
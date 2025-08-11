#!/usr/bin/env node

// ✅ INVESTIGAÇÃO FORENSE REAL - TESTE ESPECÍFICO DO ERRO 400 BAD REQUEST
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testWithRealAuth() {
  console.log('🔍 TESTE FORENSE - REPRODUZINDO ERRO 400 BAD REQUEST');
  console.log('=' .repeat(60));

  // Fazer login com credenciais reais
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'seraquevai@seraquevai.com',
    password: 'seraseraseranao'
  });

  if (error) {
    console.error('❌ Erro de autenticação:', error);
    return;
  }

  const session = data.session;
  if (!session) {
    console.error('❌ Sessão não encontrada');
    return;
  }

  console.log('✅ Autenticação bem-sucedida');
  console.log('👤 Usuário:', data.user.email);
  console.log('🆔 Tenant ID:', data.user.user_metadata?.tenant_id);
  console.log('');

  // Agora testar com token real
  const token = session.access_token;

  console.log('🧪 TESTE 1: Cenário que DEVERIA funcionar (dados válidos)');
  console.log('-'.repeat(50));

  const testConfig1 = {
    host: "smtp.gmail.com",
    port: 587,
    user: "teste@gmail.com", 
    password: "app_password_123"
  };

  console.log('📤 Payload:', testConfig1);

  try {
    const response1 = await fetch('http://127.0.0.1:8080/api/simple-email/save-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testConfig1)
    });

    const result1 = await response1.text();
    console.log('📨 Status:', response1.status);
    console.log('📄 Resposta:', result1);
  } catch (e) {
    console.error('❌ Erro na requisição:', e.message);
  }

  console.log('');
  console.log('🧪 TESTE 2: Cenário que pode gerar 400 (campo vazio)');
  console.log('-'.repeat(50));

  const testConfig2 = {
    host: "",  // Campo vazio
    port: 587,
    user: "teste@gmail.com",
    password: "app_password_123"
  };

  console.log('📤 Payload:', testConfig2);

  try {
    const response2 = await fetch('http://127.0.0.1:8080/api/simple-email/save-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testConfig2)
    });

    const result2 = await response2.text();
    console.log('📨 Status:', response2.status);
    console.log('📄 Resposta:', result2);

    if (response2.status === 400) {
      console.log('🎯 ENCONTRADO! Erro 400 reproduzido com campo vazio');
    }
  } catch (e) {
    console.error('❌ Erro na requisição:', e.message);
  }

  console.log('');
  console.log('🧪 TESTE 3: Cenário com port inválido');
  console.log('-'.repeat(50));

  const testConfig3 = {
    host: "smtp.gmail.com",
    port: null,  // Port nulo
    user: "teste@gmail.com",
    password: "app_password_123"
  };

  console.log('📤 Payload:', testConfig3);

  try {
    const response3 = await fetch('http://127.0.0.1:8080/api/simple-email/save-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testConfig3)
    });

    const result3 = await response3.text();
    console.log('📨 Status:', response3.status);
    console.log('📄 Resposta:', result3);

    if (response3.status === 400) {
      console.log('🎯 ENCONTRADO! Erro 400 reproduzido com port nulo');
    }
  } catch (e) {
    console.error('❌ Erro na requisição:', e.message);
  }

  console.log('');
  console.log('=' .repeat(60));
}

testWithRealAuth().catch(console.error);
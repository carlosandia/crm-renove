/**
 * SCRIPT PARA CORRIGIR TOKEN NO FRONTEND
 * 
 * Este script configura o localStorage com o token válido
 * para testar a visualização do kanban
 */

// Dados do usuário correto
const userData = {
  id: 'bbaf8441-23c9-44dc-9a4c-a4da787f829c',
  email: 'seraquevai@seraquevai.com',
  role: 'admin',
  tenant_id: 'd7caffc1-c923-47c8-9301-ca9eeff1a243',
  first_name: 'Sera',
  last_name: 'Que Vai',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiYmFmODQ0MS0yM2M5LTQ0ZGMtOWE0Yy1hNGRhNzg3ZjgyOWMiLCJlbWFpbCI6InNlcmFxdWV2YWlAc2VyYXF1ZXZhaS5jb20iLCJ0ZW5hbnRJZCI6ImQ3Y2FmZmMxLWM5MjMtNDdjOC05MzAxLWNhOWVlZmYxYTI0MyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MjY5MjE1MCwiZXhwIjoxNzUyNzc4NTUwfQ.TKx50lINcBAWAuaP2JQF8ERY011toPNuskCFALRso7s'
};

// Pipeline válida para teste
const pipelineData = {
  id: 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8',
  name: 'new13',
  tenant_id: 'd7caffc1-c923-47c8-9301-ca9eeff1a243'
};

console.log('📋 Dados para configurar no localStorage:');
console.log('localStorage.setItem("crm_user", JSON.stringify(userData));');
console.log('localStorage.setItem("access_token", userData.token);');
console.log('sessionStorage.setItem("crm_access_token", userData.token);');

console.log('\n🧪 Para testar:');
console.log('1. Abra o DevTools do navegador');
console.log('2. Vá para a aba Console');
console.log('3. Execute os comandos acima');
console.log('4. Navegue para a pipeline:', pipelineData.name);
console.log('5. URL: http://localhost:8080/pipeline/' + pipelineData.id);

console.log('\n✅ Dados corretos configurados!');
console.log('User ID:', userData.id);
console.log('Email:', userData.email);
console.log('Role:', userData.role);
console.log('Tenant ID:', userData.tenant_id);
console.log('Pipeline ID:', pipelineData.id);
console.log('Pipeline Name:', pipelineData.name);
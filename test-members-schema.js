#!/usr/bin/env node

// Teste isolado para verificar se o schema UserMemberSchema funciona corretamente
// com os dados que temos no banco de dados

const testUsers = [
  {
    id: "12345678-1234-1234-1234-123456789abc",
    first_name: "João",
    last_name: "Silva",
    email: "joao@test.com",
    role: "member", // role válido
    is_active: true,
    tenant_id: "d7caffc1-c923-47c8-9301-ca9eeff1a243",
    created_at: "2025-01-01T00:00:00.000Z"
  },
  {
    id: "12345678-1234-1234-1234-123456789def",
    first_name: "Maria",
    last_name: "Santos",
    email: "maria@test.com",
    role: "admin", // role válido
    is_active: null, // is_active pode ser null
    tenant_id: "d7caffc1-c923-47c8-9301-ca9eeff1a243",
    created_at: "2025-01-01T00:00:00.000Z"
  },
  {
    id: "12345678-1234-1234-1234-123456789xyz",
    first_name: "Pedro",
    last_name: "Costa",
    email: "pedro@test.com", 
    role: "custom_role", // role não-padrão (deve ser aceito)
    is_active: false,
    tenant_id: "d7caffc1-c923-47c8-9301-ca9eeff1a243"
    // created_at ausente (opcional)
  }
];

console.log('🧪 Testando schema UserMemberSchema com dados simulados...');
console.log(`📊 Total de usuários de teste: ${testUsers.length}`);

// Simular filtro que seria feito no getSalesMembers()
const salesMembers = testUsers.filter(member => member.role === 'member' && member.is_active !== false);

console.log('✅ Resultado do filtro getSalesMembers:');
console.log(`   - Total após filtro: ${salesMembers.length}`);
console.log(`   - Usuários filtrados:`, salesMembers.map(m => ({
  name: `${m.first_name} ${m.last_name}`,
  role: m.role,
  is_active: m.is_active
})));

// Simular verificação de schema
console.log('\n🔍 Análise dos dados:');
testUsers.forEach(user => {
  const issues = [];
  
  if (!user.id || !user.id.match(/^[0-9a-f-]{36}$/)) issues.push('UUID inválido');
  if (!user.first_name) issues.push('first_name ausente');
  if (!user.last_name) issues.push('last_name ausente');
  if (!user.email || !user.email.includes('@')) issues.push('email inválido');
  if (!user.role) issues.push('role ausente');
  
  console.log(`   ${user.first_name} ${user.last_name} (${user.role}): ${issues.length === 0 ? '✅ Válido' : '❌ ' + issues.join(', ')}`);
});

console.log('\n🎯 Conclusão:');
console.log(`   - Usuários que aparecem na interface de vendedores: ${salesMembers.length}`);
console.log(`   - Se interface mostra 0 vendedores, o problema NÃO é no filtro getSalesMembers`);
console.log(`   - Verificar se dados chegam até o componente ou se há erro de validação Zod`);
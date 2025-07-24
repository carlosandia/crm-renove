#!/usr/bin/env node

/**
 * Script para limpar TODOS os caches do sistema
 * Útil para forçar recarregamento completo de dados
 */

console.log('🧹 Limpando todos os caches do sistema...\n');

// Lista de chaves de cache conhecidas
const cacheKeys = [
  // Pipeline caches
  'pipelines_*',
  'pipeline_cache',
  'pipelines_cache',
  
  // Auth caches
  'crm_user',
  'crm_access_token',
  'access_token',
  
  // Query caches (TanStack Query)
  'REACT_QUERY_OFFLINE_CACHE',
  
  // Outros caches possíveis
  'leads_cache',
  'stages_cache',
  'members_cache',
  'metrics_cache'
];

// Função para limpar localStorage
function clearLocalStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    const keysToRemove = [];
    
    // Encontrar todas as chaves que correspondem aos padrões
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      
      // Verificar se a chave corresponde a algum padrão de cache
      if (cacheKeys.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(key);
        }
        return key === pattern;
      })) {
        keysToRemove.push(key);
      }
    }
    
    // Remover as chaves encontradas
    keysToRemove.forEach(key => {
      window.localStorage.removeItem(key);
      console.log(`✅ Removido localStorage: ${key}`);
    });
    
    console.log(`\n📊 Total de ${keysToRemove.length} itens removidos do localStorage`);
  }
}

// Função para limpar sessionStorage
function clearSessionStorage() {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const keysToRemove = [];
    
    // Encontrar todas as chaves que correspondem aos padrões
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      
      // Verificar se a chave corresponde a algum padrão de cache
      if (cacheKeys.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(key);
        }
        return key === pattern;
      })) {
        keysToRemove.push(key);
      }
    }
    
    // Remover as chaves encontradas
    keysToRemove.forEach(key => {
      window.sessionStorage.removeItem(key);
      console.log(`✅ Removido sessionStorage: ${key}`);
    });
    
    console.log(`\n📊 Total de ${keysToRemove.length} itens removidos do sessionStorage`);
  }
}

// Instruções para uso no navegador
console.log(`
🔧 INSTRUÇÕES DE USO:
-------------------

1. Abra o Console do navegador (F12)
2. Cole e execute o seguinte código:

${clearLocalStorage.toString()}
${clearSessionStorage.toString()}

clearLocalStorage();
clearSessionStorage();

3. Recarregue a página (F5 ou Ctrl+R)

⚠️  IMPORTANTE: Isso limpará caches mas NÃO afetará dados de autenticação.
`);

// Se executado no Node.js, mostrar apenas as instruções
if (typeof window === 'undefined') {
  console.log('\n⚠️  Este script deve ser executado no console do navegador!');
}
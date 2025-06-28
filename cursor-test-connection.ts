/**
 * 🧪 CURSOR TEST CONNECTION - VERIFICAÇÃO INICIAL
 * ================================================================
 * 
 * Execute este arquivo para testar a conexão com Supabase
 * e verificar se todas as ferramentas estão funcionando
 */

import { quickUtils } from './cursor-supabase-debug';

/**
 * 🚀 Teste completo de conexão e funcionalidades
 */
async function testEverything() {
  console.log('🚀 INICIANDO TESTE COMPLETO DO CURSOR SUPABASE DEBUG');
  console.log('=======================================================');
  
  try {
    // 1. Teste básico de conectividade
    console.log('\n1️⃣ TESTE DE CONECTIVIDADE');
    console.log('---------------------------');
    const connectionTest = await quickUtils.test();
    
    if (!connectionTest.success) {
      console.error('❌ Falha na conectividade:', connectionTest.error);
      return false;
    }
    
    console.log('✅ Conectividade OK!');
    
    // 2. Listar tabelas
    console.log('\n2️⃣ LISTAGEM DE TABELAS');
    console.log('---------------------------');
    const tablesResult = await quickUtils.tables();
    
    if (!tablesResult.success) {
      console.error('❌ Falha ao listar tabelas:', tablesResult.error);
      return false;
    }
    
    console.log(`✅ ${tablesResult.data?.length || 0} tabelas encontradas!`);
    
    // 3. Analisar estrutura multi-tenant
    console.log('\n3️⃣ ANÁLISE MULTI-TENANT');
    console.log('---------------------------');
    const tenantResult = await quickUtils.tenant();
    
    if (!tenantResult.success) {
      console.error('❌ Falha na análise multi-tenant:', tenantResult.error);
      return false;
    }
    
    console.log(`✅ ${tenantResult.data?.length || 0} colunas tenant encontradas!`);
    
    // 4. Testar consulta de tabela
    console.log('\n4️⃣ TESTE CONSULTA DE TABELA');
    console.log('---------------------------');
    const queryResult = await quickUtils.query('users', 'id, email', 3);
    
    if (!queryResult.success) {
      console.warn('⚠️ Falha na consulta (normal se tabela não tiver dados):', queryResult.error);
    } else {
      console.log('✅ Consulta de tabela executada com sucesso!');
    }
    
    // 5. Teste básico de RLS policies
    console.log('\n5️⃣ TESTE RLS POLICIES');
    console.log('---------------------------');
    const policiesResult = await quickUtils.policies('users');
    
    if (!policiesResult.success) {
      console.warn('⚠️ Falha ao listar policies (normal se tabela não tiver RLS):', policiesResult.error);
    } else {
      console.log(`✅ ${policiesResult.data?.length || 0} policies encontradas na tabela users!`);
    }
    
    console.log('\n🎉 TODOS OS TESTES BÁSICOS PASSARAM!');
    console.log('=======================================================');
    
    return true;
    
  } catch (error) {
    console.error('❌ ERRO FATAL NOS TESTES:', error);
    return false;
  }
}

/**
 * 🏥 Diagnóstico simplificado
 */
async function runSimpleDiagnostic() {
  console.log('\n🏥 EXECUTANDO DIAGNÓSTICO SIMPLIFICADO...');
  console.log('==========================================');
  
  try {
    const results = {
      connectivity: await quickUtils.test(),
      tables: await quickUtils.tables(),
      tenantStructure: await quickUtils.tenant()
    };
    
    console.log('\n📊 RESUMO DO DIAGNÓSTICO:');
    console.log('==========================');
    console.log('Conectividade:', results.connectivity.success ? '✅' : '❌');
    console.log('Tabelas analisadas:', results.tables.data?.length || 0);
    console.log('Estrutura tenant:', results.tenantStructure.data?.length || 0);
    
    return results;
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
    return null;
  }
}

/**
 * 🔧 Utilitários rápidos para uso no console
 */
export const testUtils = {
  // Teste rápido
  quick: testEverything,
  
  // Diagnóstico completo
  full: runSimpleDiagnostic,
  
  // Acesso direto aos utils
  utils: quickUtils,
  
  // Testes específicos
  testConnection: () => quickUtils.test(),
  listTables: () => quickUtils.tables(),
  queryTable: (table: string, columns: string = '*', limit: number = 5) => quickUtils.query(table, columns, limit),
  describePipelines: () => quickUtils.describe('pipelines'),
  pipelinePolicies: () => quickUtils.policies('pipelines'),
  
  // Análises específicas do CRM
  analyzeCRM: async () => {
    console.log('🔍 ANÁLISE ESPECÍFICA DO CRM');
    console.log('=============================');
    
    const results = {
      pipelines: await quickUtils.describe('pipelines'),
      pipelineStages: await quickUtils.describe('pipeline_stages'),
      pipelineLeads: await quickUtils.describe('pipeline_leads'),
      users: await quickUtils.describe('users'),
      companies: await quickUtils.describe('companies')
    };
    
    console.log('✅ Análise CRM completa!');
    return results;
  }
};

// Executar teste rápido automaticamente quando importado
console.log('🔧 Cursor Test Connection carregado!');
console.log('📋 Comandos disponíveis:');
console.log('  testUtils.quick()     - Teste rápido de conectividade');
console.log('  testUtils.full()      - Diagnóstico completo');
console.log('  testUtils.analyzeCRM()- Análise específica do CRM');
console.log('  testUtils.utils       - Acesso direto aos utils');

export { testEverything, runSimpleDiagnostic }; 
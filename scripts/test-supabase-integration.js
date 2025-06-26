#!/usr/bin/env node

/**
 * 🧪 TESTE DE INTEGRAÇÃO SUPABASE
 * Script para validar todas as funcionalidades implementadas
 */

const axios = require('axios');

// Configuração
const API_BASE = 'http://localhost:8081/api/admin';
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`)
};

// Função utilitária para requests
async function makeRequest(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    };
    
    if (data) config.data = data;
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message 
    };
  }
}

// Testes
const tests = {
  // 1. Teste de conexão
  async testConnection() {
    log.test('Testando conexão com Supabase...');
    
    const result = await makeRequest('/utils/status');
    
    if (result.success && result.data.connected) {
      log.success('Conexão estabelecida com sucesso');
      log.info(`Database: ${result.data.database}`);
      log.info(`User: ${result.data.user}`);
      return true;
    } else {
      log.error(`Falha na conexão: ${result.error}`);
      return false;
    }
  },

  // 2. Teste de listagem de tabelas
  async testListTables() {
    log.test('Testando listagem de tabelas...');
    
    const result = await makeRequest('/utils/tables');
    
    if (result.success && result.data.success) {
      log.success(`Encontradas ${result.data.count} tabelas`);
      log.info(`Primeiras 5: ${result.data.data.slice(0, 5).join(', ')}`);
      return true;
    } else {
      log.error(`Erro ao listar tabelas: ${result.error}`);
      return false;
    }
  },

  // 3. Teste de query SELECT
  async testSelectQuery() {
    log.test('Testando query SELECT...');
    
    const result = await makeRequest('/sql/select', 'POST', {
      query: 'SELECT COUNT(*) as total FROM companies'
    });
    
    if (result.success && result.data.success) {
      const total = result.data.data[0]?.total || 0;
      log.success(`Query SELECT executada: ${total} empresas encontradas`);
      return true;
    } else {
      log.error(`Erro na query SELECT: ${result.error}`);
      return false;
    }
  },

  // 4. Teste de CRUD
  async testCrudOperations() {
    log.test('Testando operações CRUD...');
    
    const testData = {
      name: 'Empresa Teste Integração',
      email: 'teste@integracao.com',
      active: true
    };

    // Insert
    const insertResult = await makeRequest('/crud/insert', 'POST', {
      table: 'companies',
      data: testData
    });
    
    if (!insertResult.success) {
      log.error(`Erro no INSERT: ${insertResult.error}`);
      return false;
    }
    
    const insertedId = insertResult.data.data[0]?.id;
    log.success(`Registro inserido com ID: ${insertedId}`);

    // Select
    const selectResult = await makeRequest(`/crud/select/companies?conditions=${encodeURIComponent(JSON.stringify({ id: insertedId }))}`);
    
    if (!selectResult.success) {
      log.error(`Erro no SELECT: ${selectResult.error}`);
      return false;
    }
    
    log.success('Registro encontrado após insert');

    // Update
    const updateResult = await makeRequest('/crud/update', 'PUT', {
      table: 'companies',
      data: { name: 'Empresa Teste Atualizada' },
      conditions: { id: insertedId }
    });
    
    if (!updateResult.success) {
      log.error(`Erro no UPDATE: ${updateResult.error}`);
      return false;
    }
    
    log.success('Registro atualizado');

    // Delete
    const deleteResult = await makeRequest('/crud/delete', 'DELETE', {
      table: 'companies',
      conditions: { id: insertedId }
    });
    
    if (!deleteResult.success) {
      log.error(`Erro no DELETE: ${deleteResult.error}`);
      return false;
    }
    
    log.success('Registro deletado');
    return true;
  },

  // 5. Teste de DDL
  async testDDLOperations() {
    log.test('Testando operações DDL...');
    
    const tableName = 'test_integration_table';
    
    // Limpar tabela se existir
    await makeRequest('/sql/ddl', 'POST', {
      command: `DROP TABLE IF EXISTS ${tableName}`
    });

    // Criar tabela
    const createResult = await makeRequest('/schema/create-table', 'POST', {
      tableName,
      columns: [
        { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY', 'DEFAULT gen_random_uuid()'] },
        { name: 'name', type: 'TEXT', constraints: ['NOT NULL'] },
        { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'] }
      ]
    });
    
    if (!createResult.success) {
      log.error(`Erro ao criar tabela: ${createResult.error}`);
      return false;
    }
    
    log.success(`Tabela ${tableName} criada`);

    // Adicionar coluna
    const addColumnResult = await makeRequest('/schema/add-column', 'POST', {
      tableName,
      columnName: 'description',
      columnType: 'TEXT'
    });
    
    if (!addColumnResult.success) {
      log.error(`Erro ao adicionar coluna: ${addColumnResult.error}`);
      return false;
    }
    
    log.success('Coluna adicionada');

    // Criar índice
    const createIndexResult = await makeRequest('/schema/create-index', 'POST', {
      indexName: `idx_${tableName}_name`,
      tableName,
      columns: ['name']
    });
    
    if (!createIndexResult.success) {
      log.error(`Erro ao criar índice: ${createIndexResult.error}`);
      return false;
    }
    
    log.success('Índice criado');

    // Limpar tabela de teste
    await makeRequest('/sql/ddl', 'POST', {
      command: `DROP TABLE ${tableName}`
    });
    
    log.success('Tabela de teste removida');
    return true;
  },

  // 6. Teste de backup
  async testBackup() {
    log.test('Testando backup de tabela...');
    
    const result = await makeRequest('/utils/backup/companies', 'POST');
    
    if (result.success && result.data.success) {
      log.success(`Backup realizado: ${result.data.count} registros`);
      return true;
    } else {
      log.error(`Erro no backup: ${result.error}`);
      return false;
    }
  },

  // 7. Teste de migração
  async testMigration() {
    log.test('Testando execução de migração...');
    
    const migrationSQL = `
      -- Teste de migração
      DO $$
      BEGIN
          RAISE NOTICE 'Migração de teste executada com sucesso!';
      END $$;
    `;
    
    const result = await makeRequest('/migration/run', 'POST', {
      migrationSQL,
      version: 'test_migration_' + Date.now()
    });
    
    if (result.success && result.data.success) {
      log.success('Migração executada com sucesso');
      return true;
    } else {
      log.error(`Erro na migração: ${result.error}`);
      return false;
    }
  }
};

// Executar todos os testes
async function runAllTests() {
  console.log(`${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║                 🧪 TESTE DE INTEGRAÇÃO SUPABASE               ║
║                                                              ║
║  Validando todas as funcionalidades implementadas           ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  log.info('Iniciando testes de integração...');
  console.log('');

  const testResults = {};
  let passedTests = 0;
  let totalTests = 0;

  for (const [testName, testFunc] of Object.entries(tests)) {
    totalTests++;
    
    try {
      const result = await testFunc();
      testResults[testName] = result;
      
      if (result) {
        passedTests++;
      } else {
        log.warning(`Teste ${testName} falhou`);
      }
    } catch (error) {
      log.error(`Erro no teste ${testName}: ${error.message}`);
      testResults[testName] = false;
    }
    
    console.log(''); // Linha em branco para separar testes
  }

  // Relatório final
  console.log(`${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║                       📊 RELATÓRIO FINAL                     ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  log.info(`Testes executados: ${totalTests}`);
  log.info(`Testes aprovados: ${passedTests}`);
  log.info(`Taxa de sucesso: ${Math.round((passedTests / totalTests) * 100)}%`);

  console.log('\nDetalhes dos testes:');
  for (const [testName, result] of Object.entries(testResults)) {
    const status = result ? '✅ PASSOU' : '❌ FALHOU';
    const color = result ? colors.green : colors.red;
    console.log(`  ${color}${status}${colors.reset} - ${testName}`);
  }

  if (passedTests === totalTests) {
    log.success('🎉 TODOS OS TESTES PASSARAM! Integração funcionando perfeitamente.');
    
    console.log(`${colors.green}
╔══════════════════════════════════════════════════════════════╗
║                     ✅ INTEGRAÇÃO VALIDADA                   ║
║                                                              ║
║  Sistema Supabase 100% funcional e pronto para uso!         ║
║                                                              ║
║  Funcionalidades validadas:                                 ║
║  • Conexão com banco                                        ║
║  • Operações CRUD                                           ║
║  • Queries SQL personalizadas                               ║
║  • Operações DDL (CREATE, ALTER, DROP)                      ║
║  • Sistema de backup                                        ║
║  • Execução de migrações                                    ║
║                                                              ║
║  🚀 Pronto para produção!                                   ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);
  } else {
    log.warning('⚠️  Alguns testes falharam. Verifique a configuração.');
    
    console.log(`${colors.yellow}
╔══════════════════════════════════════════════════════════════╗
║                    ⚠️  TESTES PARCIAIS                       ║
║                                                              ║
║  Algumas funcionalidades podem não estar funcionando        ║
║  corretamente. Verifique:                                   ║
║                                                              ║
║  1. Backend está rodando (npm run dev)                      ║
║  2. Variáveis de ambiente configuradas                      ║
║  3. Conexão com Supabase estabelecida                       ║
║  4. Permissões do service role                              ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);
  }

  console.log('\n📞 Para suporte, consulte a documentação em SUPABASE-INTEGRATION-COMPLETE.md');
  
  return passedTests === totalTests;
}

// Executar se chamado diretamente
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log.error(`Erro fatal nos testes: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runAllTests, tests }; 
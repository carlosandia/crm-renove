import express from 'express';
import { supabaseAdmin } from '../services/supabase-admin';

const router = express.Router();

/**
 * 🛠️ ROTAS ADMINISTRATIVAS DO SUPABASE
 * Permite execução de operações SQL e administrativas via API
 */

// ==========================================
// 1. EXECUÇÃO SQL DIRETA
// ==========================================

/**
 * POST /admin/sql/execute
 * Executar SQL personalizado
 */
router.post('/sql/execute', async (req, res) => {
  try {
    const { query, params = [] } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query SQL é obrigatória' 
      });
    }

    console.log('🔄 Executando SQL via API:', query.substring(0, 100) + '...');
    
    const result = await supabaseAdmin.executeRawSQL(query, params);
    
    res.json({
      success: true,
      data: result,
      executedAt: new Date().toISOString(),
      query: query.substring(0, 200) + '...'
    });
    
  } catch (error: any) {
    console.error('❌ Erro na execução SQL via API:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * POST /admin/sql/select
 * Executar query SELECT
 */
router.post('/sql/select', async (req, res) => {
  try {
    const { query, params = [] } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query SELECT é obrigatória' 
      });
    }

    const result = await supabaseAdmin.selectQuery(query, params);
    
    res.json({
      success: true,
      data: result,
      count: result.length,
      executedAt: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Erro na query SELECT via API:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * POST /admin/sql/ddl
 * Executar comandos DDL (CREATE, ALTER, DROP)
 */
router.post('/sql/ddl', async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ 
        success: false, 
        error: 'Comando DDL é obrigatório' 
      });
    }

    console.log('🔄 Executando DDL via API:', command.substring(0, 100) + '...');
    
    await supabaseAdmin.executeDDL(command);
    
    res.json({
      success: true,
      message: 'Comando DDL executado com sucesso',
      executedAt: new Date().toISOString(),
      command: command.substring(0, 200) + '...'
    });
    
  } catch (error: any) {
    console.error('❌ Erro na execução DDL via API:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

// ==========================================
// 2. OPERAÇÕES CRUD ADMINISTRATIVAS
// ==========================================

/**
 * POST /admin/crud/insert
 * Inserir dados com bypass de RLS
 */
router.post('/crud/insert', async (req, res) => {
  try {
    const { table, data } = req.body;
    
    if (!table || !data) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tabela e dados são obrigatórios' 
      });
    }

    const result = await supabaseAdmin.adminInsert(table, data);
    
    res.json({
      success: true,
      data: result,
      message: `Dados inseridos em ${table}`,
      count: Array.isArray(result) ? result.length : 1
    });
    
  } catch (error) {
    console.error('❌ Erro no insert via API:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * PUT /admin/crud/update
 * Atualizar dados com bypass de RLS
 */
router.put('/crud/update', async (req, res) => {
  try {
    const { table, data, conditions } = req.body;
    
    if (!table || !data || !conditions) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tabela, dados e condições são obrigatórios' 
      });
    }

    const result = await supabaseAdmin.adminUpdate(table, data, conditions);
    
    res.json({
      success: true,
      data: result,
      message: `Dados atualizados em ${table}`,
      count: Array.isArray(result) ? result.length : 1
    });
    
  } catch (error) {
    console.error('❌ Erro no update via API:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * DELETE /admin/crud/delete
 * Deletar dados com bypass de RLS
 */
router.delete('/crud/delete', async (req, res) => {
  try {
    const { table, conditions } = req.body;
    
    if (!table || !conditions) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tabela e condições são obrigatórias' 
      });
    }

    await supabaseAdmin.adminDelete(table, conditions);
    
    res.json({
      success: true,
      message: `Dados deletados de ${table}`
    });
    
  } catch (error) {
    console.error('❌ Erro no delete via API:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * GET /admin/crud/select/:table
 * Buscar dados com bypass de RLS
 */
router.get('/crud/select/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { 
      select, 
      conditions, 
      orderBy, 
      orderDirection = 'asc',
      limit, 
      offset 
    } = req.query;

    const options: any = {};
    
    if (select) options.select = select as string;
    if (conditions) options.conditions = JSON.parse(conditions as string);
    if (orderBy) {
      options.orderBy = {
        column: orderBy as string,
        ascending: orderDirection === 'asc'
      };
    }
    if (limit) options.limit = parseInt(limit as string);
    if (offset) options.offset = parseInt(offset as string);

    const result = await supabaseAdmin.adminSelect(table, options);
    
    res.json({
      success: true,
      data: result,
      count: result.length,
      table,
      options
    });
    
  } catch (error) {
    console.error('❌ Erro no select via API:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

// ==========================================
// 3. OPERAÇÕES DE SCHEMA
// ==========================================

/**
 * POST /admin/schema/create-table
 * Criar nova tabela
 */
router.post('/schema/create-table', async (req, res) => {
  try {
    const { tableName, columns } = req.body;
    
    if (!tableName || !columns) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nome da tabela e colunas são obrigatórios' 
      });
    }

    await supabaseAdmin.createTable(tableName, columns);
    
    res.json({
      success: true,
      message: `Tabela ${tableName} criada com sucesso`,
      tableName,
      columns
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela via API:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * POST /admin/schema/add-column
 * Adicionar coluna a tabela existente
 */
router.post('/schema/add-column', async (req, res) => {
  try {
    const { tableName, columnName, columnType, constraints = [] } = req.body;
    
    if (!tableName || !columnName || !columnType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nome da tabela, coluna e tipo são obrigatórios' 
      });
    }

    await supabaseAdmin.addColumn(tableName, columnName, columnType, constraints);
    
    res.json({
      success: true,
      message: `Coluna ${columnName} adicionada à tabela ${tableName}`,
      tableName,
      columnName,
      columnType
    });
    
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna via API:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * POST /admin/schema/create-index
 * Criar índice
 */
router.post('/schema/create-index', async (req, res) => {
  try {
    const { indexName, tableName, columns, unique = false } = req.body;
    
    if (!indexName || !tableName || !columns) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nome do índice, tabela e colunas são obrigatórios' 
      });
    }

    await supabaseAdmin.createIndex(indexName, tableName, columns, unique);
    
    res.json({
      success: true,
      message: `Índice ${indexName} criado na tabela ${tableName}`,
      indexName,
      tableName,
      columns,
      unique
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar índice via API:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

// ==========================================
// 4. MIGRAÇÕES E SEEDERS
// ==========================================

/**
 * POST /admin/migration/run
 * Executar migração
 */
router.post('/migration/run', async (req, res) => {
  try {
    const { migrationSQL, version } = req.body;
    
    if (!migrationSQL || !version) {
      return res.status(400).json({ 
        success: false, 
        error: 'SQL da migração e versão são obrigatórios' 
      });
    }

    await supabaseAdmin.runMigration(migrationSQL, version);
    
    res.json({
      success: true,
      message: `Migração ${version} executada com sucesso`,
      version,
      executedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro na migração via API:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * POST /admin/seeder/run
 * Executar seeder
 */
router.post('/seeder/run', async (req, res) => {
  try {
    const { seederName, seedData } = req.body;
    
    if (!seederName || !seedData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nome do seeder e dados são obrigatórios' 
      });
    }

    await supabaseAdmin.runSeeder(seederName, seedData);
    
    res.json({
      success: true,
      message: `Seeder ${seederName} executado com sucesso`,
      seederName,
      executedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro no seeder via API:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

// ==========================================
// 5. UTILITÁRIOS E MONITORAMENTO
// ==========================================

/**
 * GET /admin/utils/tables
 * Listar todas as tabelas
 */
router.get('/utils/tables', async (req, res) => {
  try {
    const tables = await supabaseAdmin.listTables();
    
    res.json({
      success: true,
      data: tables,
      count: tables.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar tabelas via API:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * GET /admin/utils/describe/:table
 * Descrever estrutura de uma tabela
 */
router.get('/utils/describe/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const structure = await supabaseAdmin.describeTable(table);
    
    res.json({
      success: true,
      data: structure,
      table,
      columns: structure.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao descrever tabela via API:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * GET /admin/utils/status
 * Status da conexão e sistema
 */
router.get('/utils/status', async (req, res) => {
  try {
    const status = await supabaseAdmin.getConnectionStatus();
    
    res.json({
      success: true,
      ...status
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar status via API:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * POST /admin/utils/backup/:table
 * Fazer backup de uma tabela
 */
router.post('/utils/backup/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const data = await supabaseAdmin.backupTable(table);
    
    res.json({
      success: true,
      data,
      table,
      count: data.length,
      backedUpAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro no backup via API:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});



export default router; 
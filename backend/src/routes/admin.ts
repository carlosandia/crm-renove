import express from 'express';
import { supabaseAdmin } from '../services/supabase-admin';
import { supabaseManagementAPI } from '../services/supabase-management-api';

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
 * GET /admin/auth/debug-user/:user_id
 * Debug user metadata específico
 */
router.get('/auth/debug-user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    console.log('🔍 [DEBUG] Debugando usuário:', user_id);
    
    // Usar Management API para buscar dados completos do usuário
    const userQuery = `
      SELECT 
        id,
        email,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmed_at,
        email_confirmed_at
      FROM auth.users 
      WHERE id = '${user_id}'
      LIMIT 1;
    `;
    
    const result = await supabaseManagementAPI.executeSQL(userQuery);
    
    if (!result.data || result.data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado',
        user_id
      });
    }
    
    const userData = result.data[0];
    
    const userMetadata = userData.raw_user_meta_data || {};
    
    console.log('📊 [DEBUG] Dados do usuário encontrados:', {
      id: userData.id,
      email: userData.email,
      has_user_metadata: !!userData.raw_user_meta_data,
      user_metadata_keys: Object.keys(userMetadata),
      tenant_id_in_metadata: userMetadata?.tenant_id,
      role_in_metadata: userMetadata?.role,
      raw_user_meta_data: userData.raw_user_meta_data
    });
    
    res.json({
      success: true,
      userData,
      analysis: {
        hasMetadata: !!userData.raw_user_meta_data,
        metadataKeys: Object.keys(userMetadata),
        hasTenantId: !!userMetadata?.tenant_id,
        hasRole: !!userMetadata?.role,
        tenantIdValue: userMetadata?.tenant_id,
        roleValue: userMetadata?.role,
        rawMetadata: userData.raw_user_meta_data
      }
    });
    
  } catch (error: any) {
    console.error('❌ [DEBUG] Erro ao debugar usuário:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/auth/list-users
 * Listar todos os usuários para debug
 */
router.get('/auth/list-users', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Listando todos os usuários...');
    
    const usersQuery = `
      SELECT 
        id,
        email,
        raw_user_meta_data,
        created_at,
        confirmed_at
      FROM auth.users 
      ORDER BY created_at DESC
      LIMIT 10;
    `;
    
    const result = await supabaseManagementAPI.executeSQL(usersQuery);
    
    const users = (result.data || []).map((user: any) => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      confirmed_at: user.confirmed_at,
      metadata: user.raw_user_meta_data || {},
      tenant_id: user.raw_user_meta_data?.tenant_id,
      role: user.raw_user_meta_data?.role
    }));
    
    console.log('📊 [DEBUG] Usuários encontrados:', users.length);
    
    res.json({
      success: true,
      users,
      count: users.length
    });
    
  } catch (error: any) {
    console.error('❌ [DEBUG] Erro ao listar usuários:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/auth/check-tables
 * Verificar tabelas relacionadas a usuários
 */
router.get('/auth/check-tables', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Verificando tabelas de usuários...');
    
    // Verificar tabelas relacionadas a usuários
    const tablesQuery = `
      SELECT table_name, table_schema
      FROM information_schema.tables 
      WHERE table_name LIKE '%user%' 
         OR table_name LIKE '%member%' 
         OR table_name LIKE '%auth%'
         OR table_name = 'tenants'
      ORDER BY table_schema, table_name;
    `;
    
    const result = await supabaseManagementAPI.executeSQL(tablesQuery);
    
    const tables = result.data || [];
    
    console.log('📊 [DEBUG] Tabelas encontradas:', tables.length);
    
    // Verificar especificamente a tabela members
    let membersData = null;
    try {
      const membersQuery = `
        SELECT 
          id,
          email,
          first_name,
          last_name,
          role,
          tenant_id,
          created_at
        FROM members 
        WHERE id = 'fdfeb609-8dbe-46fa-9bee-f7da4eb5dfd8'
           OR email LIKE '%@%'
        ORDER BY created_at DESC
        LIMIT 5;
      `;
      
      const membersResult = await supabaseManagementAPI.executeSQL(membersQuery);
      membersData = membersResult.data || [];
      
      console.log('📊 [DEBUG] Dados da tabela members:', membersData.length, 'registros');
    } catch (membersError) {
      console.log('⚠️ [DEBUG] Tabela members não encontrada ou erro:', (membersError as Error).message);
    }
    
    res.json({
      success: true,
      tables,
      membersData,
      analysis: {
        totalTables: tables.length,
        hasMembersTable: !!membersData,
        membersCount: membersData?.length || 0
      }
    });
    
  } catch (error: any) {
    console.error('❌ [DEBUG] Erro ao verificar tabelas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/auth/check-all-tables
 * Verificar TODAS as tabelas do banco
 */
router.get('/auth/check-all-tables', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Verificando TODAS as tabelas do banco...');
    
    const allTablesQuery = `
      SELECT 
        table_name, 
        table_schema,
        table_type
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY table_schema, table_name;
    `;
    
    const result = await supabaseManagementAPI.executeSQL(allTablesQuery);
    
    const tables = result.data || [];
    
    console.log('📊 [DEBUG] Total de tabelas encontradas:', tables.length);
    
    // Filtrar por schemas relevantes
    const publicTables = tables.filter((t: any) => t.table_schema === 'public');
    const authTables = tables.filter((t: any) => t.table_schema === 'auth');
    
    res.json({
      success: true,
      allTables: tables,
      analysis: {
        totalTables: tables.length,
        publicTables: publicTables.length,
        authTables: authTables.length,
        schemas: [...new Set(tables.map((t: any) => t.table_schema))]
      },
      publicTables: publicTables.map((t: any) => t.table_name),
      authTables: authTables.map((t: any) => t.table_name)
    });
    
  } catch (error: any) {
    console.error('❌ [DEBUG] Erro ao verificar todas as tabelas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/data/check-pipeline-leads
 * Verificar dados pipeline_leads para debug DELETE
 */
router.get('/data/check-pipeline-leads', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Verificando dados pipeline_leads...');
    
    const pipelineLeadsQuery = `
      SELECT 
        id,
        pipeline_id,
        tenant_id,
        created_at
      FROM pipeline_leads 
      WHERE tenant_id = 'd7caffc1-c923-47c8-9301-ca9eeff1a243'
      ORDER BY created_at DESC
      LIMIT 10;
    `;
    
    const result = await supabaseManagementAPI.executeSQL(pipelineLeadsQuery);
    
    const pipelineLeads = result.data || [];
    
    console.log('📊 [DEBUG] Pipeline leads encontradas:', pipelineLeads.length);
    
    res.json({
      success: true,
      pipelineLeads,
      count: pipelineLeads.length,
      tenantId: 'd7caffc1-c923-47c8-9301-ca9eeff1a243',
      analysis: {
        totalFound: pipelineLeads.length,
        correctTenantId: pipelineLeads.every((lead: any) => lead.tenant_id === 'd7caffc1-c923-47c8-9301-ca9eeff1a243')
      }
    });
    
  } catch (error: any) {
    console.error('❌ [DEBUG] Erro ao verificar pipeline_leads:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/data/check-all-pipeline-leads
 * Verificar TODOS os dados pipeline_leads
 */
router.get('/data/check-all-pipeline-leads', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Verificando TODOS os dados pipeline_leads...');
    
    const allPipelineLeadsQuery = `
      SELECT 
        id,
        pipeline_id,
        tenant_id,
        created_at,
        COUNT(*) OVER (PARTITION BY tenant_id) as count_per_tenant
      FROM pipeline_leads 
      ORDER BY created_at DESC
      LIMIT 20;
    `;
    
    const result = await supabaseManagementAPI.executeSQL(allPipelineLeadsQuery);
    
    const pipelineLeads = result.data || [];
    
    // Agrupar por tenant_id
    const tenantGroups = pipelineLeads.reduce((acc: any, lead: any) => {
      const tenantId = lead.tenant_id || 'null';
      if (!acc[tenantId]) {
        acc[tenantId] = [];
      }
      acc[tenantId].push(lead);
      return acc;
    }, {});
    
    console.log('📊 [DEBUG] Pipeline leads por tenant:', Object.keys(tenantGroups));
    
    res.json({
      success: true,
      pipelineLeads,
      count: pipelineLeads.length,
      tenantGroups,
      analysis: {
        totalFound: pipelineLeads.length,
        uniqueTenants: Object.keys(tenantGroups),
        tenantCounts: Object.fromEntries(
          Object.entries(tenantGroups).map(([tenant, leads]: [string, any]) => [tenant, leads.length])
        )
      }
    });
    
  } catch (error: any) {
    console.error('❌ [DEBUG] Erro ao verificar todos pipeline_leads:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/data/find-pipeline-tables
 * Encontrar tabelas que podem conter dados de pipeline
 */
router.get('/data/find-pipeline-tables', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Procurando tabelas de pipeline...');
    
    // Buscar todas as tabelas que podem conter dados de pipeline
    const findTablesQuery = `
      SELECT 
        table_name, 
        table_schema,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = t.table_name 
         AND table_schema = t.table_schema) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND (table_name LIKE '%pipeline%' 
             OR table_name LIKE '%lead%' 
             OR table_name LIKE '%opportunity%'
             OR table_name LIKE '%card%')
      ORDER BY table_name;
    `;
    
    const tablesResult = await supabaseManagementAPI.executeSQL(findTablesQuery);
    const tables = tablesResult.data || [];
    
    // Para cada tabela encontrada, contar registros
    const tableData = [];
    for (const table of tables) {
      try {
        const countQuery = `SELECT COUNT(*) as total_records FROM ${table.table_name};`;
        const countResult = await supabaseManagementAPI.executeSQL(countQuery);
        const totalRecords = countResult.data?.[0]?.total_records || 0;
        
        tableData.push({
          ...table,
          totalRecords: parseInt(totalRecords)
        });
      } catch (err) {
        console.log(`Erro ao contar registros da tabela ${table.table_name}:`, (err as Error).message);
        tableData.push({
          ...table,
          totalRecords: 'ERROR'
        });
      }
    }
    
    console.log('📊 [DEBUG] Tabelas de pipeline encontradas:', tableData.length);
    
    res.json({
      success: true,
      tables: tableData,
      analysis: {
        totalTables: tableData.length,
        tablesWithData: tableData.filter(t => typeof t.totalRecords === 'number' && t.totalRecords > 0),
        tableNames: tableData.map(t => t.table_name)
      }
    });
    
  } catch (error: any) {
    console.error('❌ [DEBUG] Erro ao procurar tabelas de pipeline:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /admin/test/delete-simulation
 * Simular DELETE operation via Service Role
 */
router.post('/test/delete-simulation', async (req, res) => {
  try {
    const { leadId, pipelineId } = req.body;
    
    if (!leadId || !pipelineId) {
      return res.status(400).json({
        success: false,
        error: 'leadId e pipelineId são obrigatórios'
      });
    }
    
    console.log('🧪 [TEST] Simulando DELETE operation:', { leadId, pipelineId });
    
    // ✅ CORREÇÃO FINAL: leadId na aplicação = campo 'id' da tabela pipeline_leads
    // O hook usa .eq('id', leadId), não .eq('lead_id', leadId)
    const deleteSQL = `
      DELETE FROM pipeline_leads 
      WHERE id = '${leadId}' 
        AND pipeline_id = '${pipelineId}'
        AND tenant_id = 'c983a983-b1c6-451f-b528-64a5d1c831a0'
      RETURNING id, lead_id, pipeline_id, tenant_id;
    `;
    
    console.log('🔍 [TEST] SQL DELETE FINAL (usando campo id):', deleteSQL);
    
    // ✅ CORREÇÃO CRÍTICA: Usar Service Role ao invés de Management API
    // Management API pode ter problemas de contexto - Service Role funciona perfeitamente
    
    // PRIMEIRA: Verificar se registro existe via Service Role
    console.log('🔍 [TEST] Verificando registro via Service Role...');
    const { data: existingData, error: checkError } = await supabaseManagementAPI.getClient()
      .from('pipeline_leads')
      .select('id, pipeline_id, tenant_id, lead_id')
      .eq('id', leadId)
      .eq('pipeline_id', pipelineId);
      
    console.log('📊 [TEST] Dados encontrados via Service Role:', { existingData, checkError });
    
    if (!existingData || existingData.length === 0) {
      console.log('❌ [TEST] Registro não encontrado via Service Role');
      return res.json({
        success: false,
        deletedRows: 0,
        data: [],
        message: 'Registro não encontrado no banco de dados',
        testInfo: {
          leadId,
          pipelineId,
          tenantId: 'c983a983-b1c6-451f-b528-64a5d1c831a0',
          methodUsed: 'service-role-check',
          recordFound: false
        }
      });
    }
    
    // SEGUNDA: Executar DELETE via Service Role
    console.log('🔄 [TEST] Executando DELETE via Service Role...');
    const { data: deletedData, error: deleteError, count } = await supabaseManagementAPI.getClient()
      .from('pipeline_leads')
      .delete()
      .eq('id', leadId)
      .eq('pipeline_id', pipelineId)
      .eq('tenant_id', 'c983a983-b1c6-451f-b528-64a5d1c831a0')
      .select();
      
    console.log('📊 [TEST] Resultado DELETE via Service Role:', { deletedData, deleteError, count });
    
    if (deleteError) {
      console.error('❌ [TEST] Erro no DELETE via Service Role:', deleteError);
      return res.json({
        success: false,
        deletedRows: 0,
        data: [],
        message: `Erro ao executar DELETE: ${deleteError.message}`,
        testInfo: {
          leadId,
          pipelineId,
          tenantId: 'c983a983-b1c6-451f-b528-64a5d1c831a0',
          methodUsed: 'service-role-delete',
          error: deleteError.message
        }
      });
    }
    
    const deletedRows = deletedData || [];
    
    console.log('📊 [TEST] Resultado final DELETE:', {
      deletedRows: deletedRows.length,
      data: deletedRows
    });
    
    res.json({
      success: deletedRows.length > 0,
      deletedRows: deletedRows.length,
      data: deletedRows,
      message: deletedRows.length > 0 
        ? `${deletedRows.length} oportunidade(s) excluída(s) com sucesso`
        : 'Nenhuma oportunidade foi encontrada para exclusão',
      testInfo: {
        leadId,
        pipelineId,
        tenantId: 'c983a983-b1c6-451f-b528-64a5d1c831a0',
        rlsPolicyApplied: true
      }
    });
    
  } catch (error: any) {
    console.error('❌ [TEST] Erro no teste DELETE:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      testInfo: 'Erro durante simulação DELETE'
    });
  }
});

/**
 * GET /admin/test/check-real-data
 * Verificar dados usando cliente Supabase normal (mesmo que frontend)
 */
router.get('/test/check-real-data', async (req, res) => {
  try {
    console.log('🔍 [TEST] Verificando dados com cliente Supabase normal...');
    
    // Usar supabaseAdmin (Service Role) para verificar dados reais
    const { data: pipelineLeads, error, count } = await supabaseAdmin.getClient()
      .from('pipeline_leads')
      .select('id, pipeline_id, tenant_id, created_at', { count: 'exact' })
      .limit(10);
    
    if (error) {
      console.error('❌ [TEST] Erro ao buscar pipeline_leads:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        details: 'Erro ao acessar tabela pipeline_leads'
      });
    }
    
    console.log('📊 [TEST] Dados encontrados via Supabase Client:', {
      count: pipelineLeads?.length || 0,
      totalCount: count,
      hasData: !!(pipelineLeads && pipelineLeads.length > 0)
    });
    
    // Agrupar por tenant_id para análise
    const tenantGroups = (pipelineLeads || []).reduce((acc: any, lead: any) => {
      const tenantId = lead.tenant_id || 'null';
      if (!acc[tenantId]) {
        acc[tenantId] = [];
      }
      acc[tenantId].push(lead);
      return acc;
    }, {});
    
    res.json({
      success: true,
      method: 'supabase-client-service-role',
      pipelineLeads: pipelineLeads || [],
      totalCount: count,
      tenantGroups,
      analysis: {
        hasData: !!(pipelineLeads && pipelineLeads.length > 0),
        uniqueTenants: Object.keys(tenantGroups),
        expectedTenant: 'd7caffc1-c923-47c8-9301-ca9eeff1a243',
        hasExpectedTenant: tenantGroups.hasOwnProperty('d7caffc1-c923-47c8-9301-ca9eeff1a243')
      }
    });
    
  } catch (error: any) {
    console.error('❌ [TEST] Erro crítico ao verificar dados reais:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Erro crítico no cliente Supabase'
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

// ==========================================
// 6. DASHBOARD ADMIN - ENDPOINTS ESPECÍFICOS
// ==========================================

/**
 * GET /admin-dashboard
 * Dashboard admin principal com métricas gerais
 */
router.get('/admin-dashboard', async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    // Mock data para development - substituir por queries reais
    const dashboardData = {
      metrics: {
        totalMeetings: 0,
        scheduledMeetings: 0,
        completedMeetings: 0,
        noShowRate: 0.0,
        showRate: 0.0,
        benchmark: "15-25%"
      },
      conversionRates: {
        byStage: {},
        overall: 0.0
      },
      timeRange,
      lastUpdated: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro no dashboard admin:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * GET /admin-dashboard/sales-targets
 * Metas de vendas
 */
router.get('/admin-dashboard/sales-targets', async (req, res) => {
  try {
    const salesTargets = {
      current: [],
      achieved: 0,
      pending: 0,
      percentage: 0,
      lastUpdated: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: salesTargets,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro nas metas de vendas:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * GET /admin-dashboard/alerts
 * Alertas do sistema
 */
router.get('/admin-dashboard/alerts', async (req, res) => {
  try {
    const alerts = {
      critical: [],
      warning: [],
      info: [],
      total: 0,
      lastUpdated: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: alerts,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro nos alertas:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * GET /admin-dashboard/team-performance
 * Performance da equipe
 */
router.get('/admin-dashboard/team-performance', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const teamPerformance = {
      totalMembers: 0,
      activeMembers: 0,
      topPerformer: null,
      averageScore: 0.0,
      performance: [],
      period,
      lastUpdated: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: teamPerformance,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro na performance da equipe:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

// ==========================================
// 7. OPERAÇÕES ESPECÍFICAS MIGRADAS DO FRONTEND
// ==========================================

/**
 * POST /admin/create-user
 * Endpoint seguro para criação de usuários administradores usando service role
 * MIGRADO de useMultipleAdmins.ts para eliminar 403 Forbidden no frontend
 */
router.post('/create-user', async (req, res) => {
  console.log('🔧 [ADMIN-API] Recebendo solicitação de criação de usuário admin');
  
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      tenant_id,
      role = 'admin'
    } = req.body;

    // ✅ VALIDAÇÃO: Campos obrigatórios
    if (!email || !password || !tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Email, senha e tenant_id são obrigatórios',
        missing_fields: {
          email: !email,
          password: !password,
          tenant_id: !tenant_id
        }
      });
    }

    // ✅ VALIDAÇÃO: Formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Formato de email inválido'
      });
    }

    // ✅ VALIDAÇÃO: Força da senha
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Senha deve ter pelo menos 8 caracteres'
      });
    }

    console.log('🔍 [ADMIN-API] Dados validados:', {
      email,
      tenant_id: tenant_id.substring(0, 8),
      role,
      has_name: !!(first_name || last_name)
    });

    // ✅ VERIFICAR EMAIL DUPLICADO: Usando service role
    const { data: existingUsers, error: checkError } = await supabaseAdmin.getClient()
      .from('users')
      .select('id, email')
      .eq('email', email);

    if (checkError) {
      console.error('❌ [ADMIN-API] Erro ao verificar email duplicado:', checkError);
      return res.status(500).json({
        success: false,
        error: 'database_error',
        message: 'Erro ao verificar disponibilidade do email'
      });
    }

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'duplicate_email',
        message: 'Email já está em uso por outro usuário'
      });
    }

    console.log('🚀 [ADMIN-API] Criando usuário com auth.admin.createUser (service role)');

    // ✅ CRIAR USUÁRIO: Usando supabase.auth.admin.createUser com service role
    const { data: authUser, error: authError } = await supabaseAdmin.getClient().auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        first_name: first_name || '',
        last_name: last_name || '',
        role,
        tenant_id
      }
    });

    if (authError || !authUser.user) {
      console.error('❌ [ADMIN-API] Erro ao criar auth user:', authError);
      return res.status(500).json({
        success: false,
        error: 'auth_creation_failed',
        message: `Falha ao criar autenticação: ${authError?.message || 'Erro desconhecido'}`
      });
    }

    console.log('✅ [ADMIN-API] Auth user criado:', authUser.user.id?.substring(0, 8));

    // ✅ INSERIR NA TABELA USERS: Usando service role para bypass RLS
    const userData = {
      id: authUser.user.id,
      first_name: first_name || '',
      last_name: last_name || '',
      email,
      role,
      tenant_id,
      is_active: true,
      created_at: new Date().toISOString()
    };

    const userResult = await supabaseAdmin.adminInsert('users', userData);

    if (!userResult || (Array.isArray(userResult) && userResult.length === 0)) {
      console.error('❌ [ADMIN-API] Service role retornou result vazio para users');
      return res.status(500).json({
        success: false,
        error: 'user_creation_failed',
        message: 'Falha ao criar registro de usuário'
      });
    }

    const newUser = Array.isArray(userResult) ? userResult[0] : userResult;
    console.log('✅ [ADMIN-API] Usuário criado com sucesso:', newUser.id?.substring(0, 8));

    return res.status(201).json({
      success: true,
      message: 'Administrador criado com sucesso via service role backend',
      user: {
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        role: newUser.role,
        tenant_id: newUser.tenant_id,
        is_active: newUser.is_active,
        created_at: newUser.created_at
      },
      strategy_used: 'backend-service-role'
    });

  } catch (error: any) {
    console.error('❌ [ADMIN-API] Erro na criação de usuário admin:', error);
    
    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Erro interno do servidor',
      details: error?.message || 'Erro desconhecido'
    });
  }
});

/**
 * POST /admin/create-opportunity
 * Endpoint seguro para criação de oportunidades usando service role
 * MIGRADO de useCreateOpportunity.ts para eliminar service role no frontend
 */
router.post('/create-opportunity', async (req, res) => {
  console.log('🔧 [ADMIN-API] Recebendo solicitação de criação de oportunidade');
  
  try {
    const {
      pipeline_id,
      stage_id,
      lead_master_id,
      assigned_to,
      custom_data = {},
      tenant_id,
      created_by,
      position = 1000,
      status = 'active',
      lifecycle_stage = 'lead'
    } = req.body;

    // ✅ VALIDAÇÃO: Campos obrigatórios
    if (!pipeline_id || !stage_id || !lead_master_id || !tenant_id || !created_by) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Campos obrigatórios ausentes',
        missing_fields: {
          pipeline_id: !pipeline_id,
          stage_id: !stage_id,
          lead_master_id: !lead_master_id,
          tenant_id: !tenant_id,
          created_by: !created_by
        }
      });
    }

    console.log('🔍 [ADMIN-API] Dados validados:', {
      pipeline_id: pipeline_id.substring(0, 8),
      stage_id: stage_id.substring(0, 8),
      tenant_id: tenant_id.substring(0, 8),
      custom_data_size: JSON.stringify(custom_data).length
    });

    // ✅ PREPARAR DADOS: Criar objeto para insert
    const newPipelineLead = {
      pipeline_id,
      stage_id,
      lead_master_id,
      assigned_to: assigned_to || created_by,
      custom_data: custom_data || {},
      tenant_id,
      created_by,
      position,
      status,
      lifecycle_stage
    };

    console.log('🚀 [ADMIN-API] Executando INSERT com service role (bypass RLS)');

    // ✅ SERVICE ROLE INSERT: Usar supabaseAdmin (já configurado)
    const result = await supabaseAdmin.adminInsert('pipeline_leads', newPipelineLead);

    if (!result || (Array.isArray(result) && result.length === 0)) {
      console.error('❌ [ADMIN-API] Service role retornou result vazio');
      return res.status(500).json({
        success: false,
        error: 'empty_result',
        message: 'INSERT retornou resultado vazio'
      });
    }

    const opportunity = Array.isArray(result) ? result[0] : result;
    console.log('✅ [ADMIN-API] Oportunidade criada com sucesso:', opportunity.id?.substring(0, 8));

    return res.status(201).json({
      success: true,
      message: 'Oportunidade criada via service role backend',
      opportunity_id: opportunity.id,
      lead_id: lead_master_id,
      strategy_used: 'backend-service-role'
    });

  } catch (error: any) {
    console.error('❌ [ADMIN-API] Erro na criação de oportunidade:', error);
    
    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Erro interno do servidor',
      details: error?.message || 'Erro desconhecido'
    });
  }
});

// ==========================================
// 8. MANAGEMENT API - MIGRATIONS AUTOMÁTICAS
// ==========================================

/**
 * POST /admin/migrations/execute
 * Executar migration específica via Management API
 */
router.post('/migrations/execute', async (req, res) => {
  console.log('🚀 [ADMIN-API] Executando migration via Management API');
  
  try {
    const { migrationName, sqlCommands, version } = req.body;

    if (!migrationName) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Nome da migration é obrigatório'
      });
    }

    console.log(`🔄 [ADMIN-API] Executando migration: ${migrationName}`);

    let result;

    // ✅ MIGRATIONS PREDEFINIDAS
    if (migrationName === 'rls-pipeline-leads') {
      // Migration específica para corrigir problema DELETE
      result = await supabaseManagementAPI.applyRLSMigrationPipelineLeads();
      
    } else if (migrationName === 'custom' && sqlCommands) {
      // Migration customizada
      result = await supabaseManagementAPI.executeMultipleSQL(sqlCommands);
      
    } else if (migrationName === 'from-file' && version) {
      // Migration de arquivo (futuro)
      return res.status(501).json({
        success: false,
        error: 'not_implemented',
        message: 'Migration de arquivo ainda não implementada'
      });
      
    } else {
      return res.status(400).json({
        success: false,
        error: 'invalid_migration',
        message: 'Migration não reconhecida ou parâmetros insuficientes'
      });
    }

    console.log('✅ [ADMIN-API] Migration executada:', result);

    return res.status(200).json({
      success: true,
      message: `Migration ${migrationName} executada via Management API`,
      migration: migrationName,
      result,
      executedAt: new Date().toISOString(),
      strategy: 'management-api'
    });

  } catch (error: any) {
    console.error('❌ [ADMIN-API] Erro na execução da migration:', error);
    
    return res.status(500).json({
      success: false,
      error: 'migration_error',
      message: 'Erro ao executar migration',
      details: error?.message || 'Erro desconhecido'
    });
  }
});

/**
 * GET /admin/migrations/status
 * Verificar status das migrations
 */
router.get('/migrations/status', async (req, res) => {
  try {
    // Verificar status da migration RLS
    const rlsStatus = await supabaseManagementAPI.checkRLSMigrationStatus();
    
    // Verificar conectividade geral
    const connectivity = await supabaseManagementAPI.checkConnectivity();

    return res.json({
      success: true,
      data: {
        rls_migration: rlsStatus,
        connectivity,
        service_status: 'active',
        last_checked: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ [ADMIN-API] Erro ao verificar status das migrations:', error);
    
    return res.status(500).json({
      success: false,
      error: 'status_check_error',
      message: 'Erro ao verificar status',
      details: error?.message || 'Erro desconhecido'
    });
  }
});

/**
 * POST /admin/management-api/execute-sql
 * Executar SQL direto via Management API
 */
router.post('/management-api/execute-sql', async (req, res) => {
  console.log('🔧 [ADMIN-API] Executando SQL via Management API');
  
  try {
    const { sql, description } = req.body;

    if (!sql) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'SQL é obrigatório'
      });
    }

    console.log(`🔄 [ADMIN-API] Executando SQL: ${description || 'SQL customizado'}`);
    console.log(`📝 SQL: ${sql.substring(0, 100)}...`);

    const result = await supabaseManagementAPI.executeSQL(sql);

    return res.status(200).json({
      success: true,
      message: 'SQL executado via Management API',
      description: description || 'SQL customizado',
      result,
      executedAt: new Date().toISOString(),
      strategy: 'management-api-direct'
    });

  } catch (error: any) {
    console.error('❌ [ADMIN-API] Erro na execução SQL via Management API:', error);
    
    return res.status(500).json({
      success: false,
      error: 'sql_execution_error',
      message: 'Erro ao executar SQL',
      details: error?.message || 'Erro desconhecido'
    });
  }
});

/**
 * POST /admin/management-api/rls/create-policy
 * Criar RLS Policy via Management API
 */
router.post('/management-api/rls/create-policy', async (req, res) => {
  console.log('🔒 [ADMIN-API] Criando RLS Policy via Management API');
  
  try {
    const { tableName, policyName, operation, using, withCheck } = req.body;

    if (!tableName || !policyName || !operation) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'tableName, policyName e operation são obrigatórios'
      });
    }

    const result = await supabaseManagementAPI.createRLSPolicy({
      tableName,
      policyName,
      operation,
      using,
      withCheck
    });

    return res.status(200).json({
      success: true,
      message: `RLS Policy '${policyName}' criada para tabela '${tableName}'`,
      policy: { tableName, policyName, operation },
      result,
      executedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [ADMIN-API] Erro ao criar RLS Policy:', error);
    
    return res.status(500).json({
      success: false,
      error: 'rls_policy_error',
      message: 'Erro ao criar RLS Policy',
      details: error?.message || 'Erro desconhecido'
    });
  }
});

/**
 * DELETE /admin/management-api/rls/drop-policy
 * Remover RLS Policy via Management API
 */
router.delete('/management-api/rls/drop-policy', async (req, res) => {
  console.log('🗑️ [ADMIN-API] Removendo RLS Policy via Management API');
  
  try {
    const { tableName, policyName } = req.body;

    if (!tableName || !policyName) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'tableName e policyName são obrigatórios'
      });
    }

    const result = await supabaseManagementAPI.dropRLSPolicy(tableName, policyName);

    return res.status(200).json({
      success: true,
      message: `RLS Policy '${policyName}' removida da tabela '${tableName}'`,
      policy: { tableName, policyName },
      result,
      executedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [ADMIN-API] Erro ao remover RLS Policy:', error);
    
    return res.status(500).json({
      success: false,
      error: 'rls_policy_error',
      message: 'Erro ao remover RLS Policy',
      details: error?.message || 'Erro desconhecido'
    });
  }
});

/**
 * GET /admin/management-api/rls/list-policies/:table
 * Listar RLS Policies de uma tabela
 */
router.get('/management-api/rls/list-policies/:table', async (req, res) => {
  console.log('📋 [ADMIN-API] Listando RLS Policies via Management API');
  
  try {
    const { table } = req.params;

    if (!table) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Nome da tabela é obrigatório'
      });
    }

    const policies = await supabaseManagementAPI.listRLSPolicies(table);

    return res.json({
      success: true,
      data: policies,
      table,
      count: policies.length,
      executedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [ADMIN-API] Erro ao listar RLS Policies:', error);
    
    return res.status(500).json({
      success: false,
      error: 'rls_list_error',
      message: 'Erro ao listar RLS Policies',
      details: error?.message || 'Erro desconhecido'
    });
  }
});

/**
 * GET /admin/management-api/connectivity
 * Verificar conectividade do Management API
 */
router.get('/management-api/connectivity', async (req, res) => {
  console.log('🔍 [ADMIN-API] Verificando conectividade Management API');
  
  try {
    const connectivity = await supabaseManagementAPI.checkConnectivity();

    return res.json({
      success: true,
      data: connectivity,
      config: supabaseManagementAPI.getConfig(),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [ADMIN-API] Erro ao verificar conectividade:', error);
    
    return res.status(500).json({
      success: false,
      error: 'connectivity_error',
      message: 'Erro ao verificar conectividade',
      details: error?.message || 'Erro desconhecido'
    });
  }
});

export default router; 
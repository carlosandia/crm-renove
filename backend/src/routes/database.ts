import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../index'

const router = Router()

// GET - Listar tabelas e estruturas
router.get('/', async (req: Request, res: Response) => {
  try {
    const { action, table, limit } = req.query

    switch (action) {
      case 'list_tables':
        // Listar todas as tabelas
        const { data: tables, error: tablesError } = await supabaseAdmin
          .from('information_schema.tables')
          .select('table_name, table_type')
          .eq('table_schema', 'public')
          .order('table_name')

        if (tablesError) {
          // Fallback com tabelas conhecidas
          return res.json({
            tables: [
              'users', 'tenants', 'companies', 'customers', 'integrations',
              'pipelines', 'pipeline_stages', 'pipeline_members', 'pipeline_leads',
              'pipeline_custom_fields', 'sales_goals', 'follow_ups'
            ],
            note: 'Lista de tabelas conhecidas (fallback)',
            error: tablesError.message
          })
        }

        return res.json({
          tables: tables?.map(t => t.table_name) || [],
          total: tables?.length || 0
        })

      case 'describe_table':
        if (!table) {
          return res.status(400).json({
            error: 'Parâmetro table é obrigatório para describe_table'
          })
        }

        // Descrever estrutura da tabela
        const { data: columns, error: columnsError } = await supabaseAdmin
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default, character_maximum_length')
          .eq('table_schema', 'public')
          .eq('table_name', table)
          .order('ordinal_position')

        if (columnsError) {
          return res.status(500).json({
            error: 'Erro ao descrever tabela',
            details: columnsError.message
          })
        }

        return res.json({
          table,
          columns: columns || [],
          total_columns: columns?.length || 0
        })

      case 'table_data':
        if (!table) {
          return res.status(400).json({
            error: 'Parâmetro table é obrigatório para table_data'
          })
        }

        const limitNum = parseInt(limit as string || '10')
        
        // Buscar dados da tabela
        const { data: tableData, error: dataError } = await supabaseAdmin
          .from(table as string)
          .select('*')
          .limit(limitNum)

        if (dataError) {
          return res.status(500).json({
            error: 'Erro ao buscar dados da tabela',
            details: dataError.message
          })
        }

        return res.json({
          table,
          data: tableData || [],
          total_records: tableData?.length || 0,
          limit_applied: limitNum
        })

      default:
        return res.json({
          message: 'API de Manipulação de Banco de Dados',
          available_actions: [
            'list_tables - Lista todas as tabelas',
            'describe_table - Descreve estrutura de uma tabela (requer parâmetro table)',
            'table_data - Mostra dados de uma tabela (requer parâmetro table, opcional limit)'
          ],
          examples: [
            '/api/database?action=list_tables',
            '/api/database?action=describe_table&table=users',
            '/api/database?action=table_data&table=users&limit=5'
          ]
        })
    }
  } catch (error) {
    return res.status(500).json({
      error: 'Erro na API de banco de dados',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

// POST - Executar comandos SQL e manipular dados
router.post('/', async (req: Request, res: Response) => {
  try {
    const { action, table, data, where, sql, columns } = req.body

    switch (action) {
      case 'create_table':
        if (!table || !columns) {
          return res.status(400).json({
            error: 'Parâmetros table e columns são obrigatórios para create_table'
          })
        }

        // Construir SQL para criar tabela
        const columnDefinitions = columns.map((col: any) => {
          let def = `${col.name} ${col.type}`
          if (col.primary_key) def += ' PRIMARY KEY'
          if (col.not_null) def += ' NOT NULL'
          if (col.unique) def += ' UNIQUE'
          if (col.default) def += ` DEFAULT ${col.default}`
          return def
        }).join(', ')

        const createTableSQL = `CREATE TABLE IF NOT EXISTS ${table} (${columnDefinitions})`
        
        return res.json({
          message: 'Para criar tabela, execute o seguinte SQL no Supabase:',
          sql: createTableSQL,
          note: 'Use o SQL Editor do Supabase para executar este comando'
        })

      case 'insert':
        if (!table || !data) {
          return res.status(400).json({
            error: 'Parâmetros table e data são obrigatórios para insert'
          })
        }

        const { data: insertedData, error: insertError } = await supabaseAdmin
          .from(table)
          .insert(data)
          .select()

        if (insertError) {
          return res.status(500).json({
            error: 'Erro ao inserir dados',
            details: insertError.message
          })
        }

        return res.json({
          message: 'Dados inseridos com sucesso',
          table,
          inserted_data: insertedData,
          total_inserted: insertedData?.length || 0
        })

      case 'update':
        if (!table || !data || !where) {
          return res.status(400).json({
            error: 'Parâmetros table, data e where são obrigatórios para update'
          })
        }

        let updateQuery = supabaseAdmin.from(table).update(data)
        
        // Aplicar condições WHERE
        Object.entries(where).forEach(([key, value]) => {
          updateQuery = updateQuery.eq(key, value)
        })

        const { data: updatedData, error: updateError } = await updateQuery.select()

        if (updateError) {
          return res.status(500).json({
            error: 'Erro ao atualizar dados',
            details: updateError.message
          })
        }

        return res.json({
          message: 'Dados atualizados com sucesso',
          table,
          updated_data: updatedData,
          total_updated: updatedData?.length || 0
        })

      case 'delete':
        if (!table || !where) {
          return res.status(400).json({
            error: 'Parâmetros table e where são obrigatórios para delete'
          })
        }

        let deleteQuery = supabaseAdmin.from(table).delete()
        
        // Aplicar condições WHERE
        Object.entries(where).forEach(([key, value]) => {
          deleteQuery = deleteQuery.eq(key, value)
        })

        const { data: deletedData, error: deleteError } = await deleteQuery.select()

        if (deleteError) {
          return res.status(500).json({
            error: 'Erro ao deletar dados',
            details: deleteError.message
          })
        }

        return res.json({
          message: 'Dados deletados com sucesso',
          table,
          deleted_data: deletedData,
          total_deleted: deletedData?.length || 0
        })

      case 'execute_sql':
        if (!sql) {
          return res.status(400).json({
            error: 'Parâmetro sql é obrigatório para execute_sql'
          })
        }

        // Para comandos SQL diretos, retornar instruções
        return res.json({
          message: 'Para executar SQL personalizado, use o SQL Editor do Supabase:',
          sql: sql,
          note: 'Comandos DDL (CREATE, ALTER, DROP) devem ser executados diretamente no Supabase',
          alternative: 'Para operações DML (SELECT, INSERT, UPDATE, DELETE), use as ações específicas desta API'
        })

      default:
        return res.status(400).json({
          error: 'Ação não reconhecida',
          available_actions: ['create_table', 'add_column', 'insert', 'update', 'delete', 'execute_sql']
        })
    }
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao executar operação no banco',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

export default router 
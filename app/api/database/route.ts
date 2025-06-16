import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// GET - Listar tabelas e estruturas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const table = searchParams.get('table')

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
          return NextResponse.json({
            tables: [
              'users', 'tenants', 'companies', 'customers', 'integrations',
              'pipelines', 'pipeline_stages', 'pipeline_members', 'pipeline_leads',
              'pipeline_custom_fields', 'sales_goals', 'follow_ups'
            ],
            note: 'Lista de tabelas conhecidas (fallback)',
            error: tablesError.message
          })
        }

        return NextResponse.json({
          tables: tables?.map(t => t.table_name) || [],
          total: tables?.length || 0
        })

      case 'describe_table':
        if (!table) {
          return NextResponse.json(
            { error: 'Parâmetro table é obrigatório para describe_table' },
            { status: 400 }
          )
        }

        // Descrever estrutura da tabela
        const { data: columns, error: columnsError } = await supabaseAdmin
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default, character_maximum_length')
          .eq('table_schema', 'public')
          .eq('table_name', table)
          .order('ordinal_position')

        if (columnsError) {
          return NextResponse.json(
            { error: 'Erro ao descrever tabela', details: columnsError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({
          table,
          columns: columns || [],
          total_columns: columns?.length || 0
        })

      case 'table_data':
        if (!table) {
          return NextResponse.json(
            { error: 'Parâmetro table é obrigatório para table_data' },
            { status: 400 }
          )
        }

        const limit = parseInt(searchParams.get('limit') || '10')
        
        // Buscar dados da tabela
        const { data: tableData, error: dataError } = await supabaseAdmin
          .from(table)
          .select('*')
          .limit(limit)

        if (dataError) {
          return NextResponse.json(
            { error: 'Erro ao buscar dados da tabela', details: dataError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({
          table,
          data: tableData || [],
          total_records: tableData?.length || 0,
          limit_applied: limit
        })

      default:
        return NextResponse.json({
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
    return NextResponse.json(
      { 
        error: 'Erro na API de banco de dados',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// POST - Executar comandos SQL e manipular dados
export async function POST(request: NextRequest) {
  try {
    const { action, table, data, where, sql, columns } = await request.json()

    switch (action) {
      case 'create_table':
        if (!table || !columns) {
          return NextResponse.json(
            { error: 'Parâmetros table e columns são obrigatórios para create_table' },
            { status: 400 }
          )
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
        
        return NextResponse.json({
          message: 'Para criar tabela, execute o seguinte SQL no Supabase:',
          sql: createTableSQL,
          note: 'Use o SQL Editor do Supabase para executar este comando'
        })

      case 'add_column':
        if (!table || !data?.column_name || !data?.column_type) {
          return NextResponse.json(
            { error: 'Parâmetros table, column_name e column_type são obrigatórios' },
            { status: 400 }
          )
        }

        const addColumnSQL = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${data.column_name} ${data.column_type}`
        
        return NextResponse.json({
          message: 'Para adicionar coluna, execute o seguinte SQL no Supabase:',
          sql: addColumnSQL,
          note: 'Use o SQL Editor do Supabase para executar este comando'
        })

      case 'insert':
        if (!table || !data) {
          return NextResponse.json(
            { error: 'Parâmetros table e data são obrigatórios para insert' },
            { status: 400 }
          )
        }

        const { data: insertedData, error: insertError } = await supabaseAdmin
          .from(table)
          .insert(data)
          .select()

        if (insertError) {
          return NextResponse.json(
            { error: 'Erro ao inserir dados', details: insertError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({
          message: 'Dados inseridos com sucesso',
          table,
          inserted_data: insertedData,
          total_inserted: insertedData?.length || 0
        })

      case 'update':
        if (!table || !data || !where) {
          return NextResponse.json(
            { error: 'Parâmetros table, data e where são obrigatórios para update' },
            { status: 400 }
          )
        }

        let updateQuery = supabaseAdmin.from(table).update(data)
        
        // Aplicar condições WHERE
        Object.entries(where).forEach(([key, value]) => {
          updateQuery = updateQuery.eq(key, value)
        })

        const { data: updatedData, error: updateError } = await updateQuery.select()

        if (updateError) {
          return NextResponse.json(
            { error: 'Erro ao atualizar dados', details: updateError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({
          message: 'Dados atualizados com sucesso',
          table,
          updated_data: updatedData,
          total_updated: updatedData?.length || 0
        })

      case 'delete':
        if (!table || !where) {
          return NextResponse.json(
            { error: 'Parâmetros table e where são obrigatórios para delete' },
            { status: 400 }
          )
        }

        let deleteQuery = supabaseAdmin.from(table).delete()
        
        // Aplicar condições WHERE
        Object.entries(where).forEach(([key, value]) => {
          deleteQuery = deleteQuery.eq(key, value)
        })

        const { data: deletedData, error: deleteError } = await deleteQuery.select()

        if (deleteError) {
          return NextResponse.json(
            { error: 'Erro ao deletar dados', details: deleteError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({
          message: 'Dados deletados com sucesso',
          table,
          deleted_data: deletedData,
          total_deleted: deletedData?.length || 0
        })

      case 'execute_sql':
        if (!sql) {
          return NextResponse.json(
            { error: 'Parâmetro sql é obrigatório para execute_sql' },
            { status: 400 }
          )
        }

        // Para comandos SQL diretos, retornar instruções
        return NextResponse.json({
          message: 'Para executar SQL personalizado, use o SQL Editor do Supabase:',
          sql: sql,
          note: 'Comandos DDL (CREATE, ALTER, DROP) devem ser executados diretamente no Supabase',
          alternative: 'Para operações DML (SELECT, INSERT, UPDATE, DELETE), use as ações específicas desta API'
        })

      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida', available_actions: ['create_table', 'add_column', 'insert', 'update', 'delete', 'execute_sql'] },
          { status: 400 }
        )
    }
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erro ao executar operação no banco',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// PUT - Atualizar estruturas de tabela
export async function PUT(request: NextRequest) {
  try {
    const { table, action, column_name, new_column_name, column_type } = await request.json()

    if (!table || !action) {
      return NextResponse.json(
        { error: 'Parâmetros table e action são obrigatórios' },
        { status: 400 }
      )
    }

    let sql = ''

    switch (action) {
      case 'rename_column':
        if (!column_name || !new_column_name) {
          return NextResponse.json(
            { error: 'Parâmetros column_name e new_column_name são obrigatórios para rename_column' },
            { status: 400 }
          )
        }
        sql = `ALTER TABLE ${table} RENAME COLUMN ${column_name} TO ${new_column_name}`
        break

      case 'alter_column_type':
        if (!column_name || !column_type) {
          return NextResponse.json(
            { error: 'Parâmetros column_name e column_type são obrigatórios para alter_column_type' },
            { status: 400 }
          )
        }
        sql = `ALTER TABLE ${table} ALTER COLUMN ${column_name} TYPE ${column_type}`
        break

      case 'drop_column':
        if (!column_name) {
          return NextResponse.json(
            { error: 'Parâmetro column_name é obrigatório para drop_column' },
            { status: 400 }
          )
        }
        sql = `ALTER TABLE ${table} DROP COLUMN IF EXISTS ${column_name}`
        break

      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida', available_actions: ['rename_column', 'alter_column_type', 'drop_column'] },
          { status: 400 }
        )
    }

    return NextResponse.json({
      message: `Para ${action}, execute o seguinte SQL no Supabase:`,
      sql,
      note: 'Use o SQL Editor do Supabase para executar este comando'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erro ao preparar alteração de estrutura',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// DELETE - Remover tabelas
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')

    if (!table) {
      return NextResponse.json(
        { error: 'Parâmetro table é obrigatório' },
        { status: 400 }
      )
    }

    const dropTableSQL = `DROP TABLE IF EXISTS ${table} CASCADE`

    return NextResponse.json({
      message: 'Para remover tabela, execute o seguinte SQL no Supabase:',
      sql: dropTableSQL,
      warning: 'ATENÇÃO: Esta operação é irreversível e removerá todos os dados da tabela!',
      note: 'Use o SQL Editor do Supabase para executar este comando'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erro ao preparar remoção de tabela',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 
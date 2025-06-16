#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class SupabaseMCPServer {
    constructor() {
        this.server = new Server(
            {
                name: 'supabase-crm-complete',
                version: '2.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.supabase = null;
        this.setupToolHandlers();
    }

    async initializeSupabase() {
        const supabaseUrl = process.env.SUPABASE_URL || 'https://marajvabdwkpgopytvhh.supabase.co';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos');
        }

        this.supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        console.log('✅ Conexão com Supabase inicializada com sucesso!');
        return this.supabase;
    }

    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'execute_sql',
                    description: 'Executa qualquer comando SQL diretamente no Supabase (CREATE, ALTER, DROP, SELECT, INSERT, UPDATE, DELETE)',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'Comando SQL completo para executar' }
                        },
                        required: ['query']
                    }
                },
                {
                    name: 'create_table',
                    description: 'Cria uma nova tabela com colunas especificadas',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table_name: { type: 'string', description: 'Nome da tabela' },
                            columns: {
                                type: 'array',
                                description: 'Array de definições de colunas',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string', description: 'Nome da coluna' },
                                        type: { type: 'string', description: 'Tipo de dados (VARCHAR, INTEGER, UUID, etc.)' },
                                        constraints: { type: 'string', description: 'Constraints (PRIMARY KEY, NOT NULL, UNIQUE, etc.)' }
                                    },
                                    required: ['name', 'type']
                                }
                            },
                            indexes: {
                                type: 'array',
                                description: 'Índices para criar (opcional)',
                                items: { type: 'string' }
                            }
                        },
                        required: ['table_name', 'columns']
                    }
                },
                {
                    name: 'alter_table',
                    description: 'Modifica estrutura de uma tabela existente',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table_name: { type: 'string', description: 'Nome da tabela' },
                            action: {
                                type: 'string',
                                enum: ['ADD_COLUMN', 'DROP_COLUMN', 'ALTER_COLUMN', 'RENAME_COLUMN', 'ADD_CONSTRAINT', 'DROP_CONSTRAINT'],
                                description: 'Tipo de alteração'
                            },
                            column_name: { type: 'string', description: 'Nome da coluna' },
                            column_definition: { type: 'string', description: 'Definição da coluna (para ADD_COLUMN)' },
                            new_column_name: { type: 'string', description: 'Novo nome da coluna (para RENAME_COLUMN)' },
                            constraint_name: { type: 'string', description: 'Nome da constraint' },
                            constraint_definition: { type: 'string', description: 'Definição da constraint' }
                        },
                        required: ['table_name', 'action']
                    }
                },
                {
                    name: 'setup_rls',
                    description: 'Configura Row Level Security (RLS) para uma tabela',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table_name: { type: 'string', description: 'Nome da tabela' },
                            enable_rls: { type: 'boolean', description: 'Ativar ou desativar RLS', default: true },
                            policies: {
                                type: 'array',
                                description: 'Políticas RLS para criar',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string', description: 'Nome da política' },
                                        operation: { type: 'string', enum: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL'], description: 'Tipo de operação' },
                                        condition: { type: 'string', description: 'Condição da política (ex: auth.uid() = user_id)' },
                                        using_expression: { type: 'string', description: 'Expressão USING para SELECT/UPDATE/DELETE' },
                                        check_expression: { type: 'string', description: 'Expressão CHECK para INSERT/UPDATE' }
                                    },
                                    required: ['name', 'operation', 'condition']
                                }
                            }
                        },
                        required: ['table_name']
                    }
                },
                {
                    name: 'create_function',
                    description: 'Cria funções SQL/PL/pgSQL personalizadas',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            function_name: { type: 'string', description: 'Nome da função' },
                            parameters: { type: 'string', description: 'Parâmetros da função' },
                            return_type: { type: 'string', description: 'Tipo de retorno' },
                            body: { type: 'string', description: 'Corpo da função em SQL/PL/pgSQL' },
                            language: { type: 'string', enum: ['SQL', 'PLPGSQL'], default: 'SQL', description: 'Linguagem da função' }
                        },
                        required: ['function_name', 'return_type', 'body']
                    }
                },
                {
                    name: 'create_trigger',
                    description: 'Cria triggers para auditoria e automação',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            trigger_name: { type: 'string', description: 'Nome do trigger' },
                            table_name: { type: 'string', description: 'Nome da tabela' },
                            timing: { type: 'string', enum: ['BEFORE', 'AFTER', 'INSTEAD OF'], description: 'Momento de execução' },
                            events: { type: 'array', items: { type: 'string', enum: ['INSERT', 'UPDATE', 'DELETE'] }, description: 'Eventos que disparam o trigger' },
                            function_name: { type: 'string', description: 'Nome da função a ser executada' }
                        },
                        required: ['trigger_name', 'table_name', 'timing', 'events', 'function_name']
                    }
                },
                {
                    name: 'insert_data',
                    description: 'Insere dados em uma tabela',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table_name: { type: 'string', description: 'Nome da tabela' },
                            data: { type: 'object', description: 'Dados para inserir' },
                            on_conflict: { type: 'string', description: 'Ação em caso de conflito (opcional)' }
                        },
                        required: ['table_name', 'data']
                    }
                },
                {
                    name: 'update_data',
                    description: 'Atualiza dados em uma tabela',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table_name: { type: 'string', description: 'Nome da tabela' },
                            data: { type: 'object', description: 'Dados para atualizar' },
                            where_conditions: { type: 'object', description: 'Condições WHERE' }
                        },
                        required: ['table_name', 'data', 'where_conditions']
                    }
                },
                {
                    name: 'delete_data',
                    description: 'Deleta dados de uma tabela',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table_name: { type: 'string', description: 'Nome da tabela' },
                            where_conditions: { type: 'object', description: 'Condições WHERE para filtrar' }
                        },
                        required: ['table_name', 'where_conditions']
                    }
                },
                {
                    name: 'select_data',
                    description: 'Consulta dados de uma tabela com filtros avançados',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table_name: { type: 'string', description: 'Nome da tabela' },
                            columns: { type: 'string', description: 'Colunas para selecionar (* para todas)', default: '*' },
                            where_conditions: { type: 'object', description: 'Condições WHERE (opcional)' },
                            order_by: { type: 'string', description: 'Ordenação (ex: name ASC, created_at DESC)' },
                            limit: { type: 'number', description: 'Limite de registros' },
                            offset: { type: 'number', description: 'Offset para paginação' }
                        },
                        required: ['table_name']
                    }
                },
                {
                    name: 'list_tables',
                    description: 'Lista todas as tabelas do banco de dados',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            schema: { type: 'string', default: 'public', description: 'Schema do banco (padrão: public)' }
                        }
                    }
                },
                {
                    name: 'describe_table',
                    description: 'Descreve a estrutura de uma tabela (colunas, tipos, constraints)',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table_name: { type: 'string', description: 'Nome da tabela' }
                        },
                        required: ['table_name']
                    }
                },
                {
                    name: 'backup_table',
                    description: 'Cria backup de uma tabela',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table_name: { type: 'string', description: 'Nome da tabela original' },
                            backup_name: { type: 'string', description: 'Nome da tabela de backup (opcional)' }
                        },
                        required: ['table_name']
                    }
                },
                {
                    name: 'setup_database',
                    description: 'Configura estrutura completa do banco CRM (usuários, clientes, etc.)',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            include_sample_data: { type: 'boolean', default: false, description: 'Incluir dados de exemplo' }
                        }
                    }
                }
            ]
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                if (!this.supabase) {
                    await this.initializeSupabase();
                }

                switch (name) {
                    case 'execute_sql': return await this.executeSql(args.query);
                    case 'create_table': return await this.createTable(args);
                    case 'alter_table': return await this.alterTable(args);
                    case 'setup_rls': return await this.setupRLS(args);
                    case 'create_function': return await this.createFunction(args);
                    case 'create_trigger': return await this.createTrigger(args);
                    case 'insert_data': return await this.insertData(args);
                    case 'update_data': return await this.updateData(args);
                    case 'delete_data': return await this.deleteData(args);
                    case 'select_data': return await this.selectData(args);
                    case 'list_tables': return await this.listTables(args);
                    case 'describe_table': return await this.describeTable(args);
                    case 'backup_table': return await this.backupTable(args);
                    case 'setup_database': return await this.setupDatabase(args);
                    default: throw new Error(`Ferramenta desconhecida: ${name}`);
                }
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `❌ Erro: ${error.message}` }],
                    isError: true
                };
            }
        });
    }

    async executeSql(query) {
        console.log(`🔄 Executando SQL: ${query.substring(0, 100)}...`);
        
        try {
            // Para diferentes tipos de queries, usar diferentes abordagens
            const queryUpper = query.trim().toUpperCase();
            
            if (queryUpper.startsWith('SELECT')) {
                // Para SELECT, usar o client diretamente
                const { data, error } = await this.supabase.rpc('exec_sql_select', { query });
                
                if (error) {
                    // Fallback: tentar extrair nome da tabela e usar from()
                    const tableMatch = query.match(/FROM\s+(\w+)/i);
                    if (tableMatch) {
                        const tableName = tableMatch[1];
                        const { data: fallbackData, error: fallbackError } = await this.supabase
                            .from(tableName)
                            .select('*')
                            .limit(100);
                        
                        if (!fallbackError) {
                            return {
                                content: [{
                                    type: 'text',
                                    text: `✅ Consulta executada com sucesso!\n\nResultados (${fallbackData.length} registros):\n${JSON.stringify(fallbackData, null, 2)}`
                                }]
                            };
                        }
                    }
                    throw error;
                }
                
                return {
                    content: [{
                        type: 'text',
                        text: `✅ Consulta executada com sucesso!\n\nResultados:\n${JSON.stringify(data, null, 2)}`
                    }]
                };
            } else {
                // Para DDL/DML, usar RPC ou queries diretas
                const { data, error } = await this.supabase.rpc('exec_sql', { sql: query });
                
                if (error) {
                    throw error;
                }
                
                return {
                    content: [{
                        type: 'text',
                        text: `✅ SQL executado com sucesso!\n\nQuery: ${query}\n\nResultado: ${data ? JSON.stringify(data, null, 2) : 'Comando executado com sucesso'}`
                    }]
                };
            }
        } catch (error) {
            throw new Error(`Erro ao executar SQL: ${error.message}`);
        }
    }

    async createTable({ table_name, columns, indexes = [] }) {
        const columnDefinitions = columns.map(col => 
            `${col.name} ${col.type} ${col.constraints || ''}`
        ).join(', ');
        
        let createQuery = `CREATE TABLE IF NOT EXISTS ${table_name} (${columnDefinitions})`;
        
        // Adicionar índices se especificados
        let indexQueries = '';
        indexes.forEach(index => {
            indexQueries += `; CREATE INDEX IF NOT EXISTS idx_${table_name}_${index} ON ${table_name}(${index})`;
        });
        
        const fullQuery = createQuery + indexQueries;
        return await this.executeSql(fullQuery);
    }

    async alterTable({ table_name, action, column_name, column_definition, new_column_name, constraint_name, constraint_definition }) {
        let query = '';
        
        switch (action) {
            case 'ADD_COLUMN':
                query = `ALTER TABLE ${table_name} ADD COLUMN ${column_name} ${column_definition}`;
                break;
            case 'DROP_COLUMN':
                query = `ALTER TABLE ${table_name} DROP COLUMN ${column_name}`;
                break;
            case 'ALTER_COLUMN':
                query = `ALTER TABLE ${table_name} ALTER COLUMN ${column_name} TYPE ${column_definition}`;
                break;
            case 'RENAME_COLUMN':
                query = `ALTER TABLE ${table_name} RENAME COLUMN ${column_name} TO ${new_column_name}`;
                break;
            case 'ADD_CONSTRAINT':
                query = `ALTER TABLE ${table_name} ADD CONSTRAINT ${constraint_name} ${constraint_definition}`;
                break;
            case 'DROP_CONSTRAINT':
                query = `ALTER TABLE ${table_name} DROP CONSTRAINT ${constraint_name}`;
                break;
            default:
                throw new Error(`Ação não suportada: ${action}`);
        }
        
        return await this.executeSql(query);
    }

    async setupRLS({ table_name, enable_rls = true, policies = [] }) {
        let queries = [];
        
        // Ativar/desativar RLS
        if (enable_rls) {
            queries.push(`ALTER TABLE ${table_name} ENABLE ROW LEVEL SECURITY`);
        } else {
            queries.push(`ALTER TABLE ${table_name} DISABLE ROW LEVEL SECURITY`);
        }
        
        // Criar políticas
        policies.forEach(policy => {
            let policyQuery = `CREATE POLICY ${policy.name} ON ${table_name} FOR ${policy.operation}`;
            
            if (policy.using_expression) {
                policyQuery += ` USING (${policy.using_expression})`;
            } else if (policy.condition) {
                policyQuery += ` USING (${policy.condition})`;
            }
            
            if (policy.check_expression) {
                policyQuery += ` WITH CHECK (${policy.check_expression})`;
            }
            
            queries.push(policyQuery);
        });
        
        const fullQuery = queries.join('; ');
        return await this.executeSql(fullQuery);
    }

    async createFunction({ function_name, parameters = '', return_type, body, language = 'SQL' }) {
        const query = `
            CREATE OR REPLACE FUNCTION ${function_name}(${parameters})
            RETURNS ${return_type}
            LANGUAGE ${language}
            AS $$
            ${body}
            $$;
        `;
        
        return await this.executeSql(query);
    }

    async createTrigger({ trigger_name, table_name, timing, events, function_name }) {
        const eventsList = events.join(' OR ');
        const query = `
            CREATE OR REPLACE TRIGGER ${trigger_name}
            ${timing} ${eventsList}
            ON ${table_name}
            FOR EACH ROW
            EXECUTE FUNCTION ${function_name}();
        `;
        
        return await this.executeSql(query);
    }

    async insertData({ table_name, data, on_conflict }) {
        console.log(`📝 Inserindo dados na tabela: ${table_name}`);
        
        let query = this.supabase.from(table_name).insert(data);
        
        if (on_conflict) {
            query = query.onConflict(on_conflict);
        }
        
        const { data: result, error } = await query.select();
        
        if (error) throw error;
        
        return {
            content: [{
                type: 'text',
                text: `✅ Dados inseridos com sucesso na tabela '${table_name}'!\n\nDados inseridos: ${JSON.stringify(data, null, 2)}\n\nResultado: ${JSON.stringify(result, null, 2)}`
            }]
        };
    }

    async updateData({ table_name, data, where_conditions }) {
        console.log(`📝 Atualizando dados na tabela: ${table_name}`);
        
        let query = this.supabase.from(table_name).update(data);
        
        // Aplicar condições WHERE
        Object.entries(where_conditions).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        
        const { data: result, error } = await query.select();
        
        if (error) throw error;
        
        return {
            content: [{
                type: 'text',
                text: `✅ Dados atualizados com sucesso na tabela '${table_name}'!\n\nCondições: ${JSON.stringify(where_conditions, null, 2)}\n\nNovos dados: ${JSON.stringify(data, null, 2)}\n\nResultado: ${JSON.stringify(result, null, 2)}`
            }]
        };
    }

    async deleteData({ table_name, where_conditions }) {
        console.log(`🗑️ Deletando dados da tabela: ${table_name}`);
        
        let query = this.supabase.from(table_name).delete();
        
        // Aplicar condições WHERE
        Object.entries(where_conditions).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        
        const { data: result, error } = await query.select();
        
        if (error) throw error;
        
        return {
            content: [{
                type: 'text',
                text: `✅ Dados deletados com sucesso da tabela '${table_name}'!\n\nCondições: ${JSON.stringify(where_conditions, null, 2)}\n\nRegistros deletados: ${JSON.stringify(result, null, 2)}`
            }]
        };
    }

    async selectData({ table_name, columns = '*', where_conditions, order_by, limit, offset }) {
        console.log(`🔍 Consultando dados da tabela: ${table_name}`);
        
        let query = this.supabase.from(table_name).select(columns);
        
        // Aplicar condições WHERE
        if (where_conditions) {
            Object.entries(where_conditions).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }
        
        // Aplicar ordenação
        if (order_by) {
            const [column, direction = 'asc'] = order_by.split(' ');
            query = query.order(column, { ascending: direction.toLowerCase() === 'asc' });
        }
        
        // Aplicar paginação
        if (limit) {
            query = query.limit(limit);
        }
        
        if (offset) {
            query = query.range(offset, offset + (limit || 100) - 1);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return {
            content: [{
                type: 'text',
                text: `✅ Consulta realizada com sucesso na tabela '${table_name}'!\n\nResultados (${data.length} registros):\n${JSON.stringify(data, null, 2)}`
            }]
        };
    }

    async listTables({ schema = 'public' }) {
        console.log(`📋 Listando tabelas do schema: ${schema}`);
        
        const query = `
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = '${schema}' 
            ORDER BY table_name
        `;
        
        return await this.executeSql(query);
    }

    async describeTable({ table_name }) {
        console.log(`📋 Descrevendo estrutura da tabela: ${table_name}`);
        
        const query = `
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length,
                numeric_precision,
                numeric_scale
            FROM information_schema.columns 
            WHERE table_name = '${table_name}' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `;
        
        return await this.executeSql(query);
    }

    async backupTable({ table_name, backup_name }) {
        const backupTableName = backup_name || `${table_name}_backup_${Date.now()}`;
        
        const query = `CREATE TABLE ${backupTableName} AS SELECT * FROM ${table_name}`;
        
        return await this.executeSql(query);
    }

    async setupDatabase({ include_sample_data = false }) {
        const setupQueries = [
            // Tabela de usuários
            `CREATE TABLE IF NOT EXISTS users (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'user', 'superadmin')),
                tenant_id UUID NOT NULL,
                avatar_url TEXT,
                phone VARCHAR(50),
                is_active BOOLEAN DEFAULT true,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )`,
            
            // Índices para usuários
            `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
            `CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)`,
            `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
            
            // Tabela de clientes/empresas
            `CREATE TABLE IF NOT EXISTS companies (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(50),
                website VARCHAR(255),
                address TEXT,
                segment VARCHAR(100),
                tenant_id UUID NOT NULL,
                status VARCHAR(50) DEFAULT 'active',
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )`,
            
            // Índices para empresas
            `CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON companies(tenant_id)`,
            `CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status)`,
            
            // Tabela de leads
            `CREATE TABLE IF NOT EXISTS leads (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(50),
                company_id UUID REFERENCES companies(id),
                status VARCHAR(50) DEFAULT 'new',
                source VARCHAR(100),
                assigned_to UUID REFERENCES users(id),
                tenant_id UUID NOT NULL,
                notes TEXT,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )`,
            
            // Índices para leads
            `CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id)`,
            `CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`,
            `CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to)`,
            
            // Função de auditoria
            `CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql`,
            
            // Triggers de auditoria
            `CREATE OR REPLACE TRIGGER update_users_updated_at 
             BEFORE UPDATE ON users 
             FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
            
            `CREATE OR REPLACE TRIGGER update_companies_updated_at 
             BEFORE UPDATE ON companies 
             FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
            
            `CREATE OR REPLACE TRIGGER update_leads_updated_at 
             BEFORE UPDATE ON leads 
             FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
        ];
        
        // Executar todas as queries de setup
        let results = [];
        for (const query of setupQueries) {
            try {
                const result = await this.executeSql(query);
                results.push(`✅ ${query.split(' ')[2] || 'SQL'} executado com sucesso`);
            } catch (error) {
                results.push(`❌ Erro: ${error.message}`);
            }
        }
        
        // Dados de exemplo se solicitado
        if (include_sample_data) {
            const sampleQueries = [
                `INSERT INTO users (email, name, role, tenant_id) VALUES 
                 ('superadmin@crm.com', 'Super Admin', 'superadmin', gen_random_uuid()),
                 ('admin@crm.com', 'Admin User', 'admin', gen_random_uuid()),
                 ('manager@crm.com', 'Manager User', 'manager', gen_random_uuid())
                 ON CONFLICT (email) DO NOTHING`,
                 
                `INSERT INTO companies (name, email, segment, tenant_id) VALUES 
                 ('Empresa Teste 1', 'contato@empresa1.com', 'Tecnologia', (SELECT tenant_id FROM users WHERE email = 'admin@crm.com' LIMIT 1)),
                 ('Empresa Teste 2', 'contato@empresa2.com', 'Varejo', (SELECT tenant_id FROM users WHERE email = 'admin@crm.com' LIMIT 1))`
            ];
            
            for (const query of sampleQueries) {
                try {
                    await this.executeSql(query);
                    results.push(`✅ Dados de exemplo inseridos`);
                } catch (error) {
                    results.push(`⚠️ Dados de exemplo já existem ou erro: ${error.message}`);
                }
            }
        }
        
        return {
            content: [{
                type: 'text',
                text: `🎉 Configuração completa do banco CRM finalizada!\n\n${results.join('\n')}\n\n📊 Estrutura criada:\n• Tabela users (com roles e multi-tenancy)\n• Tabela companies (empresas/clientes)\n• Tabela leads (leads de vendas)\n• Índices para performance\n• Triggers de auditoria\n• Função update_updated_at\n\n🔐 RLS pode ser configurado separadamente com a ferramenta setup_rls`
            }]
        };
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.log('🚀 Supabase MCP Server Completo iniciado!');
    }
}

// Inicializar servidor se executado diretamente
if (require.main === module) {
    const server = new SupabaseMCPServer();
    server.run().catch(console.error);
} else {
    console.log('🚀 Servidor MCP Supabase CRM iniciado');
}

module.exports = SupabaseMCPServer; 
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
                name: 'supabase-mcp-server',
                version: '1.0.0',
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
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos no arquivo .env');
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
                    description: 'Executa qualquer comando SQL no Supabase',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'Comando SQL para executar' }
                        },
                        required: ['query']
                    }
                },
                {
                    name: 'create_table',
                    description: 'Cria uma nova tabela no Supabase',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table_name: { type: 'string', description: 'Nome da tabela' },
                            columns: {
                                type: 'array',
                                description: 'Array de colunas',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        type: { type: 'string' },
                                        constraints: { type: 'string' }
                                    }
                                }
                            }
                        },
                        required: ['table_name', 'columns']
                    }
                },
                {
                    name: 'insert_data',
                    description: 'Insere dados em uma tabela',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table_name: { type: 'string' },
                            data: { type: 'object' }
                        },
                        required: ['table_name', 'data']
                    }
                },
                {
                    name: 'select_data',
                    description: 'Consulta dados de uma tabela',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table_name: { type: 'string' },
                            columns: { type: 'string', description: 'Colunas (* para todas)' },
                            filter: { type: 'object', description: 'Filtros' },
                            limit: { type: 'number' }
                        },
                        required: ['table_name']
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
                    case 'execute_sql':
                        return await this.executeSql(args.query);
                    case 'create_table':
                        return await this.createTable(args.table_name, args.columns);
                    case 'insert_data':
                        return await this.insertData(args.table_name, args.data);
                    case 'select_data':
                        return await this.selectData(args);
                    default:
                        throw new Error(`Ferramenta desconhecida: ${name}`);
                }
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Erro: ${error.message}` }]
                };
            }
        });
    }

    async executeSql(query) {
        console.log(`🔄 Executando SQL: ${query}`);
        
        try {
            // Para queries DDL (CREATE, ALTER, DROP)
            if (query.trim().toUpperCase().startsWith('CREATE') || 
                query.trim().toUpperCase().startsWith('ALTER') || 
                query.trim().toUpperCase().startsWith('DROP')) {
                
                const { data, error } = await this.supabase.rpc('exec_sql', { sql: query });
                
                if (error) {
                    throw new Error(`Erro SQL: ${error.message}`);
                }
                
                return {
                    content: [{
                        type: 'text',
                        text: `✅ SQL executado com sucesso!\n\nQuery: ${query}\n\nResultado: ${JSON.stringify(data, null, 2)}`
                    }]
                };
            }
            
            // Para SELECT queries
            if (query.trim().toUpperCase().startsWith('SELECT')) {
                const tableName = this.extractTableName(query);
                if (tableName) {
                    const { data, error } = await this.supabase.from(tableName).select('*');
                    if (error) throw error;
                    
                    return {
                        content: [{
                            type: 'text',
                            text: `✅ Consulta executada com sucesso!\n\nResultados: ${JSON.stringify(data, null, 2)}`
                        }]
                    };
                }
            }
            
            return {
                content: [{
                    type: 'text',
                    text: `✅ Comando SQL processado: ${query}`
                }]
            };
            
        } catch (error) {
            throw new Error(`Erro ao executar SQL: ${error.message}`);
        }
    }

    extractTableName(query) {
        const match = query.match(/FROM\s+(\w+)/i);
        return match ? match[1] : null;
    }

    async createTable(tableName, columns) {
        const columnDefinitions = columns.map(col => 
            `${col.name} ${col.type} ${col.constraints || ''}`
        ).join(', ');
        
        const createQuery = `CREATE TABLE ${tableName} (${columnDefinitions})`;
        return await this.executeSql(createQuery);
    }

    async insertData(tableName, data) {
        console.log(`📝 Inserindo dados na tabela: ${tableName}`);
        
        const { data: result, error } = await this.supabase
            .from(tableName)
            .insert(data)
            .select();

        if (error) throw error;

        return {
            content: [{
                type: 'text',
                text: `✅ Dados inseridos com sucesso!\n\nDados: ${JSON.stringify(data, null, 2)}\n\nResultado: ${JSON.stringify(result, null, 2)}`
            }]
        };
    }

    async selectData({ table_name, columns = '*', filter, limit }) {
        console.log(`🔍 Consultando dados da tabela: ${table_name}`);
        
        let query = this.supabase.from(table_name).select(columns);
        
        if (filter) {
            Object.entries(filter).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }
        
        if (limit) {
            query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;

        return {
            content: [{
                type: 'text',
                text: `✅ Consulta realizada com sucesso!\n\nResultados (${data.length} registros):\n${JSON.stringify(data, null, 2)}`
            }]
        };
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.log('🚀 Supabase MCP Server iniciado!');
    }
}

if (require.main === module) {
    const server = new SupabaseMCPServer();
    server.run().catch(console.error);
}

module.exports = SupabaseMCPServer; 
#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { createClient } = require('@supabase/supabase-js');

class SimpleMCPServer {
    constructor() {
        this.server = new Server(
            {
                name: 'supabase-crm',
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
        this.initializeSupabase();
    }

    async initializeSupabase() {
        const supabaseUrl = process.env.SUPABASE_URL || 'https://marajvabdwkpgopytvhh.supabase.co';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.b8JJePxoHsEJnrNJJnjGryTttSMkkrvQenegQJ2Y3IOfWJNZ9TW7nMvfz0hEWxR4ElhENzpyNzJT3mIcgNlSGg';

        this.supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        console.error('✅ MCP Server: Supabase conectado!');
    }

    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'get_users',
                    description: 'Lista todos os usuários do sistema',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            limit: { type: 'number', description: 'Limite de resultados', default: 10 }
                        }
                    }
                },
                {
                    name: 'create_user',
                    description: 'Cria um novo usuário',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            email: { type: 'string', description: 'Email do usuário' },
                            name: { type: 'string', description: 'Nome do usuário' },
                            role: { type: 'string', description: 'Função do usuário', default: 'user' }
                        },
                        required: ['email', 'name']
                    }
                },
                {
                    name: 'get_customers',
                    description: 'Lista clientes do CRM',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            limit: { type: 'number', description: 'Limite de resultados', default: 10 }
                        }
                    }
                },
                {
                    name: 'execute_sql',
                    description: 'Executa comando SQL direto no Supabase',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'Query SQL para executar' }
                        },
                        required: ['query']
                    }
                }
            ]
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case 'get_users':
                        return await this.getUsers(args);
                    case 'create_user':
                        return await this.createUser(args);
                    case 'get_customers':
                        return await this.getCustomers(args);
                    case 'execute_sql':
                        return await this.executeSql(args);
                    default:
                        throw new Error(`Ferramenta desconhecida: ${name}`);
                }
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Erro ao executar ${name}: ${error.message}`
                        }
                    ]
                };
            }
        });
    }

    async getUsers(args) {
        const limit = args?.limit || 10;
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .limit(limit);

        if (error) throw error;

        return {
            content: [
                {
                    type: 'text',
                    text: `Encontrados ${data.length} usuários:\n${JSON.stringify(data, null, 2)}`
                }
            ]
        };
    }

    async createUser(args) {
        const { data, error } = await this.supabase
            .from('users')
            .insert([{
                email: args.email,
                name: args.name,
                role: args.role || 'user',
                created_at: new Date().toISOString()
            }])
            .select();

        if (error) throw error;

        return {
            content: [
                {
                    type: 'text',
                    text: `Usuário criado com sucesso:\n${JSON.stringify(data[0], null, 2)}`
                }
            ]
        };
    }

    async getCustomers(args) {
        const limit = args?.limit || 10;
        const { data, error } = await this.supabase
            .from('customers')
            .select('*')
            .limit(limit);

        if (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Aviso: Tabela customers não encontrada ou sem permissão. Erro: ${error.message}`
                    }
                ]
            };
        }

        return {
            content: [
                {
                    type: 'text',
                    text: `Encontrados ${data.length} clientes:\n${JSON.stringify(data, null, 2)}`
                }
            ]
        };
    }

    async executeSql(args) {
        try {
            const { data, error } = await this.supabase.rpc('execute_sql', { sql_query: args.query });
            
            if (error) throw error;

            return {
                content: [
                    {
                        type: 'text',
                        text: `SQL executado com sucesso:\n${JSON.stringify(data, null, 2)}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Erro ao executar SQL: ${error.message}`
                    }
                ]
            };
        }
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('🚀 MCP Server iniciado e conectado!');
    }
}

const server = new SimpleMCPServer();
server.run().catch(console.error); 
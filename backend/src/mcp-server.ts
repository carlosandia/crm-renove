import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export class IntegratedMCPServer {
    private server: Server;
    private supabase: SupabaseClient;
    private isInitialized = false;

    constructor() {
        this.server = new Server(
            {
                name: 'supabase-crm-integrated',
                version: '2.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.initializeSupabase();
        this.setupToolHandlers();
    }

    private initializeSupabase() {
        const supabaseUrl = process.env.SUPABASE_URL || 'https://marajvabdwkpgopytvhh.supabase.co';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

        this.supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        console.log('✅ MCP Server integrado: Conexão Supabase inicializada');
    }

    private setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'get_users',
                    description: 'Buscar usuários do sistema CRM',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            role: { type: 'string', description: 'Filtrar por role' },
                            tenant_id: { type: 'string', description: 'Filtrar por tenant' },
                            limit: { type: 'number', default: 10, description: 'Limite de resultados' }
                        }
                    }
                },
                {
                    name: 'create_user',
                    description: 'Criar novo usuário no sistema',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            email: { type: 'string', description: 'Email do usuário' },
                            name: { type: 'string', description: 'Nome completo' },
                            role: { type: 'string', enum: ['admin', 'manager', 'user'], description: 'Role do usuário' },
                            tenant_id: { type: 'string', description: 'ID do tenant' }
                        },
                        required: ['email', 'name', 'role', 'tenant_id']
                    }
                },
                {
                    name: 'get_companies',
                    description: 'Buscar empresas/clientes',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            tenant_id: { type: 'string', description: 'ID do tenant' },
                            status: { type: 'string', description: 'Status da empresa' },
                            limit: { type: 'number', default: 10, description: 'Limite de resultados' }
                        },
                        required: ['tenant_id']
                    }
                },
                {
                    name: 'create_company',
                    description: 'Criar nova empresa/cliente',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'Nome da empresa' },
                            email: { type: 'string', description: 'Email da empresa' },
                            phone: { type: 'string', description: 'Telefone' },
                            website: { type: 'string', description: 'Website' },
                            segment: { type: 'string', description: 'Segmento da empresa' },
                            tenant_id: { type: 'string', description: 'ID do tenant' }
                        },
                        required: ['name', 'tenant_id']
                    }
                },
                {
                    name: 'get_leads',
                    description: 'Buscar leads de vendas',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            tenant_id: { type: 'string', description: 'ID do tenant' },
                            status: { type: 'string', description: 'Status do lead' },
                            assigned_to: { type: 'string', description: 'Responsável pelo lead' },
                            limit: { type: 'number', default: 10, description: 'Limite de resultados' }
                        },
                        required: ['tenant_id']
                    }
                },
                {
                    name: 'create_lead',
                    description: 'Criar novo lead',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'Nome do lead' },
                            email: { type: 'string', description: 'Email do lead' },
                            phone: { type: 'string', description: 'Telefone' },
                            company_id: { type: 'string', description: 'ID da empresa relacionada' },
                            source: { type: 'string', description: 'Origem do lead' },
                            assigned_to: { type: 'string', description: 'Responsável' },
                            tenant_id: { type: 'string', description: 'ID do tenant' }
                        },
                        required: ['name', 'tenant_id']
                    }
                },
                {
                    name: 'execute_query',
                    description: 'Executar consulta SQL personalizada',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table: { type: 'string', description: 'Nome da tabela' },
                            select: { type: 'string', default: '*', description: 'Campos para selecionar' },
                            where: { type: 'object', description: 'Condições WHERE' },
                            order_by: { type: 'string', description: 'Ordenação' },
                            limit: { type: 'number', description: 'Limite de registros' }
                        },
                        required: ['table']
                    }
                },
                {
                    name: 'get_dashboard_stats',
                    description: 'Estatísticas do dashboard CRM',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            tenant_id: { type: 'string', description: 'ID do tenant' }
                        },
                        required: ['tenant_id']
                    }
                }
            ]
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case 'get_users': return await this.getUsers(args);
                    case 'create_user': return await this.createUser(args);
                    case 'get_companies': return await this.getCompanies(args);
                    case 'create_company': return await this.createCompany(args);
                    case 'get_leads': return await this.getLeads(args);
                    case 'create_lead': return await this.createLead(args);
                    case 'execute_query': return await this.executeQuery(args);
                    case 'get_dashboard_stats': return await this.getDashboardStats(args);
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

    // Implementação dos métodos das ferramentas MCP
    private async getUsers(args: any) {
        let query = this.supabase.from('users').select('*');
        
        if (args.role) query = query.eq('role', args.role);
        if (args.tenant_id) query = query.eq('tenant_id', args.tenant_id);
        if (args.limit) query = query.limit(args.limit);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        return {
            content: [{
                type: 'text',
                text: `📋 Usuários encontrados: ${data.length}\n\n${data.map(user => 
                    `👤 ${user.name} (${user.email})\n   🔑 Role: ${user.role}\n   🏢 Tenant: ${user.tenant_id}`
                ).join('\n\n')}`
            }]
        };
    }

    private async createUser(args: any) {
        const { data, error } = await this.supabase
            .from('users')
            .insert([args])
            .select()
            .single();

        if (error) throw error;

        return {
            content: [{
                type: 'text',
                text: `✅ Usuário criado: ${data.name} (${data.email})\n🔑 Role: ${data.role}\n🏢 Tenant: ${data.tenant_id}`
            }]
        };
    }

    private async getCompanies(args: any) {
        let query = this.supabase.from('companies').select('*');
        
        query = query.eq('tenant_id', args.tenant_id);
        if (args.status) query = query.eq('status', args.status);
        if (args.limit) query = query.limit(args.limit);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        return {
            content: [{
                type: 'text',
                text: `🏢 Empresas encontradas: ${data.length}\n\n${data.map(company => 
                    `🏢 ${company.name}\n   📧 ${company.email || 'N/A'}\n   🌐 ${company.website || 'N/A'}\n   📊 ${company.segment || 'N/A'}`
                ).join('\n\n')}`
            }]
        };
    }

    private async createCompany(args: any) {
        const { data, error } = await this.supabase
            .from('companies')
            .insert([args])
            .select()
            .single();

        if (error) throw error;

        return {
            content: [{
                type: 'text',
                text: `✅ Empresa criada: ${data.name}\n📧 Email: ${data.email || 'N/A'}\n🌐 Website: ${data.website || 'N/A'}`
            }]
        };
    }

    private async getLeads(args: any) {
        let query = this.supabase.from('leads').select(`
            *, 
            companies(name, email),
            assigned_user:users!leads_assigned_to_fkey(name, email)
        `);
        
        query = query.eq('tenant_id', args.tenant_id);
        if (args.status) query = query.eq('status', args.status);
        if (args.assigned_to) query = query.eq('assigned_to', args.assigned_to);
        if (args.limit) query = query.limit(args.limit);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        return {
            content: [{
                type: 'text',
                text: `🎯 Leads encontrados: ${data.length}\n\n${data.map(lead => 
                    `🎯 ${lead.name} (${lead.email || 'N/A'})\n   📞 ${lead.phone || 'N/A'}\n   🏢 ${lead.companies?.name || 'N/A'}\n   📊 Status: ${lead.status}\n   👤 Responsável: ${lead.assigned_user?.name || 'N/A'}`
                ).join('\n\n')}`
            }]
        };
    }

    private async createLead(args: any) {
        const { data, error } = await this.supabase
            .from('leads')
            .insert([args])
            .select()
            .single();

        if (error) throw error;

        return {
            content: [{
                type: 'text',
                text: `✅ Lead criado: ${data.name}\n📧 Email: ${data.email || 'N/A'}\n📞 Telefone: ${data.phone || 'N/A'}\n📊 Status: ${data.status}`
            }]
        };
    }

    private async executeQuery(args: any) {
        let query = this.supabase.from(args.table).select(args.select || '*');

        if (args.where) {
            Object.entries(args.where).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }

        if (args.order_by) {
            const [column, direction = 'asc'] = args.order_by.split(' ');
            query = query.order(column, { ascending: direction.toLowerCase() === 'asc' });
        }

        if (args.limit) query = query.limit(args.limit);

        const { data, error } = await query;

        if (error) throw error;

        return {
            content: [{
                type: 'text',
                text: `📊 Consulta executada na tabela '${args.table}'\n\nResultados (${data.length} registros):\n${JSON.stringify(data, null, 2)}`
            }]
        };
    }

    private async getDashboardStats(args: any) {
        try {
            const [usersResult, companiesResult, leadsResult] = await Promise.all([
                this.supabase.from('users').select('count', { count: 'exact', head: true }).eq('tenant_id', args.tenant_id),
                this.supabase.from('companies').select('count', { count: 'exact', head: true }).eq('tenant_id', args.tenant_id),
                this.supabase.from('leads').select('count', { count: 'exact', head: true }).eq('tenant_id', args.tenant_id)
            ]);

            const stats = {
                users: usersResult.count || 0,
                companies: companiesResult.count || 0,
                leads: leadsResult.count || 0
            };

            return {
                content: [{
                    type: 'text',
                    text: `📊 Estatísticas do Dashboard (Tenant: ${args.tenant_id})\n\n👥 Usuários: ${stats.users}\n🏢 Empresas: ${stats.companies}\n🎯 Leads: ${stats.leads}\n\n📈 Total de registros: ${stats.users + stats.companies + stats.leads}`
                }]
            };
        } catch (error) {
            throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
        }
    }

    async initialize() {
        if (this.isInitialized) return;
        
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        this.isInitialized = true;
        
        console.log('🚀 MCP Server integrado inicializado com sucesso!');
        console.log('🛠️ 8 ferramentas disponíveis para CRM');
    }

    // Método para uso interno do backend
    async getSupabaseClient() {
        return this.supabase;
    }

    // Método para executar operações internas
    async executeInternalOperation(operation: string, params: any) {
        switch (operation) {
            case 'getUsers': return await this.getUsers(params);
            case 'createUser': return await this.createUser(params);
            case 'getCompanies': return await this.getCompanies(params);
            case 'createCompany': return await this.createCompany(params);
            case 'getLeads': return await this.getLeads(params);
            case 'createLead': return await this.createLead(params);
            case 'getDashboardStats': return await this.getDashboardStats(params);
            default: throw new Error(`Operação desconhecida: ${operation}`);
        }
    }
}

// Instância singleton para uso no backend
export const mcpServer = new IntegratedMCPServer(); 
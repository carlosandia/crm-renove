import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

export class MCPIntegration {
    private supabase!: SupabaseClient;

    constructor() {
        this.initializeSupabase();
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

        console.log('✅ MCP Integration: Supabase conectado');
    }

    // Métodos para integração com MCP Tools
    async getUsers(filters: any = {}) {
        let query = this.supabase.from('users').select('*');
        
        if (filters.role) query = query.eq('role', filters.role);
        if (filters.tenant_id) query = query.eq('tenant_id', filters.tenant_id);
        if (filters.limit) query = query.limit(filters.limit);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    async createUser(userData: any) {
        const { data, error } = await this.supabase
            .from('users')
            .insert([userData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getCompanies(filters: any = {}) {
        let query = this.supabase.from('companies').select('*');
        
        if (filters.tenant_id) query = query.eq('tenant_id', filters.tenant_id);
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.limit) query = query.limit(filters.limit);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    async createCompany(companyData: any) {
        const { data, error } = await this.supabase
            .from('companies')
            .insert([companyData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getLeads(filters: any = {}) {
        let query = this.supabase.from('leads').select(`
            *, 
            companies(name, email),
            assigned_user:users!leads_assigned_to_fkey(name, email)
        `);
        
        if (filters.tenant_id) query = query.eq('tenant_id', filters.tenant_id);
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
        if (filters.limit) query = query.limit(filters.limit);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    async createLead(leadData: any) {
        const { data, error } = await this.supabase
            .from('leads')
            .insert([leadData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getDashboardStats(tenantId: string) {
        try {
            const [usersResult, companiesResult, leadsResult] = await Promise.all([
                this.supabase.from('users').select('count', { count: 'exact', head: true }).eq('tenant_id', tenantId),
                this.supabase.from('companies').select('count', { count: 'exact', head: true }).eq('tenant_id', tenantId),
                this.supabase.from('leads').select('count', { count: 'exact', head: true }).eq('tenant_id', tenantId)
            ]);

            return {
                users: usersResult.count || 0,
                companies: companiesResult.count || 0,
                leads: leadsResult.count || 0
            };
        } catch (error) {
            throw new Error(`Erro ao buscar estatísticas: ${(error as Error).message}`);
        }
    }

    // Método para execução de queries personalizadas
    async executeCustomQuery(table: string, options: any = {}) {
        let query = this.supabase.from(table).select(options.select || '*');

        if (options.where) {
            Object.entries(options.where).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }

        if (options.order_by) {
            const [column, direction = 'asc'] = options.order_by.split(' ');
            query = query.order(column, { ascending: direction.toLowerCase() === 'asc' });
        }

        if (options.limit) query = query.limit(options.limit);

        const { data, error } = await query;

        if (error) throw error;
        return data;
    }

    // Método para atualizar registros (UPDATE)
    async updateRecord(table: string, updateData: any, filters: any = {}) {
        let query = this.supabase.from(table).update(updateData);

        // Aplicar filtros para WHERE
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }

        const { data, error } = await query.select();

        if (error) throw error;
        return data;
    }

    // Método para deletar registros (DELETE)
    async deleteRecord(table: string, filters: any = {}) {
        let query = this.supabase.from(table).delete();

        // Aplicar filtros para WHERE
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }

        const { data, error } = await query.select();

        if (error) throw error;
        return data;
    }

    // Método para consultar meta-informações das tabelas
    async getTableStructure(tableName: string) {
        try {
            // Tentar obter estrutura via information_schema
            const { data, error } = await this.supabase
                .rpc('get_table_columns', { table_name: tableName });

            if (error) {
                // Fallback: fazer uma query simples para obter as colunas
                const { data: sampleData, error: sampleError } = await this.supabase
                    .from(tableName)
                    .select('*')
                    .limit(1);

                if (sampleError) throw sampleError;

                // Retornar estrutura baseada no primeiro registro
                if (sampleData && sampleData.length > 0) {
                    const columns = Object.keys(sampleData[0]).map(column => ({
                        column_name: column,
                        data_type: typeof sampleData[0][column],
                        is_nullable: 'unknown'
                    }));
                    return columns;
                }
                return [];
            }
            return data;
        } catch (error) {
            throw new Error(`Erro ao obter estrutura da tabela ${tableName}: ${(error as Error).message}`);
        }
    }

    // Método para listar todas as tabelas do banco
    async listTables() {
        try {
            const { data, error } = await this.supabase
                .rpc('get_tables_info');

            if (error) {
                // Se a função não existir, usar query SQL direta
                const { data: tablesData, error: sqlError } = await this.supabase
                    .from('information_schema.tables')
                    .select('table_name, table_type')
                    .eq('table_schema', 'public')
                    .order('table_name');

                if (sqlError) {
                    // Fallback para tabelas conhecidas do sistema
                    return [
                        { table_name: 'users', table_type: 'BASE TABLE', description: 'Tabela de usuários' },
                        { table_name: 'companies', table_type: 'BASE TABLE', description: 'Tabela de empresas' },
                        { table_name: 'leads', table_type: 'BASE TABLE', description: 'Tabela de leads' },
                        { table_name: 'pipelines', table_type: 'BASE TABLE', description: 'Tabela de pipelines' },
                        { table_name: 'custom_fields', table_type: 'BASE TABLE', description: 'Tabela de campos customizados' },
                        { table_name: 'sales_goals', table_type: 'BASE TABLE', description: 'Tabela de metas de vendas' }
                    ];
                }
                return tablesData;
            }
            return data;
        } catch (error) {
            console.error('Erro ao listar tabelas:', error);
            // Retornar tabelas conhecidas do sistema como fallback
            return [
                { table_name: 'users', table_type: 'BASE TABLE', description: 'Tabela de usuários do sistema' },
                { table_name: 'companies', table_type: 'BASE TABLE', description: 'Tabela de empresas clientes' },
                { table_name: 'leads', table_type: 'BASE TABLE', description: 'Tabela de leads/oportunidades' },
                { table_name: 'pipelines', table_type: 'BASE TABLE', description: 'Tabela de pipelines de vendas' },
                { table_name: 'custom_fields', table_type: 'BASE TABLE', description: 'Tabela de campos customizados' },
                { table_name: 'sales_goals', table_type: 'BASE TABLE', description: 'Tabela de metas de vendas' }
            ];
        }
    }

    // Método para obter client Supabase
    getSupabaseClient() {
        return this.supabase;
    }
}

// Instância singleton
export const mcpIntegration = new MCPIntegration();

// Express middleware para MCP endpoints
export const mcpMiddleware = {
    // GET /api/mcp/users
    getUsers: async (req: Request, res: Response) => {
        try {
            const users = await mcpIntegration.getUsers(req.query);
            res.json({ success: true, data: users });
        } catch (error) {
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    },

    // POST /api/mcp/users
    createUser: async (req: Request, res: Response) => {
        try {
            const user = await mcpIntegration.createUser(req.body);
            res.json({ success: true, data: user });
        } catch (error) {
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    },

    // GET /api/mcp/companies
    getCompanies: async (req: Request, res: Response) => {
        try {
            const companies = await mcpIntegration.getCompanies(req.query);
            res.json({ success: true, data: companies });
        } catch (error) {
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    },

    // POST /api/mcp/companies
    createCompany: async (req: Request, res: Response) => {
        try {
            const company = await mcpIntegration.createCompany(req.body);
            res.json({ success: true, data: company });
        } catch (error) {
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    },

    // GET /api/mcp/leads
    getLeads: async (req: Request, res: Response) => {
        try {
            const leads = await mcpIntegration.getLeads(req.query);
            res.json({ success: true, data: leads });
        } catch (error) {
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    },

    // POST /api/mcp/leads
    createLead: async (req: Request, res: Response) => {
        try {
            const lead = await mcpIntegration.createLead(req.body);
            res.json({ success: true, data: lead });
        } catch (error) {
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    },

    // GET /api/mcp/dashboard/:tenantId
    getDashboard: async (req: Request, res: Response) => {
        try {
            const stats = await mcpIntegration.getDashboardStats(req.params.tenantId);
            res.json({ success: true, data: stats });
        } catch (error) {
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    },

    // POST /api/mcp/query
    executeQuery: async (req: Request, res: Response) => {
        try {
            const { table, options } = req.body;
            const result = await mcpIntegration.executeCustomQuery(table, options);
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    },

    // GET /api/mcp/tables - Listar todas as tabelas
    listTables: async (req: Request, res: Response) => {
        try {
            const tables = await mcpIntegration.listTables();
            res.json({ 
                success: true, 
                data: tables,
                message: `${tables.length} tabelas encontradas`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                error: (error as Error).message,
                message: 'Erro ao listar tabelas'
            });
        }
    },

    // PUT /api/mcp/update - Atualizar registros
    updateRecord: async (req: Request, res: Response) => {
        try {
            const { table, updateData, filters } = req.body;
            const result = await mcpIntegration.updateRecord(table, updateData, filters);
            res.json({ 
                success: true, 
                data: result,
                message: `${result.length} registro(s) atualizado(s)`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                error: (error as Error).message,
                message: 'Erro ao atualizar registro'
            });
        }
    },

    // DELETE /api/mcp/delete - Deletar registros
    deleteRecord: async (req: Request, res: Response) => {
        try {
            const { table, filters } = req.body;
            const result = await mcpIntegration.deleteRecord(table, filters);
            res.json({ 
                success: true, 
                data: result,
                message: `${result.length} registro(s) deletado(s)`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                error: (error as Error).message,
                message: 'Erro ao deletar registro'
            });
        }
    },

    // GET /api/mcp/structure/:table - Obter estrutura da tabela
    getTableStructure: async (req: Request, res: Response) => {
        try {
            const { table } = req.params;
            const structure = await mcpIntegration.getTableStructure(table);
            res.json({ 
                success: true, 
                data: structure,
                table_name: table,
                columns_count: structure.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                error: (error as Error).message,
                message: `Erro ao obter estrutura da tabela ${req.params.table}`
            });
        }
    }
}; 
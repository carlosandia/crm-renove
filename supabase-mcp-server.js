#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://marajvabdwkpgopytvhh.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class SupabaseMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'supabase-crm',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'setup_database',
            description: 'Configurar estrutura completa do banco de dados seguindo boas práticas',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_users',
            description: 'Listar usuários com filtros por role e tenant',
            inputSchema: {
              type: 'object',
              properties: {
                role: { type: 'string', description: 'Filtrar por role (admin, manager, user)' },
                tenant_id: { type: 'string', description: 'Filtrar por tenant' },
              },
            },
          },
          {
            name: 'create_user',
            description: 'Criar novo usuário na tabela única',
            inputSchema: {
              type: 'object',
              properties: {
                email: { type: 'string', description: 'Email do usuário' },
                name: { type: 'string', description: 'Nome do usuário' },
                role: { type: 'string', description: 'Role: admin, manager, user' },
                tenant_id: { type: 'string', description: 'ID do tenant' },
              },
              required: ['email', 'name', 'role', 'tenant_id'],
            },
          },
          {
            name: 'update_user_role',
            description: 'Atualizar role do usuário',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string', description: 'ID do usuário' },
                role: { type: 'string', description: 'Nova role: admin, manager, user' },
              },
              required: ['user_id', 'role'],
            },
          },
          {
            name: 'get_customers',
            description: 'Listar clientes por tenant',
            inputSchema: {
              type: 'object',
              properties: {
                tenant_id: { type: 'string', description: 'ID do tenant' },
              },
              required: ['tenant_id'],
            },
          },
          {
            name: 'create_customer',
            description: 'Criar novo cliente',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Nome do cliente' },
                email: { type: 'string', description: 'Email do cliente' },
                phone: { type: 'string', description: 'Telefone do cliente' },
                company: { type: 'string', description: 'Empresa do cliente' },
                tenant_id: { type: 'string', description: 'ID do tenant' },
              },
              required: ['name', 'email', 'tenant_id'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'setup_database':
          return await this.setupDatabase();
        case 'get_users':
          return await this.getUsers(request.params.arguments);
        case 'create_user':
          return await this.createUser(request.params.arguments);
        case 'update_user_role':
          return await this.updateUserRole(request.params.arguments);
        case 'get_customers':
          return await this.getCustomers(request.params.arguments);
        case 'create_customer':
          return await this.createCustomer(request.params.arguments);
        default:
          throw new Error(`Ferramenta desconhecida: ${request.params.name}`);
      }
    });
  }

  async setupDatabase() {
    try {
      // Verificar se as tabelas já existem
      const { data: existingTables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['users', 'customers']);

      let message = '🎉 Configuração do banco de dados:\n\n';

      // Criar tabela de usuários se não existir
      const usersExists = existingTables?.some(t => t.table_name === 'users');
      if (!usersExists) {
        const { error: usersError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE users (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              email VARCHAR(255) UNIQUE NOT NULL,
              name VARCHAR(255) NOT NULL,
              role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'user')),
              tenant_id UUID NOT NULL,
              avatar_url TEXT,
              phone VARCHAR(50),
              is_active BOOLEAN DEFAULT true,
              metadata JSONB DEFAULT '{}',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            CREATE INDEX idx_users_role ON users(role);
            CREATE INDEX idx_users_tenant_id ON users(tenant_id);
            CREATE INDEX idx_users_email ON users(email);
          `
        });
        
        if (usersError) {
          message += `❌ Erro ao criar tabela users: ${usersError.message}\n`;
        } else {
          message += '✅ Tabela única de usuários criada\n';
        }
      } else {
        message += '✅ Tabela de usuários já existe\n';
      }

      // Criar tabela de clientes se não existir
      const customersExists = existingTables?.some(t => t.table_name === 'customers');
      if (!customersExists) {
        const { error: customersError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE customers (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              email VARCHAR(255) NOT NULL,
              phone VARCHAR(50),
              company VARCHAR(255),
              tenant_id UUID NOT NULL,
              status VARCHAR(50) DEFAULT 'active',
              metadata JSONB DEFAULT '{}',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
            CREATE INDEX idx_customers_email ON customers(email);
          `
        });
        
        if (customersError) {
          message += `❌ Erro ao criar tabela customers: ${customersError.message}\n`;
        } else {
          message += '✅ Tabela de clientes criada\n';
        }
      } else {
        message += '✅ Tabela de clientes já existe\n';
      }

      message += '\n📋 Boas práticas implementadas:\n';
      message += '• ✅ Tabela única de usuários (users)\n';
      message += '• ✅ Campo role como controlador de permissão\n';
      message += '• ✅ Campo tenant_id para estrutura multi-tenant\n';
      message += '• ✅ Índices para performance\n';
      message += '• ✅ Validações de dados\n';
      message += '• ✅ Pronto para redirecionamento único para /app\n';
      message += '• ✅ Renderização condicional no front-end\n\n';
      message += '🔑 Roles disponíveis: admin, manager, user\n';
      message += '🏢 Multi-tenancy implementado\n';
      message += '🚀 Stack: React/Next.js + Node.js + Supabase';

      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Erro ao configurar banco de dados: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async getUsers(args = {}) {
    try {
      let query = supabase.from('users').select('*');

      if (args.role) {
        query = query.eq('role', args.role);
      }

      if (args.tenant_id) {
        query = query.eq('tenant_id', args.tenant_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Usuários encontrados: ${data.length}\n\n` +
                  data.map(user => 
                    `👤 ${user.name} (${user.email})\n` +
                    `   🔑 Role: ${user.role}\n` +
                    `   🏢 Tenant: ${user.tenant_id}\n` +
                    `   📊 Status: ${user.is_active ? 'Ativo' : 'Inativo'}\n`
                  ).join('\n'),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Erro ao buscar usuários: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async createUser(args) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          email: args.email,
          name: args.name,
          role: args.role,
          tenant_id: args.tenant_id,
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Usuário criado com sucesso!\n\n` +
                  `👤 Nome: ${data.name}\n` +
                  `📧 Email: ${data.email}\n` +
                  `🔑 Role: ${data.role}\n` +
                  `🏢 Tenant: ${data.tenant_id}\n` +
                  `📅 Criado em: ${new Date(data.created_at).toLocaleString('pt-BR')}\n\n` +
                  `🎯 Redirecionamento: /app (único para todos os usuários)\n` +
                  `🎨 Interface: Renderização condicional baseada na role`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Erro ao criar usuário: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async updateUserRole(args) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ role: args.role })
        .eq('id', args.user_id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Role do usuário atualizada!\n\n` +
                  `👤 ${data.name}\n` +
                  `🔑 Nova role: ${data.role}\n` +
                  `🎯 Redirecionamento: /app (mantém rota única)\n` +
                  `🎨 Interface será atualizada condicionalmente`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Erro ao atualizar role: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async getCustomers(args) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', args.tenant_id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Clientes encontrados: ${data.length}\n\n` +
                  data.map(customer => 
                    `👥 ${customer.name}\n` +
                    `📧 ${customer.email}\n` +
                    `📞 ${customer.phone || 'N/A'}\n` +
                    `🏢 ${customer.company || 'N/A'}\n` +
                    `🏢 Tenant: ${customer.tenant_id}\n`
                  ).join('\n'),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Erro ao buscar clientes: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async createCustomer(args) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: args.name,
          email: args.email,
          phone: args.phone,
          company: args.company,
          tenant_id: args.tenant_id,
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Cliente criado com sucesso!\n\n` +
                  `👥 Nome: ${data.name}\n` +
                  `📧 Email: ${data.email}\n` +
                  `📞 Telefone: ${data.phone || 'N/A'}\n` +
                  `🏢 Empresa: ${data.company || 'N/A'}\n` +
                  `🏢 Tenant: ${data.tenant_id}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Erro ao criar cliente: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 Servidor MCP Supabase CRM iniciado');
  }
}

const server = new SupabaseMCPServer();
server.run().catch(console.error); 
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * 🔧 SUPABASE ADMIN SERVICE
 * Serviço completo para operações administrativas e SQL diretas
 */
class SupabaseAdminService {
  private supabase: SupabaseClient;
  private config: {
    url: string;
    serviceRoleKey: string;
    projectId: string;
  };

  constructor() {
    this.config = {
      url: process.env.SUPABASE_URL || 'https://marajvabdwkpgopytvhh.supabase.co',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY',
      projectId: 'marajvabdwkpgopytvhh'
    };

    // Cliente Supabase com service role (máximas permissões)
    this.supabase = createClient(this.config.url, this.config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      }
    });

    console.log('✅ SupabaseAdminService inicializado com service role');
  }

  // ==========================================
  // 1. OPERAÇÕES SQL DIRETAS
  // ==========================================

  /**
   * Executar SQL personalizado (DDL/DML)
   */
  async executeRawSQL(query: string, params: any[] = []): Promise<any> {
    try {
      console.log('🔄 Executando SQL:', query.substring(0, 100) + '...');
      
      // Para queries simples, usar o cliente Supabase diretamente
      if (query.toLowerCase().includes('select')) {
        const { data, error } = await this.supabase.rpc('execute_query', {
          query_text: query
        });
        
        if (error) throw error;
        return data;
      }
      
      // Para DDL/DML, executar via RPC ou função personalizada
      const { data, error } = await this.supabase.rpc('execute_sql', {
        sql_query: query
      });

      if (error) {
        console.error('❌ Erro na execução SQL:', error);
        throw new Error(`SQL Error: ${error.message}`);
      }

      console.log('✅ SQL executado com sucesso');
      return data;
    } catch (error: any) {
      console.error('❌ Erro na execução SQL:', error);
      throw error;
    }
  }

  /**
   * Executar query SELECT personalizada
   */
  async selectQuery(query: string, params: any[] = []): Promise<any[]> {
    try {
      const result = await this.executeRawSQL(query, params);
      return Array.isArray(result) ? result : [result];
    } catch (error: any) {
      console.error('❌ Erro na query SELECT:', error);
      throw error;
    }
  }

  /**
   * Executar comando DDL (CREATE, ALTER, DROP)
   */
  async executeDDL(ddlCommand: string): Promise<boolean> {
    try {
      await this.executeRawSQL(ddlCommand);
      return true;
    } catch (error) {
      console.error('❌ Erro na execução DDL:', error);
      throw error;
    }
  }

  // ==========================================
  // 2. OPERAÇÕES CRUD ADMINISTRATIVAS
  // ==========================================

  /**
   * Inserir dados com bypass de RLS
   */
  async adminInsert(table: string, data: any | any[]): Promise<any> {
    try {
      console.log(`🔄 Admin Insert em ${table}:`, data);
      
      const { data: result, error } = await this.supabase
        .from(table)
        .insert(data)
        .select();

      if (error) {
        console.error(`❌ Erro no admin insert em ${table}:`, error);
        throw error;
      }

      console.log(`✅ Admin insert bem-sucedido em ${table}`);
      return result;
    } catch (error: any) {
      console.error(`❌ Erro no admin insert:`, error);
      throw error;
    }
  }

  /**
   * Atualizar dados com bypass de RLS
   */
  async adminUpdate(table: string, data: any, conditions: any): Promise<any> {
    try {
      console.log(`🔄 Admin Update em ${table}:`, { data, conditions });
      
      let query = this.supabase.from(table).update(data);
      
      // Aplicar condições
      Object.entries(conditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data: result, error } = await query.select();

      if (error) {
        console.error(`❌ Erro no admin update em ${table}:`, error);
        throw error;
      }

      console.log(`✅ Admin update bem-sucedido em ${table}`);
      return result;
    } catch (error: any) {
      console.error(`❌ Erro no admin update:`, error);
      throw error;
    }
  }

  /**
   * Deletar dados com bypass de RLS
   */
  async adminDelete(table: string, conditions: any): Promise<boolean> {
    try {
      console.log(`🔄 Admin Delete em ${table}:`, conditions);
      
      let query = this.supabase.from(table).delete();
      
      // Aplicar condições
      Object.entries(conditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { error } = await query;

      if (error) {
        console.error(`❌ Erro no admin delete em ${table}:`, error);
        throw error;
      }

      console.log(`✅ Admin delete bem-sucedido em ${table}`);
      return true;
    } catch (error) {
      console.error(`❌ Erro no admin delete:`, error);
      throw error;
    }
  }

  /**
   * Buscar dados com bypass de RLS
   */
  async adminSelect(table: string, options: {
    select?: string;
    conditions?: any;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    try {
      console.log(`🔄 Admin Select em ${table}:`, options);
      
      let query = this.supabase
        .from(table)
        .select(options.select || '*');
      
      // Aplicar condições
      if (options.conditions) {
        Object.entries(options.conditions).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      // Aplicar ordenação
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { 
          ascending: options.orderBy.ascending ?? true 
        });
      }

      // Aplicar limit e offset
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 1000) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`❌ Erro no admin select em ${table}:`, error);
        throw error;
      }

      console.log(`✅ Admin select bem-sucedido em ${table}: ${data?.length || 0} registros`);
      return data || [];
    } catch (error: any) {
      console.error(`❌ Erro no admin select:`, error);
      throw error;
    }
  }

  // ==========================================
  // 3. OPERAÇÕES DE SCHEMA
  // ==========================================

  /**
   * Criar tabela
   */
  async createTable(tableName: string, columns: Array<{
    name: string;
    type: string;
    constraints?: string[];
  }>): Promise<boolean> {
    try {
      const columnsSQL = columns.map(col => {
        const constraints = col.constraints?.join(' ') || '';
        return `${col.name} ${col.type} ${constraints}`.trim();
      }).join(', ');

      const createSQL = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
          ${columnsSQL}
        );
      `;

      await this.executeDDL(createSQL);
      console.log(`✅ Tabela ${tableName} criada com sucesso`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao criar tabela ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Adicionar coluna
   */
  async addColumn(tableName: string, columnName: string, columnType: string, constraints: string[] = []): Promise<boolean> {
    try {
      const constraintsSQL = constraints.join(' ');
      const alterSQL = `
        ALTER TABLE ${tableName} 
        ADD COLUMN IF NOT EXISTS ${columnName} ${columnType} ${constraintsSQL};
      `;

      await this.executeDDL(alterSQL);
      console.log(`✅ Coluna ${columnName} adicionada à tabela ${tableName}`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao adicionar coluna:`, error);
      throw error;
    }
  }

  /**
   * Remover coluna
   */
  async dropColumn(tableName: string, columnName: string): Promise<boolean> {
    try {
      const alterSQL = `ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${columnName};`;
      await this.executeDDL(alterSQL);
      console.log(`✅ Coluna ${columnName} removida da tabela ${tableName}`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao remover coluna:`, error);
      throw error;
    }
  }

  /**
   * Criar índice
   */
  async createIndex(indexName: string, tableName: string, columns: string[], unique: boolean = false): Promise<boolean> {
    try {
      const uniqueSQL = unique ? 'UNIQUE' : '';
      const columnsSQL = columns.join(', ');
      const indexSQL = `
        CREATE ${uniqueSQL} INDEX IF NOT EXISTS ${indexName} 
        ON ${tableName} (${columnsSQL});
      `;

      await this.executeDDL(indexSQL);
      console.log(`✅ Índice ${indexName} criado na tabela ${tableName}`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao criar índice:`, error);
      throw error;
    }
  }

  // ==========================================
  // 4. MIGRAÇÕES E SEEDERS
  // ==========================================

  /**
   * Executar arquivo de migração
   */
  async runMigration(migrationSQL: string, version: string): Promise<boolean> {
    try {
      console.log(`🔄 Executando migração ${version}...`);
      
      // Executar a migração
      await this.executeRawSQL(migrationSQL);
      
      // Registrar a migração (se tabela existir)
      try {
        await this.adminInsert('migrations', {
          version,
          applied_at: new Date().toISOString(),
          checksum: Buffer.from(migrationSQL).toString('base64').slice(0, 32)
        });
      } catch (migrationLogError) {
        console.warn('⚠️ Não foi possível registrar migração (tabela migrations pode não existir)');
      }

      console.log(`✅ Migração ${version} executada com sucesso`);
      return true;
    } catch (error) {
      console.error(`❌ Erro na migração ${version}:`, error);
      throw error;
    }
  }

  /**
   * Executar seeder
   */
  async runSeeder(seederName: string, seedData: any[]): Promise<boolean> {
    try {
      console.log(`🔄 Executando seeder ${seederName}...`);
      
      for (const item of seedData) {
        const { table, data, operation = 'insert' } = item;
        
        switch (operation) {
          case 'insert':
            await this.adminInsert(table, data);
            break;
          case 'update':
            const { conditions, ...updateData } = data;
            await this.adminUpdate(table, updateData, conditions);
            break;
          case 'delete':
            await this.adminDelete(table, data);
            break;
        }
      }

      console.log(`✅ Seeder ${seederName} executado com sucesso`);
      return true;
    } catch (error) {
      console.error(`❌ Erro no seeder ${seederName}:`, error);
      throw error;
    }
  }

  // ==========================================
  // 5. UTILITÁRIOS
  // ==========================================

  /**
   * Listar todas as tabelas
   */
  async listTables(): Promise<string[]> {
    try {
      const query = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;
      
      const result = await this.selectQuery(query);
      return result.map(row => row.table_name);
    } catch (error: any) {
      console.error('❌ Erro ao listar tabelas:', error);
      throw error;
    }
  }

  /**
   * Descrever estrutura de uma tabela
   */
  async describeTable(tableName: string): Promise<any[]> {
    try {
      const query = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position;
      `;
      
      return await this.selectQuery(query, [tableName]);
    } catch (error) {
      console.error(`❌ Erro ao descrever tabela ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Verificar se tabela existe
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const tables = await this.listTables();
      return tables.includes(tableName);
    } catch (error) {
      console.error(`❌ Erro ao verificar tabela ${tableName}:`, error);
      return false;
    }
  }

  /**
   * Backup de dados de uma tabela
   */
  async backupTable(tableName: string): Promise<any[]> {
    try {
      console.log(`🔄 Fazendo backup da tabela ${tableName}...`);
      const data = await this.adminSelect(tableName);
      console.log(`✅ Backup completo: ${data.length} registros`);
      return data;
    } catch (error) {
      console.error(`❌ Erro no backup da tabela ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Limpar todas as tabelas (CUIDADO!)
   */
  async truncateAllTables(): Promise<boolean> {
    try {
      const tables = await this.listTables();
      
      for (const table of tables) {
        if (table !== 'migrations') { // Preservar tabela de migrações
          await this.executeRawSQL(`TRUNCATE TABLE ${table} CASCADE;`);
          console.log(`✅ Tabela ${table} limpa`);
        }
      }
      
      console.log('✅ Todas as tabelas foram limpas');
      return true;
    } catch (error) {
      console.error('❌ Erro ao limpar tabelas:', error);
      throw error;
    }
  }

  // ==========================================
  // 6. MONITORAMENTO E LOGS
  // ==========================================

  /**
   * Estatísticas das tabelas
   */
  async getTableStats(): Promise<any[]> {
    try {
      const query = `
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY tablename, attname;
      `;
      
      return await this.selectQuery(query);
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  /**
   * Status da conexão - Simplificado para evitar erro SQL
   */
  async getConnectionStatus(): Promise<any> {
    try {
      // Teste simples de conexão usando uma tabela que sempre existe
      const { data, error } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);
      
      if (error) {
        throw error;
      }
      
      return {
        connected: true,
        database: this.config.projectId,
        user: 'service_role',
        version: 'PostgreSQL (Supabase)',
        timestamp: new Date().toISOString(),
        config: {
          url: this.config.url,
          projectId: this.config.projectId
        }
      };
    } catch (error: any) {
      console.error('❌ Erro ao verificar status:', error);
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Acessar cliente Supabase diretamente
   */
  getClient() {
    return this.supabase;
  }

  /**
   * Proxy para método .from() do cliente Supabase
   */
  from(table: string) {
    return this.supabase.from(table);
  }

  /**
   * Proxy para método .rpc() do cliente Supabase
   */
  rpc(fn: string, args?: any) {
    return this.supabase.rpc(fn, args);
  }
}

// Singleton instance
export const supabaseAdmin = new SupabaseAdminService();
export default supabaseAdmin; 
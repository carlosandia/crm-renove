import { appConfig } from '../config/app';

/**
 * 🔧 SUPABASE ADMIN UTILS - FRONTEND
 * Utilitários para operações administrativas via API backend
 */

const API_BASE = `${appConfig.api.baseUrl}/admin`;

export interface SupabaseAdminResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
  message?: string;
}

export interface TableStructure {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string;
  character_maximum_length: number;
}

export interface ConnectionStatus {
  connected: boolean;
  database?: string;
  user?: string;
  version?: string;
  timestamp?: string;
  config?: {
    url: string;
    projectId: string;
  };
  error?: string;
}

/**
 * Classe para operações administrativas via frontend
 */
export class SupabaseAdminFrontend {
  private apiBase: string;

  constructor(apiBase: string = API_BASE) {
    this.apiBase = apiBase;
  }

  // ==========================================
  // 1. MÉTODOS DE REQUISIÇÃO
  // ==========================================

  private async makeRequest<T = any>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', 
    data?: any
  ): Promise<SupabaseAdminResponse<T>> {
    try {
      const config: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          // Adicionar token se disponível
          ...(localStorage.getItem('auth_token') && {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          })
        }
      };

      if (data && method !== 'GET') {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.apiBase}${endpoint}`, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('❌ Erro na requisição admin:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==========================================
  // 2. OPERAÇÕES SQL DIRETAS
  // ==========================================

  /**
   * Executar SQL personalizado
   */
  async executeSQL(query: string, params: any[] = []): Promise<SupabaseAdminResponse> {
    console.log('🔄 Executando SQL via frontend:', query.substring(0, 100) + '...');
    
    return await this.makeRequest('/sql/execute', 'POST', { query, params });
  }

  /**
   * Executar query SELECT
   */
  async selectQuery(query: string, params: any[] = []): Promise<SupabaseAdminResponse> {
    console.log('🔄 Executando SELECT via frontend:', query.substring(0, 100) + '...');
    
    return await this.makeRequest('/sql/select', 'POST', { query, params });
  }

  /**
   * Executar comando DDL
   */
  async executeDDL(command: string): Promise<SupabaseAdminResponse> {
    console.log('🔄 Executando DDL via frontend:', command.substring(0, 100) + '...');
    
    return await this.makeRequest('/sql/ddl', 'POST', { command });
  }

  // ==========================================
  // 3. OPERAÇÕES CRUD ADMINISTRATIVAS
  // ==========================================

  /**
   * Inserir dados com bypass de RLS
   */
  async adminInsert(table: string, data: any | any[]): Promise<SupabaseAdminResponse> {
    console.log(`🔄 Admin Insert via frontend em ${table}:`, data);
    
    return await this.makeRequest('/crud/insert', 'POST', { table, data });
  }

  /**
   * Atualizar dados com bypass de RLS
   */
  async adminUpdate(table: string, data: any, conditions: any): Promise<SupabaseAdminResponse> {
    console.log(`🔄 Admin Update via frontend em ${table}:`, { data, conditions });
    
    return await this.makeRequest('/crud/update', 'PUT', { table, data, conditions });
  }

  /**
   * Deletar dados com bypass de RLS
   */
  async adminDelete(table: string, conditions: any): Promise<SupabaseAdminResponse> {
    console.log(`🔄 Admin Delete via frontend em ${table}:`, conditions);
    
    return await this.makeRequest('/crud/delete', 'DELETE', { table, conditions });
  }

  /**
   * Buscar dados com bypass de RLS
   */
  async adminSelect(
    table: string, 
    options: {
      select?: string;
      conditions?: any;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<SupabaseAdminResponse> {
    console.log(`🔄 Admin Select via frontend em ${table}:`, options);
    
    const params = new URLSearchParams();
    
    if (options.select) params.append('select', options.select);
    if (options.conditions) params.append('conditions', JSON.stringify(options.conditions));
    if (options.orderBy) params.append('orderBy', options.orderBy);
    if (options.orderDirection) params.append('orderDirection', options.orderDirection);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    const endpoint = `/crud/select/${table}${queryString ? '?' + queryString : ''}`;
    
    return await this.makeRequest(endpoint, 'GET');
  }

  // ==========================================
  // 4. OPERAÇÕES DE SCHEMA
  // ==========================================

  /**
   * Criar nova tabela
   */
  async createTable(
    tableName: string, 
    columns: Array<{
      name: string;
      type: string;
      constraints?: string[];
    }>
  ): Promise<SupabaseAdminResponse> {
    console.log(`🔄 Criando tabela via frontend: ${tableName}`);
    
    return await this.makeRequest('/schema/create-table', 'POST', { tableName, columns });
  }

  /**
   * Adicionar coluna
   */
  async addColumn(
    tableName: string, 
    columnName: string, 
    columnType: string, 
    constraints: string[] = []
  ): Promise<SupabaseAdminResponse> {
    console.log(`🔄 Adicionando coluna via frontend: ${columnName} em ${tableName}`);
    
    return await this.makeRequest('/schema/add-column', 'POST', { 
      tableName, 
      columnName, 
      columnType, 
      constraints 
    });
  }

  /**
   * Criar índice
   */
  async createIndex(
    indexName: string, 
    tableName: string, 
    columns: string[], 
    unique: boolean = false
  ): Promise<SupabaseAdminResponse> {
    console.log(`🔄 Criando índice via frontend: ${indexName}`);
    
    return await this.makeRequest('/schema/create-index', 'POST', { 
      indexName, 
      tableName, 
      columns, 
      unique 
    });
  }

  // ==========================================
  // 5. MIGRAÇÕES E SEEDERS
  // ==========================================

  /**
   * Executar migração
   */
  async runMigration(migrationSQL: string, version: string): Promise<SupabaseAdminResponse> {
    console.log(`🔄 Executando migração via frontend: ${version}`);
    
    return await this.makeRequest('/migration/run', 'POST', { migrationSQL, version });
  }

  /**
   * Executar seeder
   */
  async runSeeder(seederName: string, seedData: any[]): Promise<SupabaseAdminResponse> {
    console.log(`🔄 Executando seeder via frontend: ${seederName}`);
    
    return await this.makeRequest('/seeder/run', 'POST', { seederName, seedData });
  }

  // ==========================================
  // 6. UTILITÁRIOS E MONITORAMENTO
  // ==========================================

  /**
   * Listar todas as tabelas
   */
  async listTables(): Promise<SupabaseAdminResponse<string[]>> {
    console.log('🔄 Listando tabelas via frontend...');
    
    return await this.makeRequest('/utils/tables', 'GET');
  }

  /**
   * Descrever estrutura de uma tabela
   */
  async describeTable(table: string): Promise<SupabaseAdminResponse<TableStructure[]>> {
    console.log(`🔄 Descrevendo tabela via frontend: ${table}`);
    
    return await this.makeRequest(`/utils/describe/${table}`, 'GET');
  }

  /**
   * Status da conexão
   */
  async getConnectionStatus(): Promise<SupabaseAdminResponse<ConnectionStatus>> {
    console.log('🔄 Verificando status via frontend...');
    
    return await this.makeRequest('/utils/status', 'GET');
  }

  /**
   * Fazer backup de uma tabela
   */
  async backupTable(table: string): Promise<SupabaseAdminResponse> {
    console.log(`🔄 Fazendo backup via frontend: ${table}`);
    
    return await this.makeRequest(`/utils/backup/${table}`, 'POST');
  }

  // ==========================================
  // 7. MÉTODOS DE CONVENIÊNCIA
  // ==========================================

  /**
   * Verificar se uma tabela existe
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.listTables();
      return result.success && result.data?.includes(tableName) || false;
    } catch (error) {
      console.error('❌ Erro ao verificar existência da tabela:', error);
      return false;
    }
  }

  /**
   * Contar registros de uma tabela
   */
  async countRecords(table: string, conditions?: any): Promise<number> {
    try {
      const query = conditions 
        ? `SELECT COUNT(*) as count FROM ${table} WHERE ${Object.entries(conditions).map(([k, v]) => `${k} = '${v}'`).join(' AND ')}`
        : `SELECT COUNT(*) as count FROM ${table}`;
      
      const result = await this.selectQuery(query);
      return result.success ? (result.data?.[0]?.count || 0) : 0;
    } catch (error) {
      console.error('❌ Erro ao contar registros:', error);
      return 0;
    }
  }

  /**
   * Executar múltiplas queries em transação
   */
  async executeTransaction(queries: string[]): Promise<SupabaseAdminResponse> {
    console.log('🔄 Executando transação via frontend:', queries.length, 'queries');
    
    const transactionSQL = `
      BEGIN;
      ${queries.join(';\n')};
      COMMIT;
    `;
    
    return await this.executeSQL(transactionSQL);
  }

  /**
   * Limpar tabela (TRUNCATE)
   */
  async truncateTable(table: string, cascade: boolean = false): Promise<SupabaseAdminResponse> {
    console.log(`🔄 Limpando tabela via frontend: ${table}`);
    
    const cascadeSQL = cascade ? ' CASCADE' : '';
    const command = `TRUNCATE TABLE ${table}${cascadeSQL};`;
    
    return await this.executeDDL(command);
  }
}

// ==========================================
// 8. INSTÂNCIA SINGLETON E UTILITÁRIOS GLOBAIS
// ==========================================

// Instância singleton
export const supabaseAdminFrontend = new SupabaseAdminFrontend();

// Utilitários rápidos para uso direto
export const adminUtils = {
  // Status e informações
  status: () => supabaseAdminFrontend.getConnectionStatus(),
  tables: () => supabaseAdminFrontend.listTables(),
  describe: (table: string) => supabaseAdminFrontend.describeTable(table),
  
  // CRUD rápido
  select: (table: string, options?: any) => supabaseAdminFrontend.adminSelect(table, options),
  insert: (table: string, data: any) => supabaseAdminFrontend.adminInsert(table, data),
  update: (table: string, data: any, conditions: any) => supabaseAdminFrontend.adminUpdate(table, data, conditions),
  delete: (table: string, conditions: any) => supabaseAdminFrontend.adminDelete(table, conditions),
  
  // SQL direto
  sql: (query: string, params?: any[]) => supabaseAdminFrontend.selectQuery(query, params),
  execute: (query: string, params?: any[]) => supabaseAdminFrontend.executeSQL(query, params),
  ddl: (command: string) => supabaseAdminFrontend.executeDDL(command),
  
  // Utilitários
  backup: (table: string) => supabaseAdminFrontend.backupTable(table),
  count: (table: string, conditions?: any) => supabaseAdminFrontend.countRecords(table, conditions),
  exists: (table: string) => supabaseAdminFrontend.tableExists(table),
  truncate: (table: string, cascade?: boolean) => supabaseAdminFrontend.truncateTable(table, cascade)
};

// Exportar para uso global (se necessário)
if (typeof window !== 'undefined') {
  (window as any).supabaseAdmin = adminUtils;
  console.log('🔧 Supabase Admin Utils disponível em window.supabaseAdmin');
}

export default supabaseAdminFrontend; 
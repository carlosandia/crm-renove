/**
 * 🚀 SUPABASE CRUD AVANÇADO - OPERAÇÕES COMPLETAS
 * ==============================================
 */

import { supabaseAdmin } from './cursor-supabase-debug';

// ============================================================================
// 📝 OPERAÇÕES CRUD COMPLETAS
// ============================================================================

/**
 * ➕ Inserir dados com validação
 */
async function insertData(tableName: string, data: Record<string, any>) {
  console.log(`➕ Inserindo em ${tableName}:`, data);
  
  try {
    const { data: result, error } = await supabaseAdmin
      .from(tableName)
      .insert(data)
      .select();
    
    if (error) {
      console.error('❌ Erro INSERT:', error);
      return { success: false, error };
    }
    
    console.log('✅ Inserido:', result);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * ✏️ Atualizar dados
 */
async function updateData(tableName: string, filter: Record<string, any>, updates: Record<string, any>) {
  console.log(`✏️ Atualizando ${tableName}:`, { filter, updates });
  
  try {
    let query = supabaseAdmin.from(tableName).update(updates);
    
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { data: result, error } = await query.select();
    
    if (error) {
      console.error('❌ Erro UPDATE:', error);
      return { success: false, error };
    }
    
    console.log('✅ Atualizado:', result);
    return { success: true, data: result, updated: result?.length || 0 };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * 🗑️ Deletar dados (com confirmação obrigatória)
 */
async function deleteData(tableName: string, filter: Record<string, any>, confirmacao: boolean = false) {
  if (!confirmacao) {
    console.warn('⚠️ DELETE requer confirmação! Use: deleteData(table, filter, true)');
    return { success: false, error: 'Confirmação necessária' };
  }
  
  console.log(`🗑️ Deletando de ${tableName}:`, filter);
  
  try {
    let query = supabaseAdmin.from(tableName).delete();
    
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { data: result, error } = await query.select();
    
    if (error) {
      console.error('❌ Erro DELETE:', error);
      return { success: false, error };
    }
    
    console.log('✅ Deletado:', result);
    return { success: true, data: result, deleted: result?.length || 0 };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * 📦 Backup completo de tabela
 */
async function backupTable(tableName: string) {
  console.log(`📦 Backup de ${tableName}...`);
  
  try {
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select('*');
    
    if (error) {
      console.error('❌ Erro BACKUP:', error);
      return { success: false, error };
    }
    
    const backup = {
      table: tableName,
      timestamp: new Date().toISOString(),
      records: data?.length || 0,
      data: data
    };
    
    console.log(`✅ Backup: ${backup.records} registros`);
    return { success: true, backup };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * 📥 Restore de dados
 */
async function restoreTable(tableName: string, backupData: any[], truncate: boolean = false) {
  console.log(`📥 Restore em ${tableName}: ${backupData.length} registros`);
  
  try {
    if (truncate) {
      console.log('🗑️ Limpando tabela...');
      await supabaseAdmin.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }
    
    if (backupData.length > 0) {
      const { data, error } = await supabaseAdmin
        .from(tableName)
        .insert(backupData);
      
      if (error) {
        console.error('❌ Erro RESTORE:', error);
        return { success: false, error };
      }
    }
    
    console.log(`✅ Restore: ${backupData.length} registros`);
    return { success: true, restored: backupData.length };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * 📊 Análise de performance
 */
async function analyzePerformance(tableName: string) {
  console.log(`📊 Analisando ${tableName}...`);
  
  try {
    const start = Date.now();
    
    const { count, error } = await supabaseAdmin
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    const time = Date.now() - start;
    
    const analysis = {
      table: tableName,
      records: count || 0,
      queryTime: `${time}ms`,
      performance: time < 500 ? 'ÓTIMA' : time < 2000 ? 'BOA' : 'LENTA'
    };
    
    console.log('✅ Performance:', analysis);
    return { success: true, analysis };
  } catch (error) {
    return { success: false, error };
  }
}

// ============================================================================
// 🔧 EXPORTAÇÃO DE UTILITÁRIOS
// ============================================================================

export const crudAvancado = {
  // Operações CRUD
  insert: insertData,
  update: updateData,
  delete: deleteData,
  
  // Backup & Restore
  backup: backupTable,
  restore: restoreTable,
  
  // Análise
  performance: analyzePerformance,
  
  // Operações em lote
  backupMultiplas: async (tables: string[]) => {
    console.log('📦 BACKUP MÚLTIPLAS TABELAS');
    const results: any[] = [];
    for (const table of tables) {
      const backup = await backupTable(table);
      if (backup.success && backup.backup) results.push(backup.backup);
    }
    return { success: true, backups: results };
  },
  
  healthCheck: async () => {
    console.log('🏥 HEALTH CHECK COMPLETO');
    const tables = ['users', 'companies', 'pipelines', 'leads_master'];
    const health: any[] = [];
    for (const table of tables) {
      const analysis = await analyzePerformance(table);
      if (analysis.success && analysis.analysis) health.push(analysis.analysis);
    }
    console.table(health);
    return { success: true, health };
  }
};

console.log('🚀 CRUD Avançado carregado! Use: crudAvancado.healthCheck()'); 
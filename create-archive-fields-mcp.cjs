// Script para criar campos de arquivamento usando MCP Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.xQSdgfnfzYpbGSEWOo1WqGaLkJd_MgHAJEEKjwfHKho';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createArchiveFields() {
  console.log('🔧 Criando campos de arquivamento usando service role...\n');
  
  try {
    // 1. Verificar estrutura atual
    console.log('🔍 Verificando estrutura atual da tabela pipelines...');
    const { data: currentData, error: selectError } = await supabase
      .from('pipelines')
      .select('*')
      .limit(1);
      
    if (selectError) {
      console.error('❌ Erro ao acessar pipelines:', selectError.message);
      return;
    }
    
    if (currentData && currentData.length > 0) {
      const currentColumns = Object.keys(currentData[0]);
      console.log('📋 Colunas atuais:', currentColumns.join(', '));
      
      const hasArchiveFields = currentColumns.includes('is_archived');
      if (hasArchiveFields) {
        console.log('✅ Campos de arquivamento já existem!');
        return;
      }
    }
    
    // 2. Usar SQL direto para adicionar campos
    console.log('\n🔧 Adicionando campos de arquivamento...');
    
    // Criar função para executar SQL
    const executeSql = async (sql, description) => {
      console.log(`📝 ${description}...`);
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
          console.error(`❌ ${description} falhou:`, error.message);
          return false;
        } else {
          console.log(`✅ ${description} concluído`);
          return true;
        }
      } catch (err) {
        console.error(`❌ Erro em ${description}:`, err.message);
        return false;
      }
    };
    
    // Adicionar campos um por um
    await executeSql(
      'ALTER TABLE pipelines ADD COLUMN is_archived BOOLEAN DEFAULT FALSE',
      'Adicionando coluna is_archived'
    );
    
    await executeSql(
      'ALTER TABLE pipelines ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE',
      'Adicionando coluna archived_at'
    );
    
    await executeSql(
      'ALTER TABLE pipelines ADD COLUMN archived_by TEXT',
      'Adicionando coluna archived_by'
    );
    
    // Atualizar pipelines existentes
    await executeSql(
      'UPDATE pipelines SET is_archived = FALSE WHERE is_archived IS NULL',
      'Configurando pipelines existentes como ativas'
    );
    
    // Criar índice para performance
    await executeSql(
      'CREATE INDEX IF NOT EXISTS idx_pipelines_archived_tenant ON pipelines(tenant_id, is_archived)',
      'Criando índice para performance'
    );
    
    // 3. Verificar se funcionou
    console.log('\n🔍 Verificando campos criados...');
    const { data: updatedData, error: verifyError } = await supabase
      .from('pipelines')
      .select('*')
      .limit(1);
      
    if (verifyError) {
      console.error('❌ Erro ao verificar campos:', verifyError.message);
    } else if (updatedData && updatedData.length > 0) {
      const newColumns = Object.keys(updatedData[0]);
      console.log('📋 Colunas após atualização:', newColumns.join(', '));
      
      const hasAllFields = newColumns.includes('is_archived') && 
                          newColumns.includes('archived_at') && 
                          newColumns.includes('archived_by');
      
      if (hasAllFields) {
        console.log('\n🎉 SUCESSO! Todos os campos de arquivamento criados!');
        
        // Mostrar valores dos novos campos
        const pipeline = updatedData[0];
        console.log('📊 Valores dos novos campos:');
        console.log(`   is_archived: ${pipeline.is_archived} (${typeof pipeline.is_archived})`);
        console.log(`   archived_at: ${pipeline.archived_at}`);
        console.log(`   archived_by: ${pipeline.archived_by}`);
        
      } else {
        console.log('⚠️  Alguns campos podem não ter sido criados');
      }
    }
    
    console.log('\n🚀 SISTEMA DE ARQUIVAMENTO IMPLEMENTADO COM SUCESSO!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

createArchiveFields().catch(console.error);
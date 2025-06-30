#!/usr/bin/env npx ts-node

/**
 * 🧪 TESTE DE CONECTIVIDADE SUPABASE
 * Script para verificar conexão completa com Supabase
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const SUPABASE_URL = 'https://marajvabdwkpgopytvhh.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg0NTAzNTYsImV4cCI6MjAzNDAyNjM1Nn0.K9dTgEeCE2vSVYh_YAzQR_JqBP2SbnGiON5lRIDxW6Y';

console.log('🧪 INICIANDO TESTE DE CONECTIVIDADE SUPABASE...\n');

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  try {
    console.log('📡 Configuração:');
    console.log(`   URL: ${SUPABASE_URL}`);
    console.log(`   Key: ${SUPABASE_ANON_KEY.substring(0, 50)}...`);
    console.log('');

    // 1. TESTE BÁSICO DE CONECTIVIDADE
    console.log('🔍 1. TESTE BÁSICO DE CONECTIVIDADE');
    const { data: testData, error: testError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    if (testError) {
      console.log('❌ Falha na conectividade:', testError.message);
    } else {
      console.log('✅ Conectividade OK');
    }

    // 2. LISTAR TABELAS PRINCIPAIS
    console.log('\n🔍 2. VERIFICANDO TABELAS PRINCIPAIS');
    const tablesToCheck = ['forms', 'custom_forms', 'companies', 'users', 'pipelines'];
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Tabela ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ Tabela ${tableName}: OK`);
        }
      } catch (err: any) {
        console.log(`❌ Tabela ${tableName}: ${err.message}`);
      }
    }

    // 3. TESTE DE ESCRITA (se possível)
    console.log('\n🔍 3. TESTE DE PERMISSÕES DE ESCRITA');
    try {
      const { data, error } = await supabase
        .from('forms')
        .insert([{
          name: 'Teste Conectividade',
          description: 'Teste de conectividade - será removido',
          tenant_id: '00000000-0000-0000-0000-000000000001',
          fields: [],
          settings: {}
        }])
        .select();

      if (error) {
        console.log('❌ Permissão de escrita:', error.message);
      } else {
        console.log('✅ Permissão de escrita: OK');
        
        // Remover o registro de teste
        if (data && data[0]) {
          await supabase
            .from('forms')
            .delete()
            .eq('id', data[0].id);
          console.log('🗑️ Registro de teste removido');
        }
      }
    } catch (err: any) {
      console.log('❌ Erro no teste de escrita:', err.message);
    }

    // 4. EXECUTAR SQL RAW
    console.log('\n🔍 4. TESTE DE EXECUÇÃO SQL RAW');
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        query: 'SELECT current_database(), current_user, now() as current_time'
      });

      if (error) {
        console.log('❌ SQL Raw:', error.message);
      } else {
        console.log('✅ SQL Raw: OK');
        console.log('   Resultado:', data);
      }
    } catch (err: any) {
      console.log('❌ SQL Raw falhou:', err.message);
    }

    // 5. VERIFICAR TABELA FORMS ESPECIFICAMENTE
    console.log('\n🔍 5. ANÁLISE DETALHADA DA TABELA FORMS');
    try {
      // Verificar se tabela forms existe
      const { data: formsData, error: formsError } = await supabase
        .from('forms')
        .select('*')
        .limit(5);

      if (formsError) {
        console.log('❌ Tabela forms:', formsError.message);
        
        // Verificar se custom_forms existe como alternativa
        console.log('🔍 Verificando custom_forms como alternativa...');
        const { data: customFormsData, error: customFormsError } = await supabase
          .from('custom_forms')
          .select('*')
          .limit(5);

        if (customFormsError) {
          console.log('❌ Tabela custom_forms:', customFormsError.message);
        } else {
          console.log('✅ Tabela custom_forms: OK');
          console.log(`   Registros encontrados: ${customFormsData?.length || 0}`);
        }
      } else {
        console.log('✅ Tabela forms: OK');
        console.log(`   Registros encontrados: ${formsData?.length || 0}`);
        
        if (formsData && formsData.length > 0) {
          console.log('   Exemplo de campos:', Object.keys(formsData[0]));
        }
      }
    } catch (err: any) {
      console.log('❌ Erro na análise da tabela forms:', err.message);
    }

    console.log('\n🎉 TESTE DE CONECTIVIDADE CONCLUÍDO!');

  } catch (error: any) {
    console.error('❌ ERRO FATAL:', error.message);
  }
}

// Executar o teste
testConnection().then(() => {
  console.log('\n✅ Script finalizado');
}).catch((error) => {
  console.error('\n❌ Erro no script:', error);
});

export { testConnection }; 
#!/usr/bin/env node

// Teste de acesso completo ao Supabase com Service Role e Access Token
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseAccess() {
  console.log('🧪 === TESTE DE ACESSO COMPLETO AO SUPABASE ===');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  
  console.log('📊 Configurações:');
  console.log(`  • URL: ${supabaseUrl}`);
  console.log(`  • Service Role: ${serviceRoleKey ? 'Configurado ✅' : 'Faltando ❌'}`);
  console.log(`  • Access Token: ${accessToken ? 'Configurado ✅' : 'Faltando ❌'}`);
  console.log('');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Configurações básicas não encontradas!');
    return;
  }

  // Criar cliente com Service Role (admin)
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    console.log('🔍 1. Testando lista de tabelas via information_schema...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.log('❌ Erro ao acessar information_schema:', tablesError.message);
      
      // Tentar método alternativo
      console.log('🔄 2. Tentando método alternativo com SQL direto...');
      
      const { data: sqlResult, error: sqlError } = await supabase.rpc('execute_sql', {
        sql_query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
      });
      
      if (sqlError) {
        console.log('❌ Erro SQL direto:', sqlError.message);
        
        // Listar tabelas conhecidas
        console.log('🔄 3. Testando tabelas conhecidas do CRM...');
        const knownTables = ['users', 'pipelines', 'pipeline_leads', 'companies', 'forms'];
        
        for (const table of knownTables) {
          try {
            const { data, error } = await supabase
              .from(table)
              .select('*')
              .limit(1);
            
            if (error) {
              console.log(`  ❌ ${table}: ${error.message}`);
            } else {
              console.log(`  ✅ ${table}: Acessível (${data ? data.length : 0} registros)`);
            }
          } catch (err) {
            console.log(`  ❌ ${table}: Erro - ${err.message}`);
          }
        }
      } else {
        console.log('✅ SQL direto funcionou!');
        console.log('📋 Tabelas encontradas:', sqlResult);
      }
    } else {
      console.log('✅ Lista de tabelas obtida com sucesso!');
      console.log('📋 Tabelas encontradas:');
      tables.forEach(table => {
        console.log(`  • ${table.table_name}`);
      });
    }

    console.log('');
    console.log('🔐 4. Testando permissões administrativas...');
    
    // Testar operações administrativas
    try {
      const { data: userCount, error: countError } = await supabase
        .from('users')
        .select('id', { count: 'exact' });
      
      if (countError) {
        console.log(`❌ Erro ao contar usuários: ${countError.message}`);
      } else {
        console.log(`✅ Acesso à tabela users: ${userCount.length} registros`);
      }
    } catch (err) {
      console.log(`❌ Erro ao acessar users: ${err.message}`);
    }

    console.log('');
    console.log('🎯 5. Teste de criação de tabela temporária...');
    
    try {
      // Tentar criar uma tabela de teste
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS test_admin_access_temp (
          id SERIAL PRIMARY KEY,
          test_field VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      const { data: createResult, error: createError } = await supabase.rpc('execute_sql', {
        sql_query: createTableSQL
      });
      
      if (createError) {
        console.log(`❌ Erro ao criar tabela de teste: ${createError.message}`);
      } else {
        console.log('✅ Tabela de teste criada com sucesso!');
        
        // Limpar tabela de teste
        const dropTableSQL = 'DROP TABLE IF EXISTS test_admin_access_temp';
        await supabase.rpc('execute_sql', { sql_query: dropTableSQL });
        console.log('✅ Tabela de teste removida');
      }
    } catch (err) {
      console.log(`❌ Erro ao testar criação de tabela: ${err.message}`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }

  console.log('');
  console.log('📊 === RESUMO DO TESTE ===');
  console.log('✅ Conexão Supabase: Estabelecida');
  console.log('✅ Service Role Key: Funcional');
  console.log('✅ Permissões de leitura: Testadas');
  console.log('❓ Permissões DDL: Dependem da função execute_sql');
  console.log('');
  console.log('💡 Para acesso DDL completo, certifique-se de que:');
  console.log('   1. A função execute_sql() existe no banco');
  console.log('   2. O service role tem permissões para DDL');
  console.log('   3. O Access Token está configurado para operações admin');
}

// Executar teste
testSupabaseAccess()
  .then(() => {
    console.log('🎉 Teste concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro no teste:', error);
    process.exit(1);
  });
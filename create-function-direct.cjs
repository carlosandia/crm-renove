#!/usr/bin/env node

// Script para criar função execute_sql diretamente no Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function createExecuteSqlFunction() {
  console.log('🔧 === CRIANDO FUNÇÃO EXECUTE_SQL NO SUPABASE ===');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variáveis de ambiente não configuradas!');
    return;
  }

  // Cliente com service role (máximas permissões)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('📋 Lendo arquivo SQL...');
  
  try {
    // Ler o arquivo SQL
    const sqlContent = fs.readFileSync('create-execute-sql-function.sql', 'utf8');
    
    console.log('🔧 Executando criação da função...');
    
    // Dividir em comandos individuais
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      if (command.includes('DROP FUNCTION') || 
          command.includes('CREATE OR REPLACE FUNCTION') ||
          command.includes('GRANT EXECUTE') ||
          command.includes('COMMENT ON') ||
          command.includes('SELECT')) {
        
        console.log(`🔄 Executando comando ${i + 1}/${commands.length}:`, command.substring(0, 50) + '...');
        
        try {
          const { data, error } = await supabase.rpc('exec', {
            sql: command
          });
          
          if (error) {
            // Tentar método alternativo se exec não funcionar
            console.log('🔄 Tentando método alternativo...');
            const { data: altData, error: altError } = await supabase
              .from('_dummy_table_that_does_not_exist')
              .select()
              .limit(0);
            
            // Usar SQL direto via cliente
            await executeRawSQL(supabase, command);
          } else {
            console.log(`✅ Comando ${i + 1} executado com sucesso`);
          }
        } catch (cmdError) {
          if (command.includes('DROP FUNCTION') && cmdError.message?.includes('does not exist')) {
            console.log(`⚠️ Função não existia (OK): ${command.substring(0, 30)}...`);
          } else {
            console.log(`❌ Erro no comando ${i + 1}:`, cmdError.message);
          }
        }
      }
    }

    console.log('🧪 Testando funções criadas...');
    
    // Testar execute_sql
    try {
      const { data: testData, error: testError } = await supabase.rpc('execute_sql', {
        sql_query: 'SELECT current_timestamp as test_timestamp'
      });
      
      if (testError) {
        console.log('❌ Erro no teste execute_sql:', testError.message);
      } else {
        console.log('✅ Função execute_sql criada e testada com sucesso!');
        console.log('📊 Resultado do teste:', testData);
      }
    } catch (testErr) {
      console.log('❌ Erro ao testar função:', testErr.message);
    }

    // Testar execute_query
    try {
      const { data: queryData, error: queryError } = await supabase.rpc('execute_query', {
        query_text: 'SELECT current_user, current_database()'
      });
      
      if (queryError) {
        console.log('❌ Erro no teste execute_query:', queryError.message);
      } else {
        console.log('✅ Função execute_query criada e testada com sucesso!');
        console.log('📊 Resultado da query:', queryData);
      }
    } catch (queryErr) {
      console.log('❌ Erro ao testar query:', queryErr.message);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }

  console.log('🎉 Processo de criação da função concluído!');
}

// Função auxiliar para executar SQL puro
async function executeRawSQL(supabase, sql) {
  // Método alternativo usando query direta
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify({ sql: sql })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}

// Executar
createExecuteSqlFunction()
  .then(() => {
    console.log('✅ Script concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro no script:', error);
    process.exit(1);
  });
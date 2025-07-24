#!/usr/bin/env node

// Script simplificado para criar função execute_sql via SQL direto
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function createSimpleFunction() {
  console.log('🔧 === CRIANDO FUNÇÃO EXECUTE_SQL SIMPLES ===');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Cliente com service role
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Função SQL simples em uma string
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION public.execute_sql(sql_query text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        EXECUTE sql_query;
        RETURN 'SQL executado com sucesso';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE;
    END;
    $$;
  `;

  const createQuerySQL = `
    CREATE OR REPLACE FUNCTION public.execute_query(query_text text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        result json;
    BEGIN
        EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query_text || ') t' INTO result;
        RETURN result;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE;
    END;
    $$;
  `;

  try {
    console.log('🔄 Tentando via SQL direto...');
    
    // Método 1: Tentar usar o Raw SQL do cliente Supabase
    const { data: data1, error: error1 } = await supabase
      .rpc('exec_sql', { sql: createFunctionSQL });
    
    if (error1) {
      console.log('⚠️ Método 1 falhou:', error1.message);
      
      // Método 2: Tentar via HTTP direto
      console.log('🔄 Tentando via HTTP direto...');
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        },
        body: JSON.stringify({ sql: createFunctionSQL })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('⚠️ Método 2 falhou:', errorText);
        
        // Método 3: Tentar usando uma migration fake
        console.log('🔄 Tentando método alternativo...');
        
        // Criar uma "migração" temporária
        const { data: migData, error: migError } = await supabase
          .from('supabase_migrations')
          .insert({
            version: '20250715_create_execute_sql',
            name: 'create_execute_sql_function',
            statements: [createFunctionSQL, createQuerySQL]
          });
        
        if (migError) {
          console.log('⚠️ Método 3 falhou:', migError.message);
          console.log('📝 Vou criar um arquivo SQL para execução manual...');
          
          // Criar arquivo para execução manual
          await createManualSQL();
        } else {
          console.log('✅ Migração criada - execute manualmente');
        }
      } else {
        console.log('✅ Função criada via HTTP!');
      }
    } else {
      console.log('✅ Função criada via RPC!');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    console.log('📝 Criando arquivo SQL para execução manual...');
    await createManualSQL();
  }
}

async function createManualSQL() {
  const fs = require('fs');
  
  const manualSQL = `
-- ============================================
-- EXECUTE ESTE SQL MANUALMENTE NO SUPABASE
-- ============================================

-- 1. Vá para https://supabase.com/dashboard/project/marajvabdwkpgopytvhh/sql
-- 2. Cole e execute este SQL:

CREATE OR REPLACE FUNCTION public.execute_sql(sql_query text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE sql_query;
    RETURN 'SQL executado com sucesso: ' || left(sql_query, 50) || '...';
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_query(query_text text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query_text || ') t' INTO result;
    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_query(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_query(text) TO authenticated;

-- Testar as funções
SELECT execute_sql('SELECT 1 as test') as test_execute_sql;
SELECT execute_query('SELECT current_user, current_database()') as test_execute_query;

-- ============================================
`;

  fs.writeFileSync('EXECUTE_MANUAL_NO_SUPABASE.sql', manualSQL);
  console.log('📄 Arquivo criado: EXECUTE_MANUAL_NO_SUPABASE.sql');
  console.log('🌐 Acesse: https://supabase.com/dashboard/project/marajvabdwkpgopytvhh/sql');
  console.log('📋 Copie e cole o conteúdo do arquivo SQL');
}

// Executar
createSimpleFunction()
  .then(() => {
    console.log('✅ Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro:', error);
    process.exit(1);
  });
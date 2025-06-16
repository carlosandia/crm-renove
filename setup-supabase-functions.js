#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://marajvabdwkpgopytvhh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function setupSupabaseFunctions() {
  console.log('🔄 Configurando funções necessárias para MCP Tools...\n');

  // Funções SQL para criar
  const functions = [
    {
      name: 'exec_sql',
      sql: `
        CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
        RETURNS text
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $func$
        DECLARE
            result text;
        BEGIN
            EXECUTE sql;
            result := 'SQL executado com sucesso: ' || substring(sql from 1 for 50) || '...';
            RETURN result;
        EXCEPTION
            WHEN OTHERS THEN
                RETURN 'ERRO: ' || SQLERRM;
        END;
        $func$;
      `
    },
    {
      name: 'exec_sql_select',
      sql: `
        CREATE OR REPLACE FUNCTION public.exec_sql_select(query text)
        RETURNS json
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $func$
        DECLARE
            result json;
        BEGIN
            EXECUTE 'SELECT array_to_json(array_agg(row_to_json(t))) FROM (' || query || ') t' INTO result;
            RETURN COALESCE(result, '[]'::json);
        EXCEPTION
            WHEN OTHERS THEN
                RETURN json_build_object('error', SQLERRM);
        END;
        $func$;
      `
    },
    {
      name: 'list_public_tables',
      sql: `
        CREATE OR REPLACE FUNCTION public.list_public_tables()
        RETURNS json
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $func$
        DECLARE
            result json;
        BEGIN
            SELECT array_to_json(array_agg(row_to_json(t)))
            INTO result
            FROM (
                SELECT table_name, table_type
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            ) t;
            RETURN COALESCE(result, '[]'::json);
        END;
        $func$;
      `
    }
  ];

  // Tentar criar cada função
  for (const func of functions) {
    try {
      console.log(`📝 Criando função: ${func.name}`);
      
      // Método 1: Tentar via RPC direto
      const { data, error } = await supabase.rpc('query', { query: func.sql });
      
      if (!error) {
        console.log(`✅ Função ${func.name} criada com sucesso!`);
      } else {
        console.log(`⚠️ Tentando método alternativo para ${func.name}...`);
        
        // Método 2: Usar client direto
        const { data: data2, error: error2 } = await supabase
          .from('_supabase_admin')
          .rpc('exec_sql', { sql: func.sql });
          
        if (!error2) {
          console.log(`✅ Função ${func.name} criada (método alternativo)!`);
        } else {
          console.log(`❌ Erro ao criar ${func.name}: ${error.message || error2.message}`);
        }
      }
    } catch (err) {
      console.log(`❌ Erro ao criar função ${func.name}: ${err.message}`);
    }
  }

  // Testar se as funções foram criadas
  console.log('\n🧪 Testando funções criadas...');
  
  try {
    const { data: testData, error: testError } = await supabase.rpc('exec_sql', {
      sql: 'SELECT 1 as test'
    });
    
    if (!testError) {
      console.log('✅ Função exec_sql está funcionando!');
    } else {
      console.log('❌ Função exec_sql não está funcionando:', testError.message);
    }
  } catch (err) {
    console.log('❌ Erro ao testar funções:', err.message);
  }

  console.log('\n🎉 Configuração concluída!');
  console.log('📋 Próximos passos:');
  console.log('1. Execute: npm run test-mcp-tools');
  console.log('2. Se os testes passarem, execute: npm run mcp-start');
  console.log('3. Ative o MCP no Cursor e veja o indicador verde');
}

setupSupabaseFunctions().catch(console.error); 
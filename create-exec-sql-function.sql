-- Função para executar SQL dinâmico no Supabase
-- Necessária para o MCP Server funcionar corretamente

-- Primeiro, criar a função exec_sql para comandos DDL/DML
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result text;
BEGIN
    -- Executar o comando SQL
    EXECUTE sql;
    
    -- Retornar confirmação
    result := 'SQL executado com sucesso: ' || substring(sql from 1 for 50) || '...';
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, retornar a mensagem
        RETURN 'ERRO: ' || SQLERRM;
END;
$$;

-- Função para SELECT dinâmico que retorna JSON
CREATE OR REPLACE FUNCTION public.exec_sql_select(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Para queries SELECT, retornar o resultado como JSON
    EXECUTE 'SELECT array_to_json(array_agg(row_to_json(t))) FROM (' || query || ') t' INTO result;
    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, retornar erro como JSON
        RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Função para verificar se uma tabela existe
CREATE OR REPLACE FUNCTION public.table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
    );
END;
$$;

-- Função para listar tabelas do schema public
CREATE OR REPLACE FUNCTION public.list_public_tables()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT array_to_json(array_agg(row_to_json(t)))
    INTO result
    FROM (
        SELECT 
            table_name,
            table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    ) t;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Função para descrever estrutura de uma tabela
CREATE OR REPLACE FUNCTION public.describe_table_structure(table_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT array_to_json(array_agg(row_to_json(t)))
    INTO result
    FROM (
        SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
    ) t;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Comentários das funções
COMMENT ON FUNCTION public.exec_sql(text) IS 'Executa comandos SQL dinâmicos (DDL/DML)';
COMMENT ON FUNCTION public.exec_sql_select(text) IS 'Executa consultas SELECT e retorna JSON';
COMMENT ON FUNCTION public.table_exists(text) IS 'Verifica se uma tabela existe no schema public';
COMMENT ON FUNCTION public.list_public_tables() IS 'Lista todas as tabelas do schema public';
COMMENT ON FUNCTION public.describe_table_structure(text) IS 'Descreve a estrutura de uma tabela'; 
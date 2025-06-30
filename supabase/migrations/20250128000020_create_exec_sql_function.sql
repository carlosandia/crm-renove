-- Criar função exec_sql para execução de SQL raw
-- Esta função permite executar comandos SQL diretos via RPC

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    rec record;
BEGIN
    -- Verificar se o usuário tem permissão (apenas service_role)
    IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
        RAISE EXCEPTION 'Acesso negado: apenas service_role pode executar SQL raw';
    END IF;
    
    -- Executar a query e retornar resultado como JSON
    BEGIN
        EXECUTE query;
        
        -- Para queries que retornam dados (SELECT)
        IF query ILIKE 'SELECT%' THEN
            result := '[]'::json;
            FOR rec IN EXECUTE query LOOP
                result := result || to_json(rec);
            END LOOP;
            RETURN result;
        ELSE
            -- Para queries que não retornam dados (INSERT, UPDATE, DELETE)
            RETURN '{"success": true, "message": "Query executada com sucesso"}'::json;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
    END;
END;
$$;

-- Criar função para verificar estrutura de tabelas
CREATE OR REPLACE FUNCTION public.get_table_structure(table_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Verificar se o usuário tem permissão
    IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
        RAISE EXCEPTION 'Acesso negado: apenas service_role pode verificar estrutura';
    END IF;
    
    -- Buscar estrutura da tabela
    SELECT json_agg(
        json_build_object(
            'column_name', column_name,
            'data_type', data_type,
            'is_nullable', is_nullable,
            'column_default', column_default
        )
    ) INTO result
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = get_table_structure.table_name;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Criar função para verificar índices
CREATE OR REPLACE FUNCTION public.get_table_indexes(table_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Verificar se o usuário tem permissão
    IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
        RAISE EXCEPTION 'Acesso negado: apenas service_role pode verificar índices';
    END IF;
    
    -- Buscar índices da tabela
    SELECT json_agg(
        json_build_object(
            'index_name', indexname,
            'columns', indexdef
        )
    ) INTO result
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = get_table_indexes.table_name;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Criar função para verificar policies RLS
CREATE OR REPLACE FUNCTION public.get_table_policies(table_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Verificar se o usuário tem permissão
    IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
        RAISE EXCEPTION 'Acesso negado: apenas service_role pode verificar policies';
    END IF;
    
    -- Buscar policies da tabela
    SELECT json_agg(
        json_build_object(
            'policy_name', policyname,
            'permissive', permissive,
            'roles', roles,
            'cmd', cmd,
            'qual', qual,
            'with_check', with_check
        )
    ) INTO result
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = get_table_policies.table_name;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION public.exec_sql(text) IS 'Executa SQL raw via RPC - apenas service_role';
COMMENT ON FUNCTION public.get_table_structure(text) IS 'Retorna estrutura de uma tabela como JSON';
COMMENT ON FUNCTION public.get_table_indexes(text) IS 'Retorna índices de uma tabela como JSON';
COMMENT ON FUNCTION public.get_table_policies(text) IS 'Retorna policies RLS de uma tabela como JSON'; 
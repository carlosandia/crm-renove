-- =====================================================
-- FUNÇÃO EXECUTE_SQL PARA OPERAÇÕES DDL/DML COMPLETAS
-- =====================================================

-- Remover função se existir
DROP FUNCTION IF EXISTS public.execute_sql(text);
DROP FUNCTION IF EXISTS public.execute_query(text);

-- Criar função execute_sql para comandos DDL/DML
CREATE OR REPLACE FUNCTION public.execute_sql(sql_query text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_text text;
BEGIN
    -- Log da operação
    RAISE NOTICE 'Executando SQL: %', left(sql_query, 100);
    
    -- Executar o comando SQL
    EXECUTE sql_query;
    
    -- Retornar confirmação
    result_text := 'SQL executado com sucesso: ' || left(sql_query, 50) || '...';
    
    RETURN result_text;
EXCEPTION
    WHEN OTHERS THEN
        -- Log do erro
        RAISE NOTICE 'Erro na execução SQL: %', SQLERRM;
        -- Re-raise the exception
        RAISE;
END;
$$;

-- Criar função execute_query para consultas SELECT
CREATE OR REPLACE FUNCTION public.execute_query(query_text text)
RETURNS TABLE(result jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec record;
    results jsonb := '[]'::jsonb;
BEGIN
    -- Log da operação
    RAISE NOTICE 'Executando Query: %', left(query_text, 100);
    
    -- Executar a query e construir resultado JSON
    FOR rec IN EXECUTE query_text
    LOOP
        results := results || to_jsonb(rec);
    END LOOP;
    
    -- Retornar cada linha do resultado
    FOR rec IN SELECT jsonb_array_elements(results) as element
    LOOP
        result := rec.element;
        RETURN NEXT;
    END LOOP;
    
    RETURN;
EXCEPTION
    WHEN OTHERS THEN
        -- Log do erro
        RAISE NOTICE 'Erro na execução Query: %', SQLERRM;
        -- Re-raise the exception
        RAISE;
END;
$$;

-- Conceder permissões para service_role
GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_query(text) TO service_role;

-- Conceder permissões para usuários autenticados (opcional)
GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_query(text) TO authenticated;

-- Comentários para documentação
COMMENT ON FUNCTION public.execute_sql(text) IS 'Função para executar comandos SQL DDL/DML com service_role permissions';
COMMENT ON FUNCTION public.execute_query(text) IS 'Função para executar queries SELECT e retornar resultados em JSON';

-- Log de criação
SELECT 'Funções execute_sql e execute_query criadas com sucesso!' as status;
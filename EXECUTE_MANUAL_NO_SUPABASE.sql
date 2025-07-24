
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

-- ============================================
-- CRIAR FUNÇÃO PARA EXECUTAR SQL VIA API REST
-- Execute PRIMEIRO no Supabase Dashboard
-- ============================================

-- Função para executar SQL dinamicamente via API REST
CREATE OR REPLACE FUNCTION execute_sql(sql_command TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_command;
  RETURN 'SQL executado com sucesso';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Erro: ' || SQLERRM;
END;
$$;

-- Função para verificar políticas
CREATE OR REPLACE FUNCTION check_policies(table_name TEXT DEFAULT 'cadence_configs')
RETURNS TABLE(schema_name TEXT, table_name_out TEXT, policy_name TEXT, permissive TEXT, roles TEXT[], cmd TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.schemaname::TEXT,
    p.tablename::TEXT,
    p.policyname::TEXT,
    p.permissive::TEXT,
    p.roles,
    p.cmd::TEXT
  FROM pg_policies p
  WHERE p.tablename = table_name;
END;
$$;
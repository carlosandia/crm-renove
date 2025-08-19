-- ============================================
-- 🔧 CONFIGURAÇÃO: Função RPC para SQL Execution
-- Baseado na documentação oficial do Supabase
-- ============================================

-- ETAPA 1: Criar função RPC segura seguindo as melhores práticas
CREATE OR REPLACE FUNCTION public.execute_migration_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER  -- ✅ Melhor prática conforme docs Supabase
SET search_path = public, auth  -- ✅ Definir search_path explicitamente
AS $$
DECLARE
  result_message text;
BEGIN
  -- Validações de segurança
  IF sql_query IS NULL OR trim(sql_query) = '' THEN
    RAISE EXCEPTION 'SQL query cannot be empty';
  END IF;
  
  -- Log da operação (apenas para desenvolvimento)
  RAISE LOG 'Executing migration SQL: %', substring(sql_query, 1, 100);
  
  -- Executar SQL com tratamento de erro
  BEGIN
    EXECUTE sql_query;
    result_message := 'Migration executed successfully';
  EXCEPTION 
    WHEN OTHERS THEN
      -- Capturar erro e retornar detalhes
      RAISE EXCEPTION 'Migration failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;
  
  -- Retornar resultado JSON
  RETURN json_build_object(
    'success', true,
    'message', result_message,
    'executed_at', NOW()
  );
END;
$$;

-- ETAPA 2: Configurar permissões seguindo as melhores práticas do Supabase
-- Por padrão, funções podem ser executadas por qualquer role
-- Vamos restringir explicitamente conforme recomendação dos docs

-- Remover acesso público (security best practice)
REVOKE EXECUTE ON FUNCTION public.execute_migration_sql FROM public;
REVOKE EXECUTE ON FUNCTION public.execute_migration_sql FROM anon;

-- Dar permissão APENAS ao service_role (para desenvolvimento)
GRANT EXECUTE ON FUNCTION public.execute_migration_sql TO service_role;

-- ETAPA 3: Criar função auxiliar para verificar políticas RLS
CREATE OR REPLACE FUNCTION public.check_rls_policies(table_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  policy_count integer;
  policies_info json;
BEGIN
  -- Contar políticas existentes
  SELECT COUNT(*)
  INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename = table_name;
  
  -- Obter detalhes das políticas
  SELECT json_agg(
    json_build_object(
      'policy_name', policyname,
      'command', cmd,
      'roles', roles,
      'qual', qual
    )
  )
  INTO policies_info
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename = table_name;
  
  RETURN json_build_object(
    'table_name', table_name,
    'policy_count', policy_count,
    'policies', COALESCE(policies_info, '[]'::json),
    'checked_at', NOW()
  );
END;
$$;

-- Configurar permissões para função auxiliar
REVOKE EXECUTE ON FUNCTION public.check_rls_policies FROM public;
REVOKE EXECUTE ON FUNCTION public.check_rls_policies FROM anon;
GRANT EXECUTE ON FUNCTION public.check_rls_policies TO service_role;

-- ETAPA 4: Comentários e documentação
COMMENT ON FUNCTION public.execute_migration_sql IS 'Função para execução segura de migrations SQL em desenvolvimento. Uso restrito ao service_role.';
COMMENT ON FUNCTION public.check_rls_policies IS 'Função auxiliar para verificar políticas RLS existentes em tabelas.';

-- ============================================
-- ✅ CONFIGURAÇÃO CONCLUÍDA
-- ============================================

-- PRÓXIMOS PASSOS:
-- 1. Execute este SQL no Supabase Dashboard
-- 2. As funções estarão disponíveis via RPC
-- 3. Uso: POST /rest/v1/rpc/execute_migration_sql
-- 4. Permissões: Apenas service_role pode executar
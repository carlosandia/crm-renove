-- =====================================================
-- Fix RLS Policies to use auth.uid() for Supabase Auth
-- =====================================================
-- Descrição: Atualizar políticas RLS para usar auth.uid() nativo
-- ao invés de JWT customizado ou políticas permissivas
-- =====================================================

-- 1. REMOVER POLÍTICAS PERMISSIVAS ANTIGAS
-- =====================================================

-- Política permissiva de cadence_configs (desenvolvimento)
DROP POLICY IF EXISTS "allow_all_cadence_configs" ON cadence_configs;

-- Outras políticas antigas baseadas em JWT customizado
DROP POLICY IF EXISTS "cadence_configs_tenant_policy" ON cadence_configs;
DROP POLICY IF EXISTS "cadence_configs_users_policy" ON cadence_configs;

-- 2. CRIAR POLÍTICAS RLS BASEADAS EM AUTH.UID()
-- =====================================================

-- Política para cadence_configs usando auth.uid()
CREATE POLICY "cadence_configs_authenticated_users" ON cadence_configs
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM users u 
    JOIN pipelines p ON p.tenant_id = u.tenant_id
    WHERE u.id = auth.uid() 
    AND u.is_active = true
    AND p.id = cadence_configs.pipeline_id
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM users u 
    JOIN pipelines p ON p.tenant_id = u.tenant_id
    WHERE u.id = auth.uid() 
    AND u.is_active = true
    AND p.id = pipeline_id
  )
);

-- 3. VERIFICAR E CORRIGIR OUTRAS TABELAS IMPORTANTES
-- =====================================================

-- Verificar se pipelines tem RLS correto
DO $$
BEGIN
  -- Remover políticas antigas permissivas se existirem
  DROP POLICY IF EXISTS "allow_all_pipelines" ON pipelines;
  
  -- Criar política baseada em auth.uid() se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pipelines' 
    AND policyname = 'pipelines_authenticated_users'
  ) THEN
    CREATE POLICY "pipelines_authenticated_users" ON pipelines
    FOR ALL
    USING (
      auth.uid() IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() 
        AND u.is_active = true
        AND u.tenant_id = pipelines.tenant_id
      )
    )
    WITH CHECK (
      auth.uid() IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() 
        AND u.is_active = true
        AND u.tenant_id = tenant_id
      )
    );
  END IF;
END $$;

-- Verificar se users tem RLS correto
DO $$
BEGIN
  -- Remover políticas antigas permissivas se existirem
  DROP POLICY IF EXISTS "allow_all_users" ON users;
  
  -- Criar política baseada em auth.uid() se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'users_authenticated_self'
  ) THEN
    CREATE POLICY "users_authenticated_self" ON users
    FOR ALL
    USING (
      auth.uid() IS NOT NULL AND (
        id = auth.uid() OR  -- Usuário pode ver próprios dados
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.is_active = true
          AND u.tenant_id = users.tenant_id
          AND u.role IN ('admin', 'super_admin')  -- Admins podem ver outros do mesmo tenant
        )
      )
    )
    WITH CHECK (
      auth.uid() IS NOT NULL AND (
        id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.is_active = true
          AND u.tenant_id = tenant_id
          AND u.role IN ('admin', 'super_admin')
        )
      )
    );
  END IF;
END $$;

-- 4. CRIAR ÍNDICES PARA PERFORMANCE DO RLS
-- =====================================================

-- Índice para auth.uid() lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_uid ON users(id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant ON pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cadence_configs_pipeline_tenant ON cadence_configs(pipeline_id);

-- 5. VERIFICAR CONFIGURAÇÃO RLS
-- =====================================================

DO $$
DECLARE
  table_rec RECORD;
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '=== VERIFICAÇÃO RLS COM AUTH.UID() ===';
  
  -- Verificar RLS habilitado nas tabelas críticas
  FOR table_rec IN 
    SELECT tablename, rowsecurity 
    FROM pg_tables pt
    JOIN pg_class pc ON pc.relname = pt.tablename
    WHERE pt.schemaname = 'public' 
    AND pc.relrowsecurity = true
    AND pt.tablename IN ('users', 'pipelines', 'cadence_configs')
  LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = table_rec.tablename;
    
    RAISE NOTICE '✅ Tabela: % | RLS: % | Políticas: %', 
      table_rec.tablename, 
      CASE WHEN table_rec.rowsecurity THEN 'HABILITADO' ELSE 'DESABILITADO' END,
      policy_count;
  END LOOP;
  
  RAISE NOTICE '=== CONFIGURAÇÃO CONCLUÍDA ===';
  RAISE NOTICE '🔐 Políticas RLS atualizadas para usar auth.uid()';
  RAISE NOTICE '📈 Índices de performance criados';
  RAISE NOTICE '🎯 Sistema compatível com Supabase Auth nativo';
END $$;
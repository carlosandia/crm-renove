-- ============================================
-- CORREÇÃO RLS PARA SUPABASE AUTH NATIVO
-- ============================================

-- 1. Remover políticas antigas/permissivas
DROP POLICY IF EXISTS "allow_all_cadence_configs" ON cadence_configs;
DROP POLICY IF EXISTS "cadence_configs_tenant_policy" ON cadence_configs;
DROP POLICY IF EXISTS "cadence_configs_users_policy" ON cadence_configs;

-- 2. Criar política usando auth.uid() nativo do Supabase
CREATE POLICY "cadence_configs_auth_uid" ON cadence_configs
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

-- 3. Verificar política criada
SELECT 'Políticas para cadence_configs:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'cadence_configs';

-- 4. Verificar se RLS está habilitado
SELECT 'Status RLS para cadence_configs:' as info;
SELECT schemaname, tablename, rowsecurity, forcerowsecurity 
FROM pg_tables 
WHERE tablename = 'cadence_configs';
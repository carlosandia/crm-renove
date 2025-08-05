-- Corrigir RLS para usar auth.uid() do Supabase Auth nativo
-- Execute manualmente no SQL Editor do Supabase

-- 1. Remover políticas antigas/permissivas
DROP POLICY IF EXISTS "allow_all_cadence_configs" ON cadence_configs;
DROP POLICY IF EXISTS "cadence_configs_tenant_policy" ON cadence_configs;

-- 2. Criar política usando auth.uid() nativo
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
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'cadence_configs';
-- ============================================
-- CORREÇÃO FINAL RLS PARA AUTH.UID() NATIVO
-- Execute este SQL no Supabase Dashboard SQL Editor
-- ============================================

-- 1. Verificar estado atual das políticas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'cadence_configs';

-- 2. Remover todas as políticas antigas de cadence_configs
DROP POLICY IF EXISTS "allow_all_cadence_configs" ON cadence_configs;
DROP POLICY IF EXISTS "cadence_configs_tenant_policy" ON cadence_configs;
DROP POLICY IF EXISTS "cadence_configs_users_policy" ON cadence_configs;
DROP POLICY IF EXISTS "cadence_configs_auth_uid" ON cadence_configs;

-- 3. Criar política corrigida com auth.uid() nativo
CREATE POLICY "cadence_configs_auth_uid" ON cadence_configs
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM users u 
    JOIN pipelines p ON p.tenant_id = u.tenant_id
    WHERE u.id::text = auth.uid()::text
    AND u.is_active = true
    AND p.id = cadence_configs.pipeline_id
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM users u 
    JOIN pipelines p ON p.tenant_id = u.tenant_id
    WHERE u.id::text = auth.uid()::text
    AND u.is_active = true
    AND p.id = cadence_configs.pipeline_id
  )
);

-- 4. Verificar se a política foi criada corretamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'cadence_configs'
AND policyname = 'cadence_configs_auth_uid';

-- 5. Testar acesso às cadence_configs com usuário específico
-- Para validar que o usuário seraquevai@seraquevai.com pode acessar
SELECT 
  cc.*,
  p.name as pipeline_name,
  u.email as user_email
FROM cadence_configs cc
JOIN pipelines p ON p.id = cc.pipeline_id  
JOIN users u ON u.tenant_id = p.tenant_id
WHERE p.name = 'new13'
AND u.email = 'seraquevai@seraquevai.com';
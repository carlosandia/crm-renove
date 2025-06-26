-- Migração para corrigir problemas de RLS na criação de pipelines
-- Arquivo: 20250125000009-fix-pipeline-creation-rls.sql

-- 1. Melhorar políticas RLS para pipeline_members
DROP POLICY IF EXISTS "Users can manage pipeline members of their tenant" ON pipeline_members;
CREATE POLICY "Users can manage pipeline members of their tenant" ON pipeline_members
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM pipelines p 
    WHERE p.id = pipeline_members.pipeline_id 
    AND p.tenant_id = auth.jwt() ->> 'tenant_id'
  )
  OR auth.jwt() ->> 'role' = 'super_admin'
);

-- 2. Melhorar políticas RLS para pipeline_stages
DROP POLICY IF EXISTS "Users can manage pipeline stages of their tenant" ON pipeline_stages;
CREATE POLICY "Users can manage pipeline stages of their tenant" ON pipeline_stages
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM pipelines p 
    WHERE p.id = pipeline_stages.pipeline_id 
    AND p.tenant_id = auth.jwt() ->> 'tenant_id'
  )
  OR auth.jwt() ->> 'role' = 'super_admin'
);

-- 3. Melhorar políticas RLS para pipeline_custom_fields
DROP POLICY IF EXISTS "Users can manage pipeline custom fields of their tenant" ON pipeline_custom_fields;
CREATE POLICY "Users can manage pipeline custom fields of their tenant" ON pipeline_custom_fields
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM pipelines p 
    WHERE p.id = pipeline_custom_fields.pipeline_id 
    AND p.tenant_id = auth.jwt() ->> 'tenant_id'
  )
  OR auth.jwt() ->> 'role' = 'super_admin'
);

-- 4. Política mais permissiva para desenvolvimento (temporária)
CREATE POLICY IF NOT EXISTS "Allow pipeline creation for authenticated users" ON pipelines
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    tenant_id = auth.jwt() ->> 'tenant_id'
    OR auth.jwt() ->> 'role' = 'super_admin'
  )
);

-- 5. Política mais permissiva para members (temporária)
CREATE POLICY IF NOT EXISTS "Allow pipeline_members insert for authenticated users" ON pipeline_members
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- 6. Política mais permissiva para stages (temporária)  
CREATE POLICY IF NOT EXISTS "Allow pipeline_stages insert for authenticated users" ON pipeline_stages
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- 7. Política mais permissiva para custom_fields (temporária)
CREATE POLICY IF NOT EXISTS "Allow pipeline_custom_fields insert for authenticated users" ON pipeline_custom_fields
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- 8. Função para verificar se usuário pode acessar pipeline
CREATE OR REPLACE FUNCTION can_access_pipeline(pipeline_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admin pode acessar tudo
  IF auth.jwt() ->> 'role' = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar se pipeline pertence ao tenant do usuário
  RETURN EXISTS (
    SELECT 1 FROM pipelines p
    WHERE p.id = pipeline_id
    AND p.tenant_id = auth.jwt() ->> 'tenant_id'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Comentários para documentação
COMMENT ON FUNCTION can_access_pipeline(UUID) IS 'Verifica se o usuário autenticado pode acessar uma pipeline específica';
COMMENT ON POLICY "Allow pipeline creation for authenticated users" ON pipelines IS 'Política temporária mais permissiva para criação de pipelines durante desenvolvimento';
COMMENT ON POLICY "Allow pipeline_members insert for authenticated users" ON pipeline_members IS 'Política temporária mais permissiva para inserção de membros durante desenvolvimento';
COMMENT ON POLICY "Allow pipeline_stages insert for authenticated users" ON pipeline_stages IS 'Política temporária mais permissiva para inserção de stages durante desenvolvimento';
COMMENT ON POLICY "Allow pipeline_custom_fields insert for authenticated users" ON pipeline_custom_fields IS 'Política temporária mais permissiva para inserção de campos durante desenvolvimento'; 
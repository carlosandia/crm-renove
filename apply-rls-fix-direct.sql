-- =====================================================
-- APLICAR CORREÇÃO RLS IMEDIATAMENTE
-- =====================================================

-- 1. REMOVER POLICY PERMISSIVA ATUAL
DROP POLICY IF EXISTS "dev_permissive_pipeline_leads_delete" ON pipeline_leads;

-- 2. CRIAR POLICY SEGURA COM TENANT ISOLATION
CREATE POLICY "secure_pipeline_leads_delete" ON pipeline_leads
    FOR DELETE USING (
        -- Validar tenant_id do usuário autenticado
        tenant_id = (
            SELECT user_metadata->>'tenant_id' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
        -- Garantir que usuário está autenticado
        AND auth.uid() IS NOT NULL
    );

-- 3. VERIFICAR SE RLS ESTÁ HABILITADO
ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;

-- 4. VERIFICAÇÃO FINAL - Mostrar policies ativas
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies 
WHERE tablename = 'pipeline_leads' AND cmd = 'DELETE';
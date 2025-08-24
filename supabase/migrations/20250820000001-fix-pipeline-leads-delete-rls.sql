-- =====================================================
-- MIGRATION: Corrigir RLS Policy para DELETE pipeline_leads
-- DATA: 2025-08-20
-- PROBLEMA: DELETE aparenta funcionar mas não remove dados
-- CAUSA: RLS policy permissiva demais (USING true)
-- SOLUÇÃO: Implementar tenant isolation adequado
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

-- 3. COMENTÁRIO PARA DOCUMENTAÇÃO
COMMENT ON POLICY "secure_pipeline_leads_delete" ON pipeline_leads IS 
    'Policy segura para DELETE: valida tenant_id e auth.uid() para isolamento multi-tenant';

-- 4. VERIFICAR SE RLS ESTÁ HABILITADO
ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;

-- 5. FUNÇÃO PARA LOGS E DEBUGGING
CREATE OR REPLACE FUNCTION debug_pipeline_leads_delete_policy(
    p_lead_id text,
    p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
    lead_exists boolean,
    user_authenticated boolean,
    user_tenant_id text,
    lead_tenant_id text,
    policy_allows_delete boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lead_tenant_id text;
    v_user_tenant_id text;
BEGIN
    -- Buscar tenant_id do lead
    SELECT pl.tenant_id INTO v_lead_tenant_id
    FROM pipeline_leads pl
    WHERE pl.id = p_lead_id;
    
    -- Buscar tenant_id do usuário
    SELECT u.user_metadata->>'tenant_id' INTO v_user_tenant_id
    FROM auth.users u
    WHERE u.id = p_user_id;
    
    RETURN QUERY
    SELECT 
        v_lead_tenant_id IS NOT NULL as lead_exists,
        p_user_id IS NOT NULL as user_authenticated,
        v_user_tenant_id as user_tenant_id,
        v_lead_tenant_id as lead_tenant_id,
        (v_user_tenant_id = v_lead_tenant_id AND p_user_id IS NOT NULL) as policy_allows_delete;
END;
$$;

-- 6. ADICIONAR TRIGGER PARA LOG DE OPERAÇÕES DELETE (DESENVOLVIMENTO)
CREATE OR REPLACE FUNCTION log_pipeline_leads_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Log apenas em desenvolvimento
    IF current_setting('app.environment', true) = 'development' THEN
        RAISE NOTICE '[DELETE_LOG] pipeline_leads deleted: id=%, tenant_id=%, by_user=%', 
            OLD.id, OLD.tenant_id, auth.uid();
    END IF;
    
    RETURN OLD;
END;
$$;

-- Criar trigger para logs
DROP TRIGGER IF EXISTS trigger_log_pipeline_leads_delete ON pipeline_leads;
CREATE TRIGGER trigger_log_pipeline_leads_delete
    BEFORE DELETE ON pipeline_leads
    FOR EACH ROW
    EXECUTE FUNCTION log_pipeline_leads_delete();

-- 7. ANALISAR TABELA PARA PERFORMANCE
ANALYZE pipeline_leads;

-- 8. VERIFICAÇÃO FINAL
-- Mostrar policies ativas
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies 
WHERE tablename = 'pipeline_leads' AND cmd = 'DELETE';
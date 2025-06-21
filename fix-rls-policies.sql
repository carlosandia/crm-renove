-- SCRIPT PARA CORRIGIR POLÍTICAS RLS
-- Execute este script no painel SQL do Supabase

-- 1. Verificar políticas atuais
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('pipeline_leads', 'leads_master')
ORDER BY tablename, policyname;

-- 2. Desabilitar RLS temporariamente para teste (CUIDADO - só para debug)
-- ALTER TABLE pipeline_leads DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE leads_master DISABLE ROW LEVEL SECURITY;

-- 3. Ou criar políticas mais permissivas para pipeline_leads
DROP POLICY IF EXISTS "pipeline_leads_insert_policy" ON pipeline_leads;
CREATE POLICY "pipeline_leads_insert_policy" ON pipeline_leads
    FOR INSERT 
    WITH CHECK (
        auth.uid() = created_by OR 
        auth.uid() = assigned_to OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "pipeline_leads_select_policy" ON pipeline_leads;
CREATE POLICY "pipeline_leads_select_policy" ON pipeline_leads
    FOR SELECT 
    USING (
        auth.uid() = created_by OR 
        auth.uid() = assigned_to OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- 4. Criar políticas mais permissivas para leads_master
DROP POLICY IF EXISTS "leads_master_insert_policy" ON leads_master;
CREATE POLICY "leads_master_insert_policy" ON leads_master
    FOR INSERT 
    WITH CHECK (
        auth.uid() = created_by OR 
        auth.uid() = assigned_to OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "leads_master_select_policy" ON leads_master;
CREATE POLICY "leads_master_select_policy" ON leads_master
    FOR SELECT 
    USING (
        auth.uid() = created_by OR 
        auth.uid() = assigned_to OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- 5. Verificar se as políticas foram criadas
SELECT 
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename IN ('pipeline_leads', 'leads_master')
ORDER BY tablename, policyname; 
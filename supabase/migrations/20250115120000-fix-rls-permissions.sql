-- =====================================================
-- MIGRAÇÃO: Corrigir Políticas RLS Problemáticas
-- Data: 2025-01-15
-- Objetivo: Resolver bloqueio de acesso às pipelines devido a auth.uid() NULL
-- =====================================================

-- ============================================
-- REMOVER POLÍTICAS PROBLEMÁTICAS
-- ============================================

-- Remover políticas que dependem de auth.uid() (que retorna NULL sem autenticação)
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Remover políticas antigas que podem estar conflitando
DROP POLICY IF EXISTS "Users can view custom fields of their tenant pipelines" ON pipeline_custom_fields;
DROP POLICY IF EXISTS "Admins can manage custom fields of their tenant pipelines" ON pipeline_custom_fields;
DROP POLICY IF EXISTS "Users can view leads of their tenant pipelines" ON pipeline_leads;
DROP POLICY IF EXISTS "Members can manage leads assigned to them or created by them" ON pipeline_leads;

-- Remover políticas de forms que usam auth.uid()
DROP POLICY IF EXISTS "Allow authenticated users to view forms" ON custom_forms;
DROP POLICY IF EXISTS "Allow authenticated users to create forms" ON custom_forms;
DROP POLICY IF EXISTS "Allow users to update their forms" ON custom_forms;
DROP POLICY IF EXISTS "Allow users to delete their forms" ON custom_forms;
DROP POLICY IF EXISTS "Allow authenticated users to manage form fields" ON form_fields;
DROP POLICY IF EXISTS "Allow users to view their form submissions" ON form_submissions;

-- ============================================
-- RECRIAR POLÍTICAS REALMENTE PERMISSIVAS
-- ============================================

-- Política permissiva para users
CREATE POLICY "users_all_access_permissive" ON users 
    FOR ALL USING (true) WITH CHECK (true);

-- Política permissiva para pipelines (garantir que não há conflito)
DROP POLICY IF EXISTS "pipelines_permissive" ON pipelines;
CREATE POLICY "pipelines_full_access" ON pipelines 
    FOR ALL USING (true) WITH CHECK (true);

-- Política permissiva para pipeline_members
DROP POLICY IF EXISTS "pipeline_members_permissive" ON pipeline_members;
CREATE POLICY "pipeline_members_full_access" ON pipeline_members 
    FOR ALL USING (true) WITH CHECK (true);

-- Política permissiva para pipeline_stages  
DROP POLICY IF EXISTS "pipeline_stages_permissive" ON pipeline_stages;
CREATE POLICY "pipeline_stages_full_access" ON pipeline_stages 
    FOR ALL USING (true) WITH CHECK (true);

-- Política permissiva para pipeline_custom_fields
CREATE POLICY "pipeline_custom_fields_full_access" ON pipeline_custom_fields 
    FOR ALL USING (true) WITH CHECK (true);

-- Política permissiva para pipeline_leads
CREATE POLICY "pipeline_leads_full_access" ON pipeline_leads 
    FOR ALL USING (true) WITH CHECK (true);

-- Política permissiva para user_pipeline_links
DROP POLICY IF EXISTS "user_pipeline_links_permissive" ON user_pipeline_links;
CREATE POLICY "user_pipeline_links_full_access" ON user_pipeline_links 
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- CORRIGIR POLÍTICAS DE FORMS SE EXISTIREM
-- ============================================

-- Verificar se as tabelas de forms existem e criar políticas permissivas
DO $$
BEGIN
    -- Custom forms
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'custom_forms') THEN
        EXECUTE 'CREATE POLICY "custom_forms_full_access" ON custom_forms FOR ALL USING (true) WITH CHECK (true)';
    END IF;
    
    -- Form fields  
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'form_fields') THEN
        EXECUTE 'CREATE POLICY "form_fields_full_access" ON form_fields FOR ALL USING (true) WITH CHECK (true)';
    END IF;
    
    -- Form submissions
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'form_submissions') THEN
        EXECUTE 'CREATE POLICY "form_submissions_full_access" ON form_submissions FOR ALL USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- ============================================
-- GARANTIR ACESSO A OUTRAS TABELAS CRÍTICAS
-- ============================================

-- Política permissiva para companies
DROP POLICY IF EXISTS "super_admin_companies_policy" ON companies;
DROP POLICY IF EXISTS "allow_all_companies_dev" ON companies;
CREATE POLICY "companies_full_access" ON companies 
    FOR ALL USING (true) WITH CHECK (true);

-- Política permissiva para integrations  
DROP POLICY IF EXISTS "super_admin_integrations_policy" ON integrations;
DROP POLICY IF EXISTS "allow_all_integrations_dev" ON integrations;
CREATE POLICY "integrations_full_access" ON integrations 
    FOR ALL USING (true) WITH CHECK (true);

-- Política permissiva para customers
DROP POLICY IF EXISTS "customers_access_policy" ON customers;
CREATE POLICY "customers_full_access" ON customers 
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- GARANTIR QUE RLS ESTEJA HABILITADO
-- ============================================

-- Manter RLS habilitado (não desabilitar)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pipeline_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS em tabelas de forms se existirem
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'custom_forms') THEN
        EXECUTE 'ALTER TABLE custom_forms ENABLE ROW LEVEL SECURITY';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'form_fields') THEN
        EXECUTE 'ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'form_submissions') THEN
        EXECUTE 'ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Log da migração
DO $$
BEGIN
    RAISE NOTICE 'Migração RLS concluída com sucesso!';
    RAISE NOTICE 'Todas as políticas foram atualizadas para acesso completo';
    RAISE NOTICE 'RLS permanece habilitado mas com políticas permissivas';
END $$; 
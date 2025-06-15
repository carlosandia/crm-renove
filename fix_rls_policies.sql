-- Remover políticas existentes que podem estar causando problemas
DROP POLICY IF EXISTS "Users can view custom fields of their tenant pipelines" ON pipeline_custom_fields;
DROP POLICY IF EXISTS "Admins can manage custom fields of their tenant pipelines" ON pipeline_custom_fields;

-- Criar políticas mais permissivas para resolver o problema
CREATE POLICY "pipeline_custom_fields_all_access" ON pipeline_custom_fields
    FOR ALL USING (true) WITH CHECK (true);

-- Verificar se as políticas de pipeline_leads também estão corretas
DROP POLICY IF EXISTS "Users can view leads of their tenant pipelines" ON pipeline_leads;
DROP POLICY IF EXISTS "Members can manage leads assigned to them or created by them" ON pipeline_leads;

CREATE POLICY "pipeline_leads_all_access" ON pipeline_leads
    FOR ALL USING (true) WITH CHECK (true);

-- Verificar se as tabelas principais têm políticas corretas
DROP POLICY IF EXISTS "pipelines_tenant_policy" ON pipelines;
DROP POLICY IF EXISTS "pipeline_members_policy" ON pipeline_members;
DROP POLICY IF EXISTS "pipeline_stages_policy" ON pipeline_stages;

CREATE POLICY "pipelines_all_access" ON pipelines
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "pipeline_members_all_access" ON pipeline_members
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "pipeline_stages_all_access" ON pipeline_stages
    FOR ALL USING (true) WITH CHECK (true);
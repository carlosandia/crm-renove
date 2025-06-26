-- =====================================================
-- MIGRAÇÃO FINAL - CORREÇÃO DE ACESSO ÀS PIPELINES
-- Data: 2025-01-26
-- Descrição: Resolver problemas de RLS e acesso às pipelines
-- =====================================================

-- 1. GARANTIR QUE TODAS AS TABELAS EXISTEM
-- =====================================================

-- Tabela pipeline_stages
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    temperature_score INTEGER DEFAULT 50,
    max_days_allowed INTEGER DEFAULT 7,
    color VARCHAR(50) DEFAULT '#3B82F6',
    is_system_stage BOOLEAN DEFAULT false,
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela pipeline_custom_fields
CREATE TABLE IF NOT EXISTS pipeline_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    field_options JSONB DEFAULT '[]',
    is_required BOOLEAN DEFAULT false,
    field_order INTEGER DEFAULT 0,
    placeholder VARCHAR(255),
    show_in_card BOOLEAN DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela pipeline_members
CREATE TABLE IF NOT EXISTS pipeline_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL,
    member_id UUID NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela pipeline_leads
CREATE TABLE IF NOT EXISTS pipeline_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL,
    stage_id UUID NOT NULL,
    custom_data JSONB DEFAULT '{}',
    lead_data JSONB DEFAULT '{}',
    temperature INTEGER DEFAULT 50,
    temperature_level VARCHAR(50) DEFAULT 'warm',
    assigned_to UUID,
    created_by UUID,
    status VARCHAR(50) DEFAULT 'active',
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    moved_at TIMESTAMP WITH TIME ZONE
);

-- 2. ADICIONAR FOREIGN KEYS SE NÃO EXISTIREM
-- =====================================================

-- Foreign keys para pipeline_stages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_pipeline_stages_pipeline_id' 
        AND table_name = 'pipeline_stages'
    ) THEN
        ALTER TABLE pipeline_stages 
        ADD CONSTRAINT fk_pipeline_stages_pipeline_id 
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Foreign keys para pipeline_custom_fields
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_pipeline_custom_fields_pipeline_id' 
        AND table_name = 'pipeline_custom_fields'
    ) THEN
        ALTER TABLE pipeline_custom_fields 
        ADD CONSTRAINT fk_pipeline_custom_fields_pipeline_id 
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Foreign keys para pipeline_members
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_pipeline_members_pipeline_id' 
        AND table_name = 'pipeline_members'
    ) THEN
        ALTER TABLE pipeline_members 
        ADD CONSTRAINT fk_pipeline_members_pipeline_id 
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Foreign keys para pipeline_leads
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_pipeline_leads_pipeline_id' 
        AND table_name = 'pipeline_leads'
    ) THEN
        ALTER TABLE pipeline_leads 
        ADD CONSTRAINT fk_pipeline_leads_pipeline_id 
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_pipeline_leads_stage_id' 
        AND table_name = 'pipeline_leads'
    ) THEN
        ALTER TABLE pipeline_leads 
        ADD CONSTRAINT fk_pipeline_leads_stage_id 
        FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. REMOVER POLÍTICAS RLS RESTRITIVAS E CRIAR PERMISSIVAS
-- =====================================================

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS dev_all_access ON pipeline_stages;
DROP POLICY IF EXISTS dev_all_access ON pipeline_custom_fields;
DROP POLICY IF EXISTS dev_all_access ON pipeline_members;
DROP POLICY IF EXISTS dev_all_access ON pipeline_leads;

-- Habilitar RLS
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;

-- Criar políticas permissivas para desenvolvimento
CREATE POLICY "allow_all_pipeline_stages" ON pipeline_stages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pipeline_custom_fields" ON pipeline_custom_fields FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pipeline_members" ON pipeline_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pipeline_leads" ON pipeline_leads FOR ALL USING (true) WITH CHECK (true);

-- 4. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para pipeline_stages
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_order ON pipeline_stages(pipeline_id, order_index);

-- Índices para pipeline_custom_fields
CREATE INDEX IF NOT EXISTS idx_pipeline_custom_fields_pipeline_id ON pipeline_custom_fields(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_custom_fields_order ON pipeline_custom_fields(pipeline_id, field_order);

-- Índices para pipeline_members
CREATE INDEX IF NOT EXISTS idx_pipeline_members_pipeline_id ON pipeline_members(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_members_member_id ON pipeline_members(member_id);

-- Índices para pipeline_leads
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_pipeline_id ON pipeline_leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_stage_id ON pipeline_leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_assigned_to ON pipeline_leads(assigned_to);

-- 5. FUNÇÃO PARA SINCRONIZAR TENANT_ID
-- =====================================================

CREATE OR REPLACE FUNCTION sync_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Para pipeline_stages, copiar tenant_id da pipeline
    IF TG_TABLE_NAME = 'pipeline_stages' THEN
        SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
    END IF;
    
    -- Para pipeline_custom_fields, copiar tenant_id da pipeline
    IF TG_TABLE_NAME = 'pipeline_custom_fields' THEN
        SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
    END IF;
    
    -- Para pipeline_members, copiar tenant_id da pipeline
    IF TG_TABLE_NAME = 'pipeline_members' THEN
        SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
    END IF;
    
    -- Para pipeline_leads, copiar tenant_id da pipeline
    IF TG_TABLE_NAME = 'pipeline_leads' THEN
        SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. CRIAR TRIGGERS PARA SINCRONIZAÇÃO
-- =====================================================

-- Trigger para pipeline_stages
DROP TRIGGER IF EXISTS sync_pipeline_stages_tenant_id ON pipeline_stages;
CREATE TRIGGER sync_pipeline_stages_tenant_id
    BEFORE INSERT OR UPDATE ON pipeline_stages
    FOR EACH ROW
    EXECUTE FUNCTION sync_tenant_id();

-- Trigger para pipeline_custom_fields
DROP TRIGGER IF EXISTS sync_pipeline_custom_fields_tenant_id ON pipeline_custom_fields;
CREATE TRIGGER sync_pipeline_custom_fields_tenant_id
    BEFORE INSERT OR UPDATE ON pipeline_custom_fields
    FOR EACH ROW
    EXECUTE FUNCTION sync_tenant_id();

-- Trigger para pipeline_members
DROP TRIGGER IF EXISTS sync_pipeline_members_tenant_id ON pipeline_members;
CREATE TRIGGER sync_pipeline_members_tenant_id
    BEFORE INSERT OR UPDATE ON pipeline_members
    FOR EACH ROW
    EXECUTE FUNCTION sync_tenant_id();

-- Trigger para pipeline_leads
DROP TRIGGER IF EXISTS sync_pipeline_leads_tenant_id ON pipeline_leads;
CREATE TRIGGER sync_pipeline_leads_tenant_id
    BEFORE INSERT OR UPDATE ON pipeline_leads
    FOR EACH ROW
    EXECUTE FUNCTION sync_tenant_id();

-- 7. SINCRONIZAR DADOS EXISTENTES
-- =====================================================

-- Sincronizar tenant_id em pipeline_stages
UPDATE pipeline_stages 
SET tenant_id = p.tenant_id 
FROM pipelines p 
WHERE pipeline_stages.pipeline_id = p.id 
AND (pipeline_stages.tenant_id IS NULL OR pipeline_stages.tenant_id != p.tenant_id);

-- Sincronizar tenant_id em pipeline_custom_fields
UPDATE pipeline_custom_fields 
SET tenant_id = p.tenant_id 
FROM pipelines p 
WHERE pipeline_custom_fields.pipeline_id = p.id 
AND (pipeline_custom_fields.tenant_id IS NULL OR pipeline_custom_fields.tenant_id != p.tenant_id);

-- Sincronizar tenant_id em pipeline_members
UPDATE pipeline_members 
SET tenant_id = p.tenant_id 
FROM pipelines p 
WHERE pipeline_members.pipeline_id = p.id 
AND (pipeline_members.tenant_id IS NULL OR pipeline_members.tenant_id != p.tenant_id);

-- Sincronizar tenant_id em pipeline_leads
UPDATE pipeline_leads 
SET tenant_id = p.tenant_id 
FROM pipelines p 
WHERE pipeline_leads.pipeline_id = p.id 
AND (pipeline_leads.tenant_id IS NULL OR pipeline_leads.tenant_id != p.tenant_id);

-- =====================================================
-- MIGRAÇÃO CONCLUÍDA
-- =====================================================

-- Log de conclusão
DO $$
BEGIN
    RAISE NOTICE 'Migração de correção de acesso às pipelines concluída com sucesso!';
    RAISE NOTICE 'Tabelas verificadas: pipeline_stages, pipeline_custom_fields, pipeline_members, pipeline_leads';
    RAISE NOTICE 'Políticas RLS permissivas aplicadas para desenvolvimento';
    RAISE NOTICE 'Triggers de sincronização de tenant_id criados';
END $$; 
-- =====================================================
-- MIGRAÇÃO CONSOLIDADA FINAL - CRM MARKETING
-- Data: 2025-01-25
-- Descrição: Consolidação de todas as funcionalidades
-- =====================================================

-- 1. VERIFICAR E CRIAR TABELAS ESSENCIAIS
-- =====================================================

-- Tabela de usuários (se não existir)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'member',
    tenant_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pipelines (se não existir)
CREATE TABLE IF NOT EXISTS pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tenant_id UUID NOT NULL,
    created_by UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de etapas de pipeline (se não existir)
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    order_index INTEGER NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    temperature_score INTEGER DEFAULT 50,
    max_days_allowed INTEGER,
    is_system_stage BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de campos personalizados (se não existir)
CREATE TABLE IF NOT EXISTS pipeline_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    field_options JSONB,
    is_required BOOLEAN DEFAULT false,
    field_order INTEGER DEFAULT 0,
    placeholder VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de membros da pipeline (se não existir)
CREATE TABLE IF NOT EXISTS pipeline_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pipeline_id, member_id)
);

-- Tabela de leads (se não existir)
CREATE TABLE IF NOT EXISTS pipeline_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    custom_data JSONB DEFAULT '{}',
    temperature INTEGER DEFAULT 50,
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices essenciais (se não existirem)
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant_id ON pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_created_by ON pipelines(created_by);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_order ON pipeline_stages(pipeline_id, order_index);
CREATE INDEX IF NOT EXISTS idx_pipeline_custom_fields_pipeline_id ON pipeline_custom_fields(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_members_pipeline_id ON pipeline_members(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_members_member_id ON pipeline_members(member_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_pipeline_id ON pipeline_leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_stage_id ON pipeline_leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_assigned_to ON pipeline_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para garantir etapas do sistema
CREATE OR REPLACE FUNCTION ensure_pipeline_stages(pipeline_id_param UUID)
RETURNS VOID AS $$
BEGIN
    -- Verificar se já existem etapas
    IF NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE pipeline_id = pipeline_id_param) THEN
        -- Criar etapas padrão do sistema
        INSERT INTO pipeline_stages (pipeline_id, name, order_index, color, temperature_score, is_system_stage) VALUES
        (pipeline_id_param, 'Novos leads', 1, '#EF4444', 25, true),
        (pipeline_id_param, 'Ganho', 98, '#10B981', 100, true),
        (pipeline_id_param, 'Perdido', 99, '#6B7280', 0, true);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Função exec_sql para compatibilidade
CREATE OR REPLACE FUNCTION exec_sql(sql_text TEXT)
RETURNS TEXT AS $$
BEGIN
    EXECUTE sql_text;
    RETURN 'Success';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 4. POLÍTICAS RLS PERMISSIVAS
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para desenvolvimento
DROP POLICY IF EXISTS "Acesso total para desenvolvimento" ON users;
CREATE POLICY "Acesso total para desenvolvimento" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total para desenvolvimento" ON pipelines;
CREATE POLICY "Acesso total para desenvolvimento" ON pipelines FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total para desenvolvimento" ON pipeline_stages;
CREATE POLICY "Acesso total para desenvolvimento" ON pipeline_stages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total para desenvolvimento" ON pipeline_custom_fields;
CREATE POLICY "Acesso total para desenvolvimento" ON pipeline_custom_fields FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total para desenvolvimento" ON pipeline_members;
CREATE POLICY "Acesso total para desenvolvimento" ON pipeline_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total para desenvolvimento" ON pipeline_leads;
CREATE POLICY "Acesso total para desenvolvimento" ON pipeline_leads FOR ALL USING (true) WITH CHECK (true);

-- 5. TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para todas as tabelas
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pipelines_updated_at ON pipelines;
CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pipeline_stages_updated_at ON pipeline_stages;
CREATE TRIGGER update_pipeline_stages_updated_at BEFORE UPDATE ON pipeline_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pipeline_custom_fields_updated_at ON pipeline_custom_fields;
CREATE TRIGGER update_pipeline_custom_fields_updated_at BEFORE UPDATE ON pipeline_custom_fields FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pipeline_leads_updated_at ON pipeline_leads;
CREATE TRIGGER update_pipeline_leads_updated_at BEFORE UPDATE ON pipeline_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. DADOS DE EXEMPLO (SE NECESSÁRIO)
-- =====================================================

-- Inserir dados apenas se não existirem
DO $$
BEGIN
    -- Verificar se já existem pipelines
    IF NOT EXISTS (SELECT 1 FROM pipelines LIMIT 1) THEN
        -- Inserir pipeline de exemplo
        INSERT INTO pipelines (id, name, description, tenant_id, created_by, is_active) VALUES
        ('dc2f1fc5-53b5-4f54-bb56-009f58481b97', 'Nova Pipe', 'Pipeline principal de vendas', 'dc2f1fc5-53b5-4f54-bb56-009f58481b97', 'admin@teste.com', true);
        
        -- Garantir etapas do sistema
        PERFORM ensure_pipeline_stages('dc2f1fc5-53b5-4f54-bb56-009f58481b97');
    END IF;
END $$;

-- =====================================================
-- FIM DA MIGRAÇÃO CONSOLIDADA
-- ===================================================== 
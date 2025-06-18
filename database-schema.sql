-- =====================================================
-- CRM MARKETING - ESQUEMA COMPLETO DO BANCO DE DADOS
-- Arquivo unificado com todas as estruturas necessárias
-- =====================================================

-- ============================================
-- SEÇÃO 1: TABELAS PRINCIPAIS
-- ============================================

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'member')),
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de empresas (clientes) - ATUALIZADA com novos campos obrigatórios
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  segment TEXT, -- Mantido para compatibilidade
  industry TEXT NOT NULL, -- Novo campo: Nicho de atuação
  website TEXT,
  phone TEXT,
  email TEXT,
  address TEXT, -- Endereço completo (opcional)
  city TEXT NOT NULL, -- Cidade obrigatória
  state TEXT NOT NULL, -- Estado obrigatório
  country TEXT DEFAULT 'Brasil',
  -- Campos de expectativa mensal obrigatórios
  expected_leads_monthly INTEGER NOT NULL CHECK (expected_leads_monthly >= 0),
  expected_sales_monthly INTEGER NOT NULL CHECK (expected_sales_monthly >= 0),
  expected_followers_monthly INTEGER NOT NULL CHECK (expected_followers_monthly >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    tenant_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SEÇÃO 2: SISTEMA DE PIPELINES
-- ============================================

-- Tabela principal de pipelines
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tenant_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Relacionamento Pipeline <-> Vendedores (Members)
CREATE TABLE IF NOT EXISTS pipeline_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  member_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pipeline_id, member_id)
);

-- Etapas do funil (Kanban)
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  temperature_score INTEGER CHECK (temperature_score >= 0 AND temperature_score <= 100),
  max_days_allowed INTEGER CHECK (max_days_allowed > 0),
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Campos customizados por pipeline
CREATE TABLE IF NOT EXISTS pipeline_custom_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(200) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'email', 'phone', 'textarea', 'select', 'number', 'date')),
    field_options JSONB,
    is_required BOOLEAN DEFAULT false,
    field_order INTEGER DEFAULT 0,
    placeholder TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pipeline_id, field_name)
);

-- Leads/Cards do Kanban
CREATE TABLE IF NOT EXISTS pipeline_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    lead_data JSONB NOT NULL DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vínculos usuário-pipeline
CREATE TABLE IF NOT EXISTS user_pipeline_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, pipeline_id)
);

-- Cadência de follow-ups
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  day_offset INTEGER NOT NULL CHECK (day_offset > 0),
  note TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- SEÇÃO 3: ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Índices para companies
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_state ON companies(state);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);

-- Índices para customers
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Índices para pipelines
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant_id ON pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_created_by ON pipelines(created_by);
CREATE INDEX IF NOT EXISTS idx_pipelines_is_active ON pipelines(is_active);

-- Índices para pipeline_members
CREATE INDEX IF NOT EXISTS idx_pipeline_members_pipeline_id ON pipeline_members(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_members_member_id ON pipeline_members(member_id);

-- Índices para pipeline_stages
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_order ON pipeline_stages(pipeline_id, order_index);

-- Índices para pipeline_custom_fields
CREATE INDEX IF NOT EXISTS idx_pipeline_custom_fields_pipeline_id ON pipeline_custom_fields(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_custom_fields_order ON pipeline_custom_fields(pipeline_id, field_order);

-- Índices para pipeline_leads
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_pipeline_id ON pipeline_leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_stage_id ON pipeline_leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_created_by ON pipeline_leads(created_by);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_assigned_to ON pipeline_leads(assigned_to);

-- Índices para user_pipeline_links
CREATE INDEX IF NOT EXISTS idx_user_pipeline_links_user_id ON user_pipeline_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pipeline_links_pipeline_id ON user_pipeline_links(pipeline_id);

-- Índices para follow_ups
CREATE INDEX IF NOT EXISTS idx_follow_ups_pipeline_id ON follow_ups(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_stage_id ON follow_ups(stage_id);

-- ============================================
-- SEÇÃO 4: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pipeline_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SEÇÃO 5: POLÍTICAS RLS SIMPLIFICADAS
-- ============================================

-- Políticas simples que permitem acesso total (podem ser refinadas depois)
CREATE POLICY "users_access_policy" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "companies_access_policy" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "customers_access_policy" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pipelines_access_policy" ON pipelines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pipeline_members_access_policy" ON pipeline_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pipeline_stages_access_policy" ON pipeline_stages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pipeline_custom_fields_access_policy" ON pipeline_custom_fields FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pipeline_leads_access_policy" ON pipeline_leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "user_pipeline_links_access_policy" ON user_pipeline_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "follow_ups_access_policy" ON follow_ups FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SEÇÃO 6: FUNÇÕES E TRIGGERS
-- ============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON companies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipelines_updated_at 
    BEFORE UPDATE ON pipelines 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_custom_fields_updated_at 
    BEFORE UPDATE ON pipeline_custom_fields 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_leads_updated_at 
    BEFORE UPDATE ON pipeline_leads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEÇÃO 7: COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE users IS 'Usuários do sistema CRM';
COMMENT ON TABLE companies IS 'Empresas clientes com dados de expectativa mensal';
COMMENT ON TABLE customers IS 'Clientes cadastrados no CRM';
COMMENT ON TABLE pipelines IS 'Pipelines de vendas configuráveis';
COMMENT ON TABLE pipeline_members IS 'Relacionamento entre usuários e pipelines';
COMMENT ON TABLE pipeline_stages IS 'Etapas do funil de vendas (Kanban)';
COMMENT ON TABLE pipeline_custom_fields IS 'Campos customizados por pipeline';
COMMENT ON TABLE pipeline_leads IS 'Leads/Cards do Kanban';
COMMENT ON TABLE user_pipeline_links IS 'Vínculos entre usuários e pipelines';
COMMENT ON TABLE follow_ups IS 'Cadência de follow-ups por etapa';

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
SELECT 'Esquema do banco atualizado com novos campos obrigatórios!' as status; 
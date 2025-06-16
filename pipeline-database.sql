-- ============================================
-- MÓDULO PIPELINE - ESTRUTURA DO BANCO DE DADOS
-- ============================================

-- Tabela principal de pipelines
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tenant_id UUID NOT NULL,
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
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant_id ON pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_created_by ON pipelines(created_by);
CREATE INDEX IF NOT EXISTS idx_pipeline_members_pipeline_id ON pipeline_members(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_members_member_id ON pipeline_members(member_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_order ON pipeline_stages(pipeline_id, order_index);
CREATE INDEX IF NOT EXISTS idx_follow_ups_pipeline_id ON follow_ups(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_stage_id ON follow_ups(stage_id);

-- ============================================
-- HABILITAR RLS (ROW LEVEL SECURITY)
-- ============================================
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS
-- ============================================

-- Política para pipelines: usuários só veem pipelines do seu tenant
CREATE POLICY "pipelines_tenant_policy" ON pipelines
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Política para pipeline_members
CREATE POLICY "pipeline_members_policy" ON pipeline_members
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Política para pipeline_stages
CREATE POLICY "pipeline_stages_policy" ON pipeline_stages
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Política para follow_ups
CREATE POLICY "follow_ups_policy" ON follow_ups
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- FUNÇÃO PARA ATUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at na tabela pipelines
CREATE TRIGGER update_pipelines_updated_at 
    BEFORE UPDATE ON pipelines 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DADOS DE EXEMPLO (OPCIONAL)
-- ============================================

-- Inserir pipeline de exemplo
INSERT INTO pipelines (name, description, tenant_id, created_by) 
SELECT 
    'Pipeline Vendas B2B',
    'Pipeline padrão para vendas B2B com 5 etapas',
    'tenant-1',
    id
FROM users 
WHERE email = 'admin@crm.com' AND role = 'admin'
LIMIT 1;

-- Inserir etapas de exemplo
WITH pipeline_data AS (
    SELECT id as pipeline_id FROM pipelines WHERE name = 'Pipeline Vendas B2B' LIMIT 1
)
INSERT INTO pipeline_stages (pipeline_id, name, order_index, temperature_score, max_days_allowed, color)
SELECT 
    pipeline_id,
    stage_name,
    stage_order,
    stage_temp,
    stage_days,
    stage_color
FROM pipeline_data,
(VALUES 
    ('Contato Inicial', 1, 20, 7, '#EF4444'),
    ('Qualificação', 2, 40, 5, '#F97316'),
    ('Proposta', 3, 60, 10, '#EAB308'),
    ('Negociação', 4, 80, 7, '#22C55E'),
    ('Fechamento', 5, 95, 3, '#3B82F6')
) AS stages(stage_name, stage_order, stage_temp, stage_days, stage_color);

-- Inserir follow-ups de exemplo
WITH stage_data AS (
    SELECT ps.id as stage_id, ps.pipeline_id
    FROM pipeline_stages ps
    JOIN pipelines p ON ps.pipeline_id = p.id
    WHERE p.name = 'Pipeline Vendas B2B'
)
INSERT INTO follow_ups (pipeline_id, stage_id, day_offset, note)
SELECT 
    pipeline_id,
    stage_id,
    follow_day,
    follow_note
FROM stage_data,
(VALUES 
    (1, 'Primeiro contato - verificar interesse'),
    (3, 'Acompanhar proposta enviada'),
    (2, 'Segunda tentativa de contato')
) AS follows(follow_day, follow_note);

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
SELECT 'Estrutura de Pipeline criada com sucesso!' as status;
SELECT COUNT(*) as total_pipelines FROM pipelines;
SELECT COUNT(*) as total_stages FROM pipeline_stages;
SELECT COUNT(*) as total_followups FROM follow_ups;
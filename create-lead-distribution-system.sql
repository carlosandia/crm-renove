-- ============================================
-- SISTEMA DE DISTRIBUIÇÃO DE LEADS
-- ============================================

-- 1. Tabela de regras de distribuição por pipeline
CREATE TABLE IF NOT EXISTS pipeline_distribution_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('rodizio', 'manual')),
    last_assigned_member_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir uma regra por pipeline
    UNIQUE(pipeline_id)
);

-- 2. Tabela de atribuições de leads
CREATE TABLE IF NOT EXISTS lead_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id),
    assigned_by UUID REFERENCES users(id), -- NULL se rodízio automático
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unassigned_at TIMESTAMP WITH TIME ZONE NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. Tabela de histórico de ações nos leads
CREATE TABLE IF NOT EXISTS lead_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'lead_created', 'assigned', 'moved', 'updated', 'won', 'lost'
    performed_by UUID REFERENCES users(id),
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- 4. Adicionar campos necessários à tabela pipeline_leads se não existirem
DO $$ 
BEGIN
    -- Adicionar assigned_to se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'assigned_to') THEN
        ALTER TABLE pipeline_leads ADD COLUMN assigned_to UUID REFERENCES users(id);
    END IF;
    
    -- Adicionar created_via se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'created_via') THEN
        ALTER TABLE pipeline_leads ADD COLUMN created_via TEXT CHECK (created_via IN ('form', 'webhook', 'manual'));
    END IF;
    
    -- Adicionar moved_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'moved_at') THEN
        ALTER TABLE pipeline_leads ADD COLUMN moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pipeline_distribution_rules_pipeline_id ON pipeline_distribution_rules(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_distribution_rules_mode ON pipeline_distribution_rules(mode);

CREATE INDEX IF NOT EXISTS idx_lead_assignments_lead_id ON lead_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_assigned_to ON lead_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_active ON lead_assignments(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_action ON lead_history(action);
CREATE INDEX IF NOT EXISTS idx_lead_history_timestamp ON lead_history(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_leads_assigned_to ON pipeline_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_created_via ON pipeline_leads(created_via);

-- RLS (Row Level Security)
ALTER TABLE pipeline_distribution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS permissivas para desenvolvimento
CREATE POLICY "pipeline_distribution_rules_all_access" ON pipeline_distribution_rules
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "lead_assignments_all_access" ON lead_assignments
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "lead_history_all_access" ON lead_history
    FOR ALL USING (true) WITH CHECK (true);

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_distribution_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_distribution_rules_updated_at
    BEFORE UPDATE ON pipeline_distribution_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_distribution_rules_updated_at();

-- Função para criar regra de distribuição padrão para novas pipelines
CREATE OR REPLACE FUNCTION create_default_distribution_rule()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO pipeline_distribution_rules (pipeline_id, mode)
    VALUES (NEW.id, 'manual')
    ON CONFLICT (pipeline_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_distribution_rule
    AFTER INSERT ON pipelines
    FOR EACH ROW
    EXECUTE FUNCTION create_default_distribution_rule();

-- Inserir regras padrão para pipelines existentes
INSERT INTO pipeline_distribution_rules (pipeline_id, mode)
SELECT id, 'manual' FROM pipelines
ON CONFLICT (pipeline_id) DO NOTHING;

-- Comentários
COMMENT ON TABLE pipeline_distribution_rules IS 'Regras de distribuição de leads por pipeline';
COMMENT ON COLUMN pipeline_distribution_rules.mode IS 'Modo de distribuição: rodizio ou manual';
COMMENT ON COLUMN pipeline_distribution_rules.last_assigned_member_id IS 'Último membro que recebeu um lead no rodízio';

COMMENT ON TABLE lead_assignments IS 'Histórico de atribuições de leads a vendedores';
COMMENT ON COLUMN lead_assignments.assigned_by IS 'Quem fez a atribuição (NULL para rodízio automático)';
COMMENT ON COLUMN lead_assignments.is_active IS 'Se a atribuição está ativa (para histórico)';

COMMENT ON TABLE lead_history IS 'Histórico completo de ações realizadas nos leads';
COMMENT ON COLUMN lead_history.action IS 'Tipo de ação realizada';
COMMENT ON COLUMN lead_history.old_values IS 'Valores antes da alteração';
COMMENT ON COLUMN lead_history.new_values IS 'Valores após a alteração';

-- Log de sucesso
DO $$ 
BEGIN
    RAISE NOTICE 'Sistema de distribuição de leads criado com sucesso!';
END $$; 
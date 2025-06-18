-- SCRIPT DE CONFIGURAÇÃO DO SISTEMA DE DISTRIBUIÇÃO DE LEADS

-- 1. Verificar e adicionar campos necessários à tabela pipeline_leads
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'assigned_to') THEN
        ALTER TABLE pipeline_leads ADD COLUMN assigned_to UUID REFERENCES users(id);
        RAISE NOTICE 'Campo assigned_to adicionado à tabela pipeline_leads';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'created_via') THEN
        ALTER TABLE pipeline_leads ADD COLUMN created_via TEXT CHECK (created_via IN ('form', 'webhook', 'manual'));
        RAISE NOTICE 'Campo created_via adicionado à tabela pipeline_leads';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'moved_at') THEN
        ALTER TABLE pipeline_leads ADD COLUMN moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Campo moved_at adicionado à tabela pipeline_leads';
    END IF;
END $$;

-- 2. Criar tabela de regras de distribuição por pipeline
CREATE TABLE IF NOT EXISTS pipeline_distribution_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('rodizio', 'manual')),
    last_assigned_member_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pipeline_id)
);

-- 3. Criar tabela de atribuições de leads
CREATE TABLE IF NOT EXISTS lead_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id),
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unassigned_at TIMESTAMP WITH TIME ZONE NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. Criar tabela de histórico de ações nos leads
CREATE TABLE IF NOT EXISTS lead_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    performed_by UUID REFERENCES users(id),
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_pipeline_distribution_rules_pipeline_id ON pipeline_distribution_rules(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_lead_id ON lead_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_assigned_to ON pipeline_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_created_via ON pipeline_leads(created_via);

-- 6. Configurar RLS (Row Level Security)
ALTER TABLE pipeline_distribution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas RLS permissivas
DROP POLICY IF EXISTS "pipeline_distribution_rules_all_access" ON pipeline_distribution_rules;
CREATE POLICY "pipeline_distribution_rules_all_access" ON pipeline_distribution_rules
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "lead_assignments_all_access" ON lead_assignments;
CREATE POLICY "lead_assignments_all_access" ON lead_assignments
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "lead_history_all_access" ON lead_history;
CREATE POLICY "lead_history_all_access" ON lead_history
    FOR ALL USING (true) WITH CHECK (true);

-- 8. Inserir regras padrão para pipelines existentes
INSERT INTO pipeline_distribution_rules (pipeline_id, mode)
SELECT id, 'manual' FROM pipelines
ON CONFLICT (pipeline_id) DO NOTHING;

-- 9. Função para distribuição atômica de leads por rodízio
CREATE OR REPLACE FUNCTION assign_lead_round_robin(
    p_lead_id UUID,
    p_pipeline_id UUID,
    p_assigned_to UUID,
    p_last_assigned_member_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_success BOOLEAN := FALSE;
BEGIN
    -- Usar transação para garantir atomicidade
    BEGIN
        -- Atualizar o lead
        UPDATE pipeline_leads 
        SET assigned_to = p_assigned_to,
            updated_at = NOW()
        WHERE id = p_lead_id;
        
        -- Atualizar a regra de distribuição
        UPDATE pipeline_distribution_rules 
        SET last_assigned_member_id = p_last_assigned_member_id,
            updated_at = NOW()
        WHERE pipeline_id = p_pipeline_id;
        
        -- Se chegou até aqui, sucesso
        v_success := TRUE;
        
    EXCEPTION WHEN OTHERS THEN
        -- Em caso de erro, rollback automático
        v_success := FALSE;
        RAISE NOTICE 'Erro na distribuição atômica: %', SQLERRM;
    END;
    
    RETURN v_success;
END;
$$ LANGUAGE plpgsql;

-- 10. Função para obter próximo membro no rodízio
CREATE OR REPLACE FUNCTION get_next_member_round_robin(
    p_pipeline_id UUID
) RETURNS TABLE(
    member_id UUID,
    member_name TEXT,
    member_email TEXT
) AS $$
DECLARE
    v_last_assigned UUID;
    v_members UUID[];
    v_last_index INTEGER;
    v_next_index INTEGER;
    v_next_member_id UUID;
BEGIN
    -- Buscar último membro atribuído
    SELECT last_assigned_member_id INTO v_last_assigned
    FROM pipeline_distribution_rules
    WHERE pipeline_id = p_pipeline_id;
    
    -- Buscar membros ativos ordenados
    SELECT ARRAY_AGG(u.id ORDER BY u.id) INTO v_members
    FROM pipeline_members pm
    INNER JOIN users u ON pm.member_id = u.id
    WHERE pm.pipeline_id = p_pipeline_id
      AND u.is_active = TRUE
      AND u.role = 'member';
    
    -- Se não há membros, retornar vazio
    IF v_members IS NULL OR array_length(v_members, 1) = 0 THEN
        RETURN;
    END IF;
    
    -- Determinar próximo membro
    IF v_last_assigned IS NULL THEN
        -- Primeiro lead
        v_next_member_id := v_members[1];
    ELSE
        -- Encontrar índice do último membro
        SELECT array_position(v_members, v_last_assigned) INTO v_last_index;
        
        IF v_last_index IS NULL THEN
            -- Último membro não encontrado, usar primeiro
            v_next_member_id := v_members[1];
        ELSE
            -- Próximo membro (circular)
            v_next_index := (v_last_index % array_length(v_members, 1)) + 1;
            v_next_member_id := v_members[v_next_index];
        END IF;
    END IF;
    
    -- Retornar dados do próximo membro
    RETURN QUERY
    SELECT u.id, 
           CONCAT(u.first_name, ' ', u.last_name),
           u.email
    FROM users u
    WHERE u.id = v_next_member_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_distribution_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_distribution_rules_updated_at ON pipeline_distribution_rules;
CREATE TRIGGER trigger_update_distribution_rules_updated_at
    BEFORE UPDATE ON pipeline_distribution_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_distribution_rules_updated_at();

-- 12. Função para criar regra de distribuição padrão para novas pipelines
CREATE OR REPLACE FUNCTION create_default_distribution_rule()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO pipeline_distribution_rules (pipeline_id, mode)
    VALUES (NEW.id, 'manual')
    ON CONFLICT (pipeline_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_default_distribution_rule ON pipelines;
CREATE TRIGGER trigger_create_default_distribution_rule
    AFTER INSERT ON pipelines
    FOR EACH ROW
    EXECUTE FUNCTION create_default_distribution_rule();

-- Log de sucesso
DO $$ 
BEGIN
    RAISE NOTICE '✅ Sistema de distribuição de leads configurado com sucesso!';
    RAISE NOTICE '📋 Estruturas criadas:';
    RAISE NOTICE '   - pipeline_distribution_rules (regras de distribuição)';
    RAISE NOTICE '   - lead_assignments (atribuições de leads)';
    RAISE NOTICE '   - lead_history (histórico de ações)';
    RAISE NOTICE '   - Campos adicionados à pipeline_leads';
    RAISE NOTICE '   - Índices para performance';
    RAISE NOTICE '   - Funções para distribuição atômica';
    RAISE NOTICE '   - Triggers automáticos';
    RAISE NOTICE '🎯 Rota disponível: POST /api/leads/create';
    RAISE NOTICE '🔄 Distribuição por rodízio implementada';
END $$;
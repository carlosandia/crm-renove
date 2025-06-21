-- ============================================
-- TABELAS PARA INTERAÇÕES COM LEADS
-- Comentários, Feedbacks e Histórico
-- ============================================

-- 1. TABELA DE COMENTÁRIOS DOS LEADS
CREATE TABLE IF NOT EXISTS lead_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE FEEDBACKS DOS LEADS (apenas members podem criar)
CREATE TABLE IF NOT EXISTS lead_feedbacks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE HISTÓRICO DOS LEADS (já existe, mas vou garantir que está correta)
CREATE TABLE IF NOT EXISTS lead_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índices para lead_comments
CREATE INDEX IF NOT EXISTS idx_lead_comments_lead_id ON lead_comments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_comments_user_id ON lead_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_comments_created_at ON lead_comments(created_at DESC);

-- Índices para lead_feedbacks
CREATE INDEX IF NOT EXISTS idx_lead_feedbacks_lead_id ON lead_feedbacks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_feedbacks_user_id ON lead_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_feedbacks_created_at ON lead_feedbacks(created_at DESC);

-- Índices para lead_history
CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_user_id ON lead_history(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_action ON lead_history(action);
CREATE INDEX IF NOT EXISTS idx_lead_history_created_at ON lead_history(created_at DESC);

-- ============================================
-- RLS (ROW LEVEL SECURITY)
-- ============================================

-- Habilitar RLS nas tabelas
ALTER TABLE lead_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;

-- Políticas para lead_comments
CREATE POLICY "Users can view comments from their tenant" ON lead_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pipeline_leads pl
            JOIN pipelines p ON pl.pipeline_id = p.id
            JOIN users u ON u.tenant_id = p.tenant_id
            WHERE pl.id = lead_comments.lead_id
            AND u.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert comments for their tenant leads" ON lead_comments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM pipeline_leads pl
            JOIN pipelines p ON pl.pipeline_id = p.id
            JOIN users u ON u.tenant_id = p.tenant_id
            WHERE pl.id = lead_comments.lead_id
            AND u.id = auth.uid()
        )
    );

-- Políticas para lead_feedbacks (apenas members podem criar, super_admin pode ver)
CREATE POLICY "Super admin can view all feedbacks" ON lead_feedbacks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Members can view feedbacks from their tenant" ON lead_feedbacks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pipeline_leads pl
            JOIN pipelines p ON pl.pipeline_id = p.id
            JOIN users u ON u.tenant_id = p.tenant_id
            WHERE pl.id = lead_feedbacks.lead_id
            AND u.id = auth.uid()
        )
    );

CREATE POLICY "Only members can insert feedbacks" ON lead_feedbacks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'member'
        )
        AND EXISTS (
            SELECT 1 FROM pipeline_leads pl
            JOIN pipelines p ON pl.pipeline_id = p.id
            JOIN users u ON u.tenant_id = p.tenant_id
            WHERE pl.id = lead_feedbacks.lead_id
            AND u.id = auth.uid()
        )
    );

-- Políticas para lead_history
CREATE POLICY "Users can view history from their tenant" ON lead_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pipeline_leads pl
            JOIN pipelines p ON pl.pipeline_id = p.id
            JOIN users u ON u.tenant_id = p.tenant_id
            WHERE pl.id = lead_history.lead_id
            AND u.id = auth.uid()
        )
    );

CREATE POLICY "System can insert history entries" ON lead_history
    FOR INSERT WITH CHECK (true);

-- ============================================
-- FUNÇÕES PARA REGISTRAR HISTÓRICO AUTOMATICAMENTE
-- ============================================

-- Função para registrar entrada no histórico
CREATE OR REPLACE FUNCTION register_lead_history(
    p_lead_id UUID,
    p_action VARCHAR(100),
    p_description TEXT,
    p_user_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT '{}',
    p_new_values JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_history_id UUID;
    v_user_id UUID;
BEGIN
    -- Se user_id não foi fornecido, usar o usuário autenticado
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Inserir entrada no histórico
    INSERT INTO lead_history (
        lead_id,
        action,
        description,
        user_id,
        old_values,
        new_values
    ) VALUES (
        p_lead_id,
        p_action,
        p_description,
        v_user_id,
        p_old_values,
        p_new_values
    ) RETURNING id INTO v_history_id;
    
    RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS PARA HISTÓRICO AUTOMÁTICO
-- ============================================

-- Trigger para criação de lead
CREATE OR REPLACE FUNCTION trigger_lead_created_history()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM register_lead_history(
        NEW.id,
        'lead_created',
        'Lead criado na pipeline',
        NEW.created_by,
        '{}',
        jsonb_build_object(
            'pipeline_id', NEW.pipeline_id,
            'stage_id', NEW.stage_id,
            'lead_data', NEW.lead_data
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pipeline_leads_created_history
    AFTER INSERT ON pipeline_leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_lead_created_history();

-- Trigger para movimentação de stage
CREATE OR REPLACE FUNCTION trigger_lead_moved_history()
RETURNS TRIGGER AS $$
DECLARE
    v_old_stage_name TEXT;
    v_new_stage_name TEXT;
BEGIN
    IF OLD.stage_id != NEW.stage_id THEN
        -- Buscar nomes das etapas
        SELECT name INTO v_old_stage_name FROM pipeline_stages WHERE id = OLD.stage_id;
        SELECT name INTO v_new_stage_name FROM pipeline_stages WHERE id = NEW.stage_id;
        
        PERFORM register_lead_history(
            NEW.id,
            'stage_moved',
            format('Lead movido de "%s" para "%s"', v_old_stage_name, v_new_stage_name),
            COALESCE(NEW.created_by, OLD.created_by),
            jsonb_build_object('stage_id', OLD.stage_id, 'stage_name', v_old_stage_name),
            jsonb_build_object('stage_id', NEW.stage_id, 'stage_name', v_new_stage_name)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pipeline_leads_moved_history
    AFTER UPDATE ON pipeline_leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_lead_moved_history();

-- ============================================
-- COMENTÁRIOS DA DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE lead_comments IS 'Comentários dos leads - sistema de chat entre admin e members';
COMMENT ON TABLE lead_feedbacks IS 'Feedbacks dos leads - apenas members podem criar, super_admin visualiza';
COMMENT ON TABLE lead_history IS 'Histórico de ações dos leads - timeline automática de todas as ações';

COMMENT ON FUNCTION register_lead_history IS 'Função para registrar entradas no histórico de leads';

-- Log de sucesso
DO $$ 
BEGIN
    RAISE NOTICE 'Tabelas de interações com leads criadas com sucesso!';
    RAISE NOTICE 'Tabelas: lead_comments, lead_feedbacks, lead_history';
    RAISE NOTICE 'RLS configurado para controle de acesso por tenant e role';
    RAISE NOTICE 'Triggers automáticos para histórico implementados';
END $$; 
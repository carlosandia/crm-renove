-- ============================================
-- SISTEMA DE FEEDBACK PARA LEADS
-- ============================================

-- Tabela para armazenar feedback dos leads
CREATE TABLE IF NOT EXISTS lead_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lead_feedback_lead_id ON lead_feedback(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_feedback_user_id ON lead_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_feedback_created_at ON lead_feedback(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE lead_feedback ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam feedback de leads do seu tenant
CREATE POLICY "Users can view feedback from their tenant leads" ON lead_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pipeline_leads pl
            JOIN pipelines p ON pl.pipeline_id = p.id
            JOIN profiles u ON p.tenant_id = u.tenant_id
            WHERE pl.id = lead_feedback.lead_id 
            AND u.id = auth.uid()
        )
    );

-- Política para permitir que usuários criem feedback
CREATE POLICY "Users can create feedback for leads" ON lead_feedback
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM pipeline_leads pl
            JOIN pipelines p ON pl.pipeline_id = p.id
            JOIN profiles u ON p.tenant_id = u.tenant_id
            WHERE pl.id = lead_feedback.lead_id 
            AND u.id = auth.uid()
        )
    );

-- Política para permitir que usuários editem seu próprio feedback
CREATE POLICY "Users can update their own feedback" ON lead_feedback
    FOR UPDATE USING (user_id = auth.uid());

-- Política para permitir que usuários deletem seu próprio feedback
CREATE POLICY "Users can delete their own feedback" ON lead_feedback
    FOR DELETE USING (user_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_lead_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lead_feedback_updated_at
    BEFORE UPDATE ON lead_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_feedback_updated_at();

-- Comentários
COMMENT ON TABLE lead_feedback IS 'Feedback dos vendedores sobre os leads';
COMMENT ON COLUMN lead_feedback.feedback_type IS 'Tipo de feedback: positive ou negative';
COMMENT ON COLUMN lead_feedback.comment IS 'Comentário do feedback';

-- Adicionar coluna de feedback_summary ao pipeline_leads para facilitar consultas
ALTER TABLE pipeline_leads ADD COLUMN IF NOT EXISTS feedback_summary JSONB DEFAULT '{"positive": 0, "negative": 0, "total": 0}';

-- Função para atualizar o resumo de feedback
CREATE OR REPLACE FUNCTION update_lead_feedback_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar o resumo de feedback no lead
    UPDATE pipeline_leads 
    SET feedback_summary = (
        SELECT jsonb_build_object(
            'positive', COUNT(*) FILTER (WHERE feedback_type = 'positive'),
            'negative', COUNT(*) FILTER (WHERE feedback_type = 'negative'),
            'total', COUNT(*)
        )
        FROM lead_feedback 
        WHERE lead_id = COALESCE(NEW.lead_id, OLD.lead_id)
    )
    WHERE id = COALESCE(NEW.lead_id, OLD.lead_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers para manter o resumo atualizado
CREATE TRIGGER trigger_update_feedback_summary_insert
    AFTER INSERT ON lead_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_feedback_summary();

CREATE TRIGGER trigger_update_feedback_summary_update
    AFTER UPDATE ON lead_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_feedback_summary();

CREATE TRIGGER trigger_update_feedback_summary_delete
    AFTER DELETE ON lead_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_feedback_summary(); 
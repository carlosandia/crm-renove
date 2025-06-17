-- Criar tabela de feedback dos leads
CREATE TABLE IF NOT EXISTS lead_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_lead_feedback_lead_id ON lead_feedback(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_feedback_user_id ON lead_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_feedback_created_at ON lead_feedback(created_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE lead_feedback ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários autenticados vejam todos os feedbacks
CREATE POLICY "Users can view all feedback" ON lead_feedback
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir que usuários autenticados criem feedback
CREATE POLICY "Users can create feedback" ON lead_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para permitir que usuários editem seu próprio feedback
CREATE POLICY "Users can update their own feedback" ON lead_feedback
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para permitir que usuários deletem seu próprio feedback
CREATE POLICY "Users can delete their own feedback" ON lead_feedback
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
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
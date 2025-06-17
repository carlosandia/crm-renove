-- ============================================
-- SCRIPT PARA CRIAR SISTEMA DE FEEDBACK
-- Execute este SQL no painel do Supabase
-- ============================================

-- 1. Criar tabela de feedback dos leads
CREATE TABLE lead_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX idx_lead_feedback_lead_id ON lead_feedback(lead_id);
CREATE INDEX idx_lead_feedback_user_id ON lead_feedback(user_id);
CREATE INDEX idx_lead_feedback_created_at ON lead_feedback(created_at DESC);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE lead_feedback ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de acesso (permissivas para desenvolvimento)
CREATE POLICY "Users can view all feedback" ON lead_feedback
  FOR SELECT USING (true);

CREATE POLICY "Users can create feedback" ON lead_feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update feedback" ON lead_feedback
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete feedback" ON lead_feedback
  FOR DELETE USING (true);

-- 5. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_lead_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para updated_at
CREATE TRIGGER trigger_update_lead_feedback_updated_at
    BEFORE UPDATE ON lead_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_feedback_updated_at();

-- 7. Comentários para documentação
COMMENT ON TABLE lead_feedback IS 'Feedbacks dos vendedores sobre os leads';
COMMENT ON COLUMN lead_feedback.feedback_type IS 'Tipo: positive ou negative';
COMMENT ON COLUMN lead_feedback.comment IS 'Comentário do feedback';

-- ============================================
-- INSTRUÇÕES:
-- 1. Copie todo este código
-- 2. Acesse: https://supabase.com/dashboard
-- 3. Vá para seu projeto
-- 4. Clique em "SQL Editor"
-- 5. Cole este código
-- 6. Clique em "Run"
-- ============================================ 
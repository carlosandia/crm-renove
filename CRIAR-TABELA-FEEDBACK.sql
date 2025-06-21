-- ============================================
-- SCRIPT PARA CRIAR SISTEMA DE FEEDBACK
-- Execute este SQL no painel do Supabase
-- ============================================

-- 1. Criar tabela de feedback dos leads
CREATE TABLE IF NOT EXISTS lead_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL,
  feedback_type VARCHAR(10) NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
  comment TEXT NOT NULL,
  pipeline_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_lead_feedback_lead_id ON lead_feedback(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_feedback_user_id ON lead_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_feedback_pipeline_id ON lead_feedback(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_lead_feedback_created_at ON lead_feedback(created_at);

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

-- 8. Inserir alguns dados de exemplo (opcional - remover em produção)
INSERT INTO lead_feedback (lead_id, user_id, feedback_type, comment, pipeline_id) VALUES
('lead-001', (SELECT id FROM auth.users LIMIT 1), 'positive', 'Lead muito interessado no produto, respondeu rapidamente ao WhatsApp!', NULL),
('lead-002', (SELECT id FROM auth.users LIMIT 1), 'negative', 'Lead não respondeu após várias tentativas de contato por email e telefone.', NULL),
('lead-003', (SELECT id FROM auth.users LIMIT 1), 'positive', 'Excelente lead! Cliente já tem budget aprovado e timeline definido para implementação no próximo trimestre.', NULL)
ON CONFLICT (id) DO NOTHING;

-- 9. Confirmar criação
SELECT 'Tabela lead_feedback criada com sucesso!' as status;

-- ============================================
-- INSTRUÇÕES:
-- 1. Copie todo este código
-- 2. Acesse: https://supabase.com/dashboard
-- 3. Vá para seu projeto
-- 4. Clique em "SQL Editor"
-- 5. Cole este código
-- 6. Clique em "Run"
-- ============================================ 
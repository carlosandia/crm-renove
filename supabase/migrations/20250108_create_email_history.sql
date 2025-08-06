-- ========================================
-- MIGRATION: Criar tabela para histórico de emails
-- ========================================

-- Criar tabela email_history
CREATE TABLE email_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dados do email
  subject TEXT NOT NULL,
  to_email TEXT NOT NULL,
  from_email TEXT NOT NULL,
  message_body TEXT,
  
  -- Status e timestamps
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_message TEXT,
  
  -- Relacionamentos
  lead_id UUID,
  pipeline_id UUID,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE SET NULL,
  FOREIGN KEY (lead_id) REFERENCES pipeline_leads(id) ON DELETE SET NULL
);

-- Índices para performance
CREATE INDEX idx_email_history_tenant_id ON email_history(tenant_id);
CREATE INDEX idx_email_history_user_id ON email_history(user_id);
CREATE INDEX idx_email_history_pipeline_id ON email_history(pipeline_id);
CREATE INDEX idx_email_history_lead_id ON email_history(lead_id);
CREATE INDEX idx_email_history_sent_at ON email_history(sent_at DESC);
CREATE INDEX idx_email_history_status ON email_history(status);

-- RLS (Row Level Security)
ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas emails do seu tenant
CREATE POLICY "email_history_tenant_isolation" ON email_history
  FOR ALL USING (
    tenant_id = (
      SELECT user_metadata->>'tenant_id'::UUID 
      FROM auth.users 
      WHERE id = auth.uid()
    )
  );

-- Política para inserção (usuários podem inserir apenas no seu tenant)
CREATE POLICY "email_history_insert_own_tenant" ON email_history
  FOR INSERT WITH CHECK (
    tenant_id = (
      SELECT user_metadata->>'tenant_id'::UUID 
      FROM auth.users 
      WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Trigger para updated_at
CREATE TRIGGER update_email_history_updated_at
  BEFORE UPDATE ON email_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE email_history IS 'Histórico de todos os emails enviados através do sistema';
COMMENT ON COLUMN email_history.subject IS 'Assunto do email';
COMMENT ON COLUMN email_history.to_email IS 'Destinatário do email';
COMMENT ON COLUMN email_history.from_email IS 'Remetente do email';
COMMENT ON COLUMN email_history.status IS 'Status do envio: sent, failed, pending';
COMMENT ON COLUMN email_history.sent_at IS 'Data e hora do envio';
COMMENT ON COLUMN email_history.pipeline_id IS 'Pipeline associado ao email (opcional)';
COMMENT ON COLUMN email_history.lead_id IS 'Lead associado ao email (opcional)';
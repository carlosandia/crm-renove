-- =====================================================
-- MIGRAÇÃO: SISTEMA DE INTEGRAÇÃO DE E-MAIL PESSOAL
-- Data: 2025-01-27 12:00:00
-- Descrição: Implementação completa do sistema de e-mail pessoal
-- =====================================================

-- 1. TABELA DE INTEGRAÇÕES DE E-MAIL DOS USUÁRIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_email_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Configurações SMTP
  smtp_host VARCHAR(255) NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_secure BOOLEAN NOT NULL DEFAULT true,
  smtp_user VARCHAR(255) NOT NULL,
  smtp_password TEXT NOT NULL, -- Será criptografado no backend
  
  -- Informações do remetente
  from_name VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  
  -- Configurações
  provider VARCHAR(50), -- gmail, outlook, yahoo, etc.
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_tested_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  UNIQUE(user_id, from_email),
  CHECK (smtp_port > 0 AND smtp_port <= 65535),
  CHECK (from_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 2. TABELA DE HISTÓRICO DE E-MAILS ENVIADOS
-- =====================================================

CREATE TABLE IF NOT EXISTS email_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES pipeline_leads(id) ON DELETE SET NULL,
  integration_id UUID REFERENCES user_email_integrations(id) ON DELETE CASCADE,
  
  -- Dados do e-mail
  to_email VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Status do envio
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, failed, bounced
  error_message TEXT,
  message_id VARCHAR(255), -- ID do provedor de e-mail
  
  -- Tracking (opcional)
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  
  -- Auditoria
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  CHECK (to_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CHECK (from_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 3. TABELA DE ATIVIDADES DOS LEADS (se não existir)
-- =====================================================

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Dados da atividade
  activity_type VARCHAR(50) NOT NULL, -- email_sent, call_made, meeting_scheduled, etc.
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices
  CHECK (activity_type IN ('email_sent', 'call_made', 'meeting_scheduled', 'note_added', 'status_changed', 'follow_up_created'))
);

-- 4. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para user_email_integrations
CREATE INDEX IF NOT EXISTS idx_user_email_integrations_user_id ON user_email_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_email_integrations_active ON user_email_integrations(user_id, is_active) WHERE is_active = true;

-- Índices para email_history
CREATE INDEX IF NOT EXISTS idx_email_history_user_id ON email_history(user_id);
CREATE INDEX IF NOT EXISTS idx_email_history_lead_id ON email_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_history_status ON email_history(status);
CREATE INDEX IF NOT EXISTS idx_email_history_sent_at ON email_history(sent_at DESC);

-- Índices para lead_activities
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_user_id ON lead_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);

-- 5. RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS
ALTER TABLE user_email_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- Políticas para user_email_integrations
CREATE POLICY "Users can view their own email integrations"
  ON user_email_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email integrations"
  ON user_email_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email integrations"
  ON user_email_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email integrations"
  ON user_email_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para email_history
CREATE POLICY "Users can view their own email history"
  ON email_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email history"
  ON email_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Políticas para lead_activities
CREATE POLICY "Users can view lead activities from their tenant"
  ON lead_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'tenant_id' IS NOT NULL
    )
  );

CREATE POLICY "Users can insert lead activities"
  ON lead_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. TRIGGERS PARA AUDITORIA
-- =====================================================

-- Trigger para updated_at em user_email_integrations
CREATE OR REPLACE FUNCTION update_user_email_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_email_integrations_updated_at
  BEFORE UPDATE ON user_email_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_email_integrations_updated_at();

-- 7. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE user_email_integrations IS 'Configurações de e-mail pessoal dos usuários para envio direto da pipeline';
COMMENT ON TABLE email_history IS 'Histórico de todos os e-mails enviados através do sistema';
COMMENT ON TABLE lead_activities IS 'Registro de atividades realizadas nos leads (e-mails, ligações, etc.)';

COMMENT ON COLUMN user_email_integrations.smtp_password IS 'Senha SMTP criptografada - nunca armazenar em texto plano';
COMMENT ON COLUMN email_history.message_id IS 'ID único do provedor de e-mail para tracking';
COMMENT ON COLUMN lead_activities.metadata IS 'Dados adicionais da atividade em formato JSON';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- ===================================================== 
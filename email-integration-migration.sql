-- ========================================
-- MIGRAÇÃO: Sistema de Integração de E-mail Pessoal
-- Data: 27/01/2025
-- Descrição: Tabelas e funções para sistema de e-mail pessoal integrado ao CRM
-- ========================================

-- 1. Tabela de integrações de e-mail dos usuários
CREATE TABLE IF NOT EXISTS user_email_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_username VARCHAR(255) NOT NULL,
    smtp_password_encrypted TEXT NOT NULL, -- Senha criptografada
    use_tls BOOLEAN DEFAULT true,
    use_ssl BOOLEAN DEFAULT false,
    provider VARCHAR(50), -- gmail, outlook, yahoo, etc.
    is_active BOOLEAN DEFAULT true,
    last_tested_at TIMESTAMPTZ,
    test_status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed
    test_error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, email_address)
);

-- 2. Tabela de histórico de e-mails enviados
CREATE TABLE IF NOT EXISTS email_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    integration_id UUID NOT NULL REFERENCES user_email_integrations(id) ON DELETE CASCADE,
    lead_id UUID, -- Pode ser NULL se não for relacionado a um lead
    pipeline_id UUID, -- Pode ser NULL
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    message_text TEXT,
    message_html TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, bounced
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de atividades dos leads (para tracking)
CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    pipeline_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- email_sent, email_opened, email_clicked, call_made, etc.
    activity_description TEXT,
    metadata JSONB, -- Dados adicionais específicos da atividade
    email_history_id UUID REFERENCES email_history(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- ÍNDICES PARA PERFORMANCE
-- ========================================

-- Índices para user_email_integrations
CREATE INDEX IF NOT EXISTS idx_user_email_integrations_user_id ON user_email_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_email_integrations_tenant_id ON user_email_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_email_integrations_active ON user_email_integrations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_email_integrations_email ON user_email_integrations(email_address);

-- Índices para email_history
CREATE INDEX IF NOT EXISTS idx_email_history_user_id ON email_history(user_id);
CREATE INDEX IF NOT EXISTS idx_email_history_tenant_id ON email_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_history_integration_id ON email_history(integration_id);
CREATE INDEX IF NOT EXISTS idx_email_history_lead_id ON email_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_history_pipeline_id ON email_history(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_email_history_status ON email_history(status);
CREATE INDEX IF NOT EXISTS idx_email_history_sent_at ON email_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_history_created_at ON email_history(created_at);

-- Índices para lead_activities
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_pipeline_id ON lead_activities(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_user_id ON lead_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_tenant_id ON lead_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_activities_email_history_id ON lead_activities(email_history_id);

-- ========================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ========================================

-- user_email_integrations
ALTER TABLE user_email_integrations ENABLE ROW LEVEL SECURITY;

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

-- email_history
ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email history" 
ON email_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email history" 
ON email_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email history" 
ON email_history FOR UPDATE 
USING (auth.uid() = user_id);

-- lead_activities
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lead activities from their tenant" 
ON lead_activities FOR SELECT 
USING (
    tenant_id IN (
        SELECT u.tenant_id 
        FROM users u 
        WHERE u.id = auth.uid()
    )
);

CREATE POLICY "Users can insert lead activities" 
ON lead_activities FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lead activities" 
ON lead_activities FOR UPDATE 
USING (auth.uid() = user_id);

-- ========================================
-- TRIGGERS PARA UPDATED_AT
-- ========================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualização automática de updated_at
CREATE TRIGGER update_user_email_integrations_updated_at 
    BEFORE UPDATE ON user_email_integrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_history_updated_at 
    BEFORE UPDATE ON email_history 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- FUNÇÕES DE CRIPTOGRAFIA (PLACEHOLDER)
-- ========================================

-- Função para criptografar senhas (placeholder - será implementada no backend)
CREATE OR REPLACE FUNCTION encrypt_smtp_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Esta função será implementada no backend com criptografia real
    -- Por enquanto, retorna o valor como está (será melhorado)
    RETURN password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para descriptografar senhas (placeholder - será implementada no backend)
CREATE OR REPLACE FUNCTION decrypt_smtp_password(encrypted_password TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Esta função será implementada no backend com descriptografia real
    -- Por enquanto, retorna o valor como está (será melhorado)
    RETURN encrypted_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- COMENTÁRIOS DAS TABELAS
-- ========================================

COMMENT ON TABLE user_email_integrations IS 'Configurações de e-mail pessoal dos usuários para envio via SMTP';
COMMENT ON TABLE email_history IS 'Histórico de todos os e-mails enviados através do sistema';
COMMENT ON TABLE lead_activities IS 'Registro de atividades dos leads incluindo e-mails enviados';

COMMENT ON COLUMN user_email_integrations.smtp_password_encrypted IS 'Senha SMTP criptografada para segurança';
COMMENT ON COLUMN user_email_integrations.test_status IS 'Status do último teste de conexão: pending, success, failed';
COMMENT ON COLUMN email_history.status IS 'Status do e-mail: pending, sent, failed, bounced';
COMMENT ON COLUMN lead_activities.activity_type IS 'Tipo de atividade: email_sent, email_opened, email_clicked, call_made, etc.';
COMMENT ON COLUMN lead_activities.metadata IS 'Dados adicionais em formato JSON específicos da atividade';

-- ========================================
-- FIM DA MIGRAÇÃO
-- ========================================

-- Verificar se as tabelas foram criadas corretamente
DO $$
BEGIN
    -- Verificar user_email_integrations
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_email_integrations') THEN
        RAISE NOTICE '✅ Tabela user_email_integrations criada com sucesso';
    ELSE
        RAISE EXCEPTION '❌ Falha ao criar tabela user_email_integrations';
    END IF;
    
    -- Verificar email_history
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_history') THEN
        RAISE NOTICE '✅ Tabela email_history criada com sucesso';
    ELSE
        RAISE EXCEPTION '❌ Falha ao criar tabela email_history';
    END IF;
    
    -- Verificar lead_activities
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lead_activities') THEN
        RAISE NOTICE '✅ Tabela lead_activities criada com sucesso';
    ELSE
        RAISE EXCEPTION '❌ Falha ao criar tabela lead_activities';
    END IF;
    
    RAISE NOTICE '🎉 Migração do sistema de e-mail pessoal concluída com sucesso!';
    RAISE NOTICE '📧 Sistema pronto para configuração e uso de e-mails pessoais';
    RAISE NOTICE '🔐 Lembre-se de configurar EMAIL_ENCRYPTION_KEY no .env do backend';
END $$;
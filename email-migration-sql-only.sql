-- ============================================================================
-- MIGRAÇÃO: Sistema de Integração de E-mail Pessoal
-- Data: 2025-01-27
-- Apenas comandos SQL puros para execução no Supabase SQL Editor
-- ============================================================================

-- 1. Tabela para armazenar configurações de e-mail dos usuários
CREATE TABLE IF NOT EXISTS user_email_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_secure BOOLEAN NOT NULL DEFAULT false,
    smtp_username VARCHAR(255) NOT NULL,
    smtp_password_encrypted TEXT NOT NULL,
    display_name VARCHAR(255),
    signature TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_test_at TIMESTAMP WITH TIME ZONE,
    test_status VARCHAR(20) DEFAULT 'pending',
    test_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, email_address),
    CONSTRAINT valid_test_status CHECK (test_status IN ('pending', 'success', 'failed'))
);

-- 2. Tabela para histórico de e-mails enviados
CREATE TABLE IF NOT EXISTS email_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    email_integration_id UUID NOT NULL REFERENCES user_email_integrations(id) ON DELETE CASCADE,
    lead_master_id UUID REFERENCES leads_master(id) ON DELETE SET NULL,
    pipeline_lead_id UUID REFERENCES pipeline_leads(id) ON DELETE SET NULL,
    from_email VARCHAR(255) NOT NULL,
    to_email VARCHAR(255) NOT NULL,
    cc_email TEXT,
    bcc_email TEXT,
    subject VARCHAR(500) NOT NULL,
    body_text TEXT,
    body_html TEXT,
    message_id VARCHAR(255),
    thread_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_email_status CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'delivered', 'opened', 'clicked'))
);

-- 3. Adicionar colunas na tabela lead_activities se não existirem
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_activities' 
        AND column_name = 'email_history_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE lead_activities 
        ADD COLUMN email_history_id UUID REFERENCES email_history(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_activities' 
        AND column_name = 'activity_data'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE lead_activities 
        ADD COLUMN activity_data JSONB;
    END IF;
END $$;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_email_integrations_user_id ON user_email_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_email_integrations_tenant_id ON user_email_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_email_integrations_active ON user_email_integrations(user_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_email_history_user_id ON email_history(user_id);
CREATE INDEX IF NOT EXISTS idx_email_history_tenant_id ON email_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_history_lead_master ON email_history(lead_master_id) WHERE lead_master_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_history_pipeline_lead ON email_history(pipeline_lead_id) WHERE pipeline_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_history_sent_at ON email_history(sent_at) WHERE sent_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_history_status ON email_history(status);

CREATE INDEX IF NOT EXISTS idx_lead_activities_email_history ON lead_activities(email_history_id) WHERE email_history_id IS NOT NULL;

-- 5. Criar função e triggers para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_email_integrations_updated_at ON user_email_integrations;
CREATE TRIGGER update_user_email_integrations_updated_at
    BEFORE UPDATE ON user_email_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_history_updated_at ON email_history;
CREATE TRIGGER update_email_history_updated_at
    BEFORE UPDATE ON email_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Configurar RLS (Row Level Security)
ALTER TABLE user_email_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_email_integrations
DROP POLICY IF EXISTS "user_email_integrations_tenant_isolation" ON user_email_integrations;
CREATE POLICY "user_email_integrations_tenant_isolation" ON user_email_integrations
    USING (
        tenant_id::text = current_setting('app.current_tenant', true) OR
        user_id = auth.uid()
    );

DROP POLICY IF EXISTS "user_email_integrations_user_access" ON user_email_integrations;
CREATE POLICY "user_email_integrations_user_access" ON user_email_integrations
    FOR ALL USING (user_id = auth.uid());

-- Políticas RLS para email_history
DROP POLICY IF EXISTS "email_history_tenant_isolation" ON email_history;
CREATE POLICY "email_history_tenant_isolation" ON email_history
    USING (
        tenant_id::text = current_setting('app.current_tenant', true) OR
        user_id = auth.uid()
    );

DROP POLICY IF EXISTS "email_history_user_access" ON email_history;
CREATE POLICY "email_history_user_access" ON email_history
    FOR ALL USING (user_id = auth.uid());

-- 7. Comentários para documentação
COMMENT ON TABLE user_email_integrations IS 'Configurações de integração de e-mail pessoal dos usuários';
COMMENT ON TABLE email_history IS 'Histórico completo de e-mails enviados através do sistema';
COMMENT ON COLUMN user_email_integrations.smtp_password_encrypted IS 'Senha SMTP criptografada com AES-256-CBC';
COMMENT ON COLUMN email_history.lead_master_id IS 'Referência ao lead principal (leads_master)';
COMMENT ON COLUMN email_history.pipeline_lead_id IS 'Referência ao lead no pipeline (pipeline_leads)';

-- 8. Verificação final
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_email_integrations', 'email_history')
ORDER BY tablename; 
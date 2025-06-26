-- ============================================================================
-- MIGRAÇÃO FINAL: Sistema de Integração de E-mail Pessoal
-- APENAS SQL PURO - SEM JAVASCRIPT
-- ============================================================================

-- 1. Tabela para configurações de e-mail dos usuários
CREATE TABLE user_email_integrations (
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Constraints para user_email_integrations
ALTER TABLE user_email_integrations 
ADD CONSTRAINT unique_user_email UNIQUE(user_id, email_address);

ALTER TABLE user_email_integrations 
ADD CONSTRAINT valid_test_status CHECK (test_status IN ('pending', 'success', 'failed'));

-- 3. Tabela para histórico de e-mails
CREATE TABLE email_history (
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Constraints para email_history
ALTER TABLE email_history 
ADD CONSTRAINT valid_email_status CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'delivered', 'opened', 'clicked'));

-- 5. Verificar se lead_activities existe e adicionar colunas
DO $$
BEGIN
    -- Verificar se a tabela lead_activities existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_activities' AND table_schema = 'public') THEN
        -- Adicionar coluna email_history_id se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lead_activities' 
            AND column_name = 'email_history_id'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE lead_activities 
            ADD COLUMN email_history_id UUID;
        END IF;
        
        -- Adicionar coluna activity_data se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lead_activities' 
            AND column_name = 'activity_data'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE lead_activities 
            ADD COLUMN activity_data JSONB;
        END IF;
        
        -- Adicionar foreign key constraint para email_history_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_lead_activities_email_history'
            AND table_name = 'lead_activities'
        ) THEN
            ALTER TABLE lead_activities 
            ADD CONSTRAINT fk_lead_activities_email_history 
            FOREIGN KEY (email_history_id) REFERENCES email_history(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 6. Criar índices para performance
CREATE INDEX idx_user_email_integrations_user_id ON user_email_integrations(user_id);
CREATE INDEX idx_user_email_integrations_tenant_id ON user_email_integrations(tenant_id);
CREATE INDEX idx_user_email_integrations_active ON user_email_integrations(user_id, is_active) WHERE is_active = true;

CREATE INDEX idx_email_history_user_id ON email_history(user_id);
CREATE INDEX idx_email_history_tenant_id ON email_history(tenant_id);
CREATE INDEX idx_email_history_lead_master ON email_history(lead_master_id) WHERE lead_master_id IS NOT NULL;
CREATE INDEX idx_email_history_pipeline_lead ON email_history(pipeline_lead_id) WHERE pipeline_lead_id IS NOT NULL;
CREATE INDEX idx_email_history_sent_at ON email_history(sent_at) WHERE sent_at IS NOT NULL;
CREATE INDEX idx_email_history_status ON email_history(status);

-- 7. Criar função para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar triggers para updated_at
CREATE TRIGGER update_user_email_integrations_updated_at
    BEFORE UPDATE ON user_email_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_history_updated_at
    BEFORE UPDATE ON email_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Habilitar RLS
ALTER TABLE user_email_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;

-- 10. Criar políticas RLS para user_email_integrations
CREATE POLICY user_email_integrations_policy ON user_email_integrations
    FOR ALL USING (user_id = auth.uid());

-- 11. Criar políticas RLS para email_history
CREATE POLICY email_history_policy ON email_history
    FOR ALL USING (user_id = auth.uid());

-- 12. Adicionar comentários
COMMENT ON TABLE user_email_integrations IS 'Configurações de integração de e-mail pessoal dos usuários';
COMMENT ON TABLE email_history IS 'Histórico completo de e-mails enviados através do sistema';

-- 13. Verificação final - mostrar tabelas criadas
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_email_integrations', 'email_history')
ORDER BY table_name; 
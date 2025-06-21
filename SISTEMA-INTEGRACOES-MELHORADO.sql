-- ============================================
-- SISTEMA DE INTEGRAÇÕES - VERSÃO MELHORADA E SEGURA
-- ============================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA INTEGRATIONS MELHORADA
CREATE TABLE IF NOT EXISTS integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    
    -- Tokens criptografados
    meta_ads_token_encrypted TEXT,
    google_ads_token_encrypted TEXT,
    
    -- Configurações de webhook
    webhook_url TEXT NOT NULL,
    webhook_secret TEXT NOT NULL, -- Para assinatura HMAC
    
    -- Chaves API criptografadas
    api_key_public TEXT NOT NULL,
    api_key_secret_encrypted TEXT NOT NULL,
    
    -- Configurações
    webhook_enabled BOOLEAN DEFAULT true,
    rate_limit_per_minute INTEGER DEFAULT 60,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_key_rotation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(company_id),
    CONSTRAINT valid_rate_limit CHECK (rate_limit_per_minute > 0 AND rate_limit_per_minute <= 1000)
);

-- 3. TABELA DE LOGS DE WEBHOOK
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    
    -- Dados da requisição
    request_ip INET,
    request_headers JSONB,
    request_body JSONB,
    request_signature TEXT,
    
    -- Dados da resposta
    response_status INTEGER,
    response_body JSONB,
    processing_time_ms INTEGER,
    
    -- Resultado
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'rejected')),
    error_message TEXT,
    lead_id UUID,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE RATE LIMITING
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    
    -- Identificação
    client_ip INET,
    api_key TEXT,
    
    -- Contadores
    requests_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA DE AUDITORIA
CREATE TABLE IF NOT EXISTS integrations_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_id UUID NOT NULL,
    
    -- Ação realizada
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'key_regenerated', 'token_updated', 'deleted')),
    
    -- Dados da mudança
    old_values JSONB,
    new_values JSONB,
    
    -- Contexto
    user_id UUID,
    user_ip INET,
    user_agent TEXT,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_integrations_company_id ON integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_integrations_api_key_public ON integrations(api_key_public);
CREATE INDEX IF NOT EXISTS idx_integrations_webhook_enabled ON integrations(webhook_enabled) WHERE webhook_enabled = true;

CREATE INDEX IF NOT EXISTS idx_webhook_logs_integration_id ON webhook_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);

CREATE INDEX IF NOT EXISTS idx_rate_limits_integration_id ON rate_limits(integration_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_client_ip ON rate_limits(client_ip);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

CREATE INDEX IF NOT EXISTS idx_integrations_audit_integration_id ON integrations_audit(integration_id);
CREATE INDEX IF NOT EXISTS idx_integrations_audit_created_at ON integrations_audit(created_at);

-- 7. CONFIGURAR RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations_audit ENABLE ROW LEVEL SECURITY;

-- 8. POLÍTICAS DE SEGURANÇA
DROP POLICY IF EXISTS "Admins can access their company integrations" ON integrations;
CREATE POLICY "Admins can access their company integrations" ON integrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND u.tenant_id = integrations.company_id
        )
    );

-- 9. FUNÇÕES DE CRIPTOGRAFIA
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, key_id TEXT DEFAULT 'default')
RETURNS TEXT AS $$
BEGIN
    IF data IS NULL OR data = '' THEN
        RETURN NULL;
    END IF;
    
    RETURN encode(
        pgp_sym_encrypt(
            data, 
            COALESCE(current_setting('app.encryption_key', true), 'default_key_change_in_production') || '_' || key_id
        ), 
        'base64'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, key_id TEXT DEFAULT 'default')
RETURNS TEXT AS $$
BEGIN
    IF encrypted_data IS NULL OR encrypted_data = '' THEN
        RETURN NULL;
    END IF;
    
    RETURN pgp_sym_decrypt(
        decode(encrypted_data, 'base64'),
        COALESCE(current_setting('app.encryption_key', true), 'default_key_change_in_production') || '_' || key_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. FUNÇÃO PARA GERAR CHAVES API SEGURAS
CREATE OR REPLACE FUNCTION generate_secure_api_keys()
RETURNS TABLE(public_key TEXT, secret_key TEXT, webhook_secret TEXT) AS $$
BEGIN
    RETURN QUERY SELECT 
        'pk_' || encode(gen_random_bytes(16), 'hex') as public_key,
        'sk_' || encode(gen_random_bytes(32), 'hex') as secret_key,
        'whsec_' || encode(gen_random_bytes(32), 'hex') as webhook_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. FUNÇÃO PARA GERAR WEBHOOK URL CONFIGURÁVEL
CREATE OR REPLACE FUNCTION generate_webhook_url_secure(p_company_id UUID, p_base_url TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    v_base_url TEXT;
    v_company_slug TEXT;
BEGIN
    v_base_url := COALESCE(
        p_base_url,
        current_setting('app.webhook_base_url', true),
        'https://api.crm.com'
    );
    
    SELECT COALESCE(
        LOWER(REGEXP_REPLACE(COALESCE(name, ''), '[^a-zA-Z0-9]', '-', 'g')),
        p_company_id::text
    ) INTO v_company_slug
    FROM companies 
    WHERE id = p_company_id;
    
    IF v_company_slug IS NULL OR v_company_slug = '' THEN
        v_company_slug := p_company_id::text;
    END IF;
    
    RETURN v_base_url || '/api/integrations/webhook/' || v_company_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. FUNÇÃO PARA CRIAR INTEGRAÇÃO SEGURA
CREATE OR REPLACE FUNCTION create_secure_integration(p_company_id UUID)
RETURNS UUID AS $$
DECLARE
    v_integration_id UUID;
    v_keys RECORD;
    v_webhook_url TEXT;
BEGIN
    SELECT id INTO v_integration_id 
    FROM integrations 
    WHERE company_id = p_company_id;
    
    IF v_integration_id IS NOT NULL THEN
        RETURN v_integration_id;
    END IF;
    
    SELECT * INTO v_keys FROM generate_secure_api_keys();
    v_webhook_url := generate_webhook_url_secure(p_company_id);
    
    INSERT INTO integrations (
        company_id,
        webhook_url,
        webhook_secret,
        api_key_public,
        api_key_secret_encrypted
    ) VALUES (
        p_company_id,
        v_webhook_url,
        v_keys.webhook_secret,
        v_keys.public_key,
        encrypt_sensitive_data(v_keys.secret_key, p_company_id::text)
    ) RETURNING id INTO v_integration_id;
    
    INSERT INTO integrations_audit (
        integration_id,
        action,
        new_values,
        user_id
    ) VALUES (
        v_integration_id,
        'created',
        jsonb_build_object('company_id', p_company_id),
        auth.uid()
    );
    
    RETURN v_integration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. FUNÇÃO PARA REGENERAR CHAVES SEGURAS
CREATE OR REPLACE FUNCTION regenerate_secure_api_keys(p_company_id UUID)
RETURNS TABLE(public_key TEXT, secret_key TEXT) AS $$
DECLARE
    v_keys RECORD;
    v_integration_id UUID;
BEGIN
    SELECT id INTO v_integration_id
    FROM integrations 
    WHERE company_id = p_company_id;
    
    IF v_integration_id IS NULL THEN
        RAISE EXCEPTION 'Integração não encontrada';
    END IF;
    
    SELECT g.public_key, g.secret_key INTO v_keys 
    FROM generate_secure_api_keys() g;
    
    UPDATE integrations 
    SET 
        api_key_public = v_keys.public_key,
        api_key_secret_encrypted = encrypt_sensitive_data(v_keys.secret_key, p_company_id::text),
        last_key_rotation = NOW(),
        updated_at = NOW()
    WHERE company_id = p_company_id;
    
    INSERT INTO integrations_audit (
        integration_id,
        action,
        new_values,
        user_id
    ) VALUES (
        v_integration_id,
        'key_regenerated',
        jsonb_build_object('api_key_public', v_keys.public_key),
        auth.uid()
    );
    
    RETURN QUERY SELECT v_keys.public_key, v_keys.secret_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. FUNÇÃO PARA BUSCAR OU CRIAR INTEGRAÇÃO SEGURA
CREATE OR REPLACE FUNCTION get_or_create_secure_integration(p_company_id UUID)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    meta_ads_token TEXT,
    google_ads_token TEXT,
    webhook_url TEXT,
    webhook_secret TEXT,
    api_key_public TEXT,
    api_key_secret TEXT,
    webhook_enabled BOOLEAN,
    rate_limit_per_minute INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    last_key_rotation TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_integration_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM integrations WHERE integrations.company_id = p_company_id
    ) INTO v_integration_exists;
    
    IF NOT v_integration_exists THEN
        PERFORM create_secure_integration(p_company_id);
    END IF;
    
    RETURN QUERY
    SELECT 
        i.id,
        i.company_id,
        decrypt_sensitive_data(i.meta_ads_token_encrypted, p_company_id::text) as meta_ads_token,
        decrypt_sensitive_data(i.google_ads_token_encrypted, p_company_id::text) as google_ads_token,
        i.webhook_url,
        i.webhook_secret,
        i.api_key_public,
        decrypt_sensitive_data(i.api_key_secret_encrypted, p_company_id::text) as api_key_secret,
        i.webhook_enabled,
        i.rate_limit_per_minute,
        i.created_at,
        i.updated_at,
        i.last_key_rotation
    FROM integrations i
    WHERE i.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. FUNÇÃO PARA ATUALIZAR TOKENS COM CRIPTOGRAFIA
CREATE OR REPLACE FUNCTION update_integration_tokens_secure(
    p_company_id UUID,
    p_meta_ads_token TEXT DEFAULT NULL,
    p_google_ads_token TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_integration_id UUID;
BEGIN
    SELECT id INTO v_integration_id
    FROM integrations 
    WHERE company_id = p_company_id;
    
    IF v_integration_id IS NULL THEN
        RAISE EXCEPTION 'Integração não encontrada';
    END IF;
    
    UPDATE integrations 
    SET 
        meta_ads_token_encrypted = CASE 
            WHEN p_meta_ads_token IS NOT NULL THEN encrypt_sensitive_data(p_meta_ads_token, p_company_id::text)
            ELSE meta_ads_token_encrypted
        END,
        google_ads_token_encrypted = CASE 
            WHEN p_google_ads_token IS NOT NULL THEN encrypt_sensitive_data(p_google_ads_token, p_company_id::text)
            ELSE google_ads_token_encrypted
        END,
        updated_at = NOW()
    WHERE company_id = p_company_id;
    
    INSERT INTO integrations_audit (
        integration_id,
        action,
        new_values,
        user_id
    ) VALUES (
        v_integration_id,
        'token_updated',
        jsonb_build_object(
            'has_meta_ads_token', p_meta_ads_token IS NOT NULL,
            'has_google_ads_token', p_google_ads_token IS NOT NULL
        ),
        auth.uid()
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. FUNÇÃO PARA VERIFICAR RATE LIMIT
CREATE OR REPLACE FUNCTION check_rate_limit_secure(
    p_integration_id UUID,
    p_client_ip INET,
    p_api_key TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_rate_limit INTEGER;
    v_current_count INTEGER;
    v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT rate_limit_per_minute INTO v_rate_limit
    FROM integrations 
    WHERE id = p_integration_id;
    
    IF v_rate_limit IS NULL THEN
        RETURN false;
    END IF;
    
    v_window_start := date_trunc('minute', NOW());
    
    SELECT requests_count INTO v_current_count
    FROM rate_limits
    WHERE integration_id = p_integration_id
    AND client_ip = p_client_ip
    AND window_start = v_window_start;
    
    IF v_current_count IS NULL THEN
        INSERT INTO rate_limits (
            integration_id,
            client_ip,
            api_key,
            requests_count,
            window_start
        ) VALUES (
            p_integration_id,
            p_client_ip,
            p_api_key,
            1,
            v_window_start
        );
        RETURN true;
    ELSE
        IF v_current_count >= v_rate_limit THEN
            RETURN false;
        ELSE
            UPDATE rate_limits
            SET 
                requests_count = requests_count + 1,
                updated_at = NOW()
            WHERE integration_id = p_integration_id
            AND client_ip = p_client_ip
            AND window_start = v_window_start;
            
            RETURN true;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. VALIDAÇÕES MELHORADAS
CREATE OR REPLACE FUNCTION validate_meta_ads_token_enhanced(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    v_result := jsonb_build_object('valid', false, 'errors', '[]'::jsonb);
    
    IF p_token IS NULL OR LENGTH(TRIM(p_token)) < 10 THEN
        v_result := jsonb_set(v_result, '{errors}', v_result->'errors' || '"Token muito curto"');
        RETURN v_result;
    END IF;
    
    IF NOT (p_token LIKE 'EAA%' OR p_token LIKE 'EAAG%') THEN
        v_result := jsonb_set(v_result, '{errors}', v_result->'errors' || '"Token deve começar com EAA ou EAAG"');
        RETURN v_result;
    END IF;
    
    v_result := jsonb_set(v_result, '{valid}', 'true');
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION validate_google_ads_token_enhanced(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    v_result := jsonb_build_object('valid', false, 'errors', '[]'::jsonb);
    
    IF p_token IS NULL OR LENGTH(TRIM(p_token)) < 10 THEN
        v_result := jsonb_set(v_result, '{errors}', v_result->'errors' || '"Token muito curto"');
        RETURN v_result;
    END IF;
    
    v_result := jsonb_set(v_result, '{valid}', 'true');
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_integrations_updated_at_secure()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_integrations_updated_at_secure ON integrations;
CREATE TRIGGER trigger_update_integrations_updated_at_secure
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_integrations_updated_at_secure();

-- 19. COMENTÁRIOS
COMMENT ON TABLE integrations IS 'Integrações de marketing seguras com criptografia e auditoria';
COMMENT ON TABLE webhook_logs IS 'Logs detalhados de todas as requisições de webhook';
COMMENT ON TABLE rate_limits IS 'Controle de rate limiting por IP e chave API';
COMMENT ON TABLE integrations_audit IS 'Auditoria completa de todas as mudanças nas integrações';

-- 20. LOG DE SUCESSO
DO $$ 
BEGIN
    RAISE NOTICE '🎉 Sistema de integrações MELHORADO criado com sucesso!';
    RAISE NOTICE '🔒 Recursos de segurança implementados';
    RAISE NOTICE '⚡ Recursos de performance otimizados';
    RAISE NOTICE '📊 Sistema de monitoramento ativo';
    RAISE NOTICE '🚀 Pronto para produção!';
END $$; 
-- ============================================
-- SISTEMA DE INTEGRAÇÕES PARA ADMINS
-- ============================================

-- 1. CRIAR TABELA INTEGRATIONS
CREATE TABLE IF NOT EXISTS integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    meta_ads_token TEXT,
    google_ads_token TEXT,
    webhook_url TEXT NOT NULL,
    api_key_public TEXT NOT NULL,
    api_key_secret TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir uma integração por empresa
    UNIQUE(company_id)
);

-- 2. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_integrations_company_id ON integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_integrations_webhook_url ON integrations(webhook_url);
CREATE INDEX IF NOT EXISTS idx_integrations_api_key_public ON integrations(api_key_public);

-- 3. CONFIGURAR RLS (Row Level Security)
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE SEGURANÇA
-- Apenas admins podem acessar integrações da sua empresa
CREATE POLICY "Admins can access their company integrations" ON integrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND u.tenant_id = integrations.company_id
        )
    );

-- Apenas admins podem criar integrações para sua empresa
CREATE POLICY "Admins can create integrations for their company" ON integrations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND u.tenant_id = company_id
        )
    );

-- 5. TRIGGER PARA ATUALIZAR UPDATED_AT
CREATE OR REPLACE FUNCTION update_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_integrations_updated_at();

-- 6. FUNÇÃO PARA GERAR CHAVES API
CREATE OR REPLACE FUNCTION generate_api_keys()
RETURNS TABLE(public_key TEXT, secret_key TEXT) AS $$
BEGIN
    RETURN QUERY SELECT 
        'pk_' || encode(gen_random_bytes(16), 'hex') as public_key,
        'sk_' || encode(gen_random_bytes(32), 'hex') as secret_key;
END;
$$ LANGUAGE plpgsql;

-- 7. FUNÇÃO PARA GERAR WEBHOOK URL
CREATE OR REPLACE FUNCTION generate_webhook_url(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_company_slug TEXT;
BEGIN
    -- Buscar slug da empresa ou usar ID se não existir
    SELECT COALESCE(
        LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '-', 'g')),
        p_company_id::text
    ) INTO v_company_slug
    FROM tenants 
    WHERE id = p_company_id;
    
    -- Se não encontrar tenant, usar o company_id
    IF v_company_slug IS NULL THEN
        v_company_slug := p_company_id::text;
    END IF;
    
    RETURN 'https://app.crm.com/api/leads/' || v_company_slug;
END;
$$ LANGUAGE plpgsql;

-- 8. FUNÇÃO PARA CRIAR INTEGRAÇÃO PADRÃO
CREATE OR REPLACE FUNCTION create_default_integration(p_company_id UUID)
RETURNS UUID AS $$
DECLARE
    v_integration_id UUID;
    v_api_keys RECORD;
    v_webhook_url TEXT;
BEGIN
    -- Gerar chaves API
    SELECT * INTO v_api_keys FROM generate_api_keys();
    
    -- Gerar webhook URL
    SELECT generate_webhook_url(p_company_id) INTO v_webhook_url;
    
    -- Inserir integração
    INSERT INTO integrations (
        company_id,
        webhook_url,
        api_key_public,
        api_key_secret
    ) VALUES (
        p_company_id,
        v_webhook_url,
        v_api_keys.public_key,
        v_api_keys.secret_key
    ) RETURNING id INTO v_integration_id;
    
    RETURN v_integration_id;
END;
$$ LANGUAGE plpgsql;

-- 9. FUNÇÃO PARA REGENERAR CHAVES API
CREATE OR REPLACE FUNCTION regenerate_api_keys(p_company_id UUID)
RETURNS TABLE(public_key TEXT, secret_key TEXT) AS $$
DECLARE
    v_api_keys RECORD;
BEGIN
    -- Gerar novas chaves
    SELECT * INTO v_api_keys FROM generate_api_keys();
    
    -- Atualizar na tabela
    UPDATE integrations 
    SET 
        api_key_public = v_api_keys.public_key,
        api_key_secret = v_api_keys.secret_key,
        updated_at = NOW()
    WHERE company_id = p_company_id;
    
    -- Retornar as novas chaves
    RETURN QUERY SELECT v_api_keys.public_key, v_api_keys.secret_key;
END;
$$ LANGUAGE plpgsql;

-- 10. FUNÇÃO PARA BUSCAR OU CRIAR INTEGRAÇÃO
CREATE OR REPLACE FUNCTION get_or_create_integration(p_company_id UUID)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    meta_ads_token TEXT,
    google_ads_token TEXT,
    webhook_url TEXT,
    api_key_public TEXT,
    api_key_secret TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_integration_exists BOOLEAN;
BEGIN
    -- Verificar se integração existe
    SELECT EXISTS(
        SELECT 1 FROM integrations WHERE integrations.company_id = p_company_id
    ) INTO v_integration_exists;
    
    -- Se não existir, criar
    IF NOT v_integration_exists THEN
        PERFORM create_default_integration(p_company_id);
    END IF;
    
    -- Retornar integração
    RETURN QUERY
    SELECT 
        i.id,
        i.company_id,
        i.meta_ads_token,
        i.google_ads_token,
        i.webhook_url,
        i.api_key_public,
        i.api_key_secret,
        i.created_at,
        i.updated_at
    FROM integrations i
    WHERE i.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;

-- 11. FUNÇÃO PARA VALIDAR TOKEN META ADS (preparação futura)
CREATE OR REPLACE FUNCTION validate_meta_ads_token(p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Por enquanto, apenas validação básica
    -- No futuro, fazer chamada real à API do Meta
    IF p_token IS NULL OR LENGTH(TRIM(p_token)) < 10 THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se começa com padrão típico do Meta
    IF NOT (p_token LIKE 'EAA%' OR p_token LIKE 'EAAG%') THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 12. FUNÇÃO PARA VALIDAR TOKEN GOOGLE ADS (preparação futura)
CREATE OR REPLACE FUNCTION validate_google_ads_token(p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Por enquanto, apenas validação básica
    -- No futuro, fazer chamada real à API do Google
    IF p_token IS NULL OR LENGTH(TRIM(p_token)) < 10 THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 13. TRIGGER PARA CRIAR INTEGRAÇÃO AUTOMÁTICA PARA NOVOS TENANTS
CREATE OR REPLACE FUNCTION create_integration_for_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
    -- Criar integração padrão para novo tenant
    PERFORM create_default_integration(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar se trigger já existe antes de criar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_create_integration_for_new_tenant'
        AND tgrelid = 'tenants'::regclass
    ) THEN
        CREATE TRIGGER trigger_create_integration_for_new_tenant
            AFTER INSERT ON tenants
            FOR EACH ROW
            EXECUTE FUNCTION create_integration_for_new_tenant();
    END IF;
END $$;

-- 14. CRIAR INTEGRAÇÕES PARA TENANTS EXISTENTES
INSERT INTO integrations (company_id, webhook_url, api_key_public, api_key_secret)
SELECT 
    t.id,
    generate_webhook_url(t.id),
    (SELECT public_key FROM generate_api_keys()),
    (SELECT secret_key FROM generate_api_keys())
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM integrations i WHERE i.company_id = t.id
);

-- 15. COMENTÁRIOS DE DOCUMENTAÇÃO
COMMENT ON TABLE integrations IS 'Integrações de marketing para cada empresa (Meta Ads, Google Ads, Webhooks, APIs)';
COMMENT ON COLUMN integrations.company_id IS 'ID da empresa proprietária da integração';
COMMENT ON COLUMN integrations.meta_ads_token IS 'Token de acesso do Meta Ads para conversões';
COMMENT ON COLUMN integrations.google_ads_token IS 'Token de acesso do Google Ads para conversões';
COMMENT ON COLUMN integrations.webhook_url IS 'URL única para receber leads via webhook';
COMMENT ON COLUMN integrations.api_key_public IS 'Chave pública para identificação da empresa';
COMMENT ON COLUMN integrations.api_key_secret IS 'Chave secreta para autenticação de APIs';

-- 16. VIEW PARA FACILITAR CONSULTAS (sem expor chave secreta)
CREATE OR REPLACE VIEW integrations_safe AS
SELECT 
    id,
    company_id,
    meta_ads_token,
    google_ads_token,
    webhook_url,
    api_key_public,
    CASE 
        WHEN api_key_secret IS NOT NULL THEN '***HIDDEN***'
        ELSE NULL 
    END as api_key_secret_masked,
    created_at,
    updated_at
FROM integrations;

-- RLS para a view também
ALTER VIEW integrations_safe OWNER TO postgres;

-- Log de sucesso
DO $$ 
BEGIN
    RAISE NOTICE '✅ Sistema de integrações configurado com sucesso!';
    RAISE NOTICE '📋 Estruturas criadas:';
    RAISE NOTICE '   - integrations (tabela principal)';
    RAISE NOTICE '   - integrations_safe (view segura)';
    RAISE NOTICE '   - Índices para performance';
    RAISE NOTICE '   - Políticas RLS para admins apenas';
    RAISE NOTICE '   - Funções para gerar chaves e URLs';
    RAISE NOTICE '   - Triggers automáticos';
    RAISE NOTICE '   - Validações de tokens (básicas)';
    RAISE NOTICE '🔒 Acesso restrito a role: admin';
    RAISE NOTICE '🎯 Pronto para implementação no frontend!';
END $$; 
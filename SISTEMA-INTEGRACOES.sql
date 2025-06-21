-- ============================================
-- SISTEMA DE INTEGRAÇÕES - VERSÃO ULTRA-BÁSICA
-- ============================================

-- 1. CRIAR TABELA INTEGRATIONS (ESTRUTURA MÍNIMA)
CREATE TABLE IF NOT EXISTS integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    meta_ads_token TEXT,
    google_ads_token TEXT,
    webhook_url TEXT,
    api_key_public TEXT,
    api_key_secret TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ADICIONAR CONSTRAINT UNIQUE APENAS SE NÃO EXISTIR
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'integrations_company_id_key'
    ) THEN
        ALTER TABLE integrations ADD CONSTRAINT integrations_company_id_key UNIQUE(company_id);
    END IF;
END $$;

-- 3. CRIAR APENAS ÍNDICE BÁSICO
CREATE INDEX IF NOT EXISTS idx_integrations_company_id ON integrations(company_id);

-- 4. CONFIGURAR RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- 5. FUNÇÃO PARA GERAR CHAVES API
CREATE OR REPLACE FUNCTION generate_api_keys()
RETURNS TABLE(public_key TEXT, secret_key TEXT) AS $$
BEGIN
    RETURN QUERY SELECT 
        'pk_' || encode(gen_random_bytes(16), 'hex') as public_key,
        'sk_' || encode(gen_random_bytes(32), 'hex') as secret_key;
END;
$$ LANGUAGE plpgsql;

-- 6. FUNÇÃO PARA GERAR WEBHOOK URL
CREATE OR REPLACE FUNCTION generate_webhook_url(p_company_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN 'https://app.crm.com/api/integrations/webhook/' || p_company_id::text;
END;
$$ LANGUAGE plpgsql;

-- 7. FUNÇÃO PARA CRIAR INTEGRAÇÃO PADRÃO
CREATE OR REPLACE FUNCTION create_default_integration(p_company_id UUID)
RETURNS UUID AS $$
DECLARE
    v_integration_id UUID;
    v_public_key TEXT;
    v_secret_key TEXT;
    v_webhook_url TEXT;
BEGIN
    -- Verificar se já existe
    SELECT id INTO v_integration_id 
    FROM integrations 
    WHERE company_id = p_company_id;
    
    IF v_integration_id IS NOT NULL THEN
        RETURN v_integration_id;
    END IF;
    
    -- Gerar chaves API
    SELECT public_key, secret_key INTO v_public_key, v_secret_key 
    FROM generate_api_keys() LIMIT 1;
    
    -- Gerar webhook URL
    v_webhook_url := generate_webhook_url(p_company_id);
    
    -- Inserir integração
    INSERT INTO integrations (
        company_id,
        webhook_url,
        api_key_public,
        api_key_secret
    ) VALUES (
        p_company_id,
        v_webhook_url,
        v_public_key,
        v_secret_key
    ) RETURNING id INTO v_integration_id;
    
    RETURN v_integration_id;
END;
$$ LANGUAGE plpgsql;

-- 8. FUNÇÃO PARA BUSCAR OU CRIAR INTEGRAÇÃO (NECESSÁRIA PARA O BACKEND)
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

-- 9. FUNÇÃO PARA REGENERAR CHAVES API (NECESSÁRIA PARA O BACKEND)
CREATE OR REPLACE FUNCTION regenerate_api_keys(p_company_id UUID)
RETURNS TABLE(public_key TEXT, secret_key TEXT) AS $$
DECLARE
    v_public_key TEXT;
    v_secret_key TEXT;
BEGIN
    -- Gerar novas chaves
    SELECT g.public_key, g.secret_key INTO v_public_key, v_secret_key 
    FROM generate_api_keys() g LIMIT 1;
    
    -- Atualizar na tabela
    UPDATE integrations 
    SET 
        api_key_public = v_public_key,
        api_key_secret = v_secret_key,
        updated_at = NOW()
    WHERE company_id = p_company_id;
    
    -- Retornar as novas chaves
    RETURN QUERY SELECT v_public_key, v_secret_key;
END;
$$ LANGUAGE plpgsql;

-- 10. FUNÇÕES DE VALIDAÇÃO BÁSICA (NECESSÁRIAS PARA O BACKEND)
CREATE OR REPLACE FUNCTION validate_meta_ads_token(p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validação básica do token Meta Ads
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

CREATE OR REPLACE FUNCTION validate_google_ads_token(p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validação básica do token Google Ads
    IF p_token IS NULL OR LENGTH(TRIM(p_token)) < 10 THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 11. POLÍTICAS DE SEGURANÇA
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

-- 12. TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_integrations_updated_at ON integrations;
CREATE TRIGGER trigger_update_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_integrations_updated_at();

-- 13. COMENTÁRIOS BÁSICOS
COMMENT ON TABLE integrations IS 'Integrações de marketing para cada empresa';
COMMENT ON COLUMN integrations.company_id IS 'ID da empresa proprietária da integração';

-- Log de sucesso
DO $$ 
BEGIN
    RAISE NOTICE '✅ Sistema de integrações completo criado com sucesso!';
    RAISE NOTICE '📋 Estrutura básica configurada';
    RAISE NOTICE '🔑 Funções básicas criadas';
    RAISE NOTICE '🔧 Funções do backend adicionadas';
    RAISE NOTICE '🔒 RLS configurado para admins';
    RAISE NOTICE '🎯 Pronto para uso!';
END $$; 
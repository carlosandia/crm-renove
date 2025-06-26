-- =========================================================================
-- MIGRAÇÃO: INTEGRAÇÕES FACEBOOK PIXEL & GOOGLE ADS - ETAPA 1
-- Data: 2025-01-27
-- Objetivo: Adicionar suporte completo para conversões reais do Facebook e Google
-- =========================================================================

-- 1. ADICIONAR COLUNAS ESPECÍFICAS À TABELA INTEGRATIONS EXISTENTE
-- =====================================================
-- Não vamos alterar nada existente, apenas ADICIONAR novas colunas

DO $$ 
BEGIN
    -- Adicionar Meta Pixel ID se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'integrations' AND column_name = 'meta_pixel_id'
    ) THEN
        ALTER TABLE integrations ADD COLUMN meta_pixel_id TEXT;
        RAISE NOTICE 'Coluna meta_pixel_id adicionada à tabela integrations';
    ELSE
        RAISE NOTICE 'Coluna meta_pixel_id já existe';
    END IF;

    -- Adicionar Google Ads Customer ID se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'integrations' AND column_name = 'google_ads_customer_id'
    ) THEN
        ALTER TABLE integrations ADD COLUMN google_ads_customer_id TEXT;
        RAISE NOTICE 'Coluna google_ads_customer_id adicionada à tabela integrations';
    ELSE
        RAISE NOTICE 'Coluna google_ads_customer_id já existe';
    END IF;

    -- Adicionar configurações de conversion actions do Google
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'integrations' AND column_name = 'google_ads_conversion_actions'
    ) THEN
        ALTER TABLE integrations ADD COLUMN google_ads_conversion_actions JSONB DEFAULT '{}';
        RAISE NOTICE 'Coluna google_ads_conversion_actions adicionada à tabela integrations';
    ELSE
        RAISE NOTICE 'Coluna google_ads_conversion_actions já existe';
    END IF;

    -- Adicionar flag para habilitar tracking de conversões
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'integrations' AND column_name = 'conversion_tracking_enabled'
    ) THEN
        ALTER TABLE integrations ADD COLUMN conversion_tracking_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Coluna conversion_tracking_enabled adicionada à tabela integrations';
    ELSE
        RAISE NOTICE 'Coluna conversion_tracking_enabled já existe';
    END IF;

    -- Adicionar configurações avançadas de Meta
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'integrations' AND column_name = 'meta_app_id'
    ) THEN
        ALTER TABLE integrations ADD COLUMN meta_app_id TEXT;
        RAISE NOTICE 'Coluna meta_app_id adicionada à tabela integrations';
    ELSE
        RAISE NOTICE 'Coluna meta_app_id já existe';
    END IF;

    -- Adicionar configurações de teste/produção
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'integrations' AND column_name = 'test_mode'
    ) THEN
        ALTER TABLE integrations ADD COLUMN test_mode BOOLEAN DEFAULT true;
        RAISE NOTICE 'Coluna test_mode adicionada à tabela integrations';
    ELSE
        RAISE NOTICE 'Coluna test_mode já existe';
    END IF;
END $$;

-- 2. CRIAR TABELA DE MAPEAMENTO DE EVENTOS DE CONVERSÃO
-- =====================================================
-- Esta tabela mapeia stages da pipeline para eventos de conversão

CREATE TABLE IF NOT EXISTS conversion_event_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL, -- Referência ao tenant_id
    stage_id UUID REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    stage_name TEXT NOT NULL, -- Nome da stage para facilitar queries
    event_name TEXT NOT NULL, -- Nome do evento (Purchase, Lead, CompleteRegistration, etc)
    event_type TEXT NOT NULL CHECK (event_type IN ('meta', 'google', 'both')),
    conversion_value DECIMAL(10,2) DEFAULT 0.00, -- Valor padrão da conversão
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints para evitar duplicatas
    UNIQUE(company_id, stage_id, event_type)
);

-- 3. CRIAR TABELA DE FILA DE CONVERSÕES
-- =====================================================
-- Esta tabela armazena conversões pendentes para processamento em background

CREATE TABLE IF NOT EXISTS conversion_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL, -- ID do lead na pipeline_leads
    company_id TEXT NOT NULL,
    stage_id UUID REFERENCES pipeline_stages(id),
    event_mapping_id UUID REFERENCES conversion_event_mappings(id),
    lead_data JSONB NOT NULL DEFAULT '{}', -- Dados do lead para a conversão
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    platform TEXT CHECK (platform IN ('meta', 'google')),
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    response_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CRIAR TABELA DE LOGS DE CONVERSÃO
-- =====================================================
-- Esta tabela mantém histórico completo de todas as conversões enviadas

CREATE TABLE IF NOT EXISTS conversion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    company_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('meta', 'google')),
    event_name TEXT NOT NULL,
    stage_name TEXT NOT NULL,
    conversion_value DECIMAL(10,2),
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    request_payload JSONB,
    response_data JSONB,
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. HABILITAR RLS NAS NOVAS TABELAS
-- =====================================================

ALTER TABLE conversion_event_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_logs ENABLE ROW LEVEL SECURITY;

-- 6. CRIAR POLÍTICAS DE SEGURANÇA
-- =====================================================

-- Políticas para conversion_event_mappings (apenas admins da empresa)
CREATE POLICY "admin_conversion_mappings_policy" ON conversion_event_mappings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND tenant_id = conversion_event_mappings.company_id
            AND role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND tenant_id = conversion_event_mappings.company_id
            AND role IN ('admin', 'super_admin')
        )
    );

-- Políticas para conversion_queue (apenas admins da empresa)
CREATE POLICY "admin_conversion_queue_policy" ON conversion_queue
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND tenant_id = conversion_queue.company_id
            AND role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND tenant_id = conversion_queue.company_id
            AND role IN ('admin', 'super_admin')
        )
    );

-- Políticas para conversion_logs (admins podem ler, sistema pode escrever)
CREATE POLICY "admin_conversion_logs_read_policy" ON conversion_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND tenant_id = conversion_logs.company_id
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "system_conversion_logs_write_policy" ON conversion_logs
    FOR INSERT
    WITH CHECK (true); -- Sistema pode inserir logs

-- 7. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_conversion_mappings_company_stage 
    ON conversion_event_mappings(company_id, stage_id);

CREATE INDEX IF NOT EXISTS idx_conversion_mappings_active 
    ON conversion_event_mappings(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_conversion_queue_status 
    ON conversion_queue(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_conversion_queue_company 
    ON conversion_queue(company_id, created_at);

CREATE INDEX IF NOT EXISTS idx_conversion_logs_company_platform 
    ON conversion_logs(company_id, platform, created_at);

CREATE INDEX IF NOT EXISTS idx_conversion_logs_lead_id 
    ON conversion_logs(lead_id, created_at);

-- 8. CRIAR TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Trigger para conversion_event_mappings
CREATE TRIGGER update_conversion_mappings_updated_at 
    BEFORE UPDATE ON conversion_event_mappings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para conversion_queue
CREATE TRIGGER update_conversion_queue_updated_at 
    BEFORE UPDATE ON conversion_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. CRIAR FUNÇÃO PARA DETECTAR MUDANÇAS DE STAGE E ADICIONAR À FILA
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_conversion_on_stage_change()
RETURNS TRIGGER AS $$
DECLARE
    mapping_record conversion_event_mappings%ROWTYPE;
    lead_custom_data JSONB;
BEGIN
    -- Verificar se houve mudança de stage
    IF NEW.stage_id != OLD.stage_id THEN
        
        -- Buscar dados customizados do lead
        lead_custom_data := COALESCE(NEW.custom_data, '{}');
        
        -- Buscar mapeamentos ativos para a nova stage
        FOR mapping_record IN 
            SELECT * FROM conversion_event_mappings 
            WHERE company_id = NEW.tenant_id 
            AND stage_id = NEW.stage_id 
            AND is_active = true
        LOOP
            -- Inserir na fila de conversões para Meta
            IF mapping_record.event_type IN ('meta', 'both') THEN
                INSERT INTO conversion_queue (
                    lead_id, company_id, stage_id, event_mapping_id, 
                    lead_data, platform, status
                ) VALUES (
                    NEW.id, NEW.tenant_id, NEW.stage_id, mapping_record.id,
                    jsonb_build_object(
                        'email', lead_custom_data->>'email',
                        'phone', lead_custom_data->>'telefone',
                        'first_name', split_part(lead_custom_data->>'nome_lead', ' ', 1),
                        'last_name', CASE 
                            WHEN array_length(string_to_array(lead_custom_data->>'nome_lead', ' '), 1) > 1 
                            THEN array_to_string(
                                (string_to_array(lead_custom_data->>'nome_lead', ' '))[2:], ' '
                            ) 
                            ELSE '' 
                        END,
                        'conversion_value', COALESCE((lead_custom_data->>'valor')::decimal, mapping_record.conversion_value),
                        'campaign_id', lead_custom_data->>'campaign_id',
                        'adset_id', lead_custom_data->>'adset_id',
                        'ad_id', lead_custom_data->>'ad_id',
                        'event_name', mapping_record.event_name,
                        'stage_name', mapping_record.stage_name
                    ),
                    'meta', 'pending'
                );
            END IF;
            
            -- Inserir na fila de conversões para Google
            IF mapping_record.event_type IN ('google', 'both') THEN
                INSERT INTO conversion_queue (
                    lead_id, company_id, stage_id, event_mapping_id, 
                    lead_data, platform, status
                ) VALUES (
                    NEW.id, NEW.tenant_id, NEW.stage_id, mapping_record.id,
                    jsonb_build_object(
                        'gclid', lead_custom_data->>'gclid',
                        'conversion_value', COALESCE((lead_custom_data->>'valor')::decimal, mapping_record.conversion_value),
                        'event_name', mapping_record.event_name,
                        'stage_name', mapping_record.stage_name,
                        'order_id', NEW.id::text
                    ),
                    'google', 'pending'
                );
            END IF;
            
        END LOOP;
        
        RAISE NOTICE 'Conversões adicionadas à fila para lead % na stage %', NEW.id, mapping_record.stage_name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. APLICAR TRIGGER NA TABELA PIPELINE_LEADS
-- =====================================================

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS conversion_stage_change_trigger ON pipeline_leads;

-- Criar novo trigger
CREATE TRIGGER conversion_stage_change_trigger
    AFTER UPDATE OF stage_id ON pipeline_leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_conversion_on_stage_change();

-- 11. CRIAR MAPEAMENTOS PADRÃO PARA STAGES DO SISTEMA
-- =====================================================

-- Esta função será executada para criar mapeamentos padrão nas empresas existentes
CREATE OR REPLACE FUNCTION create_default_conversion_mappings()
RETURNS VOID AS $$
DECLARE
    company_record RECORD;
    stage_record RECORD;
BEGIN
    -- Para cada empresa (tenant)
    FOR company_record IN 
        SELECT DISTINCT tenant_id as company_id FROM users WHERE role = 'admin'
    LOOP
        RAISE NOTICE 'Criando mapeamentos padrão para empresa: %', company_record.company_id;
        
        -- Buscar stage "Closed Won" para esta empresa
        FOR stage_record IN
            SELECT ps.id, ps.name, ps.pipeline_id 
            FROM pipeline_stages ps
            JOIN pipelines p ON p.id = ps.pipeline_id
            WHERE p.tenant_id = company_record.company_id
            AND (ps.name ILIKE '%closed%won%' OR ps.name ILIKE '%ganho%')
            AND (ps.is_system_stage = true OR ps.name IN ('Closed Won', 'Ganho'))
        LOOP
            -- Criar mapeamento para Meta (evento Purchase)
            INSERT INTO conversion_event_mappings (
                company_id, stage_id, stage_name, event_name, 
                event_type, conversion_value, is_active
            ) VALUES (
                company_record.company_id, stage_record.id, stage_record.name,
                'Purchase', 'meta', 100.00, true
            ) ON CONFLICT (company_id, stage_id, event_type) DO NOTHING;
            
            -- Criar mapeamento para Google (conversão padrão)
            INSERT INTO conversion_event_mappings (
                company_id, stage_id, stage_name, event_name, 
                event_type, conversion_value, is_active
            ) VALUES (
                company_record.company_id, stage_record.id, stage_record.name,
                'purchase', 'google', 100.00, true
            ) ON CONFLICT (company_id, stage_id, event_type) DO NOTHING;
            
            RAISE NOTICE 'Mapeamentos criados para stage: % (%)', stage_record.name, stage_record.id;
        END LOOP;
        
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Executar criação de mapeamentos padrão
SELECT create_default_conversion_mappings();

-- 12. CRIAR FUNÇÕES AUXILIARES PARA GERENCIAR CONFIGURAÇÕES
-- =====================================================

-- Função para obter configurações de integração de uma empresa
CREATE OR REPLACE FUNCTION get_company_integration_config(p_company_id TEXT)
RETURNS TABLE (
    meta_pixel_id TEXT,
    meta_app_id TEXT,
    google_ads_customer_id TEXT,
    google_ads_conversion_actions JSONB,
    conversion_tracking_enabled BOOLEAN,
    test_mode BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.meta_pixel_id,
        i.meta_app_id,
        i.google_ads_customer_id,
        i.google_ads_conversion_actions,
        i.conversion_tracking_enabled,
        i.test_mode
    FROM integrations i
    WHERE i.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar configurações de conversão
CREATE OR REPLACE FUNCTION update_conversion_config(
    p_company_id TEXT,
    p_meta_pixel_id TEXT DEFAULT NULL,
    p_meta_app_id TEXT DEFAULT NULL,
    p_google_ads_customer_id TEXT DEFAULT NULL,
    p_google_ads_conversion_actions JSONB DEFAULT NULL,
    p_conversion_tracking_enabled BOOLEAN DEFAULT NULL,
    p_test_mode BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE integrations 
    SET 
        meta_pixel_id = COALESCE(p_meta_pixel_id, meta_pixel_id),
        meta_app_id = COALESCE(p_meta_app_id, meta_app_id),
        google_ads_customer_id = COALESCE(p_google_ads_customer_id, google_ads_customer_id),
        google_ads_conversion_actions = COALESCE(p_google_ads_conversion_actions, google_ads_conversion_actions),
        conversion_tracking_enabled = COALESCE(p_conversion_tracking_enabled, conversion_tracking_enabled),
        test_mode = COALESCE(p_test_mode, test_mode),
        updated_at = NOW()
    WHERE company_id = p_company_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- VERIFICAÇÃO FINAL
-- =========================================================================

DO $$
DECLARE
    tables_created INTEGER;
    columns_added INTEGER;
BEGIN
    -- Contar tabelas criadas
    SELECT COUNT(*) INTO tables_created
    FROM information_schema.tables 
    WHERE table_name IN ('conversion_event_mappings', 'conversion_queue', 'conversion_logs');
    
    -- Contar colunas adicionadas
    SELECT COUNT(*) INTO columns_added
    FROM information_schema.columns 
    WHERE table_name = 'integrations' 
    AND column_name IN ('meta_pixel_id', 'google_ads_customer_id', 'google_ads_conversion_actions', 'conversion_tracking_enabled', 'meta_app_id', 'test_mode');
    
    RAISE NOTICE '=== MIGRAÇÃO FACEBOOK PIXEL & GOOGLE ADS ETAPA 1 CONCLUÍDA ===';
    RAISE NOTICE 'Tabelas criadas: %', tables_created;
    RAISE NOTICE 'Colunas adicionadas à integrations: %', columns_added;
    RAISE NOTICE 'Base de dados pronta para próxima etapa!';
END $$;

-- =========================================================================
-- FIM DA MIGRAÇÃO - ETAPA 1 CONCLUÍDA
-- ========================================================================= 
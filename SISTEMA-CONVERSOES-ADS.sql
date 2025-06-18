-- ============================================
-- SISTEMA DE CONVERSÕES PARA META ADS E GOOGLE ADS
-- ============================================

-- 1. ADICIONAR CAMPOS NECESSÁRIOS À TABELA PIPELINE_LEADS
DO $$ 
BEGIN
    -- Adicionar campo status se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'status') THEN
        ALTER TABLE pipeline_leads ADD COLUMN status TEXT DEFAULT 'active' 
        CHECK (status IN ('active', 'won', 'lost'));
        RAISE NOTICE 'Campo status adicionado à tabela pipeline_leads';
    END IF;
    
    -- Adicionar campo source se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'source') THEN
        ALTER TABLE pipeline_leads ADD COLUMN source TEXT 
        CHECK (source IN ('meta', 'google', 'webhook', 'manual', 'form'));
        RAISE NOTICE 'Campo source adicionado à tabela pipeline_leads';
    END IF;
    
    -- Adicionar campo campaign_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'campaign_id') THEN
        ALTER TABLE pipeline_leads ADD COLUMN campaign_id TEXT;
        RAISE NOTICE 'Campo campaign_id adicionado à tabela pipeline_leads';
    END IF;
    
    -- Adicionar campo adset_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'adset_id') THEN
        ALTER TABLE pipeline_leads ADD COLUMN adset_id TEXT;
        RAISE NOTICE 'Campo adset_id adicionado à tabela pipeline_leads';
    END IF;
    
    -- Adicionar campo ad_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'ad_id') THEN
        ALTER TABLE pipeline_leads ADD COLUMN ad_id TEXT;
        RAISE NOTICE 'Campo ad_id adicionado à tabela pipeline_leads';
    END IF;
    
    -- Adicionar campo click_id se não existir (para Google gclid)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'click_id') THEN
        ALTER TABLE pipeline_leads ADD COLUMN click_id TEXT;
        RAISE NOTICE 'Campo click_id adicionado à tabela pipeline_leads';
    END IF;
    
    -- Adicionar campo converted_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'converted_at') THEN
        ALTER TABLE pipeline_leads ADD COLUMN converted_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Campo converted_at adicionado à tabela pipeline_leads';
    END IF;
    
    -- Adicionar campo conversion_value se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'conversion_value') THEN
        ALTER TABLE pipeline_leads ADD COLUMN conversion_value DECIMAL(10,2);
        RAISE NOTICE 'Campo conversion_value adicionado à tabela pipeline_leads';
    END IF;
END $$;

-- 2. CRIAR TABELA PARA LOG DE CONVERSÕES
CREATE TABLE IF NOT EXISTS conversion_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('meta', 'google')),
    event_name TEXT NOT NULL,
    event_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'retry')),
    request_payload JSONB,
    response_data JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_status ON pipeline_leads(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_source ON pipeline_leads(source);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_converted_at ON pipeline_leads(converted_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_campaign_id ON pipeline_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_click_id ON pipeline_leads(click_id);

CREATE INDEX IF NOT EXISTS idx_conversion_logs_lead_id ON conversion_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversion_logs_platform ON conversion_logs(platform);
CREATE INDEX IF NOT EXISTS idx_conversion_logs_status ON conversion_logs(status);
CREATE INDEX IF NOT EXISTS idx_conversion_logs_created_at ON conversion_logs(created_at DESC);

-- 4. CONFIGURAR RLS PARA CONVERSION_LOGS
ALTER TABLE conversion_logs ENABLE ROW LEVEL SECURITY;

-- Política para admins verem logs de conversão da sua empresa
CREATE POLICY "Admins can view conversion logs from their company" ON conversion_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pipeline_leads pl
            JOIN pipelines p ON pl.pipeline_id = p.id
            JOIN users u ON p.tenant_id = u.tenant_id
            WHERE pl.id = conversion_logs.lead_id 
            AND u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- Sistema pode inserir logs
CREATE POLICY "System can insert conversion logs" ON conversion_logs
    FOR INSERT WITH CHECK (true);

-- Sistema pode atualizar logs
CREATE POLICY "System can update conversion logs" ON conversion_logs
    FOR UPDATE USING (true);

-- 5. FUNÇÃO PARA REGISTRAR LOG DE CONVERSÃO
CREATE OR REPLACE FUNCTION log_conversion_attempt(
    p_lead_id UUID,
    p_platform TEXT,
    p_event_name TEXT,
    p_event_time TIMESTAMP WITH TIME ZONE,
    p_request_payload JSONB DEFAULT '{}',
    p_status TEXT DEFAULT 'pending'
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO conversion_logs (
        lead_id,
        platform,
        event_name,
        event_time,
        status,
        request_payload
    ) VALUES (
        p_lead_id,
        p_platform,
        p_event_name,
        p_event_time,
        p_status,
        p_request_payload
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- 6. FUNÇÃO PARA ATUALIZAR STATUS DE CONVERSÃO
CREATE OR REPLACE FUNCTION update_conversion_log(
    p_log_id UUID,
    p_status TEXT,
    p_response_data JSONB DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE conversion_logs 
    SET 
        status = p_status,
        response_data = COALESCE(p_response_data, response_data),
        error_message = p_error_message,
        sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
        updated_at = NOW()
    WHERE id = p_log_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 7. FUNÇÃO PARA VERIFICAR SE LEAD PODE SER CONVERTIDO
CREATE OR REPLACE FUNCTION can_send_conversion(p_lead_id UUID)
RETURNS TABLE(
    can_convert BOOLEAN,
    lead_source TEXT,
    company_id UUID,
    meta_token TEXT,
    google_token TEXT,
    lead_data JSONB,
    reason TEXT
) AS $$
DECLARE
    v_lead RECORD;
    v_integration RECORD;
BEGIN
    -- Buscar dados do lead
    SELECT 
        pl.*,
        p.tenant_id as company_id
    INTO v_lead
    FROM pipeline_leads pl
    JOIN pipelines p ON pl.pipeline_id = p.id
    WHERE pl.id = p_lead_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::JSONB, 'Lead não encontrado';
        RETURN;
    END IF;
    
    -- Verificar se já foi convertido
    IF v_lead.converted_at IS NOT NULL THEN
        RETURN QUERY SELECT false, v_lead.source, v_lead.company_id, NULL::TEXT, NULL::TEXT, NULL::JSONB, 'Lead já convertido anteriormente';
        RETURN;
    END IF;
    
    -- Verificar se tem source válido
    IF v_lead.source NOT IN ('meta', 'google') THEN
        RETURN QUERY SELECT false, v_lead.source, v_lead.company_id, NULL::TEXT, NULL::TEXT, NULL::JSONB, 'Source não é meta ou google';
        RETURN;
    END IF;
    
    -- Verificar se está atribuído a um vendedor
    IF v_lead.assigned_to IS NULL THEN
        RETURN QUERY SELECT false, v_lead.source, v_lead.company_id, NULL::TEXT, NULL::TEXT, NULL::JSONB, 'Lead não está atribuído a um vendedor';
        RETURN;
    END IF;
    
    -- Buscar tokens de integração
    SELECT 
        meta_ads_token,
        google_ads_token
    INTO v_integration
    FROM integrations
    WHERE company_id = v_lead.company_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, v_lead.source, v_lead.company_id, NULL::TEXT, NULL::TEXT, NULL::JSONB, 'Empresa não possui integrações configuradas';
        RETURN;
    END IF;
    
    -- Verificar se tem token para a plataforma específica
    IF v_lead.source = 'meta' AND (v_integration.meta_ads_token IS NULL OR LENGTH(TRIM(v_integration.meta_ads_token)) = 0) THEN
        RETURN QUERY SELECT false, v_lead.source, v_lead.company_id, NULL::TEXT, NULL::TEXT, NULL::JSONB, 'Token Meta Ads não configurado';
        RETURN;
    END IF;
    
    IF v_lead.source = 'google' AND (v_integration.google_ads_token IS NULL OR LENGTH(TRIM(v_integration.google_ads_token)) = 0) THEN
        RETURN QUERY SELECT false, v_lead.source, v_lead.company_id, NULL::TEXT, NULL::TEXT, NULL::JSONB, 'Token Google Ads não configurado';
        RETURN;
    END IF;
    
    -- Se chegou até aqui, pode converter
    RETURN QUERY SELECT 
        true, 
        v_lead.source, 
        v_lead.company_id, 
        v_integration.meta_ads_token,
        v_integration.google_ads_token,
        jsonb_build_object(
            'id', v_lead.id,
            'campaign_id', v_lead.campaign_id,
            'adset_id', v_lead.adset_id,
            'ad_id', v_lead.ad_id,
            'click_id', v_lead.click_id,
            'custom_data', v_lead.custom_data,
            'conversion_value', v_lead.conversion_value,
            'created_at', v_lead.created_at
        ),
        'Lead elegível para conversão';
END;
$$ LANGUAGE plpgsql;

-- 8. TRIGGER PARA DETECTAR MUDANÇA DE STATUS
CREATE OR REPLACE FUNCTION trigger_conversion_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_conversion_check RECORD;
    v_log_id UUID;
BEGIN
    -- Verificar se status mudou para 'won' ou 'lost'
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('won', 'lost') THEN
        
        -- Verificar se pode enviar conversão
        SELECT * INTO v_conversion_check FROM can_send_conversion(NEW.id);
        
        IF v_conversion_check.can_convert THEN
            -- Determinar evento baseado no status
            DECLARE
                v_event_name TEXT;
            BEGIN
                v_event_name := CASE 
                    WHEN NEW.status = 'won' THEN 
                        CASE v_conversion_check.lead_source
                            WHEN 'meta' THEN 'Lead'
                            WHEN 'google' THEN 'Lead_Conversion'
                        END
                    WHEN NEW.status = 'lost' THEN 'Lead_Lost'
                END;
                
                -- Registrar log de conversão
                SELECT log_conversion_attempt(
                    NEW.id,
                    v_conversion_check.lead_source,
                    v_event_name,
                    NOW(),
                    v_conversion_check.lead_data,
                    'pending'
                ) INTO v_log_id;
                
                -- Registrar no histórico do lead
                PERFORM register_lead_history(
                    NEW.id,
                    'conversion_queued',
                    NEW.assigned_to,
                    (SELECT role FROM users WHERE id = NEW.assigned_to),
                    format('Conversão %s agendada para %s (Log ID: %s)', v_event_name, v_conversion_check.lead_source, v_log_id),
                    jsonb_build_object('old_status', OLD.status),
                    jsonb_build_object('new_status', NEW.status, 'conversion_log_id', v_log_id)
                );
                
                -- Marcar como convertido (timestamp)
                NEW.converted_at := NOW();
                
                RAISE NOTICE 'Conversão agendada para lead % - Platform: % - Event: % - Log ID: %', 
                    NEW.id, v_conversion_check.lead_source, v_event_name, v_log_id;
            END;
        ELSE
            RAISE NOTICE 'Lead % não elegível para conversão: %', NEW.id, v_conversion_check.reason;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para pipeline_leads
DROP TRIGGER IF EXISTS trigger_conversion_on_lead_status_change ON pipeline_leads;
CREATE TRIGGER trigger_conversion_on_lead_status_change
    BEFORE UPDATE ON pipeline_leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_conversion_on_status_change();

-- 9. FUNÇÃO PARA PROCESSAR FILA DE CONVERSÕES
CREATE OR REPLACE FUNCTION get_pending_conversions(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    log_id UUID,
    lead_id UUID,
    platform TEXT,
    event_name TEXT,
    event_time TIMESTAMP WITH TIME ZONE,
    request_payload JSONB,
    retry_count INTEGER,
    company_id UUID,
    access_token TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cl.id as log_id,
        cl.lead_id,
        cl.platform,
        cl.event_name,
        cl.event_time,
        cl.request_payload,
        cl.retry_count,
        pl_data.company_id,
        CASE cl.platform
            WHEN 'meta' THEN i.meta_ads_token
            WHEN 'google' THEN i.google_ads_token
        END as access_token
    FROM conversion_logs cl
    JOIN (
        SELECT 
            pl.id as lead_id,
            p.tenant_id as company_id
        FROM pipeline_leads pl
        JOIN pipelines p ON pl.pipeline_id = p.id
    ) pl_data ON cl.lead_id = pl_data.lead_id
    JOIN integrations i ON pl_data.company_id = i.company_id
    WHERE cl.status IN ('pending', 'retry')
    AND cl.retry_count < 3
    ORDER BY cl.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 10. TRIGGER PARA ATUALIZAR UPDATED_AT
CREATE OR REPLACE FUNCTION update_conversion_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversion_logs_updated_at
    BEFORE UPDATE ON conversion_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_conversion_logs_updated_at();

-- 11. COMENTÁRIOS DE DOCUMENTAÇÃO
COMMENT ON COLUMN pipeline_leads.status IS 'Status do lead: active, won, lost';
COMMENT ON COLUMN pipeline_leads.source IS 'Origem do lead: meta, google, webhook, manual, form';
COMMENT ON COLUMN pipeline_leads.campaign_id IS 'ID da campanha de origem (Meta ou Google)';
COMMENT ON COLUMN pipeline_leads.adset_id IS 'ID do conjunto de anúncios';
COMMENT ON COLUMN pipeline_leads.ad_id IS 'ID do anúncio específico';
COMMENT ON COLUMN pipeline_leads.click_id IS 'GCLID do Google ou FBCLID do Meta';
COMMENT ON COLUMN pipeline_leads.converted_at IS 'Timestamp quando a conversão foi enviada';
COMMENT ON COLUMN pipeline_leads.conversion_value IS 'Valor da conversão em reais';

COMMENT ON TABLE conversion_logs IS 'Log de tentativas de envio de conversões para Meta e Google';
COMMENT ON COLUMN conversion_logs.platform IS 'Plataforma de destino: meta ou google';
COMMENT ON COLUMN conversion_logs.event_name IS 'Nome do evento enviado (Lead, Purchase, Lead_Lost)';
COMMENT ON COLUMN conversion_logs.status IS 'Status do envio: pending, sent, failed, retry';
COMMENT ON COLUMN conversion_logs.request_payload IS 'Dados enviados para a API';
COMMENT ON COLUMN conversion_logs.response_data IS 'Resposta recebida da API';
COMMENT ON COLUMN conversion_logs.retry_count IS 'Número de tentativas de reenvio';

-- Log de sucesso
DO $$ 
BEGIN
    RAISE NOTICE '✅ Sistema de conversões configurado com sucesso!';
    RAISE NOTICE '📋 Estruturas criadas/atualizadas:';
    RAISE NOTICE '   - pipeline_leads (novos campos: status, source, campaign_id, etc.)';
    RAISE NOTICE '   - conversion_logs (tabela de logs)';
    RAISE NOTICE '   - Índices para performance';
    RAISE NOTICE '   - Políticas RLS para segurança';
    RAISE NOTICE '   - Triggers automáticos para conversões';
    RAISE NOTICE '   - Funções para validação e processamento';
    RAISE NOTICE '🎯 Trigger ativo: mudança status → conversão automática';
    RAISE NOTICE '🔄 Fila de processamento implementada';
END $$; 
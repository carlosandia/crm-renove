-- =====================================================
-- MIGRAÇÃO: SISTEMA DE TEMPERATURA AUTOMÁTICO
-- Data: 2025-01-25
-- Descrição: Implementa sistema automático de temperatura
--           baseado no tempo na etapa inicial da pipeline
-- =====================================================

-- 1. CRIAR TABELA DE CONFIGURAÇÃO DE TEMPERATURA
-- =====================================================
CREATE TABLE IF NOT EXISTS temperature_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    
    -- Configurações de tempo (em horas)
    hot_threshold INTEGER DEFAULT 24,      -- Até 24h = QUENTE
    warm_threshold INTEGER DEFAULT 72,     -- 24h-72h = MORNO
    cold_threshold INTEGER DEFAULT 168,    -- 72h-168h = FRIO
    -- Acima de 168h (7 dias) = GELADO
    
    -- Configurações visuais
    hot_color VARCHAR(20) DEFAULT '#ef4444',     -- Vermelho
    warm_color VARCHAR(20) DEFAULT '#f97316',    -- Laranja
    cold_color VARCHAR(20) DEFAULT '#3b82f6',    -- Azul
    frozen_color VARCHAR(20) DEFAULT '#6b7280',  -- Cinza
    
    -- Configurações de ícones
    hot_icon VARCHAR(50) DEFAULT '🔥',
    warm_icon VARCHAR(50) DEFAULT '🌡️',
    cold_icon VARCHAR(50) DEFAULT '❄️',
    frozen_icon VARCHAR(50) DEFAULT '🧊',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(pipeline_id)
);

-- 2. ADICIONAR COLUNAS DE TEMPERATURA NA TABELA PIPELINE_LEADS
-- =====================================================
DO $$ 
BEGIN
    -- Adicionar coluna de temperatura calculada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pipeline_leads' 
        AND column_name = 'temperature_level'
    ) THEN
        ALTER TABLE pipeline_leads 
        ADD COLUMN temperature_level VARCHAR(20) DEFAULT 'hot';
    END IF;
    
    -- Adicionar coluna de última atualização de temperatura
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pipeline_leads' 
        AND column_name = 'temperature_updated_at'
    ) THEN
        ALTER TABLE pipeline_leads 
        ADD COLUMN temperature_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Adicionar coluna de tempo na etapa inicial
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pipeline_leads' 
        AND column_name = 'initial_stage_entry_time'
    ) THEN
        ALTER TABLE pipeline_leads 
        ADD COLUMN initial_stage_entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 3. FUNÇÃO PARA CALCULAR TEMPERATURA AUTOMÁTICA
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_temperature_level(
    p_pipeline_id UUID,
    p_initial_stage_entry_time TIMESTAMP WITH TIME ZONE
) RETURNS VARCHAR(20) AS $$
DECLARE
    config_record temperature_config%ROWTYPE;
    hours_since_entry INTEGER;
    temperature_level VARCHAR(20);
BEGIN
    -- Buscar configuração da pipeline
    SELECT * INTO config_record 
    FROM temperature_config 
    WHERE pipeline_id = p_pipeline_id;
    
    -- Se não encontrar configuração, usar padrões
    IF NOT FOUND THEN
        config_record.hot_threshold := 24;
        config_record.warm_threshold := 72;
        config_record.cold_threshold := 168;
    END IF;
    
    -- Calcular horas desde entrada na etapa inicial
    hours_since_entry := EXTRACT(EPOCH FROM (NOW() - p_initial_stage_entry_time)) / 3600;
    
    -- Determinar nível de temperatura
    IF hours_since_entry <= config_record.hot_threshold THEN
        temperature_level := 'hot';
    ELSIF hours_since_entry <= config_record.warm_threshold THEN
        temperature_level := 'warm';
    ELSIF hours_since_entry <= config_record.cold_threshold THEN
        temperature_level := 'cold';
    ELSE
        temperature_level := 'frozen';
    END IF;
    
    RETURN temperature_level;
END;
$$ LANGUAGE plpgsql;

-- 4. FUNÇÃO PARA ATUALIZAR TEMPERATURAS EM LOTE
-- =====================================================
CREATE OR REPLACE FUNCTION update_all_temperatures() RETURNS INTEGER AS $$
DECLARE
    lead_record RECORD;
    updated_count INTEGER := 0;
    new_temperature VARCHAR(20);
BEGIN
    -- Atualizar temperatura de todos os leads na etapa inicial
    FOR lead_record IN 
        SELECT pl.id, pl.pipeline_id, pl.initial_stage_entry_time, ps.name as stage_name
        FROM pipeline_leads pl
        JOIN pipeline_stages ps ON pl.stage_id = ps.id
        WHERE ps.name = 'Novo Lead' OR ps.name = 'Novos Leads'
        AND pl.initial_stage_entry_time IS NOT NULL
    LOOP
        -- Calcular nova temperatura
        new_temperature := calculate_temperature_level(
            lead_record.pipeline_id,
            lead_record.initial_stage_entry_time
        );
        
        -- Atualizar apenas se mudou
        UPDATE pipeline_leads 
        SET 
            temperature_level = new_temperature,
            temperature_updated_at = NOW()
        WHERE id = lead_record.id 
        AND (temperature_level != new_temperature OR temperature_level IS NULL);
        
        IF FOUND THEN
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 5. TRIGGER PARA ATUALIZAR TEMPERATURA AUTOMATICAMENTE
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_update_temperature() RETURNS TRIGGER AS $$
DECLARE
    new_temperature VARCHAR(20);
    is_initial_stage BOOLEAN := FALSE;
BEGIN
    -- Verificar se é a etapa inicial (múltiplos nomes possíveis)
    SELECT (ps.name = 'Novo Lead' OR ps.name = 'Novos Leads') INTO is_initial_stage
    FROM pipeline_stages ps 
    WHERE ps.id = NEW.stage_id;
    
    -- Se for inserção na etapa inicial
    IF TG_OP = 'INSERT' AND is_initial_stage THEN
        NEW.initial_stage_entry_time := NOW();
        NEW.temperature_level := 'hot';
        NEW.temperature_updated_at := NOW();
    
    -- Se for atualização de etapa
    ELSIF TG_OP = 'UPDATE' AND OLD.stage_id != NEW.stage_id THEN
        -- Se moveu PARA etapa inicial
        IF is_initial_stage THEN
            NEW.initial_stage_entry_time := NOW();
            NEW.temperature_level := 'hot';
            NEW.temperature_updated_at := NOW();
        -- Se moveu DE etapa inicial para outra
        ELSE
            -- Manter temperatura mas parar de calcular automaticamente
            NEW.initial_stage_entry_time := NULL;
        END IF;
    
    -- Se está na etapa inicial, recalcular temperatura
    ELSIF is_initial_stage AND NEW.initial_stage_entry_time IS NOT NULL THEN
        new_temperature := calculate_temperature_level(
            NEW.pipeline_id,
            NEW.initial_stage_entry_time
        );
        
        NEW.temperature_level := new_temperature;
        NEW.temperature_updated_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS pipeline_leads_temperature_trigger ON pipeline_leads;
CREATE TRIGGER pipeline_leads_temperature_trigger
    BEFORE INSERT OR UPDATE ON pipeline_leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_temperature();

-- 6. INSERIR CONFIGURAÇÕES PADRÃO PARA PIPELINES EXISTENTES
-- =====================================================
INSERT INTO temperature_config (pipeline_id, hot_threshold, warm_threshold, cold_threshold)
SELECT DISTINCT 
    p.id as pipeline_id, 
    24, 72, 168
FROM pipelines p
WHERE NOT EXISTS (
    SELECT 1 FROM temperature_config tc 
    WHERE tc.pipeline_id = p.id
);

-- 7. ATUALIZAR LEADS EXISTENTES
-- =====================================================
-- Definir tempo inicial para leads já existentes na etapa inicial
UPDATE pipeline_leads 
SET 
    initial_stage_entry_time = created_at,
    temperature_level = 'hot',
    temperature_updated_at = NOW()
WHERE stage_id IN (
    SELECT ps.id 
    FROM pipeline_stages ps 
    WHERE ps.name = 'Novo Lead' OR ps.name = 'Novos Leads'
) 
AND initial_stage_entry_time IS NULL;

-- 8. FUNÇÃO PARA OBTER CONFIGURAÇÃO DE TEMPERATURA
-- =====================================================
CREATE OR REPLACE FUNCTION get_temperature_config(
    p_pipeline_id UUID
) RETURNS JSON AS $$
DECLARE
    config_record temperature_config%ROWTYPE;
    result JSON;
BEGIN
    SELECT * INTO config_record 
    FROM temperature_config 
    WHERE pipeline_id = p_pipeline_id;
    
    IF NOT FOUND THEN
        -- Retornar configuração padrão
        result := json_build_object(
            'hot_threshold', 24,
            'warm_threshold', 72,
            'cold_threshold', 168,
            'hot_color', '#ef4444',
            'warm_color', '#f97316',
            'cold_color', '#3b82f6',
            'frozen_color', '#6b7280',
            'hot_icon', '🔥',
            'warm_icon', '🌡️',
            'cold_icon', '❄️',
            'frozen_icon', '🧊'
        );
    ELSE
        result := row_to_json(config_record);
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 9. FUNÇÃO PARA ATUALIZAR CONFIGURAÇÃO DE TEMPERATURA
-- =====================================================
CREATE OR REPLACE FUNCTION update_temperature_config(
    p_pipeline_id UUID,
    p_hot_threshold INTEGER DEFAULT 24,
    p_warm_threshold INTEGER DEFAULT 72,
    p_cold_threshold INTEGER DEFAULT 168
) RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO temperature_config (
        pipeline_id, hot_threshold, warm_threshold, cold_threshold
    ) VALUES (
        p_pipeline_id, p_hot_threshold, p_warm_threshold, p_cold_threshold
    )
    ON CONFLICT (pipeline_id) DO UPDATE SET
        hot_threshold = EXCLUDED.hot_threshold,
        warm_threshold = EXCLUDED.warm_threshold,
        cold_threshold = EXCLUDED.cold_threshold,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 10. POLÍTICAS RLS
-- =====================================================
ALTER TABLE temperature_config ENABLE ROW LEVEL SECURITY;

-- Política permissiva para desenvolvimento
CREATE POLICY "permissive_temperature_config_access" ON temperature_config
    FOR ALL USING (
        -- Permitir acesso se o usuário está autenticado
        auth.uid() IS NOT NULL
    );

-- 11. ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_temperature_config_pipeline 
ON temperature_config(pipeline_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_leads_temperature_level 
ON pipeline_leads(temperature_level);

CREATE INDEX IF NOT EXISTS idx_pipeline_leads_initial_stage_time 
ON pipeline_leads(initial_stage_entry_time) 
WHERE initial_stage_entry_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_leads_pipeline_temperature
ON pipeline_leads(pipeline_id, temperature_level);

-- 12. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE temperature_config IS 'Configurações de temperatura automática por pipeline';
COMMENT ON COLUMN temperature_config.hot_threshold IS 'Limite em horas para temperatura QUENTE';
COMMENT ON COLUMN temperature_config.warm_threshold IS 'Limite em horas para temperatura MORNA';
COMMENT ON COLUMN temperature_config.cold_threshold IS 'Limite em horas para temperatura FRIA';
COMMENT ON COLUMN pipeline_leads.temperature_level IS 'Nível de temperatura: hot, warm, cold, frozen';
COMMENT ON COLUMN pipeline_leads.initial_stage_entry_time IS 'Momento de entrada na etapa inicial para cálculo de temperatura';

-- 13. TRIGGER PARA AUTO-SETUP DE CONFIGURAÇÃO
-- =====================================================
CREATE OR REPLACE FUNCTION auto_setup_temperature_config() RETURNS TRIGGER AS $$
BEGIN
    -- Inserir configuração padrão para nova pipeline
    INSERT INTO temperature_config (pipeline_id, hot_threshold, warm_threshold, cold_threshold)
    VALUES (NEW.id, 24, 72, 168)
    ON CONFLICT (pipeline_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para auto-setup
DROP TRIGGER IF EXISTS trigger_auto_setup_temperature_config ON pipelines;
CREATE TRIGGER trigger_auto_setup_temperature_config
    AFTER INSERT ON pipelines
    FOR EACH ROW
    EXECUTE FUNCTION auto_setup_temperature_config();

-- =====================================================
-- FIM DA MIGRAÇÃO: SISTEMA DE TEMPERATURA AUTOMÁTICO
-- ===================================================== 
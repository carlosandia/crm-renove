-- =====================================================
-- MIGRAÇÃO DE CORREÇÃO - COLUNAS TEMPERATURE E ESTRUTURA
-- Data: 2025-01-25
-- Descrição: Corrige estrutura das tabelas conforme esquema atual
-- =====================================================

-- 1. AJUSTAR TABELA pipeline_leads
-- =====================================================

-- Adicionar coluna temperature se não existir (para compatibilidade com código)
ALTER TABLE pipeline_leads 
ADD COLUMN IF NOT EXISTS temperature INTEGER DEFAULT 50;

-- Adicionar coluna status se não existir
ALTER TABLE pipeline_leads 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Renomear lead_data para custom_data se ainda não foi feito
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'pipeline_leads' AND column_name = 'lead_data') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'pipeline_leads' AND column_name = 'custom_data') THEN
        ALTER TABLE pipeline_leads RENAME COLUMN lead_data TO custom_data;
    END IF;
END $$;

-- 2. AJUSTAR TABELA pipeline_stages
-- =====================================================

-- Adicionar coluna is_system_stage se não existir
ALTER TABLE pipeline_stages 
ADD COLUMN IF NOT EXISTS is_system_stage BOOLEAN DEFAULT false;

-- Adicionar coluna updated_at se não existir
ALTER TABLE pipeline_stages 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. CORRIGIR ÍNDICES COM NOMES CORRETOS
-- =====================================================

-- Remover índices antigos se existirem
DROP INDEX IF EXISTS idx_pipeline_leads_temperature;
DROP INDEX IF EXISTS idx_pipeline_leads_status;

-- Criar índices com colunas corretas
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_temperature_level ON pipeline_leads(temperature_level);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_temperature ON pipeline_leads(temperature);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_status ON pipeline_leads(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_temperature_score ON pipeline_stages(temperature_score);

-- 4. SINCRONIZAR DADOS DE TEMPERATURA
-- =====================================================

-- Sincronizar temperature_level com temperature (se ambos existirem)
UPDATE pipeline_leads 
SET temperature = CASE 
    WHEN temperature_level = 'hot' THEN 75
    WHEN temperature_level = 'warm' THEN 50
    WHEN temperature_level = 'cold' THEN 25
    ELSE 50
END
WHERE temperature_level IS NOT NULL;

-- 5. GARANTIR ETAPAS DO SISTEMA PARA PIPELINES EXISTENTES
-- =====================================================

-- Atualizar etapas existentes como sistema se necessário
UPDATE pipeline_stages 
SET is_system_stage = true 
WHERE name IN ('Novos leads', 'Ganho', 'Perdido');

-- Garantir que todas as pipelines tenham as etapas do sistema
DO $$
DECLARE
    pipeline_record RECORD;
BEGIN
    FOR pipeline_record IN SELECT id FROM pipelines WHERE is_active = true
    LOOP
        -- Verificar se já tem etapas
        IF NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE pipeline_id = pipeline_record.id) THEN
            -- Criar etapas padrão
            INSERT INTO pipeline_stages (pipeline_id, name, order_index, color, temperature_score, is_system_stage) VALUES
            (pipeline_record.id, 'Novos leads', 1, '#EF4444', 25, true),
            (pipeline_record.id, 'Ganho', 98, '#10B981', 100, true),
            (pipeline_record.id, 'Perdido', 99, '#6B7280', 0, true);
        ELSE
            -- Garantir que etapas do sistema existem
            INSERT INTO pipeline_stages (pipeline_id, name, order_index, color, temperature_score, is_system_stage)
            SELECT pipeline_record.id, 'Novos leads', 1, '#EF4444', 25, true
            WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE pipeline_id = pipeline_record.id AND name = 'Novos leads');
            
            INSERT INTO pipeline_stages (pipeline_id, name, order_index, color, temperature_score, is_system_stage)
            SELECT pipeline_record.id, 'Ganho', 98, '#10B981', 100, true
            WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE pipeline_id = pipeline_record.id AND name = 'Ganho');
            
            INSERT INTO pipeline_stages (pipeline_id, name, order_index, color, temperature_score, is_system_stage)
            SELECT pipeline_record.id, 'Perdido', 99, '#6B7280', 0, true
            WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE pipeline_id = pipeline_record.id AND name = 'Perdido');
        END IF;
    END LOOP;
END $$;

-- 6. ATUALIZAR TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Trigger para pipeline_stages se não existir
DROP TRIGGER IF EXISTS update_pipeline_stages_updated_at ON pipeline_stages;
CREATE TRIGGER update_pipeline_stages_updated_at 
    BEFORE UPDATE ON pipeline_stages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. ATUALIZAR ESTATÍSTICAS
-- =====================================================

ANALYZE pipeline_leads;
ANALYZE pipeline_stages;

-- =====================================================
-- FIM DA MIGRAÇÃO DE CORREÇÃO
-- ===================================================== 
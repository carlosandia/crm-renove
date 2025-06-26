-- =====================================================
-- MIGRAÇÃO MANUAL - CORREÇÃO DE TEMPERATURA
-- Data: 2025-01-25
-- EXECUTE ESTE SQL MANUALMENTE NO DASHBOARD DO SUPABASE
-- =====================================================

-- 1. ADICIONAR COLUNAS FALTANTES
-- =====================================================

-- Adicionar coluna temperature na tabela pipeline_leads
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'temperature') THEN
        ALTER TABLE pipeline_leads ADD COLUMN temperature INTEGER DEFAULT 50;
    END IF;
END $$;

-- Adicionar coluna status na tabela pipeline_leads  
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'status') THEN
        ALTER TABLE pipeline_leads ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    END IF;
END $$;

-- Adicionar coluna is_system_stage na tabela pipeline_stages
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_stages' AND column_name = 'is_system_stage') THEN
        ALTER TABLE pipeline_stages ADD COLUMN is_system_stage BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Adicionar coluna updated_at na tabela pipeline_stages
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_stages' AND column_name = 'updated_at') THEN
        ALTER TABLE pipeline_stages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 2. RENOMEAR COLUNA SE NECESSÁRIO
-- =====================================================

-- Verificar se precisa renomear lead_data para custom_data
-- Execute apenas se a coluna lead_data existir e custom_data não existir:
-- ALTER TABLE pipeline_leads RENAME COLUMN lead_data TO custom_data;

-- 3. CRIAR ÍNDICES
-- =====================================================

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_temperature ON pipeline_leads(temperature);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_status ON pipeline_leads(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_temperature_level ON pipeline_leads(temperature_level);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_temperature_score ON pipeline_stages(temperature_score);

-- 4. SINCRONIZAR DADOS DE TEMPERATURA
-- =====================================================

-- Sincronizar temperature_level com temperature
UPDATE pipeline_leads 
SET temperature = CASE 
    WHEN temperature_level = 'hot' THEN 75
    WHEN temperature_level = 'warm' THEN 50
    WHEN temperature_level = 'cold' THEN 25
    ELSE 50
END
WHERE temperature_level IS NOT NULL AND temperature IS NULL;

-- 5. MARCAR ETAPAS DO SISTEMA
-- =====================================================

-- Marcar etapas existentes como sistema
UPDATE pipeline_stages 
SET is_system_stage = true 
WHERE name IN ('Novos leads', 'Ganho', 'Perdido') AND is_system_stage IS NULL;

-- 6. CRIAR FUNÇÃO PARA UPDATED_AT
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. CRIAR TRIGGER
-- =====================================================

-- Trigger para pipeline_stages
DROP TRIGGER IF EXISTS update_pipeline_stages_updated_at ON pipeline_stages;
CREATE TRIGGER update_pipeline_stages_updated_at 
    BEFORE UPDATE ON pipeline_stages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 8. ATUALIZAR ESTATÍSTICAS
-- =====================================================

ANALYZE pipeline_leads;
ANALYZE pipeline_stages;

-- =====================================================
-- INSTRUÇÕES:
-- 1. Copie e cole este SQL no SQL Editor do Supabase
-- 2. Execute tudo de uma vez
-- 3. Verifique se não há erros
-- ===================================================== 
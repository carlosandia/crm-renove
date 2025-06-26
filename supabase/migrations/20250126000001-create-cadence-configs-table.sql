-- =====================================================
-- MIGRAÇÃO - CRIAÇÃO DA TABELA CADENCE_CONFIGS
-- Data: 2025-01-26
-- Descrição: Criar tabela para armazenar configurações de cadência
-- =====================================================

-- 1. CRIAR TABELA CADENCE_CONFIGS
-- =====================================================

CREATE TABLE IF NOT EXISTS cadence_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    stage_order INTEGER DEFAULT 0,
    tasks JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ADICIONAR FOREIGN KEY
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cadence_configs_pipeline_id' 
        AND table_name = 'cadence_configs'
    ) THEN
        ALTER TABLE cadence_configs 
        ADD CONSTRAINT fk_cadence_configs_pipeline_id 
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. CRIAR ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_cadence_configs_pipeline_id ON cadence_configs(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_cadence_configs_stage_order ON cadence_configs(pipeline_id, stage_order);
CREATE INDEX IF NOT EXISTS idx_cadence_configs_active ON cadence_configs(is_active);

-- 4. HABILITAR RLS COM POLÍTICA PERMISSIVA
-- =====================================================

ALTER TABLE cadence_configs ENABLE ROW LEVEL SECURITY;

-- Criar política permissiva para desenvolvimento
CREATE POLICY "allow_all_cadence_configs" ON cadence_configs FOR ALL USING (true) WITH CHECK (true);

-- 5. CRIAR TRIGGER PARA UPDATED_AT
-- =====================================================

DROP TRIGGER IF EXISTS update_cadence_configs_updated_at ON cadence_configs;
CREATE TRIGGER update_cadence_configs_updated_at 
    BEFORE UPDATE ON cadence_configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. CRIAR TRIGGER PARA SINCRONIZAR TENANT_ID
-- =====================================================

DROP TRIGGER IF EXISTS sync_cadence_configs_tenant_id ON cadence_configs;
CREATE TRIGGER sync_cadence_configs_tenant_id
    BEFORE INSERT OR UPDATE ON cadence_configs
    FOR EACH ROW
    EXECUTE FUNCTION sync_tenant_id();

-- =====================================================
-- MIGRAÇÃO CONCLUÍDA
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Tabela cadence_configs criada com sucesso!';
    RAISE NOTICE 'Políticas RLS permissivas aplicadas';
    RAISE NOTICE 'Triggers de sincronização configurados';
END $$; 
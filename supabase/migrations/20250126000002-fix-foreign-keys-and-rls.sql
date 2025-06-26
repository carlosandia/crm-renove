-- =====================================================
-- MIGRAÇÃO - CORREÇÃO DE FOREIGN KEYS E RLS
-- Data: 2025-01-26
-- Descrição: Corrigir foreign keys faltantes e RLS policies
-- =====================================================

-- 1. ADICIONAR FOREIGN KEY PARA pipeline_win_loss_reasons
-- =====================================================

DO $$
BEGIN
    -- Verificar se a foreign key já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_pipeline_win_loss_reasons_pipeline_id' 
        AND table_name = 'pipeline_win_loss_reasons'
    ) THEN
        -- Adicionar foreign key
        ALTER TABLE pipeline_win_loss_reasons 
        ADD CONSTRAINT fk_pipeline_win_loss_reasons_pipeline_id 
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign key adicionada para pipeline_win_loss_reasons';
    ELSE
        RAISE NOTICE 'Foreign key já existe para pipeline_win_loss_reasons';
    END IF;
END $$;

-- 2. CRIAR POLÍTICAS RLS PERMISSIVAS PARA DESENVOLVIMENTO
-- =====================================================

-- pipeline_win_loss_reasons
ALTER TABLE pipeline_win_loss_reasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_pipeline_win_loss_reasons" ON pipeline_win_loss_reasons;
CREATE POLICY "allow_all_pipeline_win_loss_reasons" ON pipeline_win_loss_reasons FOR ALL USING (true) WITH CHECK (true);

-- 3. VERIFICAR E CORRIGIR OUTRAS TABELAS RELACIONADAS
-- =====================================================

-- Verificar se cadence_configs existe e criar se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'cadence_configs'
    ) THEN
        -- Criar tabela cadence_configs
        CREATE TABLE cadence_configs (
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
        
        -- Adicionar foreign key
        ALTER TABLE cadence_configs 
        ADD CONSTRAINT fk_cadence_configs_pipeline_id 
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE;
        
        -- Criar índices
        CREATE INDEX idx_cadence_configs_pipeline_id ON cadence_configs(pipeline_id);
        CREATE INDEX idx_cadence_configs_stage_order ON cadence_configs(pipeline_id, stage_order);
        CREATE INDEX idx_cadence_configs_active ON cadence_configs(is_active);
        
        -- Habilitar RLS
        ALTER TABLE cadence_configs ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "allow_all_cadence_configs" ON cadence_configs FOR ALL USING (true) WITH CHECK (true);
        
        -- Criar trigger para updated_at
        DROP TRIGGER IF EXISTS update_cadence_configs_updated_at ON cadence_configs;
        CREATE TRIGGER update_cadence_configs_updated_at 
            BEFORE UPDATE ON cadence_configs 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Tabela cadence_configs criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela cadence_configs já existe';
        
        -- Garantir que RLS está configurado
        ALTER TABLE cadence_configs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "allow_all_cadence_configs" ON cadence_configs;
        CREATE POLICY "allow_all_cadence_configs" ON cadence_configs FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. VERIFICAR POLÍTICAS RLS PERMISSIVAS PARA OUTRAS TABELAS
-- =====================================================

-- pipeline_members
ALTER TABLE pipeline_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dev_permissive_pipeline_members" ON pipeline_members;
CREATE POLICY "dev_permissive_pipeline_members" ON pipeline_members FOR ALL USING (true) WITH CHECK (true);

-- pipeline_stages  
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dev_permissive_pipeline_stages" ON pipeline_stages;
CREATE POLICY "dev_permissive_pipeline_stages" ON pipeline_stages FOR ALL USING (true) WITH CHECK (true);

-- pipeline_custom_fields
ALTER TABLE pipeline_custom_fields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dev_permissive_pipeline_custom_fields" ON pipeline_custom_fields;
CREATE POLICY "dev_permissive_pipeline_custom_fields" ON pipeline_custom_fields FOR ALL USING (true) WITH CHECK (true);

-- pipeline_leads
ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dev_permissive_pipeline_leads" ON pipeline_leads;
CREATE POLICY "dev_permissive_pipeline_leads" ON pipeline_leads FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- MIGRAÇÃO CONCLUÍDA
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migração de correção concluída com sucesso!';
    RAISE NOTICE '🔗 Foreign keys corrigidas';
    RAISE NOTICE '🔒 Políticas RLS permissivas aplicadas';
    RAISE NOTICE '📋 Tabela cadence_configs verificada/criada';
END $$; 
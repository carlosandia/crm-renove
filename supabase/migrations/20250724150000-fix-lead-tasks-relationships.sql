-- =============================================================================
-- MIGRATION: Fix lead_tasks table relationships
-- Data: 2025-07-24 15:00:00
-- Descrição: Adicionar foreign keys necessárias para relacionar lead_tasks com outras tabelas
-- =============================================================================

-- ✅ Primeiro, verificar se as constraints já existem e removê-las se necessário
DO $$ 
BEGIN
    -- Remover constraints existentes se houver (para recriar corretamente)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_lead_tasks_pipeline_id' 
               AND table_name = 'lead_tasks') THEN
        ALTER TABLE lead_tasks DROP CONSTRAINT fk_lead_tasks_pipeline_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_lead_tasks_lead_id' 
               AND table_name = 'lead_tasks') THEN
        ALTER TABLE lead_tasks DROP CONSTRAINT fk_lead_tasks_lead_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_lead_tasks_stage_id' 
               AND table_name = 'lead_tasks') THEN
        ALTER TABLE lead_tasks DROP CONSTRAINT fk_lead_tasks_stage_id;
    END IF;
END $$;

-- =============================================================================
-- 1. ADICIONAR FOREIGN KEY: lead_tasks -> pipelines
-- =============================================================================

-- Verificar se a tabela pipelines existe
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipelines') THEN
        -- Adicionar constraint para pipeline_id
        ALTER TABLE lead_tasks 
            ADD CONSTRAINT fk_lead_tasks_pipeline_id 
            FOREIGN KEY (pipeline_id) 
            REFERENCES pipelines(id) 
            ON DELETE CASCADE
            ON UPDATE CASCADE;
        
        RAISE NOTICE 'Foreign key fk_lead_tasks_pipeline_id adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela pipelines não encontrada - pulando constraint pipeline_id';
    END IF;
END $$;

-- =============================================================================
-- 2. ADICIONAR FOREIGN KEY: lead_tasks -> leads_master  
-- =============================================================================

-- Verificar se a tabela leads_master existe
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads_master') THEN
        -- Adicionar constraint para lead_id
        ALTER TABLE lead_tasks 
            ADD CONSTRAINT fk_lead_tasks_lead_id 
            FOREIGN KEY (lead_id) 
            REFERENCES leads_master(id) 
            ON DELETE CASCADE
            ON UPDATE CASCADE;
        
        RAISE NOTICE 'Foreign key fk_lead_tasks_lead_id adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela leads_master não encontrada - pulando constraint lead_id';
    END IF;
END $$;

-- =============================================================================
-- 3. ADICIONAR FOREIGN KEY: lead_tasks -> pipeline_stages (etapa_id)
-- =============================================================================

-- Verificar se a tabela pipeline_stages existe
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipeline_stages') THEN
        -- Adicionar constraint para etapa_id
        ALTER TABLE lead_tasks 
            ADD CONSTRAINT fk_lead_tasks_stage_id 
            FOREIGN KEY (etapa_id) 
            REFERENCES pipeline_stages(id) 
            ON DELETE CASCADE
            ON UPDATE CASCADE;
        
        RAISE NOTICE 'Foreign key fk_lead_tasks_stage_id adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela pipeline_stages não encontrada - pulando constraint etapa_id';
    END IF;
END $$;

-- =============================================================================
-- 4. VERIFICAR E CORRIGIR DADOS ÓRFÃOS (OPCIONAL)
-- =============================================================================

-- Verificar e reportar dados órfãos que impediriam as foreign keys
DO $$ 
DECLARE
    orphan_count integer;
BEGIN
    -- Verificar leads órfãos (lead_id que não existe em leads_master)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads_master') THEN
        SELECT COUNT(*) INTO orphan_count
        FROM lead_tasks lt
        LEFT JOIN leads_master lm ON lt.lead_id = lm.id
        WHERE lm.id IS NULL;
        
        IF orphan_count > 0 THEN
            RAISE NOTICE 'ATENÇÃO: % registros órfãos encontrados em lead_tasks (lead_id não existe em leads_master)', orphan_count;
        END IF;
    END IF;
    
    -- Verificar pipelines órfãos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipelines') THEN
        SELECT COUNT(*) INTO orphan_count
        FROM lead_tasks lt
        LEFT JOIN pipelines p ON lt.pipeline_id = p.id
        WHERE p.id IS NULL;
        
        IF orphan_count > 0 THEN
            RAISE NOTICE 'ATENÇÃO: % registros órfãos encontrados em lead_tasks (pipeline_id não existe em pipelines)', orphan_count;
        END IF;
    END IF;
    
    -- Verificar stages órfãos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipeline_stages') THEN
        SELECT COUNT(*) INTO orphan_count
        FROM lead_tasks lt
        LEFT JOIN pipeline_stages ps ON lt.etapa_id = ps.id
        WHERE ps.id IS NULL;
        
        IF orphan_count > 0 THEN
            RAISE NOTICE 'ATENÇÃO: % registros órfãos encontrados em lead_tasks (etapa_id não existe em pipeline_stages)', orphan_count;
        END IF;
    END IF;
END $$;

-- =============================================================================
-- 5. CRIAR ÍNDICES PARA PERFORMANCE
-- =============================================================================

-- Índices compostos para queries comuns
CREATE INDEX IF NOT EXISTS idx_lead_tasks_tenant_pipeline 
    ON lead_tasks(tenant_id, pipeline_id);

CREATE INDEX IF NOT EXISTS idx_lead_tasks_tenant_lead 
    ON lead_tasks(tenant_id, lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_tasks_pipeline_lead 
    ON lead_tasks(pipeline_id, lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_tasks_status_programada 
    ON lead_tasks(status, data_programada) 
    WHERE status IS NOT NULL;

-- =============================================================================
-- 6. ATUALIZAR COMENTÁRIOS DAS CONSTRAINTS
-- =============================================================================

-- Adicionar comentários para documentação
COMMENT ON CONSTRAINT fk_lead_tasks_pipeline_id ON lead_tasks 
    IS 'Foreign key para pipelines - cada task pertence a um pipeline específico';

COMMENT ON CONSTRAINT fk_lead_tasks_lead_id ON lead_tasks 
    IS 'Foreign key para leads_master - cada task está associada a um lead';

COMMENT ON CONSTRAINT fk_lead_tasks_stage_id ON lead_tasks 
    IS 'Foreign key para pipeline_stages - cada task pertence a uma etapa específica';

-- =============================================================================
-- FINALIZAÇÃO
-- =============================================================================

-- Log de sucesso
DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration concluída com sucesso!';
    RAISE NOTICE 'Foreign keys adicionadas à tabela lead_tasks:';
    RAISE NOTICE '  - fk_lead_tasks_pipeline_id (lead_tasks.pipeline_id -> pipelines.id)';
    RAISE NOTICE '  - fk_lead_tasks_lead_id (lead_tasks.lead_id -> leads_master.id)';
    RAISE NOTICE '  - fk_lead_tasks_stage_id (lead_tasks.etapa_id -> pipeline_stages.id)';
    RAISE NOTICE '  - Índices de performance criados';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Próximo passo: Regenerar tipos TypeScript do Supabase';
    RAISE NOTICE '   npx supabase gen types typescript --local > src/integrations/supabase/types.ts';
END $$;
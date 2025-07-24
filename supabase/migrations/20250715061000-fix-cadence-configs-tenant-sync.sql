-- =====================================================
-- MIGRAÇÃO - CORRIGIR SYNC_TENANT_ID PARA CADENCE_CONFIGS  
-- Data: 2025-07-15
-- Descrição: Adicionar suporte para cadence_configs na função sync_tenant_id
-- =====================================================

-- 1. ATUALIZAR FUNÇÃO SYNC_TENANT_ID
-- =====================================================

CREATE OR REPLACE FUNCTION sync_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Para pipeline_stages, copiar tenant_id da pipeline
    IF TG_TABLE_NAME = 'pipeline_stages' THEN
        SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
    END IF;
    
    -- Para pipeline_custom_fields, copiar tenant_id da pipeline
    IF TG_TABLE_NAME = 'pipeline_custom_fields' THEN
        SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
    END IF;
    
    -- Para pipeline_members, copiar tenant_id da pipeline
    IF TG_TABLE_NAME = 'pipeline_members' THEN
        SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
    END IF;
    
    -- Para pipeline_leads, copiar tenant_id da pipeline
    IF TG_TABLE_NAME = 'pipeline_leads' THEN
        SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
    END IF;
    
    -- 🔧 CORREÇÃO: Para cadence_configs, copiar tenant_id da pipeline
    IF TG_TABLE_NAME = 'cadence_configs' THEN
        SELECT tenant_id INTO NEW.tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
        
        -- Log para debugging
        RAISE NOTICE 'sync_tenant_id: cadence_configs - pipeline_id: %, tenant_id: %', 
            NEW.pipeline_id, NEW.tenant_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. RECRIAR TRIGGER PARA CADENCE_CONFIGS
-- =====================================================

DROP TRIGGER IF EXISTS sync_cadence_configs_tenant_id ON cadence_configs;
CREATE TRIGGER sync_cadence_configs_tenant_id
    BEFORE INSERT OR UPDATE ON cadence_configs
    FOR EACH ROW
    EXECUTE FUNCTION sync_tenant_id();

-- 3. SINCRONIZAR DADOS EXISTENTES
-- =====================================================

UPDATE cadence_configs 
SET tenant_id = p.tenant_id 
FROM pipelines p 
WHERE cadence_configs.pipeline_id = p.id 
AND (cadence_configs.tenant_id IS NULL OR cadence_configs.tenant_id != p.tenant_id);

-- 4. VERIFICAR RESULTADOS
-- =====================================================

DO $$
DECLARE
    cadence_count integer;
    updated_count integer;
BEGIN
    -- Contar cadences totais
    SELECT COUNT(*) INTO cadence_count FROM cadence_configs;
    
    -- Contar cadences com tenant_id correto
    SELECT COUNT(*) INTO updated_count 
    FROM cadence_configs cc
    JOIN pipelines p ON cc.pipeline_id = p.id
    WHERE cc.tenant_id = p.tenant_id;
    
    RAISE NOTICE '✅ Função sync_tenant_id atualizada';
    RAISE NOTICE '📊 Total cadences: %, com tenant_id correto: %', cadence_count, updated_count;
    
    IF cadence_count = updated_count THEN
        RAISE NOTICE '🎯 Todos os registros de cadence_configs estão sincronizados';
    ELSE
        RAISE WARNING '⚠️ Alguns registros podem ter problema de tenant_id';
    END IF;
END $$;
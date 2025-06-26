-- =====================================================
-- MIGRAÇÃO: NOMENCLATURA PROFISSIONAL DE STAGES
-- Data: 2025-01-27
-- Objetivo: Alinhar nomenclatura com grandes CRMs (Salesforce, HubSpot, Pipedrive)
-- =====================================================

-- 1. GARANTIR QUE COLUNA is_system_stage EXISTE
-- =====================================================
DO $$ 
BEGIN
    -- Verificar e adicionar coluna is_system_stage se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pipeline_stages' AND column_name = 'is_system_stage'
    ) THEN
        ALTER TABLE pipeline_stages ADD COLUMN is_system_stage BOOLEAN DEFAULT false;
        RAISE NOTICE 'Coluna is_system_stage adicionada à tabela pipeline_stages';
    ELSE
        RAISE NOTICE 'Coluna is_system_stage já existe';
    END IF;
END $$;

-- 2. ATUALIZAR NOMENCLATURA DOS STAGES DO SISTEMA
-- =====================================================

-- Atualizar stages "Novos leads" para "Lead" (primeira etapa)
UPDATE pipeline_stages 
SET 
    name = 'Lead',
    is_system_stage = true,
    temperature_score = COALESCE(temperature_score, 20),
    color = COALESCE(color, '#3B82F6')
WHERE (
    name ILIKE '%novo%lead%' OR 
    name ILIKE '%novos%lead%' OR
    name ILIKE '%novo%' OR
    order_index = 0
) AND (
    is_system_stage IS NULL OR 
    is_system_stage = false OR
    name != 'Lead'
);

-- Atualizar stages "Ganho" para "Closed Won" (penúltima etapa)
UPDATE pipeline_stages 
SET 
    name = 'Closed Won',
    is_system_stage = true,
    temperature_score = 100,
    color = COALESCE(color, '#10B981')
WHERE (
    name ILIKE '%ganho%' OR 
    name ILIKE '%won%' OR
    name ILIKE '%vendido%' OR
    name ILIKE '%fechado%'
) AND (
    is_system_stage IS NULL OR 
    is_system_stage = false OR
    name != 'Closed Won'
);

-- Atualizar stages "Perdido" para "Closed Lost" (última etapa)
UPDATE pipeline_stages 
SET 
    name = 'Closed Lost',
    is_system_stage = true,
    temperature_score = 0,
    color = COALESCE(color, '#EF4444')
WHERE (
    name ILIKE '%perdido%' OR 
    name ILIKE '%lost%' OR
    name ILIKE '%descartado%' OR
    name ILIKE '%cancelado%'
) AND (
    is_system_stage IS NULL OR 
    is_system_stage = false OR
    name != 'Closed Lost'
);

-- 3. GARANTIR ORDEM CORRETA DOS STAGES DO SISTEMA
-- =====================================================

-- Função para reorganizar order_index dos stages do sistema
DO $$
DECLARE
    pipeline_record RECORD;
    lead_stage_id UUID;
    won_stage_id UUID;
    lost_stage_id UUID;
    max_custom_order INTEGER;
BEGIN
    -- Para cada pipeline
    FOR pipeline_record IN SELECT DISTINCT pipeline_id FROM pipeline_stages
    LOOP
        RAISE NOTICE 'Reorganizando stages da pipeline: %', pipeline_record.pipeline_id;
        
        -- Encontrar IDs dos stages do sistema
        SELECT id INTO lead_stage_id 
        FROM pipeline_stages 
        WHERE pipeline_id = pipeline_record.pipeline_id 
        AND name = 'Lead' AND is_system_stage = true
        LIMIT 1;
        
        SELECT id INTO won_stage_id 
        FROM pipeline_stages 
        WHERE pipeline_id = pipeline_record.pipeline_id 
        AND name = 'Closed Won' AND is_system_stage = true
        LIMIT 1;
        
        SELECT id INTO lost_stage_id 
        FROM pipeline_stages 
        WHERE pipeline_id = pipeline_record.pipeline_id 
        AND name = 'Closed Lost' AND is_system_stage = true
        LIMIT 1;
        
        -- Encontrar maior order_index dos stages customizados
        SELECT COALESCE(MAX(order_index), 0) INTO max_custom_order
        FROM pipeline_stages 
        WHERE pipeline_id = pipeline_record.pipeline_id 
        AND (is_system_stage = false OR is_system_stage IS NULL);
        
        -- Atualizar order_index dos stages do sistema
        IF lead_stage_id IS NOT NULL THEN
            UPDATE pipeline_stages 
            SET order_index = 0 
            WHERE id = lead_stage_id;
            RAISE NOTICE 'Stage Lead definido como order_index = 0';
        END IF;
        
        IF won_stage_id IS NOT NULL THEN
            UPDATE pipeline_stages 
            SET order_index = max_custom_order + 1 
            WHERE id = won_stage_id;
            RAISE NOTICE 'Stage Closed Won definido como order_index = %', max_custom_order + 1;
        END IF;
        
        IF lost_stage_id IS NOT NULL THEN
            UPDATE pipeline_stages 
            SET order_index = max_custom_order + 2 
            WHERE id = lost_stage_id;
            RAISE NOTICE 'Stage Closed Lost definido como order_index = %', max_custom_order + 2;
        END IF;
        
    END LOOP;
END $$;

-- 4. CRIAR STAGES DO SISTEMA PARA PIPELINES QUE NÃO TÊM
-- =====================================================

DO $$
DECLARE
    pipeline_record RECORD;
    has_lead_stage BOOLEAN;
    has_won_stage BOOLEAN;
    has_lost_stage BOOLEAN;
    max_order INTEGER;
BEGIN
    -- Para cada pipeline ativa
    FOR pipeline_record IN 
        SELECT DISTINCT p.id, p.name 
        FROM pipelines p 
        WHERE p.is_active = true OR p.is_active IS NULL
    LOOP
        RAISE NOTICE 'Verificando pipeline: % (%)', pipeline_record.name, pipeline_record.id;
        
        -- Verificar se tem stages do sistema
        SELECT EXISTS(
            SELECT 1 FROM pipeline_stages 
            WHERE pipeline_id = pipeline_record.id 
            AND name = 'Lead' AND is_system_stage = true
        ) INTO has_lead_stage;
        
        SELECT EXISTS(
            SELECT 1 FROM pipeline_stages 
            WHERE pipeline_id = pipeline_record.id 
            AND name = 'Closed Won' AND is_system_stage = true
        ) INTO has_won_stage;
        
        SELECT EXISTS(
            SELECT 1 FROM pipeline_stages 
            WHERE pipeline_id = pipeline_record.id 
            AND name = 'Closed Lost' AND is_system_stage = true
        ) INTO has_lost_stage;
        
        -- Obter maior order_index existente
        SELECT COALESCE(MAX(order_index), -1) INTO max_order
        FROM pipeline_stages 
        WHERE pipeline_id = pipeline_record.id;
        
        -- Criar stage Lead se não existir
        IF NOT has_lead_stage THEN
            INSERT INTO pipeline_stages (
                pipeline_id, name, order_index, temperature_score, 
                max_days_allowed, color, is_system_stage, created_at, updated_at
            ) VALUES (
                pipeline_record.id, 'Lead', 0, 20,
                30, '#3B82F6', true, NOW(), NOW()
            );
            RAISE NOTICE 'Stage Lead criado para pipeline %', pipeline_record.name;
        END IF;
        
        -- Criar stage Closed Won se não existir
        IF NOT has_won_stage THEN
            INSERT INTO pipeline_stages (
                pipeline_id, name, order_index, temperature_score, 
                max_days_allowed, color, is_system_stage, created_at, updated_at
            ) VALUES (
                pipeline_record.id, 'Closed Won', max_order + 1, 100,
                NULL, '#10B981', true, NOW(), NOW()
            );
            RAISE NOTICE 'Stage Closed Won criado para pipeline %', pipeline_record.name;
        END IF;
        
        -- Criar stage Closed Lost se não existir
        IF NOT has_lost_stage THEN
            INSERT INTO pipeline_stages (
                pipeline_id, name, order_index, temperature_score, 
                max_days_allowed, color, is_system_stage, created_at, updated_at
            ) VALUES (
                pipeline_record.id, 'Closed Lost', max_order + 2, 0,
                NULL, '#EF4444', true, NOW(), NOW()
            );
            RAISE NOTICE 'Stage Closed Lost criado para pipeline %', pipeline_record.name;
        END IF;
        
    END LOOP;
END $$;

-- 5. CRIAR FUNÇÃO PARA IDENTIFICAR STAGES DO SISTEMA
-- =====================================================

CREATE OR REPLACE FUNCTION get_system_stages(pipeline_id_param UUID)
RETURNS TABLE (
    lead_stage_id UUID,
    won_stage_id UUID,
    lost_stage_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT id FROM pipeline_stages 
         WHERE pipeline_id = pipeline_id_param 
         AND name = 'Lead' AND is_system_stage = true LIMIT 1) as lead_stage_id,
        (SELECT id FROM pipeline_stages 
         WHERE pipeline_id = pipeline_id_param 
         AND name = 'Closed Won' AND is_system_stage = true LIMIT 1) as won_stage_id,
        (SELECT id FROM pipeline_stages 
         WHERE pipeline_id = pipeline_id_param 
         AND name = 'Closed Lost' AND is_system_stage = true LIMIT 1) as lost_stage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. VERIFICAÇÃO FINAL E RELATÓRIO
-- =====================================================

DO $$
DECLARE
    total_pipelines INTEGER;
    pipelines_with_all_stages INTEGER;
    total_system_stages INTEGER;
BEGIN
    -- Contar pipelines
    SELECT COUNT(DISTINCT id) INTO total_pipelines FROM pipelines WHERE is_active = true;
    
    -- Contar pipelines com todos os stages do sistema
    SELECT COUNT(DISTINCT pipeline_id) INTO pipelines_with_all_stages
    FROM pipeline_stages 
    WHERE is_system_stage = true 
    AND name IN ('Lead', 'Closed Won', 'Closed Lost')
    GROUP BY pipeline_id
    HAVING COUNT(*) = 3;
    
    -- Contar total de stages do sistema
    SELECT COUNT(*) INTO total_system_stages
    FROM pipeline_stages 
    WHERE is_system_stage = true 
    AND name IN ('Lead', 'Closed Won', 'Closed Lost');
    
    RAISE NOTICE '=== RELATÓRIO FINAL ===';
    RAISE NOTICE 'Total de pipelines ativas: %', total_pipelines;
    RAISE NOTICE 'Pipelines com todos os stages do sistema: %', pipelines_with_all_stages;
    RAISE NOTICE 'Total de stages do sistema criados: %', total_system_stages;
    RAISE NOTICE 'Migração concluída com sucesso!';
END $$;

-- =====================================================
-- MIGRAÇÃO CONCLUÍDA
-- Nomenclatura atualizada para padrões profissionais:
-- - Lead (primeira etapa)
-- - Closed Won (penúltima etapa) 
-- - Closed Lost (última etapa)
-- =====================================================

SELECT 'Nomenclatura profissional de stages implementada com sucesso!' as status; 
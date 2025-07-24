-- =====================================================
-- CORREÇÃO CRÍTICA: REMOVER CRIAÇÃO AUTOMÁTICA DE ETAPAS
-- Data: 2025-07-14
-- Problema: Pipeline mostra "10 etapas" mas só 5 são visíveis
-- Causa: Triggers e funções criam etapas automáticas duplicadas
-- =====================================================

-- 1. REMOVER TRIGGERS QUE CRIAM ETAPAS AUTOMÁTICAS
-- =====================================================

-- Remover trigger de auto-setup que cria etapas duplicadas
DROP TRIGGER IF EXISTS trigger_auto_setup_pipeline ON pipelines;
DROP TRIGGER IF EXISTS trigger_auto_setup_temperature_config ON pipelines;

-- Verificar se há outros triggers problemáticos
DROP TRIGGER IF EXISTS ensure_stages_trigger ON pipelines;
DROP TRIGGER IF EXISTS create_default_stages_trigger ON pipelines;

-- 2. REMOVER/RENOMEAR FUNÇÕES PROBLEMÁTICAS
-- =====================================================

-- Remover função que cria 5 etapas automáticas (Novo Lead, Contato Inicial, Proposta, Ganho, Perdido)
DROP FUNCTION IF EXISTS ensure_pipeline_stages(UUID);
DROP FUNCTION IF EXISTS auto_setup_pipeline();

-- Renomear funções antigas para evitar execução acidental
DROP FUNCTION IF EXISTS ensure_pipeline_stages_deprecated(UUID);
DROP FUNCTION IF EXISTS auto_setup_pipeline_deprecated();

-- 3. IDENTIFICAR E REMOVER ETAPAS FANTASMA
-- =====================================================

-- Identificar pipelines com etapas duplicadas ou extras
DO $$
DECLARE
    pipeline_record RECORD;
    stage_count INTEGER;
    extra_stages_count INTEGER;
BEGIN
    RAISE NOTICE '=== DIAGNÓSTICO DE ETAPAS DUPLICADAS ===';
    
    FOR pipeline_record IN 
        SELECT p.id, p.name, COUNT(ps.id) as total_stages
        FROM pipelines p 
        LEFT JOIN pipeline_stages ps ON p.id = ps.pipeline_id
        WHERE p.is_active = true OR p.is_active IS NULL
        GROUP BY p.id, p.name
        HAVING COUNT(ps.id) > 5
    LOOP
        RAISE NOTICE 'Pipeline: % (%) - % etapas encontradas', 
            pipeline_record.name, 
            pipeline_record.id, 
            pipeline_record.total_stages;
            
        -- Listar etapas desta pipeline
        FOR stage_record IN 
            SELECT name, order_index, is_system_stage, color
            FROM pipeline_stages 
            WHERE pipeline_id = pipeline_record.id
            ORDER BY order_index
        LOOP
            RAISE NOTICE '  - Etapa: % (índice: %, sistema: %, cor: %)', 
                stage_record.name, 
                stage_record.order_index, 
                stage_record.is_system_stage,
                stage_record.color;
        END LOOP;
    END LOOP;
END $$;

-- 4. REMOVER ETAPAS DUPLICADAS AUTOMATICAMENTE CRIADAS
-- =====================================================

-- Remover etapas duplicadas criadas pelas funções automáticas
-- Manter apenas: Lead, Ganho, Perdido (etapas obrigatórias do sistema)

DO $$
DECLARE
    pipeline_record RECORD;
    lead_stage_id UUID;
    ganho_stage_id UUID;
    perdido_stage_id UUID;
    stages_removed INTEGER := 0;
BEGIN
    RAISE NOTICE '=== REMOVENDO ETAPAS FANTASMA ===';
    
    FOR pipeline_record IN 
        SELECT DISTINCT id, name FROM pipelines WHERE is_active = true OR is_active IS NULL
    LOOP
        RAISE NOTICE 'Limpando pipeline: %', pipeline_record.name;
        
        -- Identificar etapas legítimas do sistema
        SELECT id INTO lead_stage_id FROM pipeline_stages 
        WHERE pipeline_id = pipeline_record.id 
        AND (name = 'Lead' OR name ILIKE '%lead%' AND order_index = 0)
        ORDER BY created_at ASC LIMIT 1;
        
        SELECT id INTO ganho_stage_id FROM pipeline_stages 
        WHERE pipeline_id = pipeline_record.id 
        AND (name = 'Ganho' OR name ILIKE '%ganho%' OR name ILIKE '%won%')
        ORDER BY created_at ASC LIMIT 1;
        
        SELECT id INTO perdido_stage_id FROM pipeline_stages 
        WHERE pipeline_id = pipeline_record.id 
        AND (name = 'Perdido' OR name ILIKE '%perdido%' OR name ILIKE '%lost%')
        ORDER BY created_at ASC LIMIT 1;
        
        -- Remover etapas automáticas indesejadas
        DELETE FROM pipeline_stages 
        WHERE pipeline_id = pipeline_record.id
        AND name IN (
            'Novo Lead', 'Novos leads', 'Contato Inicial', 'Proposta', 
            'Closed Won', 'Closed Lost', 'Qualificação', 'Negociação'
        )
        AND id NOT IN (
            COALESCE(lead_stage_id, '00000000-0000-0000-0000-000000000000'::UUID),
            COALESCE(ganho_stage_id, '00000000-0000-0000-0000-000000000000'::UUID),
            COALESCE(perdido_stage_id, '00000000-0000-0000-0000-000000000000'::UUID)
        );
        
        GET DIAGNOSTICS stages_removed = ROW_COUNT;
        
        IF stages_removed > 0 THEN
            RAISE NOTICE '  - Removidas % etapas automáticas indesejadas', stages_removed;
        END IF;
        
        -- Atualizar etapas restantes para nomenclatura padrão
        UPDATE pipeline_stages 
        SET name = 'Lead', is_system_stage = true, order_index = 0, color = '#3B82F6'
        WHERE id = lead_stage_id AND name != 'Lead';
        
        UPDATE pipeline_stages 
        SET name = 'Ganho', is_system_stage = true, order_index = 998, color = '#10B981'
        WHERE id = ganho_stage_id AND name != 'Ganho';
        
        UPDATE pipeline_stages 
        SET name = 'Perdido', is_system_stage = true, order_index = 999, color = '#EF4444'
        WHERE id = perdido_stage_id AND name != 'Perdido';
        
    END LOOP;
    
    RAISE NOTICE 'Limpeza concluída!';
END $$;

-- 5. GARANTIR NOMENCLATURA CORRETA DAS ETAPAS RESTANTES
-- =====================================================

-- Forçar nomenclatura em português (não inglês)
UPDATE pipeline_stages 
SET name = 'Lead' 
WHERE name IN ('Novo Lead', 'Novos leads') AND is_system_stage = true;

UPDATE pipeline_stages 
SET name = 'Ganho' 
WHERE name IN ('Closed Won', 'Won') AND is_system_stage = true;

UPDATE pipeline_stages 
SET name = 'Perdido' 
WHERE name IN ('Closed Lost', 'Lost') AND is_system_stage = true;

-- 6. VERIFICAÇÃO FINAL E RELATÓRIO
-- =====================================================

DO $$
DECLARE
    total_pipelines INTEGER;
    total_stages INTEGER;
    avg_stages_per_pipeline NUMERIC;
BEGIN
    -- Contar estatísticas finais
    SELECT COUNT(*) INTO total_pipelines FROM pipelines WHERE is_active = true;
    SELECT COUNT(*) INTO total_stages FROM pipeline_stages ps 
    INNER JOIN pipelines p ON ps.pipeline_id = p.id 
    WHERE p.is_active = true;
    
    SELECT ROUND(AVG(stage_count), 2) INTO avg_stages_per_pipeline
    FROM (
        SELECT COUNT(ps.id) as stage_count
        FROM pipelines p 
        LEFT JOIN pipeline_stages ps ON p.id = ps.pipeline_id
        WHERE p.is_active = true
        GROUP BY p.id
    ) subq;
    
    RAISE NOTICE '=== RELATÓRIO FINAL ===';
    RAISE NOTICE 'Total de pipelines: %', total_pipelines;
    RAISE NOTICE 'Total de etapas: %', total_stages;
    RAISE NOTICE 'Média de etapas por pipeline: %', avg_stages_per_pipeline;
    RAISE NOTICE 'Triggers automáticos removidos: trigger_auto_setup_pipeline, trigger_auto_setup_temperature_config';
    RAISE NOTICE 'Funções problemáticas removidas: ensure_pipeline_stages, auto_setup_pipeline';
    RAISE NOTICE '✅ CORREÇÃO APLICADA - Etapas fantasma removidas!';
END $$;

-- 7. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE pipeline_stages IS 'Etapas de pipeline - apenas 3 etapas obrigatórias: Lead, Ganho, Perdido. Etapas customizadas são opcionais.';

-- =====================================================
-- MIGRAÇÃO CONCLUÍDA
-- Problema das "etapas fantasma" corrigido:
-- - Triggers automáticos removidos
-- - Funções que criavam etapas extras removidas  
-- - Etapas duplicadas limpas
-- - Nomenclatura em português padronizada
-- =====================================================

SELECT 'Etapas fantasma removidas com sucesso! Pipelines agora mostram contagem correta.' as status;
-- =========================================================================
-- MIGRAÇÃO DE NOMENCLATURA PROFISSIONAL CRM - PRODUÇÃO
-- =========================================================================
-- Este script atualiza a nomenclatura dos stages para padrão profissional
-- alinhado com Salesforce, HubSpot e Pipedrive
-- 
-- IMPORTANTE: Execute este script em PRODUÇÃO após testes completos
-- =========================================================================

-- 1. BACKUP DE SEGURANÇA (opcional, mas recomendado)
-- CREATE TABLE pipeline_stages_backup AS SELECT * FROM pipeline_stages;

-- 2. ATUALIZAR NOMENCLATURA DOS STAGES PRINCIPAIS

-- Atualizar "Novos leads" → "Lead" (Stage inicial)
UPDATE pipeline_stages 
SET name = 'Lead', 
    temperature_score = 20,
    is_system_stage = true,
    updated_at = NOW()
WHERE name IN ('Novos leads', 'Novo lead', 'novo lead', 'Novo Lead');

-- Atualizar "Ganho" → "Closed Won" (Stage de vitória)
UPDATE pipeline_stages 
SET name = 'Closed Won', 
    temperature_score = 100,
    is_system_stage = true,
    updated_at = NOW()
WHERE name = 'Ganho';

-- Atualizar "Perdido" → "Closed Lost" (Stage de perda)
UPDATE pipeline_stages 
SET name = 'Closed Lost', 
    temperature_score = 0,
    is_system_stage = true,
    updated_at = NOW()
WHERE name = 'Perdido';

-- 3. CRIAR FUNÇÃO PARA IDENTIFICAR STAGES DO SISTEMA
CREATE OR REPLACE FUNCTION get_system_stages()
RETURNS TABLE(
    stage_name TEXT,
    stage_type TEXT,
    temperature_score INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Lead'::TEXT as stage_name,
        'initial'::TEXT as stage_type,
        20 as temperature_score
    UNION ALL
    SELECT 
        'Closed Won'::TEXT as stage_name,
        'won'::TEXT as stage_type,
        100 as temperature_score
    UNION ALL
    SELECT 
        'Closed Lost'::TEXT as stage_name,
        'lost'::TEXT as stage_type,
        0 as temperature_score;
END;
$$;

-- 4. VERIFICAÇÃO DA MIGRAÇÃO
-- Execute após a migração para verificar se tudo funcionou:
/*
SELECT 
    name,
    temperature_score,
    is_system_stage,
    COUNT(*) as count
FROM pipeline_stages 
WHERE name IN ('Lead', 'Closed Won', 'Closed Lost')
GROUP BY name, temperature_score, is_system_stage
ORDER BY name;
*/

-- =========================================================================
-- FIM DA MIGRAÇÃO
-- =========================================================================
-- Resultado esperado:
-- - "Novos leads" → "Lead" (temperature_score: 20)
-- - "Ganho" → "Closed Won" (temperature_score: 100)  
-- - "Perdido" → "Closed Lost" (temperature_score: 0)
-- - Todos marcados como is_system_stage = true
-- ========================================================================= 
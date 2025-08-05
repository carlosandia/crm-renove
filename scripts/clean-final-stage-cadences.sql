-- ✅ SCRIPT DE LIMPEZA: Remover configurações de cadência para etapas finais
-- Executar via Supabase SQL Editor ou psql
-- 
-- OBJETIVO: Limpar cadence_configs e cadence_task_instances para etapas "Ganho" e "Perdido"
-- MOTIVO: Etapas finais não devem ter atividades de follow-up automáticas

-- 1. PRIMEIRO: Verificar dados existentes antes da limpeza
SELECT 
    'ANTES DA LIMPEZA - Configurações encontradas' as status,
    cc.id,
    cc.pipeline_id,
    cc.stage_name,
    cc.stage_order,
    cc.tenant_id,
    jsonb_array_length(cc.tasks) as tasks_count,
    cc.created_at
FROM cadence_configs cc
WHERE 
    -- Etapas finais por nome (case insensitive)
    LOWER(TRIM(cc.stage_name)) IN ('ganho', 'perdido', 'closed won', 'closed lost', 'ganha', 'perdida', 'won', 'lost', 'finalizado', 'cancelado')
    OR 
    -- Etapas finais por order_index
    cc.stage_order >= 998
    OR
    -- Etapas que contém palavras-chave finais
    (LOWER(cc.stage_name) LIKE '%won%' OR LOWER(cc.stage_name) LIKE '%lost%' OR LOWER(cc.stage_name) LIKE '%ganho%' OR LOWER(cc.stage_name) LIKE '%perdido%')
ORDER BY cc.created_at DESC;

-- 2. Verificar task_instances relacionadas
SELECT 
    'ANTES DA LIMPEZA - Task Instances encontradas' as status,
    cti.id,
    cti.lead_id,
    cti.pipeline_id,
    ps.name as stage_name,
    ps.order_index as stage_order,
    cti.title,
    cti.status,
    cti.tenant_id,
    cti.created_at
FROM cadence_task_instances cti
JOIN pipeline_stages ps ON cti.stage_id = ps.id
WHERE 
    -- Task instances para etapas finais
    (LOWER(TRIM(ps.name)) IN ('ganho', 'perdido', 'closed won', 'closed lost', 'ganha', 'perdida', 'won', 'lost', 'finalizado', 'cancelado')
    OR ps.order_index >= 998
    OR (LOWER(ps.name) LIKE '%won%' OR LOWER(ps.name) LIKE '%lost%' OR LOWER(ps.name) LIKE '%ganho%' OR LOWER(ps.name) LIKE '%perdido%'))
ORDER BY cti.created_at DESC;

-- ⚠️ BACKUP: Criar backup antes da exclusão (opcional)
CREATE TABLE IF NOT EXISTS cadence_configs_backup_final_stages AS
SELECT 
    cc.*,
    NOW() as backup_timestamp,
    'final-stage-cleanup' as backup_reason
FROM cadence_configs cc
WHERE 
    LOWER(TRIM(cc.stage_name)) IN ('ganho', 'perdido', 'closed won', 'closed lost', 'ganha', 'perdida', 'won', 'lost', 'finalizado', 'cancelado')
    OR cc.stage_order >= 998
    OR (LOWER(cc.stage_name) LIKE '%won%' OR LOWER(cc.stage_name) LIKE '%lost%' OR LOWER(cc.stage_name) LIKE '%ganho%' OR LOWER(cc.stage_name) LIKE '%perdido%');

-- 3. LIMPEZA: Deletar task_instances para etapas finais
DELETE FROM cadence_task_instances 
WHERE id IN (
    SELECT cti.id
    FROM cadence_task_instances cti
    JOIN pipeline_stages ps ON cti.stage_id = ps.id
    WHERE 
        LOWER(TRIM(ps.name)) IN ('ganho', 'perdido', 'closed won', 'closed lost', 'ganha', 'perdida', 'won', 'lost', 'finalizado', 'cancelado')
        OR ps.order_index >= 998
        OR (LOWER(ps.name) LIKE '%won%' OR LOWER(ps.name) LIKE '%lost%' OR LOWER(ps.name) LIKE '%ganho%' OR LOWER(ps.name) LIKE '%perdido%')
);

-- 4. LIMPEZA: Deletar cadence_configs para etapas finais
DELETE FROM cadence_configs
WHERE 
    LOWER(TRIM(stage_name)) IN ('ganho', 'perdido', 'closed won', 'closed lost', 'ganha', 'perdida', 'won', 'lost', 'finalizado', 'cancelado')
    OR stage_order >= 998
    OR (LOWER(stage_name) LIKE '%won%' OR LOWER(stage_name) LIKE '%lost%' OR LOWER(stage_name) LIKE '%ganho%' OR LOWER(stage_name) LIKE '%perdido%');

-- 5. VERIFICAÇÃO: Confirmar limpeza
SELECT 
    'APÓS LIMPEZA - Configurações restantes' as status,
    cc.id,
    cc.pipeline_id,
    cc.stage_name,
    cc.stage_order,
    cc.tenant_id,
    jsonb_array_length(cc.tasks) as tasks_count
FROM cadence_configs cc
WHERE 
    LOWER(TRIM(cc.stage_name)) IN ('ganho', 'perdido', 'closed won', 'closed lost', 'ganha', 'perdida', 'won', 'lost', 'finalizado', 'cancelado')
    OR cc.stage_order >= 998
    OR (LOWER(cc.stage_name) LIKE '%won%' OR LOWER(cc.stage_name) LIKE '%lost%' OR LOWER(cc.stage_name) LIKE '%ganho%' OR LOWER(cc.stage_name) LIKE '%perdido%');

-- 6. ESTATÍSTICAS FINAIS
SELECT 
    'ESTATÍSTICAS FINAIS' as status,
    COUNT(*) as total_configs_remaining,
    COUNT(DISTINCT pipeline_id) as pipelines_with_configs,
    COUNT(DISTINCT tenant_id) as tenants_with_configs
FROM cadence_configs;

-- ✅ RESULTADO ESPERADO:
-- - 0 configurações restantes para etapas finais
-- - Apenas etapas válidas (Lead, etapas intermediárias) devem ter configurações
-- - Sistema agora bloqueará futuras tentativas via validação no CadenceService
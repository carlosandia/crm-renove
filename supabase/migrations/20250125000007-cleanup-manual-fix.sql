-- =====================================================
-- MIGRAÇÃO DE LIMPEZA CORRIGIDA - EXECUÇÃO MANUAL
-- Data: 2025-01-25
-- EXECUTE ESTE SQL MANUALMENTE NO DASHBOARD DO SUPABASE
-- =====================================================

-- 1. LIMPEZA DE TABELAS OBSOLETAS (se existirem)
-- =====================================================

-- Remover tabelas que não são mais usadas
DROP TABLE IF EXISTS sequence_steps CASCADE;
DROP TABLE IF EXISTS sequence_templates CASCADE;
DROP TABLE IF EXISTS mcp_data CASCADE;
DROP TABLE IF EXISTS obsolete_pipeline_data CASCADE;

-- 2. OTIMIZAÇÃO DE ÍNDICES
-- =====================================================

-- Remover índices duplicados ou obsoletos
DROP INDEX IF EXISTS idx_leads_old;
DROP INDEX IF EXISTS idx_pipeline_old;

-- 3. LIMPEZA DE DADOS ÓRFÃOS (CORRIGIDA)
-- =====================================================

-- Remover leads órfãos (sem pipeline ou stage válido)
DELETE FROM pipeline_leads 
WHERE pipeline_id NOT IN (SELECT id FROM pipelines)
   OR stage_id NOT IN (SELECT id FROM pipeline_stages);

-- Remover stages órfãos (sem pipeline válido)
DELETE FROM pipeline_stages 
WHERE pipeline_id NOT IN (SELECT id FROM pipelines);

-- Remover custom fields órfãos
DELETE FROM pipeline_custom_fields 
WHERE pipeline_id NOT IN (SELECT id FROM pipelines);

-- Remover membros órfãos (CORRIGIDO - conversão de tipos)
DELETE FROM pipeline_members 
WHERE pipeline_id NOT IN (SELECT id FROM pipelines)
   OR member_id NOT IN (SELECT id::text FROM users);

-- 4. ATUALIZAÇÃO DE ESTATÍSTICAS
-- =====================================================

-- Atualizar estatísticas do PostgreSQL para melhor performance
ANALYZE users;
ANALYZE pipelines;
ANALYZE pipeline_stages;
ANALYZE pipeline_custom_fields;
ANALYZE pipeline_members;
ANALYZE pipeline_leads;

-- =====================================================
-- NOTA: Para recuperar espaço em disco, execute manualmente
-- no terminal do Supabase (se disponível):
-- VACUUM ANALYZE [nome_da_tabela];
-- ===================================================== 
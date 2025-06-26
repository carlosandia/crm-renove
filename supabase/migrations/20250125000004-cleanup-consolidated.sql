-- =====================================================
-- MIGRAÇÃO DE LIMPEZA E CONSOLIDAÇÃO
-- Data: 2025-01-25
-- Descrição: Limpeza de tabelas obsoletas e otimização
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

-- Garantir índices essenciais únicos (removidos - serão criados na migração de correção)
-- Os índices serão criados na migração 20250125000005-fix-temperature-columns.sql

-- 3. LIMPEZA DE DADOS ÓRFÃOS
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

-- Remover membros órfãos (com conversão de tipo correta)
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
-- NOTA: VACUUM deve ser executado manualmente no dashboard
-- do Supabase após esta migração, se necessário
-- ===================================================== 
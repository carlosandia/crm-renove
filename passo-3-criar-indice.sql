-- =====================================================
-- PASSO 3: Criar índice único (agora sem duplicatas)
-- Execute APÓS o PASSO 2 ter corrigido as duplicatas
-- =====================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_pipelines_unique_name_per_tenant
ON pipelines (tenant_id, LOWER(TRIM(name))); 
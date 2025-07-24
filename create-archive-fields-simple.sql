-- Migração simples para adicionar campos de arquivamento
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_by TEXT;

-- Garantir que pipelines existentes tenham is_archived = false
UPDATE pipelines SET is_archived = FALSE WHERE is_archived IS NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_pipelines_archived_tenant ON pipelines(tenant_id, is_archived);
-- Migração de Arquivamento de Pipelines
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_by TEXT;

-- Comentários
COMMENT ON COLUMN pipelines.is_archived IS 'Indica se a pipeline está arquivada';
COMMENT ON COLUMN pipelines.archived_at IS 'Data e hora do arquivamento';
COMMENT ON COLUMN pipelines.archived_by IS 'Email do usuário que arquivou';

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_pipelines_archived_tenant ON pipelines(tenant_id, is_archived);

-- Garantir que pipelines existentes tenham is_archived = false
UPDATE pipelines SET is_archived = FALSE WHERE is_archived IS NULL;
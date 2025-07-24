-- AIDEV-NOTE: Migração para sistema de arquivamento de pipelines
-- Adiciona campo archived_at para soft delete de pipelines
-- Mantém compatibilidade com campo is_active existente

-- Adicionar coluna archived_at à tabela pipelines
ALTER TABLE pipelines 
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Criar índice para consultas eficientes de pipelines arquivadas
CREATE INDEX idx_pipelines_archived_at ON pipelines (archived_at) 
WHERE archived_at IS NOT NULL;

-- Criar índice composto para consultas de pipelines ativas por tenant
CREATE INDEX idx_pipelines_active_by_tenant ON pipelines (tenant_id, is_active, archived_at)
WHERE is_active = true AND archived_at IS NULL;

-- Comentários para documentação
COMMENT ON COLUMN pipelines.archived_at IS 'Timestamp de quando a pipeline foi arquivada. NULL = pipeline ativa';
COMMENT ON INDEX idx_pipelines_archived_at IS 'Índice para consultas de pipelines arquivadas';
COMMENT ON INDEX idx_pipelines_active_by_tenant IS 'Índice otimizado para pipelines ativas por tenant';

-- AIDEV-NOTE: RLS (Row Level Security) já existe na tabela pipelines
-- Não é necessário modificar as políticas pois archived_at é apenas um campo adicional
-- As políticas existentes já filtram por tenant_id e role apropriadamente
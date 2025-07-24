-- Migration: Sistema de Arquivamento de Pipelines
-- Data: 2025-07-15
-- Descrição: Adiciona campos para arquivamento ao invés de exclusão de pipelines

-- Adicionar campos de arquivamento à tabela pipelines
ALTER TABLE pipelines 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_by TEXT;

-- Comentários para documentação
COMMENT ON COLUMN pipelines.is_archived IS 'Indica se a pipeline está arquivada (não excluída)';
COMMENT ON COLUMN pipelines.archived_at IS 'Data e hora do arquivamento';
COMMENT ON COLUMN pipelines.archived_by IS 'ID ou email do usuário que arquivou';

-- Índice para performance em consultas de pipelines ativas/arquivadas
CREATE INDEX IF NOT EXISTS idx_pipelines_archived_tenant 
ON pipelines(tenant_id, is_archived);

-- Atualizar RLS policies para incluir pipelines arquivadas
-- As políticas existentes continuam funcionando, mas vamos adicionar uma específica para arquivadas

-- Policy para permitir visualização de pipelines arquivadas pelos admins
CREATE POLICY "Admins podem ver pipelines arquivadas" ON pipelines
FOR SELECT USING (
  auth.jwt() ->> 'tenant_id' = tenant_id AND
  auth.jwt() ->> 'role' IN ('admin', 'super_admin')
);

-- Policy para permitir arquivamento/desarquivamento
CREATE POLICY "Admins podem arquivar pipelines" ON pipelines
FOR UPDATE USING (
  auth.jwt() ->> 'tenant_id' = tenant_id AND
  auth.jwt() ->> 'role' IN ('admin', 'super_admin')
) WITH CHECK (
  auth.jwt() ->> 'tenant_id' = tenant_id AND
  auth.jwt() ->> 'role' IN ('admin', 'super_admin')
);

-- Trigger para automaticamente definir archived_at quando is_archived muda para true
CREATE OR REPLACE FUNCTION update_archived_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou de não arquivado para arquivado
  IF OLD.is_archived = FALSE AND NEW.is_archived = TRUE THEN
    NEW.archived_at = NOW();
    -- Se archived_by não foi definido, usar o usuário atual
    IF NEW.archived_by IS NULL THEN
      NEW.archived_by = auth.jwt() ->> 'email';
    END IF;
  -- Se mudou de arquivado para não arquivado
  ELSIF OLD.is_archived = TRUE AND NEW.is_archived = FALSE THEN
    NEW.archived_at = NULL;
    NEW.archived_by = NULL;
  END IF;
  
  -- Sempre atualizar updated_at
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_update_archived_timestamp ON pipelines;
CREATE TRIGGER trigger_update_archived_timestamp
  BEFORE UPDATE ON pipelines
  FOR EACH ROW
  EXECUTE FUNCTION update_archived_timestamp();

-- Verificação final: garantir que todas as pipelines existentes tenham is_archived = false
UPDATE pipelines 
SET is_archived = FALSE 
WHERE is_archived IS NULL;
-- Adicionar coluna is_active na tabela companies existente
-- Execute este comando no Supabase SQL Editor

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Comentar todas as empresas existentes como ativas por padrão
UPDATE companies 
SET is_active = true 
WHERE is_active IS NULL;

-- Adicionar comentário na coluna
COMMENT ON COLUMN companies.is_active IS 'Status da empresa: true=ativa, false=desativada'; 
-- Adicionar coluna custom_data à tabela pipeline_leads
ALTER TABLE pipeline_leads ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}';

-- Comentário na coluna
COMMENT ON COLUMN pipeline_leads.custom_data IS 'Dados dos campos customizados em formato JSON';
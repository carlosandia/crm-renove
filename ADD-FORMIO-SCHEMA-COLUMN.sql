-- Adicionar coluna para armazenar schema do Form.io
ALTER TABLE custom_forms 
ADD COLUMN IF NOT EXISTS formio_schema JSONB DEFAULT '{"type": "form", "display": "form", "components": []}'::jsonb;

-- Comentário para documentar a coluna 
-- Adicionar coluna para armazenar schema do Form.io na tabela custom_forms
ALTER TABLE custom_forms 
ADD COLUMN IF NOT EXISTS formio_schema JSONB DEFAULT '{"type": "form", "display": "form", "components": []}'::jsonb;

-- Comentário para documentar a coluna
COMMENT ON COLUMN custom_forms.formio_schema IS 'Schema JSON do Form.io para armazenar a estrutura do formulário';

-- Verificar se a coluna foi criada
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'custom_forms' AND column_name = 'formio_schema';

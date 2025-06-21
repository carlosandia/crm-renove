-- PARTE 1: Verificar tabela custom_forms
SELECT * FROM information_schema.tables WHERE table_name = 'custom_forms';

-- PARTE 2: Adicionar coluna formio_schema
ALTER TABLE custom_forms 
ADD COLUMN IF NOT EXISTS formio_schema JSONB;

-- PARTE 3: Definir valor padrão para a coluna
UPDATE custom_forms 
SET formio_schema = '{"type": "form", "display": "form", "components": []}'::jsonb 
WHERE formio_schema IS NULL;

-- PARTE 4: Criar tabela form_submissions
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID,
    submission_data JSONB,
    lead_score INTEGER DEFAULT 0,
    is_qualified BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PARTE 5: Adicionar foreign key
ALTER TABLE form_submissions 
ADD CONSTRAINT fk_form_submissions_form_id 
FOREIGN KEY (form_id) REFERENCES custom_forms(id) ON DELETE CASCADE;

-- PARTE 6: Criar índices
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_lead_score ON form_submissions(lead_score);

-- VERIFICAÇÃO FINAL
SELECT 'Configuração concluída com sucesso!' as resultado;

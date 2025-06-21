-- VERSÃO SUPER SIMPLES - Execute linha por linha

-- 1. Adicionar coluna formio_schema
ALTER TABLE custom_forms ADD COLUMN formio_schema JSONB;

-- 2. Criar tabela form_submissions
CREATE TABLE form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES custom_forms(id),
    submission_data JSONB,
    lead_score INTEGER DEFAULT 0,
    is_qualified BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP DEFAULT NOW()
);

-- 3. Criar índice
CREATE INDEX idx_form_submissions_form_id ON form_submissions(form_id);

-- 4. Verificar
SELECT 'Pronto!' as status;

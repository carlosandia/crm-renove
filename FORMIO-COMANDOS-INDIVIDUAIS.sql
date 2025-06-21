-- COMANDO 1: Execute primeiro - Verificar se a tabela custom_forms existe
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'custom_forms';

-- ============================================

-- COMANDO 2: Execute segundo - Adicionar coluna formio_schema
ALTER TABLE custom_forms 
ADD COLUMN IF NOT EXISTS formio_schema JSONB;

-- ============================================

-- COMANDO 3: Execute terceiro - Atualizar registros existentes
UPDATE custom_forms 
SET formio_schema = '{"type": "form", "display": "form", "components": [], "submitButton": {"text": "Enviar", "backgroundColor": "#3B82F6", "textColor": "#FFFFFF"}, "styling": {"backgroundColor": "#FFFFFF", "fontFamily": "system-ui"}, "leadScoring": {"enabled": true, "qualificationThreshold": 70}}'::jsonb 
WHERE formio_schema IS NULL;

-- ============================================

-- COMANDO 4: Execute quarto - Criar tabela form_submissions
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID,
    submission_data JSONB NOT NULL,
    lead_score INTEGER DEFAULT 0,
    is_qualified BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- ============================================

-- COMANDO 5: Execute quinto - Adicionar foreign key
ALTER TABLE form_submissions 
ADD CONSTRAINT IF NOT EXISTS fk_form_submissions_form_id 
FOREIGN KEY (form_id) REFERENCES custom_forms(id) ON DELETE CASCADE;

-- ============================================

-- COMANDO 6: Execute sexto - Criar índices
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);

-- ============================================

-- COMANDO 7: Execute sétimo - Mais índices
CREATE INDEX IF NOT EXISTS idx_form_submissions_lead_score ON form_submissions(lead_score);
CREATE INDEX IF NOT EXISTS idx_form_submissions_is_qualified ON form_submissions(is_qualified);

-- ============================================

-- COMANDO 8: Execute por último - Verificação final
SELECT 
    'custom_forms' as tabela, 
    COUNT(*) as registros,
    CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '❌ Vazia' END as status
FROM custom_forms
UNION ALL
SELECT 
    'form_submissions' as tabela, 
    COUNT(*) as registros,
    '✅ Criada' as status
FROM form_submissions;

-- Adicionar coluna formio_schema na tabela custom_forms
ALTER TABLE custom_forms 
ADD COLUMN IF NOT EXISTS formio_schema JSONB 
DEFAULT '{"type": "form", "display": "form", "components": [], "submitButton": {"text": "Enviar", "backgroundColor": "#3B82F6", "textColor": "#FFFFFF"}, "styling": {"backgroundColor": "#FFFFFF", "fontFamily": "system-ui"}, "leadScoring": {"enabled": true, "qualificationThreshold": 70}}'::jsonb;

-- Criar tabela para submissões de formulários com lead scoring
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES custom_forms(id) ON DELETE CASCADE,
    submission_data JSONB NOT NULL,
    lead_score INTEGER DEFAULT 0,
    is_qualified BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_lead_score ON form_submissions(lead_score);
CREATE INDEX IF NOT EXISTS idx_form_submissions_is_qualified ON form_submissions(is_qualified);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON form_submissions(submitted_at);

-- Comentários para documentação
COMMENT ON COLUMN custom_forms.formio_schema IS 'Schema JSON do Form.io com campos, styling e lead scoring';
COMMENT ON TABLE form_submissions IS 'Submissões de formulários com sistema de lead scoring';
COMMENT ON COLUMN form_submissions.lead_score IS 'Pontuação do lead (0-100)';
COMMENT ON COLUMN form_submissions.is_qualified IS 'Se o lead atingiu o limite de qualificação';

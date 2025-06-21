
-- Atualizar estrutura do banco para suportar Form.io avançado
-- Execute este script no painel SQL do Supabase

-- 1. Verificar se a coluna formio_schema já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'custom_forms' AND column_name = 'formio_schema'
    ) THEN
        ALTER TABLE custom_forms 
        ADD COLUMN formio_schema JSONB DEFAULT '{"type": "form", "display": "form", "components": []}'::jsonb;
    END IF;
END $$;

-- 2. Criar tabela para analytics de formulários
CREATE TABLE IF NOT EXISTS form_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES custom_forms(id) ON DELETE CASCADE,
    views INTEGER DEFAULT 0,
    submissions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela para versionamento de formulários
CREATE TABLE IF NOT EXISTS form_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES custom_forms(id) ON DELETE CASCADE,
    version_number INTEGER DEFAULT 1,
    formio_schema JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- 4. Criar tabela para regras de lead scoring
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES custom_forms(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    field_value TEXT,
    score_points INTEGER DEFAULT 0,
    condition_type TEXT DEFAULT 'equals', -- equals, contains, greater_than, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Atualizar tabela form_submissions para suportar lead scoring
ALTER TABLE form_submissions 
ADD COLUMN IF NOT EXISTS mql_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_mql BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_redirect BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS form_version INTEGER DEFAULT 1;

-- 6. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_form_analytics_form_id ON form_analytics(form_id);
CREATE INDEX IF NOT EXISTS idx_form_versions_form_id ON form_versions(form_id);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_form_id ON lead_scoring_rules(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_mql_score ON form_submissions(mql_score);
CREATE INDEX IF NOT EXISTS idx_form_submissions_is_mql ON form_submissions(is_mql);

-- 7. Função para calcular score MQL
CREATE OR REPLACE FUNCTION calculate_mql_score(form_id_param UUID, submission_data_param JSONB)
RETURNS INTEGER AS $$
DECLARE
    total_score INTEGER := 0;
    rule RECORD;
    field_value TEXT;
BEGIN
    -- Iterar sobre as regras de scoring para o formulário
    FOR rule IN 
        SELECT field_key, field_value, score_points, condition_type
        FROM lead_scoring_rules 
        WHERE form_id = form_id_param
    LOOP
        -- Extrair valor do campo do submission_data
        field_value := submission_data_param ->> rule.field_key;
        
        -- Aplicar condições baseadas no tipo
        CASE rule.condition_type
            WHEN 'equals' THEN
                IF field_value = rule.field_value THEN
                    total_score := total_score + rule.score_points;
                END IF;
            WHEN 'contains' THEN
                IF field_value ILIKE '%' || rule.field_value || '%' THEN
                    total_score := total_score + rule.score_points;
                END IF;
            WHEN 'not_empty' THEN
                IF field_value IS NOT NULL AND field_value != '' THEN
                    total_score := total_score + rule.score_points;
                END IF;
        END CASE;
    END LOOP;
    
    RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para calcular score automaticamente em submissions
CREATE OR REPLACE FUNCTION trigger_calculate_mql_score()
RETURNS TRIGGER AS $$
DECLARE
    calculated_score INTEGER;
    mql_threshold INTEGER := 70; -- Threshold padrão
BEGIN
    -- Calcular score MQL
    calculated_score := calculate_mql_score(NEW.form_id, NEW.submission_data);
    
    -- Atualizar campos de score
    NEW.mql_score := calculated_score;
    NEW.is_mql := calculated_score >= mql_threshold;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER form_submissions_mql_trigger
    BEFORE INSERT OR UPDATE ON form_submissions
    FOR EACH ROW EXECUTE FUNCTION trigger_calculate_mql_score();

-- 9. Comentários para documentação
COMMENT ON TABLE form_analytics IS 'Analytics e métricas de performance dos formulários';
COMMENT ON TABLE form_versions IS 'Versionamento e histórico de alterações dos formulários';
COMMENT ON TABLE lead_scoring_rules IS 'Regras para cálculo automático de lead scoring (MQL)';
COMMENT ON COLUMN form_submissions.mql_score IS 'Pontuação calculada do lead (0-100)';
COMMENT ON COLUMN form_submissions.is_mql IS 'Se o lead é qualificado como MQL baseado no threshold';

-- 10. Dados iniciais - criar analytics para formulários existentes
INSERT INTO form_analytics (form_id, views, submissions, conversion_rate)
SELECT 
    id as form_id,
    0 as views,
    0 as submissions,
    0 as conversion_rate
FROM custom_forms
WHERE id NOT IN (SELECT form_id FROM form_analytics WHERE form_id IS NOT NULL);

-- Verificação final
SELECT 'Estrutura Form.io criada com sucesso!' as status;

-- =====================================================
-- CORREÇÃO SQL - SISTEMA DE FORMULÁRIOS FORM.IO
-- Execute cada seção separadamente no Supabase
-- =====================================================

-- ETAPA 1: Verificar se a tabela custom_forms existe
-- Execute primeiro para verificar a estrutura atual
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'custom_forms' 
AND table_schema = 'public';

-- =====================================================
-- ETAPA 2: Adicionar coluna formio_schema (se não existir)
-- =====================================================
DO $$ 
BEGIN
    -- Verificar se a coluna já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'custom_forms' 
        AND column_name = 'formio_schema'
        AND table_schema = 'public'
    ) THEN
        -- Adicionar a coluna
        ALTER TABLE custom_forms 
        ADD COLUMN formio_schema JSONB 
        DEFAULT '{"type": "form", "display": "form", "components": [], "submitButton": {"text": "Enviar", "backgroundColor": "#3B82F6", "textColor": "#FFFFFF"}, "styling": {"backgroundColor": "#FFFFFF", "fontFamily": "system-ui"}, "leadScoring": {"enabled": true, "qualificationThreshold": 70}}'::jsonb;
        
        RAISE NOTICE 'Coluna formio_schema adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna formio_schema já existe!';
    END IF;
END $$;

-- =====================================================
-- ETAPA 3: Criar tabela form_submissions (se não existir)
-- =====================================================
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL,
    submission_data JSONB NOT NULL,
    lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
    is_qualified BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ETAPA 4: Adicionar foreign key (se a tabela foi criada)
-- =====================================================
DO $$
BEGIN
    -- Verificar se a constraint já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'form_submissions_form_id_fkey'
        AND table_name = 'form_submissions'
    ) THEN
        ALTER TABLE form_submissions 
        ADD CONSTRAINT form_submissions_form_id_fkey 
        FOREIGN KEY (form_id) REFERENCES custom_forms(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign key adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Foreign key já existe!';
    END IF;
END $$;

-- =====================================================
-- ETAPA 5: Criar índices para performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_lead_score ON form_submissions(lead_score);
CREATE INDEX IF NOT EXISTS idx_form_submissions_is_qualified ON form_submissions(is_qualified);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON form_submissions(submitted_at);

-- =====================================================
-- ETAPA 6: Adicionar comentários de documentação
-- =====================================================
COMMENT ON COLUMN custom_forms.formio_schema IS 'Schema JSON do Form.io com campos, styling e lead scoring';
COMMENT ON TABLE form_submissions IS 'Submissões de formulários com sistema de lead scoring';
COMMENT ON COLUMN form_submissions.lead_score IS 'Pontuação do lead (0-100)';
COMMENT ON COLUMN form_submissions.is_qualified IS 'Se o lead atingiu o limite de qualificação';

-- =====================================================
-- ETAPA 7: Verificação final - Execute para confirmar
-- =====================================================
SELECT 
    'custom_forms' as tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'custom_forms' 
AND table_schema = 'public'
AND column_name = 'formio_schema'

UNION ALL

SELECT 
    'form_submissions' as tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'form_submissions' 
AND table_schema = 'public'
ORDER BY tabela, column_name;

-- =====================================================
-- MENSAGEM FINAL
-- =====================================================
SELECT 'Sistema de formulários Form.io configurado com sucesso! ✅' as status; 
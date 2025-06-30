-- Form Builder Evolution - Migração Ultra-Segura
-- Data: 27/01/2025
-- Versão: ULTRA-SEGURA - Resolve erro "relation forms does not exist"

-- 1. CRIAR TABELA FORMS SE NÃO EXISTIR
CREATE TABLE IF NOT EXISTS forms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name varchar(255) NOT NULL,
    description text,
    tenant_id uuid NOT NULL,
    is_active boolean DEFAULT true,
    fields jsonb DEFAULT '[]',
    settings jsonb DEFAULT '{}',
    created_by uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    form_type varchar(50) DEFAULT 'standard',
    type_config jsonb DEFAULT '{}',
    pipeline_integration jsonb DEFAULT '{}',
    cadence_integration jsonb DEFAULT '{}',
    calendar_integration jsonb DEFAULT '{}',
    embed_config jsonb DEFAULT '{}',
    ab_test_config jsonb DEFAULT '{}'
);

-- 2. ADICIONAR COLUNAS SE TABELA JÁ EXISTIR
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'form_type') THEN
        ALTER TABLE forms ADD COLUMN form_type varchar(50) DEFAULT 'standard';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'type_config') THEN
        ALTER TABLE forms ADD COLUMN type_config jsonb DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'pipeline_integration') THEN
        ALTER TABLE forms ADD COLUMN pipeline_integration jsonb DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'cadence_integration') THEN
        ALTER TABLE forms ADD COLUMN cadence_integration jsonb DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'calendar_integration') THEN
        ALTER TABLE forms ADD COLUMN calendar_integration jsonb DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'embed_config') THEN
        ALTER TABLE forms ADD COLUMN embed_config jsonb DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'ab_test_config') THEN
        ALTER TABLE forms ADD COLUMN ab_test_config jsonb DEFAULT '{}';
    END IF;
END $$;

-- 3. CRIAR TABELAS DE ANALYTICS
CREATE TABLE IF NOT EXISTS form_analytics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid REFERENCES forms(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL,
    date date NOT NULL DEFAULT CURRENT_DATE,
    views integer DEFAULT 0,
    submissions integer DEFAULT 0,
    conversion_rate decimal(5,2) DEFAULT 0,
    bounce_rate decimal(5,2) DEFAULT 0,
    average_time_seconds integer DEFAULT 0,
    device_type varchar(20),
    traffic_source varchar(50),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS form_ab_tests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid REFERENCES forms(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL,
    test_name varchar(255) NOT NULL,
    status varchar(20) DEFAULT 'draft',
    variants jsonb NOT NULL DEFAULT '[]',
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    min_sample_size integer DEFAULT 1000,
    confidence_level integer DEFAULT 95,
    winning_variant_id varchar(100),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS form_ab_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id uuid REFERENCES form_ab_tests(id) ON DELETE CASCADE,
    variant_id varchar(100) NOT NULL,
    date date NOT NULL DEFAULT CURRENT_DATE,
    views integer DEFAULT 0,
    conversions integer DEFAULT 0,
    conversion_rate decimal(5,2) DEFAULT 0,
    confidence decimal(5,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS form_interactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid REFERENCES forms(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL,
    element_id varchar(100) NOT NULL,
    element_type varchar(50) NOT NULL,
    interaction_type varchar(50) NOT NULL,
    session_id varchar(100),
    ip_address inet,
    user_agent text,
    device_type varchar(20),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CRIAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_forms_tenant_id ON forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_forms_form_type ON forms(form_type);
CREATE INDEX IF NOT EXISTS idx_form_analytics_form_id ON form_analytics(form_id);
CREATE INDEX IF NOT EXISTS idx_form_analytics_tenant_id ON form_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_analytics_date ON form_analytics(date);
CREATE INDEX IF NOT EXISTS idx_form_ab_tests_form_id ON form_ab_tests(form_id);
CREATE INDEX IF NOT EXISTS idx_form_ab_tests_tenant_id ON form_ab_tests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_ab_stats_test_id ON form_ab_stats(test_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_form_id ON form_interactions(form_id);

-- 5. HABILITAR RLS
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_ab_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_interactions ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS RLS
CREATE POLICY "forms_tenant_policy" ON forms FOR ALL USING (tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id');
CREATE POLICY "form_analytics_tenant_policy" ON form_analytics FOR ALL USING (tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id');
CREATE POLICY "form_ab_tests_tenant_policy" ON form_ab_tests FOR ALL USING (tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id');
CREATE POLICY "form_interactions_tenant_policy" ON form_interactions FOR ALL USING (tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id');
CREATE POLICY "form_ab_stats_policy" ON form_ab_stats FOR ALL USING (test_id IN (SELECT id FROM form_ab_tests WHERE tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id'));

-- 7. FUNÇÃO DE CONVERSÃO
CREATE OR REPLACE FUNCTION calculate_form_conversion_rate()
RETURNS TRIGGER AS $$
BEGIN
    NEW.conversion_rate = CASE 
        WHEN NEW.views > 0 THEN ROUND((NEW.submissions::decimal / NEW.views::decimal) * 100, 2)
        ELSE 0
    END;
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. TRIGGERS
CREATE TRIGGER trigger_form_analytics_conversion
    BEFORE INSERT OR UPDATE ON form_analytics
    FOR EACH ROW EXECUTE FUNCTION calculate_form_conversion_rate();

CREATE TRIGGER trigger_form_ab_stats_conversion
    BEFORE INSERT OR UPDATE ON form_ab_stats
    FOR EACH ROW EXECUTE FUNCTION calculate_form_conversion_rate();

-- 9. ATUALIZAR DADOS EXISTENTES
UPDATE forms SET form_type = 'standard' WHERE form_type IS NULL OR form_type = '';

-- 10. SUCESSO
SELECT '🎉 Form Builder Evolution aplicado com SUCESSO! Tabela forms criada/atualizada + 4 novas tabelas de analytics!' as status; 
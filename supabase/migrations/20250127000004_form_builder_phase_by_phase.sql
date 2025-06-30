-- Form Builder Evolution - Migração Fase por Fase
-- Data: 27/01/2025
-- Versão: PHASE BY PHASE - Adiciona uma coluna por vez, sem referências prematuras a tenant_id

-- ===== IMPORTANTE: ESTA MIGRAÇÃO NÃO FAZ REFERÊNCIAS A tenant_id ATÉ ELE EXISTIR =====

-- FASE 1: CRIAR TABELA FORMS BÁSICA (SEM tenant_id OBRIGATÓRIO)
CREATE TABLE IF NOT EXISTS forms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name varchar(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    fields jsonb DEFAULT '[]',
    settings jsonb DEFAULT '{}',
    created_by uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- FASE 2: ADICIONAR tenant_id COMO OPCIONAL
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'tenant_id') THEN
        ALTER TABLE forms ADD COLUMN tenant_id uuid;
    END IF;
END $$;

-- FASE 3: ATUALIZAR tenant_id PARA REGISTROS EXISTENTES
UPDATE forms SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE tenant_id IS NULL;

-- FASE 4: TORNAR tenant_id NOT NULL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'tenant_id' AND is_nullable = 'YES') THEN
        ALTER TABLE forms ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

-- FASE 5: ADICIONAR COLUNAS DO FORM BUILDER (UMA POR VEZ)
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

-- FASE 6: CRIAR TABELAS DE ANALYTICS (SEM FOREIGN KEYS AINDA)
CREATE TABLE IF NOT EXISTS form_analytics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid,
    tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
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
    form_id uuid,
    tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
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
    test_id uuid,
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
    form_id uuid,
    tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    element_id varchar(100) NOT NULL,
    element_type varchar(50) NOT NULL,
    interaction_type varchar(50) NOT NULL,
    session_id varchar(100),
    ip_address inet,
    user_agent text,
    device_type varchar(20),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- FASE 7: CRIAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_forms_tenant_id ON forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_forms_form_type ON forms(form_type);
CREATE INDEX IF NOT EXISTS idx_forms_is_active ON forms(is_active);
CREATE INDEX IF NOT EXISTS idx_form_analytics_form_id ON form_analytics(form_id);
CREATE INDEX IF NOT EXISTS idx_form_analytics_tenant_id ON form_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_analytics_date ON form_analytics(date);
CREATE INDEX IF NOT EXISTS idx_form_ab_tests_form_id ON form_ab_tests(form_id);
CREATE INDEX IF NOT EXISTS idx_form_ab_tests_tenant_id ON form_ab_tests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_ab_stats_test_id ON form_ab_stats(test_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_form_id ON form_interactions(form_id);

-- FASE 8: ADICIONAR FOREIGN KEYS (SOMENTE AGORA QUE TUDO EXISTE)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_form_analytics_form_id') THEN
        ALTER TABLE form_analytics ADD CONSTRAINT fk_form_analytics_form_id FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_form_ab_tests_form_id') THEN
        ALTER TABLE form_ab_tests ADD CONSTRAINT fk_form_ab_tests_form_id FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_form_ab_stats_test_id') THEN
        ALTER TABLE form_ab_stats ADD CONSTRAINT fk_form_ab_stats_test_id FOREIGN KEY (test_id) REFERENCES form_ab_tests(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_form_interactions_form_id') THEN
        ALTER TABLE form_interactions ADD CONSTRAINT fk_form_interactions_form_id FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
    END IF;
END $$;

-- FASE 9: FUNÇÃO E TRIGGERS
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

DROP TRIGGER IF EXISTS trigger_form_analytics_conversion ON form_analytics;
CREATE TRIGGER trigger_form_analytics_conversion
    BEFORE INSERT OR UPDATE ON form_analytics
    FOR EACH ROW EXECUTE FUNCTION calculate_form_conversion_rate();

DROP TRIGGER IF EXISTS trigger_form_ab_stats_conversion ON form_ab_stats;
CREATE TRIGGER trigger_form_ab_stats_conversion
    BEFORE INSERT OR UPDATE ON form_ab_stats
    FOR EACH ROW EXECUTE FUNCTION calculate_form_conversion_rate();

-- FASE 10: ATUALIZAR DADOS EXISTENTES
UPDATE forms SET form_type = 'standard' WHERE form_type IS NULL OR form_type = '';

-- FASE 11: RLS (SOMENTE NO FINAL)
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_ab_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_interactions ENABLE ROW LEVEL SECURITY;

-- FASE 12: POLÍTICAS RLS (SOMENTE NO FINAL)
DROP POLICY IF EXISTS "forms_tenant_policy" ON forms;
CREATE POLICY "forms_tenant_policy" ON forms FOR ALL USING (tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id');

DROP POLICY IF EXISTS "form_analytics_tenant_policy" ON form_analytics;
CREATE POLICY "form_analytics_tenant_policy" ON form_analytics FOR ALL USING (tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id');

DROP POLICY IF EXISTS "form_ab_tests_tenant_policy" ON form_ab_tests;
CREATE POLICY "form_ab_tests_tenant_policy" ON form_ab_tests FOR ALL USING (tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id');

DROP POLICY IF EXISTS "form_interactions_tenant_policy" ON form_interactions;
CREATE POLICY "form_interactions_tenant_policy" ON form_interactions FOR ALL USING (tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id');

DROP POLICY IF EXISTS "form_ab_stats_policy" ON form_ab_stats;
CREATE POLICY "form_ab_stats_policy" ON form_ab_stats FOR ALL USING (test_id IN (SELECT id FROM form_ab_tests WHERE tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id'));

-- SUCESSO
SELECT '🎉 PHASE BY PHASE: Form Builder Evolution aplicado com SUCESSO em 12 fases!' as status; 
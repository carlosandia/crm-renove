-- Form Builder Evolution - Migração À Prova de Falhas
-- Data: 27/01/2025
-- Versão: BULLETPROOF - Resolve erro "column tenant_id does not exist"

-- ===== SEÇÃO 1: PREPARAR TABELA FORMS =====

-- 1.1. CRIAR TABELA FORMS COMPLETA SE NÃO EXISTIR
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

-- 1.2. ADICIONAR COLUNAS BÁSICAS SE NÃO EXISTIREM
DO $$
BEGIN
    -- tenant_id (CRÍTICO!)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'tenant_id') THEN
        ALTER TABLE forms ADD COLUMN tenant_id uuid;
    END IF;
    
    -- is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'is_active') THEN
        ALTER TABLE forms ADD COLUMN is_active boolean DEFAULT true;
    END IF;
    
    -- fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'fields') THEN
        ALTER TABLE forms ADD COLUMN fields jsonb DEFAULT '[]';
    END IF;
    
    -- settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'settings') THEN
        ALTER TABLE forms ADD COLUMN settings jsonb DEFAULT '{}';
    END IF;
    
    -- created_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'created_by') THEN
        ALTER TABLE forms ADD COLUMN created_by uuid;
    END IF;
    
    -- created_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'created_at') THEN
        ALTER TABLE forms ADD COLUMN created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
    
    -- updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'updated_at') THEN
        ALTER TABLE forms ADD COLUMN updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
END $$;

-- 1.3. ADICIONAR COLUNAS DO FORM BUILDER EVOLUTION
DO $$
BEGIN
    -- form_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'form_type') THEN
        ALTER TABLE forms ADD COLUMN form_type varchar(50) DEFAULT 'standard';
    END IF;
    
    -- type_config
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'type_config') THEN
        ALTER TABLE forms ADD COLUMN type_config jsonb DEFAULT '{}';
    END IF;
    
    -- pipeline_integration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'pipeline_integration') THEN
        ALTER TABLE forms ADD COLUMN pipeline_integration jsonb DEFAULT '{}';
    END IF;
    
    -- cadence_integration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'cadence_integration') THEN
        ALTER TABLE forms ADD COLUMN cadence_integration jsonb DEFAULT '{}';
    END IF;
    
    -- calendar_integration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'calendar_integration') THEN
        ALTER TABLE forms ADD COLUMN calendar_integration jsonb DEFAULT '{}';
    END IF;
    
    -- embed_config
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'embed_config') THEN
        ALTER TABLE forms ADD COLUMN embed_config jsonb DEFAULT '{}';
    END IF;
    
    -- ab_test_config
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'ab_test_config') THEN
        ALTER TABLE forms ADD COLUMN ab_test_config jsonb DEFAULT '{}';
    END IF;
END $$;

-- 1.4. CORRIGIR tenant_id PARA FORMULÁRIOS EXISTENTES
DO $$
BEGIN
    -- Se existem formulários sem tenant_id, definir valor padrão
    IF EXISTS (SELECT 1 FROM forms WHERE tenant_id IS NULL) THEN
        UPDATE forms SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid 
        WHERE tenant_id IS NULL;
    END IF;
    
    -- Tornar tenant_id NOT NULL se ainda não for
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'forms' AND column_name = 'tenant_id' AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE forms ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

-- ===== SEÇÃO 2: CRIAR TABELAS DE ANALYTICS =====

-- 2.1. form_analytics
CREATE TABLE IF NOT EXISTS form_analytics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid,
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

-- 2.2. form_ab_tests
CREATE TABLE IF NOT EXISTS form_ab_tests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid,
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

-- 2.3. form_ab_stats
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

-- 2.4. form_interactions
CREATE TABLE IF NOT EXISTS form_interactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid,
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

-- ===== SEÇÃO 3: FOREIGN KEYS, ÍNDICES E SEGURANÇA =====

-- 3.1. ADICIONAR FOREIGN KEYS
DO $$
BEGIN
    -- FK form_analytics → forms
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_form_analytics_form_id') THEN
        ALTER TABLE form_analytics ADD CONSTRAINT fk_form_analytics_form_id FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
    END IF;
    
    -- FK form_ab_tests → forms
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_form_ab_tests_form_id') THEN
        ALTER TABLE form_ab_tests ADD CONSTRAINT fk_form_ab_tests_form_id FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
    END IF;
    
    -- FK form_ab_stats → form_ab_tests
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_form_ab_stats_test_id') THEN
        ALTER TABLE form_ab_stats ADD CONSTRAINT fk_form_ab_stats_test_id FOREIGN KEY (test_id) REFERENCES form_ab_tests(id) ON DELETE CASCADE;
    END IF;
    
    -- FK form_interactions → forms
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_form_interactions_form_id') THEN
        ALTER TABLE form_interactions ADD CONSTRAINT fk_form_interactions_form_id FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3.2. CRIAR ÍNDICES
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

-- 3.3. HABILITAR RLS
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_ab_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_interactions ENABLE ROW LEVEL SECURITY;

-- 3.4. CRIAR POLÍTICAS RLS
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

-- ===== SEÇÃO 4: TRIGGERS E FINALIZAÇÕES =====

-- 4.1. FUNÇÃO DE CONVERSÃO
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

-- 4.2. TRIGGERS
DROP TRIGGER IF EXISTS trigger_form_analytics_conversion ON form_analytics;
CREATE TRIGGER trigger_form_analytics_conversion
    BEFORE INSERT OR UPDATE ON form_analytics
    FOR EACH ROW EXECUTE FUNCTION calculate_form_conversion_rate();

DROP TRIGGER IF EXISTS trigger_form_ab_stats_conversion ON form_ab_stats;
CREATE TRIGGER trigger_form_ab_stats_conversion
    BEFORE INSERT OR UPDATE ON form_ab_stats
    FOR EACH ROW EXECUTE FUNCTION calculate_form_conversion_rate();

-- 4.3. ATUALIZAR DADOS EXISTENTES
UPDATE forms SET form_type = 'standard' WHERE form_type IS NULL OR form_type = '';

-- ===== SUCESSO FINAL =====
SELECT '🎉 BULLETPROOF: Form Builder Evolution aplicado com SUCESSO! tenant_id corrigido + 7 colunas + 4 tabelas!' as status; 
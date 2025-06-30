-- Form Builder Evolution - Migração Simplificada
-- Data: 27/01/2025
-- Versão: SIMPLIFICADA - Sem erros para Supabase

-- Adicionar colunas para tipos de formulário na tabela forms (se existir)
ALTER TABLE forms 
ADD COLUMN IF NOT EXISTS form_type varchar(50) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS type_config jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS pipeline_integration jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cadence_integration jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS calendar_integration jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS embed_config jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ab_test_config jsonb DEFAULT '{}';

-- Criar tabela para analytics de formulários
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

-- Criar tabela para testes A/B
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

-- Criar tabela para estatísticas de variantes A/B
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

-- Criar tabela para interações de formulário (heatmap)
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

-- Criar índices básicos para performance
CREATE INDEX IF NOT EXISTS idx_form_analytics_form_id ON form_analytics(form_id);
CREATE INDEX IF NOT EXISTS idx_form_analytics_tenant_id ON form_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_analytics_date ON form_analytics(date);

CREATE INDEX IF NOT EXISTS idx_form_ab_tests_form_id ON form_ab_tests(form_id);
CREATE INDEX IF NOT EXISTS idx_form_ab_tests_tenant_id ON form_ab_tests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_ab_tests_status ON form_ab_tests(status);

CREATE INDEX IF NOT EXISTS idx_form_ab_stats_test_id ON form_ab_stats(test_id);
CREATE INDEX IF NOT EXISTS idx_form_ab_stats_date ON form_ab_stats(date);

CREATE INDEX IF NOT EXISTS idx_form_interactions_form_id ON form_interactions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_tenant_id ON form_interactions(tenant_id);

-- Habilitar RLS
ALTER TABLE form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_ab_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_interactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas
CREATE POLICY "form_analytics_tenant_policy" ON form_analytics FOR ALL USING (tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id');
CREATE POLICY "form_ab_tests_tenant_policy" ON form_ab_tests FOR ALL USING (tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id');
CREATE POLICY "form_interactions_tenant_policy" ON form_interactions FOR ALL USING (tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id');

-- Política especial para form_ab_stats (através de form_ab_tests)
CREATE POLICY "form_ab_stats_policy" ON form_ab_stats FOR ALL USING (
    test_id IN (
        SELECT id FROM form_ab_tests 
        WHERE tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id'
    )
);

-- Função para calcular taxa de conversão
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

-- Trigger para calcular conversão automaticamente
CREATE TRIGGER trigger_form_analytics_conversion
    BEFORE INSERT OR UPDATE ON form_analytics
    FOR EACH ROW EXECUTE FUNCTION calculate_form_conversion_rate();

CREATE TRIGGER trigger_form_ab_stats_conversion
    BEFORE INSERT OR UPDATE ON form_ab_stats
    FOR EACH ROW EXECUTE FUNCTION calculate_form_conversion_rate();

-- Atualizar formulários existentes para form_type padrão
UPDATE forms SET form_type = 'standard' WHERE form_type IS NULL OR form_type = '';

-- Sucesso
SELECT 'Form Builder Evolution - Migração Simplificada aplicada com sucesso!' as status; 
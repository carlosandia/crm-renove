-- Form Builder Evolution Migration
-- Data: 27/01/2025
-- Descrição: Adiciona suporte aos novos tipos de formulário e configurações avançadas

-- Adicionar colunas para tipos de formulário
ALTER TABLE forms 
ADD COLUMN IF NOT EXISTS form_type varchar(50) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS type_config jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS pipeline_integration jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cadence_integration jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS calendar_integration jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS embed_config jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ab_test_config jsonb DEFAULT '{}';

-- Adicionar comentários para documentação
COMMENT ON COLUMN forms.form_type IS 'Tipo do formulário: standard, exit_intent, scroll_trigger, time_delayed, multi_step, smart_scheduling, cadence_trigger, whatsapp_integration';
COMMENT ON COLUMN forms.type_config IS 'Configurações específicas do tipo de formulário';
COMMENT ON COLUMN forms.pipeline_integration IS 'Configurações de integração com pipeline';
COMMENT ON COLUMN forms.cadence_integration IS 'Configurações de integração com cadência';
COMMENT ON COLUMN forms.calendar_integration IS 'Configurações de integração com Google Calendar';
COMMENT ON COLUMN forms.embed_config IS 'Configurações de embed do formulário';
COMMENT ON COLUMN forms.ab_test_config IS 'Configurações de teste A/B';

-- Criar tabela para analytics de formulários
CREATE TABLE IF NOT EXISTS form_analytics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid REFERENCES forms(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL,
    date date NOT NULL,
    views integer DEFAULT 0,
    submissions integer DEFAULT 0,
    conversion_rate decimal(5,2) DEFAULT 0,
    bounce_rate decimal(5,2) DEFAULT 0,
    average_time_seconds integer DEFAULT 0,
    device_type varchar(20), -- 'desktop', 'mobile', 'tablet'
    traffic_source varchar(50), -- 'organic', 'social', 'email', 'direct', etc.
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adicionar comentários
COMMENT ON TABLE form_analytics IS 'Analytics detalhados de formulários por dia e segmentação';
COMMENT ON COLUMN form_analytics.device_type IS 'Tipo de dispositivo usado para acessar o formulário';
COMMENT ON COLUMN form_analytics.traffic_source IS 'Fonte de tráfego que gerou a visualização';

-- Criar tabela para testes A/B
CREATE TABLE IF NOT EXISTS form_ab_tests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid REFERENCES forms(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL,
    test_name varchar(255) NOT NULL,
    status varchar(20) DEFAULT 'draft', -- 'draft', 'running', 'paused', 'completed'
    variants jsonb NOT NULL DEFAULT '[]',
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    min_sample_size integer DEFAULT 1000,
    confidence_level integer DEFAULT 95,
    winning_variant_id varchar(100),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adicionar comentários
COMMENT ON TABLE form_ab_tests IS 'Configurações e resultados de testes A/B de formulários';
COMMENT ON COLUMN form_ab_tests.status IS 'Status do teste: draft, running, paused, completed';
COMMENT ON COLUMN form_ab_tests.variants IS 'Array JSON com configurações das variantes do teste';

-- Criar tabela para estatísticas de variantes A/B
CREATE TABLE IF NOT EXISTS form_ab_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id uuid REFERENCES form_ab_tests(id) ON DELETE CASCADE,
    variant_id varchar(100) NOT NULL,
    date date NOT NULL,
    views integer DEFAULT 0,
    conversions integer DEFAULT 0,
    conversion_rate decimal(5,2) DEFAULT 0,
    confidence decimal(5,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adicionar comentários
COMMENT ON TABLE form_ab_stats IS 'Estatísticas diárias das variantes de testes A/B';

-- Criar tabela para interações de formulário (heatmap)
CREATE TABLE IF NOT EXISTS form_interactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid REFERENCES forms(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL,
    element_id varchar(100) NOT NULL,
    element_type varchar(50) NOT NULL, -- 'field', 'button', 'link'
    interaction_type varchar(50) NOT NULL, -- 'click', 'focus', 'blur', 'submit'
    session_id varchar(100),
    ip_address inet,
    user_agent text,
    device_type varchar(20),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adicionar comentários
COMMENT ON TABLE form_interactions IS 'Registro de todas as interações dos usuários com elementos do formulário';
COMMENT ON COLUMN form_interactions.element_id IS 'ID do elemento interagido (campo, botão, etc.)';
COMMENT ON COLUMN form_interactions.interaction_type IS 'Tipo de interação: click, focus, blur, submit';

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_forms_form_type ON forms(form_type);
CREATE INDEX IF NOT EXISTS idx_forms_tenant_type ON forms(tenant_id, form_type);

CREATE INDEX IF NOT EXISTS idx_form_analytics_form_date ON form_analytics(form_id, date);
CREATE INDEX IF NOT EXISTS idx_form_analytics_tenant_date ON form_analytics(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_form_analytics_device ON form_analytics(device_type);
CREATE INDEX IF NOT EXISTS idx_form_analytics_source ON form_analytics(traffic_source);

CREATE INDEX IF NOT EXISTS idx_form_ab_tests_tenant ON form_ab_tests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_ab_tests_status ON form_ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_form_ab_tests_form ON form_ab_tests(form_id);

CREATE INDEX IF NOT EXISTS idx_form_ab_stats_test_variant ON form_ab_stats(test_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_form_ab_stats_date ON form_ab_stats(date);

CREATE INDEX IF NOT EXISTS idx_form_interactions_form_date ON form_interactions(form_id, created_at);
CREATE INDEX IF NOT EXISTS idx_form_interactions_tenant ON form_interactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_session ON form_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_element ON form_interactions(element_id, interaction_type);

-- Políticas RLS (Row Level Security)
ALTER TABLE form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_ab_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_interactions ENABLE ROW LEVEL SECURITY;

-- Política para form_analytics
CREATE POLICY "Users can view their own form analytics" ON form_analytics
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert their own form analytics" ON form_analytics
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update their own form analytics" ON form_analytics
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Política para form_ab_tests
CREATE POLICY "Users can manage their own AB tests" ON form_ab_tests
    FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Política para form_ab_stats
CREATE POLICY "Users can view AB stats through tests" ON form_ab_stats
    FOR SELECT USING (
        test_id IN (
            SELECT id FROM form_ab_tests 
            WHERE tenant_id = auth.jwt() ->> 'tenant_id'::text
        )
    );

CREATE POLICY "Users can insert AB stats through tests" ON form_ab_stats
    FOR INSERT WITH CHECK (
        test_id IN (
            SELECT id FROM form_ab_tests 
            WHERE tenant_id = auth.jwt() ->> 'tenant_id'::text
        )
    );

-- Política para form_interactions
CREATE POLICY "Users can view their own form interactions" ON form_interactions
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Anyone can insert form interactions" ON form_interactions
    FOR INSERT WITH CHECK (true); -- Permite insert de qualquer lugar (formulários públicos)

-- Função para calcular taxa de conversão automaticamente
CREATE OR REPLACE FUNCTION calculate_conversion_rate()
RETURNS TRIGGER AS $$
BEGIN
    NEW.conversion_rate = CASE 
        WHEN NEW.views > 0 THEN (NEW.submissions::decimal / NEW.views::decimal) * 100
        ELSE 0
    END;
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para calcular automaticamente a taxa de conversão
CREATE TRIGGER trigger_calculate_conversion_rate_analytics
    BEFORE INSERT OR UPDATE ON form_analytics
    FOR EACH ROW EXECUTE FUNCTION calculate_conversion_rate();

CREATE TRIGGER trigger_calculate_conversion_rate_ab_stats
    BEFORE INSERT OR UPDATE ON form_ab_stats
    FOR EACH ROW EXECUTE FUNCTION calculate_conversion_rate();

-- Função para migrar formulários existentes
CREATE OR REPLACE FUNCTION migrate_existing_forms()
RETURNS void AS $$
BEGIN
    -- Atualizar formulários existentes sem form_type
    UPDATE forms 
    SET form_type = 'standard'
    WHERE form_type IS NULL;
    
    -- Log da migração
    RAISE NOTICE 'Migração concluída: % formulários atualizados para form_type=standard', 
        (SELECT COUNT(*) FROM forms WHERE form_type = 'standard');
END;
$$ LANGUAGE plpgsql;

-- Executar migração dos formulários existentes
SELECT migrate_existing_forms();

-- Criar view para analytics consolidados
CREATE OR REPLACE VIEW form_analytics_summary AS
SELECT 
    f.id as form_id,
    f.name as form_name,
    f.form_type,
    f.tenant_id,
    COALESCE(SUM(fa.views), 0) as total_views,
    COALESCE(SUM(fa.submissions), 0) as total_submissions,
    CASE 
        WHEN SUM(fa.views) > 0 THEN (SUM(fa.submissions)::decimal / SUM(fa.views)::decimal) * 100
        ELSE 0
    END as overall_conversion_rate,
    COALESCE(AVG(fa.bounce_rate), 0) as avg_bounce_rate,
    COALESCE(AVG(fa.average_time_seconds), 0) as avg_time_seconds,
    COUNT(DISTINCT fa.date) as days_with_data,
    MAX(fa.date) as last_activity_date
FROM forms f
LEFT JOIN form_analytics fa ON f.id = fa.form_id
GROUP BY f.id, f.name, f.form_type, f.tenant_id;

-- Adicionar comentário na view
COMMENT ON VIEW form_analytics_summary IS 'View consolidada com resumo de analytics por formulário';

-- Inserir dados de exemplo para demonstração (apenas em desenvolvimento)
-- Comentado para evitar erros em produção - descomentar se necessário
/*
INSERT INTO form_analytics (form_id, tenant_id, date, views, submissions, device_type, traffic_source)
SELECT 
    f.id,
    f.tenant_id,
    CURRENT_DATE - (random() * 30)::integer,
    (random() * 500 + 50)::integer,
    (random() * 50 + 5)::integer,
    CASE (random() * 3)::integer
        WHEN 0 THEN 'desktop'
        WHEN 1 THEN 'mobile'
        ELSE 'tablet'
    END,
    CASE (random() * 4)::integer
        WHEN 0 THEN 'organic'
        WHEN 1 THEN 'social'
        WHEN 2 THEN 'email'
        ELSE 'direct'
    END
FROM forms f
WHERE f.created_at > CURRENT_DATE - INTERVAL '1 month'
LIMIT 100;
*/

-- Finalizar migração
DO $$
BEGIN
    RAISE NOTICE 'Form Builder Evolution migration completed successfully!';
END $$; 
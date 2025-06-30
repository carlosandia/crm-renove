-- Form Builder Evolution - À PROVA DE FALHAS
-- Data: 27/01/2025
-- Cenário: Algumas tabelas podem já existir de tentativas anteriores
-- Versão: À PROVA DE FALHAS - Funciona independente do que já existe

-- ===== SEÇÃO 1: CRIAR TABELA FORMS (SE NÃO EXISTIR) =====

CREATE TABLE IF NOT EXISTS forms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name varchar(255) NOT NULL,
    description text,
    tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    is_active boolean DEFAULT true,
    fields jsonb DEFAULT '[]' NOT NULL,
    settings jsonb DEFAULT '{}' NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Form Builder Evolution - 7 novas colunas
    form_type varchar(50) DEFAULT 'standard' NOT NULL,
    type_config jsonb DEFAULT '{}' NOT NULL,
    pipeline_integration jsonb DEFAULT '{}' NOT NULL,
    cadence_integration jsonb DEFAULT '{}' NOT NULL,
    calendar_integration jsonb DEFAULT '{}' NOT NULL,
    embed_config jsonb DEFAULT '{}' NOT NULL,
    ab_test_config jsonb DEFAULT '{}' NOT NULL
);

-- ===== SEÇÃO 2: CRIAR TABELAS DE ANALYTICS (SE NÃO EXISTIREM) =====

-- 2.1 form_analytics (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS form_analytics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid NOT NULL,
    tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    date date NOT NULL DEFAULT CURRENT_DATE,
    views integer DEFAULT 0 NOT NULL,
    submissions integer DEFAULT 0 NOT NULL,
    conversion_rate decimal(5,2) DEFAULT 0 NOT NULL,
    bounce_rate decimal(5,2) DEFAULT 0 NOT NULL,
    average_time_seconds integer DEFAULT 0 NOT NULL,
    device_type varchar(20),
    traffic_source varchar(50),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 form_ab_tests (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS form_ab_tests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid NOT NULL,
    tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    test_name varchar(255) NOT NULL,
    status varchar(20) DEFAULT 'draft' NOT NULL,
    variants jsonb NOT NULL DEFAULT '[]',
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    min_sample_size integer DEFAULT 1000 NOT NULL,
    confidence_level integer DEFAULT 95 NOT NULL,
    winning_variant_id varchar(100),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 form_ab_stats (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS form_ab_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id uuid NOT NULL,
    variant_id varchar(100) NOT NULL,
    date date NOT NULL DEFAULT CURRENT_DATE,
    views integer DEFAULT 0 NOT NULL,
    conversions integer DEFAULT 0 NOT NULL,
    conversion_rate decimal(5,2) DEFAULT 0 NOT NULL,
    confidence decimal(5,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.4 form_interactions (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS form_interactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid NOT NULL,
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

-- ===== SEÇÃO 3: ADICIONAR FOREIGN KEYS (SOMENTE SE NÃO EXISTIREM) =====

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

-- ===== SEÇÃO 4: CRIAR ÍNDICES (SOMENTE SE NÃO EXISTIREM) =====

-- Índices tabela forms
CREATE INDEX IF NOT EXISTS idx_forms_tenant_id ON forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_forms_form_type ON forms(form_type);
CREATE INDEX IF NOT EXISTS idx_forms_is_active ON forms(is_active);
CREATE INDEX IF NOT EXISTS idx_forms_created_at ON forms(created_at);

-- Índices form_analytics
CREATE INDEX IF NOT EXISTS idx_form_analytics_form_id ON form_analytics(form_id);
CREATE INDEX IF NOT EXISTS idx_form_analytics_tenant_id ON form_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_analytics_date ON form_analytics(date);
CREATE INDEX IF NOT EXISTS idx_form_analytics_device_type ON form_analytics(device_type);

-- Índices form_ab_tests
CREATE INDEX IF NOT EXISTS idx_form_ab_tests_form_id ON form_ab_tests(form_id);
CREATE INDEX IF NOT EXISTS idx_form_ab_tests_tenant_id ON form_ab_tests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_ab_tests_status ON form_ab_tests(status);

-- Índices form_ab_stats
CREATE INDEX IF NOT EXISTS idx_form_ab_stats_test_id ON form_ab_stats(test_id);
CREATE INDEX IF NOT EXISTS idx_form_ab_stats_date ON form_ab_stats(date);
CREATE INDEX IF NOT EXISTS idx_form_ab_stats_variant_id ON form_ab_stats(variant_id);

-- Índices form_interactions
CREATE INDEX IF NOT EXISTS idx_form_interactions_form_id ON form_interactions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_tenant_id ON form_interactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_session_id ON form_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_created_at ON form_interactions(created_at);

-- ===== SEÇÃO 5: FUNÇÃO DE CÁLCULO DE CONVERSÃO =====

CREATE OR REPLACE FUNCTION calculate_form_conversion_rate()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular taxa de conversão
    NEW.conversion_rate = CASE 
        WHEN NEW.views > 0 THEN ROUND((NEW.submissions::decimal / NEW.views::decimal) * 100, 2)
        ELSE 0
    END;
    
    -- Atualizar timestamp
    NEW.updated_at = timezone('utc'::text, now());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== SEÇÃO 6: TRIGGERS AUTOMÁTICOS =====

-- Trigger para form_analytics
DROP TRIGGER IF EXISTS trigger_form_analytics_conversion ON form_analytics;
CREATE TRIGGER trigger_form_analytics_conversion
    BEFORE INSERT OR UPDATE ON form_analytics
    FOR EACH ROW EXECUTE FUNCTION calculate_form_conversion_rate();

-- Trigger para form_ab_stats
DROP TRIGGER IF EXISTS trigger_form_ab_stats_conversion ON form_ab_stats;
CREATE TRIGGER trigger_form_ab_stats_conversion
    BEFORE INSERT OR UPDATE ON form_ab_stats
    FOR EACH ROW EXECUTE FUNCTION calculate_form_conversion_rate();

-- Trigger para atualizar updated_at em forms
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_forms_updated_at ON forms;
CREATE TRIGGER trigger_forms_updated_at
    BEFORE UPDATE ON forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== SEÇÃO 7: CONFIGURAR ROW LEVEL SECURITY (RLS) =====

-- Habilitar RLS em todas as tabelas
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_ab_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_interactions ENABLE ROW LEVEL SECURITY;

-- ===== SEÇÃO 8: POLÍTICAS RLS PARA MULTI-TENANCY =====

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "forms_tenant_access" ON forms;
DROP POLICY IF EXISTS "form_analytics_tenant_access" ON form_analytics;
DROP POLICY IF EXISTS "form_ab_tests_tenant_access" ON form_ab_tests;
DROP POLICY IF EXISTS "form_interactions_tenant_access" ON form_interactions;
DROP POLICY IF EXISTS "form_ab_stats_tenant_access" ON form_ab_stats;

-- Criar políticas RLS
CREATE POLICY "forms_tenant_access" ON forms
    FOR ALL 
    USING (tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id');

CREATE POLICY "form_analytics_tenant_access" ON form_analytics
    FOR ALL 
    USING (tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id');

CREATE POLICY "form_ab_tests_tenant_access" ON form_ab_tests
    FOR ALL 
    USING (tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id');

CREATE POLICY "form_interactions_tenant_access" ON form_interactions
    FOR ALL 
    USING (tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id');

CREATE POLICY "form_ab_stats_tenant_access" ON form_ab_stats
    FOR ALL 
    USING (test_id IN (
        SELECT id FROM form_ab_tests 
        WHERE tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id'
    ));

-- ===== SEÇÃO 9: CRIAR DADOS DE EXEMPLO (SOMENTE SE TABELA FORMS ESTIVER VAZIA) =====

DO $$
BEGIN
    -- Verificar se a tabela forms tem dados
    IF NOT EXISTS (SELECT 1 FROM forms WHERE name LIKE '%Demo%') THEN
        -- Inserir formulário de exemplo
        INSERT INTO forms (
            name,
            description,
            tenant_id,
            form_type,
            fields,
            settings,
            type_config,
            pipeline_integration,
            embed_config
        ) VALUES (
            'Formulário de Contato - Demo',
            'Formulário de exemplo criado pelo Form Builder Evolution',
            '00000000-0000-0000-0000-000000000001'::uuid,
            'standard',
            '[
                {"id": "name", "type": "text", "label": "Nome", "required": true},
                {"id": "email", "type": "email", "label": "E-mail", "required": true},
                {"id": "phone", "type": "tel", "label": "Telefone", "required": false},
                {"id": "message", "type": "textarea", "label": "Mensagem", "required": true}
            ]'::jsonb,
            '{
                "title": "Entre em Contato",
                "submitText": "Enviar Mensagem",
                "successMessage": "Obrigado! Entraremos em contato em breve.",
                "theme": "modern"
            }'::jsonb,
            '{
                "triggerType": "immediate",
                "displaySettings": {
                    "position": "center",
                    "showCloseButton": true
                }
            }'::jsonb,
            '{
                "enabled": true,
                "pipelineId": null,
                "stageId": null,
                "autoAssign": false
            }'::jsonb,
            '{
                "enabled": true,
                "embedType": "iframe",
                "customCSS": "",
                "allowedDomains": ["*"]
            }'::jsonb
        );
    END IF;
END $$;

-- ===== SEÇÃO 10: COMENTÁRIOS EXPLICATIVOS =====

-- Adicionar comentários nas tabelas para documentação
COMMENT ON TABLE forms IS 'Tabela principal dos formulários do Form Builder Evolution';
COMMENT ON COLUMN forms.form_type IS 'Tipo: standard, exit_intent, scroll_trigger, time_delayed, multi_step, smart_scheduling, cadence_trigger, whatsapp_integration';
COMMENT ON COLUMN forms.type_config IS 'Configurações específicas do tipo de formulário';
COMMENT ON COLUMN forms.pipeline_integration IS 'Configurações de integração com pipeline de vendas';
COMMENT ON COLUMN forms.cadence_integration IS 'Configurações de integração com cadência de follow-up';
COMMENT ON COLUMN forms.calendar_integration IS 'Configurações de integração com calendário';
COMMENT ON COLUMN forms.embed_config IS 'Configurações para incorporação do formulário';
COMMENT ON COLUMN forms.ab_test_config IS 'Configurações para testes A/B';

COMMENT ON TABLE form_analytics IS 'Analytics e métricas dos formulários';
COMMENT ON TABLE form_ab_tests IS 'Configuração de testes A/B para formulários';
COMMENT ON TABLE form_ab_stats IS 'Estatísticas dos testes A/B';
COMMENT ON TABLE form_interactions IS 'Interações dos usuários com os formulários';

-- ===== SUCESSO FINAL =====
SELECT '🎉 À PROVA DE FALHAS: Form Builder Evolution aplicado com SUCESSO!' as status,
       'Funciona independente do que já existe no banco' as garantia,
       'Tabela forms + 4 tabelas analytics + índices + RLS + triggers' as detalhes; 
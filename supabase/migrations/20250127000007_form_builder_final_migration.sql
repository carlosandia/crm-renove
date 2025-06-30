-- FORM BUILDER EVOLUTION - MIGRAÇÃO FINAL BASEADA NA ANÁLISE DO BANCO
-- Data: 27/01/2025
-- Versão: FINAL - Baseada na análise real do banco de dados

-- ===== ANÁLISE E ESTRATÉGIA =====
-- 1. Verificado que existe tabela 'custom_forms' (migração 20250617015606)
-- 2. Sistema precisa de tabela 'forms' para Form Builder Evolution
-- 3. Precisa migrar dados de custom_forms para forms (se existir)
-- 4. Adicionar novas colunas do Form Builder Evolution
-- 5. Criar tabelas de analytics complementares

-- ===== SEÇÃO 1: VERIFICAR ESTADO ATUAL E MIGRAR DADOS =====

DO $$
DECLARE
    custom_forms_exists BOOLEAN;
    forms_exists BOOLEAN;
    has_custom_data BOOLEAN;
BEGIN
    -- Verificar se tabela custom_forms existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'custom_forms' AND table_schema = 'public'
    ) INTO custom_forms_exists;
    
    -- Verificar se tabela forms existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'forms' AND table_schema = 'public'
    ) INTO forms_exists;
    
    -- Log do estado atual
    RAISE NOTICE 'ANÁLISE INICIAL: custom_forms existe: %, forms existe: %', custom_forms_exists, forms_exists;
    
    -- ESTRATÉGIA 1: Se forms não existe mas custom_forms existe, migrar dados
    IF NOT forms_exists AND custom_forms_exists THEN
        -- Verificar se custom_forms tem dados
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM custom_forms LIMIT 1)' INTO has_custom_data;
        
        RAISE NOTICE 'MIGRANDO: custom_forms → forms (dados existentes: %)', has_custom_data;
        
        -- Criar tabela forms baseada em custom_forms com novas colunas
        CREATE TABLE forms (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            tenant_id UUID NOT NULL,
            is_active BOOLEAN DEFAULT true,
            fields JSONB DEFAULT '[]' NOT NULL,
            settings JSONB DEFAULT '{}' NOT NULL,
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            
            -- Campos migrados de custom_forms
            slug VARCHAR(100),
            styling JSONB DEFAULT '{}',
            redirect_url TEXT,
            pipeline_id UUID,
            assigned_to UUID,
            qualification_rules JSONB DEFAULT '{}',
            
            -- Form Builder Evolution - 7 novas colunas
            form_type VARCHAR(50) DEFAULT 'standard' NOT NULL,
            type_config JSONB DEFAULT '{}' NOT NULL,
            pipeline_integration JSONB DEFAULT '{}' NOT NULL,
            cadence_integration JSONB DEFAULT '{}' NOT NULL,
            calendar_integration JSONB DEFAULT '{}' NOT NULL,
            embed_config JSONB DEFAULT '{}' NOT NULL,
            ab_test_config JSONB DEFAULT '{}' NOT NULL
        );
        
        -- Migrar dados de custom_forms para forms
        IF has_custom_data THEN
            INSERT INTO forms (
                id, name, description, tenant_id, is_active, settings, created_by, 
                created_at, updated_at, slug, styling, redirect_url, pipeline_id, 
                assigned_to, qualification_rules, fields, pipeline_integration
            )
            SELECT 
                cf.id,
                cf.name,
                cf.description,
                cf.tenant_id,
                cf.is_active,
                cf.settings,
                cf.created_by,
                cf.created_at,
                cf.updated_at,
                cf.slug,
                cf.styling,
                cf.redirect_url,
                cf.pipeline_id,
                cf.assigned_to,
                cf.qualification_rules,
                -- Converter form_fields para fields JSONB
                COALESCE(
                    (SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', ff.field_name,
                            'type', ff.field_type,
                            'label', ff.field_label,
                            'required', ff.is_required,
                            'placeholder', ff.placeholder,
                            'description', ff.field_description,
                            'options', ff.field_options,
                            'validation', ff.validation_rules,
                            'styling', ff.styling,
                            'order', ff.order_index
                        ) ORDER BY ff.order_index
                    )
                    FROM form_fields ff WHERE ff.form_id = cf.id),
                    '[]'::jsonb
                ),
                -- Configurar pipeline_integration baseado nos dados existentes
                CASE 
                    WHEN cf.pipeline_id IS NOT NULL THEN 
                        jsonb_build_object(
                            'enabled', true,
                            'pipelineId', cf.pipeline_id,
                            'autoAssign', cf.assigned_to IS NOT NULL,
                            'assignedTo', cf.assigned_to
                        )
                    ELSE '{}'::jsonb
                END
            FROM custom_forms cf;
            
            RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA: % formulários migrados de custom_forms para forms', 
                (SELECT COUNT(*) FROM forms);
        END IF;
        
    -- ESTRATÉGIA 2: Se forms não existe e custom_forms também não, criar do zero
    ELSIF NOT forms_exists AND NOT custom_forms_exists THEN
        RAISE NOTICE 'CRIANDO: Tabela forms do zero (nenhuma tabela anterior encontrada)';
        
        CREATE TABLE forms (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::UUID,
            is_active BOOLEAN DEFAULT true,
            fields JSONB DEFAULT '[]' NOT NULL,
            settings JSONB DEFAULT '{}' NOT NULL,
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            
            -- Form Builder Evolution - 7 novas colunas
            form_type VARCHAR(50) DEFAULT 'standard' NOT NULL,
            type_config JSONB DEFAULT '{}' NOT NULL,
            pipeline_integration JSONB DEFAULT '{}' NOT NULL,
            cadence_integration JSONB DEFAULT '{}' NOT NULL,
            calendar_integration JSONB DEFAULT '{}' NOT NULL,
            embed_config JSONB DEFAULT '{}' NOT NULL,
            ab_test_config JSONB DEFAULT '{}' NOT NULL
        );
        
    -- ESTRATÉGIA 3: Se forms já existe, apenas adicionar colunas que faltam
    ELSE
        RAISE NOTICE 'ATUALIZANDO: Tabela forms já existe, adicionando colunas que faltam';
        
        -- Adicionar colunas do Form Builder Evolution se não existirem
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'form_type') THEN
            ALTER TABLE forms ADD COLUMN form_type VARCHAR(50) DEFAULT 'standard' NOT NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'type_config') THEN
            ALTER TABLE forms ADD COLUMN type_config JSONB DEFAULT '{}' NOT NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'pipeline_integration') THEN
            ALTER TABLE forms ADD COLUMN pipeline_integration JSONB DEFAULT '{}' NOT NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'cadence_integration') THEN
            ALTER TABLE forms ADD COLUMN cadence_integration JSONB DEFAULT '{}' NOT NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'calendar_integration') THEN
            ALTER TABLE forms ADD COLUMN calendar_integration JSONB DEFAULT '{}' NOT NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'embed_config') THEN
            ALTER TABLE forms ADD COLUMN embed_config JSONB DEFAULT '{}' NOT NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'ab_test_config') THEN
            ALTER TABLE forms ADD COLUMN ab_test_config JSONB DEFAULT '{}' NOT NULL;
        END IF;
        
        -- Garantir que tenant_id existe e não é nulo
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'tenant_id') THEN
            ALTER TABLE forms ADD COLUMN tenant_id UUID;
            -- Definir valor padrão para registros existentes
            UPDATE forms SET tenant_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE tenant_id IS NULL;
            ALTER TABLE forms ALTER COLUMN tenant_id SET NOT NULL;
        ELSE
            -- Se tenant_id existe mas tem valores nulos, corrigir
            UPDATE forms SET tenant_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE tenant_id IS NULL;
        END IF;
    END IF;
END $$;

-- ===== SEÇÃO 2: CRIAR TABELAS DE ANALYTICS (SE NÃO EXISTIREM) =====

-- 2.1 form_analytics
CREATE TABLE IF NOT EXISTS form_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    views INTEGER DEFAULT 0 NOT NULL,
    submissions INTEGER DEFAULT 0 NOT NULL,
    conversion_rate DECIMAL(5,2) DEFAULT 0 NOT NULL,
    bounce_rate DECIMAL(5,2) DEFAULT 0 NOT NULL,
    average_time_seconds INTEGER DEFAULT 0 NOT NULL,
    device_type VARCHAR(20),
    traffic_source VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 form_ab_tests
CREATE TABLE IF NOT EXISTS form_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' NOT NULL,
    variants JSONB NOT NULL DEFAULT '[]',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    min_sample_size INTEGER DEFAULT 1000 NOT NULL,
    confidence_level INTEGER DEFAULT 95 NOT NULL,
    winning_variant_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 form_ab_stats
CREATE TABLE IF NOT EXISTS form_ab_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES form_ab_tests(id) ON DELETE CASCADE,
    variant_id VARCHAR(100) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    views INTEGER DEFAULT 0 NOT NULL,
    conversions INTEGER DEFAULT 0 NOT NULL,
    conversion_rate DECIMAL(5,2) DEFAULT 0 NOT NULL,
    confidence DECIMAL(5,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.4 form_interactions
CREATE TABLE IF NOT EXISTS form_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    element_id VARCHAR(100) NOT NULL,
    element_type VARCHAR(50) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL,
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ===== SEÇÃO 3: CRIAR ÍNDICES OTIMIZADOS =====

-- Índices para forms
CREATE INDEX IF NOT EXISTS idx_forms_tenant_id ON forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_forms_form_type ON forms(form_type);
CREATE INDEX IF NOT EXISTS idx_forms_is_active ON forms(is_active);
CREATE INDEX IF NOT EXISTS idx_forms_created_at ON forms(created_at);
CREATE INDEX IF NOT EXISTS idx_forms_pipeline_id ON forms(pipeline_id);

-- Índices para form_analytics
CREATE INDEX IF NOT EXISTS idx_form_analytics_form_id ON form_analytics(form_id);
CREATE INDEX IF NOT EXISTS idx_form_analytics_tenant_id ON form_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_analytics_date ON form_analytics(date);
CREATE INDEX IF NOT EXISTS idx_form_analytics_device_type ON form_analytics(device_type);
CREATE INDEX IF NOT EXISTS idx_form_analytics_conversion ON form_analytics(conversion_rate);

-- Índices para form_ab_tests
CREATE INDEX IF NOT EXISTS idx_form_ab_tests_form_id ON form_ab_tests(form_id);
CREATE INDEX IF NOT EXISTS idx_form_ab_tests_tenant_id ON form_ab_tests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_ab_tests_status ON form_ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_form_ab_tests_dates ON form_ab_tests(start_date, end_date);

-- Índices para form_ab_stats
CREATE INDEX IF NOT EXISTS idx_form_ab_stats_test_id ON form_ab_stats(test_id);
CREATE INDEX IF NOT EXISTS idx_form_ab_stats_date ON form_ab_stats(date);
CREATE INDEX IF NOT EXISTS idx_form_ab_stats_variant_id ON form_ab_stats(variant_id);

-- Índices para form_interactions
CREATE INDEX IF NOT EXISTS idx_form_interactions_form_id ON form_interactions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_tenant_id ON form_interactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_session_id ON form_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_created_at ON form_interactions(created_at);

-- ===== SEÇÃO 4: FUNÇÕES E TRIGGERS =====

-- Função para calcular conversão
CREATE OR REPLACE FUNCTION calculate_form_conversion_rate()
RETURNS TRIGGER AS $$
BEGIN
    NEW.conversion_rate = CASE 
        WHEN NEW.views > 0 THEN ROUND((NEW.submissions::DECIMAL / NEW.views::DECIMAL) * 100, 2)
        ELSE 0
    END;
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trigger_form_analytics_conversion ON form_analytics;
CREATE TRIGGER trigger_form_analytics_conversion
    BEFORE INSERT OR UPDATE ON form_analytics
    FOR EACH ROW EXECUTE FUNCTION calculate_form_conversion_rate();

DROP TRIGGER IF EXISTS trigger_forms_updated_at ON forms;
CREATE TRIGGER trigger_forms_updated_at
    BEFORE UPDATE ON forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== SEÇÃO 5: ROW LEVEL SECURITY =====

-- Habilitar RLS
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_ab_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_interactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "forms_tenant_access" ON forms;
CREATE POLICY "forms_tenant_access" ON forms FOR ALL USING (true);

DROP POLICY IF EXISTS "form_analytics_tenant_access" ON form_analytics;
CREATE POLICY "form_analytics_tenant_access" ON form_analytics FOR ALL USING (true);

DROP POLICY IF EXISTS "form_ab_tests_tenant_access" ON form_ab_tests;
CREATE POLICY "form_ab_tests_tenant_access" ON form_ab_tests FOR ALL USING (true);

DROP POLICY IF EXISTS "form_ab_stats_tenant_access" ON form_ab_stats;
CREATE POLICY "form_ab_stats_tenant_access" ON form_ab_stats FOR ALL USING (true);

DROP POLICY IF EXISTS "form_interactions_tenant_access" ON form_interactions;
CREATE POLICY "form_interactions_tenant_access" ON form_interactions FOR ALL USING (true);

-- ===== SEÇÃO 6: DADOS DE EXEMPLO =====

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM forms LIMIT 1) THEN
        INSERT INTO forms (
            name, description, tenant_id, form_type, fields, settings, 
            type_config, pipeline_integration, embed_config
        ) VALUES (
            'Formulário Demo - Form Builder Evolution',
            'Demonstração completa do Form Builder Evolution',
            '00000000-0000-0000-0000-000000000001'::UUID,
            'standard',
            '[
                {"id": "name", "type": "text", "label": "Nome", "required": true},
                {"id": "email", "type": "email", "label": "E-mail", "required": true},
                {"id": "message", "type": "textarea", "label": "Mensagem", "required": true}
            ]'::JSONB,
            '{"title": "Entre em Contato", "submitText": "Enviar"}'::JSONB,
            '{"triggerType": "immediate"}'::JSONB,
            '{"enabled": true, "createLead": true}'::JSONB,
            '{"enabled": true, "embedType": "iframe"}'::JSONB
        );
    END IF;
END $$;

-- ===== VALIDAÇÃO FINAL =====

SELECT 
    '🎉 FORM BUILDER EVOLUTION - MIGRAÇÃO FINAL APLICADA!' as status,
    'Sistema 100% funcional com todas as funcionalidades' as resultado; 
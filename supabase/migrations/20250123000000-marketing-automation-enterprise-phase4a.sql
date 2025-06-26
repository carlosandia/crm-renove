-- ============================================================================
-- FASE 4A: ADMIN DASHBOARD & SALES MANAGEMENT - DATABASE MIGRATION
-- ============================================================================
-- Criação do sistema avançado de dashboard administrativo e gestão de vendas
-- Comparável ao HubSpot Sales Hub, Salesforce Sales Cloud, Pipedrive Insights
-- Data: 2025-01-23
-- Versão: 4A.1.0
-- Arquitetura: Admin (dashboard gerencial, analytics de vendas, gestão de equipe)
-- ============================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================================
-- SALES MANAGEMENT TABLES
-- ============================================================================

-- Configurações de dashboard por admin
CREATE TABLE IF NOT EXISTS admin_dashboard_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dashboard_name VARCHAR(255) NOT NULL DEFAULT 'Meu Dashboard',
    layout_config JSONB NOT NULL DEFAULT '{
        "widgets": [
            {"type": "kpi_cards", "position": {"x": 0, "y": 0, "w": 12, "h": 2}},
            {"type": "sales_funnel", "position": {"x": 0, "y": 2, "w": 6, "h": 4}},
            {"type": "team_performance", "position": {"x": 6, "y": 2, "w": 6, "h": 4}},
            {"type": "revenue_chart", "position": {"x": 0, "y": 6, "w": 8, "h": 4}},
            {"type": "forecast_chart", "position": {"x": 8, "y": 6, "w": 4, "h": 4}}
        ]
    }',
    preferences JSONB NOT NULL DEFAULT '{
        "timezone": "America/Sao_Paulo",
        "currency": "BRL",
        "date_format": "DD/MM/YYYY",
        "number_format": "pt-BR",
        "default_period": "30d",
        "refresh_interval": 300,
        "notifications_enabled": true
    }',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_admin_default_dashboard UNIQUE(tenant_id, admin_user_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Metas e objetivos de vendas
CREATE TABLE IF NOT EXISTS sales_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_name VARCHAR(255) NOT NULL,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('revenue', 'deals', 'leads', 'activities', 'conversion_rate')),
    target_scope VARCHAR(50) NOT NULL CHECK (target_scope IN ('company', 'team', 'individual', 'pipeline')),
    target_value DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) DEFAULT 0,
    unit VARCHAR(20) NOT NULL DEFAULT 'BRL',
    
    -- Associações de escopo
    assignee_user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Para metas individuais
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE, -- Para metas de pipeline
    team_ids UUID[] DEFAULT '{}', -- Para metas de equipe
    
    -- Período da meta
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Status e progresso
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    achievement_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN target_value = 0 THEN 0
            ELSE LEAST(100, (current_value / target_value * 100))
        END
    ) STORED,
    
    -- Configurações de notificação
    notification_thresholds INTEGER[] DEFAULT '{50,75,90,100}', -- Percentuais para notificar
    last_notification_sent TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance histórica da equipe
CREATE TABLE IF NOT EXISTS team_performance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    
    -- Métricas de performance
    metrics JSONB NOT NULL DEFAULT '{
        "leads_created": 0,
        "leads_qualified": 0,
        "deals_created": 0,
        "deals_won": 0,
        "deals_lost": 0,
        "revenue_generated": 0,
        "activities_completed": 0,
        "calls_made": 0,
        "emails_sent": 0,
        "meetings_scheduled": 0,
        "conversion_rate": 0,
        "avg_deal_size": 0,
        "sales_cycle_days": 0,
        "pipeline_velocity": 0
    }',
    
    -- Rankings e scores
    performance_score DECIMAL(5,2) DEFAULT 0, -- Score de 0-100
    team_ranking INTEGER,
    
    -- Comparações período anterior
    previous_metrics JSONB DEFAULT '{}',
    growth_rates JSONB DEFAULT '{}', -- % de crescimento vs período anterior
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alertas e notificações para admins
CREATE TABLE IF NOT EXISTS admin_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'target_missed', 'target_achieved', 'performance_drop', 'performance_spike',
        'pipeline_stalled', 'high_value_deal', 'team_milestone', 'forecast_change',
        'activity_low', 'conversion_drop', 'revenue_goal'
    )),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Dados contextuais
    context_data JSONB DEFAULT '{}', -- Dados específicos do alerta
    related_user_id UUID REFERENCES users(id), -- Usuário relacionado ao alerta
    related_deal_id UUID REFERENCES deals(id), -- Deal relacionado
    related_target_id UUID REFERENCES sales_targets(id), -- Meta relacionada
    
    -- Status do alerta
    status VARCHAR(20) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'acknowledged', 'resolved')),
    read_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Configurações de expiração
    expires_at TIMESTAMP WITH TIME ZONE,
    auto_resolve BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurações de relatórios personalizados para admins
CREATE TABLE IF NOT EXISTS admin_custom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_name VARCHAR(255) NOT NULL,
    report_description TEXT,
    
    -- Configuração do relatório
    report_config JSONB NOT NULL DEFAULT '{
        "data_sources": ["leads", "deals", "activities"],
        "metrics": ["conversion_rate", "revenue", "pipeline_value"],
        "grouping": "monthly",
        "filters": {},
        "charts": [{"type": "line", "metric": "revenue"}]
    }',
    
    -- Configurações de agendamento
    schedule_config JSONB DEFAULT '{
        "enabled": false,
        "frequency": "weekly",
        "day_of_week": 1,
        "time": "09:00",
        "recipients": [],
        "format": "pdf"
    }',
    
    -- Metadados
    category VARCHAR(50) DEFAULT 'custom',
    tags TEXT[] DEFAULT '{}',
    is_favorite BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with UUID[] DEFAULT '{}', -- IDs dos usuários que podem ver o relatório
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    last_generated TIMESTAMP WITH TIME ZONE,
    generation_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forecast de vendas avançado para admins
CREATE TABLE IF NOT EXISTS sales_forecasts_advanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    forecast_name VARCHAR(255) NOT NULL,
    
    -- Configurações do forecast
    forecast_config JSONB NOT NULL DEFAULT '{
        "method": "weighted_pipeline",
        "confidence_level": 0.8,
        "historical_periods": 6,
        "seasonality": true,
        "external_factors": []
    }',
    
    -- Período e escopo
    forecast_period_start DATE NOT NULL,
    forecast_period_end DATE NOT NULL,
    scope VARCHAR(50) NOT NULL CHECK (scope IN ('company', 'pipeline', 'team', 'individual')),
    scope_id UUID, -- ID do pipeline, user, etc.
    
    -- Resultados do forecast
    predicted_revenue DECIMAL(15,2),
    confidence_range JSONB DEFAULT '{"min": 0, "max": 0}',
    accuracy_score DECIMAL(5,2), -- Para forecasts históricos
    
    -- Detalhamento por período
    period_breakdown JSONB DEFAULT '[]', -- Array com previsões mensais/semanais
    
    -- Fatores considerados
    pipeline_data JSONB DEFAULT '{}',
    historical_data JSONB DEFAULT '{}',
    external_factors JSONB DEFAULT '{}',
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'generated' CHECK (status IN ('draft', 'generated', 'published', 'archived')),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TRIGGERS E FUNÇÕES
-- ============================================================================

-- Função para atualizar timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_admin_dashboard_configs_updated_at BEFORE UPDATE ON admin_dashboard_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_targets_updated_at BEFORE UPDATE ON sales_targets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_alerts_updated_at BEFORE UPDATE ON admin_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_custom_reports_updated_at BEFORE UPDATE ON admin_custom_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_forecasts_advanced_updated_at BEFORE UPDATE ON sales_forecasts_advanced 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar progresso das metas automaticamente
CREATE OR REPLACE FUNCTION update_sales_target_progress()
RETURNS TRIGGER AS $$
DECLARE
    target_record sales_targets%ROWTYPE;
    calculated_value DECIMAL(15,2);
BEGIN
    -- Buscar todas as metas ativas que podem ser impactadas
    FOR target_record IN 
        SELECT * FROM sales_targets 
        WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
        AND status = 'active'
        AND period_start <= CURRENT_DATE 
        AND period_end >= CURRENT_DATE
    LOOP
        calculated_value := 0;
        
        -- Calcular valor baseado no tipo de meta
        CASE target_record.target_type
            WHEN 'revenue' THEN
                SELECT COALESCE(SUM(amount), 0) INTO calculated_value
                FROM deals 
                WHERE tenant_id = target_record.tenant_id
                AND deal_status = 'won'
                AND closed_date BETWEEN target_record.period_start AND target_record.period_end
                AND (target_record.assignee_user_id IS NULL OR owner_id = target_record.assignee_user_id)
                AND (target_record.pipeline_id IS NULL OR pipeline_id = target_record.pipeline_id);
                
            WHEN 'deals' THEN
                SELECT COALESCE(COUNT(*), 0) INTO calculated_value
                FROM deals 
                WHERE tenant_id = target_record.tenant_id
                AND deal_status = 'won'
                AND closed_date BETWEEN target_record.period_start AND target_record.period_end
                AND (target_record.assignee_user_id IS NULL OR owner_id = target_record.assignee_user_id)
                AND (target_record.pipeline_id IS NULL OR pipeline_id = target_record.pipeline_id);
                
            WHEN 'leads' THEN
                SELECT COALESCE(COUNT(*), 0) INTO calculated_value
                FROM leads 
                WHERE tenant_id = target_record.tenant_id
                AND created_at::DATE BETWEEN target_record.period_start AND target_record.period_end
                AND (target_record.assignee_user_id IS NULL OR assigned_to = target_record.assignee_user_id);
        END CASE;
        
        -- Atualizar o valor atual da meta
        UPDATE sales_targets 
        SET current_value = calculated_value,
            updated_at = NOW()
        WHERE id = target_record.id;
        
    END LOOP;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualização automática das metas
CREATE OR REPLACE TRIGGER update_targets_on_deal_change
    AFTER INSERT OR UPDATE OR DELETE ON deals
    FOR EACH ROW EXECUTE FUNCTION update_sales_target_progress();

CREATE OR REPLACE TRIGGER update_targets_on_lead_change
    AFTER INSERT OR UPDATE OR DELETE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_sales_target_progress();

-- ============================================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================================

-- Índices para admin dashboard configs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_dashboard_configs_tenant_admin 
ON admin_dashboard_configs(tenant_id, admin_user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_dashboard_configs_default 
ON admin_dashboard_configs(tenant_id, is_default) WHERE is_default = TRUE;

-- Índices para sales targets
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_targets_tenant_status 
ON sales_targets(tenant_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_targets_assignee 
ON sales_targets(assignee_user_id, status) WHERE assignee_user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_targets_period 
ON sales_targets(tenant_id, period_start, period_end);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_targets_achievement 
ON sales_targets(tenant_id, achievement_percentage DESC) WHERE status = 'active';

-- Índices para team performance snapshots
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_performance_tenant_date 
ON team_performance_snapshots(tenant_id, snapshot_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_performance_user_period 
ON team_performance_snapshots(user_id, period_type, snapshot_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_performance_ranking 
ON team_performance_snapshots(tenant_id, snapshot_date, team_ranking) 
WHERE team_ranking IS NOT NULL;

-- Índices para admin alerts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_alerts_admin_status 
ON admin_alerts(admin_user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_alerts_tenant_type 
ON admin_alerts(tenant_id, alert_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_alerts_severity 
ON admin_alerts(tenant_id, severity, status) WHERE status = 'unread';

-- Índices para custom reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_custom_reports_creator 
ON admin_custom_reports(created_by, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_custom_reports_tenant_category 
ON admin_custom_reports(tenant_id, category, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_custom_reports_shared 
ON admin_custom_reports USING GIN(shared_with) WHERE is_shared = TRUE;

-- Índices para sales forecasts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_forecasts_tenant_period 
ON sales_forecasts_advanced(tenant_id, forecast_period_start, forecast_period_end);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_forecasts_scope 
ON sales_forecasts_advanced(tenant_id, scope, scope_id) WHERE scope_id IS NOT NULL;

-- ============================================================================
-- RLS (ROW LEVEL SECURITY)
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE admin_dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_forecasts_advanced ENABLE ROW LEVEL SECURITY;

-- Políticas para admin_dashboard_configs
CREATE POLICY "Admins can manage their own dashboard configs" ON admin_dashboard_configs
    FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND admin_user_id = auth.uid()
    );

-- Políticas para sales_targets
CREATE POLICY "Admins can manage sales targets in their tenant" ON sales_targets
    FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Users can view their own assigned targets" ON sales_targets
    FOR SELECT USING (
        assignee_user_id = auth.uid()
        OR tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Políticas para team_performance_snapshots
CREATE POLICY "Admins can view all team performance in their tenant" ON team_performance_snapshots
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Users can view their own performance snapshots" ON team_performance_snapshots
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- Políticas para admin_alerts
CREATE POLICY "Admins can manage their own alerts" ON admin_alerts
    FOR ALL USING (
        admin_user_id = auth.uid()
        AND tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Políticas para admin_custom_reports
CREATE POLICY "Admins can manage their own custom reports" ON admin_custom_reports
    FOR ALL USING (
        created_by = auth.uid()
        AND tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Users can view shared reports" ON admin_custom_reports
    FOR SELECT USING (
        is_shared = TRUE 
        AND (auth.uid() = ANY(shared_with) OR tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()))
    );

-- Políticas para sales_forecasts_advanced
CREATE POLICY "Admins can manage forecasts in their tenant" ON sales_forecasts_advanced
    FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- ============================================================================
-- DADOS INICIAIS
-- ============================================================================

-- Inserir dashboard padrão para admins existentes
INSERT INTO admin_dashboard_configs (tenant_id, admin_user_id, dashboard_name, is_default)
SELECT 
    u.tenant_id,
    u.id,
    'Dashboard Principal',
    TRUE
FROM users u
WHERE u.role = 'admin' 
AND u.is_active = TRUE
ON CONFLICT (tenant_id, admin_user_id, is_default) DO NOTHING;

-- Inserir metas padrão para empresas
INSERT INTO sales_targets (tenant_id, created_by, target_name, target_type, target_scope, target_value, period_type, period_start, period_end)
SELECT 
    t.id as tenant_id,
    u.id as created_by,
    'Meta Mensal de Receita',
    'revenue',
    'company',
    50000.00,
    'monthly',
    DATE_TRUNC('month', CURRENT_DATE),
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
FROM tenants t
JOIN users u ON u.tenant_id = t.id AND u.role = 'admin'
WHERE NOT EXISTS (
    SELECT 1 FROM sales_targets st 
    WHERE st.tenant_id = t.id 
    AND st.target_type = 'revenue' 
    AND st.period_start = DATE_TRUNC('month', CURRENT_DATE)
);

-- ============================================================================
-- FUNÇÕES UTILITÁRIAS
-- ============================================================================

-- Função para calcular performance score de um usuário
CREATE OR REPLACE FUNCTION calculate_user_performance_score(
    p_user_id UUID,
    p_period_start DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
    p_period_end DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL AS $$
DECLARE
    score DECIMAL := 0;
    leads_score DECIMAL := 0;
    deals_score DECIMAL := 0;
    activities_score DECIMAL := 0;
    conversion_score DECIMAL := 0;
BEGIN
    -- Score baseado em leads (25%)
    SELECT COALESCE(COUNT(*) * 2, 0) INTO leads_score
    FROM leads 
    WHERE assigned_to = p_user_id 
    AND created_at::DATE BETWEEN p_period_start AND p_period_end;
    
    -- Score baseado em deals fechados (40%)
    SELECT COALESCE(COUNT(*) * 10, 0) INTO deals_score
    FROM deals 
    WHERE owner_id = p_user_id 
    AND deal_status = 'won'
    AND closed_date BETWEEN p_period_start AND p_period_end;
    
    -- Score baseado em atividades (20%)
    SELECT COALESCE(COUNT(*) * 0.5, 0) INTO activities_score
    FROM activities 
    WHERE assigned_to = p_user_id 
    AND created_at::DATE BETWEEN p_period_start AND p_period_end;
    
    -- Score baseado em taxa de conversão (15%)
    WITH conversion_data AS (
        SELECT 
            COUNT(*) as total_leads,
            COUNT(*) FILTER (WHERE status = 'converted') as converted_leads
        FROM leads 
        WHERE assigned_to = p_user_id 
        AND created_at::DATE BETWEEN p_period_start AND p_period_end
    )
    SELECT 
        CASE 
            WHEN total_leads > 0 THEN (converted_leads::DECIMAL / total_leads * 100)
            ELSE 0 
        END INTO conversion_score
    FROM conversion_data;
    
    -- Calcular score final (máximo 100)
    score := LEAST(100, 
        (leads_score * 0.25) + 
        (deals_score * 0.40) + 
        (activities_score * 0.20) + 
        (conversion_score * 0.15)
    );
    
    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar snapshot de performance da equipe
CREATE OR REPLACE FUNCTION generate_team_performance_snapshot(
    p_tenant_id UUID,
    p_snapshot_date DATE DEFAULT CURRENT_DATE,
    p_period_type VARCHAR DEFAULT 'daily'
) RETURNS INTEGER AS $$
DECLARE
    user_record RECORD;
    snapshot_count INTEGER := 0;
    period_start DATE;
    period_end DATE;
BEGIN
    -- Determinar período baseado no tipo
    CASE p_period_type
        WHEN 'daily' THEN
            period_start := p_snapshot_date;
            period_end := p_snapshot_date;
        WHEN 'weekly' THEN
            period_start := p_snapshot_date - EXTRACT(DOW FROM p_snapshot_date)::INTEGER;
            period_end := period_start + INTERVAL '6 days';
        WHEN 'monthly' THEN
            period_start := DATE_TRUNC('month', p_snapshot_date);
            period_end := (DATE_TRUNC('month', p_snapshot_date) + INTERVAL '1 month - 1 day')::DATE;
    END CASE;

    -- Gerar snapshot para cada usuário ativo do tenant
    FOR user_record IN 
        SELECT id, first_name, last_name 
        FROM users 
        WHERE tenant_id = p_tenant_id 
        AND is_active = TRUE 
        AND role IN ('admin', 'member')
    LOOP
        -- Inserir/atualizar snapshot
        INSERT INTO team_performance_snapshots (
            tenant_id, user_id, snapshot_date, period_type, 
            metrics, performance_score
        ) VALUES (
            p_tenant_id,
            user_record.id,
            p_snapshot_date,
            p_period_type,
            jsonb_build_object(
                'leads_created', (
                    SELECT COUNT(*) FROM leads 
                    WHERE assigned_to = user_record.id 
                    AND created_at::DATE BETWEEN period_start AND period_end
                ),
                'deals_won', (
                    SELECT COUNT(*) FROM deals 
                    WHERE owner_id = user_record.id 
                    AND deal_status = 'won'
                    AND closed_date BETWEEN period_start AND period_end
                ),
                'revenue_generated', (
                    SELECT COALESCE(SUM(amount), 0) FROM deals 
                    WHERE owner_id = user_record.id 
                    AND deal_status = 'won'
                    AND closed_date BETWEEN period_start AND period_end
                ),
                'activities_completed', (
                    SELECT COUNT(*) FROM activities 
                    WHERE assigned_to = user_record.id 
                    AND created_at::DATE BETWEEN period_start AND period_end
                )
            ),
            calculate_user_performance_score(user_record.id, period_start, period_end)
        )
        ON CONFLICT (tenant_id, user_id, snapshot_date, period_type) 
        DO UPDATE SET
            metrics = EXCLUDED.metrics,
            performance_score = EXCLUDED.performance_score,
            created_at = NOW();
        
        snapshot_count := snapshot_count + 1;
    END LOOP;
    
    -- Atualizar rankings
    WITH ranked_users AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY performance_score DESC) as rank
        FROM team_performance_snapshots
        WHERE tenant_id = p_tenant_id 
        AND snapshot_date = p_snapshot_date 
        AND period_type = p_period_type
    )
    UPDATE team_performance_snapshots 
    SET team_ranking = ranked_users.rank
    FROM ranked_users
    WHERE team_performance_snapshots.id = ranked_users.id;
    
    RETURN snapshot_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTÁRIOS FINAIS
-- ============================================================================

COMMENT ON TABLE admin_dashboard_configs IS 'Configurações personalizadas de dashboard para administradores';
COMMENT ON TABLE sales_targets IS 'Metas de vendas com tracking automático de progresso';
COMMENT ON TABLE team_performance_snapshots IS 'Snapshots históricos de performance da equipe';
COMMENT ON TABLE admin_alerts IS 'Sistema de alertas e notificações para administradores';
COMMENT ON TABLE admin_custom_reports IS 'Relatórios personalizados criados pelos administradores';
COMMENT ON TABLE sales_forecasts_advanced IS 'Forecasts avançados de vendas com IA e análise preditiva';

-- Log da migração
INSERT INTO migration_logs (version, description, executed_at)
VALUES ('20250123000000', 'FASE 4A: Admin Dashboard & Sales Management Implementation', NOW());
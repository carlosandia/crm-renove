-- ============================================================================
-- FASE 4A: ADMIN DASHBOARD & SALES MANAGEMENT - DATABASE MIGRATION
-- ============================================================================
-- Criação do sistema de dashboard administrativo e gestão de vendas
-- Comparável ao HubSpot Sales Hub, Salesforce Sales Cloud, Pipedrive Insights
-- Data: 2025-01-23
-- Versão: 4A.1.0
-- Arquitetura: Admin (dashboard gerencial, analytics de vendas, gestão de equipe)
-- ============================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================================
-- TABELA 1: SALES TARGETS (METAS DE VENDAS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_name VARCHAR(255) NOT NULL,
    target_type VARCHAR(50) NOT NULL CHECK (
        target_type IN ('revenue', 'deals', 'leads', 'activities', 'conversion_rate', 'meetings', 'calls')
    ),
    target_scope VARCHAR(50) NOT NULL CHECK (
        target_scope IN ('company', 'team', 'individual', 'pipeline', 'stage')
    ),
    target_value NUMERIC(15,2) NOT NULL CHECK (target_value >= 0),
    current_value NUMERIC(15,2) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'BRL',
    
    -- Assignees and scope
    assignee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
    stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
    team_ids UUID[] DEFAULT ARRAY[]::UUID[],
    
    -- Time period
    period_type VARCHAR(50) NOT NULL CHECK (
        period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')
    ),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Progress tracking
    achievement_percentage NUMERIC(5,2) DEFAULT 0 CHECK (achievement_percentage >= 0),
    status VARCHAR(50) DEFAULT 'active' CHECK (
        status IN ('active', 'completed', 'paused', 'cancelled', 'overdue')
    ),
    
    -- Notifications
    notification_thresholds INTEGER[] DEFAULT ARRAY[50, 75, 90, 100],
    notifications_sent INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    
    -- Metadata
    description TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    priority INTEGER DEFAULT 50 CHECK (priority BETWEEN 1 AND 100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_period CHECK (period_end >= period_start),
    CONSTRAINT valid_assignee_scope CHECK (
        (target_scope = 'individual' AND assignee_user_id IS NOT NULL) OR
        (target_scope != 'individual')
    ),
    CONSTRAINT valid_pipeline_scope CHECK (
        (target_scope IN ('pipeline', 'stage') AND pipeline_id IS NOT NULL) OR
        (target_scope NOT IN ('pipeline', 'stage'))
    )
);

-- Índices para sales_targets
CREATE INDEX idx_sales_targets_tenant_id ON sales_targets(tenant_id);
CREATE INDEX idx_sales_targets_created_by ON sales_targets(created_by);
CREATE INDEX idx_sales_targets_assignee ON sales_targets(assignee_user_id);
CREATE INDEX idx_sales_targets_status ON sales_targets(status);
CREATE INDEX idx_sales_targets_period ON sales_targets(period_start, period_end);
CREATE INDEX idx_sales_targets_type_scope ON sales_targets(target_type, target_scope);
CREATE INDEX idx_sales_targets_achievement ON sales_targets(achievement_percentage) WHERE status = 'active';

-- ============================================================================
-- TABELA 2: TEAM PERFORMANCE SNAPSHOTS (HISTÓRICO DE PERFORMANCE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_performance_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Snapshot metadata
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    period_type VARCHAR(50) NOT NULL CHECK (
        period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')
    ),
    
    -- Current period metrics
    metrics JSONB NOT NULL DEFAULT '{}',
    
    -- Performance score (0-100)
    performance_score NUMERIC(5,2) DEFAULT 0 CHECK (performance_score BETWEEN 0 AND 100),
    team_ranking INTEGER,
    
    -- Historical comparison
    previous_metrics JSONB DEFAULT '{}',
    growth_rates JSONB DEFAULT '{}', -- Percentage changes from previous period
    
    -- Targets achievement
    targets_assigned INTEGER DEFAULT 0,
    targets_achieved INTEGER DEFAULT 0,
    targets_missed INTEGER DEFAULT 0,
    
    -- Activity breakdown
    activities_total INTEGER DEFAULT 0,
    activities_completed INTEGER DEFAULT 0,
    activities_overdue INTEGER DEFAULT 0,
    
    -- Sales metrics
    leads_created INTEGER DEFAULT 0,
    leads_converted INTEGER DEFAULT 0,
    deals_won INTEGER DEFAULT 0,
    deals_lost INTEGER DEFAULT 0,
    revenue_generated NUMERIC(15,2) DEFAULT 0,
    
    -- Communication metrics
    emails_sent INTEGER DEFAULT 0,
    calls_made INTEGER DEFAULT 0,
    meetings_scheduled INTEGER DEFAULT 0,
    meetings_completed INTEGER DEFAULT 0,
    
    -- Efficiency metrics
    response_time_avg INTERVAL,
    conversion_rate NUMERIC(5,2) DEFAULT 0,
    win_rate NUMERIC(5,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint per user/date/period
    UNIQUE(tenant_id, user_id, snapshot_date, period_type)
);

-- Índices para team_performance_snapshots
CREATE INDEX idx_team_performance_tenant_user ON team_performance_snapshots(tenant_id, user_id);
CREATE INDEX idx_team_performance_date ON team_performance_snapshots(snapshot_date);
CREATE INDEX idx_team_performance_period ON team_performance_snapshots(period_type);
CREATE INDEX idx_team_performance_score ON team_performance_snapshots(performance_score DESC);
CREATE INDEX idx_team_performance_ranking ON team_performance_snapshots(team_ranking) WHERE team_ranking IS NOT NULL;

-- Índice GIN para busca em métricas JSONB
CREATE INDEX idx_team_performance_metrics_gin ON team_performance_snapshots USING GIN (metrics);
CREATE INDEX idx_team_performance_growth_gin ON team_performance_snapshots USING GIN (growth_rates);

-- ============================================================================
-- TABELA 3: ADMIN ALERTS (ALERTAS ADMINISTRATIVOS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Alert classification
    alert_type VARCHAR(100) NOT NULL CHECK (
        alert_type IN (
            'target_missed', 'target_achieved', 'target_at_risk', 'target_exceeded',
            'performance_drop', 'performance_spike', 'performance_milestone',
            'pipeline_stalled', 'pipeline_velocity_change', 'pipeline_conversion_drop',
            'high_value_deal', 'deal_at_risk', 'deal_stuck', 'deal_closed_won',
            'team_milestone', 'team_goal_achieved', 'team_performance_issue',
            'forecast_change', 'forecast_at_risk', 'forecast_exceeded',
            'activity_low', 'activity_spike', 'activity_overdue',
            'conversion_drop', 'conversion_improvement',
            'revenue_goal', 'revenue_milestone', 'revenue_shortfall',
            'user_inactive', 'user_performance_issue', 'user_achievement',
            'system_notification', 'data_anomaly', 'integration_issue'
        )
    ),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (
        severity IN ('low', 'medium', 'high', 'critical')
    ),
    
    -- Alert content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Context and relationships
    context_data JSONB DEFAULT '{}',
    related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    related_deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    related_target_id UUID REFERENCES sales_targets(id) ON DELETE SET NULL,
    related_pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
    
    -- Alert lifecycle
    status VARCHAR(50) DEFAULT 'unread' CHECK (
        status IN ('unread', 'read', 'acknowledged', 'resolved', 'dismissed', 'expired')
    ),
    read_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    
    -- Auto-expiry
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Action taken
    action_taken TEXT,
    action_taken_by UUID REFERENCES users(id) ON DELETE SET NULL,
    action_taken_at TIMESTAMP WITH TIME ZONE,
    
    -- Notification tracking
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    notification_channels TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para admin_alerts
CREATE INDEX idx_admin_alerts_tenant_admin ON admin_alerts(tenant_id, admin_user_id);
CREATE INDEX idx_admin_alerts_type ON admin_alerts(alert_type);
CREATE INDEX idx_admin_alerts_severity ON admin_alerts(severity);
CREATE INDEX idx_admin_alerts_status ON admin_alerts(status);
CREATE INDEX idx_admin_alerts_created_at ON admin_alerts(created_at DESC);
CREATE INDEX idx_admin_alerts_expires_at ON admin_alerts(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_admin_alerts_unread ON admin_alerts(admin_user_id, created_at DESC) WHERE status = 'unread';

-- Índice GIN para busca em context_data JSONB
CREATE INDEX idx_admin_alerts_context_gin ON admin_alerts USING GIN (context_data);

-- ============================================================================
-- TABELA 4: SALES FORECASTS ADVANCED (PREVISÕES DE VENDAS AVANÇADAS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_forecasts_advanced (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    generated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Forecast metadata
    forecast_name VARCHAR(255) NOT NULL,
    forecast_type VARCHAR(50) NOT NULL CHECK (
        forecast_type IN ('revenue', 'deals', 'pipeline', 'quota_attainment', 'team_performance')
    ),
    scope VARCHAR(50) NOT NULL CHECK (
        scope IN ('company', 'team', 'individual', 'pipeline', 'territory')
    ),
    
    -- Time period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    forecast_horizon_days INTEGER NOT NULL CHECK (forecast_horizon_days > 0),
    
    -- Forecast values
    predicted_revenue NUMERIC(15,2) DEFAULT 0,
    confidence_range JSONB DEFAULT '{"min": 0, "max": 0}',
    confidence_level NUMERIC(5,2) DEFAULT 75 CHECK (confidence_level BETWEEN 0 AND 100),
    
    -- Detailed breakdown
    period_breakdown JSONB DEFAULT '[]', -- Array of period predictions
    pipeline_breakdown JSONB DEFAULT '{}', -- Breakdown by pipeline/stage
    team_breakdown JSONB DEFAULT '{}', -- Breakdown by team member
    category_breakdown JSONB DEFAULT '{}', -- Breakdown by deal category/size
    
    -- Model information
    model_type VARCHAR(100) DEFAULT 'weighted_pipeline',
    model_version VARCHAR(50) DEFAULT '1.0',
    model_accuracy NUMERIC(5,2),
    
    -- Input parameters
    parameters JSONB DEFAULT '{}',
    assumptions JSONB DEFAULT '{}',
    
    -- Comparison with actuals
    actual_revenue NUMERIC(15,2),
    variance_amount NUMERIC(15,2),
    variance_percentage NUMERIC(5,2),
    accuracy_score NUMERIC(5,2),
    
    -- Status and validation
    status VARCHAR(50) DEFAULT 'draft' CHECK (
        status IN ('draft', 'published', 'archived', 'superseded')
    ),
    validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    validated_at TIMESTAMP WITH TIME ZONE,
    
    -- Notes and adjustments
    notes TEXT,
    manual_adjustments JSONB DEFAULT '{}',
    
    -- Timestamps
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_forecast_period CHECK (period_end >= period_start)
);

-- Índices para sales_forecasts_advanced
CREATE INDEX idx_sales_forecasts_tenant ON sales_forecasts_advanced(tenant_id);
CREATE INDEX idx_sales_forecasts_generated_by ON sales_forecasts_advanced(generated_by);
CREATE INDEX idx_sales_forecasts_type_scope ON sales_forecasts_advanced(forecast_type, scope);
CREATE INDEX idx_sales_forecasts_period ON sales_forecasts_advanced(period_start, period_end);
CREATE INDEX idx_sales_forecasts_status ON sales_forecasts_advanced(status);
CREATE INDEX idx_sales_forecasts_generated_at ON sales_forecasts_advanced(generated_at DESC);

-- Índices GIN para busca em dados JSONB
CREATE INDEX idx_sales_forecasts_period_breakdown_gin ON sales_forecasts_advanced USING GIN (period_breakdown);
CREATE INDEX idx_sales_forecasts_parameters_gin ON sales_forecasts_advanced USING GIN (parameters);

-- ============================================================================
-- TABELA 5: ADMIN DASHBOARD CONFIGS (CONFIGURAÇÕES DE DASHBOARD)
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_dashboard_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Dashboard configuration
    dashboard_name VARCHAR(255) NOT NULL DEFAULT 'Default Dashboard',
    layout_config JSONB NOT NULL DEFAULT '{}',
    widget_configs JSONB NOT NULL DEFAULT '[]',
    
    -- Filters and preferences
    default_filters JSONB DEFAULT '{}',
    time_range_preference VARCHAR(50) DEFAULT '30d',
    refresh_interval INTEGER DEFAULT 300, -- seconds
    
    -- Access and sharing
    is_default BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with_users UUID[] DEFAULT ARRAY[]::UUID[],
    shared_with_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Customization
    theme VARCHAR(50) DEFAULT 'default',
    color_scheme JSONB DEFAULT '{}',
    custom_css TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one default per user
    UNIQUE(tenant_id, admin_user_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Índices para admin_dashboard_configs
CREATE INDEX idx_admin_dashboard_configs_tenant_user ON admin_dashboard_configs(tenant_id, admin_user_id);
CREATE INDEX idx_admin_dashboard_configs_default ON admin_dashboard_configs(tenant_id, admin_user_id) WHERE is_default = TRUE;
CREATE INDEX idx_admin_dashboard_configs_shared ON admin_dashboard_configs(tenant_id) WHERE is_shared = TRUE;

-- ============================================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- ============================================================================

-- Trigger para atualizar updated_at em sales_targets
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sales_targets_updated_at
    BEFORE UPDATE ON sales_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_performance_snapshots_updated_at
    BEFORE UPDATE ON team_performance_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_alerts_updated_at
    BEFORE UPDATE ON admin_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_forecasts_advanced_updated_at
    BEFORE UPDATE ON sales_forecasts_advanced
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_dashboard_configs_updated_at
    BEFORE UPDATE ON admin_dashboard_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS PARA CÁLCULOS DE PERFORMANCE
-- ============================================================================

-- Função para calcular achievement percentage de metas
CREATE OR REPLACE FUNCTION calculate_target_achievement(
    target_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
    target_record sales_targets%ROWTYPE;
    current_val NUMERIC;
    achievement NUMERIC;
BEGIN
    SELECT * INTO target_record FROM sales_targets WHERE id = target_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Calculate current value based on target type
    CASE target_record.target_type
        WHEN 'revenue' THEN
            -- Sum revenue from deals in period
            SELECT COALESCE(SUM(d.amount), 0) INTO current_val
            FROM deals d
            WHERE d.tenant_id = target_record.tenant_id
            AND d.deal_status = 'won'
            AND d.closed_date BETWEEN target_record.period_start AND target_record.period_end
            AND (target_record.assignee_user_id IS NULL OR d.assigned_to = target_record.assignee_user_id)
            AND (target_record.pipeline_id IS NULL OR d.pipeline_id = target_record.pipeline_id);
            
        WHEN 'deals' THEN
            -- Count deals won in period
            SELECT COALESCE(COUNT(*), 0) INTO current_val
            FROM deals d
            WHERE d.tenant_id = target_record.tenant_id
            AND d.deal_status = 'won'
            AND d.closed_date BETWEEN target_record.period_start AND target_record.period_end
            AND (target_record.assignee_user_id IS NULL OR d.assigned_to = target_record.assignee_user_id)
            AND (target_record.pipeline_id IS NULL OR d.pipeline_id = target_record.pipeline_id);
            
        WHEN 'leads' THEN
            -- Count leads created in period
            SELECT COALESCE(COUNT(*), 0) INTO current_val
            FROM leads l
            WHERE l.tenant_id = target_record.tenant_id
            AND l.created_at::date BETWEEN target_record.period_start AND target_record.period_end
            AND (target_record.assignee_user_id IS NULL OR l.assigned_to = target_record.assignee_user_id)
            AND (target_record.pipeline_id IS NULL OR l.pipeline_id = target_record.pipeline_id);
            
        ELSE
            current_val := target_record.current_value;
    END CASE;
    
    -- Calculate achievement percentage
    IF target_record.target_value > 0 THEN
        achievement := (current_val / target_record.target_value) * 100;
    ELSE
        achievement := 0;
    END IF;
    
    -- Update the target record
    UPDATE sales_targets 
    SET current_value = current_val,
        achievement_percentage = achievement,
        status = CASE 
            WHEN achievement >= 100 THEN 'completed'
            WHEN CURRENT_DATE > period_end AND achievement < 100 THEN 'overdue'
            ELSE status
        END
    WHERE id = target_id;
    
    RETURN achievement;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION PARA GERAR TEAM PERFORMANCE SNAPSHOT
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_team_performance_snapshot(
    p_tenant_id UUID,
    p_snapshot_date DATE DEFAULT CURRENT_DATE,
    p_period_type VARCHAR DEFAULT 'monthly'
)
RETURNS INTEGER AS $$
DECLARE
    user_record RECORD;
    snapshot_count INTEGER := 0;
    period_start DATE;
    period_end DATE;
    user_metrics JSONB;
    user_performance_score NUMERIC;
BEGIN
    -- Calculate period dates
    CASE p_period_type
        WHEN 'daily' THEN
            period_start := p_snapshot_date;
            period_end := p_snapshot_date;
        WHEN 'weekly' THEN
            period_start := p_snapshot_date - INTERVAL '7 days';
            period_end := p_snapshot_date;
        WHEN 'monthly' THEN
            period_start := DATE_TRUNC('month', p_snapshot_date);
            period_end := p_snapshot_date;
        WHEN 'quarterly' THEN
            period_start := DATE_TRUNC('quarter', p_snapshot_date);
            period_end := p_snapshot_date;
        ELSE
            period_start := p_snapshot_date - INTERVAL '30 days';
            period_end := p_snapshot_date;
    END CASE;
    
    -- Generate snapshot for each user in the tenant
    FOR user_record IN 
        SELECT u.id, u.email, u.first_name, u.last_name, u.role
        FROM users u
        WHERE u.tenant_id = p_tenant_id
        AND u.role IN ('admin', 'member')
        AND u.is_active = TRUE
    LOOP
        -- Calculate user metrics for the period
        SELECT jsonb_build_object(
            'leads_created', COALESCE((
                SELECT COUNT(*) FROM leads 
                WHERE tenant_id = p_tenant_id 
                AND assigned_to = user_record.id
                AND created_at::date BETWEEN period_start AND period_end
            ), 0),
            'deals_won', COALESCE((
                SELECT COUNT(*) FROM deals 
                WHERE tenant_id = p_tenant_id 
                AND assigned_to = user_record.id
                AND deal_status = 'won'
                AND closed_date BETWEEN period_start AND period_end
            ), 0),
            'deals_lost', COALESCE((
                SELECT COUNT(*) FROM deals 
                WHERE tenant_id = p_tenant_id 
                AND assigned_to = user_record.id
                AND deal_status = 'lost'
                AND closed_date BETWEEN period_start AND period_end
            ), 0),
            'revenue_generated', COALESCE((
                SELECT SUM(amount) FROM deals 
                WHERE tenant_id = p_tenant_id 
                AND assigned_to = user_record.id
                AND deal_status = 'won'
                AND closed_date BETWEEN period_start AND period_end
            ), 0),
            'activities_completed', COALESCE((
                SELECT COUNT(*) FROM lead_tasks 
                WHERE tenant_id = p_tenant_id 
                AND assigned_to = user_record.id
                AND status = 'completed'
                AND completed_at::date BETWEEN period_start AND period_end
            ), 0)
        ) INTO user_metrics;
        
        -- Calculate simple performance score (0-100)
        user_performance_score := (
            (user_metrics->>'leads_created')::numeric * 10 +
            (user_metrics->>'deals_won')::numeric * 20 +
            (user_metrics->>'revenue_generated')::numeric / 1000 +
            (user_metrics->>'activities_completed')::numeric * 5
        );
        
        -- Cap at 100
        user_performance_score := LEAST(user_performance_score, 100);
        
        -- Insert or update snapshot
        INSERT INTO team_performance_snapshots (
            tenant_id,
            user_id,
            snapshot_date,
            period_type,
            metrics,
            performance_score,
            leads_created,
            deals_won,
            deals_lost,
            revenue_generated,
            activities_completed
        ) VALUES (
            p_tenant_id,
            user_record.id,
            p_snapshot_date,
            p_period_type,
            user_metrics,
            user_performance_score,
            (user_metrics->>'leads_created')::integer,
            (user_metrics->>'deals_won')::integer,
            (user_metrics->>'deals_lost')::integer,
            (user_metrics->>'revenue_generated')::numeric,
            (user_metrics->>'activities_completed')::integer
        )
        ON CONFLICT (tenant_id, user_id, snapshot_date, period_type)
        DO UPDATE SET
            metrics = EXCLUDED.metrics,
            performance_score = EXCLUDED.performance_score,
            leads_created = EXCLUDED.leads_created,
            deals_won = EXCLUDED.deals_won,
            deals_lost = EXCLUDED.deals_lost,
            revenue_generated = EXCLUDED.revenue_generated,
            activities_completed = EXCLUDED.activities_completed,
            updated_at = NOW();
            
        snapshot_count := snapshot_count + 1;
    END LOOP;
    
    -- Update team rankings
    WITH ranked_users AS (
        SELECT user_id,
               ROW_NUMBER() OVER (ORDER BY performance_score DESC) as ranking
        FROM team_performance_snapshots
        WHERE tenant_id = p_tenant_id
        AND snapshot_date = p_snapshot_date
        AND period_type = p_period_type
    )
    UPDATE team_performance_snapshots
    SET team_ranking = ranked_users.ranking
    FROM ranked_users
    WHERE team_performance_snapshots.user_id = ranked_users.user_id
    AND team_performance_snapshots.tenant_id = p_tenant_id
    AND team_performance_snapshots.snapshot_date = p_snapshot_date
    AND team_performance_snapshots.period_type = p_period_type;
    
    RETURN snapshot_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION PARA KPIs ADMINISTRATIVOS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_admin_kpis(
    p_tenant_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_leads INTEGER,
    total_deals INTEGER,
    total_revenue NUMERIC,
    conversion_rate NUMERIC,
    avg_deal_size NUMERIC,
    pipeline_value NUMERIC,
    team_performance_avg NUMERIC,
    active_targets INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Total leads
        COALESCE((
            SELECT COUNT(*)::INTEGER FROM leads 
            WHERE leads.tenant_id = p_tenant_id 
            AND leads.created_at::date BETWEEN p_start_date AND p_end_date
        ), 0) as total_leads,
        
        -- Total deals
        COALESCE((
            SELECT COUNT(*)::INTEGER FROM deals 
            WHERE deals.tenant_id = p_tenant_id 
            AND deals.created_at::date BETWEEN p_start_date AND p_end_date
        ), 0) as total_deals,
        
        -- Total revenue
        COALESCE((
            SELECT SUM(amount) FROM deals 
            WHERE deals.tenant_id = p_tenant_id 
            AND deals.deal_status = 'won'
            AND deals.closed_date BETWEEN p_start_date AND p_end_date
        ), 0) as total_revenue,
        
        -- Conversion rate
        CASE 
            WHEN (SELECT COUNT(*) FROM leads WHERE leads.tenant_id = p_tenant_id AND leads.created_at::date BETWEEN p_start_date AND p_end_date) > 0
            THEN (
                SELECT (COUNT(CASE WHEN deals.deal_status = 'won' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100
                FROM leads 
                LEFT JOIN deals ON leads.id = deals.lead_id
                WHERE leads.tenant_id = p_tenant_id 
                AND leads.created_at::date BETWEEN p_start_date AND p_end_date
            )
            ELSE 0
        END as conversion_rate,
        
        -- Average deal size
        COALESCE((
            SELECT AVG(amount) FROM deals 
            WHERE deals.tenant_id = p_tenant_id 
            AND deals.deal_status = 'won'
            AND deals.closed_date BETWEEN p_start_date AND p_end_date
        ), 0) as avg_deal_size,
        
        -- Pipeline value
        COALESCE((
            SELECT SUM(amount * (probability / 100.0)) FROM deals 
            WHERE deals.tenant_id = p_tenant_id 
            AND deals.deal_status = 'open'
        ), 0) as pipeline_value,
        
        -- Team performance average
        COALESCE((
            SELECT AVG(performance_score) FROM team_performance_snapshots 
            WHERE team_performance_snapshots.tenant_id = p_tenant_id 
            AND snapshot_date >= p_start_date
            AND period_type = 'monthly'
        ), 0) as team_performance_avg,
        
        -- Active targets
        COALESCE((
            SELECT COUNT(*)::INTEGER FROM sales_targets 
            WHERE sales_targets.tenant_id = p_tenant_id 
            AND status = 'active'
        ), 0) as active_targets;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS (ROW LEVEL SECURITY) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_forecasts_advanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_dashboard_configs ENABLE ROW LEVEL SECURITY;

-- Sales Targets Policies
CREATE POLICY "Users can view sales targets from their tenant" ON sales_targets
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage sales targets in their tenant" ON sales_targets
    FOR ALL USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()) AND
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
    );

-- Team Performance Snapshots Policies
CREATE POLICY "Users can view team performance from their tenant" ON team_performance_snapshots
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage team performance in their tenant" ON team_performance_snapshots
    FOR ALL USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()) AND
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
    );

-- Admin Alerts Policies
CREATE POLICY "Admins can view their alerts" ON admin_alerts
    FOR SELECT USING (
        admin_user_id = auth.uid() OR
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()) AND
        (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    );

CREATE POLICY "Admins can manage their alerts" ON admin_alerts
    FOR ALL USING (
        admin_user_id = auth.uid() OR
        (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    );

-- Sales Forecasts Policies
CREATE POLICY "Users can view forecasts from their tenant" ON sales_forecasts_advanced
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage forecasts in their tenant" ON sales_forecasts_advanced
    FOR ALL USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()) AND
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
    );

-- Dashboard Configs Policies
CREATE POLICY "Users can manage their dashboard configs" ON admin_dashboard_configs
    FOR ALL USING (
        admin_user_id = auth.uid() AND
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

-- ============================================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ============================================================================

-- Índices compostos para queries frequentes
CREATE INDEX idx_sales_targets_tenant_active ON sales_targets(tenant_id, status) WHERE status = 'active';
CREATE INDEX idx_team_performance_tenant_date ON team_performance_snapshots(tenant_id, snapshot_date DESC);
CREATE INDEX idx_admin_alerts_admin_unread ON admin_alerts(admin_user_id, status, created_at DESC) WHERE status = 'unread';

-- Índices para foreign keys que podem não ter índices automáticos
CREATE INDEX idx_sales_targets_assignee_user_id ON sales_targets(assignee_user_id) WHERE assignee_user_id IS NOT NULL;
CREATE INDEX idx_admin_alerts_related_deal_id ON admin_alerts(related_deal_id) WHERE related_deal_id IS NOT NULL;
CREATE INDEX idx_admin_alerts_related_target_id ON admin_alerts(related_target_id) WHERE related_target_id IS NOT NULL;

-- ============================================================================
-- DADOS INICIAIS E CONFIGURAÇÕES
-- ============================================================================

-- Inserir configuração de dashboard padrão para todos os admins existentes
INSERT INTO admin_dashboard_configs (tenant_id, admin_user_id, dashboard_name, layout_config, widget_configs, is_default)
SELECT 
    u.tenant_id,
    u.id,
    'Dashboard Padrão',
    '{"layout": "grid", "columns": 3, "responsive": true}'::jsonb,
    '[
        {"id": "kpis", "type": "kpi_cards", "position": {"x": 0, "y": 0, "w": 3, "h": 1}},
        {"id": "revenue_chart", "type": "line_chart", "position": {"x": 0, "y": 1, "w": 2, "h": 2}},
        {"id": "team_performance", "type": "leaderboard", "position": {"x": 2, "y": 1, "w": 1, "h": 2}},
        {"id": "targets", "type": "progress_bars", "position": {"x": 0, "y": 3, "w": 2, "h": 1}},
        {"id": "alerts", "type": "alert_list", "position": {"x": 2, "y": 3, "w": 1, "h": 1}}
    ]'::jsonb,
    TRUE
FROM users u
WHERE u.role IN ('admin', 'super_admin')
AND u.is_active = TRUE
ON CONFLICT (tenant_id, admin_user_id, is_default) DO NOTHING;

-- ============================================================================
-- COMENTÁRIOS FINAIS
-- ============================================================================

COMMENT ON TABLE sales_targets IS 'FASE 4A: Metas de vendas e KPIs configuráveis por admin';
COMMENT ON TABLE team_performance_snapshots IS 'FASE 4A: Histórico e snapshots de performance da equipe';
COMMENT ON TABLE admin_alerts IS 'FASE 4A: Sistema de alertas administrativos inteligentes';
COMMENT ON TABLE sales_forecasts_advanced IS 'FASE 4A: Previsões de vendas com machine learning e análise avançada';
COMMENT ON TABLE admin_dashboard_configs IS 'FASE 4A: Configurações personalizáveis de dashboard administrativo';

-- Log da migração
INSERT INTO migrations_log (version, description, executed_at) 
VALUES ('4A.1.0', 'FASE 4A: Admin Dashboard & Sales Management - Metas, Performance, Alertas e Forecasting', NOW())
 
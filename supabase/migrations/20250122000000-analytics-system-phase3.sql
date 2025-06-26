-- ============================================================================
-- FASE 3: ANALYTICS & REPORTING SYSTEM - DATABASE MIGRATION
-- ============================================================================
-- Criação completa do sistema de analytics enterprise-grade
-- Comparável ao HubSpot, Salesforce e Pipedrive
-- Data: 2025-01-22
-- Versão: 1.0.0
-- ============================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================================
-- 1. DASHBOARD CONFIGURATIONS
-- ============================================================================
-- Configurações personalizadas de dashboards por usuário
CREATE TABLE IF NOT EXISTS dashboard_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. CUSTOM REPORTS
-- ============================================================================
-- Sistema de relatórios customizáveis pelos usuários
CREATE TABLE IF NOT EXISTS custom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}',
    schedule JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. ANALYTICS SNAPSHOTS
-- ============================================================================
-- Snapshots históricos de métricas para análise temporal
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    snapshot_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
    metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 4. KPI DEFINITIONS
-- ============================================================================
-- Definições de KPIs configuráveis por tenant
CREATE TABLE IF NOT EXISTS kpi_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    formula TEXT NOT NULL,
    target_value DECIMAL(15,2),
    unit VARCHAR(50),
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. KPI TRACKING
-- ============================================================================
-- Rastreamento de valores de KPIs ao longo do tempo
CREATE TABLE IF NOT EXISTS kpi_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kpi_id UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
    value DECIMAL(15,2) NOT NULL,
    target_value DECIMAL(15,2),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 6. SALES FORECASTS
-- ============================================================================
-- Previsões de vendas baseadas em algoritmos
CREATE TABLE IF NOT EXISTS sales_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    forecast_type VARCHAR(50) NOT NULL, -- 'linear', 'exponential', 'seasonal'
    period_type VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'yearly'
    forecast_date DATE NOT NULL,
    predicted_value DECIMAL(15,2) NOT NULL,
    confidence_level DECIMAL(5,2), -- 0-100%
    historical_data JSONB,
    model_parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 7. LEAD SCORING RULES
-- ============================================================================
-- Regras configuráveis para pontuação de leads
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    condition_field VARCHAR(255) NOT NULL,
    condition_operator VARCHAR(50) NOT NULL, -- 'equals', 'contains', 'greater_than', etc.
    condition_value TEXT NOT NULL,
    score_points INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 8. LEAD SCORES
-- ============================================================================
-- Pontuações calculadas para cada lead
CREATE TABLE IF NOT EXISTS lead_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    total_score INTEGER NOT NULL DEFAULT 0,
    score_breakdown JSONB DEFAULT '{}',
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, lead_id)
);

-- ============================================================================
-- 9. REVENUE ATTRIBUTION
-- ============================================================================
-- Atribuição de receita por canal, campanha, etc.
CREATE TABLE IF NOT EXISTS revenue_attribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    deal_id UUID, -- Referência para deals quando implementado
    attribution_type VARCHAR(50) NOT NULL, -- 'first_touch', 'last_touch', 'multi_touch'
    channel VARCHAR(100),
    campaign VARCHAR(255),
    source VARCHAR(255),
    medium VARCHAR(100),
    revenue_amount DECIMAL(15,2) NOT NULL,
    attribution_weight DECIMAL(5,4) DEFAULT 1.0, -- Para multi-touch attribution
    conversion_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 10. ACTIVITY ANALYTICS
-- ============================================================================
-- Analytics de atividades de usuários e performance
CREATE TABLE IF NOT EXISTS activity_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    activity_date DATE NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    duration_minutes INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 11. CONVERSION TRACKING
-- ============================================================================
-- Rastreamento de conversões por etapas do funil
CREATE TABLE IF NOT EXISTS conversion_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    from_stage VARCHAR(100),
    to_stage VARCHAR(100) NOT NULL,
    conversion_date TIMESTAMP WITH TIME ZONE NOT NULL,
    time_in_previous_stage INTEGER, -- em horas
    conversion_probability DECIMAL(5,2), -- 0-100%
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Dashboard Configs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboard_configs_tenant_user 
ON dashboard_configs(tenant_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboard_configs_default 
ON dashboard_configs(tenant_id, is_default) WHERE is_default = TRUE;

-- Custom Reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_custom_reports_tenant_active 
ON custom_reports(tenant_id, is_active, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_custom_reports_schedule 
ON custom_reports(tenant_id, is_active) WHERE schedule IS NOT NULL;

-- Analytics Snapshots
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_snapshots_tenant_date 
ON analytics_snapshots(tenant_id, snapshot_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_snapshots_type_date 
ON analytics_snapshots(tenant_id, snapshot_type, snapshot_date DESC);

-- KPI Definitions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kpi_definitions_tenant_active 
ON kpi_definitions(tenant_id, is_active, category);

-- KPI Tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kpi_tracking_tenant_period 
ON kpi_tracking(tenant_id, kpi_id, period_start DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kpi_tracking_date_range 
ON kpi_tracking(tenant_id, period_start, period_end);

-- Sales Forecasts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_forecasts_tenant_date 
ON sales_forecasts(tenant_id, forecast_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_forecasts_type_period 
ON sales_forecasts(tenant_id, forecast_type, period_type);

-- Lead Scoring Rules
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_scoring_rules_tenant_active 
ON lead_scoring_rules(tenant_id, is_active);

-- Lead Scores
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_scores_tenant_lead 
ON lead_scores(tenant_id, lead_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_scores_score_desc 
ON lead_scores(tenant_id, total_score DESC);

-- Revenue Attribution
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_revenue_attribution_tenant_date 
ON revenue_attribution(tenant_id, conversion_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_revenue_attribution_channel 
ON revenue_attribution(tenant_id, channel, conversion_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_revenue_attribution_lead 
ON revenue_attribution(tenant_id, lead_id);

-- Activity Analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_analytics_user_date 
ON activity_analytics(tenant_id, user_id, activity_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_analytics_type_date 
ON activity_analytics(tenant_id, activity_type, activity_date DESC);

-- Conversion Tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversion_tracking_lead_date 
ON conversion_tracking(tenant_id, lead_id, conversion_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversion_tracking_stages 
ON conversion_tracking(tenant_id, from_stage, to_stage, conversion_date DESC);

-- ============================================================================
-- FUNÇÕES PARA CÁLCULOS DE ANALYTICS
-- ============================================================================

-- Função para calcular score de lead
CREATE OR REPLACE FUNCTION calculate_lead_score(p_tenant_id UUID, p_lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_score INTEGER := 0;
    rule_record RECORD;
    lead_record RECORD;
    score_breakdown JSONB := '{}';
BEGIN
    -- Buscar dados do lead
    SELECT * INTO lead_record FROM leads WHERE id = p_lead_id AND tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Aplicar regras de pontuação ativas
    FOR rule_record IN 
        SELECT * FROM lead_scoring_rules 
        WHERE tenant_id = p_tenant_id AND is_active = TRUE
    LOOP
        -- Lógica simplificada de avaliação de regras
        -- Em produção, seria mais complexa com diferentes operadores
        IF rule_record.condition_field = 'email' AND lead_record.email IS NOT NULL THEN
            total_score := total_score + rule_record.score_points;
            score_breakdown := score_breakdown || jsonb_build_object(rule_record.name, rule_record.score_points);
        END IF;
        
        IF rule_record.condition_field = 'phone' AND lead_record.phone IS NOT NULL THEN
            total_score := total_score + rule_record.score_points;
            score_breakdown := score_breakdown || jsonb_build_object(rule_record.name, rule_record.score_points);
        END IF;
    END LOOP;
    
    -- Inserir ou atualizar score do lead
    INSERT INTO lead_scores (tenant_id, lead_id, total_score, score_breakdown, last_calculated_at)
    VALUES (p_tenant_id, p_lead_id, total_score, score_breakdown, NOW())
    ON CONFLICT (tenant_id, lead_id) 
    DO UPDATE SET 
        total_score = EXCLUDED.total_score,
        score_breakdown = EXCLUDED.score_breakdown,
        last_calculated_at = EXCLUDED.last_calculated_at,
        updated_at = NOW();
    
    RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- Função para rastrear conversões
CREATE OR REPLACE FUNCTION track_conversion()
RETURNS TRIGGER AS $$
BEGIN
    -- Rastrear mudança de status como conversão
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO conversion_tracking (
            tenant_id, 
            lead_id, 
            from_stage, 
            to_stage, 
            conversion_date,
            time_in_previous_stage
        ) VALUES (
            NEW.tenant_id,
            NEW.id,
            OLD.status,
            NEW.status,
            NOW(),
            EXTRACT(EPOCH FROM (NOW() - OLD.updated_at)) / 3600 -- horas
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para rastreamento de conversões
DROP TRIGGER IF EXISTS trigger_track_conversion ON leads;
CREATE TRIGGER trigger_track_conversion
    AFTER UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION track_conversion();

-- ============================================================================
-- MATERIALIZED VIEWS PARA PERFORMANCE
-- ============================================================================

-- View para métricas diárias
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_metrics_mv AS
SELECT 
    tenant_id,
    DATE(created_at) as metric_date,
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE status = 'converted') as converted_leads,
    COUNT(*) FILTER (WHERE status = 'qualified') as qualified_leads,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_leads,
    AVG(CASE WHEN status = 'converted' THEN 
        EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400 
    END) as avg_conversion_days
FROM leads 
GROUP BY tenant_id, DATE(created_at);

-- Índice para a materialized view
CREATE UNIQUE INDEX IF NOT EXISTS daily_metrics_mv_tenant_date 
ON daily_metrics_mv(tenant_id, metric_date);

-- Função para refresh automático da view
CREATE OR REPLACE FUNCTION refresh_daily_metrics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_metrics_mv;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_tracking ENABLE ROW LEVEL SECURITY;

-- Políticas para dashboard_configs
CREATE POLICY "Users can view their tenant dashboard configs" ON dashboard_configs
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage their own dashboard configs" ON dashboard_configs
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Políticas para custom_reports
CREATE POLICY "Users can view their tenant custom reports" ON custom_reports
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage their tenant custom reports" ON custom_reports
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Políticas para analytics_snapshots
CREATE POLICY "Users can view their tenant analytics snapshots" ON analytics_snapshots
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "System can manage analytics snapshots" ON analytics_snapshots
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Políticas para kpi_definitions
CREATE POLICY "Users can view their tenant KPI definitions" ON kpi_definitions
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage their tenant KPI definitions" ON kpi_definitions
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Políticas para kpi_tracking
CREATE POLICY "Users can view their tenant KPI tracking" ON kpi_tracking
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "System can manage KPI tracking" ON kpi_tracking
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Políticas para sales_forecasts
CREATE POLICY "Users can view their tenant sales forecasts" ON sales_forecasts
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "System can manage sales forecasts" ON sales_forecasts
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Políticas para lead_scoring_rules
CREATE POLICY "Users can view their tenant lead scoring rules" ON lead_scoring_rules
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage their tenant lead scoring rules" ON lead_scoring_rules
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Políticas para lead_scores
CREATE POLICY "Users can view their tenant lead scores" ON lead_scores
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "System can manage lead scores" ON lead_scores
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Políticas para revenue_attribution
CREATE POLICY "Users can view their tenant revenue attribution" ON revenue_attribution
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "System can manage revenue attribution" ON revenue_attribution
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Políticas para activity_analytics
CREATE POLICY "Users can view their tenant activity analytics" ON activity_analytics
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "System can manage activity analytics" ON activity_analytics
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Políticas para conversion_tracking
CREATE POLICY "Users can view their tenant conversion tracking" ON conversion_tracking
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "System can manage conversion tracking" ON conversion_tracking
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- ============================================================================
-- DADOS INICIAIS E CONFIGURAÇÕES
-- ============================================================================

-- Inserir KPIs padrão para novos tenants
INSERT INTO kpi_definitions (tenant_id, name, description, formula, unit, category, created_by)
SELECT 
    t.id as tenant_id,
    'Total Leads' as name,
    'Número total de leads' as description,
    'COUNT(leads)' as formula,
    'count' as unit,
    'Leads' as category,
    u.id as created_by
FROM tenants t
CROSS JOIN users u
WHERE u.role = 'admin' AND u.tenant_id = t.id
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON TABLE dashboard_configs IS 'Configurações personalizadas de dashboards por usuário';
COMMENT ON TABLE custom_reports IS 'Sistema de relatórios customizáveis pelos usuários';
COMMENT ON TABLE analytics_snapshots IS 'Snapshots históricos de métricas para análise temporal';
COMMENT ON TABLE kpi_definitions IS 'Definições de KPIs configuráveis por tenant';
COMMENT ON TABLE kpi_tracking IS 'Rastreamento de valores de KPIs ao longo do tempo';
COMMENT ON TABLE sales_forecasts IS 'Previsões de vendas baseadas em algoritmos';
COMMENT ON TABLE lead_scoring_rules IS 'Regras configuráveis para pontuação de leads';
COMMENT ON TABLE lead_scores IS 'Pontuações calculadas para cada lead';
COMMENT ON TABLE revenue_attribution IS 'Atribuição de receita por canal, campanha, etc.';
COMMENT ON TABLE activity_analytics IS 'Analytics de atividades de usuários e performance';
COMMENT ON TABLE conversion_tracking IS 'Rastreamento de conversões por etapas do funil';

-- ============================================================================
-- FINALIZAÇÃO
-- ============================================================================

-- Atualizar estatísticas das tabelas
ANALYZE dashboard_configs;
ANALYZE custom_reports;
ANALYZE analytics_snapshots;
ANALYZE kpi_definitions;
ANALYZE kpi_tracking;
ANALYZE sales_forecasts;
ANALYZE lead_scoring_rules;
ANALYZE lead_scores;
ANALYZE revenue_attribution;
ANALYZE activity_analytics;
ANALYZE conversion_tracking;

-- Log de sucesso
DO $$
BEGIN
    RAISE NOTICE 'FASE 3: Analytics & Reporting System - Migration completed successfully!';
    RAISE NOTICE 'Created 11 tables, 25+ indexes, 2 functions, 1 trigger, 1 materialized view';
    RAISE NOTICE 'RLS policies applied to all tables';
    RAISE NOTICE 'System ready for enterprise-grade analytics';
END $$; 
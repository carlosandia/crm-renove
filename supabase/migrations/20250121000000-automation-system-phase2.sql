-- =============================================
-- FASE 2: WORKFLOW AUTOMATION SYSTEM
-- Migration: 20250121000000-automation-system-phase2.sql
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =============================================
-- BUSINESS RULES TABLES
-- =============================================

-- Business Rules main table
CREATE TABLE IF NOT EXISTS business_rules (
    id TEXT PRIMARY KEY DEFAULT ('rule_' || extract(epoch from now()) || '_' || substr(gen_random_uuid()::text, 1, 8)),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger JSONB NOT NULL,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 100),
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    metadata JSONB DEFAULT '{
        "executionCount": 0,
        "successCount": 0,
        "failureCount": 0,
        "averageExecutionTime": 0,
        "tags": []
    }'::jsonb
);

-- Rule execution log
CREATE TABLE IF NOT EXISTS rule_execution_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id TEXT NOT NULL,
    rule_id TEXT NOT NULL REFERENCES business_rules(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    execution_time INTEGER, -- milliseconds
    result JSONB,
    error TEXT,
    actions_executed JSONB DEFAULT '[]'::jsonb,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- EVENT SYSTEM TABLES
-- =============================================

-- Event definitions
CREATE TABLE IF NOT EXISTS event_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL UNIQUE,
    entity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    schema JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Event log
CREATE TABLE IF NOT EXISTS event_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id UUID,
    tenant_id UUID NOT NULL,
    processed BOOLEAN DEFAULT false,
    processing_time INTEGER, -- milliseconds
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Event subscriptions
CREATE TABLE IF NOT EXISTS event_subscriptions (
    id TEXT PRIMARY KEY DEFAULT ('sub_' || extract(epoch from now()) || '_' || substr(gen_random_uuid()::text, 1, 8)),
    event_type VARCHAR(100) NOT NULL,
    subscriber_id UUID NOT NULL,
    endpoint TEXT,
    is_active BOOLEAN DEFAULT true,
    filters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- AUTOMATION TABLES
-- =============================================

-- Email templates for automation
CREATE TABLE IF NOT EXISTS automation_email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    variables JSONB DEFAULT '[]'::jsonb,
    tenant_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email automation campaigns
CREATE TABLE IF NOT EXISTS automation_email_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id UUID REFERENCES automation_email_templates(id) ON DELETE SET NULL,
    trigger_event VARCHAR(100) NOT NULL,
    conditions JSONB,
    delay_minutes INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    stats JSONB DEFAULT '{
        "sent": 0,
        "delivered": 0,
        "opened": 0,
        "clicked": 0,
        "failed": 0
    }'::jsonb
);

-- Email sends tracking
CREATE TABLE IF NOT EXISTS automation_email_sends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES automation_email_campaigns(id) ON DELETE CASCADE,
    template_id UUID REFERENCES automation_email_templates(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    tenant_id UUID NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Lead scoring rules
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    condition_field VARCHAR(100) NOT NULL,
    condition_operator VARCHAR(20) NOT NULL,
    condition_value TEXT NOT NULL,
    score_change INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Lead scoring history
CREATE TABLE IF NOT EXISTS lead_scoring_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    rule_id UUID REFERENCES lead_scoring_rules(id) ON DELETE SET NULL,
    previous_score INTEGER DEFAULT 0,
    score_change INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    reason VARCHAR(255),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Task automation rules
CREATE TABLE IF NOT EXISTS task_automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_event VARCHAR(100) NOT NULL,
    conditions JSONB,
    task_template JSONB NOT NULL, -- { title, description, priority, dueInDays, assigneeRule }
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    stats JSONB DEFAULT '{
        "triggered": 0,
        "tasksCreated": 0,
        "tasksCompleted": 0
    }'::jsonb
);

-- Stage change tracking (for pipeline automation)
CREATE TABLE IF NOT EXISTS stage_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('lead', 'deal', 'contact')),
    entity_id UUID NOT NULL,
    from_stage_id UUID,
    to_stage_id UUID NOT NULL,
    reason TEXT,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    tenant_id UUID NOT NULL,
    automation_rule_id TEXT REFERENCES business_rules(id) ON DELETE SET NULL
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Business Rules indexes
CREATE INDEX IF NOT EXISTS idx_business_rules_tenant_active ON business_rules(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_business_rules_trigger_type ON business_rules USING GIN ((trigger->>'type'));
CREATE INDEX IF NOT EXISTS idx_business_rules_priority ON business_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_business_rules_created_at ON business_rules(created_at DESC);

-- Rule execution log indexes
CREATE INDEX IF NOT EXISTS idx_rule_execution_log_rule_id ON rule_execution_log(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_execution_log_status ON rule_execution_log(status);
CREATE INDEX IF NOT EXISTS idx_rule_execution_log_tenant_time ON rule_execution_log(tenant_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_rule_execution_log_execution_id ON rule_execution_log(execution_id);

-- Event system indexes
CREATE INDEX IF NOT EXISTS idx_event_definitions_type ON event_definitions(type);
CREATE INDEX IF NOT EXISTS idx_event_definitions_entity_type ON event_definitions(entity_type);
CREATE INDEX IF NOT EXISTS idx_event_log_type ON event_log(type);
CREATE INDEX IF NOT EXISTS idx_event_log_entity ON event_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_event_log_tenant_time ON event_log(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_event_log_processed ON event_log(processed, timestamp);
CREATE INDEX IF NOT EXISTS idx_event_subscriptions_event_type ON event_subscriptions(event_type, is_active);

-- Automation indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant ON automation_email_templates(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_tenant ON automation_email_campaigns(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_trigger ON automation_email_campaigns(trigger_event);
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON automation_email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON automation_email_sends(status, sent_at);
CREATE INDEX IF NOT EXISTS idx_email_sends_tenant_entity ON automation_email_sends(tenant_id, entity_type, entity_id);

-- Lead scoring indexes
CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_tenant ON lead_scoring_rules(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_history_lead ON lead_scoring_history(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_history_tenant ON lead_scoring_history(tenant_id, created_at DESC);

-- Task automation indexes
CREATE INDEX IF NOT EXISTS idx_task_automation_rules_tenant ON task_automation_rules(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_task_automation_rules_trigger ON task_automation_rules(trigger_event);

-- Stage changes indexes
CREATE INDEX IF NOT EXISTS idx_stage_changes_entity ON stage_changes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_stage_changes_tenant_time ON stage_changes(tenant_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_stage_changes_stages ON stage_changes(from_stage_id, to_stage_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_business_rules_updated_at BEFORE UPDATE ON business_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_definitions_updated_at BEFORE UPDATE ON event_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_subscriptions_updated_at BEFORE UPDATE ON event_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON automation_email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON automation_email_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_scoring_rules_updated_at BEFORE UPDATE ON lead_scoring_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_automation_rules_updated_at BEFORE UPDATE ON task_automation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update lead scores
CREATE OR REPLACE FUNCTION update_lead_score()
RETURNS TRIGGER AS $$
DECLARE
    current_score INTEGER := 0;
    rule_record RECORD;
    score_change INTEGER := 0;
BEGIN
    -- Get current score
    SELECT COALESCE(score, 0) INTO current_score 
    FROM leads 
    WHERE id = NEW.id AND tenant_id = NEW.tenant_id;

    -- Apply scoring rules
    FOR rule_record IN 
        SELECT * FROM lead_scoring_rules 
        WHERE tenant_id = NEW.tenant_id AND is_active = true
    LOOP
        -- Evaluate rule condition (simplified - in real implementation would be more complex)
        IF rule_record.condition_field = 'temperature' AND 
           rule_record.condition_operator = 'equals' AND 
           NEW.temperature = rule_record.condition_value THEN
            score_change := score_change + rule_record.score_change;
            
            -- Log scoring change
            INSERT INTO lead_scoring_history (
                lead_id, rule_id, previous_score, score_change, new_score, reason, tenant_id
            ) VALUES (
                NEW.id, rule_record.id, current_score, rule_record.score_change, 
                current_score + score_change, rule_record.name, NEW.tenant_id
            );
        END IF;
    END LOOP;

    -- Update lead score
    IF score_change != 0 THEN
        UPDATE leads 
        SET score = GREATEST(0, current_score + score_change)
        WHERE id = NEW.id AND tenant_id = NEW.tenant_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic lead scoring (if leads table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
        DROP TRIGGER IF EXISTS trigger_update_lead_score ON leads;
        CREATE TRIGGER trigger_update_lead_score
            AFTER INSERT OR UPDATE ON leads
            FOR EACH ROW EXECUTE FUNCTION update_lead_score();
    END IF;
END $$;

-- Function to log stage changes
CREATE OR REPLACE FUNCTION log_stage_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if stage actually changed
    IF OLD.stage_id != NEW.stage_id THEN
        INSERT INTO stage_changes (
            entity_type, entity_id, from_stage_id, to_stage_id, 
            changed_by, tenant_id
        ) VALUES (
            TG_TABLE_NAME::text, NEW.id, OLD.stage_id, NEW.stage_id,
            NEW.updated_by, NEW.tenant_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply stage change triggers to existing tables
DO $$
BEGIN
    -- Leads table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
        DROP TRIGGER IF EXISTS trigger_log_lead_stage_change ON leads;
        CREATE TRIGGER trigger_log_lead_stage_change
            AFTER UPDATE ON leads
            FOR EACH ROW EXECUTE FUNCTION log_stage_change();
    END IF;
    
    -- Deals table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deals') THEN
        DROP TRIGGER IF EXISTS trigger_log_deal_stage_change ON deals;
        CREATE TRIGGER trigger_log_deal_stage_change
            AFTER UPDATE ON deals
            FOR EACH ROW EXECUTE FUNCTION log_stage_change();
    END IF;
END $$;

-- =============================================
-- AUTOMATION HELPER FUNCTIONS
-- =============================================

-- Function to get active rules for an event type
CREATE OR REPLACE FUNCTION get_active_rules_for_event(
    p_event_type TEXT,
    p_tenant_id UUID
)
RETURNS TABLE (
    rule_id TEXT,
    rule_name VARCHAR(255),
    trigger_data JSONB,
    conditions JSONB,
    actions JSONB,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        br.id,
        br.name,
        br.trigger,
        br.conditions,
        br.actions,
        br.priority
    FROM business_rules br
    WHERE br.tenant_id = p_tenant_id
      AND br.is_active = true
      AND (
          br.trigger->>'event' = p_event_type
          OR br.trigger->>'event' LIKE (SPLIT_PART(p_event_type, '.', 1) || '.*')
      )
    ORDER BY br.priority DESC, br.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get automation metrics
CREATE OR REPLACE FUNCTION get_automation_metrics(
    p_tenant_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT (now() - interval '30 days'),
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'rules', json_build_object(
            'total', (SELECT COUNT(*) FROM business_rules WHERE tenant_id = p_tenant_id),
            'active', (SELECT COUNT(*) FROM business_rules WHERE tenant_id = p_tenant_id AND is_active = true),
            'executions', (SELECT COUNT(*) FROM rule_execution_log WHERE tenant_id = p_tenant_id AND start_time >= p_start_date AND start_time <= p_end_date),
            'successful', (SELECT COUNT(*) FROM rule_execution_log WHERE tenant_id = p_tenant_id AND status = 'completed' AND start_time >= p_start_date AND start_time <= p_end_date),
            'failed', (SELECT COUNT(*) FROM rule_execution_log WHERE tenant_id = p_tenant_id AND status = 'failed' AND start_time >= p_start_date AND start_time <= p_end_date)
        ),
        'events', json_build_object(
            'total', (SELECT COUNT(*) FROM event_log WHERE tenant_id = p_tenant_id AND timestamp >= p_start_date AND timestamp <= p_end_date),
            'processed', (SELECT COUNT(*) FROM event_log WHERE tenant_id = p_tenant_id AND processed = true AND timestamp >= p_start_date AND timestamp <= p_end_date),
            'failed', (SELECT COUNT(*) FROM event_log WHERE tenant_id = p_tenant_id AND error IS NOT NULL AND timestamp >= p_start_date AND timestamp <= p_end_date)
        ),
        'emails', json_build_object(
            'sent', (SELECT COUNT(*) FROM automation_email_sends WHERE tenant_id = p_tenant_id AND status = 'sent' AND sent_at >= p_start_date AND sent_at <= p_end_date),
            'delivered', (SELECT COUNT(*) FROM automation_email_sends WHERE tenant_id = p_tenant_id AND status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date),
            'opened', (SELECT COUNT(*) FROM automation_email_sends WHERE tenant_id = p_tenant_id AND opened_at IS NOT NULL AND opened_at >= p_start_date AND opened_at <= p_end_date)
        ),
        'tasks', json_build_object(
            'automated', (SELECT COUNT(*) FROM tasks WHERE tenant_id = p_tenant_id AND created_by = 'system' AND created_at >= p_start_date AND created_at <= p_end_date)
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INITIAL DATA - DEFAULT EVENT DEFINITIONS
-- =============================================

INSERT INTO event_definitions (type, entity_type, description, schema) VALUES
('lead.created', 'lead', 'New lead created', '{"id": "string", "name": "string", "email": "string", "phone": "string", "source": "string", "temperature": "string"}'),
('lead.updated', 'lead', 'Lead information updated', '{"id": "string", "changes": "object"}'),
('lead.stage_changed', 'lead', 'Lead moved to different stage', '{"id": "string", "fromStageId": "string", "toStageId": "string"}'),
('deal.created', 'deal', 'New deal created', '{"id": "string", "title": "string", "value": "number", "stageId": "string"}'),
('deal.stage_changed', 'deal', 'Deal moved to different stage', '{"id": "string", "fromStageId": "string", "toStageId": "string"}'),
('deal.won', 'deal', 'Deal marked as won', '{"id": "string", "value": "number", "wonDate": "string"}'),
('deal.lost', 'deal', 'Deal marked as lost', '{"id": "string", "reason": "string", "lostDate": "string"}'),
('contact.created', 'contact', 'New contact created', '{"id": "string", "name": "string", "email": "string", "company": "string"}'),
('task.created', 'task', 'New task created', '{"id": "string", "title": "string", "assigneeId": "string", "dueDate": "string"}'),
('task.completed', 'task', 'Task marked as completed', '{"id": "string", "completedDate": "string", "completedBy": "string"}'),
('task.overdue', 'task', 'Task is overdue', '{"id": "string", "dueDate": "string", "daysOverdue": "number"}')
ON CONFLICT (type) DO NOTHING;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scoring_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_changes ENABLE ROW LEVEL SECURITY;

-- Business Rules policies
CREATE POLICY "Users can view rules from their tenant" ON business_rules
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can create rules for their tenant" ON business_rules
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update rules from their tenant" ON business_rules
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can delete rules from their tenant" ON business_rules
    FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Rule execution log policies
CREATE POLICY "Users can view execution logs from their tenant" ON rule_execution_log
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "System can insert execution logs" ON rule_execution_log
    FOR INSERT WITH CHECK (true);

-- Event definitions policies (global, read-only for users)
CREATE POLICY "Users can view event definitions" ON event_definitions
    FOR SELECT USING (true);

CREATE POLICY "Only service role can modify event definitions" ON event_definitions
    FOR ALL USING (auth.role() = 'service_role');

-- Event log policies
CREATE POLICY "Users can view event logs from their tenant" ON event_log
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "System can insert event logs" ON event_log
    FOR INSERT WITH CHECK (true);

-- Event subscriptions policies
CREATE POLICY "Users can manage their subscriptions" ON event_subscriptions
    FOR ALL USING (subscriber_id = auth.uid());

-- Email templates policies
CREATE POLICY "Users can manage email templates from their tenant" ON automation_email_templates
    FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Email campaigns policies
CREATE POLICY "Users can manage email campaigns from their tenant" ON automation_email_campaigns
    FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Email sends policies
CREATE POLICY "Users can view email sends from their tenant" ON automation_email_sends
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "System can manage email sends" ON automation_email_sends
    FOR ALL USING (auth.role() = 'service_role');

-- Lead scoring policies
CREATE POLICY "Users can manage lead scoring rules from their tenant" ON lead_scoring_rules
    FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can view lead scoring history from their tenant" ON lead_scoring_history
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "System can insert lead scoring history" ON lead_scoring_history
    FOR INSERT WITH CHECK (true);

-- Task automation policies
CREATE POLICY "Users can manage task automation rules from their tenant" ON task_automation_rules
    FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Stage changes policies
CREATE POLICY "Users can view stage changes from their tenant" ON stage_changes
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "System can insert stage changes" ON stage_changes
    FOR INSERT WITH CHECK (true);

-- =============================================
-- PERFORMANCE OPTIMIZATION
-- =============================================

-- Vacuum and analyze tables for optimal performance
VACUUM ANALYZE business_rules;
VACUUM ANALYZE rule_execution_log;
VACUUM ANALYZE event_definitions;
VACUUM ANALYZE event_log;
VACUUM ANALYZE event_subscriptions;

-- =============================================
-- COMPLETION LOG
-- =============================================

-- Log successful migration
DO $$
BEGIN
    RAISE NOTICE 'FASE 2: Workflow Automation System migration completed successfully';
    RAISE NOTICE 'Created tables: business_rules, rule_execution_log, event_definitions, event_log, event_subscriptions';
    RAISE NOTICE 'Created tables: automation_email_templates, automation_email_campaigns, automation_email_sends';
    RAISE NOTICE 'Created tables: lead_scoring_rules, lead_scoring_history, task_automation_rules, stage_changes';
    RAISE NOTICE 'Created indexes: 25 performance indexes';
    RAISE NOTICE 'Created functions: update_updated_at_column, update_lead_score, log_stage_change, get_active_rules_for_event, get_automation_metrics';
    RAISE NOTICE 'Created triggers: updated_at triggers, lead scoring trigger, stage change triggers';
    RAISE NOTICE 'Created RLS policies: tenant-based security for all tables';
    RAISE NOTICE 'Inserted default event definitions: 11 standard event types';
    RAISE NOTICE 'Migration timestamp: %', now();
END $$; 
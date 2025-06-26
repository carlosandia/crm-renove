-- =====================================================
-- MIGRATION: FASE 4B - MEMBER TOOLS & INTEGRATIONS (FIXED V2)
-- Version: 4B.1.1
-- Date: 2025-01-23
-- Description: Member operational tools and external integrations
-- =====================================================

-- Create migrations_log table if it doesn't exist (optional logging)
CREATE TABLE IF NOT EXISTS migrations_log (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log migration start (now safe)
INSERT INTO migrations_log (version, description, executed_at) 
VALUES ('4B.1.1', 'FASE 4B: Member Tools & Integrations - Tasks, Calendar, Email, WhatsApp, Dashboard (Fixed V2)', NOW());

-- =====================================================
-- 1. MEMBER TASK MANAGEMENT SYSTEM
-- =====================================================

-- Member tasks table for automated task creation and tracking
CREATE TABLE IF NOT EXISTS member_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Task identification
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL, -- 'follow_up', 'call', 'email', 'meeting', 'custom'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled', 'overdue'
    
    -- Assignment and ownership
    assigned_to UUID NOT NULL,
    assigned_by UUID,
    lead_id UUID,
    pipeline_id UUID,
    
    -- Scheduling
    due_date TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ,
    estimated_duration INTEGER, -- minutes
    
    -- Completion tracking
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    
    -- Automation flags
    is_automated BOOLEAN DEFAULT false,
    automation_rule_id UUID, -- Reference to automation rules
    auto_created_from VARCHAR(100), -- 'lead_stage_change', 'time_trigger', 'manual'
    
    -- Recurrence
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB, -- {type: 'daily/weekly/monthly', interval: 1, end_date: '...'}
    parent_task_id UUID REFERENCES member_tasks(id) ON DELETE CASCADE,
    
    -- Metadata
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Task activity log for tracking changes and actions
CREATE TABLE IF NOT EXISTS member_task_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    task_id UUID NOT NULL REFERENCES member_tasks(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'completed', 'status_changed', 'assigned', 'commented'
    description TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    
    -- User tracking
    performed_by UUID,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Context
    ip_address INET,
    user_agent TEXT
);

-- =====================================================
-- 2. CALENDAR INTEGRATION SYSTEM
-- =====================================================

-- Calendar integrations for Google Calendar and Outlook
CREATE TABLE IF NOT EXISTS calendar_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Integration details
    provider VARCHAR(20) NOT NULL, -- 'google', 'outlook', 'apple'
    provider_user_id VARCHAR(255) NOT NULL,
    calendar_id VARCHAR(255),
    calendar_name VARCHAR(255),
    
    -- OAuth tokens
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    
    -- Sync settings
    sync_enabled BOOLEAN DEFAULT true,
    sync_direction VARCHAR(20) DEFAULT 'bidirectional', -- 'read_only', 'write_only', 'bidirectional'
    last_sync_at TIMESTAMPTZ,
    sync_status VARCHAR(30) DEFAULT 'active', -- 'active', 'error', 'disconnected'
    sync_error_message TEXT,
    
    -- Preferences
    default_calendar BOOLEAN DEFAULT false,
    auto_create_tasks BOOLEAN DEFAULT true,
    notification_preferences JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    integration_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, user_id, provider, calendar_id)
);

-- Calendar events synced from external calendars
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
    
    -- Event identification
    external_event_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Timing
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT false,
    timezone VARCHAR(50),
    
    -- Location and participants
    location VARCHAR(500),
    attendees JSONB DEFAULT '[]'::jsonb,
    organizer JSONB,
    
    -- CRM Integration
    lead_id UUID,
    task_id UUID REFERENCES member_tasks(id) ON DELETE SET NULL,
    
    -- Event details
    status VARCHAR(30) DEFAULT 'confirmed', -- 'tentative', 'confirmed', 'cancelled'
    visibility VARCHAR(20) DEFAULT 'default', -- 'default', 'public', 'private'
    
    -- Sync tracking
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_version INTEGER DEFAULT 1,
    
    -- Metadata
    event_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(integration_id, external_event_id)
);

-- =====================================================
-- 3. EMAIL TEMPLATE SYSTEM
-- =====================================================

-- Email templates for member communications
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Template identification
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'follow_up', 'welcome', 'proposal', 'reminder', 'custom'
    
    -- Template content
    subject VARCHAR(500) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    
    -- Template variables
    available_variables JSONB DEFAULT '[]'::jsonb, -- [{name: 'lead_name', description: '...', type: 'string'}]
    
    -- Usage settings
    is_active BOOLEAN DEFAULT true,
    is_system_template BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    
    -- Personalization
    personalization_enabled BOOLEAN DEFAULT true,
    auto_personalization JSONB DEFAULT '{}'::jsonb,
    
    -- Permissions
    created_by UUID,
    shared_with_team BOOLEAN DEFAULT false,
    allowed_roles JSONB DEFAULT '["member", "admin"]'::jsonb,
    
    -- Metadata
    tags JSONB DEFAULT '[]'::jsonb,
    template_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- Email sending log for tracking sent emails
CREATE TABLE IF NOT EXISTS email_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    
    -- Email details
    from_email VARCHAR(255) NOT NULL,
    to_email VARCHAR(255) NOT NULL,
    cc_emails JSONB DEFAULT '[]'::jsonb,
    bcc_emails JSONB DEFAULT '[]'::jsonb,
    
    -- Content
    subject VARCHAR(500) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    
    -- Context
    lead_id UUID,
    task_id UUID REFERENCES member_tasks(id) ON DELETE SET NULL,
    sent_by UUID,
    
    -- Delivery tracking
    status VARCHAR(30) DEFAULT 'queued', -- 'queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
    external_message_id VARCHAR(255),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    
    -- Error tracking
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    email_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. WHATSAPP BUSINESS INTEGRATION
-- =====================================================

-- WhatsApp Business API configuration
CREATE TABLE IF NOT EXISTS whatsapp_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- WhatsApp Business Account details
    business_account_id VARCHAR(255) NOT NULL,
    phone_number_id VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    display_name VARCHAR(255),
    
    -- API credentials
    access_token TEXT NOT NULL,
    webhook_verify_token VARCHAR(255) NOT NULL,
    
    -- Status and verification
    verification_status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
    account_status VARCHAR(30) DEFAULT 'active', -- 'active', 'suspended', 'disabled'
    messaging_limit VARCHAR(30) DEFAULT 'tier_1', -- 'tier_1', 'tier_2', 'tier_3', 'unlimited'
    
    -- Message templates approval
    templates_approved INTEGER DEFAULT 0,
    templates_pending INTEGER DEFAULT 0,
    templates_rejected INTEGER DEFAULT 0,
    
    -- Webhook configuration
    webhook_url VARCHAR(500),
    webhook_events JSONB DEFAULT '["messages", "message_deliveries"]'::jsonb,
    
    -- Settings
    auto_reply_enabled BOOLEAN DEFAULT false,
    auto_reply_message TEXT,
    business_hours JSONB, -- {enabled: true, timezone: 'UTC', schedule: {...}}
    
    -- Metadata
    integration_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(tenant_id, phone_number_id)
);

-- WhatsApp message templates
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    integration_id UUID NOT NULL REFERENCES whatsapp_integrations(id) ON DELETE CASCADE,
    
    -- Template identification
    template_name VARCHAR(255) NOT NULL,
    external_template_id VARCHAR(255),
    category VARCHAR(50) NOT NULL, -- 'marketing', 'utility', 'authentication'
    language VARCHAR(10) NOT NULL, -- 'pt_BR', 'en_US', etc.
    
    -- Template content
    header_type VARCHAR(20), -- 'text', 'image', 'video', 'document'
    header_content TEXT,
    body_text TEXT NOT NULL,
    footer_text TEXT,
    
    -- Variables and parameters
    header_variables JSONB DEFAULT '[]'::jsonb,
    body_variables JSONB DEFAULT '[]'::jsonb,
    button_variables JSONB DEFAULT '[]'::jsonb,
    
    -- Buttons
    buttons JSONB DEFAULT '[]'::jsonb, -- [{type: 'quick_reply', text: '...'}, {type: 'url', text: '...', url: '...'}]
    
    -- Approval status
    approval_status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    rejection_reason TEXT,
    approved_at TIMESTAMPTZ,
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Metadata
    template_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(integration_id, template_name, language)
);

-- WhatsApp conversations and messages
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    integration_id UUID NOT NULL REFERENCES whatsapp_integrations(id) ON DELETE CASCADE,
    
    -- Conversation identification
    phone_number VARCHAR(20) NOT NULL,
    contact_name VARCHAR(255),
    
    -- CRM Integration
    lead_id UUID,
    assigned_to UUID,
    
    -- Conversation status
    status VARCHAR(30) DEFAULT 'open', -- 'open', 'closed', 'archived'
    last_message_at TIMESTAMPTZ,
    last_message_from VARCHAR(20), -- 'customer', 'business'
    
    -- Message counts
    total_messages INTEGER DEFAULT 0,
    unread_messages INTEGER DEFAULT 0,
    
    -- Metadata
    contact_metadata JSONB DEFAULT '{}'::jsonb,
    conversation_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(integration_id, phone_number)
);

-- WhatsApp messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    
    -- Message identification
    external_message_id VARCHAR(255),
    message_type VARCHAR(30) NOT NULL, -- 'text', 'image', 'video', 'audio', 'document', 'template'
    direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
    
    -- Message content
    content TEXT,
    media_url VARCHAR(500),
    media_type VARCHAR(50),
    media_caption TEXT,
    
    -- Template message details
    template_id UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
    template_variables JSONB,
    
    -- Message status (for outbound messages)
    status VARCHAR(30) DEFAULT 'queued', -- 'queued', 'sent', 'delivered', 'read', 'failed'
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    -- Error tracking
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Context
    sent_by UUID,
    task_id UUID REFERENCES member_tasks(id) ON DELETE SET NULL,
    
    -- Metadata
    message_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. MEMBER DASHBOARD & ANALYTICS
-- =====================================================

-- Member performance metrics snapshots
CREATE TABLE IF NOT EXISTS member_performance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    member_id UUID NOT NULL,
    
    -- Snapshot period
    snapshot_date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Task metrics
    tasks_assigned INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_overdue INTEGER DEFAULT 0,
    avg_task_completion_time INTERVAL,
    
    -- Lead metrics
    leads_assigned INTEGER DEFAULT 0,
    leads_contacted INTEGER DEFAULT 0,
    leads_converted INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Communication metrics
    emails_sent INTEGER DEFAULT 0,
    calls_made INTEGER DEFAULT 0,
    whatsapp_messages INTEGER DEFAULT 0,
    meetings_scheduled INTEGER DEFAULT 0,
    
    -- Activity metrics
    login_days INTEGER DEFAULT 0,
    active_hours DECIMAL(5,2) DEFAULT 0.00,
    pipeline_actions INTEGER DEFAULT 0,
    
    -- Performance scores
    productivity_score DECIMAL(5,2) DEFAULT 0.00,
    quality_score DECIMAL(5,2) DEFAULT 0.00,
    engagement_score DECIMAL(5,2) DEFAULT 0.00,
    overall_score DECIMAL(5,2) DEFAULT 0.00,
    
    -- Rankings
    team_rank INTEGER,
    team_size INTEGER,
    percentile DECIMAL(5,2),
    
    -- Goals and targets
    monthly_target INTEGER,
    target_achievement DECIMAL(5,2) DEFAULT 0.00,
    
    -- Metadata
    calculation_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, member_id, snapshot_date, period_type)
);

-- Member activity tracking for real-time monitoring
CREATE TABLE IF NOT EXISTS member_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    member_id UUID NOT NULL,
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL, -- 'login', 'task_completed', 'lead_contacted', 'email_sent', 'call_made', 'pipeline_updated'
    activity_description TEXT,
    
    -- Context
    entity_type VARCHAR(50), -- 'lead', 'task', 'pipeline', 'email', 'call'
    entity_id UUID,
    
    -- Activity data
    activity_data JSONB DEFAULT '{}'::jsonb,
    
    -- Session tracking
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Performance impact
    productivity_points INTEGER DEFAULT 0,
    quality_points INTEGER DEFAULT 0,
    
    -- Metadata
    activity_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Member dashboard configurations
CREATE TABLE IF NOT EXISTS member_dashboard_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    member_id UUID NOT NULL,
    
    -- Dashboard layout
    layout_config JSONB NOT NULL DEFAULT '{
        "widgets": [
            {"id": "tasks", "position": {"x": 0, "y": 0, "w": 6, "h": 4}, "visible": true},
            {"id": "leads", "position": {"x": 6, "y": 0, "w": 6, "h": 4}, "visible": true},
            {"id": "performance", "position": {"x": 0, "y": 4, "w": 12, "h": 3}, "visible": true},
            {"id": "calendar", "position": {"x": 0, "y": 7, "w": 8, "h": 4}, "visible": true},
            {"id": "communications", "position": {"x": 8, "y": 7, "w": 4, "h": 4}, "visible": true}
        ]
    }'::jsonb,
    
    -- Widget preferences
    widget_preferences JSONB DEFAULT '{}'::jsonb,
    
    -- Display settings
    theme VARCHAR(20) DEFAULT 'light', -- 'light', 'dark', 'auto'
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    
    -- Notification preferences
    notification_settings JSONB DEFAULT '{
        "email": {"task_reminders": true, "lead_updates": true},
        "push": {"task_due": true, "new_leads": true},
        "in_app": {"all": true}
    }'::jsonb,
    
    -- Auto-refresh settings
    auto_refresh_enabled BOOLEAN DEFAULT true,
    refresh_interval INTEGER DEFAULT 300, -- seconds
    
    -- Metadata
    config_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, member_id)
);

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

-- Member tasks indexes
CREATE INDEX IF NOT EXISTS idx_member_tasks_tenant_assigned ON member_tasks(tenant_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_member_tasks_due_date ON member_tasks(due_date) WHERE status IN ('pending', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_member_tasks_lead ON member_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_member_tasks_status ON member_tasks(status);
CREATE INDEX IF NOT EXISTS idx_member_tasks_automation ON member_tasks(is_automated, automation_rule_id);

-- Calendar events indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_integration ON calendar_events(integration_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_lead ON calendar_events(lead_id);

-- Email templates indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_active ON email_templates(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);

-- WhatsApp messages indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_tenant ON whatsapp_conversations(tenant_id, integration_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp);

-- Performance snapshots indexes
CREATE INDEX IF NOT EXISTS idx_member_performance_tenant_member ON member_performance_snapshots(tenant_id, member_id);
CREATE INDEX IF NOT EXISTS idx_member_performance_date ON member_performance_snapshots(snapshot_date, period_type);

-- Activity tracking indexes
CREATE INDEX IF NOT EXISTS idx_member_activities_member_time ON member_activities(member_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_member_activities_type ON member_activities(activity_type, occurred_at);

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE member_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_task_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_dashboard_configs ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (permissive for now - can be tightened later)
DO $$
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY[
        'member_tasks', 'member_task_activities', 'calendar_integrations', 
        'calendar_events', 'email_templates', 'email_sends', 
        'whatsapp_integrations', 'whatsapp_templates', 'whatsapp_conversations', 
        'whatsapp_messages', 'member_performance_snapshots', 'member_activities', 
        'member_dashboard_configs'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        -- Drop existing policies if they exist
        EXECUTE format('DROP POLICY IF EXISTS %I_tenant_policy ON %I', table_name, table_name);
        
        -- Create permissive policy for development
        EXECUTE format('
            CREATE POLICY %I_tenant_policy ON %I
            FOR ALL 
            USING (true)
        ', table_name, table_name);
    END LOOP;
END $$;

-- =====================================================
-- 8. POSTGRESQL FUNCTIONS FOR MEMBER TOOLS
-- =====================================================

-- Function to create automated tasks based on triggers
CREATE OR REPLACE FUNCTION create_automated_task(
    p_tenant_id UUID,
    p_title VARCHAR(255),
    p_description TEXT,
    p_task_type VARCHAR(50),
    p_assigned_to UUID,
    p_lead_id UUID DEFAULT NULL,
    p_due_date TIMESTAMPTZ DEFAULT NULL,
    p_automation_rule_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_task_id UUID;
BEGIN
    INSERT INTO member_tasks (
        tenant_id, title, description, task_type, assigned_to, 
        lead_id, due_date, is_automated, automation_rule_id, 
        auto_created_from, created_by
    ) VALUES (
        p_tenant_id, p_title, p_description, p_task_type, p_assigned_to,
        p_lead_id, p_due_date, true, p_automation_rule_id,
        'automation_trigger', COALESCE(p_created_by, p_assigned_to)
    ) RETURNING id INTO v_task_id;
    
    -- Log task creation activity
    INSERT INTO member_task_activities (
        tenant_id, task_id, activity_type, description, performed_by
    ) VALUES (
        p_tenant_id, v_task_id, 'created', 
        'Task automatically created by automation rule', 
        COALESCE(p_created_by, p_assigned_to)
    );
    
    RETURN v_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate member performance metrics
CREATE OR REPLACE FUNCTION calculate_member_performance(
    p_tenant_id UUID,
    p_member_id UUID,
    p_period_start DATE,
    p_period_end DATE,
    p_period_type VARCHAR(20)
) RETURNS VOID AS $$
DECLARE
    v_tasks_assigned INTEGER;
    v_tasks_completed INTEGER;
    v_tasks_overdue INTEGER;
    v_leads_assigned INTEGER;
    v_leads_contacted INTEGER;
    v_leads_converted INTEGER;
    v_emails_sent INTEGER;
    v_productivity_score DECIMAL(5,2);
BEGIN
    -- Calculate task metrics
    SELECT 
        COUNT(*) FILTER (WHERE created_at::date BETWEEN p_period_start AND p_period_end),
        COUNT(*) FILTER (WHERE completed_at::date BETWEEN p_period_start AND p_period_end),
        COUNT(*) FILTER (WHERE due_date < NOW() AND status IN ('pending', 'in_progress'))
    INTO v_tasks_assigned, v_tasks_completed, v_tasks_overdue
    FROM member_tasks
    WHERE tenant_id = p_tenant_id AND assigned_to = p_member_id;
    
    -- Set default values for lead metrics (will be updated when leads table is available)
    v_leads_assigned := 0;
    v_leads_contacted := 0;
    v_leads_converted := 0;
    
    -- Calculate email metrics
    SELECT COUNT(*)
    INTO v_emails_sent
    FROM email_sends
    WHERE tenant_id = p_tenant_id AND sent_by = p_member_id
    AND sent_at::date BETWEEN p_period_start AND p_period_end;
    
    -- Calculate productivity score (simplified algorithm)
    v_productivity_score := LEAST(100.0, (
        COALESCE(v_tasks_completed * 10.0, 0) +
        COALESCE(v_leads_contacted * 5.0, 0) +
        COALESCE(v_leads_converted * 25.0, 0) +
        COALESCE(v_emails_sent * 2.0, 0)
    ));
    
    -- Insert or update performance snapshot
    INSERT INTO member_performance_snapshots (
        tenant_id, member_id, snapshot_date, period_type,
        period_start, period_end, tasks_assigned, tasks_completed,
        tasks_overdue, leads_assigned, leads_contacted, leads_converted,
        emails_sent, productivity_score, calculated_at
    ) VALUES (
        p_tenant_id, p_member_id, p_period_end, p_period_type,
        p_period_start, p_period_end, v_tasks_assigned, v_tasks_completed,
        v_tasks_overdue, v_leads_assigned, v_leads_contacted, v_leads_converted,
        v_emails_sent, v_productivity_score, NOW()
    )
    ON CONFLICT (tenant_id, member_id, snapshot_date, period_type)
    DO UPDATE SET
        tasks_assigned = EXCLUDED.tasks_assigned,
        tasks_completed = EXCLUDED.tasks_completed,
        tasks_overdue = EXCLUDED.tasks_overdue,
        leads_assigned = EXCLUDED.leads_assigned,
        leads_contacted = EXCLUDED.leads_contacted,
        leads_converted = EXCLUDED.leads_converted,
        emails_sent = EXCLUDED.emails_sent,
        productivity_score = EXCLUDED.productivity_score,
        calculated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync calendar events
CREATE OR REPLACE FUNCTION sync_calendar_event(
    p_integration_id UUID,
    p_external_event_id VARCHAR(255),
    p_title VARCHAR(500),
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_description TEXT DEFAULT NULL,
    p_location VARCHAR(500) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
    v_tenant_id UUID;
BEGIN
    -- Get tenant_id from integration
    SELECT tenant_id INTO v_tenant_id
    FROM calendar_integrations
    WHERE id = p_integration_id;
    
    -- Insert or update calendar event
    INSERT INTO calendar_events (
        tenant_id, integration_id, external_event_id, title,
        start_time, end_time, description, location, last_synced_at
    ) VALUES (
        v_tenant_id, p_integration_id, p_external_event_id, p_title,
        p_start_time, p_end_time, p_description, p_location, NOW()
    )
    ON CONFLICT (integration_id, external_event_id)
    DO UPDATE SET
        title = EXCLUDED.title,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        description = EXCLUDED.description,
        location = EXCLUDED.location,
        last_synced_at = NOW(),
        sync_version = calendar_events.sync_version + 1
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. TRIGGERS FOR AUTOMATION (SAFE VERSION)
-- =====================================================

-- Update timestamps trigger function (create only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Apply updated_at triggers to relevant tables (drop first if exists)
DO $$
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS update_member_tasks_updated_at ON member_tasks;
    DROP TRIGGER IF EXISTS update_calendar_integrations_updated_at ON calendar_integrations;
    DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
    DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
    DROP TRIGGER IF EXISTS update_email_sends_updated_at ON email_sends;
    DROP TRIGGER IF EXISTS update_whatsapp_integrations_updated_at ON whatsapp_integrations;
    DROP TRIGGER IF EXISTS update_whatsapp_templates_updated_at ON whatsapp_templates;
    DROP TRIGGER IF EXISTS update_whatsapp_conversations_updated_at ON whatsapp_conversations;
    DROP TRIGGER IF EXISTS update_member_dashboard_configs_updated_at ON member_dashboard_configs;
    
    -- Create new triggers
    CREATE TRIGGER update_member_tasks_updated_at BEFORE UPDATE ON member_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_calendar_integrations_updated_at BEFORE UPDATE ON calendar_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_email_sends_updated_at BEFORE UPDATE ON email_sends FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_whatsapp_integrations_updated_at BEFORE UPDATE ON whatsapp_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON whatsapp_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_whatsapp_conversations_updated_at BEFORE UPDATE ON whatsapp_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_member_dashboard_configs_updated_at BEFORE UPDATE ON member_dashboard_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- Task completion trigger (safe version)
CREATE OR REPLACE FUNCTION handle_task_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- If task is being completed
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
        NEW.completed_at = NOW();
        
        -- Log completion activity
        INSERT INTO member_task_activities (
            tenant_id, task_id, activity_type, description, 
            old_values, new_values, performed_by
        ) VALUES (
            NEW.tenant_id, NEW.id, 'completed', 'Task marked as completed',
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            NEW.updated_by
        );
        
        -- Record member activity
        INSERT INTO member_activities (
            tenant_id, member_id, activity_type, activity_description,
            entity_type, entity_id, productivity_points
        ) VALUES (
            NEW.tenant_id, NEW.assigned_to, 'task_completed', 
            'Completed task: ' || NEW.title,
            'task', NEW.id, 10
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply task completion trigger (safe)
DO $$
BEGIN
    DROP TRIGGER IF EXISTS task_completion_trigger ON member_tasks;
    CREATE TRIGGER task_completion_trigger 
        BEFORE UPDATE ON member_tasks 
        FOR EACH ROW 
        EXECUTE FUNCTION handle_task_completion();
END $$;

-- WhatsApp conversation update trigger (safe version)
CREATE OR REPLACE FUNCTION update_whatsapp_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update conversation stats when new message is added
    UPDATE whatsapp_conversations SET
        last_message_at = NEW.timestamp,
        last_message_from = CASE 
            WHEN NEW.direction = 'inbound' THEN 'customer' 
            ELSE 'business' 
        END,
        total_messages = total_messages + 1,
        unread_messages = CASE 
            WHEN NEW.direction = 'inbound' THEN unread_messages + 1 
            ELSE unread_messages 
        END,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply WhatsApp trigger (safe)
DO $$
BEGIN
    DROP TRIGGER IF EXISTS whatsapp_message_stats_trigger ON whatsapp_messages;
    CREATE TRIGGER whatsapp_message_stats_trigger 
        AFTER INSERT ON whatsapp_messages 
        FOR EACH ROW 
        EXECUTE FUNCTION update_whatsapp_conversation_stats();
END $$;

-- =====================================================
-- 10. SAMPLE DATA FOR TESTING (Optional)
-- =====================================================

-- Insert sample email templates (only if no templates exist and companies table exists)
DO $$
BEGIN
    -- Check if companies table exists and has data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') 
       AND EXISTS (SELECT 1 FROM companies LIMIT 1) THEN
        
        -- Only insert if no templates exist
        IF NOT EXISTS (SELECT 1 FROM email_templates LIMIT 1) THEN
            INSERT INTO email_templates (
                tenant_id, name, description, category, subject, body_html, body_text,
                available_variables, is_system_template
            ) VALUES 
            (
                (SELECT id FROM companies LIMIT 1),
                'Follow-up Lead Quente', 
                'Template para follow-up de leads quentes',
                'follow_up',
                'Seguimento da sua solicitação - {{lead_name}}',
                '<p>Olá {{lead_name}},</p><p>Espero que esteja bem! Estou entrando em contato para dar seguimento à sua solicitação sobre {{product_interest}}.</p><p>Gostaria de agendar uma conversa para entender melhor suas necessidades?</p><p>Aguardo seu retorno.</p><p>Atenciosamente,<br>{{sender_name}}</p>',
                'Olá {{lead_name}}, Espero que esteja bem! Estou entrando em contato para dar seguimento à sua solicitação sobre {{product_interest}}. Gostaria de agendar uma conversa para entender melhor suas necessidades? Aguardo seu retorno. Atenciosamente, {{sender_name}}',
                '[{"name": "lead_name", "description": "Nome do lead", "type": "string"}, {"name": "product_interest", "description": "Produto de interesse", "type": "string"}, {"name": "sender_name", "description": "Nome do remetente", "type": "string"}]'::jsonb,
                true
            ),
            (
                (SELECT id FROM companies LIMIT 1),
                'Boas-vindas Novo Lead',
                'Template de boas-vindas para novos leads',
                'welcome',
                'Bem-vindo(a) {{lead_name}} - Obrigado pelo seu interesse!',
                '<p>Olá {{lead_name}},</p><p>Muito obrigado pelo seu interesse em nossos produtos/serviços!</p><p>Recebemos sua solicitação e em breve um de nossos consultores entrará em contato para apresentar as melhores soluções para você.</p><p>Enquanto isso, fique à vontade para explorar nosso site e conhecer mais sobre o que oferecemos.</p><p>Atenciosamente,<br>Equipe {{company_name}}</p>',
                'Olá {{lead_name}}, Muito obrigado pelo seu interesse em nossos produtos/serviços! Recebemos sua solicitação e em breve um de nossos consultores entrará em contato para apresentar as melhores soluções para você. Atenciosamente, Equipe {{company_name}}',
                '[{"name": "lead_name", "description": "Nome do lead", "type": "string"}, {"name": "company_name", "description": "Nome da empresa", "type": "string"}]'::jsonb,
                true
            );
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore any errors (e.g., if companies table doesn't exist)
        NULL;
END $$;

-- Log migration completion
INSERT INTO migrations_log (version, description, executed_at) 
VALUES ('4B.1.1', 'FASE 4B: Member Tools & Integrations - Migration completed successfully (Fixed V2)', NOW());

-- Migration summary
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'FASE 4B - MEMBER TOOLS & INTEGRATIONS (FIXED V2)';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '- member_tasks (Task management system)';
    RAISE NOTICE '- member_task_activities (Task activity tracking)';
    RAISE NOTICE '- calendar_integrations (Google/Outlook integration)';
    RAISE NOTICE '- calendar_events (Synced calendar events)';
    RAISE NOTICE '- email_templates (Email template system)';
    RAISE NOTICE '- email_sends (Email sending log)';
    RAISE NOTICE '- whatsapp_integrations (WhatsApp Business API)';
    RAISE NOTICE '- whatsapp_templates (WhatsApp message templates)';
    RAISE NOTICE '- whatsapp_conversations (WhatsApp conversations)';
    RAISE NOTICE '- whatsapp_messages (WhatsApp messages)';
    RAISE NOTICE '- member_performance_snapshots (Performance metrics)';
    RAISE NOTICE '- member_activities (Activity tracking)';
    RAISE NOTICE '- member_dashboard_configs (Dashboard configurations)';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Features implemented:';
    RAISE NOTICE '✓ Automated task management system';
    RAISE NOTICE '✓ Calendar integration (Google/Outlook)';
    RAISE NOTICE '✓ Email template system';
    RAISE NOTICE '✓ WhatsApp Business API integration';
    RAISE NOTICE '✓ Member performance tracking';
    RAISE NOTICE '✓ Activity monitoring';
    RAISE NOTICE '✓ Customizable member dashboards';
    RAISE NOTICE '✓ Real-time notifications support';
    RAISE NOTICE '✓ Mobile-optimized data structure';
    RAISE NOTICE '=====================================================';
END $$;

-- Verificar se tabela companies existe (substituto de tenants)
SELECT * FROM companies LIMIT 1;

-- Verificar se tabela deals existe
SELECT * FROM deals LIMIT 1;

-- Verificar se tabela leads existe
SELECT * FROM leads LIMIT 1; 
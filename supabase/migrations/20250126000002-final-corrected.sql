-- ================================================================
-- GOOGLE CALENDAR INTEGRATION - ENTERPRISE ARCHITECTURE (FINAL)
-- ================================================================
-- Version: 1.0.2 (Final - Corrected for actual DB schema)
-- Date: 2025-01-26
-- Description: Implementa arquitetura enterprise para Google Calendar
--              Super_admin configura OAuth2 uma vez, Admin habilita por empresa, 
--              Admin/Member conectam contas pessoais
-- ================================================================

-- ================================================================
-- 1. PLATFORM INTEGRATIONS TABLE (Super Admin Level)
-- ================================================================
CREATE TABLE IF NOT EXISTS platform_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_type VARCHAR(50) NOT NULL,
    provider_name VARCHAR(100) NOT NULL,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT unique_integration_provider UNIQUE(integration_type, provider_name)
);

-- ================================================================
-- 2. TENANT INTEGRATIONS TABLE (Company Level)
-- ================================================================
CREATE TABLE IF NOT EXISTS tenant_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    platform_integration_id UUID NOT NULL REFERENCES platform_integrations(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    usage_policy JSONB DEFAULT '{}',
    max_connections INTEGER DEFAULT NULL,
    current_connections INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}',
    enabled_at TIMESTAMP WITH TIME ZONE,
    enabled_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT unique_tenant_platform_integration UNIQUE(tenant_id, platform_integration_id)
);

-- ================================================================
-- 3. PLATFORM INTEGRATION LOGS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS platform_integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_integration_id UUID REFERENCES platform_integrations(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ================================================================
-- 4. ENHANCE EXISTING CALENDAR_INTEGRATIONS TABLE
-- ================================================================
DO $$ 
BEGIN
    -- Add new columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_integrations' AND column_name = 'platform_integration_id') THEN
        ALTER TABLE calendar_integrations ADD COLUMN platform_integration_id UUID REFERENCES platform_integrations(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_integrations' AND column_name = 'tenant_integration_id') THEN
        ALTER TABLE calendar_integrations ADD COLUMN tenant_integration_id UUID REFERENCES tenant_integrations(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_integrations' AND column_name = 'connection_method') THEN
        ALTER TABLE calendar_integrations ADD COLUMN connection_method VARCHAR(50) DEFAULT 'manual';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_integrations' AND column_name = 'is_demo_mode') THEN
        ALTER TABLE calendar_integrations ADD COLUMN is_demo_mode BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_integrations' AND column_name = 'connection_source') THEN
        ALTER TABLE calendar_integrations ADD COLUMN connection_source VARCHAR(100) DEFAULT 'direct';
    END IF;
END $$;

-- ================================================================
-- 5. PERFORMANCE INDEXES
-- ================================================================
-- Platform integrations indexes
CREATE INDEX IF NOT EXISTS idx_platform_integrations_type_active 
ON platform_integrations(integration_type, is_active);

CREATE INDEX IF NOT EXISTS idx_platform_integrations_created_at 
ON platform_integrations(created_at);

-- Tenant integrations indexes
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_tenant_id 
ON tenant_integrations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_integrations_platform_id 
ON tenant_integrations(platform_integration_id);

CREATE INDEX IF NOT EXISTS idx_tenant_integrations_enabled 
ON tenant_integrations(tenant_id, is_enabled);

-- Platform integration logs indexes
CREATE INDEX IF NOT EXISTS idx_platform_integration_logs_platform_id 
ON platform_integration_logs(platform_integration_id);

CREATE INDEX IF NOT EXISTS idx_platform_integration_logs_tenant_id 
ON platform_integration_logs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_platform_integration_logs_user_id 
ON platform_integration_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_platform_integration_logs_created_at 
ON platform_integration_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_platform_integration_logs_action 
ON platform_integration_logs(action);

-- Calendar integrations enhanced indexes
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_platform_id 
ON calendar_integrations(platform_integration_id);

CREATE INDEX IF NOT EXISTS idx_calendar_integrations_tenant_integration_id 
ON calendar_integrations(tenant_integration_id);

CREATE INDEX IF NOT EXISTS idx_calendar_integrations_connection_method 
ON calendar_integrations(connection_method);

-- ================================================================
-- 6. ROW LEVEL SECURITY POLICIES (CORRECTED FOR ACTUAL SCHEMA)
-- ================================================================
-- Enable RLS on new tables
ALTER TABLE platform_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_integration_logs ENABLE ROW LEVEL SECURITY;

-- Platform integrations policies (Super Admin only)
DROP POLICY IF EXISTS "Super admins can manage platform integrations" ON platform_integrations;
CREATE POLICY "Super admins can manage platform integrations" ON platform_integrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'super_admin'
        )
    );

-- Tenant integrations policies (Admin and Super Admin)
DROP POLICY IF EXISTS "Admins can manage their tenant integrations" ON tenant_integrations;
CREATE POLICY "Admins can manage their tenant integrations" ON tenant_integrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND (u.role = 'super_admin' OR 
                 (u.role = 'admin' AND u.tenant_id = tenant_integrations.tenant_id))
        )
    );

-- Platform integration logs policies (Read access for relevant users)
DROP POLICY IF EXISTS "Users can view relevant integration logs" ON platform_integration_logs;
CREATE POLICY "Users can view relevant integration logs" ON platform_integration_logs
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND (u.role = 'super_admin' OR 
                 (u.role = 'admin' AND u.tenant_id = platform_integration_logs.tenant_id))
        )
    );

-- ================================================================
-- 7. POSTGRESQL FUNCTIONS (CORRECTED FOR ACTUAL SCHEMA)
-- ================================================================

-- Function to configure platform integration (Super Admin)
CREATE OR REPLACE FUNCTION configure_platform_integration(
    p_integration_type VARCHAR(50),
    p_provider_name VARCHAR(100),
    p_client_id TEXT,
    p_client_secret TEXT,
    p_redirect_uri TEXT,
    p_scopes TEXT[] DEFAULT '{}',
    p_configuration JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_integration_id UUID;
    v_user_role TEXT;
BEGIN
    -- Check if user is super_admin
    SELECT u.role INTO v_user_role
    FROM users u 
    WHERE u.id = auth.uid();
    
    IF v_user_role != 'super_admin' THEN
        RAISE EXCEPTION 'Only super_admin can configure platform integrations';
    END IF;
    
    -- Insert or update platform integration
    INSERT INTO platform_integrations (
        integration_type, provider_name, client_id, client_secret, 
        redirect_uri, scopes, configuration, created_by
    ) VALUES (
        p_integration_type, p_provider_name, p_client_id, p_client_secret,
        p_redirect_uri, p_scopes, p_configuration, auth.uid()
    )
    ON CONFLICT (integration_type, provider_name) 
    DO UPDATE SET
        client_id = EXCLUDED.client_id,
        client_secret = EXCLUDED.client_secret,
        redirect_uri = EXCLUDED.redirect_uri,
        scopes = EXCLUDED.scopes,
        configuration = EXCLUDED.configuration,
        updated_at = now()
    RETURNING id INTO v_integration_id;
    
    -- Log the action
    INSERT INTO platform_integration_logs (
        platform_integration_id, action, details, user_id
    ) VALUES (
        v_integration_id, 'configured', 
        jsonb_build_object('integration_type', p_integration_type, 'provider', p_provider_name),
        auth.uid()
    );
    
    RETURN v_integration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to enable integration for tenant (Admin)
CREATE OR REPLACE FUNCTION enable_tenant_integration(
    p_tenant_id UUID,
    p_integration_type VARCHAR(50),
    p_provider_name VARCHAR(100),
    p_usage_policy JSONB DEFAULT '{}',
    p_max_connections INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_tenant_integration_id UUID;
    v_platform_integration_id UUID;
    v_user_role TEXT;
    v_user_tenant_id UUID;
BEGIN
    -- Get user role and tenant
    SELECT u.role, u.tenant_id INTO v_user_role, v_user_tenant_id
    FROM users u 
    WHERE u.id = auth.uid();
    
    -- Check permissions
    IF v_user_role = 'super_admin' THEN
        -- Super admin can enable for any tenant
        NULL;
    ELSIF v_user_role = 'admin' AND v_user_tenant_id = p_tenant_id THEN
        -- Admin can enable for their own tenant
        NULL;
    ELSE
        RAISE EXCEPTION 'Insufficient permissions to enable tenant integration';
    END IF;
    
    -- Get platform integration
    SELECT id INTO v_platform_integration_id
    FROM platform_integrations
    WHERE integration_type = p_integration_type 
    AND provider_name = p_provider_name 
    AND is_active = true;
    
    IF v_platform_integration_id IS NULL THEN
        RAISE EXCEPTION 'Platform integration not found or not active';
    END IF;
    
    -- Insert or update tenant integration
    INSERT INTO tenant_integrations (
        tenant_id, platform_integration_id, is_enabled, 
        usage_policy, max_connections, enabled_by, enabled_at
    ) VALUES (
        p_tenant_id, v_platform_integration_id, true,
        p_usage_policy, p_max_connections, auth.uid(), now()
    )
    ON CONFLICT (tenant_id, platform_integration_id)
    DO UPDATE SET
        is_enabled = true,
        usage_policy = EXCLUDED.usage_policy,
        max_connections = EXCLUDED.max_connections,
        enabled_by = EXCLUDED.enabled_by,
        enabled_at = now(),
        updated_at = now()
    RETURNING id INTO v_tenant_integration_id;
    
    -- Log the action
    INSERT INTO platform_integration_logs (
        platform_integration_id, tenant_id, action, details, user_id
    ) VALUES (
        v_platform_integration_id, p_tenant_id, 'enabled',
        jsonb_build_object('integration_type', p_integration_type, 'provider', p_provider_name),
        auth.uid()
    );
    
    RETURN v_tenant_integration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to connect user calendar (Any authenticated user)
CREATE OR REPLACE FUNCTION connect_user_calendar(
    p_tenant_id UUID,
    p_provider VARCHAR(50),
    p_provider_user_id VARCHAR(255),
    p_calendar_id VARCHAR(255),
    p_calendar_name VARCHAR(255),
    p_access_token TEXT,
    p_refresh_token TEXT DEFAULT NULL,
    p_token_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_calendar_integration_id UUID;
    v_platform_integration_id UUID;
    v_tenant_integration_id UUID;
    v_user_tenant_id UUID;
    v_current_connections INTEGER;
    v_max_connections INTEGER;
BEGIN
    -- Verify user belongs to the tenant
    SELECT u.tenant_id INTO v_user_tenant_id
    FROM users u 
    WHERE u.id = auth.uid();
    
    IF v_user_tenant_id != p_tenant_id THEN
        RAISE EXCEPTION 'User does not belong to the specified tenant';
    END IF;
    
    -- Get platform and tenant integration info
    SELECT pi.id, ti.id, ti.max_connections, ti.current_connections
    INTO v_platform_integration_id, v_tenant_integration_id, v_max_connections, v_current_connections
    FROM platform_integrations pi
    JOIN tenant_integrations ti ON pi.id = ti.platform_integration_id
    WHERE pi.integration_type = 'google_calendar'
    AND pi.provider_name = p_provider
    AND ti.tenant_id = p_tenant_id
    AND ti.is_enabled = true
    AND pi.is_active = true;
    
    IF v_tenant_integration_id IS NULL THEN
        RAISE EXCEPTION 'Integration not available for this tenant';
    END IF;
    
    -- Check connection limits
    IF v_max_connections IS NOT NULL AND v_current_connections >= v_max_connections THEN
        RAISE EXCEPTION 'Maximum connections limit reached for this tenant';
    END IF;
    
    -- Insert calendar integration
    INSERT INTO calendar_integrations (
        tenant_id, user_id, provider, provider_user_id, calendar_id, calendar_name,
        access_token, refresh_token, token_expires_at, platform_integration_id,
        tenant_integration_id, connection_method, connection_source
    ) VALUES (
        p_tenant_id, auth.uid(), p_provider, p_provider_user_id, p_calendar_id, p_calendar_name,
        p_access_token, p_refresh_token, p_token_expires_at, v_platform_integration_id,
        v_tenant_integration_id, 'platform', 'platform_oauth'
    )
    RETURNING id INTO v_calendar_integration_id;
    
    -- Update connection count
    UPDATE tenant_integrations 
    SET current_connections = current_connections + 1,
        updated_at = now()
    WHERE id = v_tenant_integration_id;
    
    -- Log the action
    INSERT INTO platform_integration_logs (
        platform_integration_id, tenant_id, user_id, action, details
    ) VALUES (
        v_platform_integration_id, p_tenant_id, auth.uid(), 'connected',
        jsonb_build_object('provider', p_provider, 'calendar_id', p_calendar_id)
    );
    
    RETURN v_calendar_integration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 8. TRIGGERS FOR AUTOMATIC UPDATES
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to new tables
DROP TRIGGER IF EXISTS update_platform_integrations_updated_at ON platform_integrations;
CREATE TRIGGER update_platform_integrations_updated_at
    BEFORE UPDATE ON platform_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenant_integrations_updated_at ON tenant_integrations;
CREATE TRIGGER update_tenant_integrations_updated_at
    BEFORE UPDATE ON tenant_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 9. INITIAL DATA SETUP
-- ================================================================
-- Insert Google Calendar platform integration (placeholder values)
INSERT INTO platform_integrations (
    integration_type, provider_name, client_id, client_secret, redirect_uri, scopes, configuration
) VALUES (
    'google_calendar', 
    'Google', 
    'YOUR_GOOGLE_CLIENT_ID_HERE', 
    'YOUR_GOOGLE_CLIENT_SECRET_HERE',
    'http://localhost:3000/auth/google/callback',
    ARRAY['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
    jsonb_build_object(
        'auth_uri', 'https://accounts.google.com/o/oauth2/auth',
        'token_uri', 'https://oauth2.googleapis.com/token',
        'userinfo_uri', 'https://www.googleapis.com/oauth2/v1/userinfo'
    )
) ON CONFLICT (integration_type, provider_name) DO NOTHING;

-- ================================================================
-- MIGRATION COMPLETE - SUMMARY
-- ================================================================
-- Tables Created:
-- 1. platform_integrations - Global OAuth2 configurations (super_admin)
-- 2. tenant_integrations - Company-level integration controls (admin)
-- 3. platform_integration_logs - Complete audit trail
-- 
-- Enhanced:
-- 4. calendar_integrations - Added enterprise architecture columns
--
-- Functions Created:
-- 1. configure_platform_integration() - Super admin configures OAuth2
-- 2. enable_tenant_integration() - Admin enables for company
-- 3. connect_user_calendar() - Users connect personal accounts
--
-- Security: Complete RLS policies implemented (corrected for actual schema)
-- Performance: All necessary indexes created
-- Audit: Complete logging of all actions
--
-- SCHEMA CORRECTIONS:
-- - Uses actual 'users' table instead of 'user_roles'
-- - References users.role and users.tenant_id directly
-- - All policies and functions updated for correct schema
-- ================================================================ 
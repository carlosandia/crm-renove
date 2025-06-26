-- =====================================================
-- FASE 1: OTIMIZAÇÕES CRÍTICAS DE PERFORMANCE
-- Performance Database Optimization Migration
-- =====================================================

-- ============================================
-- STEP 1: CREATE PERFORMANCE INDEXES
-- ============================================

-- ===== LEADS TABLE PERFORMANCE INDEXES =====

-- Composite index for most common query pattern (tenant + status + assigned)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_performance_main
ON leads(company_id, pipeline_id, stage_id, owner_id)
WHERE owner_id IS NOT NULL;

-- Index for lead listing with filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_listing
ON leads(company_id, created_at DESC, contact_email)
WHERE contact_email IS NOT NULL;

-- Index for lead search by contact info
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_contact_search
ON leads(company_id, contact_name, contact_email, contact_phone)
WHERE contact_name IS NOT NULL OR contact_email IS NOT NULL;

-- Index for lead activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_activity
ON leads(owner_id, last_activity_at DESC)
WHERE last_activity_at IS NOT NULL;

-- ===== PIPELINES TABLE PERFORMANCE INDEXES =====

-- Composite index for pipeline queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipelines_performance
ON pipelines(company_id, is_active, created_at DESC)
WHERE is_active = true;

-- Index for pipeline stages ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_stages_performance
ON pipeline_stages(pipeline_id, order_index, name);

-- ===== NOTIFICATIONS TABLE PERFORMANCE INDEXES =====

-- High-performance index for unread notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread_priority
ON notifications(user_id, read, priority, created_at DESC)
WHERE read = false;

-- Index for notification targeting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_targeting
ON notifications(target_role, tenant_id, status, scheduled_for)
WHERE target_role IS NOT NULL;

-- ===== USERS TABLE PERFORMANCE INDEXES =====

-- Index for user queries by company and role
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_company_role
ON users(company_id, role, is_active)
WHERE is_active = true;

-- ============================================
-- STEP 2: CREATE PERFORMANCE MONITORING
-- ============================================

-- Table to track query performance metrics
CREATE TABLE IF NOT EXISTS query_performance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash TEXT NOT NULL,
    query_type TEXT NOT NULL,
    table_name TEXT,
    execution_time_ms NUMERIC,
    rows_examined BIGINT,
    rows_returned BIGINT,
    cache_hit BOOLEAN DEFAULT false,
    user_id UUID,
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance log queries
CREATE INDEX IF NOT EXISTS idx_query_performance_log
ON query_performance_log(query_type, table_name, created_at DESC);

-- Function to log query performance
CREATE OR REPLACE FUNCTION log_query_performance(
    p_query_hash TEXT,
    p_query_type TEXT,
    p_table_name TEXT DEFAULT NULL,
    p_execution_time_ms NUMERIC DEFAULT NULL,
    p_rows_examined BIGINT DEFAULT NULL,
    p_rows_returned BIGINT DEFAULT NULL,
    p_cache_hit BOOLEAN DEFAULT false,
    p_user_id UUID DEFAULT NULL,
    p_tenant_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO query_performance_log (
        query_hash, query_type, table_name, execution_time_ms,
        rows_examined, rows_returned, cache_hit, user_id, tenant_id
    ) VALUES (
        p_query_hash, p_query_type, p_table_name, p_execution_time_ms,
        p_rows_examined, p_rows_returned, p_cache_hit, p_user_id, p_tenant_id
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 3: CREATE CACHE INVALIDATION TRIGGERS
-- ============================================

-- Function to invalidate cache on data changes
CREATE OR REPLACE FUNCTION invalidate_cache_on_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify application to invalidate cache
    PERFORM pg_notify(
        'cache_invalidation',
        json_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'row_id', COALESCE(NEW.id, OLD.id),
            'timestamp', NOW()
        )::text
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for cache invalidation
DROP TRIGGER IF EXISTS trigger_leads_cache_invalidation ON leads;
CREATE TRIGGER trigger_leads_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON leads
    FOR EACH ROW EXECUTE FUNCTION invalidate_cache_on_change();

DROP TRIGGER IF EXISTS trigger_pipelines_cache_invalidation ON pipelines;
CREATE TRIGGER trigger_pipelines_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON pipelines
    FOR EACH ROW EXECUTE FUNCTION invalidate_cache_on_change();

-- ============================================
-- STEP 4: PERFORMANCE ANALYSIS FUNCTIONS
-- ============================================

-- Function to get table statistics
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE(
    table_name TEXT,
    row_count BIGINT,
    table_size TEXT,
    index_size TEXT,
    total_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        (xpath('/row/c/text()', xml_count))[1]::text::BIGINT as row_count,
        pg_size_pretty(pg_total_relation_size('"' || t.table_name || '"')) as table_size,
        pg_size_pretty(pg_indexes_size('"' || t.table_name || '"')) as index_size,
        pg_size_pretty(pg_total_relation_size('"' || t.table_name || '"') + pg_indexes_size('"' || t.table_name || '"')) as total_size
    FROM (
        SELECT 
            table_name,
            query_to_xml(format('SELECT count(*) as c FROM %I', table_name), false, true, '') as xml_count
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name IN ('leads', 'pipelines', 'notifications', 'users')
    ) t;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 5: VALIDATE PERFORMANCE IMPROVEMENTS
-- ============================================

-- Create validation function
CREATE OR REPLACE FUNCTION validate_performance_optimization()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check if indexes were created
    RETURN QUERY
    SELECT 
        'Index Creation'::TEXT as check_name,
        CASE 
            WHEN COUNT(*) >= 5 THEN 'PASS'::TEXT
            ELSE 'FAIL'::TEXT
        END as status,
        FORMAT('Created %s performance indexes', COUNT(*))::TEXT as details
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE '%performance%';
    
    -- Check if performance monitoring is set up
    RETURN QUERY
    SELECT 
        'Performance Monitoring'::TEXT as check_name,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'query_performance_log') 
            THEN 'PASS'::TEXT
            ELSE 'FAIL'::TEXT
        END as status,
        'Performance monitoring table and functions created'::TEXT as details;
END;
$$ LANGUAGE plpgsql;

-- Run validation
SELECT * FROM validate_performance_optimization();

-- Final status
SELECT 'FASE 1 PERFORMANCE OPTIMIZATION COMPLETED SUCCESSFULLY' as status; 
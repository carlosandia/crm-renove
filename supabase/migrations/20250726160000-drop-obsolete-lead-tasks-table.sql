-- Migration: Drop obsolete lead_tasks table
-- Date: 2025-07-26
-- Description: Remove deprecated lead_tasks table in favor of combined_activities_view

-- ⚠️ WARNING: This migration will permanently delete the lead_tasks table
-- Make sure all data has been migrated to cadence_task_instances before running

BEGIN;

-- First, check if the table exists and has data
DO $$
DECLARE
    lead_tasks_count INTEGER;
    cadence_tasks_count INTEGER;
BEGIN
    -- Count records in both tables
    SELECT COUNT(*) INTO lead_tasks_count FROM lead_tasks;
    SELECT COUNT(*) INTO cadence_tasks_count FROM cadence_task_instances;
    
    -- Log the counts
    RAISE NOTICE 'lead_tasks table has % records', lead_tasks_count;
    RAISE NOTICE 'cadence_task_instances table has % records', cadence_tasks_count;
    
    -- Safety check: Don't drop if cadence table is empty but lead_tasks has data
    IF lead_tasks_count > 0 AND cadence_tasks_count = 0 THEN
        RAISE EXCEPTION 'Safety check failed: lead_tasks has data but cadence_task_instances is empty. Migration halted.';
    END IF;
    
    -- Log migration start
    RAISE NOTICE 'Safety checks passed. Proceeding with table drop...';
END
$$;

-- Drop any functions that depend on lead_tasks table
DROP FUNCTION IF EXISTS generate_lead_tasks_on_stage_entry(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS process_lead_tasks_for_pipeline(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_lead_tasks_summary(uuid) CASCADE;

-- Drop any triggers related to lead_tasks
DROP TRIGGER IF EXISTS lead_tasks_updated_at_trigger ON lead_tasks;
DROP TRIGGER IF EXISTS lead_tasks_tenant_isolation_trigger ON lead_tasks;

-- Drop any indexes on lead_tasks table
DROP INDEX IF EXISTS idx_lead_tasks_lead_id;
DROP INDEX IF EXISTS idx_lead_tasks_pipeline_id;
DROP INDEX IF EXISTS idx_lead_tasks_tenant_id;
DROP INDEX IF EXISTS idx_lead_tasks_status;
DROP INDEX IF EXISTS idx_lead_tasks_data_programada;
DROP INDEX IF EXISTS idx_lead_tasks_assigned_to;

-- Remove RLS policies
DROP POLICY IF EXISTS "Users can view their tenant lead_tasks" ON lead_tasks;
DROP POLICY IF EXISTS "Users can create lead_tasks for their tenant" ON lead_tasks;
DROP POLICY IF EXISTS "Users can update their tenant lead_tasks" ON lead_tasks;
DROP POLICY IF EXISTS "Users can delete their tenant lead_tasks" ON lead_tasks;

-- Finally, drop the table
DROP TABLE IF EXISTS lead_tasks CASCADE;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully. lead_tasks table and related objects have been dropped.';
    RAISE NOTICE 'All activity data should now be accessed through combined_activities_view.';
END
$$;

COMMIT;
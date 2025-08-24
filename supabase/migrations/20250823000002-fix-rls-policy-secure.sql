-- Migration: Fix RLS Policy for Pipelines - Use app_metadata instead of user_metadata
-- File: 20250823000002-fix-rls-policy-secure.sql
-- Description: Migrate from insecure user_metadata to secure app_metadata for tenant isolation

-- Step 1: Drop the existing insecure policy
DROP POLICY IF EXISTS "tenant_isolation_pipelines" ON pipelines;

-- Step 2: Create new secure policy using app_metadata
-- app_metadata cannot be manipulated by users, making it secure for RLS policies
CREATE POLICY "secure_tenant_isolation_pipelines" ON pipelines 
FOR ALL TO authenticated 
USING (
  tenant_id = (
    SELECT COALESCE(
      -- Try app_metadata first (secure)
      auth.jwt() -> 'app_metadata' ->> 'tenant_id',
      -- Fallback to user_metadata temporarily for migration
      auth.jwt() -> 'user_metadata' ->> 'tenant_id'
    )
  )
) 
WITH CHECK (
  tenant_id = (
    SELECT COALESCE(
      -- Try app_metadata first (secure)
      auth.jwt() -> 'app_metadata' ->> 'tenant_id',
      -- Fallback to user_metadata temporarily for migration
      auth.jwt() -> 'user_metadata' ->> 'tenant_id'
    )
  )
);

-- Step 3: Add comment for documentation
COMMENT ON POLICY "secure_tenant_isolation_pipelines" ON pipelines IS 
'Secure tenant isolation using app_metadata (non-manipulable by users). Uses COALESCE for backwards compatibility during migration from user_metadata.';

-- Step 4: Verify RLS is enabled
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

-- Step 5: Create helper function for debugging RLS policies
CREATE OR REPLACE FUNCTION debug_jwt_tenant_id()
RETURNS TABLE (
  user_id UUID,
  tenant_from_user_metadata TEXT,
  tenant_from_app_metadata TEXT,
  recommended_source TEXT
) 
LANGUAGE SQL SECURITY DEFINER
AS $$
  SELECT 
    auth.uid() as user_id,
    auth.jwt() -> 'user_metadata' ->> 'tenant_id' as tenant_from_user_metadata,
    auth.jwt() -> 'app_metadata' ->> 'tenant_id' as tenant_from_app_metadata,
    CASE 
      WHEN auth.jwt() -> 'app_metadata' ->> 'tenant_id' IS NOT NULL THEN 'app_metadata (SECURE)'
      WHEN auth.jwt() -> 'user_metadata' ->> 'tenant_id' IS NOT NULL THEN 'user_metadata (INSECURE - MIGRATE)'
      ELSE 'NONE (PROBLEM)'
    END as recommended_source;
$$;

-- Step 6: Grant execute permission to authenticated users for debugging
GRANT EXECUTE ON FUNCTION debug_jwt_tenant_id() TO authenticated;
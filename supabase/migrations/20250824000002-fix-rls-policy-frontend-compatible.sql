-- Migration: Fix pipelines RLS policy for frontend compatibility
-- Created: 2025-08-24
-- Issue: RLS policy not working with frontend auth context, even though auth.uid() should work

-- Problem identified:
-- The previous policy using COALESCE with auth.uid() lookup works in SQL context
-- but might not work correctly with Supabase client SDK from frontend.
-- Need a policy that works better with authenticated sessions.

-- Remove current policy
DROP POLICY IF EXISTS "pipelines_tenant_isolation" ON pipelines;

-- Create new frontend-compatible policy using different approach
-- This policy will work with both service role and authenticated user context
CREATE POLICY "pipelines_frontend_auth" ON pipelines
FOR ALL TO authenticated
USING (
  -- Approach 1: Direct metadata access with fallback
  tenant_id = COALESCE(
    current_setting('request.jwt.claims', true)::json->>'tenant_id',
    (SELECT COALESCE(
      raw_app_meta_data->>'tenant_id',
      raw_user_meta_data->>'tenant_id'
    ) FROM auth.users WHERE id = auth.uid())
  )
)
WITH CHECK (
  -- Same condition for WITH CHECK
  tenant_id = COALESCE(
    current_setting('request.jwt.claims', true)::json->>'tenant_id',
    (SELECT COALESCE(
      raw_app_meta_data->>'tenant_id',
      raw_user_meta_data->>'tenant_id'
    ) FROM auth.users WHERE id = auth.uid())
  )
);

-- Alternative: If current_setting doesn't work, create a simpler policy
-- that relies purely on auth.uid() lookup
CREATE POLICY "pipelines_simple_auth_fallback" ON pipelines
FOR ALL TO authenticated
USING (
  -- Simple auth.uid() based lookup
  tenant_id IN (
    SELECT COALESCE(
      raw_app_meta_data->>'tenant_id',
      raw_user_meta_data->>'tenant_id'
    ) FROM auth.users WHERE id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT COALESCE(
      raw_app_meta_data->>'tenant_id',
      raw_user_meta_data->>'tenant_id'
    ) FROM auth.users WHERE id = auth.uid()
  )
);

-- This migration creates two policies to test which approach works better:
-- 1. pipelines_frontend_auth: Uses current_setting with fallback
-- 2. pipelines_simple_auth_fallback: Uses IN clause with auth.uid() lookup

-- Next step: Test with frontend and drop the policy that doesn't work
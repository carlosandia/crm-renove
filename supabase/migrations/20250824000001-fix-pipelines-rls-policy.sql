-- Migration: Fix pipelines RLS policy to use auth.users table instead of auth.jwt()
-- Created: 2025-08-24
-- Issue: Pipeline "Vendas" not appearing in frontend due to RLS policy using auth.jwt() incorrectly

-- Problem identified:
-- The previous policy used auth.jwt() -> 'app_metadata'/'user_metadata' which doesn't work
-- correctly with Supabase client SDK from frontend.
-- auth.jwt() returns null in frontend context, blocking all queries.

-- Solution:
-- Use auth.uid() with direct lookup in auth.users table to get tenant_id
-- from raw_app_meta_data or raw_user_meta_data with COALESCE fallback.

-- Remove old problematic policy
DROP POLICY IF EXISTS "secure_tenant_isolation_pipelines" ON pipelines;

-- Create new robust policy using auth.uid() and auth.users lookup
CREATE POLICY "pipelines_tenant_isolation" ON pipelines
FOR ALL TO authenticated
USING (
  tenant_id = (
    SELECT COALESCE(
      raw_app_meta_data->>'tenant_id',
      raw_user_meta_data->>'tenant_id'
    )
    FROM auth.users 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  tenant_id = (
    SELECT COALESCE(
      raw_app_meta_data->>'tenant_id',
      raw_user_meta_data->>'tenant_id'
    )
    FROM auth.users 
    WHERE id = auth.uid()
  )
);

-- This policy will work correctly with:
-- 1. Frontend Supabase client SDK (auth.uid() works)
-- 2. Both app_metadata and user_metadata (COALESCE fallback)
-- 3. Proper tenant isolation for multi-tenant architecture
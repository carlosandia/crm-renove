/**
 * Utility to migrate tenant_id from user_metadata to app_metadata
 * Following Supabase security best practices (Database Advisor: Lint 0015)
 */

import { supabase } from '../lib/supabase';

interface MigrationResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Migrates current user's tenant_id from user_metadata to app_metadata
 * This function should be called during login or when user accesses the application
 */
export const migrateUserToAppMetadata = async (): Promise<MigrationResult> => {
  try {
    console.log('🔄 [MIGRATION] Starting migration from user_metadata to app_metadata...');

    // Step 1: Get current user and session
    const { data: { user, session }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user || !session) {
      return {
        success: false,
        message: 'No authenticated user found for migration',
        details: { error: userError }
      };
    }

    // Step 2: Check if tenant_id exists in user_metadata
    const tenantIdFromUserMetadata = user.user_metadata?.tenant_id;
    const tenantIdFromAppMetadata = user.app_metadata?.tenant_id;

    console.log('🔍 [MIGRATION] Current metadata state:', {
      userId: user.id,
      email: user.email,
      tenantIdFromUserMetadata,
      tenantIdFromAppMetadata,
      hasUserMetadataTenantId: !!tenantIdFromUserMetadata,
      hasAppMetadataTenantId: !!tenantIdFromAppMetadata
    });

    // Step 3: Determine if migration is needed
    if (tenantIdFromAppMetadata) {
      return {
        success: true,
        message: 'User already has tenant_id in app_metadata (secure)',
        details: { tenantId: tenantIdFromAppMetadata, migrationNeeded: false }
      };
    }

    if (!tenantIdFromUserMetadata) {
      // Use fallback tenant_id for development/testing
      const fallbackTenantId = 'c983a983-b1c6-451f-b528-64a5d1c831a0';
      console.warn('⚠️ [MIGRATION] No tenant_id found in user_metadata, using fallback:', fallbackTenantId);
      
      // Update user with fallback tenant_id in app_metadata
      // Note: app_metadata can only be updated server-side or via service role
      // For now, we'll log this and return the fallback for frontend use
      return {
        success: false,
        message: 'No tenant_id found, requires server-side migration',
        details: { 
          fallbackTenantId, 
          requiresServerSideMigration: true,
          recommendation: 'Update user during next login via backend'
        }
      };
    }

    // Step 4: Migration needed - tenant_id exists in user_metadata but not in app_metadata
    console.log('🔄 [MIGRATION] Migration needed: moving tenant_id to app_metadata...');

    // Note: Direct app_metadata updates require service_role permissions
    // This should be done via backend API call
    const migrationData = {
      userId: user.id,
      tenantId: tenantIdFromUserMetadata,
      currentAppMetadata: user.app_metadata || {},
      requestedAt: new Date().toISOString()
    };

    // Call backend migration endpoint (to be implemented)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/migrate-to-app-metadata`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(migrationData)
      });

      if (!response.ok) {
        throw new Error(`Migration API call failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ [MIGRATION] Server-side migration successful:', result);

      // Force session refresh to get updated app_metadata
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        console.warn('⚠️ [MIGRATION] Could not refresh session after migration:', refreshError);
      }

      return {
        success: true,
        message: 'Migration successful: tenant_id moved to app_metadata',
        details: { 
          tenantId: tenantIdFromUserMetadata,
          migrationResult: result,
          sessionRefreshed: !refreshError
        }
      };

    } catch (backendError) {
      console.error('❌ [MIGRATION] Backend migration failed:', backendError);
      
      // Fallback: continue using user_metadata temporarily
      return {
        success: false,
        message: 'Migration failed, continuing with user_metadata temporarily',
        details: { 
          error: backendError,
          fallbackTenantId: tenantIdFromUserMetadata,
          needsManualMigration: true
        }
      };
    }

  } catch (error) {
    console.error('❌ [MIGRATION] Critical error during migration:', error);
    return {
      success: false,
      message: 'Critical migration error',
      details: { error }
    };
  }
};

/**
 * Check if user needs migration from user_metadata to app_metadata
 */
export const checkMigrationStatus = async (): Promise<{
  needsMigration: boolean;
  tenantId: string | null;
  source: 'app_metadata' | 'user_metadata' | 'none';
}> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { needsMigration: false, tenantId: null, source: 'none' };
    }

    const tenantIdFromAppMetadata = user.app_metadata?.tenant_id;
    const tenantIdFromUserMetadata = user.user_metadata?.tenant_id;

    if (tenantIdFromAppMetadata) {
      return { 
        needsMigration: false, 
        tenantId: tenantIdFromAppMetadata, 
        source: 'app_metadata' 
      };
    }

    if (tenantIdFromUserMetadata) {
      return { 
        needsMigration: true, 
        tenantId: tenantIdFromUserMetadata, 
        source: 'user_metadata' 
      };
    }

    return { needsMigration: true, tenantId: null, source: 'none' };
    
  } catch (error) {
    console.error('❌ [MIGRATION] Error checking migration status:', error);
    return { needsMigration: false, tenantId: null, source: 'none' };
  }
};
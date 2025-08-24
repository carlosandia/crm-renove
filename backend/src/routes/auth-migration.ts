/**
 * Auth Migration Routes
 * Handles migration from user_metadata to app_metadata following Supabase security best practices
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { simpleAuth } from '../middleware/simpleAuth';

const router = Router();

// Get Supabase URL from environment (different naming conventions)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ [AUTH-MIGRATION] Missing Supabase environment variables:', {
    supabaseUrl: !!supabaseUrl,
    serviceRoleKey: !!serviceRoleKey,
    VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
  throw new Error('Missing required Supabase environment variables');
}

// Initialize Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey, // Service role can update app_metadata
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Validation schema for migration request
const migrationRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  tenantId: z.string().min(1, 'Tenant ID is required'),
  currentAppMetadata: z.object({}).optional(),
  requestedAt: z.string().datetime('Invalid datetime format')
});

/**
 * POST /auth/migrate-to-app-metadata
 * Migrate user's tenant_id from user_metadata to app_metadata
 */
router.post('/migrate-to-app-metadata', simpleAuth, async (req: Request, res: Response) => {
  try {
    console.log('🔄 [AUTH-MIGRATION] Starting server-side migration...');

    // Validate request body
    const validationResult = migrationRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid migration request',
        details: validationResult.error.issues
      });
    }

    const { userId, tenantId, currentAppMetadata } = validationResult.data;

    // Security check: verify the requesting user matches the userId being migrated
    const requestingUserId = (req as any).user?.id;
    
    if (requestingUserId !== userId) {
      console.warn('🚨 [AUTH-MIGRATION] Security violation: user mismatch', {
        requestingUserId,
        targetUserId: userId,
        tenantId
      });
      
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: can only migrate your own account'
      });
    }

    // Step 1: Get current user data using service role
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      console.error('❌ [AUTH-MIGRATION] Failed to get user data:', userError);
      return res.status(404).json({
        success: false,
        error: 'User not found',
        details: userError
      });
    }

    // Step 2: Check if migration is actually needed
    const existingAppMetadata = userData.user.app_metadata || {};
    const existingTenantId = existingAppMetadata.tenant_id;

    if (existingTenantId) {
      console.log('✅ [AUTH-MIGRATION] User already has tenant_id in app_metadata:', existingTenantId);
      return res.json({
        success: true,
        message: 'Migration not needed: tenant_id already in app_metadata',
        data: {
          tenantId: existingTenantId,
          migrationApplied: false,
          source: 'app_metadata'
        }
      });
    }

    // Step 3: Prepare new app_metadata with tenant_id
    const updatedAppMetadata = {
      ...existingAppMetadata,
      tenant_id: tenantId,
      migrated_from_user_metadata: true,
      migration_timestamp: new Date().toISOString()
    };

    console.log('🔄 [AUTH-MIGRATION] Updating app_metadata:', {
      userId,
      tenantId,
      previousAppMetadata: existingAppMetadata,
      newAppMetadata: updatedAppMetadata
    });

    // Step 4: Update user's app_metadata using service role
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        app_metadata: updatedAppMetadata
      }
    );

    if (updateError) {
      console.error('❌ [AUTH-MIGRATION] Failed to update app_metadata:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update user metadata',
        details: updateError
      });
    }

    console.log('✅ [AUTH-MIGRATION] Successfully migrated to app_metadata:', {
      userId,
      tenantId,
      migrationTimestamp: updatedAppMetadata.migration_timestamp
    });

    // Step 5: Log successful migration for audit trail
    console.log('📝 [AUTH-MIGRATION] Migration audit log:', {
      userId,
      email: userData.user.email,
      tenantId,
      fromSource: 'user_metadata',
      toSource: 'app_metadata',
      timestamp: new Date().toISOString(),
      requestedBy: requestingUserId
    });

    return res.json({
      success: true,
      message: 'Migration successful: tenant_id moved to app_metadata',
      data: {
        tenantId,
        migrationApplied: true,
        migrationTimestamp: updatedAppMetadata.migration_timestamp,
        source: 'app_metadata',
        user: {
          id: updateData.user.id,
          email: updateData.user.email,
          app_metadata: updateData.user.app_metadata
        }
      }
    });

  } catch (error) {
    console.error('❌ [AUTH-MIGRATION] Critical error during migration:', error);
    return res.status(500).json({
      success: false,
      error: 'Critical migration error',
      details: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
    });
  }
});

/**
 * GET /auth/migration-status
 * Check current migration status for authenticated user
 */
router.get('/migration-status', simpleAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Get user data using service role for complete metadata view
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userMetadata = userData.user.user_metadata || {};
    const appMetadata = userData.user.app_metadata || {};
    
    const tenantIdFromUserMetadata = userMetadata.tenant_id;
    const tenantIdFromAppMetadata = appMetadata.tenant_id;
    
    let status;
    let source;
    let tenantId;
    let needsMigration = false;

    if (tenantIdFromAppMetadata) {
      status = 'migrated';
      source = 'app_metadata';
      tenantId = tenantIdFromAppMetadata;
      needsMigration = false;
    } else if (tenantIdFromUserMetadata) {
      status = 'needs_migration';
      source = 'user_metadata';
      tenantId = tenantIdFromUserMetadata;
      needsMigration = true;
    } else {
      status = 'no_tenant_id';
      source = 'none';
      tenantId = null;
      needsMigration = true;
    }

    return res.json({
      success: true,
      data: {
        userId,
        email: userData.user.email,
        status,
        source,
        tenantId,
        needsMigration,
        migrationTimestamp: appMetadata.migration_timestamp || null,
        metadata: {
          user_metadata: userMetadata,
          app_metadata: appMetadata
        }
      }
    });

  } catch (error) {
    console.error('❌ [AUTH-MIGRATION] Error checking migration status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check migration status',
      details: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
    });
  }
});

export default router;
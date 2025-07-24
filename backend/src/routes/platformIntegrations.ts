import { Router, Request, Response } from 'express';
import { requireRole } from '../middleware/auth';
import { rateLimit } from 'express-rate-limit';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const router = Router();

// Rate limiting for platform integrations
const platformRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// =====================================================
// SUPER ADMIN ROUTES - PLATFORM INTEGRATIONS
// =====================================================

/**
 * @route GET /api/platform-integrations
 * @desc Get all platform integrations (Super Admin only)
 * @access Super Admin
 */
router.get('/',
  platformRateLimit,
  requireRole(['super_admin']),
  async (req: Request, res: Response) => {
    try {
      const { data, error } = await supabase
        .from('platform_integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching platform integrations:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch platform integrations'
        });
      }

      res.json({
        success: true,
        data: data || []
      });
    } catch (error) {
      logger.error('Error in GET /platform-integrations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @route POST /api/platform-integrations/configure
 * @desc Configure platform integration OAuth2 credentials (Super Admin only)
 * @access Super Admin
 */
router.post('/configure',
  platformRateLimit,
  requireRole(['super_admin']),
  async (req: Request, res: Response) => {
    try {
      const {
        provider,
        integration_name,
        client_id,
        client_secret,
        redirect_uri,
        scopes
      } = req.body;

      const user = (req as any).user;

      // Validate required fields
      if (!provider || !integration_name || !client_id || !client_secret) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: provider, integration_name, client_id, client_secret'
        });
      }

      // Call the configure function
      const { data, error } = await supabase
        .rpc('configure_platform_integration', {
          p_provider: provider,
          p_integration_name: integration_name,
          p_client_id: client_id,
          p_client_secret: client_secret,
          p_redirect_uri: redirect_uri || null,
          p_scopes: scopes || ['https://www.googleapis.com/auth/calendar'],
          p_configured_by: user.id
        });

      if (error) {
        logger.error('Error configuring platform integration:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to configure platform integration'
        });
      }

      res.json({
        success: true,
        data: { integration_id: data },
        message: `${integration_name} configured successfully`
      });
    } catch (error) {
      logger.error('Error in POST /platform-integrations/configure:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/platform-integrations/stats
 * @desc Get platform integration usage statistics (Super Admin only)
 * @access Super Admin
 */
router.get('/stats',
  platformRateLimit,
  requireRole(['super_admin']),
  async (req: Request, res: Response) => {
    try {
      const { data: platformStats, error: platformError } = await supabase
        .from('platform_integrations')
        .select(`
          id,
          provider,
          integration_name,
          is_active,
          total_tenants_enabled,
          total_users_connected,
          created_at,
          last_configured_at
        `);

      if (platformError) {
        logger.error('Error fetching platform stats:', platformError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch platform statistics'
        });
      }

      // Get tenant-level statistics
      const { data: tenantStats, error: tenantError } = await supabase
        .from('tenant_integrations')
        .select(`
          platform_integration_id,
          tenant_id,
          is_enabled,
          total_users_connected,
          total_events_synced,
          enabled_at
        `)
        .eq('is_enabled', true);

      if (tenantError) {
        logger.error('Error fetching tenant stats:', tenantError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch tenant statistics'
        });
      }

      // Combine statistics
      const combinedStats = (platformStats || []).map(platform => ({
        ...platform,
        tenant_breakdown: (tenantStats || [])
          .filter(tenant => tenant.platform_integration_id === platform.id)
          .map(tenant => ({
            tenant_id: tenant.tenant_id,
            users_connected: tenant.total_users_connected,
            events_synced: tenant.total_events_synced,
            enabled_at: tenant.enabled_at
          }))
      }));

      res.json({
        success: true,
        data: combinedStats
      });
    } catch (error) {
      logger.error('Error in GET /platform-integrations/stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// ✅ CORREÇÃO: Rota duplicada removida - implementação mais completa mantida abaixo

// =====================================================
// ADMIN ROUTES - TENANT INTEGRATIONS
// =====================================================

/**
 * @route GET /api/platform-integrations/tenant/available
 * @desc Get available platform integrations for tenant (Admin only)
 * @access Admin, Super Admin
 */
router.get('/tenant/available',
  platformRateLimit,
  requireRole(['admin', 'super_admin']),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const tenantId = user.company_id;

      // Get available platform integrations
      const { data: platformIntegrations, error: platformError } = await supabase
        .from('platform_integrations')
        .select('id, provider, integration_name, description, is_active, is_beta')
        .eq('is_active', true);

      if (platformError) {
        logger.error('Error fetching available integrations:', platformError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch available integrations'
        });
      }

      // Get tenant's current integrations
      const { data: tenantIntegrations, error: tenantError } = await supabase
        .from('tenant_integrations')
        .select('platform_integration_id, is_enabled, enabled_at, usage_policy')
        .eq('tenant_id', tenantId);

      if (tenantError) {
        logger.error('Error fetching tenant integrations:', tenantError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch tenant integrations'
        });
      }

      // Combine data
      const availableIntegrations = (platformIntegrations || []).map(platform => {
        const tenantIntegration = (tenantIntegrations || [])
          .find(tenant => tenant.platform_integration_id === platform.id);

        return {
          ...platform,
          is_enabled_for_tenant: tenantIntegration?.is_enabled || false,
          enabled_at: tenantIntegration?.enabled_at || null,
          usage_policy: tenantIntegration?.usage_policy || null
        };
      });

      res.json({
        success: true,
        data: availableIntegrations
      });
    } catch (error) {
      logger.error('Error in GET /tenant/available:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @route POST /api/platform-integrations/tenant/enable
 * @desc Enable integration for tenant (Admin only)
 * @access Admin, Super Admin
 */
router.post('/tenant/enable',
  platformRateLimit,
  requireRole(['admin', 'super_admin']),
  async (req: Request, res: Response) => {
    try {
      const { provider, usage_policy } = req.body;
      const user = (req as any).user;
      const tenantId = user.company_id;

      if (!provider) {
        return res.status(400).json({
          success: false,
          error: 'Provider is required'
        });
      }

      // Default usage policy
      const defaultUsagePolicy = {
        allowed_roles: ['admin', 'member'],
        max_connections_per_user: 5,
        auto_sync_enabled: true,
        require_approval: false,
        ...usage_policy
      };

      // Call the enable function
      const { data, error } = await supabase
        .rpc('enable_tenant_integration', {
          p_tenant_id: tenantId,
          p_provider: provider,
          p_usage_policy: defaultUsagePolicy,
          p_enabled_by: user.id
        });

      if (error) {
        logger.error('Error enabling tenant integration:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to enable integration for tenant'
        });
      }

      res.json({
        success: true,
        data: { tenant_integration_id: data },
        message: `${provider} integration enabled for your company`
      });
    } catch (error) {
      logger.error('Error in POST /tenant/enable:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @route POST /api/platform-integrations/tenant/disable
 * @desc Disable integration for tenant (Admin only)
 * @access Admin, Super Admin
 */
router.post('/tenant/disable',
  platformRateLimit,
  requireRole(['admin', 'super_admin']),
  async (req: Request, res: Response) => {
    try {
      const { provider } = req.body;
      const user = (req as any).user;
      const tenantId = user.company_id;

      if (!provider) {
        return res.status(400).json({
          success: false,
          error: 'Provider is required'
        });
      }

      // Get platform integration ID
      const { data: platformIntegration, error: platformError } = await supabase
        .from('platform_integrations')
        .select('id')
        .eq('provider', provider)
        .single();

      if (platformError || !platformIntegration) {
        return res.status(404).json({
          success: false,
          error: 'Integration not found'
        });
      }

      // Disable the integration
      const { error: updateError } = await supabase
        .from('tenant_integrations')
        .update({
          is_enabled: false,
          disabled_at: new Date().toISOString(),
          last_modified_by: user.id
        })
        .eq('tenant_id', tenantId)
        .eq('platform_integration_id', platformIntegration.id);

      if (updateError) {
        logger.error('Error disabling tenant integration:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to disable integration'
        });
      }

      res.json({
        success: true,
        message: `${provider} integration disabled for your company`
      });
    } catch (error) {
      logger.error('Error in POST /tenant/disable:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/platform-integrations/credentials/:provider
 * @desc Get OAuth2 credentials for a provider (Admin/Member only)
 * @access Admin, Member
 */
router.get('/credentials/:provider',
  platformRateLimit,
  requireRole(['admin', 'member']),
  async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const user = (req as any).user;
      const tenantId = user.company_id;

      // Verificar se a integração está habilitada para o tenant
      const { data: tenantIntegration, error: tenantError } = await supabase
        .from('tenant_integrations')
        .select(`
          is_enabled,
          platform_integrations!inner(
            client_id,
            redirect_uri,
            scopes,
            is_active
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('platform_integrations.provider', provider)
        .eq('platform_integrations.is_active', true)
        .single();

      if (tenantError || !tenantIntegration) {
        // 🆕 FALLBACK PARA MODO DEMO - Buscar credenciais da plataforma diretamente
        logger.info(`Tenant integration not found for ${provider}, trying platform credentials`);
        
        const { data: platformIntegration, error: platformError } = await supabase
          .from('platform_integrations')
          .select('client_id, redirect_uri, scopes, is_active')
          .eq('provider', provider)
          .eq('is_active', true)
          .single();

        if (platformError || !platformIntegration) {
          return res.status(404).json({
            success: false,
            error: `${provider} integration not configured on platform`
          });
        }

        // Retornar credenciais da plataforma (modo demo)
        return res.json({
          success: true,
          client_id: platformIntegration.client_id,
          redirect_uri: platformIntegration.redirect_uri,
          scopes: platformIntegration.scopes,
          provider: provider,
          mode: 'demo'
        });
      }

      if (!tenantIntegration.is_enabled) {
        return res.status(403).json({
          success: false,
          error: `${provider} integration not enabled for your company. Contact your administrator.`
        });
      }

      const platformIntegration = Array.isArray(tenantIntegration.platform_integrations) 
        ? tenantIntegration.platform_integrations[0] 
        : tenantIntegration.platform_integrations;

      // Retornar apenas dados seguros (sem client_secret)
      res.json({
        success: true,
        client_id: platformIntegration.client_id,
        redirect_uri: platformIntegration.redirect_uri,
        scopes: platformIntegration.scopes,
        provider: provider
      });
    } catch (error) {
      logger.error(`Error in GET /credentials/${req.params.provider}:`, error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// =====================================================
// USER CONNECTION ROUTES (ADMIN/MEMBER)
// =====================================================

/**
 * @route POST /api/platform-integrations/connect
 * @desc Connect user's personal account to integration
 * @access Admin, Member
 */
router.post('/connect',
  platformRateLimit,
  requireRole(['admin', 'member']),
  async (req: Request, res: Response) => {
    try {
      const {
        provider,
        provider_user_id,
        access_token,
        refresh_token,
        calendar_data
      } = req.body;

      const user = (req as any).user;
      const tenantId = user.company_id;

      if (!provider || !provider_user_id || !access_token) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: provider, provider_user_id, access_token'
        });
      }

      // Call the connect function
      const { data, error } = await supabase
        .rpc('connect_user_calendar', {
          p_tenant_id: tenantId,
          p_user_id: user.id,
          p_provider: provider,
          p_provider_user_id: provider_user_id,
          p_access_token: access_token,
          p_refresh_token: refresh_token || null,
          p_calendar_data: calendar_data || {}
        });

      if (error) {
        logger.error('Error connecting user calendar:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to connect calendar integration'
        });
      }

      res.json({
        success: true,
        data: { calendar_integration_id: data },
        message: `${provider} calendar connected successfully`
      });
    } catch (error) {
      logger.error('Error in POST /connect:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/platform-integrations/my-connections
 * @desc Get user's personal calendar connections
 * @access Admin, Member
 */
router.get('/my-connections',
  platformRateLimit,
  requireRole(['admin', 'member']),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const tenantId = user.company_id;

      const { data, error } = await supabase
        .from('calendar_integrations')
        .select(`
          id,
          provider,
          provider_user_id,
          calendar_id,
          calendar_name,
          sync_enabled,
          sync_status,
          last_sync_at,
          created_at,
          connection_source
        `)
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching user connections:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch calendar connections'
        });
      }

      res.json({
        success: true,
        data: data || []
      });
    } catch (error) {
      logger.error('Error in GET /my-connections:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

export default router; 
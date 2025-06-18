import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * Verificar se o sistema está configurado
 */
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Verificar se existe pelo menos um super_admin
    const { data: superAdmins, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'super_admin')
      .eq('is_active', true)
      .limit(1);

    const isSetup = !error && superAdmins && superAdmins.length > 0;

    res.json({
      success: true,
      data: {
        isSetup: isSetup,
        needsInitialSetup: !isSetup
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar status do setup',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}));

/**
 * Listar informações do sistema
 */
router.get('/info', asyncHandler(async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        name: 'CRM Marketing System',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        features: [
          'JWT Authentication',
          'Role-based Access Control',
          'Pipeline Management',
          'Lead Management',
          'Customer Management',
          'Sales Goals Tracking',
          'Integration Ready'
        ],
        endpoints: {
          auth: '/api/auth/*',
          users: '/api/users/*',
          customers: '/api/customers/*',
          pipelines: '/api/pipelines/*',
          leads: '/api/leads/*',
          health: '/health'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao obter informações do sistema'
    });
  }
}));

export default router; 
import { Router, Request, Response } from 'express'
import { supabase } from '../config/supabase'

const router = Router()

/**
 * Health check básico
 */
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now()
  
  try {
    // Testar conexão com banco de dados
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    const dbStatus = !error ? 'healthy' : 'error'
    const responseTime = Date.now() - startTime

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      database: {
        status: dbStatus,
        error: error?.message || null
      },
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    })

  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed'
    })
  }
})

/**
 * Health check detalhado (para monitoramento interno)
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now()
  
  try {
    const checks = {
      database: { status: 'unknown', responseTime: 0, error: null },
      memory: { status: 'ok', usage: process.memoryUsage() },
      env: { status: 'ok', variables: {} }
    }

    // Teste de banco de dados
    const dbStart = Date.now()
    try {
      const { error } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      checks.database = {
        status: error ? 'error' : 'healthy',
        responseTime: Date.now() - dbStart,
        error: error?.message || null
      } as any
    } catch (dbError) {
      checks.database = {
        status: 'error',
        responseTime: Date.now() - dbStart,
        error: dbError instanceof Error ? dbError.message : 'Database connection failed'
      } as any
    }

    // Verificar variáveis de ambiente críticas
    const requiredEnvVars = [
      'SUPABASE_URL',
      'JWT_SECRET'
    ]

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    checks.env = {
      status: missingEnvVars.length === 0 ? 'ok' : 'warning',
      variables: {
        missing: missingEnvVars,
        nodeEnv: process.env.NODE_ENV || 'not_set'
      }
    }

    const overallStatus = Object.values(checks).every(check => 
      check.status === 'ok' || check.status === 'healthy'
    ) ? 'healthy' : 'degraded'

    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      totalResponseTime: `${Date.now() - startTime}ms`,
      checks: checks,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid
      }
    })

  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Detailed health check failed'
    })
  }
})

export default router 
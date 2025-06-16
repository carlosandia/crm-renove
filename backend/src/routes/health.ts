import { Router, Request, Response } from 'express'
import { supabase } from '../index'

const router = Router()

// GET /api/health
router.get('/', async (req: Request, res: Response) => {
  try {
    // Testar conexão com Supabase
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    const supabaseStatus = error ? 'error' : 'ok'

    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: supabaseStatus,
        api: 'ok'
      },
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    })
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

export default router 
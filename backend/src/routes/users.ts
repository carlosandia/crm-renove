import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// GET /api/users
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role, tenant_id } = req.query

    let query = supabase
      .from('users')
      .select('*')
      .eq('is_active', true)

    if (role) {
      query = query.eq('role', role)
    }

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }

    const { data: users, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return res.json({ users })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao buscar usuários',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

// POST /api/users
router.post('/', async (req: Request, res: Response) => {
  try {
    const userData = req.body
    
    const { data: user, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single()

    if (error) {
      throw error
    }

    return res.status(201).json({
      message: 'Usuário criado com sucesso',
      user 
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao criar usuário',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

// PUT /api/users/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userData = req.body
    
    const { data: user, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return res.json({
      message: 'Usuário atualizado com sucesso',
      user 
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao atualizar usuário',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

// DELETE /api/users/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      throw error
    }

    return res.json({
      message: 'Usuário desativado com sucesso'
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao desativar usuário',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

export default router

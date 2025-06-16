import { Router, Request, Response } from 'express'
import { supabase } from '../index'

const router = Router()

// GET /api/vendedores
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenant_id } = req.query

    let query = supabase
      .from('users')
      .select('*')
      .eq('role', 'member')
      .eq('is_active', true)

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }

    const { data: vendedores, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return res.json({ vendedores })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao buscar vendedores',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

// POST /api/vendedores
router.post('/', async (req: Request, res: Response) => {
  try {
    const vendedorData = {
      ...req.body,
      role: 'member', // Garantir que seja member
      is_active: true
    }
    
    const { data: vendedor, error } = await supabase
      .from('users')
      .insert([vendedorData])
      .select()
      .single()

    if (error) {
      throw error
    }

    return res.status(201).json({
      message: 'Vendedor criado com sucesso',
      vendedor 
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao criar vendedor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

// PUT /api/vendedores/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const vendedorData = req.body
    
    const { data: vendedor, error } = await supabase
      .from('users')
      .update(vendedorData)
      .eq('id', id)
      .eq('role', 'member')
      .select()
      .single()

    if (error) {
      throw error
    }

    return res.json({
      message: 'Vendedor atualizado com sucesso',
      vendedor 
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao atualizar vendedor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

// DELETE /api/vendedores/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id)
      .eq('role', 'member')

    if (error) {
      throw error
    }

    return res.json({
      message: 'Vendedor desativado com sucesso'
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao desativar vendedor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

export default router
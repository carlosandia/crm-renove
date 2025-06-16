import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const tenant_id = searchParams.get('tenant_id')

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

    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erro ao buscar usuários',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()
    
    const { data: user, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      message: 'Usuário criado com sucesso',
      user 
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erro ao criar usuário',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenant_id = searchParams.get('tenant_id')

    let query = supabase
      .from('users')
      .select('*')
      .eq('role', 'member')

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }

    const { data: vendedores, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ vendedores })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erro ao buscar vendedores',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { first_name, last_name, email, tenant_id } = await request.json()

    if (!first_name || !last_name || !email || !tenant_id) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já está em uso' },
        { status: 400 }
      )
    }

    // Criar vendedor
    const { data: vendedor, error } = await supabase
      .from('users')
      .insert([{
        first_name,
        last_name,
        email,
        role: 'member',
        tenant_id,
        is_active: true
      }])
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      message: 'Vendedor criado com sucesso',
      vendedor 
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erro ao criar vendedor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 
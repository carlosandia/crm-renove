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
      .from('companies')
      .select('*')

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }

    const { data: customers, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ customers })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erro ao buscar clientes',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const customerData = await request.json()
    
    const { data: customer, error } = await supabase
      .from('companies')
      .insert([customerData])
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      message: 'Cliente criado com sucesso',
      customer 
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erro ao criar cliente',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 
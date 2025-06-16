import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Credenciais demo para desenvolvimento
const DEMO_CREDENTIALS = {
  'superadmin@crm.com': 'SuperAdmin123!',
  'admin@crm.com': '123456',
  'member@crm.com': '123456',
  'carlos@renovedigital.com.br': '123456',
  'felipe@felipe.com': '123456'
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se é uma credencial demo
    if (DEMO_CREDENTIALS[email as keyof typeof DEMO_CREDENTIALS] === password) {
      // Buscar usuário na tabela
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single()

      if (userError || !userData) {
        return NextResponse.json(
          { error: 'Usuário não encontrado na base de dados' },
          { status: 401 }
        )
      }

      return NextResponse.json({
        message: 'Login realizado com sucesso',
        user: {
          id: userData.id,
          email: userData.email
        },
        session: { access_token: 'demo_token' },
        userData: userData,
        redirect: '/app'
      })
    }

    // Tentar autenticação normal do Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return NextResponse.json(
        { error: 'Credenciais inválidas', details: error.message },
        { status: 401 }
      )
    }

    // Buscar dados do usuário na tabela única
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single()

    return NextResponse.json({
      message: 'Login realizado com sucesso',
      user: data.user,
      session: data.session,
      userData: userData,
      redirect: '/app'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 
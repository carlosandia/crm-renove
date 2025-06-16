import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  try {
    // Testar conexão com Supabase
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        supabase: error ? 'Error' : 'Connected',
        mcp: 'Active',
        nextjs: 'Running'
      },
      uptime: process.uptime()
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'Error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 
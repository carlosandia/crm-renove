import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'MCP Integration ativa',
    status: 'OK',
    timestamp: new Date().toISOString(),
    tools: [
      'get_users',
      'create_user', 
      'get_companies',
      'create_company',
      'get_leads',
      'create_lead',
      'execute_query',
      'get_dashboard_stats'
    ]
  })
}

export async function POST(request: NextRequest) {
  try {
    const { tool, params } = await request.json()
    
    // Aqui você pode implementar a lógica do MCP
    // Por enquanto, retornando uma resposta básica
    
    return NextResponse.json({
      message: `MCP tool ${tool} executada`,
      params,
      result: 'Sucesso',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erro na integração MCP',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 
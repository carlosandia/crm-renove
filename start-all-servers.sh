#!/bin/bash

# Script para iniciar todos os servidores do CRM-MARKETING
# Node.js Backend + React Frontend + MCP Server

echo "🚀 INICIANDO SISTEMA CRM-MARKETING COMPLETO"
echo "==========================================="

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "📝 Criando arquivo .env com as credenciais do Supabase..."
    
    cat > .env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://marajvabdwkpgopytvhh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU

# Development
NODE_ENV=development
PORT_BACKEND=5000
PORT_FRONTEND=5173
EOF
    echo "✅ Arquivo .env criado com sucesso!"
fi

# Função para verificar se uma porta está em uso
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Porta $1 já está em uso"
        return 1
    else
        return 0
    fi
}

# Verificar portas
echo "🔍 Verificando portas disponíveis..."
check_port 5000 || echo "   Backend pode ter conflito na porta 5000"
check_port 5173 || echo "   Frontend pode ter conflito na porta 5173"

# Testar conexão com Supabase
echo "🧪 Testando conexão com Supabase..."
if node test-supabase-connection.js; then
    echo "✅ Conexão com Supabase OK!"
else
    echo "❌ Erro na conexão com Supabase!"
    exit 1
fi

# Testar MCP Server
echo "🤖 Testando MCP Server..."
if npm run test-mcp >/dev/null 2>&1; then
    echo "✅ MCP Server OK!"
else
    echo "❌ Erro no MCP Server!"
    exit 1
fi

echo ""
echo "🎯 INICIANDO SERVIDORES..."
echo "=========================="
echo "🔧 Backend:  http://localhost:5000"
echo "⚛️  Frontend: http://localhost:5173"
echo "🤖 MCP Server: Rodando em background"
echo ""
echo "📋 Para parar todos os servidores: Ctrl+C"
echo "🔄 Para reiniciar: ./start-all-servers.sh"
echo ""

# Iniciar todos os servidores
npm run dev 
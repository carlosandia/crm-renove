#!/bin/bash

echo "🚀 Iniciando Sistema CRM Completo com MCP"
echo "========================================"

# Verificar se os diretórios existem
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Erro: Diretórios backend ou frontend não encontrados"
    exit 1
fi

# Função para parar todos os processos ao receber Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Parando todos os serviços..."
    kill $(jobs -p) 2>/dev/null
    wait
    echo "✅ Todos os serviços foram parados"
    exit 0
}

# Capturar Ctrl+C
trap cleanup SIGINT

echo "📦 Verificando dependências..."

# Verificar e instalar dependências do backend
echo "🔧 Backend..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "📥 Instalando dependências do backend..."
    npm install
fi

# Verificar se o build existe
if [ ! -d "dist" ]; then
    echo "🔨 Compilando backend..."
    npm run build
fi

cd ..

# Verificar e instalar dependências do frontend
echo "🎨 Frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📥 Instalando dependências do frontend..."
    npm install
fi
cd ..

# Verificar dependências principais
echo "🛠️ Projeto principal..."
if [ ! -d "node_modules" ]; then
    echo "📥 Instalando dependências principais..."
    npm install
fi

echo ""
echo "🚀 Iniciando serviços..."
echo ""

# Iniciar MCP Server em background
echo "🔌 Iniciando MCP Server..."
npm run mcp-start &
MCP_PID=$!
sleep 2

# Iniciar Backend em background
echo "⚙️ Iniciando Backend (Node.js)..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..
sleep 3

# Iniciar Frontend em background
echo "🎨 Iniciando Frontend (React)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..
sleep 3

echo ""
echo "✅ Sistema CRM com MCP iniciado com sucesso!"
echo ""
echo "📋 Serviços ativos:"
echo "   🔌 MCP Server: Rodando em background"
echo "   ⚙️ Backend API: http://localhost:5001"
echo "   🎨 Frontend: http://localhost:5173"
echo "   🛠️ MCP Integration: http://localhost:5001/api/mcp"
echo ""
echo "📖 Para testar o sistema:"
echo "   1. Abra: http://localhost:5173 (Frontend)"
echo "   2. Teste API: http://localhost:5001/api/mcp/status"
echo "   3. Verifique MCP: npm run test-mcp-tools"
echo ""
echo "💡 Comandos úteis:"
echo "   - npm run verify-all (testa tudo)"
echo "   - npm run test-mcp-tools (testa MCP)"
echo "   - npm run test-connection (testa Supabase)"
echo ""
echo "🛑 Pressione Ctrl+C para parar todos os serviços"
echo ""

# Aguardar processos em background
wait 
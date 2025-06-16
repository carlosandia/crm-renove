#!/bin/bash

echo "🚀 Iniciando MCP Server para CRM-Marketing..."

# Carregar variáveis de ambiente
if [ -f .env ]; then
    echo "✅ Carregando arquivo .env"
    export $(cat .env | xargs)
else
    echo "⚠️ Arquivo .env não encontrado"
fi

# Verificar se o Node.js está disponível
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado"
    exit 1
fi

# Verificar se o arquivo do servidor existe
if [ ! -f "supabase-mcp-server.js" ]; then
    echo "❌ Arquivo supabase-mcp-server.js não encontrado"
    exit 1
fi

echo "✅ Iniciando servidor MCP..."
node supabase-mcp-server.js 
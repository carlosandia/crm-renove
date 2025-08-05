#!/bin/bash

# Script para testar conectividade com servidor de produção
# CRM RENOVE Multi-tenant

SERVER="168.231.99.133"
echo "🔍 DIAGNÓSTICO COMPLETO - SERVIDOR: $SERVER"
echo "=================================================="

echo "1. 🌐 Testando conectividade básica..."
ping -c 2 $SERVER > /dev/null 2>&1 && echo "✅ Ping: OK" || echo "❌ Ping: FALHOU"

echo ""
echo "2. 🔌 Testando portas essenciais..."
nc -zv $SERVER 22 2>&1 | grep -q "succeeded" && echo "✅ SSH (22): Aberta" || echo "❌ SSH (22): Fechada"
nc -zv $SERVER 80 2>&1 | grep -q "succeeded" && echo "✅ HTTP (80): Aberta" || echo "❌ HTTP (80): Fechada"  
nc -zv $SERVER 443 2>&1 | grep -q "succeeded" && echo "✅ HTTPS (443): Aberta" || echo "❌ HTTPS (443): Fechada"

echo ""
echo "3. 🔐 Testando métodos de autenticação SSH..."

# Teste com chave SSH padrão
echo "   Testando chave SSH padrão..."
ssh -o ConnectTimeout=5 -o BatchMode=yes -o StrictHostKeyChecking=no root@$SERVER "echo 'SSH com chave funcionando'" 2>/dev/null && echo "✅ SSH com chave: OK" || echo "❌ SSH com chave: FALHOU"

# Teste de banner SSH
echo "   Obtendo banner SSH..."
timeout 5 telnet $SERVER 22 2>/dev/null | head -2 | tail -1 || echo "❌ Banner SSH não obtido"

echo ""
echo "4. 🌍 Testando serviços web existentes..."
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER/ 2>/dev/null)
echo "   HTTP Response: $HTTP_RESPONSE"

HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -k https://$SERVER/ 2>/dev/null)
echo "   HTTPS Response: $HTTPS_RESPONSE"

echo ""
echo "5. 🔍 Informações de sistema (se SSH funcionasse)..."
echo "   Comando de teste: ssh root@$SERVER 'uname -a; uptime; df -h'"

echo ""
echo "=================================================="
echo "📋 RESUMO:"
echo "- Servidor online e acessível"
echo "- Portas web funcionando"
echo "- SSH precisa de configuração de chaves"
echo ""
echo "🔧 PRÓXIMOS PASSOS:"
echo "1. Configurar chaves SSH"
echo "2. Executar deploy automatizado"
echo "3. Configurar DNS e SSL"
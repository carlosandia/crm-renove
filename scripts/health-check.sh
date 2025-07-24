#!/bin/bash

# ============================================
# 🩺 HEALTH CHECK - Monitoramento de Serviços
# ============================================

set -e

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

FRONTEND_PORT=8080
BACKEND_PORT=3001

check_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ $service_name: OK${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name: FAIL (HTTP $response)${NC}"
        return 1
    fi
}

echo "🩺 Health Check - $(date)"
echo "=================================="

# Check Backend
check_service "Backend API" "http://127.0.0.1:$BACKEND_PORT/health"
backend_status=$?

# Check Frontend
check_service "Frontend" "http://127.0.0.1:$FRONTEND_PORT" "200"
frontend_status=$?

echo "=================================="

if [ $backend_status -eq 0 ] && [ $frontend_status -eq 0 ]; then
    echo -e "${GREEN}🎉 Todos os serviços estão funcionando!${NC}"
    exit 0
else
    echo -e "${RED}⚠️ Alguns serviços estão com problemas${NC}"
    exit 1
fi
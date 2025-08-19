#!/bin/bash

# ============================================
# 🏥 DEV HEALTHCHECK - Verificação de Saúde do Sistema
# ============================================
# 
# ✅ ESTABILIZAÇÃO: Script para verificação rápida de saúde
# Verifica status dos serviços, recursos e dependências
# Ideal para integração contínua e monitoramento
#
# Uso: ./scripts/dev-healthcheck.sh [--verbose] [--json]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configurações
FRONTEND_PORT=8080
BACKEND_PORT=3001
PROJECT_ROOT="/Users/carlosandia/CRM-MARKETING"

# Flags de comando
VERBOSE=false
JSON_OUTPUT=false

# Parse argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --json|-j)
            JSON_OUTPUT=true
            shift
            ;;
        *)
            echo "Uso: $0 [--verbose] [--json]"
            exit 1
            ;;
    esac
done

# Função para logging baseado no modo
log() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
    fi
}

success() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${GREEN}[✅]${NC} $1"
    fi
}

error() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${RED}[❌]${NC} $1"
    fi
}

warn() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${YELLOW}[⚠️]${NC} $1"
    fi
}

# Variáveis para JSON output
JSON_RESULTS="{}"

# Função para adicionar resultado ao JSON
add_json_result() {
    local key="$1"
    local status="$2"
    local message="$3"
    local details="$4"
    
    if [ "$JSON_OUTPUT" = true ]; then
        if [ -z "$details" ]; then
            details="{}"
        fi
        JSON_RESULTS=$(echo "$JSON_RESULTS" | jq --arg key "$key" --arg status "$status" --arg message "$message" --argjson details "$details" '.[$key] = {status: $status, message: $message, details: $details}')
    fi
}

# ✅ VERIFICAÇÃO 1: Status dos serviços HTTP
check_services() {
    if [ "$VERBOSE" = true ] || [ "$JSON_OUTPUT" = false ]; then
        log "🔍 Verificando serviços HTTP..."
    fi
    
    local frontend_status="offline"
    local backend_status="offline"
    local frontend_response_time=0
    local backend_response_time=0
    
    # Verificar frontend
    local start_time=$(date +%s%N)
    if curl -s --max-time 5 "http://127.0.0.1:$FRONTEND_PORT" >/dev/null 2>&1; then
        local end_time=$(date +%s%N)
        frontend_response_time=$(( (end_time - start_time) / 1000000 ))
        frontend_status="online"
        success "Frontend: ONLINE (${frontend_response_time}ms)"
    else
        error "Frontend: OFFLINE"
    fi
    
    # Verificar backend
    start_time=$(date +%s%N)
    if curl -s --max-time 5 "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1; then
        local end_time=$(date +%s%N)
        backend_response_time=$(( (end_time - start_time) / 1000000 ))
        backend_status="online"
        success "Backend: ONLINE (${backend_response_time}ms)"
    else
        error "Backend: OFFLINE"
    fi
    
    # Adicionar ao JSON
    add_json_result "services" "$([ "$frontend_status" = "online" ] && [ "$backend_status" = "online" ] && echo "healthy" || echo "unhealthy")" \
        "Frontend: $frontend_status, Backend: $backend_status" \
        "{\"frontend\": {\"status\": \"$frontend_status\", \"response_time_ms\": $frontend_response_time}, \"backend\": {\"status\": \"$backend_status\", \"response_time_ms\": $backend_response_time}}"
    
    return $([ "$frontend_status" = "online" ] && [ "$backend_status" = "online" ] && echo 0 || echo 1)
}

# ✅ VERIFICAÇÃO 2: Recursos do sistema
check_system_resources() {
    if [ "$VERBOSE" = true ] || [ "$JSON_OUTPUT" = false ]; then
        log "🖥️  Verificando recursos do sistema..."
    fi
    
    # Obter informações do sistema
    local total_memory_gb=$(echo "scale=1; $(sysctl -n hw.memsize) / 1024 / 1024 / 1024" | bc -l)
    local cpu_count=$(sysctl -n hw.ncpu)
    local load_avg=$(uptime | awk -F'load averages:' '{print $2}' | awk '{print $1}' | tr -d ',')
    
    # Verificar se Node.js está instalado e versão
    local node_version=""
    local node_status="missing"
    if command -v node >/dev/null 2>&1; then
        node_version=$(node --version)
        node_status="available"
        success "Node.js: $node_version"
    else
        error "Node.js: NÃO INSTALADO"
    fi
    
    # Verificar NPM
    local npm_version=""
    local npm_status="missing"
    if command -v npm >/dev/null 2>&1; then
        npm_version=$(npm --version)
        npm_status="available"
        success "NPM: v$npm_version"
    else
        error "NPM: NÃO INSTALADO"
    fi
    
    # Status geral dos recursos
    local resource_status="healthy"
    if [ "$node_status" = "missing" ] || [ "$npm_status" = "missing" ]; then
        resource_status="unhealthy"
    fi
    
    if [ "$VERBOSE" = true ] || [ "$JSON_OUTPUT" = false ]; then
        log "Memória total: ${total_memory_gb}GB"
        log "CPUs: $cpu_count"
        log "Load average: $load_avg"
    fi
    
    # Adicionar ao JSON
    add_json_result "system_resources" "$resource_status" \
        "Memory: ${total_memory_gb}GB, CPUs: $cpu_count, Load: $load_avg" \
        "{\"memory_gb\": $total_memory_gb, \"cpu_count\": $cpu_count, \"load_average\": \"$load_avg\", \"node\": {\"version\": \"$node_version\", \"status\": \"$node_status\"}, \"npm\": {\"version\": \"$npm_version\", \"status\": \"$npm_status\"}}"
    
    return $([ "$resource_status" = "healthy" ] && echo 0 || echo 1)
}

# ✅ VERIFICAÇÃO 3: Dependências do projeto
check_project_dependencies() {
    if [ "$VERBOSE" = true ] || [ "$JSON_OUTPUT" = false ]; then
        log "📦 Verificando dependências do projeto..."
    fi
    
    local frontend_deps_status="unknown"
    local backend_deps_status="unknown"
    
    # Verificar node_modules do frontend
    if [ -d "$PROJECT_ROOT/node_modules" ]; then
        frontend_deps_status="installed"
        success "Frontend: node_modules presente"
    else
        frontend_deps_status="missing"
        error "Frontend: node_modules ausente"
    fi
    
    # Verificar node_modules do backend
    if [ -d "$PROJECT_ROOT/backend/node_modules" ]; then
        backend_deps_status="installed"
        success "Backend: node_modules presente"
    else
        backend_deps_status="missing"
        error "Backend: node_modules ausente"
    fi
    
    # Verificar arquivos críticos
    local critical_files_status="complete"
    local missing_files=()
    
    local critical_files=(
        "package.json"
        "vite.config.ts"
        "backend/package.json"
        "backend/src/index.ts"
    )
    
    for file in "${critical_files[@]}"; do
        if [ ! -f "$PROJECT_ROOT/$file" ]; then
            missing_files+=("$file")
            critical_files_status="incomplete"
            error "Arquivo crítico ausente: $file"
        elif [ "$VERBOSE" = true ]; then
            success "Arquivo presente: $file"
        fi
    done
    
    # Status geral das dependências
    local deps_status="healthy"
    if [ "$frontend_deps_status" = "missing" ] || [ "$backend_deps_status" = "missing" ] || [ "$critical_files_status" = "incomplete" ]; then
        deps_status="unhealthy"
    fi
    
    # Adicionar ao JSON
    add_json_result "dependencies" "$deps_status" \
        "Frontend deps: $frontend_deps_status, Backend deps: $backend_deps_status" \
        "{\"frontend_node_modules\": \"$frontend_deps_status\", \"backend_node_modules\": \"$backend_deps_status\", \"critical_files\": \"$critical_files_status\", \"missing_files\": $(printf '%s\n' "${missing_files[@]}" | jq -R . | jq -s .)}"
    
    return $([ "$deps_status" = "healthy" ] && echo 0 || echo 1)
}

# ✅ VERIFICAÇÃO 4: Portas em uso
check_port_usage() {
    if [ "$VERBOSE" = true ] || [ "$JSON_OUTPUT" = false ]; then
        log "🔌 Verificando uso de portas..."
    fi
    
    local frontend_port_status="free"
    local backend_port_status="free"
    local frontend_process=""
    local backend_process=""
    
    # Verificar porta do frontend
    local frontend_pid=$(lsof -ti:$FRONTEND_PORT 2>/dev/null || echo "")
    if [ -n "$frontend_pid" ]; then
        frontend_port_status="occupied"
        frontend_process=$(ps -p "$frontend_pid" -o comm= 2>/dev/null || echo "unknown")
        if [ "$VERBOSE" = true ] || [ "$JSON_OUTPUT" = false ]; then
            warn "Porta $FRONTEND_PORT ocupada (PID: $frontend_pid, processo: $frontend_process)"
        fi
    else
        if [ "$VERBOSE" = true ]; then
            success "Porta $FRONTEND_PORT livre"
        fi
    fi
    
    # Verificar porta do backend
    local backend_pid=$(lsof -ti:$BACKEND_PORT 2>/dev/null || echo "")
    if [ -n "$backend_pid" ]; then
        backend_port_status="occupied"
        backend_process=$(ps -p "$backend_pid" -o comm= 2>/dev/null || echo "unknown")
        if [ "$VERBOSE" = true ] || [ "$JSON_OUTPUT" = false ]; then
            warn "Porta $BACKEND_PORT ocupada (PID: $backend_pid, processo: $backend_process)"
        fi
    else
        if [ "$VERBOSE" = true ]; then
            success "Porta $BACKEND_PORT livre"
        fi
    fi
    
    # Adicionar ao JSON
    add_json_result "ports" "info" \
        "Frontend port: $frontend_port_status, Backend port: $backend_port_status" \
        "{\"frontend\": {\"port\": $FRONTEND_PORT, \"status\": \"$frontend_port_status\", \"process\": \"$frontend_process\"}, \"backend\": {\"port\": $BACKEND_PORT, \"status\": \"$backend_port_status\", \"process\": \"$backend_process\"}}"
}

# ✅ VERIFICAÇÃO PRINCIPAL
main() {
    local overall_status="healthy"
    local start_time=$(date +%s)
    
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${CYAN}════════════════════════════════════════${NC}"
        echo -e "${CYAN}    🏥 CRM DEVELOPMENT HEALTHCHECK     ${NC}"
        echo -e "${CYAN}    $(date +'%Y-%m-%d %H:%M:%S')         ${NC}"
        echo -e "${CYAN}════════════════════════════════════════${NC}"
    fi
    
    # Executar verificações
    if ! check_services; then
        overall_status="unhealthy"
    fi
    
    if ! check_system_resources; then
        overall_status="unhealthy"
    fi
    
    if ! check_project_dependencies; then
        overall_status="unhealthy"
    fi
    
    check_port_usage
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Resultado final
    if [ "$JSON_OUTPUT" = true ]; then
        # Output JSON
        echo "$JSON_RESULTS" | jq --arg status "$overall_status" --arg duration "$duration" --arg timestamp "$(date -Iseconds)" '. + {overall_status: $status, duration_seconds: ($duration | tonumber), timestamp: $timestamp}'
    else
        echo -e "\n${CYAN}=== RESULTADO FINAL ===${NC}"
        if [ "$overall_status" = "healthy" ]; then
            success "✅ Sistema saudável (verificação em ${duration}s)"
        else
            error "❌ Sistema com problemas (verificação em ${duration}s)"
        fi
        
        echo -e "\n💡 Para monitoramento contínuo: ./scripts/dev-manager.sh monitor"
        echo "💡 Para auto-restart: ./scripts/dev-manager.sh auto-restart"
    fi
    
    # Exit code baseado no status
    [ "$overall_status" = "healthy" ] && exit 0 || exit 1
}

# Executar verificação principal
main "$@"
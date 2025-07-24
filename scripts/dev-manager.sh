#!/bin/bash

# ============================================
# 🔧 DEV MANAGER - Gerenciador de Servidores
# ============================================
# 
# Resolve problemas de processos órfãos e EADDRINUSE
# Garante startup limpo e confiável dos servidores
#
# Uso: ./scripts/dev-manager.sh [comando]
# Comandos: start, stop, restart, clean, status, debug

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
FRONTEND_PORT=8080
BACKEND_PORT=3001
PROJECT_ROOT="/Users/carlosandia/CRM-MARKETING"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Função para logging
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Função para matar processos por porta
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ ! -z "$pids" ]; then
        log "Matando processos na porta $port: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Função para matar processos Node.js relacionados ao projeto
kill_project_processes() {
    log "Buscando processos Node.js do projeto..."
    
    # Matar processos tsx watch específicos
    pkill -f "tsx watch src/index.ts" 2>/dev/null || true
    pkill -f "vite.*development" 2>/dev/null || true
    
    # Matar processos nas portas específicas
    kill_port $FRONTEND_PORT
    kill_port $BACKEND_PORT
    
    # Matar processos Node.js órfãos no diretório do projeto
    local project_pids=$(pgrep -f "$PROJECT_ROOT" 2>/dev/null || true)
    if [ ! -z "$project_pids" ]; then
        log "Matando processos órfãos do projeto: $project_pids"
        echo "$project_pids" | xargs kill -9 2>/dev/null || true
    fi
    
    sleep 2
}

# Função para verificar se porta está livre
check_port() {
    local port=$1
    local service_name=$2
    
    if lsof -ti:$port >/dev/null 2>&1; then
        error "Porta $port ($service_name) ainda está ocupada"
        return 1
    else
        success "Porta $port ($service_name) está livre"
        return 0
    fi
}

# Função para verificar status dos serviços
check_status() {
    log "Verificando status dos serviços..."
    
    # Verificar backend
    if curl -s "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1; then
        success "Backend: ONLINE (porta $BACKEND_PORT)"
    else
        warn "Backend: OFFLINE (porta $BACKEND_PORT)"
    fi
    
    # Verificar frontend
    if curl -s "http://127.0.0.1:$FRONTEND_PORT" >/dev/null 2>&1; then
        success "Frontend: ONLINE (porta $FRONTEND_PORT)"
    else
        warn "Frontend: OFFLINE (porta $FRONTEND_PORT)"
    fi
    
    # Listar processos relacionados
    local processes=$(ps aux | grep -E "(tsx|vite)" | grep -v grep | wc -l | tr -d ' ')
    log "Processos ativos relacionados: $processes"
}

# Função para cleanup completo
cleanup() {
    log "🧹 Iniciando limpeza completa..."
    
    # Matar todos os processos relacionados
    kill_project_processes
    
    # Verificar se portas estão livres
    local attempts=0
    local max_attempts=5
    
    while [ $attempts -lt $max_attempts ]; do
        if check_port $FRONTEND_PORT "Frontend" && check_port $BACKEND_PORT "Backend"; then
            break
        fi
        
        attempts=$((attempts + 1))
        log "Tentativa $attempts de $max_attempts - aguardando portas liberarem..."
        kill_port $FRONTEND_PORT
        kill_port $BACKEND_PORT
        sleep 2
    done
    
    if [ $attempts -eq $max_attempts ]; then
        error "Não foi possível liberar as portas após $max_attempts tentativas"
        return 1
    fi
    
    success "Limpeza completa finalizada"
}

# Função para iniciar serviços
start_services() {
    log "🚀 Iniciando serviços..."
    
    # Verificar se já estão rodando
    if curl -s "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1; then
        warn "Backend já está rodando"
    else
        log "Iniciando backend..."
        cd "$BACKEND_DIR"
        nohup npm run dev > ../backend.log 2>&1 &
        log "Backend iniciado em background (PID: $!)"
        cd "$PROJECT_ROOT"
    fi
    
    if curl -s "http://127.0.0.1:$FRONTEND_PORT" >/dev/null 2>&1; then
        warn "Frontend já está rodando"
    else
        log "Iniciando frontend..."
        nohup npm run dev > frontend.log 2>&1 &
        log "Frontend iniciado em background (PID: $!)"
    fi
    
    # Aguardar serviços iniciarem
    log "Aguardando serviços iniciarem..."
    sleep 5
    
    # Verificar se inicializaram corretamente
    local backend_ready=false
    local frontend_ready=false
    local attempts=0
    local max_attempts=10
    
    while [ $attempts -lt $max_attempts ]; do
        if curl -s "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1; then
            backend_ready=true
        fi
        
        if curl -s "http://127.0.0.1:$FRONTEND_PORT" >/dev/null 2>&1; then
            frontend_ready=true
        fi
        
        if [ "$backend_ready" = true ] && [ "$frontend_ready" = true ]; then
            break
        fi
        
        attempts=$((attempts + 1))
        log "Aguardando serviços... ($attempts/$max_attempts)"
        sleep 2
    done
    
    if [ "$backend_ready" = true ] && [ "$frontend_ready" = true ]; then
        success "🎉 Todos os serviços estão ONLINE!"
        log "Backend: http://127.0.0.1:$BACKEND_PORT"
        log "Frontend: http://127.0.0.1:$FRONTEND_PORT"
    else
        error "Falha ao iniciar alguns serviços"
        check_status
        return 1
    fi
}

# Função para parar serviços
stop_services() {
    log "🛑 Parando serviços..."
    kill_project_processes
    success "Serviços parados"
}

# Função para diagnóstico
debug() {
    log "🔍 Executando diagnóstico completo..."
    
    echo -e "\n${BLUE}=== INFORMAÇÕES DO SISTEMA ===${NC}"
    echo "Node.js: $(node --version)"
    echo "NPM: $(npm --version)"
    echo "Sistema: $(uname -a)"
    
    echo -e "\n${BLUE}=== PROCESSOS RELACIONADOS ===${NC}"
    ps aux | grep -E "(tsx|vite|node)" | grep -v grep || echo "Nenhum processo encontrado"
    
    echo -e "\n${BLUE}=== PORTAS EM USO ===${NC}"
    lsof -i :$FRONTEND_PORT -i :$BACKEND_PORT || echo "Portas livres"
    
    echo -e "\n${BLUE}=== LOGS RECENTES ===${NC}"
    if [ -f "$PROJECT_ROOT/backend.log" ]; then
        echo "Backend log (últimas 5 linhas):"
        tail -5 "$PROJECT_ROOT/backend.log"
    fi
    
    if [ -f "$PROJECT_ROOT/frontend.log" ]; then
        echo "Frontend log (últimas 5 linhas):"
        tail -5 "$PROJECT_ROOT/frontend.log"
    fi
    
    echo -e "\n${BLUE}=== STATUS DOS SERVIÇOS ===${NC}"
    check_status
}

# Função principal
main() {
    local command=${1:-"start"}
    
    log "🔧 Dev Manager - Comando: $command"
    
    case $command in
        "start")
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            log "🔄 Reiniciando serviços..."
            stop_services
            sleep 2
            start_services
            ;;
        "clean")
            cleanup
            ;;
        "status")
            check_status
            ;;
        "debug")
            debug
            ;;
        *)
            echo "Uso: $0 {start|stop|restart|clean|status|debug}"
            echo ""
            echo "Comandos disponíveis:"
            echo "  start   - Inicia os serviços"
            echo "  stop    - Para os serviços"
            echo "  restart - Reinicia os serviços"
            echo "  clean   - Limpeza completa de processos"
            echo "  status  - Verifica status dos serviços"
            echo "  debug   - Diagnóstico completo"
            exit 1
            ;;
    esac
}

# Executar função principal
main "$@"
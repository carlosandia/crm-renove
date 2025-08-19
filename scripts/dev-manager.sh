#!/bin/bash

# ============================================
# 🔧 DEV MANAGER - Gerenciador de Servidores ESTABILIZADO
# ============================================
# 
# ✅ ESTABILIZAÇÃO: Versão aprimorada com monitoramento robusto
# Resolve problemas de processos órfãos e EADDRINUSE
# Garante startup limpo e confiável dos servidores
# Inclui monitoramento de recursos e auto-restart
#
# Uso: ./scripts/dev-manager.sh [comando]
# Comandos: start, stop, restart, clean, status, debug, monitor, auto-restart

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ✅ ESTABILIZAÇÃO: Configurações expandidas
FRONTEND_PORT=8080
BACKEND_PORT=3001
PROJECT_ROOT="/Users/carlosandia/CRM-MARKETING"
BACKEND_DIR="$PROJECT_ROOT/backend"

# ✅ ESTABILIZAÇÃO: Configurações de monitoramento
MEMORY_LIMIT_MB=4096        # Limite de memória em MB
CPU_LIMIT_PERCENT=80        # Limite de CPU em %
HEALTHCHECK_INTERVAL=30     # Intervalo de healthcheck em segundos
MAX_RESTART_ATTEMPTS=3      # Máximo de tentativas de restart
RESTART_COOLDOWN=10         # Cooldown entre restarts em segundos

# ✅ ESTABILIZAÇÃO: Arquivos de controle
FRONTEND_PID_FILE="$PROJECT_ROOT/.frontend.pid"
BACKEND_PID_FILE="$PROJECT_ROOT/.backend.pid"
MONITOR_LOG="$PROJECT_ROOT/monitor.log"

# ✅ ESTABILIZAÇÃO: Funções de logging aprimoradas
log() {
    local message="$1"
    local timestamp="$(date +'%Y-%m-%d %H:%M:%S')"
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $message"
    echo "[$timestamp] [INFO] $message" >> "$MONITOR_LOG"
}

error() {
    local message="$1"
    local timestamp="$(date +'%Y-%m-%d %H:%M:%S')"
    echo -e "${RED}[ERROR]${NC} $message"
    echo "[$timestamp] [ERROR] $message" >> "$MONITOR_LOG"
}

success() {
    local message="$1"
    local timestamp="$(date +'%Y-%m-%d %H:%M:%S')"
    echo -e "${GREEN}[SUCCESS]${NC} $message"
    echo "[$timestamp] [SUCCESS] $message" >> "$MONITOR_LOG"
}

warn() {
    local message="$1"
    local timestamp="$(date +'%Y-%m-%d %H:%M:%S')"
    echo -e "${YELLOW}[WARN]${NC} $message"
    echo "[$timestamp] [WARN] $message" >> "$MONITOR_LOG"
}

monitor_log() {
    local message="$1"
    local timestamp="$(date +'%Y-%m-%d %H:%M:%S')"
    echo -e "${CYAN}[MONITOR]${NC} $message"
    echo "[$timestamp] [MONITOR] $message" >> "$MONITOR_LOG"
}

# ✅ ESTABILIZAÇÃO: Função para obter uso de memória de um processo (em MB)
get_process_memory() {
    local pid=$1
    if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
        echo "0"
        return
    fi
    
    # Usar ps para obter RSS em KB, converter para MB
    local memory_kb=$(ps -p "$pid" -o rss= 2>/dev/null | tr -d ' ')
    if [ -z "$memory_kb" ]; then
        echo "0"
    else
        echo $((memory_kb / 1024))
    fi
}

# ✅ ESTABILIZAÇÃO: Função para obter uso de CPU de um processo
get_process_cpu() {
    local pid=$1
    if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
        echo "0.0"
        return
    fi
    
    # Usar ps para obter %CPU
    local cpu_usage=$(ps -p "$pid" -o pcpu= 2>/dev/null | tr -d ' ')
    if [ -z "$cpu_usage" ]; then
        echo "0.0"
    else
        echo "$cpu_usage"
    fi
}

# ✅ ESTABILIZAÇÃO: Função para salvar PID nos arquivos de controle
save_pid() {
    local service=$1
    local pid=$2
    
    case $service in
        "frontend")
            echo "$pid" > "$FRONTEND_PID_FILE"
            ;;
        "backend")
            echo "$pid" > "$BACKEND_PID_FILE"
            ;;
    esac
}

# ✅ ESTABILIZAÇÃO: Função para ler PID dos arquivos de controle
read_pid() {
    local service=$1
    local pid_file=""
    
    case $service in
        "frontend")
            pid_file="$FRONTEND_PID_FILE"
            ;;
        "backend")
            pid_file="$BACKEND_PID_FILE"
            ;;
    esac
    
    if [ -f "$pid_file" ]; then
        cat "$pid_file"
    else
        echo ""
    fi
}

# ✅ ESTABILIZAÇÃO: Função para limpar arquivos PID
clear_pid_files() {
    rm -f "$FRONTEND_PID_FILE" "$BACKEND_PID_FILE"
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

# ✅ ESTABILIZAÇÃO: Função robusta para verificar status dos serviços
check_status() {
    log "Verificando status dos serviços..."
    
    # Obter PIDs dos arquivos de controle
    local frontend_pid=$(read_pid "frontend")
    local backend_pid=$(read_pid "backend")
    
    echo -e "\n${CYAN}=== STATUS DETALHADO DOS SERVIÇOS ===${NC}"
    
    # Verificar backend
    if curl -s "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1; then
        success "Backend: ONLINE (porta $BACKEND_PORT)"
        if [ -n "$backend_pid" ] && kill -0 "$backend_pid" 2>/dev/null; then
            local backend_memory=$(get_process_memory "$backend_pid")
            local backend_cpu=$(get_process_cpu "$backend_pid")
            log "  └─ PID: $backend_pid | Memória: ${backend_memory}MB | CPU: ${backend_cpu}%"
            
            # ✅ ESTABILIZAÇÃO: Verificar limites de recursos
            if [ "$backend_memory" -gt "$MEMORY_LIMIT_MB" ]; then
                warn "  └─ ⚠️  Memória acima do limite ($backend_memory MB > $MEMORY_LIMIT_MB MB)"
            fi
            if [ "$(echo "$backend_cpu > $CPU_LIMIT_PERCENT" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
                warn "  └─ ⚠️  CPU acima do limite ($backend_cpu% > $CPU_LIMIT_PERCENT%)"
            fi
        fi
    else
        warn "Backend: OFFLINE (porta $BACKEND_PORT)"
        if [ -n "$backend_pid" ]; then
            warn "  └─ PID arquivo: $backend_pid (processo pode ter morrido)"
        fi
    fi
    
    # Verificar frontend
    if curl -s "http://127.0.0.1:$FRONTEND_PORT" >/dev/null 2>&1; then
        success "Frontend: ONLINE (porta $FRONTEND_PORT)"
        if [ -n "$frontend_pid" ] && kill -0 "$frontend_pid" 2>/dev/null; then
            local frontend_memory=$(get_process_memory "$frontend_pid")
            local frontend_cpu=$(get_process_cpu "$frontend_pid")
            log "  └─ PID: $frontend_pid | Memória: ${frontend_memory}MB | CPU: ${frontend_cpu}%"
            
            # ✅ ESTABILIZAÇÃO: Verificar limites de recursos
            if [ "$frontend_memory" -gt "$MEMORY_LIMIT_MB" ]; then
                warn "  └─ ⚠️  Memória acima do limite ($frontend_memory MB > $MEMORY_LIMIT_MB MB)"
            fi
            if [ "$(echo "$frontend_cpu > $CPU_LIMIT_PERCENT" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
                warn "  └─ ⚠️  CPU acima do limite ($frontend_cpu% > $CPU_LIMIT_PERCENT%)"
            fi
        fi
    else
        warn "Frontend: OFFLINE (porta $FRONTEND_PORT)"
        if [ -n "$frontend_pid" ]; then
            warn "  └─ PID arquivo: $frontend_pid (processo pode ter morrido)"
        fi
    fi
    
    # ✅ ESTABILIZAÇÃO: Listar processos relacionados com mais detalhes
    echo -e "\n${CYAN}=== PROCESSOS RELACIONADOS ===${NC}"
    local processes=$(ps aux | grep -E "(tsx|vite)" | grep -v grep)
    if [ -n "$processes" ]; then
        echo "$processes" | while read line; do
            log "  $line"
        done
    else
        log "Nenhum processo tsx/vite encontrado"
    fi
    
    # ✅ ESTABILIZAÇÃO: Verificar portas ocupadas
    echo -e "\n${CYAN}=== PORTAS EM USO ===${NC}"
    local port_usage=$(lsof -i :$FRONTEND_PORT -i :$BACKEND_PORT 2>/dev/null || echo "")
    if [ -n "$port_usage" ]; then
        echo "$port_usage" | while read line; do
            log "  $line"
        done
    else
        log "Portas $FRONTEND_PORT e $BACKEND_PORT estão livres"
    fi
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

# ✅ ESTABILIZAÇÃO: Função aprimorada para iniciar serviços
start_services() {
    log "🚀 Iniciando serviços com monitoramento avançado..."
    
    # Limpar arquivos PID antigos
    clear_pid_files
    
    # Verificar se já estão rodando
    if curl -s "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1; then
        warn "Backend já está rodando"
    else
        log "Iniciando backend..."
        cd "$BACKEND_DIR"
        
        # ✅ ESTABILIZAÇÃO: Usar NODE_OPTIONS do package.json para consistência
        NODE_OPTIONS="--max-old-space-size=4096 --no-warnings" nohup npm run dev > ../backend.log 2>&1 &
        local backend_pid=$!
        save_pid "backend" "$backend_pid"
        log "Backend iniciado em background (PID: $backend_pid)"
        cd "$PROJECT_ROOT"
    fi
    
    if curl -s "http://127.0.0.1:$FRONTEND_PORT" >/dev/null 2>&1; then
        warn "Frontend já está rodando"
    else
        log "Iniciando frontend..."
        
        # ✅ ESTABILIZAÇÃO: Usar NODE_OPTIONS do package.json para consistência
        NODE_OPTIONS="--max-old-space-size=4096 --no-warnings" nohup npm run dev > frontend.log 2>&1 &
        local frontend_pid=$!
        save_pid "frontend" "$frontend_pid"
        log "Frontend iniciado em background (PID: $frontend_pid)"
    fi
    
    # ✅ ESTABILIZAÇÃO: Aguardar serviços iniciarem com timeout inteligente
    log "Aguardando serviços iniciarem..."
    sleep 5
    
    # Verificar se inicializaram corretamente
    local backend_ready=false
    local frontend_ready=false
    local attempts=0
    local max_attempts=15  # ✅ ESTABILIZAÇÃO: Aumentado para 15 tentativas (30s total)
    
    while [ $attempts -lt $max_attempts ]; do
        # ✅ ESTABILIZAÇÃO: Verificar se processos ainda estão vivos antes de testar HTTP
        local backend_pid=$(read_pid "backend")
        local frontend_pid=$(read_pid "frontend")
        
        # Verificar backend
        if [ -n "$backend_pid" ] && kill -0 "$backend_pid" 2>/dev/null; then
            if curl -s "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1; then
                backend_ready=true
            fi
        else
            error "Processo backend morreu durante inicialização"
            break
        fi
        
        # Verificar frontend
        if [ -n "$frontend_pid" ] && kill -0 "$frontend_pid" 2>/dev/null; then
            if curl -s "http://127.0.0.1:$FRONTEND_PORT" >/dev/null 2>&1; then
                frontend_ready=true
            fi
        else
            error "Processo frontend morreu durante inicialização"
            break
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
        
        # ✅ ESTABILIZAÇÃO: Mostrar informações de recursos
        echo -e "\n${CYAN}=== RECURSOS INICIAIS ===${NC}"
        local backend_pid=$(read_pid "backend")
        local frontend_pid=$(read_pid "frontend")
        
        if [ -n "$backend_pid" ]; then
            local backend_memory=$(get_process_memory "$backend_pid")
            log "Backend: Memória inicial ${backend_memory}MB"
        fi
        
        if [ -n "$frontend_pid" ]; then
            local frontend_memory=$(get_process_memory "$frontend_pid")
            log "Frontend: Memória inicial ${frontend_memory}MB"
        fi
        
        # ✅ ESTABILIZAÇÃO: Sugerir monitoramento contínuo
        log "💡 Use './scripts/dev-manager.sh monitor' para monitoramento contínuo"
        log "💡 Use './scripts/dev-manager.sh auto-restart' para auto-restart automático"
    else
        error "Falha ao iniciar alguns serviços"
        echo -e "\n${CYAN}=== LOGS DE DEBUG ===${NC}"
        
        # ✅ ESTABILIZAÇÃO: Mostrar logs de erro para debug
        if [ -f "$PROJECT_ROOT/backend.log" ]; then
            log "Últimas linhas do log do backend:"
            tail -10 "$PROJECT_ROOT/backend.log" | while read line; do
                echo "  $line"
            done
        fi
        
        if [ -f "$PROJECT_ROOT/frontend.log" ]; then
            log "Últimas linhas do log do frontend:"
            tail -10 "$PROJECT_ROOT/frontend.log" | while read line; do
                echo "  $line"
            done
        fi
        
        check_status
        return 1
    fi
}

# ✅ ESTABILIZAÇÃO: Função aprimorada para parar serviços
stop_services() {
    log "🛑 Parando serviços..."
    
    # Parar processos usando PIDs dos arquivos de controle primeiro
    local frontend_pid=$(read_pid "frontend")
    local backend_pid=$(read_pid "backend")
    
    if [ -n "$backend_pid" ] && kill -0 "$backend_pid" 2>/dev/null; then
        log "Parando backend (PID: $backend_pid)..."
        kill -TERM "$backend_pid" 2>/dev/null || true
        sleep 2
        if kill -0 "$backend_pid" 2>/dev/null; then
            warn "Backend não respondeu ao SIGTERM, usando SIGKILL..."
            kill -KILL "$backend_pid" 2>/dev/null || true
        fi
    fi
    
    if [ -n "$frontend_pid" ] && kill -0 "$frontend_pid" 2>/dev/null; then
        log "Parando frontend (PID: $frontend_pid)..."
        kill -TERM "$frontend_pid" 2>/dev/null || true
        sleep 2
        if kill -0 "$frontend_pid" 2>/dev/null; then
            warn "Frontend não respondeu ao SIGTERM, usando SIGKILL..."
            kill -KILL "$frontend_pid" 2>/dev/null || true
        fi
    fi
    
    # Fallback: usar método antigo
    kill_project_processes
    
    # Limpar arquivos PID
    clear_pid_files
    
    success "Serviços parados"
}

# ✅ ESTABILIZAÇÃO: Nova função para monitoramento contínuo
monitor_services() {
    log "🔍 Iniciando monitoramento contínuo (Ctrl+C para parar)..."
    log "Intervalo de verificação: ${HEALTHCHECK_INTERVAL}s"
    
    # Função para capturar Ctrl+C
    trap 'monitor_log "Monitoramento interrompido pelo usuário"; exit 0' INT
    
    while true; do
        clear
        echo -e "${CYAN}════════════════════════════════════════${NC}"
        echo -e "${CYAN}    🔍 MONITOR CRM DEVELOPMENT          ${NC}"
        echo -e "${CYAN}    $(date +'%Y-%m-%d %H:%M:%S')         ${NC}"
        echo -e "${CYAN}════════════════════════════════════════${NC}"
        
        # Verificar status detalhado
        check_status
        
        # ✅ ESTABILIZAÇÃO: Verificar recursos e alertar sobre problemas
        local frontend_pid=$(read_pid "frontend")
        local backend_pid=$(read_pid "backend")
        local issues_found=false
        
        echo -e "\n${CYAN}=== ALERTAS DE RECURSOS ===${NC}"
        
        if [ -n "$backend_pid" ] && kill -0 "$backend_pid" 2>/dev/null; then
            local backend_memory=$(get_process_memory "$backend_pid")
            local backend_cpu=$(get_process_cpu "$backend_pid")
            
            if [ "$backend_memory" -gt "$MEMORY_LIMIT_MB" ]; then
                warn "🚨 Backend: Memória alta ($backend_memory MB > $MEMORY_LIMIT_MB MB)"
                issues_found=true
            fi
            
            if [ "$(echo "$backend_cpu > $CPU_LIMIT_PERCENT" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
                warn "🚨 Backend: CPU alta ($backend_cpu% > $CPU_LIMIT_PERCENT%)"
                issues_found=true
            fi
        fi
        
        if [ -n "$frontend_pid" ] && kill -0 "$frontend_pid" 2>/dev/null; then
            local frontend_memory=$(get_process_memory "$frontend_pid")
            local frontend_cpu=$(get_process_cpu "$frontend_pid")
            
            if [ "$frontend_memory" -gt "$MEMORY_LIMIT_MB" ]; then
                warn "🚨 Frontend: Memória alta ($frontend_memory MB > $MEMORY_LIMIT_MB MB)"
                issues_found=true
            fi
            
            if [ "$(echo "$frontend_cpu > $CPU_LIMIT_PERCENT" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
                warn "🚨 Frontend: CPU alta ($frontend_cpu% > $CPU_LIMIT_PERCENT%)"
                issues_found=true
            fi
        fi
        
        if [ "$issues_found" = false ]; then
            success "✅ Todos os recursos dentro dos limites"
        fi
        
        echo -e "\n${CYAN}=== PRÓXIMA VERIFICAÇÃO EM ${HEALTHCHECK_INTERVAL}s ===${NC}"
        echo "Pressione Ctrl+C para parar o monitoramento"
        
        # Aguardar intervalo
        sleep "$HEALTHCHECK_INTERVAL"
    done
}

# ✅ ESTABILIZAÇÃO: Nova função para auto-restart
auto_restart_services() {
    log "🔄 Iniciando auto-restart (Ctrl+C para parar)..."
    log "Intervalo de verificação: ${HEALTHCHECK_INTERVAL}s"
    log "Máximo de tentativas de restart: $MAX_RESTART_ATTEMPTS"
    
    # Contadores de restart
    local frontend_restart_count=0
    local backend_restart_count=0
    local last_restart_time=0
    
    # Função para capturar Ctrl+C
    trap 'monitor_log "Auto-restart interrompido pelo usuário"; exit 0' INT
    
    while true; do
        local current_time=$(date +%s)
        local needs_restart=false
        
        # Verificar se backend está rodando
        if ! curl -s "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1; then
            error "Backend offline detectado"
            
            # Verificar cooldown
            if [ $((current_time - last_restart_time)) -gt "$RESTART_COOLDOWN" ]; then
                if [ "$backend_restart_count" -lt "$MAX_RESTART_ATTEMPTS" ]; then
                    warn "Tentando restart do backend (tentativa $((backend_restart_count + 1))/$MAX_RESTART_ATTEMPTS)"
                    
                    # Parar e iniciar backend
                    local backend_pid=$(read_pid "backend")
                    if [ -n "$backend_pid" ]; then
                        kill -KILL "$backend_pid" 2>/dev/null || true
                    fi
                    
                    cd "$BACKEND_DIR"
                    NODE_OPTIONS="--max-old-space-size=4096 --no-warnings" nohup npm run dev > ../backend.log 2>&1 &
                    local new_backend_pid=$!
                    save_pid "backend" "$new_backend_pid"
                    cd "$PROJECT_ROOT"
                    
                    backend_restart_count=$((backend_restart_count + 1))
                    last_restart_time=$current_time
                    needs_restart=true
                    
                    log "Backend reiniciado (PID: $new_backend_pid)"
                else
                    error "Limite de tentativas de restart do backend atingido ($MAX_RESTART_ATTEMPTS)"
                fi
            else
                warn "Backend em cooldown, aguardando $((RESTART_COOLDOWN - (current_time - last_restart_time)))s"
            fi
        else
            # Reset contador se backend está funcionando
            backend_restart_count=0
        fi
        
        # Verificar se frontend está rodando
        if ! curl -s "http://127.0.0.1:$FRONTEND_PORT" >/dev/null 2>&1; then
            error "Frontend offline detectado"
            
            # Verificar cooldown
            if [ $((current_time - last_restart_time)) -gt "$RESTART_COOLDOWN" ]; then
                if [ "$frontend_restart_count" -lt "$MAX_RESTART_ATTEMPTS" ]; then
                    warn "Tentando restart do frontend (tentativa $((frontend_restart_count + 1))/$MAX_RESTART_ATTEMPTS)"
                    
                    # Parar e iniciar frontend
                    local frontend_pid=$(read_pid "frontend")
                    if [ -n "$frontend_pid" ]; then
                        kill -KILL "$frontend_pid" 2>/dev/null || true
                    fi
                    
                    NODE_OPTIONS="--max-old-space-size=4096 --no-warnings" nohup npm run dev > frontend.log 2>&1 &
                    local new_frontend_pid=$!
                    save_pid "frontend" "$new_frontend_pid"
                    
                    frontend_restart_count=$((frontend_restart_count + 1))
                    last_restart_time=$current_time
                    needs_restart=true
                    
                    log "Frontend reiniciado (PID: $new_frontend_pid)"
                else
                    error "Limite de tentativas de restart do frontend atingido ($MAX_RESTART_ATTEMPTS)"
                fi
            else
                warn "Frontend em cooldown, aguardando $((RESTART_COOLDOWN - (current_time - last_restart_time)))s"
            fi
        else
            # Reset contador se frontend está funcionando
            frontend_restart_count=0
        fi
        
        # Se houve restart, aguardar mais tempo para estabilizar
        if [ "$needs_restart" = true ]; then
            log "Aguardando serviços estabilizarem após restart..."
            sleep 15
        else
            sleep "$HEALTHCHECK_INTERVAL"
        fi
    done
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

# ✅ ESTABILIZAÇÃO: Função principal com novos comandos
main() {
    local command=${1:-"start"}
    
    log "🔧 Dev Manager ESTABILIZADO - Comando: $command"
    
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
        "monitor")
            monitor_services
            ;;
        "auto-restart")
            auto_restart_services
            ;;
        *)
            echo "Uso: $0 {start|stop|restart|clean|status|debug|monitor|auto-restart}"
            echo ""
            echo "✅ COMANDOS ESTABILIZADOS DISPONÍVEIS:"
            echo "  start        - Inicia os serviços com monitoramento"
            echo "  stop         - Para os serviços de forma segura"
            echo "  restart      - Reinicia os serviços"
            echo "  clean        - Limpeza completa de processos"
            echo "  status       - Verifica status detalhado dos serviços"
            echo "  debug        - Diagnóstico completo do sistema"
            echo "  monitor      - Monitoramento contínuo dos recursos"
            echo "  auto-restart - Auto-restart quando serviços caem"
            echo ""
            echo "✅ NOVOS RECURSOS DE ESTABILIZAÇÃO:"
            echo "  • Monitoramento de memória e CPU"
            echo "  • Auto-restart inteligente com cooldown"
            echo "  • Logging detalhado em $MONITOR_LOG"
            echo "  • Controle por arquivos PID"
            echo "  • Limites configuráveis de recursos"
            exit 1
            ;;
    esac
}

# Executar função principal
main "$@"
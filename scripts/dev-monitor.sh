#!/bin/bash

# ============================================
# 📊 DEV MONITOR - Monitor de Performance em Tempo Real
# ============================================
# 
# ✅ ESTABILIZAÇÃO: Script para monitoramento contínuo de performance
# Monitora recursos do sistema, performance dos serviços e métricas de desenvolvimento
# Segue melhores práticas do Node.js 22.x para observabilidade
#
# Uso: ./scripts/dev-monitor.sh [--interval=30] [--output=table|json] [--save-logs]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configurações
PROJECT_ROOT="/Users/carlosandia/CRM-MARKETING"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_PORT=8080
BACKEND_PORT=3001

# Configurações de monitoramento
MONITOR_INTERVAL=30  # segundos
OUTPUT_FORMAT="table"  # table|json
SAVE_LOGS=false
LOGS_DIR="$PROJECT_ROOT/monitoring-logs"

# Arquivos de controle
FRONTEND_PID_FILE="$PROJECT_ROOT/.frontend.pid"
BACKEND_PID_FILE="$PROJECT_ROOT/.backend.pid"
MONITOR_DATA_FILE="$PROJECT_ROOT/.monitor-data.json"

# Parse argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --interval=*)
            MONITOR_INTERVAL="${1#*=}"
            shift
            ;;
        --output=*)
            OUTPUT_FORMAT="${1#*=}"
            shift
            ;;
        --save-logs)
            SAVE_LOGS=true
            shift
            ;;
        --help|-h)
            echo "Uso: $0 [--interval=30] [--output=table|json] [--save-logs]"
            echo ""
            echo "Opções:"
            echo "  --interval=N     Intervalo de coleta em segundos (padrão: 30)"
            echo "  --output=FORMAT  Formato de saída: table ou json (padrão: table)"
            echo "  --save-logs      Salvar logs de monitoramento em arquivo"
            echo "  --help, -h       Mostrar esta ajuda"
            exit 0
            ;;
        *)
            echo "Opção desconhecida: $1"
            echo "Use --help para ver opções disponíveis"
            exit 1
            ;;
    esac
done

# Função para logging
log() {
    local message="$1"
    local timestamp="$(date +'%Y-%m-%d %H:%M:%S')"
    if [ "$OUTPUT_FORMAT" = "table" ]; then
        echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $message"
    fi
    
    if [ "$SAVE_LOGS" = true ]; then
        mkdir -p "$LOGS_DIR"
        echo "[$timestamp] [MONITOR] $message" >> "$LOGS_DIR/monitor-$(date +'%Y%m%d').log"
    fi
}

success() {
    local message="$1"
    if [ "$OUTPUT_FORMAT" = "table" ]; then
        echo -e "${GREEN}[✅]${NC} $message"
    fi
}

error() {
    local message="$1"
    if [ "$OUTPUT_FORMAT" = "table" ]; then
        echo -e "${RED}[❌]${NC} $message"
    fi
}

warn() {
    local message="$1"
    if [ "$OUTPUT_FORMAT" = "table" ]; then
        echo -e "${YELLOW}[⚠️]${NC} $message"
    fi
}

# Função para obter PID de arquivo de controle
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

# Função para obter informações de processo
get_process_info() {
    local pid=$1
    
    if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
        echo '{"status":"offline","memory_mb":0,"cpu_percent":0.0,"threads":0,"uptime_seconds":0}'
        return
    fi
    
    # Obter informações do processo usando ps
    local process_info=$(ps -p "$pid" -o pid,rss,pcpu,nlwp,etime= 2>/dev/null)
    
    if [ -z "$process_info" ]; then
        echo '{"status":"offline","memory_mb":0,"cpu_percent":0.0,"threads":0,"uptime_seconds":0}'
        return
    fi
    
    # Parsear informações
    local memory_kb=$(echo "$process_info" | awk '{print $2}')
    local cpu_percent=$(echo "$process_info" | awk '{print $3}')
    local threads=$(echo "$process_info" | awk '{print $4}')
    local etime=$(echo "$process_info" | awk '{print $5}')
    
    # Converter memória para MB
    local memory_mb=$((memory_kb / 1024))
    
    # Converter etime para segundos (formato pode ser DD-HH:MM:SS, HH:MM:SS, ou MM:SS)
    local uptime_seconds=0
    if [[ "$etime" =~ ^([0-9]+)-([0-9]+):([0-9]+):([0-9]+)$ ]]; then
        # DD-HH:MM:SS
        uptime_seconds=$(( ${BASH_REMATCH[1]} * 86400 + ${BASH_REMATCH[2]} * 3600 + ${BASH_REMATCH[3]} * 60 + ${BASH_REMATCH[4]} ))
    elif [[ "$etime" =~ ^([0-9]+):([0-9]+):([0-9]+)$ ]]; then
        # HH:MM:SS
        uptime_seconds=$(( ${BASH_REMATCH[1]} * 3600 + ${BASH_REMATCH[2]} * 60 + ${BASH_REMATCH[3]} ))
    elif [[ "$etime" =~ ^([0-9]+):([0-9]+)$ ]]; then
        # MM:SS
        uptime_seconds=$(( ${BASH_REMATCH[1]} * 60 + ${BASH_REMATCH[2]} ))
    fi
    
    echo "{\"status\":\"online\",\"memory_mb\":$memory_mb,\"cpu_percent\":$cpu_percent,\"threads\":$threads,\"uptime_seconds\":$uptime_seconds}"
}

# Função para verificar conectividade HTTP
check_http_service() {
    local url=$1
    local timeout=5
    
    local start_time=$(date +%s%N)
    local http_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time $timeout "$url" 2>/dev/null || echo "000")
    local end_time=$(date +%s%N)
    
    local response_time_ms=$(( (end_time - start_time) / 1000000 ))
    
    if [ "$http_status" = "200" ] || [ "$http_status" = "302" ] || [ "$http_status" = "301" ]; then
        echo "{\"status\":\"online\",\"http_status\":$http_status,\"response_time_ms\":$response_time_ms}"
    else
        echo "{\"status\":\"offline\",\"http_status\":$http_status,\"response_time_ms\":$response_time_ms}"
    fi
}

# Função para obter métricas do sistema
get_system_metrics() {
    # CPU Load Average
    local load_avg=$(uptime | awk -F'load averages:' '{print $2}' | awk '{print $1}' | tr -d ',')
    
    # Memória total e disponível (macOS)
    local total_memory_bytes=$(sysctl -n hw.memsize)
    local total_memory_gb=$(echo "scale=2; $total_memory_bytes / 1024 / 1024 / 1024" | bc -l)
    
    # Usar vm_stat para obter informações de memória
    local vm_stat_output=$(vm_stat)
    local page_size=$(echo "$vm_stat_output" | head -1 | awk '{print $8}')
    local free_pages=$(echo "$vm_stat_output" | grep "Pages free:" | awk '{print $3}' | tr -d '.')
    local inactive_pages=$(echo "$vm_stat_output" | grep "Pages inactive:" | awk '{print $3}' | tr -d '.')
    
    # Calcular memória disponível (aproximação)
    local available_bytes=$(( (free_pages + inactive_pages) * page_size ))
    local available_gb=$(echo "scale=2; $available_bytes / 1024 / 1024 / 1024" | bc -l)
    local used_gb=$(echo "scale=2; $total_memory_gb - $available_gb" | bc -l)
    local memory_usage_percent=$(echo "scale=1; $used_gb * 100 / $total_memory_gb" | bc -l)
    
    # Número de CPUs
    local cpu_count=$(sysctl -n hw.ncpu)
    
    # Espaço em disco
    local disk_info=$(df -h "$PROJECT_ROOT" | tail -1)
    local disk_total=$(echo "$disk_info" | awk '{print $2}')
    local disk_used=$(echo "$disk_info" | awk '{print $3}')
    local disk_available=$(echo "$disk_info" | awk '{print $4}')
    local disk_usage_percent=$(echo "$disk_info" | awk '{print $5}' | tr -d '%')
    
    echo "{\"load_average\":$load_avg,\"memory\":{\"total_gb\":$total_memory_gb,\"used_gb\":$used_gb,\"available_gb\":$available_gb,\"usage_percent\":$memory_usage_percent},\"cpu_count\":$cpu_count,\"disk\":{\"total\":\"$disk_total\",\"used\":\"$disk_used\",\"available\":\"$disk_available\",\"usage_percent\":$disk_usage_percent}}"
}

# Função para coletar todas as métricas
collect_metrics() {
    local timestamp=$(date -Iseconds)
    
    # PIDs dos serviços
    local frontend_pid=$(read_pid "frontend")
    local backend_pid=$(read_pid "backend")
    
    # Informações de processo
    local frontend_process=$(get_process_info "$frontend_pid")
    local backend_process=$(get_process_info "$backend_pid")
    
    # Conectividade HTTP
    local frontend_http=$(check_http_service "http://127.0.0.1:$FRONTEND_PORT")
    local backend_http=$(check_http_service "http://127.0.0.1:$BACKEND_PORT/health")
    
    # Métricas do sistema
    local system_metrics=$(get_system_metrics)
    
    # Montar JSON final
    local metrics_json=$(cat <<EOF
{
  "timestamp": "$timestamp",
  "services": {
    "frontend": {
      "pid": "$frontend_pid",
      "process": $frontend_process,
      "http": $frontend_http
    },
    "backend": {
      "pid": "$backend_pid", 
      "process": $backend_process,
      "http": $backend_http
    }
  },
  "system": $system_metrics
}
EOF
)
    
    echo "$metrics_json"
}

# Função para exibir métricas em formato tabela
display_table() {
    local metrics="$1"
    
    clear
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}                    📊 CRM DEVELOPMENT MONITOR                    ${NC}"
    echo -e "${CYAN}                    $(date +'%Y-%m-%d %H:%M:%S')                    ${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    
    # Parse JSON e extrair informações
    local frontend_status=$(echo "$metrics" | jq -r '.services.frontend.process.status')
    local frontend_memory=$(echo "$metrics" | jq -r '.services.frontend.process.memory_mb')
    local frontend_cpu=$(echo "$metrics" | jq -r '.services.frontend.process.cpu_percent')
    local frontend_uptime=$(echo "$metrics" | jq -r '.services.frontend.process.uptime_seconds')
    local frontend_http_status=$(echo "$metrics" | jq -r '.services.frontend.http.status')
    local frontend_response_time=$(echo "$metrics" | jq -r '.services.frontend.http.response_time_ms')
    
    local backend_status=$(echo "$metrics" | jq -r '.services.backend.process.status')
    local backend_memory=$(echo "$metrics" | jq -r '.services.backend.process.memory_mb')
    local backend_cpu=$(echo "$metrics" | jq -r '.services.backend.process.cpu_percent')
    local backend_uptime=$(echo "$metrics" | jq -r '.services.backend.process.uptime_seconds')
    local backend_http_status=$(echo "$metrics" | jq -r '.services.backend.http.status')
    local backend_response_time=$(echo "$metrics" | jq -r '.services.backend.http.response_time_ms')
    
    local system_load=$(echo "$metrics" | jq -r '.system.load_average')
    local system_memory_used=$(echo "$metrics" | jq -r '.system.memory.used_gb')
    local system_memory_total=$(echo "$metrics" | jq -r '.system.memory.total_gb')
    local system_memory_percent=$(echo "$metrics" | jq -r '.system.memory.usage_percent')
    local system_disk_usage=$(echo "$metrics" | jq -r '.system.disk.usage_percent')
    
    # Converter uptime para formato legível
    local frontend_uptime_formatted=$(printf '%02d:%02d:%02d' $((frontend_uptime/3600)) $((frontend_uptime%3600/60)) $((frontend_uptime%60)))
    local backend_uptime_formatted=$(printf '%02d:%02d:%02d' $((backend_uptime/3600)) $((backend_uptime%3600/60)) $((backend_uptime%60)))
    
    echo -e "\n${WHITE}📋 SERVIÇOS${NC}"
    printf "%-12s %-8s %-10s %-8s %-10s %-8s %-12s\n" "Service" "Status" "Memory(MB)" "CPU(%)" "HTTP" "Resp(ms)" "Uptime"
    echo "────────────────────────────────────────────────────────────────────────"
    
    # Frontend
    local frontend_status_color=$([[ "$frontend_status" == "online" ]] && echo "$GREEN" || echo "$RED")
    local frontend_http_color=$([[ "$frontend_http_status" == "online" ]] && echo "$GREEN" || echo "$RED")
    printf "%-12s ${frontend_status_color}%-8s${NC} %-10s %-8s ${frontend_http_color}%-8s${NC} %-8s %-12s\n" \
        "Frontend" "$frontend_status" "$frontend_memory" "$frontend_cpu" "$frontend_http_status" "$frontend_response_time" "$frontend_uptime_formatted"
    
    # Backend
    local backend_status_color=$([[ "$backend_status" == "online" ]] && echo "$GREEN" || echo "$RED")
    local backend_http_color=$([[ "$backend_http_status" == "online" ]] && echo "$GREEN" || echo "$RED")
    printf "%-12s ${backend_status_color}%-8s${NC} %-10s %-8s ${backend_http_color}%-8s${NC} %-8s %-12s\n" \
        "Backend" "$backend_status" "$backend_memory" "$backend_cpu" "$backend_http_status" "$backend_response_time" "$backend_uptime_formatted"
    
    echo -e "\n${WHITE}🖥️  SISTEMA${NC}"
    printf "%-15s %-15s %-20s %-15s\n" "Load Average" "Memory Usage" "Memory (GB)" "Disk Usage"
    echo "────────────────────────────────────────────────────────────────"
    
    # Cores baseadas em thresholds
    local load_color=$([[ $(echo "$system_load > 2.0" | bc -l) -eq 1 ]] && echo "$RED" || ([[ $(echo "$system_load > 1.0" | bc -l) -eq 1 ]] && echo "$YELLOW" || echo "$GREEN"))
    local memory_color=$([[ $(echo "$system_memory_percent > 80" | bc -l) -eq 1 ]] && echo "$RED" || ([[ $(echo "$system_memory_percent > 60" | bc -l) -eq 1 ]] && echo "$YELLOW" || echo "$GREEN"))
    local disk_color=$([[ "$system_disk_usage" -gt 80 ]] && echo "$RED" || ([[ "$system_disk_usage" -gt 60 ]] && echo "$YELLOW" || echo "$GREEN"))
    
    printf "${load_color}%-15s${NC} ${memory_color}%-15s${NC} %-20s ${disk_color}%-15s${NC}\n" \
        "$system_load" "${system_memory_percent}%" "${system_memory_used}/${system_memory_total}" "${system_disk_usage}%"
    
    echo -e "\n${WHITE}⚡ ALERTAS${NC}"
    local alerts_found=false
    
    # Verificar alertas de recursos
    if [[ "$frontend_status" == "offline" ]]; then
        echo -e "${RED}🚨 Frontend offline${NC}"
        alerts_found=true
    fi
    
    if [[ "$backend_status" == "offline" ]]; then
        echo -e "${RED}🚨 Backend offline${NC}"
        alerts_found=true
    fi
    
    if [[ $(echo "$frontend_memory > 2048" | bc -l) -eq 1 ]]; then
        echo -e "${YELLOW}⚠️  Frontend usando alta memória: ${frontend_memory}MB${NC}"
        alerts_found=true
    fi
    
    if [[ $(echo "$backend_memory > 2048" | bc -l) -eq 1 ]]; then
        echo -e "${YELLOW}⚠️  Backend usando alta memória: ${backend_memory}MB${NC}"
        alerts_found=true
    fi
    
    if [[ $(echo "$system_load > 2.0" | bc -l) -eq 1 ]]; then
        echo -e "${RED}🚨 Sistema com alta carga: $system_load${NC}"
        alerts_found=true
    fi
    
    if [[ $(echo "$system_memory_percent > 80" | bc -l) -eq 1 ]]; then
        echo -e "${RED}🚨 Memória do sistema alta: ${system_memory_percent}%${NC}"
        alerts_found=true
    fi
    
    if [[ "$system_disk_usage" -gt 80 ]]; then
        echo -e "${RED}🚨 Espaço em disco baixo: ${system_disk_usage}%${NC}"
        alerts_found=true
    fi
    
    if [ "$alerts_found" = false ]; then
        echo -e "${GREEN}✅ Todos os recursos dentro dos limites normais${NC}"
    fi
    
    echo -e "\n${CYAN}Próxima atualização em ${MONITOR_INTERVAL}s | Pressione Ctrl+C para parar${NC}"
}

# Função principal de monitoramento
monitor_loop() {
    log "🔍 Iniciando monitoramento contínuo..."
    log "Intervalo: ${MONITOR_INTERVAL}s | Formato: $OUTPUT_FORMAT | Logs: $SAVE_LOGS"
    
    # Capturar Ctrl+C
    trap 'log "Monitoramento interrompido pelo usuário"; exit 0' INT
    
    while true; do
        local metrics=$(collect_metrics)
        
        # Salvar dados históricos se solicitado
        if [ "$SAVE_LOGS" = true ]; then
            echo "$metrics" >> "$MONITOR_DATA_FILE"
        fi
        
        # Exibir dados
        if [ "$OUTPUT_FORMAT" = "json" ]; then
            echo "$metrics"
        else
            display_table "$metrics"
        fi
        
        sleep "$MONITOR_INTERVAL"
    done
}

# Verificar dependências
if ! command -v jq >/dev/null 2>&1; then
    error "jq não está instalado. Instale com: brew install jq"
    exit 1
fi

if ! command -v bc >/dev/null 2>&1; then
    error "bc não está instalado. Instale com: brew install bc"
    exit 1
fi

# Executar monitoramento
monitor_loop
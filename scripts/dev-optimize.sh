#!/bin/bash

# ============================================
# ⚡ DEV OPTIMIZE - Otimizador de Performance
# ============================================
# 
# ✅ ESTABILIZAÇÃO: Script para otimizar performance do ambiente de desenvolvimento
# Limpa caches, otimiza dependências e configura ambiente para máxima eficiência
# Segue melhores práticas do Node.js 22.x e Vite 6.x
#
# Uso: ./scripts/dev-optimize.sh [--force] [--verbose]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configurações
PROJECT_ROOT="/Users/carlosandia/CRM-MARKETING"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Flags de comando
FORCE_OPTIMIZATION=false
VERBOSE=false

# Parse argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE_OPTIMIZATION=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        *)
            echo "Uso: $0 [--force] [--verbose]"
            exit 1
            ;;
    esac
done

# Função para logging
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[✅]${NC} $1"
}

error() {
    echo -e "${RED}[❌]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[⚠️]${NC} $1"
}

info() {
    echo -e "${CYAN}[ℹ️]${NC} $1"
}

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Função para obter tamanho de diretório em MB
get_dir_size_mb() {
    local dir="$1"
    if [ -d "$dir" ]; then
        du -sm "$dir" 2>/dev/null | cut -f1
    else
        echo "0"
    fi
}

# ✅ OTIMIZAÇÃO 1: Limpeza de caches
clean_caches() {
    log "🧹 Limpando caches do sistema..."
    
    local space_freed=0
    
    # Cache do npm
    if command_exists npm; then
        local npm_cache_size_before=$(npm cache ls 2>/dev/null | wc -l || echo "0")
        log "Limpando cache do npm..."
        npm cache clean --force >/dev/null 2>&1 || true
        success "Cache npm limpo"
    fi
    
    # Cache do Vite
    local vite_cache_dirs=(
        "$PROJECT_ROOT/.vite"
        "$PROJECT_ROOT/node_modules/.vite"
    )
    
    for cache_dir in "${vite_cache_dirs[@]}"; do
        if [ -d "$cache_dir" ]; then
            local size_before=$(get_dir_size_mb "$cache_dir")
            rm -rf "$cache_dir"
            space_freed=$((space_freed + size_before))
            success "Cache Vite removido: $cache_dir (${size_before}MB)"
        fi
    done
    
    # Cache do TypeScript
    local ts_cache_files=(
        "$PROJECT_ROOT/tsconfig.tsbuildinfo"
        "$BACKEND_DIR/tsconfig.tsbuildinfo"
    )
    
    for cache_file in "${ts_cache_files[@]}"; do
        if [ -f "$cache_file" ]; then
            rm -f "$cache_file"
            success "Cache TypeScript removido: $(basename "$cache_file")"
        fi
    done
    
    # Logs antigos
    local log_files=(
        "$PROJECT_ROOT/frontend.log"
        "$PROJECT_ROOT/backend.log"
        "$PROJECT_ROOT/monitor.log"
    )
    
    for log_file in "${log_files[@]}"; do
        if [ -f "$log_file" ]; then
            local size_before=$(du -m "$log_file" 2>/dev/null | cut -f1)
            > "$log_file"  # Limpar sem deletar
            space_freed=$((space_freed + size_before))
            success "Log limpo: $(basename "$log_file") (${size_before}MB)"
        fi
    done
    
    # Arquivos temporários
    local temp_patterns=(
        "*.tmp"
        "*.temp"
        ".DS_Store"
        "Thumbs.db"
    )
    
    for pattern in "${temp_patterns[@]}"; do
        find "$PROJECT_ROOT" -name "$pattern" -type f -delete 2>/dev/null || true
    done
    
    info "Espaço liberado aproximado: ${space_freed}MB"
}

# ✅ OTIMIZAÇÃO 2: Otimização de dependências
optimize_dependencies() {
    log "📦 Otimizando dependências..."
    
    # Verificar se node_modules existe
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        warn "node_modules não encontrado no frontend, instalando..."
        cd "$PROJECT_ROOT"
        npm install
    fi
    
    if [ ! -d "$BACKEND_DIR/node_modules" ]; then
        warn "node_modules não encontrado no backend, instalando..."
        cd "$BACKEND_DIR"
        npm install
        cd "$PROJECT_ROOT"
    fi
    
    # Auditoria e correção de vulnerabilidades
    log "Executando auditoria de segurança..."
    cd "$PROJECT_ROOT"
    
    # Frontend
    local frontend_vulnerabilities=$(npm audit --json 2>/dev/null | jq -r '.metadata.vulnerabilities.total // 0')
    if [ "$frontend_vulnerabilities" -gt 0 ]; then
        warn "Frontend: $frontend_vulnerabilities vulnerabilidades encontradas"
        if [ "$FORCE_OPTIMIZATION" = true ]; then
            log "Aplicando correções automáticas..."
            npm audit fix --force >/dev/null 2>&1 || true
            success "Correções aplicadas no frontend"
        else
            info "Use --force para aplicar correções automáticas"
        fi
    else
        success "Frontend: Nenhuma vulnerabilidade encontrada"
    fi
    
    # Backend
    cd "$BACKEND_DIR"
    local backend_vulnerabilities=$(npm audit --json 2>/dev/null | jq -r '.metadata.vulnerabilities.total // 0')
    if [ "$backend_vulnerabilities" -gt 0 ]; then
        warn "Backend: $backend_vulnerabilities vulnerabilidades encontradas"
        if [ "$FORCE_OPTIMIZATION" = true ]; then
            log "Aplicando correções automáticas..."
            npm audit fix --force >/dev/null 2>&1 || true
            success "Correções aplicadas no backend"
        else
            info "Use --force para aplicar correções automáticas"
        fi
    else
        success "Backend: Nenhuma vulnerabilidade encontrada"
    fi
    
    cd "$PROJECT_ROOT"
    
    # Verificar dependências desatualizadas
    if [ "$VERBOSE" = true ]; then
        log "Verificando dependências desatualizadas..."
        
        echo -e "\n${CYAN}=== FRONTEND OUTDATED ===${NC}"
        npm outdated || true
        
        echo -e "\n${CYAN}=== BACKEND OUTDATED ===${NC}"
        cd "$BACKEND_DIR"
        npm outdated || true
        cd "$PROJECT_ROOT"
    fi
}

# ✅ OTIMIZAÇÃO 3: Configuração do ambiente Node.js
optimize_nodejs_env() {
    log "⚙️ Otimizando ambiente Node.js..."
    
    # Verificar versão do Node.js
    local node_version=$(node --version | sed 's/v//')
    local required_version="22.16.0"
    
    if [ -f "$PROJECT_ROOT/.nvmrc" ]; then
        local nvmrc_version=$(cat "$PROJECT_ROOT/.nvmrc")
        if [ "$node_version" != "$nvmrc_version" ]; then
            warn "Versão Node.js ($node_version) difere do .nvmrc ($nvmrc_version)"
            info "Execute: nvm use $nvmrc_version"
        else
            success "Versão Node.js correta: v$node_version"
        fi
    fi
    
    # Verificar configurações de memória
    local current_max_old_space=$(node -p "v8.getHeapStatistics().heap_size_limit / 1024 / 1024")
    local expected_limit=4096
    
    if [ "${current_max_old_space%.*}" -lt "$expected_limit" ]; then
        warn "Limite de memória baixo: ${current_max_old_space%.*}MB (recomendado: ${expected_limit}MB)"
        info "NODE_OPTIONS será aplicado automaticamente pelo dev-manager.sh"
    else
        success "Limite de memória adequado: ${current_max_old_space%.*}MB"
    fi
    
    # Verificar ulimits
    local file_descriptor_limit=$(ulimit -n)
    local recommended_fd_limit=4096
    
    if [ "$file_descriptor_limit" -lt "$recommended_fd_limit" ]; then
        warn "Limite de file descriptors baixo: $file_descriptor_limit (recomendado: >= $recommended_fd_limit)"
        info "Execute: ulimit -n $recommended_fd_limit"
    else
        success "Limite de file descriptors adequado: $file_descriptor_limit"
    fi
}

# ✅ OTIMIZAÇÃO 4: Pré-aquecimento de dependências
warm_up_dependencies() {
    log "🔥 Pré-aquecendo dependências críticas..."
    
    # Forçar rebuild de dependências se necessário
    if [ "$FORCE_OPTIMIZATION" = true ]; then
        log "Forçando rebuild de dependências nativas..."
        cd "$PROJECT_ROOT"
        npm rebuild >/dev/null 2>&1 || true
        
        cd "$BACKEND_DIR"
        npm rebuild >/dev/null 2>&1 || true
        cd "$PROJECT_ROOT"
        
        success "Rebuild de dependências concluído"
    fi
    
    # Pré-aquecer cache do Vite (força otimização de dependências)
    if [ -f "$PROJECT_ROOT/vite.config.ts" ]; then
        log "Forçando otimização de dependências do Vite..."
        cd "$PROJECT_ROOT"
        
        # Usar VITE_FORCE_DEPS conforme configurado no vite.config.ts
        VITE_FORCE_DEPS=true NODE_OPTIONS="--max-old-space-size=4096 --no-warnings" npx vite optimize >/dev/null 2>&1 || true
        
        success "Cache Vite pré-aquecido"
    fi
    
    # Verificar compilação TypeScript
    log "Verificando compilação TypeScript..."
    cd "$PROJECT_ROOT"
    
    if npm run type-check >/dev/null 2>&1; then
        success "Frontend: TypeScript sem erros"
    else
        warn "Frontend: Erros TypeScript encontrados"
        if [ "$VERBOSE" = true ]; then
            npm run type-check
        fi
    fi
    
    cd "$BACKEND_DIR"
    if npm run type-check >/dev/null 2>&1; then
        success "Backend: TypeScript sem erros"
    else
        warn "Backend: Erros TypeScript encontrados"
        if [ "$VERBOSE" = true ]; then
            npm run type-check
        fi
    fi
    
    cd "$PROJECT_ROOT"
}

# ✅ OTIMIZAÇÃO 5: Relatório de performance
generate_performance_report() {
    log "📊 Gerando relatório de performance..."
    
    local report_file="$PROJECT_ROOT/performance-report.txt"
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    
    cat > "$report_file" << EOF
# CRM Development Environment Performance Report
Gerado em: $timestamp

## Informações do Sistema
- Node.js: $(node --version)
- NPM: v$(npm --version)
- Sistema: $(uname -s) $(uname -r)
- CPUs: $(sysctl -n hw.ncpu)
- Memória: $(echo "scale=1; $(sysctl -n hw.memsize) / 1024 / 1024 / 1024" | bc -l)GB

## Tamanhos de Diretórios
- Frontend node_modules: $(get_dir_size_mb "$PROJECT_ROOT/node_modules")MB
- Backend node_modules: $(get_dir_size_mb "$BACKEND_DIR/node_modules")MB
- Dist: $(get_dir_size_mb "$PROJECT_ROOT/dist")MB

## Dependências Críticas (Frontend)
$(cd "$PROJECT_ROOT" && npm list --depth=0 | grep -E "(vite|react|typescript)" || echo "Informações não disponíveis")

## Dependências Críticas (Backend)
$(cd "$BACKEND_DIR" && npm list --depth=0 | grep -E "(express|typescript|tsx)" || echo "Informações não disponíveis")

## Configurações de Performance
- Max Old Space Size: $(node -p "v8.getHeapStatistics().heap_size_limit / 1024 / 1024")MB
- File Descriptor Limit: $(ulimit -n)
- Load Average: $(uptime | awk -F'load averages:' '{print $2}' | awk '{print $1}' | tr -d ',')

## Próximos Passos Recomendados
EOF

    # Adicionar recomendações baseadas no ambiente
    local recommendations=()
    
    # Verificar se há espaço suficiente
    local available_space=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $4}' | sed 's/[^0-9.]//g')
    if [ "${available_space%.*}" -lt 5 ]; then
        recommendations+=("- Liberar espaço em disco (disponível: ${available_space}GB)")
    fi
    
    # Verificar node_modules size
    local frontend_modules_size=$(get_dir_size_mb "$PROJECT_ROOT/node_modules")
    if [ "$frontend_modules_size" -gt 1000 ]; then
        recommendations+=("- Considerar limpeza de node_modules (tamanho: ${frontend_modules_size}MB)")
    fi
    
    # Adicionar recomendações ao arquivo
    if [ ${#recommendations[@]} -gt 0 ]; then
        printf '%s\n' "${recommendations[@]}" >> "$report_file"
    else
        echo "- Sistema otimizado, nenhuma ação necessária" >> "$report_file"
    fi
    
    success "Relatório salvo em: performance-report.txt"
    
    if [ "$VERBOSE" = true ]; then
        echo -e "\n${CYAN}=== RELATÓRIO DE PERFORMANCE ===${NC}"
        cat "$report_file"
    fi
}

# ✅ FUNÇÃO PRINCIPAL
main() {
    local start_time=$(date +%s)
    
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    echo -e "${CYAN}    ⚡ CRM DEVELOPMENT OPTIMIZER       ${NC}"
    echo -e "${CYAN}    $(date +'%Y-%m-%d %H:%M:%S')         ${NC}"
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    
    if [ "$FORCE_OPTIMIZATION" = true ]; then
        warn "Modo --force ativado: Aplicará otimizações agressivas"
    fi
    
    # Verificar se estamos no diretório correto
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        error "Não é possível encontrar package.json. Execute no diretório raiz do projeto."
        exit 1
    fi
    
    # Executar otimizações
    clean_caches
    echo ""
    
    optimize_dependencies
    echo ""
    
    optimize_nodejs_env
    echo ""
    
    warm_up_dependencies
    echo ""
    
    generate_performance_report
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo -e "\n${CYAN}=== OTIMIZAÇÃO CONCLUÍDA ===${NC}"
    success "✅ Ambiente otimizado com sucesso (${duration}s)"
    
    echo -e "\n💡 Próximos passos recomendados:"
    echo "   • Execute: ./scripts/dev-manager.sh start"
    echo "   • Use: ./scripts/dev-healthcheck.sh para verificar status"
    echo "   • Configure: ./scripts/dev-manager.sh monitor para monitoramento"
}

# Executar otimização principal
main "$@"
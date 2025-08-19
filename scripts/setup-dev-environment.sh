#!/bin/bash

# ============================================
# 🚀 SETUP DEV ENVIRONMENT - Configuração Completa
# ============================================
# 
# ✅ ESTABILIZAÇÃO: Script para configuração completa do ambiente de desenvolvimento
# Automatiza todo o processo de setup seguindo as melhores práticas Node.js 22.x e Vite 6.x
# Script principal para novos desenvolvedores ou reset completo do ambiente
#
# Uso: ./scripts/setup-dev-environment.sh [--force] [--skip-deps] [--aliases-only]

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

# Flags de comando
FORCE_SETUP=false
SKIP_DEPENDENCIES=false
ALIASES_ONLY=false

# Parse argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE_SETUP=true
            shift
            ;;
        --skip-deps)
            SKIP_DEPENDENCIES=true
            shift
            ;;
        --aliases-only)
            ALIASES_ONLY=true
            shift
            ;;
        --help|-h)
            echo "Uso: $0 [--force] [--skip-deps] [--aliases-only]"
            echo ""
            echo "Opções:"
            echo "  --force         Forçar reinstalação completa"
            echo "  --skip-deps     Pular instalação de dependências"
            echo "  --aliases-only  Configurar apenas aliases"
            echo "  --help, -h      Mostrar esta ajuda"
            exit 0
            ;;
        *)
            echo "Opção desconhecida: $1"
            echo "Use --help para ver opções disponíveis"
            exit 1
            ;;
    esac
done

# Funções de logging
log() {
    local message="$1"
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $message"
}

success() {
    local message="$1"
    echo -e "${GREEN}[✅]${NC} $message"
}

error() {
    local message="$1"
    echo -e "${RED}[❌]${NC} $message"
}

warn() {
    local message="$1"
    echo -e "${YELLOW}[⚠️]${NC} $message"
}

info() {
    local message="$1"
    echo -e "${CYAN}[ℹ️]${NC} $message"
}

step() {
    local step_number="$1"
    local step_name="$2"
    echo -e "\n${WHITE}═══ ETAPA $step_number: $step_name ═══${NC}"
}

# Verificar pré-requisitos
check_prerequisites() {
    step "1" "VERIFICAÇÃO DE PRÉ-REQUISITOS"
    
    log "Verificando Node.js..."
    if ! command -v node >/dev/null 2>&1; then
        error "Node.js não está instalado"
        info "Instale Node.js 22.16.0+ de: https://nodejs.org/"
        exit 1
    fi
    
    local node_version=$(node --version | sed 's/v//')
    log "Node.js encontrado: v$node_version"
    
    # Verificar se é versão 22.x
    local major_version=$(echo "$node_version" | cut -d. -f1)
    if [ "$major_version" -lt 22 ]; then
        warn "Versão Node.js $node_version pode ser incompatível (recomendado: 22.16.0+)"
        if [ "$FORCE_SETUP" = false ]; then
            read -p "Continuar mesmo assim? (y/n): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    else
        success "Versão Node.js compatível"
    fi
    
    log "Verificando npm..."
    if ! command -v npm >/dev/null 2>&1; then
        error "npm não está instalado"
        exit 1
    fi
    local npm_version=$(npm --version)
    success "npm encontrado: v$npm_version"
    
    log "Verificando projeto..."
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        error "package.json não encontrado no diretório do projeto"
        exit 1
    fi
    success "Projeto CRM encontrado"
    
    if [ ! -f "$BACKEND_DIR/package.json" ]; then
        error "Backend package.json não encontrado"
        exit 1
    fi
    success "Backend encontrado"
}

# Configurar versão Node.js
setup_node_version() {
    step "2" "CONFIGURAÇÃO NODE.JS"
    
    # O .nvmrc já foi criado na etapa anterior
    if [ -f "$PROJECT_ROOT/.nvmrc" ]; then
        local nvmrc_version=$(cat "$PROJECT_ROOT/.nvmrc")
        success ".nvmrc já configurado: $nvmrc_version"
    else
        warn ".nvmrc não encontrado - criando..."
        echo "22.16.0" > "$PROJECT_ROOT/.nvmrc"
        success ".nvmrc criado com Node.js 22.16.0"
    fi
    
    # Verificar se nvm está disponível
    if command -v nvm >/dev/null 2>&1; then
        log "nvm detectado - verificando versão..."
        local current_version=$(node --version | sed 's/v//')
        local required_version=$(cat "$PROJECT_ROOT/.nvmrc")
        
        if [ "$current_version" != "$required_version" ]; then
            warn "Versão atual ($current_version) difere da requerida ($required_version)"
            info "Execute: nvm use $required_version"
        else
            success "Versão Node.js correta em uso"
        fi
    fi
}

# Instalar dependências
install_dependencies() {
    step "3" "INSTALAÇÃO DE DEPENDÊNCIAS"
    
    if [ "$SKIP_DEPENDENCIES" = true ]; then
        info "Pulando instalação de dependências (--skip-deps)"
        return
    fi
    
    # Frontend
    log "Instalando dependências do frontend..."
    cd "$PROJECT_ROOT"
    
    if [ "$FORCE_SETUP" = true ]; then
        log "Limpando node_modules (--force)..."
        rm -rf node_modules package-lock.json
    fi
    
    npm install
    success "Dependências do frontend instaladas"
    
    # Backend
    log "Instalando dependências do backend..."
    cd "$BACKEND_DIR"
    
    if [ "$FORCE_SETUP" = true ]; then
        log "Limpando node_modules do backend (--force)..."
        rm -rf node_modules package-lock.json
    fi
    
    npm install
    success "Dependências do backend instaladas"
    
    cd "$PROJECT_ROOT"
}

# Configurar scripts e permissões
setup_scripts() {
    step "4" "CONFIGURAÇÃO DE SCRIPTS"
    
    log "Configurando permissões dos scripts..."
    
    local scripts=(
        "dev-manager.sh"
        "dev-healthcheck.sh" 
        "dev-optimize.sh"
        "dev-monitor.sh"
        "setup-dev-aliases.sh"
        "setup-dev-environment.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$PROJECT_ROOT/scripts/$script" ]; then
            chmod +x "$PROJECT_ROOT/scripts/$script"
            success "Permissão configurada: $script"
        else
            warn "Script não encontrado: $script"
        fi
    done
}

# Configurar aliases
setup_aliases() {
    step "5" "CONFIGURAÇÃO DE ALIASES"
    
    log "Configurando aliases de produtividade..."
    
    if [ -x "$PROJECT_ROOT/scripts/setup-dev-aliases.sh" ]; then
        "$PROJECT_ROOT/scripts/setup-dev-aliases.sh" --install
    else
        error "Script setup-dev-aliases.sh não encontrado ou não executável"
        return 1
    fi
}

# Otimizar ambiente
optimize_environment() {
    step "6" "OTIMIZAÇÃO DO AMBIENTE"
    
    log "Executando otimização inicial..."
    
    if [ -x "$PROJECT_ROOT/scripts/dev-optimize.sh" ]; then
        if [ "$FORCE_SETUP" = true ]; then
            "$PROJECT_ROOT/scripts/dev-optimize.sh" --force --verbose
        else
            "$PROJECT_ROOT/scripts/dev-optimize.sh" --verbose
        fi
    else
        error "Script dev-optimize.sh não encontrado ou não executável"
        return 1
    fi
}

# Verificar configuração final
final_check() {
    step "7" "VERIFICAÇÃO FINAL"
    
    log "Executando verificação de saúde..."
    
    if [ -x "$PROJECT_ROOT/scripts/dev-healthcheck.sh" ]; then
        "$PROJECT_ROOT/scripts/dev-healthcheck.sh" --verbose
    else
        error "Script dev-healthcheck.sh não encontrado ou não executável"
        return 1
    fi
}

# Mostrar guia de próximos passos
show_next_steps() {
    echo -e "\n${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}                    🎉 SETUP COMPLETO!                          ${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    
    echo -e "\n${WHITE}📋 PRÓXIMOS PASSOS:${NC}"
    echo -e "1. ${GREEN}Recarregue seu terminal ou execute:${NC}"
    echo -e "   ${YELLOW}source ~/.zshrc${NC} (ou ~/.bashrc se usar bash)"
    
    echo -e "\n2. ${GREEN}Teste os aliases:${NC}"
    echo -e "   ${YELLOW}crm${NC}          - Ir para o diretório do projeto"
    echo -e "   ${YELLOW}start${NC}        - Iniciar os serviços"
    echo -e "   ${YELLOW}status${NC}       - Ver status dos serviços"
    echo -e "   ${YELLOW}monitor${NC}      - Monitor em tempo real"
    
    echo -e "\n3. ${GREEN}Comandos principais:${NC}"
    echo -e "   ${YELLOW}npm run dev${NC}              - Iniciar frontend"
    echo -e "   ${YELLOW}npm run dev:backend${NC}      - Iniciar backend"
    echo -e "   ${YELLOW}npm run dev:clean${NC}        - Iniciar com limpeza"
    echo -e "   ${YELLOW}npm run dev:monitor${NC}      - Monitor de performance"
    
    echo -e "\n4. ${GREEN}Scripts de produtividade:${NC}"
    echo -e "   ${YELLOW}./scripts/dev-manager.sh start${NC}     - Gerenciador de serviços"
    echo -e "   ${YELLOW}./scripts/dev-healthcheck.sh${NC}       - Verificação de saúde"
    echo -e "   ${YELLOW}./scripts/dev-optimize.sh${NC}          - Otimização do ambiente"
    echo -e "   ${YELLOW}./scripts/dev-monitor.sh${NC}           - Monitor em tempo real"
    
    echo -e "\n5. ${GREEN}Ver todos os aliases disponíveis:${NC}"
    echo -e "   ${YELLOW}npm run dev:aliases${NC}"
    
    echo -e "\n${WHITE}🚀 AMBIENTE ESTABILIZADO E PRONTO PARA DESENVOLVIMENTO!${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
}

# Função principal
main() {
    local start_time=$(date +%s)
    
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}                  🚀 CRM DEV ENVIRONMENT SETUP                  ${NC}"
    echo -e "${CYAN}                    $(date +'%Y-%m-%d %H:%M:%S')                  ${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    
    if [ "$FORCE_SETUP" = true ]; then
        warn "Modo --force ativado: Reinstalação completa"
    fi
    
    if [ "$SKIP_DEPENDENCIES" = true ]; then
        warn "Modo --skip-deps ativado: Dependências não serão instaladas"
    fi
    
    if [ "$ALIASES_ONLY" = true ]; then
        info "Modo --aliases-only ativado: Configurando apenas aliases"
        setup_aliases
        show_next_steps
        return 0
    fi
    
    # Verificar se estamos no diretório correto
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        error "Execute este script no diretório raiz do projeto CRM"
        exit 1
    fi
    
    # Executar setup completo
    check_prerequisites
    setup_node_version
    install_dependencies
    setup_scripts
    setup_aliases
    optimize_environment
    final_check
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo -e "\n${GREEN}✅ Setup completo em ${duration}s${NC}"
    show_next_steps
}

# Executar setup
main "$@"
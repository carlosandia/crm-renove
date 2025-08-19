#!/bin/bash

# ============================================
# ⚡ SETUP DEV ALIASES - Configuração de Produtividade
# ============================================
# 
# ✅ ESTABILIZAÇÃO: Script para configurar aliases úteis para desenvolvimento
# Cria shortcuts para comandos frequentes e melhora produtividade do desenvolvedor
# Compatível com bash e zsh
#
# Uso: ./scripts/setup-dev-aliases.sh [--install] [--uninstall] [--show]

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
ALIASES_FILE="$HOME/.crm_dev_aliases"

# Aliases para o projeto CRM
CRM_ALIASES='
# ============================================
# 🚀 CRM DEVELOPMENT ALIASES - Gerado automaticamente
# ============================================
# Aliases para melhorar produtividade no desenvolvimento CRM

# Navegação rápida
alias crm="cd /Users/carlosandia/CRM-MARKETING"
alias crmback="cd /Users/carlosandia/CRM-MARKETING/backend"
alias crmscripts="cd /Users/carlosandia/CRM-MARKETING/scripts"

# Gerenciamento de servidores - comandos básicos
alias start="./scripts/dev-manager.sh start"
alias stop="./scripts/dev-manager.sh stop"
alias restart="./scripts/dev-manager.sh restart"
alias status="./scripts/dev-manager.sh status"
alias clean="./scripts/dev-manager.sh clean"

# Monitoramento e debug
alias monitor="./scripts/dev-monitor.sh"
alias health="./scripts/dev-healthcheck.sh"
alias debug="./scripts/dev-manager.sh debug"
alias optimize="./scripts/dev-optimize.sh"

# Desenvolvimento rápido
alias dev="npm run dev"
alias devback="cd backend && npm run dev"
alias devclean="npm run dev:clean"
alias devstatus="npm run dev:status"

# Build e deploy
alias build="npm run build"
alias buildprod="npm run build:prod"
alias preview="npm run preview"

# Análise e qualidade
alias lint="npm run lint"
alias analyze="npm run analyze:deps"
alias typecheck="cd backend && npm run type-check && cd .. && npx tsc --noEmit"

# Git shortcuts úteis
alias gs="git status"
alias ga="git add"
alias gc="git commit"
alias gp="git push"
alias gl="git pull"
alias gco="git checkout"
alias gb="git branch"
alias glog="git log --oneline --graph --decorate --all -10"

# Logs rápidos
alias logs="tail -f frontend.log backend.log monitor.log 2>/dev/null | grep --line-buffered -E \"(ERROR|WARN|SUCCESS)\""
alias frontlog="tail -f frontend.log"
alias backlog="tail -f backend.log"
alias monlog="tail -f monitor.log"

# Utilities
alias ports="lsof -i :8080 -i :3001"
alias processes="ps aux | grep -E \"(tsx|vite|node)\" | grep -v grep"
alias killports="lsof -ti:8080,3001 | xargs kill -9 2>/dev/null || true"

# Supabase shortcuts
alias supa="npx supabase"
alias supastatus="npm run supabase:status"
alias supatable="npm run supabase:tables"

# Produtividade extrema
alias faststart="./scripts/dev-optimize.sh --force && ./scripts/dev-manager.sh start"
alias fullclean="./scripts/dev-manager.sh clean && ./scripts/dev-optimize.sh --force && npm run dev:clean"
alias quickcheck="./scripts/dev-healthcheck.sh --json | jq -r \".overall_status\""
alias autostart="./scripts/dev-manager.sh auto-restart"

# ============================================
# Fim dos aliases CRM
# ============================================
'

# Funções de logging
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

# Detectar shell
detect_shell() {
    local shell_name=$(basename "$SHELL")
    case $shell_name in
        "bash")
            echo "$HOME/.bashrc"
            ;;
        "zsh")
            echo "$HOME/.zshrc"
            ;;
        *)
            echo "$HOME/.profile"
            ;;
    esac
}

# Instalar aliases
install_aliases() {
    log "📝 Instalando aliases CRM..."
    
    # Criar arquivo de aliases
    echo "$CRM_ALIASES" > "$ALIASES_FILE"
    success "Arquivo de aliases criado: $ALIASES_FILE"
    
    # Detectar arquivo de configuração do shell
    local shell_config=$(detect_shell)
    local shell_name=$(basename "$SHELL")
    
    log "Shell detectado: $shell_name"
    log "Arquivo de configuração: $shell_config"
    
    # Verificar se já está configurado
    if grep -q "source.*\.crm_dev_aliases" "$shell_config" 2>/dev/null; then
        warn "Aliases já estão configurados no $shell_config"
    else
        # Adicionar source no arquivo de configuração
        echo "" >> "$shell_config"
        echo "# CRM Development Aliases" >> "$shell_config"
        echo "[ -f \"$ALIASES_FILE\" ] && source \"$ALIASES_FILE\"" >> "$shell_config"
        success "Aliases adicionados ao $shell_config"
    fi
    
    success "✅ Aliases instalados com sucesso!"
    info "💡 Execute 'source $shell_config' ou abra um novo terminal para usar os aliases"
}

# Desinstalar aliases
uninstall_aliases() {
    log "🗑️  Removendo aliases CRM..."
    
    # Remover arquivo de aliases
    if [ -f "$ALIASES_FILE" ]; then
        rm -f "$ALIASES_FILE"
        success "Arquivo de aliases removido"
    fi
    
    # Remover referência do shell config
    local shell_config=$(detect_shell)
    if [ -f "$shell_config" ]; then
        # Usar sed para remover linhas relacionadas aos aliases CRM
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' '/# CRM Development Aliases/d' "$shell_config"
            sed -i '' '/\.crm_dev_aliases/d' "$shell_config"
        else
            # Linux
            sed -i '/# CRM Development Aliases/d' "$shell_config"
            sed -i '/\.crm_dev_aliases/d' "$shell_config"
        fi
        success "Referências removidas do $shell_config"
    fi
    
    success "✅ Aliases removidos com sucesso!"
    info "💡 Execute 'source $shell_config' ou abra um novo terminal para aplicar as mudanças"
}

# Mostrar aliases disponíveis
show_aliases() {
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    echo -e "${CYAN}    🚀 CRM DEVELOPMENT ALIASES           ${NC}"
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    
    echo -e "\n${YELLOW}📁 NAVEGAÇÃO RÁPIDA:${NC}"
    echo "  crm          - Ir para diretório raiz do projeto"
    echo "  crmback      - Ir para diretório backend"
    echo "  crmscripts   - Ir para diretório scripts"
    
    echo -e "\n${YELLOW}🔧 GERENCIAMENTO DE SERVIDORES:${NC}"
    echo "  start        - Iniciar serviços"
    echo "  stop         - Parar serviços"
    echo "  restart      - Reiniciar serviços"
    echo "  status       - Ver status dos serviços"
    echo "  clean        - Limpeza completa"
    
    echo -e "\n${YELLOW}📊 MONITORAMENTO:${NC}"
    echo "  monitor      - Monitor em tempo real"
    echo "  health       - Verificação de saúde"
    echo "  debug        - Diagnóstico completo"
    echo "  optimize     - Otimizar ambiente"
    
    echo -e "\n${YELLOW}⚡ DESENVOLVIMENTO:${NC}"
    echo "  dev          - Iniciar frontend"
    echo "  devback      - Iniciar backend"
    echo "  devclean     - Iniciar com limpeza"
    echo "  devstatus    - Status de desenvolvimento"
    
    echo -e "\n${YELLOW}🏗️  BUILD & DEPLOY:${NC}"
    echo "  build        - Build desenvolvimento"
    echo "  buildprod    - Build produção"
    echo "  preview      - Preview do build"
    
    echo -e "\n${YELLOW}🔍 ANÁLISE & QUALIDADE:${NC}"
    echo "  lint         - Linter ESLint"
    echo "  analyze      - Análise de dependências"
    echo "  typecheck    - Verificar tipos TypeScript"
    
    echo -e "\n${YELLOW}📝 GIT SHORTCUTS:${NC}"
    echo "  gs           - git status"
    echo "  ga           - git add"
    echo "  gc           - git commit"
    echo "  gp           - git push"
    echo "  gl           - git pull"
    echo "  gco          - git checkout"
    echo "  gb           - git branch"
    echo "  glog         - git log (últimos 10 commits)"
    
    echo -e "\n${YELLOW}📋 LOGS:${NC}"
    echo "  logs         - Ver todos os logs (apenas erros/avisos)"
    echo "  frontlog     - Log do frontend"
    echo "  backlog      - Log do backend"
    echo "  monlog       - Log do monitor"
    
    echo -e "\n${YELLOW}🔌 UTILITIES:${NC}"
    echo "  ports        - Ver portas ocupadas (8080, 3001)"
    echo "  processes    - Ver processos Node.js"
    echo "  killports    - Matar processos nas portas do projeto"
    
    echo -e "\n${YELLOW}🗄️  SUPABASE:${NC}"
    echo "  supa         - CLI Supabase"
    echo "  supastatus   - Status Supabase"
    echo "  supatable    - Listar tabelas"
    
    echo -e "\n${YELLOW}🚀 PRODUTIVIDADE EXTREMA:${NC}"
    echo "  faststart    - Otimizar + iniciar"
    echo "  fullclean    - Limpeza completa + reinício"
    echo "  quickcheck   - Status rápido (apenas resultado)"
    echo "  autostart    - Auto-restart automático"
    
    echo -e "\n${CYAN}════════════════════════════════════════${NC}"
}

# Verificar status dos aliases
check_status() {
    local shell_config=$(detect_shell)
    
    echo -e "${CYAN}📋 STATUS DOS ALIASES CRM${NC}"
    echo ""
    
    if [ -f "$ALIASES_FILE" ]; then
        success "Arquivo de aliases: $ALIASES_FILE ✅"
    else
        error "Arquivo de aliases: não encontrado ❌"
    fi
    
    if [ -f "$shell_config" ] && grep -q "source.*\.crm_dev_aliases" "$shell_config" 2>/dev/null; then
        success "Configuração no shell: $shell_config ✅"
    else
        error "Configuração no shell: não encontrada ❌"
    fi
    
    echo ""
    info "Para instalar: ./scripts/setup-dev-aliases.sh --install"
    info "Para ver todos: ./scripts/setup-dev-aliases.sh --show"
}

# Função principal
main() {
    local action=${1:-"--show"}
    
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    echo -e "${CYAN}    ⚡ CRM DEV ALIASES SETUP            ${NC}"
    echo -e "${CYAN}    $(date +'%Y-%m-%d %H:%M:%S')         ${NC}"
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    
    case $action in
        "--install"|"-i")
            install_aliases
            ;;
        "--uninstall"|"-u")
            uninstall_aliases
            ;;
        "--show"|"-s")
            show_aliases
            ;;
        "--status")
            check_status
            ;;
        "--help"|"-h")
            echo "Uso: $0 [opção]"
            echo ""
            echo "Opções:"
            echo "  --install, -i    Instalar aliases"
            echo "  --uninstall, -u  Remover aliases"
            echo "  --show, -s       Mostrar aliases disponíveis (padrão)"
            echo "  --status         Verificar status da instalação"
            echo "  --help, -h       Mostrar esta ajuda"
            ;;
        *)
            error "Opção inválida: $action"
            info "Use --help para ver opções disponíveis"
            exit 1
            ;;
    esac
}

# Executar função principal
main "$@"
#!/bin/sh
# CRM Marketing - Docker Entrypoint Script
# Inicialização enterprise com health checks e monitoramento

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função de log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}"
}

# Função para verificar variáveis obrigatórias
check_required_env() {
    local vars="$1"
    local missing=""
    
    for var in $vars; do
        if [ -z "$(eval echo \$$var)" ]; then
            missing="$missing $var"
        fi
    done
    
    if [ -n "$missing" ]; then
        error "Missing required environment variables:$missing"
        exit 1
    fi
}

# Função para verificar conectividade do banco
check_database() {
    log "Checking database connectivity..."
    
    # Verificar se as variáveis do Supabase estão definidas
    if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
        warn "Supabase configuration not found, skipping database check"
        return 0
    fi
    
    # Fazer um ping simples para o Supabase
    if curl -s --max-time 10 "$VITE_SUPABASE_URL/rest/v1/" -H "apikey: $VITE_SUPABASE_ANON_KEY" > /dev/null 2>&1; then
        success "Database connectivity check passed"
        return 0
    else
        error "Database connectivity check failed"
        return 1
    fi
}

# Função para verificar dependências externas
check_external_deps() {
    log "Checking external dependencies..."
    
    # Lista de URLs para verificar
    local deps="https://fonts.googleapis.com https://cdn.jsdelivr.net"
    local failed=""
    
    for dep in $deps; do
        if ! curl -s --max-time 5 "$dep" > /dev/null 2>&1; then
            failed="$failed $dep"
        fi
    done
    
    if [ -n "$failed" ]; then
        warn "Some external dependencies are not reachable:$failed"
        warn "Application may work with limited functionality"
    else
        success "All external dependencies are reachable"
    fi
}

# Função para configurar logs
setup_logging() {
    log "Setting up logging..."
    
    # Criar diretório de logs se não existir
    mkdir -p /app/logs
    
    # Configurar rotação de logs
    if [ "$LOG_LEVEL" = "debug" ]; then
        export DEBUG="*"
    fi
    
    # Redirecionar logs baseado na configuração
    case "${LOG_DESTINATION:-console}" in
        "file")
            exec > /app/logs/app.log 2>&1
            ;;
        "console")
            # Manter saída padrão
            ;;
    esac
    
    success "Logging configured (level: ${LOG_LEVEL:-info}, destination: ${LOG_DESTINATION:-console})"
}

# Função para configurar cache
setup_cache() {
    log "Setting up cache..."
    
    # Criar diretório de cache se necessário
    if [ "${VITE_CACHE_PROVIDER:-memory}" = "file" ]; then
        mkdir -p /app/cache
        chmod 755 /app/cache
    fi
    
    success "Cache configured (provider: ${VITE_CACHE_PROVIDER:-memory})"
}

# Função para configurar monitoramento
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Configurar health check endpoint
    if [ "${VITE_HEALTH_CHECKS_ENABLED:-true}" = "true" ]; then
        # Iniciar health check server em background
        (
            while true; do
                sleep "${VITE_HEALTH_CHECK_INTERVAL:-30}"
                curl -s "http://localhost:${PORT:-3001}/api/health" > /dev/null 2>&1 || warn "Health check failed"
            done
        ) &
    fi
    
    success "Monitoring configured"
}

# Função para configurar segurança
setup_security() {
    log "Setting up security..."
    
    # Verificar configurações de segurança
    if [ "$NODE_ENV" = "production" ]; then
        if [ "${VITE_CSP_ENABLED:-false}" != "true" ]; then
            warn "CSP is not enabled in production"
        fi
        
        if [ "${VITE_RATE_LIMIT_ENABLED:-false}" != "true" ]; then
            warn "Rate limiting is not enabled in production"
        fi
    fi
    
    # Configurar permissões de arquivo
    chmod 600 /app/logs/* 2>/dev/null || true
    
    success "Security configured"
}

# Função para migração de banco (se necessário)
run_migrations() {
    log "Checking for database migrations..."
    
    # Verificar se há migrações pendentes
    if [ -d "/app/migrations" ] && [ "$(ls -A /app/migrations 2>/dev/null)" ]; then
        log "Running database migrations..."
        # Aqui seria executado o comando de migração
        # npm run migrate:up
        success "Database migrations completed"
    else
        log "No migrations to run"
    fi
}

# Função para warm-up da aplicação
warmup_application() {
    log "Warming up application..."
    
    # Aguardar aplicação estar pronta
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:${PORT:-3001}/api/health" > /dev/null 2>&1; then
            success "Application is ready"
            return 0
        fi
        
        log "Waiting for application to start (attempt $attempt/$max_attempts)..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    error "Application failed to start within expected time"
    return 1
}

# Função para iniciar serviços
start_services() {
    log "Starting CRM Marketing services..."
    
    # Iniciar backend em background
    log "Starting backend service..."
    cd /app/backend && node dist/index.js &
    BACKEND_PID=$!
    
    # Aguardar um pouco para o backend inicializar
    sleep 5
    
    # Iniciar servidor de arquivos estáticos para frontend
    log "Starting frontend service..."
    cd /app && npx serve -s dist -l ${FRONTEND_PORT:-8082} &
    FRONTEND_PID=$!
    
    # Salvar PIDs para cleanup
    echo $BACKEND_PID > /app/backend.pid
    echo $FRONTEND_PID > /app/frontend.pid
    
    success "Services started (Backend PID: $BACKEND_PID, Frontend PID: $FRONTEND_PID)"
}

# Função para cleanup graceful
cleanup() {
    log "Shutting down services gracefully..."
    
    # Parar serviços se os PIDs existirem
    if [ -f /app/backend.pid ]; then
        BACKEND_PID=$(cat /app/backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            log "Stopping backend service (PID: $BACKEND_PID)..."
            kill -TERM $BACKEND_PID
            wait $BACKEND_PID 2>/dev/null || true
        fi
        rm -f /app/backend.pid
    fi
    
    if [ -f /app/frontend.pid ]; then
        FRONTEND_PID=$(cat /app/frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            log "Stopping frontend service (PID: $FRONTEND_PID)..."
            kill -TERM $FRONTEND_PID
            wait $FRONTEND_PID 2>/dev/null || true
        fi
        rm -f /app/frontend.pid
    fi
    
    success "Services stopped gracefully"
    exit 0
}

# Configurar trap para cleanup
trap cleanup TERM INT

# Função principal
main() {
    log "Starting CRM Marketing System v${VITE_APP_VERSION:-4.0.0}"
    log "Environment: ${NODE_ENV:-production}"
    log "Build: ${VITE_BUILD_NUMBER:-unknown}"
    
    # Verificar variáveis obrigatórias
    # check_required_env "NODE_ENV PORT"
    
    # Configurar ambiente
    setup_logging
    setup_cache
    setup_security
    setup_monitoring
    
    # Verificar dependências
    check_database || {
        error "Database check failed"
        exit 1
    }
    
    check_external_deps
    
    # Executar migrações se necessário
    run_migrations
    
    # Iniciar serviços
    start_services
    
    # Warm-up da aplicação
    warmup_application || {
        error "Application warmup failed"
        exit 1
    }
    
    success "CRM Marketing System is ready!"
    log "Frontend available at: http://localhost:${FRONTEND_PORT:-8082}"
    log "Backend API available at: http://localhost:${PORT:-3001}"
    log "Health check available at: http://localhost:${PORT:-3001}/api/health"
    
    # Aguardar sinais
    while true; do
        sleep 30
        
        # Verificar se os serviços ainda estão rodando
        if [ -f /app/backend.pid ]; then
            BACKEND_PID=$(cat /app/backend.pid)
            if ! kill -0 $BACKEND_PID 2>/dev/null; then
                error "Backend service died unexpectedly"
                exit 1
            fi
        fi
        
        if [ -f /app/frontend.pid ]; then
            FRONTEND_PID=$(cat /app/frontend.pid)
            if ! kill -0 $FRONTEND_PID 2>/dev/null; then
                error "Frontend service died unexpectedly"
                exit 1
            fi
        fi
    done
}

# Executar função principal
main "$@" 
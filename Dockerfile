# CRM Marketing - Dockerfile Otimizado para Produção Enterprise
# Multi-stage build para otimização de tamanho e segurança

# ================================
# Stage 1: Build Environment
# ================================
FROM node:18-alpine AS builder

# Metadados da imagem
LABEL maintainer="CRM Marketing Team"
LABEL version="4.0"
LABEL description="CRM Marketing System - Production Build"

# Instalar dependências do sistema necessárias para build
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Criar usuário não-root para build
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências primeiro (cache layer)
COPY package*.json ./
COPY backend/package*.json ./backend/

# Instalar dependências com cache otimizado
RUN npm ci --only=production --silent && \
    cd backend && npm ci --only=production --silent && \
    npm cache clean --force

# Copiar código fonte
COPY . .

# Configurar variáveis de build
ARG NODE_ENV=production
ARG VITE_APP_VERSION=4.0.0
ARG VITE_BUILD_NUMBER
ENV NODE_ENV=${NODE_ENV}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV VITE_BUILD_NUMBER=${VITE_BUILD_NUMBER}

# Build da aplicação frontend
RUN npm run build

# Build da aplicação backend
RUN cd backend && npm run build

# ================================
# Stage 2: Production Environment
# ================================
FROM node:18-alpine AS production

# Instalar dependências de runtime
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Criar usuário não-root para runtime
RUN addgroup -g 1001 -S nodejs && \
    adduser -S crm -u 1001 -G nodejs

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/backend/package*.json ./backend/

# Instalar apenas dependências de produção
RUN npm ci --only=production --silent && \
    cd backend && npm ci --only=production --silent && \
    npm cache clean --force

# Copiar aplicação buildada
COPY --from=builder --chown=crm:nodejs /app/dist ./dist
COPY --from=builder --chown=crm:nodejs /app/backend/dist ./backend/dist
COPY --from=builder --chown=crm:nodejs /app/public ./public

# Copiar arquivos de configuração
COPY --chown=crm:nodejs docker-entrypoint.sh /usr/local/bin/
COPY --chown=crm:nodejs nginx.conf /etc/nginx/nginx.conf

# Criar diretórios necessários
RUN mkdir -p /app/logs /app/tmp && \
    chown -R crm:nodejs /app

# Configurar permissões
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Configurar variáveis de ambiente de produção
ENV NODE_ENV=production
ENV PORT=3001
ENV FRONTEND_PORT=8082
ENV LOG_LEVEL=info
ENV HEALTH_CHECK_PORT=3000

# Expor portas
EXPOSE 3001 8082 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${HEALTH_CHECK_PORT}/health || exit 1

# Usar dumb-init para gerenciamento de processos
ENTRYPOINT ["dumb-init", "--"]

# Mudar para usuário não-root
USER crm

# Comando padrão
CMD ["/usr/local/bin/docker-entrypoint.sh"]

# ================================
# Stage 3: Development Environment
# ================================
FROM node:18-alpine AS development

# Instalar dependências de desenvolvimento
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    && rm -rf /var/cache/apk/*

# Criar usuário de desenvolvimento
RUN addgroup -g 1001 -S nodejs && \
    adduser -S dev -u 1001 -G nodejs

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY backend/package*.json ./backend/

# Instalar todas as dependências (incluindo dev)
RUN npm install && \
    cd backend && npm install

# Configurar variáveis de desenvolvimento
ENV NODE_ENV=development
ENV PORT=3001
ENV FRONTEND_PORT=8082

# Expor portas para desenvolvimento
EXPOSE 3001 8082 5173

# Health check para desenvolvimento
HEALTHCHECK --interval=60s --timeout=15s --start-period=120s --retries=2 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

USER dev

# Comando de desenvolvimento
CMD ["npm", "run", "dev"]

# ================================
# Stage 4: Testing Environment
# ================================
FROM builder AS testing

# Instalar dependências de teste
RUN npm install --only=dev

# Copiar arquivos de teste
COPY tests/ ./tests/
COPY jest.config.js ./
COPY cypress.config.ts ./

# Configurar ambiente de teste
ENV NODE_ENV=test
ENV CI=true

# Executar testes
RUN npm run test:unit && \
    npm run test:integration && \
    npm run build:test

# Comando de teste
CMD ["npm", "run", "test"]

# ================================
# Metadados finais
# ================================

# Labels para metadados
LABEL org.opencontainers.image.title="CRM Marketing System"
LABEL org.opencontainers.image.description="Sistema CRM completo para marketing e vendas"
LABEL org.opencontainers.image.version="4.0.0"
LABEL org.opencontainers.image.vendor="CRM Marketing Team"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/company/crm-marketing"
LABEL org.opencontainers.image.documentation="https://docs.crm-marketing.com"

# Volumes para dados persistentes
VOLUME ["/app/logs", "/app/uploads", "/app/backups"]

# Configurações de segurança
RUN echo "crm:x:1001:1001:CRM User:/app:/sbin/nologin" >> /etc/passwd 
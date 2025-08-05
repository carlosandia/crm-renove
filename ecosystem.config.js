/**
 * CONFIGURAÇÃO PM2 - CRM RENOVE MULTI-TENANT
 * Domínio: https://crm.renovedigital.com.br
 * Backend: Node.js Express + Supabase
 */

module.exports = {
  apps: [
    {
      // Aplicação principal - Backend
      name: 'crm-backend',
      script: './backend/dist/index.js', // Arquivo compilado
      cwd: '/var/www/crm', // Diretório do projeto
      
      // Configurações de ambiente
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '127.0.0.1'
      },
      
      // Configurações de processo
      instances: 2, // 2 instâncias para alta disponibilidade
      exec_mode: 'cluster',
      
      // Auto-restart
      autorestart: true,
      watch: false, // Desabilitado em produção
      max_memory_restart: '1G',
      
      // Logs
      log_file: '/var/log/pm2/crm-backend.log',
      out_file: '/var/log/pm2/crm-backend-out.log',
      error_file: '/var/log/pm2/crm-backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Advanced PM2 features
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Environment variables específicas
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '127.0.0.1',
        
        // Otimizações Node.js para produção
        NODE_OPTIONS: '--max-old-space-size=4096',
        UV_THREADPOOL_SIZE: 128,
        
        // Supabase (carregado do .env)
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        
        // URLs de produção
        VITE_FRONTEND_URL: 'https://crm.renovedigital.com.br',
        VITE_API_URL: 'https://crm.renovedigital.com.br/api',
        APP_URL: 'https://crm.renovedigital.com.br',
        
        // CORS
        ALLOWED_ORIGINS: 'https://crm.renovedigital.com.br',
        
        // Security
        JWT_SECRET: process.env.JWT_SECRET,
        HELMET_ENABLED: 'true',
        RATE_LIMIT_ENABLED: 'true',
        HTTPS_ONLY: 'true',
        
        // Logging
        LOG_LEVEL: 'error',
        LOG_TO_FILE: 'true'
      }
    }
  ],
  
  // Configuração de deploy (opcional)
  deploy: {
    production: {
      user: 'www-data',
      host: 'seu-servidor.com', // Substitua pelo IP/hostname do servidor
      ref: 'origin/main',
      repo: 'https://github.com/seu-usuario/crm-marketing.git', // Substitua pela URL do repo
      path: '/var/www/crm',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:prod && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  },
  
  // Configurações globais do PM2
  pmx: false, // Desabilitar PMX em produção simples
  
  // Configuração de monitoramento (opcional)
  monitoring: {
    http: true,
    https: false,
    port: 9615 // Porta para dashboard de monitoramento
  }
};

/**
 * COMANDOS ÚTEIS PM2:
 * 
 * Iniciar aplicação:
 * pm2 start ecosystem.config.js --env production
 * 
 * Parar aplicação:
 * pm2 stop crm-backend
 * 
 * Reiniciar aplicação:
 * pm2 restart crm-backend
 * 
 * Recarregar (zero downtime):
 * pm2 reload crm-backend
 * 
 * Ver logs:
 * pm2 logs crm-backend
 * 
 * Monitoramento:
 * pm2 monit
 * 
 * Status:
 * pm2 status
 * 
 * Salvar configuração atual:
 * pm2 save
 * 
 * Auto-start no boot:
 * pm2 startup
 * pm2 save
 * 
 * Dashboard web:
 * pm2 web
 */
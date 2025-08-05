/**
 * Constantes do sistema - URLs e configurações centralizadas
 * AIDEV-NOTE: Centralização para eliminar URLs hardcoded
 */

// URLs de produção
export const PRODUCTION_URLS = {
  BASE: 'https://crm.renovedigital.com.br',
  API: 'https://crm.renovedigital.com.br/api',
  FRONTEND: 'https://crm.renovedigital.com.br',
  BACKEND: 'https://crm.renovedigital.com.br',
  GOOGLE_CALLBACK: 'https://crm.renovedigital.com.br/auth/google/callback'
} as const;

// URLs de desenvolvimento (fallbacks necessários)
export const DEVELOPMENT_URLS = {
  API: 'http://127.0.0.1:3001/api',
  FRONTEND: 'http://127.0.0.1:8080',
  BACKEND: 'http://127.0.0.1:3001',
  GOOGLE_CALLBACK: 'http://127.0.0.1:8080/auth/google/callback'
} as const;

// CORS origins por ambiente
export const CORS_ORIGINS = {
  PRODUCTION: [PRODUCTION_URLS.BASE],
  DEVELOPMENT: ['http://127.0.0.1:8080', 'http://127.0.0.1:8081', 'http://127.0.0.1:3000']
} as const;

// Helper para obter URLs baseado no ambiente
export const getEnvironmentUrls = (environment: 'production' | 'development') => ({
  api: environment === 'production' ? PRODUCTION_URLS.API : DEVELOPMENT_URLS.API,
  frontend: environment === 'production' ? PRODUCTION_URLS.FRONTEND : DEVELOPMENT_URLS.FRONTEND,
  backend: environment === 'production' ? PRODUCTION_URLS.BACKEND : DEVELOPMENT_URLS.BACKEND,
  googleCallback: environment === 'production' ? PRODUCTION_URLS.GOOGLE_CALLBACK : DEVELOPMENT_URLS.GOOGLE_CALLBACK,
  corsOrigins: environment === 'production' ? CORS_ORIGINS.PRODUCTION : CORS_ORIGINS.DEVELOPMENT
});

// Helper para detecção de ambiente
export const isProduction = () => 
  import.meta.env.VITE_ENVIRONMENT === 'production' || 
  import.meta.env.NODE_ENV === 'production';

// URLs dinâmicas baseadas no ambiente
export const DYNAMIC_URLS = {
  get api() {
    return import.meta.env.VITE_API_URL || getEnvironmentUrls(isProduction() ? 'production' : 'development').api;
  },
  get frontend() {
    return import.meta.env.VITE_FRONTEND_URL || getEnvironmentUrls(isProduction() ? 'production' : 'development').frontend;
  },
  get backend() {
    return import.meta.env.VITE_BACKEND_URL || getEnvironmentUrls(isProduction() ? 'production' : 'development').backend;
  },
  get googleCallback() {
    return import.meta.env.VITE_GOOGLE_REDIRECT_URI || getEnvironmentUrls(isProduction() ? 'production' : 'development').googleCallback;
  },
  get corsOrigins() {
    return import.meta.env.VITE_CORS_ORIGINS?.split(',') || getEnvironmentUrls(isProduction() ? 'production' : 'development').corsOrigins;
  }
} as const;
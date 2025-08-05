/**
 * 🔧 Constantes e Configurações - Elimina duplicação de configurações
 * Centraliza todas as constantes usadas no CRM
 */

import { environmentConfig } from '../config/environment';

// ============================================
// CONFIGURAÇÕES DE PAGINAÇÃO
// ============================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 200
} as const;

// ============================================
// CONFIGURAÇÕES DE API
// ============================================

export const API = {
  TIMEOUT: 30000, // 30 segundos
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 segundo
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
  DEBOUNCE_DELAY: 300 // 300ms para search
} as const;

// ============================================
// STATUS DO SISTEMA
// ============================================

export const LEAD_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  CONVERTED: 'converted',
  LOST: 'lost'
} as const;

export const DEAL_STATUS = {
  OPEN: 'open',
  WON: 'won',
  LOST: 'lost',
  CANCELLED: 'cancelled'
} as const;

export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  OVERDUE: 'overdue'
} as const;

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MEMBER: 'member'
} as const;

// ============================================
// TEMPERATURAS DE LEAD
// ============================================

export const LEAD_TEMPERATURE = {
  HOT: 'hot',
  WARM: 'warm',
  COLD: 'cold'
} as const;

export const TEMPERATURE_COLORS = {
  [LEAD_TEMPERATURE.HOT]: 'text-red-600 bg-red-100',
  [LEAD_TEMPERATURE.WARM]: 'text-yellow-600 bg-yellow-100',
  [LEAD_TEMPERATURE.COLD]: 'text-blue-600 bg-blue-100'
} as const;

// ============================================
// CONFIGURAÇÕES DE FORMULÁRIO
// ============================================

export const FORM_VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 255,
  MAX_PHONE_LENGTH: 20,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_SEARCH_LENGTH: 2
} as const;

export const INPUT_MASKS = {
  CPF: '000.000.000-00',
  CNPJ: '00.000.000/0000-00',
  PHONE: '(00) 00000-0000',
  CEP: '00000-000'
} as const;

// ============================================
// CONFIGURAÇÕES DE ARQUIVO
// ============================================

export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.csv', '.xls', '.xlsx']
} as const;

// ============================================
// CONFIGURAÇÕES DE NOTIFICAÇÃO
// ============================================

export const NOTIFICATION = {
  DEFAULT_DURATION: 5000, // 5 segundos
  SUCCESS_DURATION: 3000,
  ERROR_DURATION: 10000,
  AUTO_DISMISS: true
} as const;

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const;

// ============================================
// CONFIGURAÇÕES DE CACHE
// ============================================

export const CACHE_KEYS = {
  USER_DATA: 'user_data',
  COMPANIES: 'companies',
  PIPELINES: 'pipelines',
  LEADS: 'leads',
  DEALS: 'deals',
  MEMBERS: 'members',
  FILTERS: 'filters',
  DASHBOARD_METRICS: 'dashboard_metrics'
} as const;

export const CACHE_DURATION_MINUTES = {
  SHORT: 5,
  MEDIUM: 15,
  LONG: 60,
  VERY_LONG: 1440 // 24 horas
} as const;

// ============================================
// CONFIGURAÇÕES DE BUSCA
// ============================================

export const SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 2,
  DEBOUNCE_DELAY: 300,
  MAX_RESULTS: 100,
  HIGHLIGHT_CLASS: 'bg-yellow-200 font-semibold'
} as const;

// ============================================
// CORES E TEMAS
// ============================================

export const COLORS = {
  PRIMARY: 'blue',
  SECONDARY: 'gray',
  SUCCESS: 'green',
  WARNING: 'yellow',
  ERROR: 'red',
  INFO: 'blue'
} as const;

export const STATUS_COLORS = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  PENDING: 'yellow',
  SUCCESS: 'green',
  ERROR: 'red',
  WARNING: 'yellow',
  INFO: 'blue'
} as const;

// ============================================
// CONFIGURAÇÕES DE MODAL
// ============================================

export const MODAL_SIZES = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl',
  FULL: 'full'
} as const;

export const MODAL_VARIANTS = {
  DEFAULT: 'blue',
  SUCCESS: 'green',
  WARNING: 'yellow',
  ERROR: 'red',
  INFO: 'blue'
} as const;

// ============================================
// CONFIGURAÇÕES DE PIPELINE
// ============================================

export const PIPELINE_STAGES = {
  SYSTEM_STAGES: {
    LEAD: 'Lead',
    CLOSED_WON: 'Ganho',
    CLOSED_LOST: 'Perdido'
  },
  DEFAULT_TEMPERATURE: {
    LEAD: 20,
    QUALIFIED: 40,
    PROPOSAL: 60,
    NEGOTIATION: 80,
    CLOSED_WON: 100,
    CLOSED_LOST: 0
  }
} as const;

// ============================================
// CONFIGURAÇÕES DE CADÊNCIA
// ============================================

export const CADENCE_CHANNELS = {
  EMAIL: 'email',
  PHONE: 'phone',
  WHATSAPP: 'whatsapp',
  TASK: 'task'
} as const;

export const CADENCE_INTERVALS = {
  IMMEDIATE: 0,
  SAME_DAY: 0,
  NEXT_DAY: 1,
  THREE_DAYS: 3,
  ONE_WEEK: 7,
  TWO_WEEKS: 14,
  ONE_MONTH: 30
} as const;

// ============================================
// CONFIGURAÇÕES DE RELATÓRIO
// ============================================

export const REPORT_PERIODS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  THIS_WEEK: 'this_week',
  LAST_WEEK: 'last_week',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  THIS_QUARTER: 'this_quarter',
  LAST_QUARTER: 'last_quarter',
  THIS_YEAR: 'this_year',
  LAST_YEAR: 'last_year',
  CUSTOM: 'custom'
} as const;

export const CHART_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
  '#EC4899', // pink-500
  '#6B7280'  // gray-500
] as const;

// ============================================
// REGEX PATTERNS
// ============================================

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_BR: /^\(?\d{2}\)?[\s-]?[\d]{4,5}[\s-]?[\d]{4}$/,
  CPF: /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/,
  CNPJ: /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/,
  CEP: /^\d{5}-?\d{3}$/,
  NUMBERS_ONLY: /^\d+$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/ 
} as const;

// ============================================
// CONFIGURAÇÕES DE PERMISSÕES
// ============================================

export const PERMISSIONS = {
  // Empresas
  VIEW_COMPANIES: 'view_companies',
  CREATE_COMPANIES: 'create_companies',
  EDIT_COMPANIES: 'edit_companies',
  DELETE_COMPANIES: 'delete_companies',
  
  // Leads
  VIEW_ALL_LEADS: 'view_all_leads',
  VIEW_OWN_LEADS: 'view_own_leads',
  CREATE_LEADS: 'create_leads',
  EDIT_ALL_LEADS: 'edit_all_leads',
  EDIT_OWN_LEADS: 'edit_own_leads',
  DELETE_LEADS: 'delete_leads',
  
  // Pipeline
  VIEW_PIPELINES: 'view_pipelines',
  CREATE_PIPELINES: 'create_pipelines',
  EDIT_PIPELINES: 'edit_pipelines',
  DELETE_PIPELINES: 'delete_pipelines',
  
  // Usuários
  VIEW_USERS: 'view_users',
  CREATE_USERS: 'create_users',
  EDIT_USERS: 'edit_users',
  DELETE_USERS: 'delete_users',
  
  // Relatórios
  VIEW_REPORTS: 'view_reports',
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_DATA: 'export_data'
} as const;

// ============================================
// CONFIGURAÇÕES DE LOCALIZAÇÃO
// ============================================

export const LOCALE = {
  LANGUAGE: 'pt-BR',
  CURRENCY: 'BRL',
  TIMEZONE: 'America/Sao_Paulo'
} as const;

export const DATE_FORMATS = {
  SHORT: 'dd/MM/yyyy',
  LONG: 'dd/MM/yyyy HH:mm',
  TIME_ONLY: 'HH:mm',
  ISO: 'yyyy-MM-dd'
} as const;

// ============================================
// CONFIGURAÇÕES DE AMBIENTE
// ============================================

export const isDevelopment = import.meta.env.MODE === 'development';
export const isProduction = import.meta.env.MODE === 'production';
export const isTest = import.meta.env.MODE === 'test';

export const ENVIRONMENT = {
  NODE_ENV: import.meta.env.MODE,
  IS_DEVELOPMENT: isDevelopment,
  IS_PRODUCTION: isProduction,
  IS_TEST: isTest,
  API_URL: environmentConfig.urls.api,
  SUPABASE_URL: environmentConfig.supabase.url,
  SUPABASE_ANON_KEY: environmentConfig.supabase.anonKey
} as const;

// ============================================
// CONFIGURAÇÕES DE LOGGING
// ============================================

export const LOGGING = {
  ENABLED_IN_DEVELOPMENT: true,
  ENABLED_IN_PRODUCTION: false,
  MAX_BUFFER_SIZE: 100,
  DEBOUNCE_DELAYS: {
    FAST: 500,
    MEDIUM: 1000,
    SLOW: 2000
  },
  PERFORMANCE_THRESHOLD: 1000 // ms
} as const;

// ============================================
// EXPORTAÇÕES CONVENIENTES
// ============================================

export const constants = {
  PAGINATION,
  API,
  LEAD_STATUS,
  DEAL_STATUS,
  TASK_STATUS,
  USER_ROLES,
  LEAD_TEMPERATURE,
  TEMPERATURE_COLORS,
  FORM_VALIDATION,
  INPUT_MASKS,
  FILE_UPLOAD,
  NOTIFICATION,
  NOTIFICATION_TYPES,
  CACHE_KEYS,
  CACHE_DURATION_MINUTES,
  SEARCH_CONFIG,
  COLORS,
  STATUS_COLORS,
  MODAL_SIZES,
  MODAL_VARIANTS,
  PIPELINE_STAGES,
  CADENCE_CHANNELS,
  CADENCE_INTERVALS,
  REPORT_PERIODS,
  CHART_COLORS,
  REGEX_PATTERNS,
  PERMISSIONS,
  LOCALE,
  DATE_FORMATS
}; 
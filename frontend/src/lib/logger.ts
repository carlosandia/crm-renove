// Utilitário de log para controlar mensagens no console
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  info: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`ℹ️ ${message}`, data || '');
    }
  },

  success: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`✅ ${message}`, data || '');
    }
  },

  warning: (message: string, data?: any) => {
    if (isDevelopment) {
      console.warn(`⚠️ ${message}`, data || '');
    }
  },

  error: (message: string, error?: any) => {
    if (isDevelopment) {
      console.error(`❌ ${message}`, error || '');
    }
  },

  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`🔍 ${message}`, data || '');
    }
  }
};

export default logger; 
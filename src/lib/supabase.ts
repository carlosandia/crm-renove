import { createClient } from '@supabase/supabase-js';
import { appConfig } from '../config/app';

// Configurações do Supabase a partir da configuração centralizada
const supabaseUrl = appConfig.supabase.url;
const supabaseAnonKey = appConfig.supabase.anonKey;

// Cliente Supabase configurado para o frontend
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Desabilitar persistência automática (usaremos JWT manual)
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    // Configurações de segurança
    flowType: 'pkce'
  },
  // Configurações globais
  global: {
    headers: {
      'X-Client-Info': 'crm-marketing-frontend'
    }
  },
  // Configurações da base
  db: {
    schema: 'public'
  },
  // Configurações de real-time (se necessário)
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

export default supabase; 
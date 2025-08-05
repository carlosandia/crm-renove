import { createClient } from '@supabase/supabase-js';

// ✅ CONFIGURAÇÕES SIMPLIFICADAS - 100% Supabase nativo
function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://marajvabdwkpgopytvhh.supabase.co';
  // ✅ CORREÇÃO CRÍTICA: SERVICE_ROLE_KEY deve vir APENAS do ambiente
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';
  
  return { supabaseUrl, supabaseServiceKey, supabaseAnonKey };
}

// ✅ CORREÇÃO PROBLEMA #7: Lazy initialization para evitar execução imediata no import
let _config: { supabaseUrl: string; supabaseServiceKey: string; supabaseAnonKey: string } | null = null;

function ensureConfig() {
  if (!_config) {
    const { supabaseUrl, supabaseServiceKey, supabaseAnonKey } = getSupabaseConfig();
    
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL é obrigatória');
    }
    
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY é obrigatória e deve estar definida na variável de ambiente');
    }
    
    _config = { supabaseUrl, supabaseServiceKey, supabaseAnonKey };
  }
  return _config;
}

// ✅ CLIENTE SUPABASE SIMPLIFICADO - Service Role direto
let _supabaseServiceClient: any = null;

function getSupabaseServiceClient() {
  if (!_supabaseServiceClient) {
    const { supabaseUrl, supabaseServiceKey } = ensureConfig(); // ✅ Usar lazy initialization
    
    console.log('🔍 [SUPABASE] Inicializando cliente service_role para operações administrativas');
    
    _supabaseServiceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
    
    console.log('✅ [SUPABASE] Cliente service_role criado com acesso direto');
  }
  return _supabaseServiceClient;
}

// ✅ CORREÇÃO CRÍTICA: Proxy transparente para lazy initialization com tipo correto
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    const client = getSupabaseServiceClient();
    const value = client[prop];
    // Se for uma função, fazer bind para manter o contexto
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

// Função para criar cliente Supabase com JWT do usuário (respeitará RLS)
export const createUserSupabaseClient = (userJWT: string) => {
  const { supabaseUrl, supabaseAnonKey } = ensureConfig(); // ✅ Usar lazy initialization
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${userJWT}`
      }
    }
  });
};

export default supabase; 
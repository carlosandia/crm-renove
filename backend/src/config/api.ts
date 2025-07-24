interface ApiConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  backendUrl: string;
}

export const getApiConfig = (): ApiConfig => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3001';

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is required');
  }

  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY is required');
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey,
    backendUrl
  };
}; 
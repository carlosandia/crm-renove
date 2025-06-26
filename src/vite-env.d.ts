/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  
  // Google Calendar Integration
  readonly VITE_GOOGLE_CLIENT_ID?: string
  readonly VITE_GOOGLE_CLIENT_SECRET?: string
  readonly VITE_GOOGLE_REDIRECT_URI?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 
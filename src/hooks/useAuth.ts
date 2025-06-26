import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Sistema de logs condicionais
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'warn';
const isDebugMode = LOG_LEVEL === 'debug';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null
  });

  const checkSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Erro ao verificar sessão:', error.message);
        setAuthState(prev => ({ ...prev, error: error.message, loading: false }));
        return;
      }

      // Log apenas em modo debug
      if (isDebugMode) {
        console.log('🔐 Sessão verificada:', session ? 'Ativa' : 'Inativa');
      }

      setAuthState({
        user: session?.user || null,
        session: session,
        loading: false,
        error: null
      });
    } catch (error: any) {
      console.error('❌ Erro crítico na verificação de sessão:', error);
      setAuthState(prev => ({ ...prev, error: error.message, loading: false }));
    }
  }, []);

  useEffect(() => {
    // Verificação inicial
    checkSession();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Log apenas eventos importantes
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          console.log(`🔐 Auth: ${event}`);
        } else if (isDebugMode) {
          console.log(`🔐 Auth event: ${event}`);
        }

        setAuthState({
          user: session?.user || null,
          session: session,
          loading: false,
          error: null
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [checkSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Erro no login:', error.message);
        setAuthState(prev => ({ ...prev, error: error.message, loading: false }));
        return { success: false, error: error.message };
      }

      console.log('✅ Login realizado com sucesso');
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Erro crítico no login:', error);
      setAuthState(prev => ({ ...prev, error: error.message, loading: false }));
      return { success: false, error: error.message };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Erro no logout:', error.message);
        return { success: false, error: error.message };
      }

      console.log('✅ Logout realizado com sucesso');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erro crítico no logout:', error);
      return { success: false, error: error.message };
    }
  }, []);

  return {
    ...authState,
    signIn,
    signOut,
    checkSession
  };
} 
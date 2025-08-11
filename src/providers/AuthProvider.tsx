import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { User } from '../types/User';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// AIDEV-NOTE: AuthProvider ULTRA SIMPLIFICADO - sistema básico do Supabase
// Eliminada complexidade desnecessária, foco em funcionalidade básica

interface AuthContextType {
  user: User | null;
  loading: boolean;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

// AIDEV-NOTE: Conversão simplificada - usando apenas dados da sessão + TOKEN
const convertSupabaseUser = (supabaseUser: SupabaseUser, session?: Session | null): User => {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    first_name: supabaseUser.user_metadata?.first_name || '',
    last_name: supabaseUser.user_metadata?.last_name || '',
    role: supabaseUser.user_metadata?.role || 'admin', // padrão simples
    tenant_id: supabaseUser.user_metadata?.tenant_id || 'd7caffc1-c923-47c8-9301-ca9eeff1a243', // padrão do banco
    is_active: true, // sempre ativo para login básico
    created_at: supabaseUser.created_at || new Date().toISOString(), // incluir created_at
    token: session?.access_token || '' // ✅ CORREÇÃO: incluir token JWT
  };
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  // AIDEV-NOTE: fetchUserData removida - usando sistema básico direto da sessão

  // ✅ CORREÇÃO CRÍTICA: Função de login memoizada para evitar re-renders
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('🔑 [AUTH] Iniciando login:', { email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ [AUTH] Erro no login:', error);
        return {
          success: false,
          message: error.message || 'Erro ao fazer login'
        };
      }

      if (!data.user || !data.session) {
        return {
          success: false,
          message: 'Falha na autenticação'
        };
      }

      console.log('✅ [AUTH] Login realizado com sucesso');
      return {
        success: true,
        message: 'Login realizado com sucesso'
      };

    } catch (error) {
      console.error('❌ [AUTH] Erro crítico no login:', error);
      return {
        success: false,
        message: 'Erro interno do sistema'
      };
    }
  }, []);

  // ✅ CORREÇÃO CRÍTICA: Função de logout memoizada para evitar re-renders
  const logout = useCallback(async (): Promise<void> => {
    try {
      console.log('🔑 [AUTH] Fazendo logout...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ [AUTH] Erro no logout:', error);
      } else {
        console.log('✅ [AUTH] Logout realizado com sucesso');
      }
      
    } catch (error) {
      console.error('❌ [AUTH] Erro crítico no logout:', error);
    }
  }, []);

  // ✅ MIGRAÇÃO CONCLUÍDA: Sistema migrado para autenticação básica Supabase
  // Todas as operações usam supabase.auth.getUser() + RLS policies

  // AIDEV-NOTE: Funções JWT customizadas removidas
  // O sistema agora usa 100% refresh automático do Supabase

  // AIDEV-NOTE: Inicialização ULTRA SIMPLES - sistema básico do Supabase
  useEffect(() => {
    console.log('🔄 [AUTH] Inicializando AuthProvider SIMPLIFICADO...');

    // PASSO 1: Inicialização básica - sem queries extras
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 [AUTH] Sessão inicial:', session ? `${session.user.email}` : 'nenhuma');
      
      setSession(session);
      setUser(session?.user ? convertSupabaseUser(session.user, session) : null);
      setLoading(false); // CRÍTICO: sempre vira false aqui
      
      if (session?.user) {
        console.log('✅ [AUTH] Login básico realizado:', session.user.email, {
          hasToken: !!session.access_token,
          tokenLength: session.access_token?.length || 0
        });
      }
    });

    // PASSO 2: Listener simples - sem queries extras
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // ✅ THROTTLING: Log apenas mudanças significativas para reduzir spam
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ [AUTH] Usuário logado (simples):', session.user.email, {
          hasToken: !!session.access_token
        });
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 [AUTH] Usuário deslogado');
      } else if (event !== 'INITIAL_SESSION') {
        // Só logar outros eventos se não for INITIAL_SESSION
        console.log('🔄 [AUTH] Auth state changed:', event, session ? session.user.email : 'no session');
      }
      
      setSession(session);
      setUser(session?.user ? convertSupabaseUser(session.user, session) : null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ✅ SIMPLIFICADO: contextValue apenas com funções essenciais Supabase  
  const contextValue: AuthContextType = useMemo(() => ({
    user,
    loading,
    session,
    login,
    logout
  }), [user, loading, session, login, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
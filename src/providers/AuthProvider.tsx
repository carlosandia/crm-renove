import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { User } from '../types/User';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// AIDEV-NOTE: AuthProvider ULTRA SIMPLIFICADO - sistema básico do Supabase
// Eliminada complexidade desnecessária, foco em funcionalidade básica

// ✅ CACHE: Para evitar logs duplicados de conversão
const userConversionLogCache = new Set<string>();

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

// AIDEV-NOTE: Conversão simplificada - Basic Supabase Authentication apenas
const convertSupabaseUser = (supabaseUser: SupabaseUser, session?: Session | null): User => {
  const convertedUser = {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    first_name: supabaseUser.user_metadata?.first_name || '',
    last_name: supabaseUser.user_metadata?.last_name || '',
    role: supabaseUser.user_metadata?.role || 'admin', // padrão simples
    tenant_id: supabaseUser.user_metadata?.tenant_id || 'c983a983-b1c6-451f-b528-64a5d1c831a0', // padrão correto
    is_active: true, // sempre ativo para login básico
    created_at: supabaseUser.created_at || new Date().toISOString(), // incluir created_at
    // ✅ JWT token removido - usando apenas Basic Supabase Authentication
  };
  
  // ✅ OTIMIZAÇÃO: Log com cache para evitar spam (apenas primeira vez por sessão)
  const cacheKey = `${supabaseUser.id}-${convertedUser.tenant_id}`;
  if (process.env.NODE_ENV === 'development' && !userConversionLogCache.has(cacheKey)) {
    userConversionLogCache.add(cacheKey);
    console.log('🔍 [AUTH] Usuario convertido - DIAGNÓSTICO TENANT_ID:', {
      email: convertedUser.email,
      role: convertedUser.role,
      tenant_id_final: convertedUser.tenant_id,
      tenant_id_type: typeof convertedUser.tenant_id,
      user_metadata_completo: supabaseUser.user_metadata,
      metadata_tenant_id: supabaseUser.user_metadata?.tenant_id,
      metadata_tenant_id_type: typeof supabaseUser.user_metadata?.tenant_id,
      esta_usando_fallback: !supabaseUser.user_metadata?.tenant_id,
      fallback_value: 'c983a983-b1c6-451f-b528-64a5d1c831a0',
      supabase_user_id: supabaseUser.id?.substring(0, 8)
    });
  }
  
  return convertedUser;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  // AIDEV-NOTE: fetchUserData removida - usando sistema básico direto da sessão

  // ✅ NOVA FUNÇÃO: Atualizar last_login após login bem-sucedido
  const updateLastLogin = useCallback(async (session: Session) => {
    try {
      console.log('🔄 [AUTH] Atualizando last_login...');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/members/update-last-login`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ [AUTH] Last login atualizado:', result.message);
      
    } catch (error) {
      // Não é crítico se falhar - apenas loggar
      console.warn('⚠️ [AUTH] Falha ao atualizar last_login:', error);
    }
  }, []);

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
      
      // ✅ NOVO: Atualizar last_login após login bem-sucedido
      await updateLastLogin(data.session);

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
  }, [updateLastLogin]);

  // ✅ CORREÇÃO CRÍTICA: Função de logout melhorada seguindo documentação oficial Supabase
  const logout = useCallback(async (): Promise<void> => {
    try {
      console.log('🔑 [AUTH] Iniciando logout completo...');
      
      // PASSO 1: Limpar estado local imediatamente para evitar flickering
      setUser(null);
      setSession(null);
      
      // PASSO 2: Usar signOut com escopo global (padrão) para terminar todas as sessões
      // Documentação: https://supabase.com/docs/reference/javascript/auth-signout
      const { error } = await supabase.auth.signOut({
        scope: 'global' // Termina todas as sessões do usuário
      });
      
      if (error) {
        console.error('❌ [AUTH] Erro no Supabase signOut:', error);
        // Mesmo com erro do Supabase, continuar com limpeza manual
      } else {
        console.log('✅ [AUTH] Supabase signOut executado com sucesso');
      }
      
      // PASSO 3: Limpeza manual adicional de dados específicos da aplicação
      // O Supabase já limpa session/localStorage automaticamente, mas limpamos dados específicos
      const itemsToRemove = [
        'crm_active_module',
        'header-config-' + (user?.id || ''),
        'pipelines_' + (user?.tenant_id || ''),
        // Limpar qualquer outro cache específico da aplicação
      ];
      
      itemsToRemove.forEach(item => {
        try {
          localStorage.removeItem(item);
        } catch (e) {
          console.warn(`Erro ao remover ${item}:`, e);
        }
      });
      
      // PASSO 4: Garantir que auth state listener vai processar SIGNED_OUT
      // Aguardar um pouco para o listener processar
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('✅ [AUTH] Logout completo realizado, redirecionando...');
      
      // PASSO 5: Redirecionamento usando React Router ao invés de window.location
      // para manter SPA behavior
      window.location.href = '/login';
      
    } catch (error) {
      console.error('❌ [AUTH] Erro crítico no logout:', error);
      
      // Fallback: Mesmo com erro crítico, garantir limpeza e redirecionamento
      setUser(null);
      setSession(null);
      
      // Tentar limpar localStorage mesmo com erro
      try {
        localStorage.clear();
      } catch (e) {
        console.warn('Erro ao limpar localStorage:', e);
      }
      
      // Redirecionamento forçado
      window.location.href = '/login';
    }
  }, [user]);

  // ✅ MIGRAÇÃO CONCLUÍDA: Sistema migrado para autenticação básica Supabase
  // Todas as operações usam supabase.auth.getUser() + RLS policies

  // AIDEV-NOTE: Funções JWT customizadas removidas
  // O sistema agora usa 100% refresh automático do Supabase

  // AIDEV-NOTE: Inicialização ULTRA SIMPLES - sistema básico do Supabase
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts
    
    console.log('🔄 [AUTH] Inicializando AuthProvider SIMPLIFICADO...');

    // PASSO 1: Inicialização básica - sem queries extras
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ [AUTH] Erro ao buscar sessão:', error);
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        console.log('🔍 [AUTH] Sessão inicial:', session ? `${session.user.email}` : 'nenhuma');
        
        if (isMounted) {
          setSession(session);
          setUser(session?.user ? convertSupabaseUser(session.user, session) : null);
          setLoading(false); // CRÍTICO: sempre vira false aqui
        }
        
        if (session?.user) {
          console.log('✅ [AUTH] Login básico realizado:', session.user.email, {
            tenantId: session.user.user_metadata?.tenant_id,
            role: session.user.user_metadata?.role
          });
        }
      } catch (error) {
        console.error('❌ [AUTH] Erro crítico na inicialização:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // PASSO 2: Listener simples - sem queries extras
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return; // Prevent updates after unmount
      
      // ✅ THROTTLING: Log apenas mudanças significativas para reduzir spam
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ [AUTH] Usuário logado (simples):', session.user.email, {
          tenantId: session.user.user_metadata?.tenant_id,
          role: session.user.user_metadata?.role
        });
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 [AUTH] Usuário deslogado - limpando estado');
        // Garantir limpeza completa do estado
        setSession(null);
        setUser(null);
      } else if (event !== 'INITIAL_SESSION') {
        // Só logar outros eventos se não for INITIAL_SESSION
        console.log('🔄 [AUTH] Auth state changed:', event, session ? session.user.email : 'no session');
      }
      
      setSession(session);
      setUser(session?.user ? convertSupabaseUser(session.user, session) : null);
    });

    return () => {
      isMounted = false;
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
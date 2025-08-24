import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { User } from '../types/User';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { migrateUserToAppMetadata, checkMigrationStatus } from '../utils/migrateToAppMetadata';

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

// AIDEV-NOTE: Conversão melhorada - prioriza app_metadata (seguro) sobre user_metadata
const convertSupabaseUser = (supabaseUser: SupabaseUser, session?: Session | null): User => {
  // ✅ CORREÇÃO SEGURANÇA: Priorizar app_metadata sobre user_metadata
  const userMetadata = supabaseUser.user_metadata || {};
  const appMetadata = supabaseUser.app_metadata || {};
  
  // Prioridade: app_metadata > user_metadata > fallback
  const tenantIdFromAppMetadata = appMetadata.tenant_id;
  const tenantIdFromUserMetadata = userMetadata.tenant_id;
  const fallbackTenantId = 'c983a983-b1c6-451f-b528-64a5d1c831a0'; // ✅ tenant_id REAL do banco
  
  const finalTenantId = tenantIdFromAppMetadata || tenantIdFromUserMetadata || fallbackTenantId;
  const tenantIdSource = tenantIdFromAppMetadata ? 'app_metadata (SECURE)' : 
                        tenantIdFromUserMetadata ? 'user_metadata (NEEDS MIGRATION)' : 
                        'fallback (NEEDS SETUP)';
  
  const convertedUser = {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    first_name: userMetadata.first_name || '',
    last_name: userMetadata.last_name || '',
    role: userMetadata.role || appMetadata.role || 'admin', // priorizar app_metadata para role também
    tenant_id: finalTenantId, // ✅ SEMPRE garantir tenant_id com prioridade segura
    is_active: true, // sempre ativo para login básico
    created_at: supabaseUser.created_at || new Date().toISOString(), // incluir created_at
    // ✅ JWT token removido - usando apenas Basic Supabase Authentication
  };
  
  // ✅ OTIMIZAÇÃO: Log com cache para evitar spam (apenas primeira vez por sessão)
  const cacheKey = `${supabaseUser.id}-${convertedUser.tenant_id}`;
  if (process.env.NODE_ENV === 'development' && !userConversionLogCache.has(cacheKey)) {
    userConversionLogCache.add(cacheKey);
    console.log('🔍 [AUTH] Usuario convertido - MIGRAÇÃO app_metadata IMPLEMENTADA:', {
      email: convertedUser.email,
      role: convertedUser.role,
      tenant_id_final: convertedUser.tenant_id,
      tenant_id_source: tenantIdSource,
      migration_status: {
        has_app_metadata_tenant_id: !!tenantIdFromAppMetadata,
        has_user_metadata_tenant_id: !!tenantIdFromUserMetadata,
        needs_migration: !tenantIdFromAppMetadata && !!tenantIdFromUserMetadata,
        secure: !!tenantIdFromAppMetadata
      },
      metadata_comparison: {
        app_metadata: appMetadata,
        user_metadata: userMetadata
      },
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

  // ✅ CORREÇÃO CRÍTICA: Função para garantir sincronização de sessão
  const ensureSessionSynchronization = useCallback(async (session: Session): Promise<boolean> => {
    try {
      console.log('🔄 [AUTH] Garantindo sincronização de sessão...');
      
      // ETAPA 1: Definir sessão explicitamente no cliente
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });
      
      if (setSessionError) {
        console.error('❌ [AUTH] Erro ao definir sessão:', setSessionError);
        return false;
      }
      
      // ETAPA 2: Aguardar propagação da sessão
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // ETAPA 3: Validar se auth.uid() funciona
      const { data: validation, error: validationError } = await supabase.auth.getUser();
      
      if (validationError || !validation.user) {
        console.error('❌ [AUTH] Validação falhou:', validationError);
        return false;
      }
      
      console.log('✅ [AUTH] Sessão sincronizada com sucesso - auth.uid() funciona');
      return true;
      
    } catch (error) {
      console.error('❌ [AUTH] Erro na sincronização de sessão:', error);
      return false;
    }
  }, []);

  // ✅ NOVA FUNÇÃO: Forçar re-autenticação quando auth.uid() falha
  const forceReAuthentication = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔄 [AUTH] Forçando re-autenticação para corrigir auth.uid()...');
      
      // PASSO 1: Verificar se há sessão local armazenada
      const { data: { session: localSession }, error: localError } = await supabase.auth.getSession();
      
      if (localError || !localSession) {
        console.error('❌ [AUTH] Nenhuma sessão local encontrada para re-autenticação');
        return false;
      }
      
      // PASSO 2: Forçar refresh da sessão
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: localSession.refresh_token
      });
      
      if (refreshError || !refreshData.session) {
        console.error('❌ [AUTH] Falha no refresh da sessão:', refreshError);
        return false;
      }
      
      // PASSO 3: Definir sessão refreshed explicitamente
      const { error: setError } = await supabase.auth.setSession({
        access_token: refreshData.session.access_token,
        refresh_token: refreshData.session.refresh_token
      });
      
      if (setError) {
        console.error('❌ [AUTH] Falha ao definir sessão refreshed:', setError);
        return false;
      }
      
      // PASSO 4: Aguardar propagação e validar
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: validation, error: validationError } = await supabase.auth.getUser();
      
      if (validationError || !validation.user) {
        console.error('❌ [AUTH] Re-autenticação falhou na validação:', validationError);
        return false;
      }
      
      console.log('✅ [AUTH] Re-autenticação forçada bem-sucedida - auth.uid() funcionando');
      
      // PASSO 5: Atualizar estado local com sessão corrigida
      setSession(refreshData.session);
      setUser(convertSupabaseUser(refreshData.session.user, refreshData.session));
      
      return true;
      
    } catch (error) {
      console.error('❌ [AUTH] Erro crítico na re-autenticação forçada:', error);
      return false;
    }
  }, []);

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
      
      // ✅ CORREÇÃO CRÍTICA: Garantir sincronização de sessão antes de continuar
      const sessionSynchronized = await ensureSessionSynchronization(data.session);
      
      if (!sessionSynchronized) {
        console.error('❌ [AUTH] Falha na sincronização de sessão - login pode falhar');
        return {
          success: false,
          message: 'Erro na sincronização de sessão'
        };
      }
      
      // ✅ Atualizar estado local apenas após sincronização confirmada
      setSession(data.session);
      setUser(convertSupabaseUser(data.user, data.session));
      
      // ✅ NOVO: Migração automática para app_metadata (segurança)
      try {
        console.log('🔄 [AUTH] Verificando necessidade de migração para app_metadata...');
        const migrationStatus = await checkMigrationStatus();
        
        if (migrationStatus.needsMigration) {
          console.log('🔄 [AUTH] Migração necessária, iniciando processo...');
          const migrationResult = await migrateUserToAppMetadata();
          
          if (migrationResult.success) {
            console.log('✅ [AUTH] Migração para app_metadata concluída com sucesso');
            // Refresh do usuário para pegar app_metadata atualizado
            const { data: refreshedUser } = await supabase.auth.getUser();
            if (refreshedUser.user) {
              setUser(convertSupabaseUser(refreshedUser.user, data.session));
            }
          } else {
            console.warn('⚠️ [AUTH] Migração falhou, continuando com user_metadata:', migrationResult.message);
          }
        } else {
          console.log('✅ [AUTH] Migração não necessária, usando app_metadata:', migrationStatus.tenantId);
        }
      } catch (migrationError) {
        console.error('❌ [AUTH] Erro na migração, continuando normalmente:', migrationError);
      }
      
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
    console.log('🔍 [AUTH] Cliente Supabase:', typeof supabase, !!supabase);
    
    // ✅ DIAGNÓSTICO SIMPLES: Verificar localStorage básico
    if (import.meta.env.DEV) {
      try {
        const authTokenKey = 'sb-crm-auth-token';
        const storedSession = localStorage.getItem(authTokenKey);
        console.log('🔍 [AUTH] Sessão localStorage:', storedSession ? 'encontrada' : 'não encontrada');
      } catch (error) {
        console.warn('⚠️ [AUTH] Erro ao verificar localStorage:', error);
      }
    }

    // PASSO 1: Inicialização básica com sincronização garantida
    const initializeAuth = async () => {
      try {
        console.log('🔍 [AUTH] Buscando sessão do Supabase...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ [AUTH] Erro ao buscar sessão:', error);
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        if (import.meta.env.DEV) {
          console.log('🔍 [AUTH] Sessão:', session ? session.user?.email : 'nenhuma');
        }
        
        if (isMounted) {
          // ✅ CORREÇÃO CRÍTICA: Se há sessão, garantir sincronização ANTES de definir estado
          if (session) {
            console.log('🔄 [AUTH] Sessão encontrada - garantindo sincronização...');
            
            // OBRIGATÓRIO: Sincronizar sessão com cliente Supabase antes de continuar
            const sessionSyncResult = await ensureSessionSynchronization(session);
            
            if (sessionSyncResult) {
              console.log('✅ [AUTH] Sessão sincronizada com sucesso na inicialização');
              
              // ✅ VALIDAÇÃO ADICIONAL: Testar se auth.uid() funciona após sincronização
              const { data: uidTest, error: uidError } = await supabase.auth.getUser();
              if (uidTest?.user?.id) {
                console.log('✅ [AUTH] auth.uid() confirmado funcionando:', uidTest.user.id.substring(0, 8));
                
                // Definir estado apenas após sincronização confirmada
                setSession(session);
                setUser(convertSupabaseUser(session.user, session));
              } else {
                console.error('❌ [AUTH] auth.uid() ainda não funciona após sincronização básica:', uidError);
                console.log('🔄 [AUTH] Tentando re-autenticação forçada...');
                
                // ✅ FALLBACK: Tentar re-autenticação forçada
                const reAuthResult = await forceReAuthentication();
                
                if (!reAuthResult) {
                  console.error('❌ [AUTH] Re-autenticação forçada falhou - removendo sessão inválida');
                  
                  // Se tudo falhou, remover sessão inválida
                  await supabase.auth.signOut({ scope: 'local' });
                  setSession(null);
                  setUser(null);
                }
                // Se re-autenticação funcionou, estado já foi definido na função forceReAuthentication
              }
            } else {
              console.error('❌ [AUTH] Falha crítica na sincronização - removendo sessão inválida');
              
              // Se sincronização falhou, remover sessão inválida
              await supabase.auth.signOut({ scope: 'local' });
              setSession(null);
              setUser(null);
            }
          } else {
            // Sem sessão - estado normal de não autenticado
            setSession(null);
            setUser(null);
          }
          
          setLoading(false); // CRÍTICO: sempre vira false aqui
        }
        
        if (session?.user && import.meta.env.DEV) {
          console.log('✅ [AUTH] Usuário autenticado:', session.user.email);
        }
      } catch (error) {
        console.error('❌ [AUTH] Erro crítico na inicialização:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // PASSO 2: Listener simples e direto
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return; // Prevent updates after unmount
      
      // ✅ CORREÇÃO CRÍTICA: Sempre sincronizar estado local com sessão Supabase
      setSession(session);
      setUser(session?.user ? convertSupabaseUser(session.user, session) : null);
      
      // Log simples apenas em desenvolvimento
      if (import.meta.env.DEV && event === 'SIGNED_IN' && session?.user) {
        console.log('✅ [AUTH] Login realizado:', session.user.email);
      } else if (import.meta.env.DEV && event === 'SIGNED_OUT') {
        console.log('👋 [AUTH] Logout realizado');
      }
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
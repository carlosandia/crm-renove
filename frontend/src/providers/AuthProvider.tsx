
import React, { useState, useEffect } from 'react';
import AuthContext from '../contexts/AuthContext';
import { User } from '../types/User';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';
const supabase = createClient(supabaseUrl, supabaseKey);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão existente
    const checkSession = async () => {
      try {
        console.log('🔍 Verificando sessão existente...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('✅ Sessão encontrada:', session.user.email);
          await loadUserData(session.user.id);
        } else {
          console.log('ℹ️ Nenhuma sessão ativa encontrada');
        }
      } catch (error) {
        console.error('❌ Erro ao verificar sessão:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, session?.user?.email || 'sem usuário');
      
      if (session?.user) {
        await loadUserData(session.user.id);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (authUserId: string) => {
    try {
      console.log('🔄 Carregando dados do usuário com auth_user_id:', authUserId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) {
        console.error('❌ Erro ao carregar dados do usuário por auth_user_id:', error);
        
        // Tentar buscar por ID direto como fallback
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUserId)
          .single();

        if (fallbackError) {
          console.error('❌ Erro no fallback por ID:', fallbackError);
          return;
        }

        console.log('✅ Dados do usuário carregados via fallback:', {
          id: fallbackData.id,
          email: fallbackData.email,
          role: fallbackData.role,
          tenant_id: fallbackData.tenant_id,
          is_active: fallbackData.is_active
        });
        
        setUser(fallbackData);
        return;
      }

      console.log('✅ Dados do usuário carregados:', {
        id: data.id,
        email: data.email,
        role: data.role,
        tenant_id: data.tenant_id,
        is_active: data.is_active
      });
      
      setUser(data);
    } catch (error) {
      console.error('💥 Erro ao carregar usuário:', error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      console.log('🔐 Tentando fazer login com:', email);
      
      // Primeiro, tentar login direto no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authData.user && !authError) {
        console.log('✅ Login direto bem-sucedido:', authData.user.email);
        await loadUserData(authData.user.id);
        setLoading(false);
        return true;
      }

      // Se login falhou, verificar se usuário existe na nossa tabela
      console.log('⚠️ Login direto falhou, verificando usuário na tabela...');
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        console.log('❌ Usuário não encontrado na tabela users');
        setLoading(false);
        return false;
      }

      console.log('✅ Usuário encontrado na tabela users:', userData.email);

      // Se usuário existe na tabela mas não tem auth_user_id, criar no Supabase Auth
      if (!userData.auth_user_id) {
        console.log('🔄 Usuário sem auth_user_id, criando no Supabase Auth...');
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              first_name: userData.first_name,
              last_name: userData.last_name,
              role: userData.role,
              tenant_id: userData.tenant_id
            }
          }
        });

        if (signUpError) {
          console.error('❌ Erro ao criar usuário no Supabase Auth:', signUpError.message);
          setLoading(false);
          return false;
        }

        if (signUpData.user) {
          console.log('✅ Usuário criado no Supabase Auth:', signUpData.user.email);
          
          // Confirmar email automaticamente para usuários admin/super_admin
          if (userData.role && ['super_admin', 'admin'].includes(userData.role)) {
            try {
              await supabase.auth.admin.updateUserById(signUpData.user.id, {
                email_confirm: true
              });
              console.log('✅ Email confirmado automaticamente para admin');
            } catch (confirmError) {
              console.log('⚠️ Não foi possível confirmar email automaticamente, mas continuando...');
            }
          }
          
          // Atualizar o auth_user_id na nossa tabela
          await supabase
            .from('users')
            .update({ auth_user_id: signUpData.user.id })
            .eq('email', email);

          console.log('✅ auth_user_id atualizado na tabela users');

          // Tentar fazer login novamente
          const { data: retryAuthData, error: retryAuthError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (retryAuthError) {
            console.error('❌ Erro no login após criação:', retryAuthError.message);
            setLoading(false);
            return false;
          }

          if (retryAuthData.user) {
            console.log('✅ Login bem-sucedido após criação no Auth');
            await loadUserData(retryAuthData.user.id);
            setLoading(false);
            return true;
          }
        }
      } else {
        // Usuário tem auth_user_id mas login falhou - pode ser problema de senha
        console.log('❌ Usuário tem auth_user_id mas credenciais inválidas');
        setLoading(false);
        return false;
      }
      
      setLoading(false);
      return false;
    } catch (error) {
      console.error('💥 Erro no login:', error);
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    console.log('🚪 Fazendo logout...');
    try {
      await supabase.auth.signOut();
      setUser(null);
      console.log('✅ Logout realizado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

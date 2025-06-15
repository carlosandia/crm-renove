
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

  const loadUserData = async (userId: string) => {
    try {
      console.log('🔄 Carregando dados do usuário:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Erro ao carregar dados do usuário:', error);
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
      
      // Primeiro verificar se o usuário existe na nossa tabela
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

      // Tentar fazer login com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error('❌ Erro de autenticação no Supabase Auth:', authError.message);
        
        // Se o erro for "Invalid login credentials", pode ser que o usuário não tenha sido criado no Auth
        if (authError.message.includes('Invalid login credentials')) {
          console.log('⚠️ Credenciais inválidas - usuário pode não existir no Supabase Auth');
          
          // Tentar criar o usuário no Supabase Auth com a senha padrão
          console.log('🔄 Tentando criar usuário no Supabase Auth...');
          
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
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
            
            // Atualizar o ID do auth na nossa tabela
            await supabase
              .from('users')
              .update({ id: signUpData.user.id })
              .eq('email', email);

            // Tentar fazer login novamente
            const { data: retryAuthData, error: retryAuthError } = await supabase.auth.signInWithPassword({
              email,
              password
            });

            if (retryAuthError) {
              console.error('❌ Erro no segundo login:', retryAuthError.message);
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
        }
        
        setLoading(false);
        return false;
      }

      // Se login com Supabase Auth foi bem-sucedido
      if (authData.user) {
        console.log('✅ Login bem-sucedido:', authData.user.email);
        
        // Verificar se o ID bate com nossa tabela, senão atualizar
        if (userData.id !== authData.user.id) {
          console.log('🔄 Atualizando ID do usuário na tabela...');
          await supabase
            .from('users')
            .update({ id: authData.user.id })
            .eq('email', email);
        }
        
        await loadUserData(authData.user.id);
      }
      
      setLoading(false);
      return true;
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

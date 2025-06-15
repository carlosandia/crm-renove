
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
      
      // Tentar fazer login com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error('❌ Erro de autenticação:', authError);
        
        // Fallback para usuários de demonstração
        console.log('🔄 Tentando usuários de demonstração...');
        const demoUsers = [
          { id: '1', email: 'superadmin@crm.com', password: '123456', first_name: 'Super', last_name: 'Admin', role: 'super_admin' as const, tenant_id: '550e8400-e29b-41d4-a716-446655440000', is_active: true, created_at: new Date().toISOString() },
          { id: '2', email: 'admin@crm.com', password: '123456', first_name: 'Admin', last_name: 'User', role: 'admin' as const, tenant_id: '550e8400-e29b-41d4-a716-446655440000', is_active: true, created_at: new Date().toISOString() },
          { id: '3', email: 'member@crm.com', password: '123456', first_name: 'Member', last_name: 'User', role: 'member' as const, tenant_id: '550e8400-e29b-41d4-a716-446655440000', is_active: true, created_at: new Date().toISOString() }
        ];

        const foundUser = demoUsers.find(u => u.email === email && u.password === password);
        
        if (foundUser) {
          console.log('✅ Login com usuário de demonstração:', foundUser.email);
          const { password: _, ...userWithoutPassword } = foundUser;
          setUser(userWithoutPassword);
          setLoading(false);
          return true;
        }
        
        console.log('❌ Credenciais inválidas');
        setLoading(false);
        return false;
      }

      // Se login com Supabase Auth foi bem-sucedido
      if (authData.user) {
        console.log('✅ Login bem-sucedido com Supabase Auth:', authData.user.email);
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

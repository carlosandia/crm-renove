import React, { useState, useEffect } from 'react';
import AuthContext from '../contexts/AuthContext';
import { User } from '../types/User';
import { logger } from '../lib/logger';
import { appConfig } from '../config/app';

// URL da API a partir da configuração centralizada
const API_BASE_URL = appConfig.api.baseUrl;

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    tokens: AuthTokens;
  };
  message: string;
}

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('🔥 AuthProvider - Estado atual:', { user: user?.email, loading });

  /**
   * Fazer request autenticado para a API
   */
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const tokens = getStoredTokens();
    
    if (!tokens) {
      throw new Error('Não autenticado');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.accessToken}`,
      ...options.headers,
    };

    let response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    // Se token expirou, tentar renovar
    if (response.status === 401) {
      const newTokens = await refreshTokens();
      if (newTokens) {
        // Tentar novamente com token renovado
        response = await fetch(`${API_BASE_URL}${url}`, {
          ...options,
          headers: {
            ...headers,
            'Authorization': `Bearer ${newTokens.accessToken}`,
          },
        });
      }
    }

    return response;
  };

  /**
   * Armazenar tokens de forma segura
   */
  const storeTokens = (tokens: AuthTokens) => {
    // Usar sessionStorage para tokens (mais seguro que localStorage para JWTs)
    sessionStorage.setItem('crm_access_token', tokens.accessToken);
    sessionStorage.setItem('crm_refresh_token', tokens.refreshToken);
    sessionStorage.setItem('crm_token_expires', 
      (Date.now() + tokens.expiresIn * 1000).toString()
    );
  };

  /**
   * Obter tokens armazenados
   */
  const getStoredTokens = (): AuthTokens | null => {
    const accessToken = sessionStorage.getItem('crm_access_token');
    const refreshToken = sessionStorage.getItem('crm_refresh_token');
    const expiresAt = sessionStorage.getItem('crm_token_expires');

    if (!accessToken || !refreshToken || !expiresAt) {
      return null;
    }

    // Verificar se token ainda é válido
    const now = Date.now();
    const expires = parseInt(expiresAt);
    
    if (now >= expires) {
      // Token expirado, limpar storage
      clearTokens();
      return null;
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.floor((expires - now) / 1000),
      tokenType: 'Bearer'
    };
  };

  /**
   * Limpar tokens armazenados
   */
  const clearTokens = () => {
    sessionStorage.removeItem('crm_access_token');
    sessionStorage.removeItem('crm_refresh_token');
    sessionStorage.removeItem('crm_token_expires');
    // Manter localStorage para compatibilidade
    localStorage.removeItem('crm_user');
  };

  /**
   * Renovar tokens usando refresh token
   */
  const refreshTokens = async (): Promise<AuthTokens | null> => {
    try {
      const refreshToken = sessionStorage.getItem('crm_refresh_token');
      
      if (!refreshToken) {
        logger.warning('Refresh token não encontrado');
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        logger.error('Erro ao renovar tokens:', data.error);
        clearTokens();
        setUser(null);
        return null;
      }

      const newTokens = data.data.tokens;
      storeTokens(newTokens);
      
      logger.success('Tokens renovados com sucesso');
      return newTokens;

    } catch (error) {
      logger.error('Erro ao renovar tokens:', error);
      clearTokens();
      setUser(null);
      return null;
    }
  };

  /**
   * Verificar se usuário está autenticado na inicialização - VERSÃO SIMPLIFICADA
   */
  useEffect(() => {
    const checkAuth = () => {
      console.log('🔍 AuthProvider - Verificando autenticação...');
      
      try {
        // Verificar se há usuário salvo no localStorage (modo de demonstração)
        const savedUser = localStorage.getItem('crm_user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            console.log('✅ Usuário encontrado no localStorage:', parsedUser.email);
            setUser(parsedUser);
          } catch (error) {
            console.error('❌ Erro ao parser usuário do localStorage:', error);
            localStorage.removeItem('crm_user');
            setUser(null);
          }
        } else {
          console.log('ℹ️ Nenhum usuário encontrado - redirecionando para login');
          setUser(null);
        }

      } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
        setUser(null);
      } finally {
        setLoading(false);
        console.log('🏁 AuthProvider - Verificação de autenticação concluída');
      }
    };

    // Executar verificação síncrona para evitar problemas
    checkAuth();
  }, []);

  /**
   * Login com email e senha
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('🔐 Tentando fazer login com:', email);
    setLoading(true);
    
    try {
      // Credenciais de demonstração (hardcoded para funcionar offline)
      const demoUsers = [
        {
          email: 'superadmin@crm.com',
          password: 'SuperAdmin123!',
          user: {
            id: '1',
            email: 'superadmin@crm.com',
            first_name: 'Super',
            last_name: 'Admin',
            role: 'super_admin' as const,
            tenant_id: 'demo',
            is_active: true,
            created_at: new Date().toISOString()
          }
        },
        {
          email: 'admin@crm.com',
          password: '123456',
          user: {
            id: '2',
            email: 'admin@crm.com',
            first_name: 'Admin',
            last_name: 'User',
            role: 'admin' as const,
            tenant_id: 'demo',
            is_active: true,
            created_at: new Date().toISOString()
          }
        },
        {
          email: 'member@crm.com',
          password: '123456',
          user: {
            id: '3',
            email: 'member@crm.com',
            first_name: 'Member',
            last_name: 'User',
            role: 'member' as const,
            tenant_id: 'demo',
            is_active: true,
            created_at: new Date().toISOString()
          }
        }
      ];

      const demoUser = demoUsers.find(u => u.email === email && u.password === password);
      
      if (demoUser) {
        // Login local de demonstração
        const userData = demoUser.user;
        const loginTime = new Date().toISOString();
        
        setUser(userData);

        // Salvar no localStorage
        localStorage.setItem('crm_user', JSON.stringify({
          ...userData,
          loginTime: loginTime
        }));

        console.log('✅ Login de demonstração realizado com sucesso!');
        setLoading(false);
        return true;
      }

      // Tentar login via Supabase (validação direta no banco)
      try {
        console.log('🔍 Tentando login via Supabase...');
        
        // Importar supabase dinamicamente para evitar problemas de dependência
        const { supabase } = await import('../lib/supabase');
        
        // Buscar usuário pelo email
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email.toLowerCase().trim())
          .eq('is_active', true)
          .single();

        if (userError || !userData) {
          console.log('❌ Usuário não encontrado ou inativo:', email);
          setLoading(false);
          return false;
        }

        // Verificar senha
        const storedPassword = userData.password_hash || '';
        if (storedPassword !== password) {
          console.log('❌ Senha incorreta para:', email);
          setLoading(false);
          return false;
        }

        // Login bem-sucedido - atualizar last_login
        const loginTime = new Date().toISOString();
        
        // Tentar atualizar last_login no banco
        try {
          await supabase
            .from('users')
            .update({ last_login: loginTime })
            .eq('id', userData.id);
          console.log('✅ Last login atualizado no banco para:', userData.email);
        } catch (updateError) {
          console.log('⚠️ Erro ao atualizar last_login no banco (coluna pode não existir):', updateError);
        }

        // Sempre salvar no localStorage como backup
        const loginKey = `last_login_${userData.id}`;
        localStorage.setItem(loginKey, loginTime);
        console.log('✅ Last login salvo no localStorage para:', userData.email);

        const userObject = {
          id: userData.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role as 'super_admin' | 'admin' | 'member',
          tenant_id: userData.tenant_id || 'default',
          is_active: userData.is_active,
          created_at: userData.created_at
        };

        setUser(userObject);

        // Salvar no localStorage
        localStorage.setItem('crm_user', JSON.stringify({
          ...userObject,
          loginTime: loginTime
        }));

        console.log('✅ Login via Supabase realizado com sucesso!', userObject.email);
        setLoading(false);
        return true;

      } catch (supabaseError) {
        console.log('⚠️ Erro no login via Supabase:', supabaseError);
        setLoading(false);
        return false;
      }

    } catch (error) {
      console.error('❌ Erro no login:', error);
      setLoading(false);
      return false;
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    console.log('🚪 Fazendo logout...');
    
    try {
      // Limpar dados locais
      clearTokens();
      setUser(null);
      
      console.log('✅ Logout realizado com sucesso');

    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
      // Forçar limpeza mesmo com erro
      clearTokens();
      setUser(null);
    }
  };

  console.log('🔄 AuthProvider - Renderizando contexto');

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading,
      authenticatedFetch,
      refreshTokens
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
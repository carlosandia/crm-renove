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
   * Verificar se usuário está autenticado na inicialização
   */
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 AuthProvider - Verificando autenticação...');
      
      try {
        setLoading(true);

        // Verificar se há usuário salvo no localStorage (modo de demonstração)
        const savedUser = localStorage.getItem('crm_user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            console.log('✅ Usuário encontrado no localStorage:', parsedUser.email);
            setUser(parsedUser);
            setLoading(false);
            return;
          } catch (error) {
            console.error('❌ Erro ao parser usuário do localStorage:', error);
            localStorage.removeItem('crm_user');
          }
        }

        // Se não há usuário salvo, verificar tokens
        const tokens = getStoredTokens();
        
        if (!tokens) {
          console.log('ℹ️ Nenhum token válido encontrado');
          setLoading(false);
          return;
        }

        // Verificar usuário no backend (apenas se backend estiver disponível)
        try {
          const response = await authenticatedFetch('/auth/me');
          const data = await response.json();

          if (response.ok && data.success) {
            const userData = data.data.user;
            setUser(userData);
            
            // Manter no localStorage para compatibilidade
            localStorage.setItem('crm_user', JSON.stringify({
              ...userData,
              loginTime: new Date().toISOString()
            }));
            
            console.log('✅ Usuário autenticado via backend:', userData.email);
          } else {
            console.log('⚠️ Token inválido ou usuário não encontrado no backend');
            clearTokens();
            setUser(null);
          }
        } catch (error) {
          console.log('⚠️ Backend indisponível, usando modo offline');
          // Em caso de erro de rede, não limpar usuário se existe no localStorage
        }

      } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
      } finally {
        setLoading(false);
        console.log('🏁 AuthProvider - Verificação de autenticação concluída');
      }
    };

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
        setUser(userData);

        // Salvar no localStorage
        localStorage.setItem('crm_user', JSON.stringify({
          ...userData,
          loginTime: new Date().toISOString()
        }));

        console.log('✅ Login de demonstração realizado com sucesso!');
        setLoading(false);
        return true;
      }

      // Tentar login no backend se credenciais não são de demo
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data: LoginResponse = await response.json();

        if (!response.ok || !data.success) {
          console.log('❌ Login falhou:', data.message || 'Credenciais inválidas');
          setLoading(false);
          return false;
        }

        // Armazenar tokens
        storeTokens(data.data.tokens);

        // Armazenar dados do usuário
        const userData = data.data.user;
        setUser(userData);

        // Manter no localStorage para compatibilidade
        localStorage.setItem('crm_user', JSON.stringify({
          ...userData,
          loginTime: new Date().toISOString()
        }));

        console.log('✅ Login via backend realizado com sucesso!');
        setLoading(false);
        return true;

      } catch (error) {
        console.error('❌ Erro ao conectar com backend:', error);
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
      // Notificar backend sobre logout (se disponível)
      try {
        await authenticatedFetch('/auth/logout', {
          method: 'POST',
        });
      } catch (error) {
        // Ignorar erros de logout no backend
        console.log('⚠️ Erro ao notificar logout no backend:', error);
      }

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
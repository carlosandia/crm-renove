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

  // 🆕 Sistema de monitoramento automático de tokens
  React.useEffect(() => {
    let tokenMonitorInterval: NodeJS.Timeout;
    
    const startTokenMonitoring = () => {
      console.log('🔄 [TOKEN-MONITOR] Iniciando monitoramento automático de tokens...');
      
      tokenMonitorInterval = setInterval(async () => {
        const tokens = getStoredTokens();
        if (!tokens) {
          console.log('🔍 [TOKEN-MONITOR] Nenhum token encontrado, interrompendo monitoramento');
          return;
        }
        
        const expiresAt = sessionStorage.getItem('crm_token_expires');
        if (!expiresAt) {
          console.log('⚠️ [TOKEN-MONITOR] Token sem timestamp de expiração');
          return;
        }
        
        const now = Date.now();
        const expires = parseInt(expiresAt);
        const threeMinutesFromNow = now + (3 * 60 * 1000); // 3 minutos (mais agressivo)
        const timeToExpire = Math.floor((expires - now) / 1000 / 60); // minutos
        
        console.log(`🕐 [TOKEN-MONITOR] Status do token: expira em ${timeToExpire} minutos (${new Date(expires).toLocaleTimeString()})`);
        
        // Se token expira nos próximos 3 minutos, renovar automaticamente
        if (threeMinutesFromNow >= expires) {
          console.log(`⚠️ [TOKEN-MONITOR] Token expira em ${timeToExpire} minutos, renovando automaticamente...`);
          console.log(`🔄 [TOKEN-MONITOR] Tipo de token: ${tokens.accessToken.startsWith('demo_') ? 'DEMO' : 'JWT'}`);
          
          try {
            const newTokens = await refreshTokens();
            if (newTokens) {
              console.log('✅ [TOKEN-MONITOR] Tokens renovados automaticamente com sucesso!');
              console.log(`🔑 [TOKEN-MONITOR] Novo token expira em: ${new Date(Date.now() + newTokens.expiresIn * 1000).toLocaleTimeString()}`);
            } else {
              console.log('❌ [TOKEN-MONITOR] Falha na renovação automática - tokens inválidos');
            }
          } catch (error) {
            console.error('❌ [TOKEN-MONITOR] Erro na renovação automática:', error);
          }
        } else {
          console.log(`✅ [TOKEN-MONITOR] Token válido por mais ${timeToExpire} minutos`);
        }
      }, 30000); // Verificar a cada 30 segundos (mais agressivo)
    };
    
    // Iniciar monitoramento se há usuário logado
    if (user && !loading) {
      startTokenMonitoring();
    }
    
    return () => {
      if (tokenMonitorInterval) {
        clearInterval(tokenMonitorInterval);
        console.log('🛑 [TOKEN-MONITOR] Monitoramento de tokens interrompido');
      }
    };
  }, [user, loading]);

  /**
   * 🔧 CORREÇÃO: Fazer request autenticado com melhor tratamento de erro
   */
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    console.log('🌐 [AUTH-FETCH] Iniciando requisição autenticada:', url);
    
    const tokens = getStoredTokens();
    
    if (!tokens) {
      console.error('❌ [AUTH-FETCH] Tokens não encontrados');
      throw new Error('Usuário não autenticado');
    }

    // Headers padrão com autenticação
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.accessToken}`,
      ...(options.headers as Record<string, string> || {}),
    };

    // 🔧 CORREÇÃO CRÍTICA 2: Adicionar headers para tokens demo
    if (tokens.accessToken.startsWith('demo_token_') && user) {
      headers['X-User-ID'] = user.id;
      headers['X-User-Role'] = user.role;
      headers['X-Tenant-ID'] = user.tenant_id || '';
      console.log('🔑 [AUTH-FETCH] Headers demo adicionados para token:', tokens.accessToken.substring(0, 20));
    }

    console.log('📤 [AUTH-FETCH] Headers da requisição:', {
      url: `${API_BASE_URL}/api${url}`,
      method: options.method || 'GET',
      authorization: `Bearer ${tokens.accessToken.substring(0, 20)}...`,
      hasUserHeaders: tokens.accessToken.startsWith('demo_token_')
    });

    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api${url}`, {
        ...options,
        mode: 'cors',
        credentials: 'include',
        headers,
      });
    } catch (fetchError) {
      console.error('❌ [AUTH-FETCH] Erro de rede/CORS:', fetchError);
      // Se há erro de CORS/rede, tentar fallback sem credentials
      console.log('🔄 [AUTH-FETCH] Tentando fallback sem credentials...');
      response = await fetch(`${API_BASE_URL}/api${url}`, {
        ...options,
        mode: 'cors',
        credentials: 'omit', // Remover credentials se houver problema CORS
        headers,
      });
    }

    console.log('📥 [AUTH-FETCH] Resposta recebida:', {
      status: response.status,
      statusText: response.statusText,
      url: url
    });

    // Se token expirou, tentar renovar
    if (response.status === 401) {
      console.log('⚠️ [AUTH-FETCH] Token expirado (401), tentando renovar...');
      const newTokens = await refreshTokens();
      if (newTokens) {
        console.log('✅ [AUTH-FETCH] Tokens renovados, tentando novamente...');
        
        // Atualizar headers com novo token
        const newHeaders: Record<string, string> = {
          ...headers,
          'Authorization': `Bearer ${newTokens.accessToken}`,
        };

        // Para tokens demo renovados, atualizar headers
        if (newTokens.accessToken.startsWith('demo_token_') && user) {
          newHeaders['X-User-ID'] = user.id;
          newHeaders['X-User-Role'] = user.role;
          newHeaders['X-Tenant-ID'] = user.tenant_id || '';
        }

        // Tentar novamente com token renovado
        console.log('🔄 [AUTH-FETCH] Tentativa 2 com token renovado...');
        response = await fetch(`${API_BASE_URL}/api${url}`, {
          ...options,
          mode: 'cors',
          credentials: 'include',
          headers: newHeaders,
        });

        console.log('📥 [AUTH-FETCH] Resposta tentativa 2:', {
          status: response.status,
          statusText: response.statusText
        });
      } else {
        console.error('❌ [AUTH-FETCH] Falha ao renovar tokens para:', url);
        clearTokens();
        setUser(null);
        throw new Error('Sessão expirada - faça login novamente');
      }
    }

    if (!response.ok) {
      console.warn('⚠️ [AUTH-FETCH] Resposta não-ok recebida:', {
        url,
        status: response.status,
        statusText: response.statusText
      });
    } else {
      console.log('✅ [AUTH-FETCH] Requisição bem-sucedida:', url);
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
   * 🔧 CORREÇÃO: Obter tokens armazenados com lógica melhorada
   */
  const getStoredTokens = (): AuthTokens | null => {
    const accessToken = sessionStorage.getItem('crm_access_token');
    const refreshToken = sessionStorage.getItem('crm_refresh_token');
    const expiresAt = sessionStorage.getItem('crm_token_expires');

    if (!accessToken || !refreshToken) {
      console.log('🔍 [GET-TOKENS] Tokens não encontrados no sessionStorage');
      return null;
    }

    // Se não tem expiresAt, assumir que é válido (para tokens demo antigos)
    if (!expiresAt) {
      console.log('⚠️ [GET-TOKENS] Token sem expiração, assumindo válido (demo)');
      return {
        accessToken,
        refreshToken,
        expiresIn: 24 * 60 * 60, // 24 horas default
        tokenType: 'Bearer'
      };
    }

    // Verificar se token ainda é válido (com margem de 5 minutos)
    const now = Date.now();
    const expires = parseInt(expiresAt);
    const fiveMinutes = 5 * 60 * 1000; // 5 minutos em ms
    
    if (now >= (expires - fiveMinutes)) {
      console.log('⏰ [GET-TOKENS] Token próximo do vencimento ou expirado:', {
        now: new Date(now).toLocaleTimeString(),
        expires: new Date(expires).toLocaleTimeString(),
        isExpired: now >= expires
      });
      
      // Se é token demo, renovar automaticamente
      if (accessToken.startsWith('demo_token_')) {
        console.log('🔄 [GET-TOKENS] Auto-renovando token demo...');
        const newDemoTokens: AuthTokens = {
          accessToken: `demo_token_${Date.now()}_${user?.id || 'demo'}`,
          refreshToken: `demo_refresh_${Date.now()}_${user?.id || 'demo'}`,
          expiresIn: 24 * 60 * 60, // 24 horas
          tokenType: 'Bearer' as const
        };
        storeTokens(newDemoTokens);
        return newDemoTokens;
      }
      
      // Para tokens reais expirados, retornar null para forçar refresh
    if (now >= expires) {
        console.log('❌ [GET-TOKENS] Token real expirado, limpando storage');
      clearTokens();
      return null;
    }
    }

    const timeToExpire = Math.floor((expires - now) / 1000);
    console.log('✅ [GET-TOKENS] Tokens válidos encontrados, expira em:', Math.floor(timeToExpire / 60), 'minutos');

    return {
      accessToken,
      refreshToken,
      expiresIn: timeToExpire,
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
    console.log('🔄 [REFRESH-TOKENS] Iniciando processo de renovação de tokens...');
    
    try {
      const refreshToken = sessionStorage.getItem('crm_refresh_token');
      const currentTokens = getStoredTokens();
      
      if (!refreshToken) {
        console.error('❌ [REFRESH-TOKENS] Refresh token não encontrado no sessionStorage');
        logger.warning('Refresh token não encontrado');
        return null;
      }

      console.log(`🔍 [REFRESH-TOKENS] Refresh token encontrado (tipo: ${refreshToken.startsWith('demo_') ? 'DEMO' : 'JWT'})`);

      // 🔧 CORREÇÃO: Verificar se é token demo
      if (refreshToken.startsWith('demo_refresh_')) {
        console.log('🔧 [REFRESH-TOKENS] Token demo detectado, renovando automaticamente...');
        
        // Para tokens demo, simplesmente renovar com novos tokens demo
        const currentUser = user;
        if (currentUser) {
          const newDemoTokens: AuthTokens = {
            accessToken: `demo_token_${Date.now()}_${currentUser.id}`,
            refreshToken: `demo_refresh_${Date.now()}_${currentUser.id}`,
            expiresIn: 24 * 60 * 60, // 24 horas para demo
            tokenType: 'Bearer' as const
          };
          
          storeTokens(newDemoTokens);
          console.log('✅ [REFRESH-TOKENS] Tokens demo renovados automaticamente');
          console.log(`🕐 [REFRESH-TOKENS] Novo token demo expira em: ${new Date(Date.now() + newDemoTokens.expiresIn * 1000).toLocaleTimeString()}`);
          return newDemoTokens;
        } else {
          console.log('⚠️ [REFRESH-TOKENS] Token demo sem usuário, limpando tokens...');
          clearTokens();
          setUser(null);
          return null;
        }
      }

      // Para tokens reais, fazer requisição ao backend
      console.log('🌐 [REFRESH-TOKENS] Fazendo requisição para renovar tokens JWT...');
      console.log(`📤 [REFRESH-TOKENS] Endpoint: ${API_BASE_URL}/api/auth/refresh`);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      console.log(`📥 [REFRESH-TOKENS] Resposta recebida: ${response.status} ${response.statusText}`);

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('❌ [REFRESH-TOKENS] Falha na renovação:', {
          status: response.status,
          error: data.error,
          message: data.message
        });
        logger.error('Erro ao renovar tokens:', data.error);
        clearTokens();
        setUser(null);
        return null;
      }

      const newTokens = data.data.tokens;
      storeTokens(newTokens);
      
      console.log('✅ [REFRESH-TOKENS] Tokens JWT renovados com sucesso!');
      console.log(`🔑 [REFRESH-TOKENS] Novo token expira em: ${new Date(Date.now() + newTokens.expiresIn * 1000).toLocaleTimeString()}`);
      console.log(`⏱️ [REFRESH-TOKENS] Duração do token: ${newTokens.expiresIn / 60} minutos`);
      
      logger.success('Tokens renovados com sucesso');
      return newTokens;

    } catch (error) {
      console.error('❌ [REFRESH-TOKENS] Erro crítico na renovação:', error);
      logger.error('Erro ao renovar tokens:', error);
      clearTokens();
      setUser(null);
      return null;
    }
  };

  /**
   * 🔧 CORREÇÃO CRÍTICA 1: Listener garantido para login automático
   */
  const handleUserLogin = React.useCallback((event: CustomEvent) => {
    console.log('🎉 [AUTO-LOGIN] Evento user-login recebido:', event.detail);
    
    try {
      const userData = event.detail;
      
      // Validação robusta dos dados recebidos
      if (userData && 
          typeof userData === 'object' && 
          userData.email && 
          userData.role && 
          userData.id) {
        
        console.log('✅ [AUTO-LOGIN] Dados válidos, configurando usuário:', userData.email);
        
        // 🔧 CORREÇÃO: Garantir que tokens sejam restaurados também
        const tokens = getStoredTokens();
        if (!tokens) {
          console.log('⚠️ [AUTO-LOGIN] Criando tokens para usuário logado automaticamente...');
          const autoTokens: AuthTokens = {
            accessToken: `auto_token_${Date.now()}_${userData.id}`,
            refreshToken: `auto_refresh_${Date.now()}_${userData.id}`,
            expiresIn: 24 * 60 * 60, // 24 horas
            tokenType: 'Bearer' as const
          };
          storeTokens(autoTokens);
        }
        
        // Configurar usuário no contexto com dados completos
        const completeUserData = {
          id: userData.id,
          email: userData.email,
          first_name: userData.first_name || userData.email.split('@')[0],
          last_name: userData.last_name || '',
          role: userData.role,
          tenant_id: userData.tenant_id,
          is_active: userData.is_active !== false, // Default para true se não especificado
          created_at: userData.created_at || new Date().toISOString()
        };
        
        setUser(completeUserData);
        setLoading(false);
        
        // 🔧 CORREÇÃO: Garantir armazenamento no localStorage também
        localStorage.setItem('crm_user', JSON.stringify({
          ...completeUserData,
          loginTime: new Date().toISOString(),
          autoLogin: true
        }));
        
        console.log('🎉 [AUTO-LOGIN] Login automático pós-ativação concluído com sucesso!');
        console.log('👤 [AUTO-LOGIN] Usuário configurado:', {
          email: completeUserData.email,
          role: completeUserData.role,
          tenant_id: completeUserData.tenant_id
        });
        
        // 🔧 CORREÇÃO: Disparar evento de atualização para outros componentes
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('auth-state-changed', {
            detail: { user: completeUserData, isAuthenticated: true }
          }));
        }, 100);
        
      } else {
        console.error('❌ [AUTO-LOGIN] Dados de usuário inválidos ou incompletos:', userData);
        console.error('❌ [AUTO-LOGIN] Campos obrigatórios: id, email, role');
      }
    } catch (error) {
      console.error('❌ [AUTO-LOGIN] Erro ao processar login automático:', error);
    }
  }, []);

  // 🔧 CORREÇÃO CRÍTICA #1: Listener user-login sempre ativo e robusto
  React.useEffect(() => {
    console.log('🎧 [CRITICAL-FIX-1] Registrando listener user-login com máxima prioridade...');
    
    // Garantir que não há listeners duplicados
    window.removeEventListener('user-login', handleUserLogin as EventListener);
    
    // Registrar listener com configuração robusta
    window.addEventListener('user-login', handleUserLogin as EventListener, {
      passive: false,   // Permite preventDefault se necessário
      capture: false    // Bubbling phase para máxima compatibilidade
    });
    
    // Verificar se listener está realmente ativo
    console.log('✅ [CRITICAL-FIX-1] Listener user-login registrado e ativo');
    console.log('🔍 [CRITICAL-FIX-1] Total de listeners user-login:', 
      (window as any).getEventListeners?.('user-login')?.length || 'Indeterminado');
    
    // Cleanup robusto
    return () => {
      window.removeEventListener('user-login', handleUserLogin as EventListener);
      console.log('🧹 [CRITICAL-FIX-1] Listener user-login removido com segurança');
    };
  }, [handleUserLogin]);

  /**
   * 🔧 CORREÇÃO: Verificar autenticação com tokens JWT + localStorage
   */
  useEffect(() => {
    const checkAuth = () => {
      console.log('🔍 AuthProvider - Verificando autenticação...');
      
      try {
        // 🔧 CORREÇÃO 1: Verificar tokens JWT primeiro
        const tokens = getStoredTokens();
        const savedUser = localStorage.getItem('crm_user');
        
        if (tokens && savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            console.log('✅ [AUTH-RESTORE] Usuário + tokens JWT encontrados:', parsedUser.email);
            console.log('✅ [AUTH-RESTORE] Token válido até:', new Date(Date.now() + tokens.expiresIn * 1000).toLocaleString());
            setUser(parsedUser);
          } catch (error) {
            console.error('❌ [AUTH-RESTORE] Erro ao parser usuário, limpando dados:', error);
            localStorage.removeItem('crm_user');
            clearTokens();
            setUser(null);
          }
        } else if (savedUser && !tokens) {
          // Usuário existe mas sem tokens - criar tokens demo se necessário
          try {
            const parsedUser = JSON.parse(savedUser);
            console.log('⚠️ [AUTH-RESTORE] Usuário sem tokens JWT, criando tokens demo para:', parsedUser.email);
            
            // Criar tokens demo para manter funcionalidade
            const demoTokens: AuthTokens = {
              accessToken: `demo_token_${Date.now()}_${parsedUser.id}`,
              refreshToken: `demo_refresh_${Date.now()}_${parsedUser.id}`,
              expiresIn: 24 * 60 * 60, // 24 horas
              tokenType: 'Bearer' as const
            };
            
            storeTokens(demoTokens);
            setUser(parsedUser);
            console.log('✅ [AUTH-RESTORE] Tokens demo criados para usuário existente');
          } catch (error) {
            console.error('❌ [AUTH-RESTORE] Erro ao restaurar usuário:', error);
            localStorage.removeItem('crm_user');
            setUser(null);
          }
        } else {
          console.log('ℹ️ [AUTH-RESTORE] Nenhum usuário/token encontrado - estado não autenticado');
          setUser(null);
        }

      } catch (error) {
        console.error('❌ [AUTH-RESTORE] Erro ao verificar autenticação:', error);
        clearTokens();
        setUser(null);
      } finally {
        setLoading(false);
        console.log('🏁 [AUTH-RESTORE] Verificação de autenticação concluída');
      }
    };

    // Executar verificação síncrona para evitar problemas
    checkAuth();
  }, []);

  /**
   * 🔧 CORREÇÃO ETAPA 1: Login integrado com Backend API para gerar tokens JWT
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('🔐 [ETAPA-1] Tentando login integrado Backend API + JWT:', email);
    setLoading(true);
    
    try {
      // 🔧 CORREÇÃO: Sempre tentar Backend API primeiro para obter tokens JWT
      console.log('🚀 [ETAPA-1] Tentando login via Backend API (/api/auth/login)...');
      
      const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: password
        })
      });

      const loginData = await loginResponse.json();

      if (loginResponse.ok && loginData.success) {
        // ✅ LOGIN VIA BACKEND API SUCESSO - Tokens JWT obtidos
        console.log('✅ [ETAPA-1] Login via Backend API bem-sucedido:', loginData.data.user.email);
        
        const { user, tokens } = loginData.data;

        // Armazenar tokens JWT
        storeTokens(tokens);
        console.log('✅ [ETAPA-1] Tokens JWT armazenados:', { 
          accessToken: tokens.accessToken.substring(0, 50) + '...', 
          expiresIn: tokens.expiresIn 
        });

        // Configurar usuário
        setUser(user);

        // Manter compatibilidade com localStorage para demonstração
        localStorage.setItem('crm_user', JSON.stringify({
          ...user,
          loginTime: new Date().toISOString()
        }));

        console.log('🎉 [ETAPA-1] Login completo via Backend API + JWT tokens!');
        setLoading(false);
        return true;
      }

      // ⚠️ Backend API falhou - tentar fallback de demonstração
      console.log('⚠️ [ETAPA-1] Backend API falhou, tentando fallback demo:', loginData.error || 'Erro desconhecido');

      // FALLBACK: Credenciais de demonstração (para desenvolvimento)
      const demoUsers = [
        {
          email: 'superadmin@crm.com',
          password: 'SuperAdmin123!',
          user: {
            id: '3873c08e-f735-4d2e-9b43-fef337ca9876', // ID real do banco
            email: 'superadmin@crm.com',
            first_name: 'Super',
            last_name: 'Admin',
            role: 'super_admin' as const,
            tenant_id: '550e8400-e29b-41d4-a716-446655440000',
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
        }
      ];

      const demoUser = demoUsers.find(u => u.email === email && u.password === password);
      
      if (demoUser) {
        console.log('✅ [ETAPA-1] Login demo bem-sucedido (fallback):', demoUser.user.email);
        
        // 🔧 CORREÇÃO: Gerar tokens demo para que authenticatedFetch funcione
        const demoTokens: AuthTokens = {
          accessToken: `demo_token_${Date.now()}_${demoUser.user.id}`,
          refreshToken: `demo_refresh_${Date.now()}_${demoUser.user.id}`,
          expiresIn: 24 * 60 * 60, // 24 horas para demo
          tokenType: 'Bearer' as const
        };

        // Armazenar tokens demo
        storeTokens(demoTokens);
        console.log('✅ [ETAPA-1] Tokens demo criados para desenvolvimento');

        // Configurar usuário
        setUser(demoUser.user);

        // Salvar no localStorage
        localStorage.setItem('crm_user', JSON.stringify({
          ...demoUser.user,
          loginTime: new Date().toISOString()
        }));

        console.log('✅ [ETAPA-1] Login demo completo com tokens!');
        setLoading(false);
        return true;
      }

      // ❌ Todas as tentativas falharam
      console.log('❌ [ETAPA-1] Todas as tentativas de login falharam');
          setLoading(false);
          return false;

    } catch (error) {
      console.error('❌ [ETAPA-1] Erro no login:', error);
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
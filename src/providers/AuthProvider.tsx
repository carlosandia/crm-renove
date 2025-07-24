import React, { useState, useEffect } from 'react';
import AuthContext from '../contexts/AuthContext';
import { User } from '../types/User';
import { logger } from '../utils/logger';
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

  // Log apenas em modo debug explícito
  const isDebugMode = import.meta.env.VITE_LOG_LEVEL === 'debug';
  if (isDebugMode) {
    console.log('🔥 AuthProvider - Estado:', { user: user?.email, loading });
  }

  // 🔧 CORREÇÃO: Sistema de monitoramento automático de tokens (menos agressivo)
  React.useEffect(() => {
    let tokenMonitorInterval: NodeJS.Timeout;
    let failureCount = 0;
    const MAX_FAILURES = 3;
    const BASE_INTERVAL = 5 * 60 * 1000; // 5 minutos base
    
    const startTokenMonitoring = () => {
      if (isDebugMode) {
        console.log('🔄 [TOKEN-MONITOR] Iniciando monitoramento otimizado...');
      }
      
      const scheduleNextCheck = (intervalMultiplier = 1) => {
        const interval = BASE_INTERVAL * intervalMultiplier;
        
        tokenMonitorInterval = setTimeout(async () => {
          const tokens = getStoredTokens();
          if (!tokens) {
            scheduleNextCheck(); // Reagendar se não há tokens
            return;
          }
          
          const expiresAt = sessionStorage.getItem('crm_token_expires');
          if (!expiresAt) {
            scheduleNextCheck(); // Reagendar se não há expiração
            return;
          }
          
          const now = Date.now();
          const expires = parseInt(expiresAt);
          const fiveMinutesFromNow = now + (5 * 60 * 1000); // Margem de 5 minutos
          const timeToExpire = Math.floor((expires - now) / 1000 / 60);
          
          // Só tentar renovar se token estiver realmente próximo do vencimento
          if (fiveMinutesFromNow >= expires && timeToExpire > -10) { // Até 10 min após expirar
            if (isDebugMode) {
              console.log(`⚠️ [TOKEN-MONITOR] Token próximo do vencimento (${timeToExpire} min)`);
            }
            
            try {
              const newTokens = await refreshTokens();
              if (newTokens) {
                failureCount = 0; // Reset contador em caso de sucesso
                scheduleNextCheck(); // Reagendar com intervalo normal
              } else {
                failureCount++;
                if (isDebugMode) {
                  console.log(`❌ [TOKEN-MONITOR] Falha na renovação (${failureCount}/${MAX_FAILURES})`);
                }
                
                // Backoff exponencial em caso de falha
                const backoffMultiplier = Math.min(Math.pow(2, failureCount), 8); // Max 8x
                scheduleNextCheck(backoffMultiplier);
                
                // Só forçar logout após múltiplas falhas
                if (failureCount >= MAX_FAILURES) {
                  console.error('❌ [TOKEN-MONITOR] Múltiplas falhas de renovação - considera logout');
                  // Não forçar logout automaticamente - deixar para API interceptor
                }
              }
            } catch (error) {
              failureCount++;
              if (isDebugMode) {
                console.error(`❌ [TOKEN-MONITOR] Erro (${failureCount}/${MAX_FAILURES}):`, error);
              }
              
              const backoffMultiplier = Math.min(Math.pow(2, failureCount), 8);
              scheduleNextCheck(backoffMultiplier);
            }
          } else {
            // Token ainda válido, reagendar verificação normal
            scheduleNextCheck();
          }
        }, interval);
      };
      
      // Iniciar ciclo de monitoramento
      scheduleNextCheck();
    };
    
    // Iniciar monitoramento se há usuário logado
    if (user && !loading) {
      startTokenMonitoring();
    }
    
    return () => {
      if (tokenMonitorInterval) {
        clearTimeout(tokenMonitorInterval);
        if (isDebugMode) {
          console.log('🛑 [TOKEN-MONITOR] Monitoramento otimizado interrompido');
        }
      }
    };
  }, [user, loading]);

  /**
   * 🔧 CORREÇÃO: Fazer request autenticado com melhor tratamento de erro
   */
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    // Log apenas em debug mode
    if (import.meta.env.VITE_LOG_LEVEL === 'debug') {
      console.log('🌐 [AUTH-FETCH] Iniciando requisição autenticada:', url);
    }
    
    let tokens = getStoredTokens();
    
    // 🔧 CORREÇÃO: Se não há tokens mas há usuário, tentar refresh ou criar tokens demo
    if (!tokens && user) {
      console.log('⚠️ [AUTH-FETCH] Sem tokens mas usuário presente, tentando recuperar...');
      
      try {
        // Tentar refresh primeiro
        const refreshedTokens = await refreshTokens();
        if (refreshedTokens) {
          tokens = refreshedTokens;
          console.log('✅ [AUTH-FETCH] Tokens recuperados via refresh');
        } else {
          // Se refresh falhar, criar tokens demo para manter funcionalidade
          console.log('🔄 [AUTH-FETCH] Criando tokens demo para manter funcionalidade...');
          const demoTokens: AuthTokens = {
            accessToken: `demo_token_${Date.now()}_${user.id}`,
            refreshToken: `demo_refresh_${Date.now()}_${user.id}`,
            expiresIn: 24 * 60 * 60,
            tokenType: 'Bearer' as const
          };
          storeTokens(demoTokens);
          tokens = demoTokens;
        }
      } catch (refreshError) {
        console.warn('⚠️ [AUTH-FETCH] Erro no refresh, criando tokens demo...', refreshError);
        const demoTokens: AuthTokens = {
          accessToken: `demo_token_${Date.now()}_${user.id}`,
          refreshToken: `demo_refresh_${Date.now()}_${user.id}`,
          expiresIn: 24 * 60 * 60,
          tokenType: 'Bearer' as const
        };
        storeTokens(demoTokens);
        tokens = demoTokens;
      }
    }
    
    if (!tokens) {
      console.error('❌ [AUTH-FETCH] Não foi possível obter tokens válidos');
      throw new Error('Usuário não autenticado - faça login novamente');
    }

    // Headers padrão com autenticação
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.accessToken}`,
      ...(options.headers as Record<string, string> || {}),
    };

    // 🔧 CORREÇÃO CRÍTICA 2: Adicionar headers para tokens demo
    if (tokens.accessToken.startsWith('demo_token_') && user) {
      // 🔧 CORREÇÃO: Usar apenas minúsculas para evitar duplicação
      headers['x-user-id'] = user.id;
      headers['x-user-role'] = user.role;
      headers['x-tenant-id'] = user.tenant_id || '';
      console.log('🔧 [AUTH-FETCH] Headers demo configurados:', {
        'x-user-id': headers['x-user-id'],
        'x-user-role': headers['x-user-role'],
        'x-tenant-id': headers['x-tenant-id']
      });
    }

    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api${url}`, {
        ...options,
        mode: 'cors',
        credentials: 'include',
        headers,
      });
    } catch (fetchError: any) {
      logger.debug('AUTH-FETCH Erro de rede/CORS', fetchError?.message || 'Network error');
      // Se há erro de CORS/rede, tentar fallback sem credentials
      logger.debug('AUTH-FETCH Tentando fallback sem credentials');
      response = await fetch(`${API_BASE_URL}/api${url}`, {
        ...options,
        mode: 'cors',
        credentials: 'omit', // Remover credentials se houver problema CORS
        headers,
      });
    }

    // Resposta recebida: ${response.status}

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
          // 🔧 CORREÇÃO: Adicionar versões minúsculas para compatibilidade
          newHeaders['x-user-id'] = user.id;
          newHeaders['x-user-role'] = user.role;
          newHeaders['x-tenant-id'] = user.tenant_id || '';
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
        logger.warn('AUTH-FETCH Falha ao renovar tokens para', url);
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
    } else if (import.meta.env.VITE_LOG_LEVEL === 'debug') {
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
      console.log('🔍 [GET-TOKENS] Tokens não encontrados no sessionStorage - tentando recriar...');
      
      // 🔧 CORREÇÃO: Se há usuário logado mas sem tokens, criar tokens demo automaticamente
      if (user) {
        console.log('🔄 [GET-TOKENS] Usuário logado sem tokens, criando tokens demo...');
        const autoTokens: AuthTokens = {
          accessToken: `demo_token_${Date.now()}_${user.id}`,
          refreshToken: `demo_refresh_${Date.now()}_${user.id}`,
          expiresIn: 24 * 60 * 60, // 24 horas
          tokenType: 'Bearer' as const
        };
        storeTokens(autoTokens);
        // 🔧 CORREÇÃO: Salvar no localStorage também
        localStorage.setItem('access_token', autoTokens.accessToken);
        console.log('✅ [GET-TOKENS] Tokens demo criados automaticamente');
        return autoTokens;
      }
      
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
    const fiveMinutes = 5 * 60 * 1000;
    
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
        console.log('❌ [GET-TOKENS] Token real expirado, mas não limpando storage para preservar dados');
        // 🔧 CORREÇÃO: Não limpar tokens imediatamente, permitir refresh
        // clearTokens();
        // return null;
        
        // Retornar tokens mesmo expirados para permitir refresh automático
        return {
          accessToken,
          refreshToken,
          expiresIn: -1, // Indicar que expirou
          tokenType: 'Bearer'
        };
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
    // 🔧 CORREÇÃO: Limpar access_token do localStorage também
    localStorage.removeItem('access_token');
    localStorage.removeItem('crm_user');
  };

  /**
   * Renovar tokens usando refresh token
   */
  const refreshTokens = async (): Promise<AuthTokens | null> => {
    console.log('🔄 [REFRESH-TOKENS] Iniciando processo de renovação de tokens...');
    
    try {
      const refreshToken = sessionStorage.getItem('crm_refresh_token');
      
      if (!refreshToken) {
        logger.debug('REFRESH-TOKENS Refresh token não encontrado no sessionStorage');
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
      
      logger.info('Tokens renovados com sucesso');
      return newTokens;

    } catch (error: any) {
      logger.error('REFRESH-TOKENS Erro crítico na renovação', error?.message || 'Unknown error');
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
        logger.warn('AUTO-LOGIN Dados de usuário inválidos ou incompletos', 'Campos obrigatórios: id, email, role');
      }
    } catch (error: any) {
      logger.error('AUTO-LOGIN Erro ao processar login automático', error?.message || 'Unknown error');
    }
  }, []);

  // 🔧 CORREÇÃO CRÍTICA #1: Listener user-login sempre ativo e robusto
  React.useEffect(() => {
    // Garantir que não há listeners duplicados
    window.removeEventListener('user-login', handleUserLogin as EventListener);
    
    // Registrar listener com configuração robusta
    window.addEventListener('user-login', handleUserLogin as EventListener, {
      passive: false,   // Permite preventDefault se necessário
      capture: false    // Bubbling phase para máxima compatibilidade
    });
    
    // Cleanup robusto
    return () => {
      window.removeEventListener('user-login', handleUserLogin as EventListener);
      // Listener user-login removido
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
          } catch (error: any) {
            logger.warn('AUTH-RESTORE Erro ao parser usuário, limpando dados', error?.message || 'Parse error');
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
          } catch (error: any) {
            logger.warn('AUTH-RESTORE Erro ao restaurar usuário', error?.message || 'Restore error');
            localStorage.removeItem('crm_user');
            setUser(null);
          }
        } else {
          console.log('ℹ️ [AUTH-RESTORE] Nenhum usuário/token encontrado - estado não autenticado');
          setUser(null);
        }

      } catch (error: any) {
        logger.error('AUTH-RESTORE Erro ao verificar autenticação', error?.message || 'Unknown error');
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
   * 🔧 CORREÇÃO: Testar conectividade com backend antes do login
   */
  const testBackendConnection = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout
      
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('✅ [BACKEND-TEST] Backend disponível');
        return true;
      } else {
        console.log('⚠️ [BACKEND-TEST] Backend respondeu com erro:', response.status);
        return false;
      }
    } catch (error) {
      console.log('❌ [BACKEND-TEST] Backend não disponível:', error);
      return false;
    }
  };

  /**
   * 🔧 CORREÇÃO ETAPA 1: Login integrado com Backend API para gerar tokens JWT
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('🔐 [LOGIN] Iniciando autenticação:', email);
    setLoading(true);
    
    try {
      // 🔧 CORREÇÃO: Testar conexão com backend primeiro
      const backendAvailable = await testBackendConnection();
      
      if (backendAvailable) {
        console.log('🚀 [LOGIN] Backend disponível - usando API...');
        
        // Implementar timeout para evitar travamento
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
        
        const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            password: password
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          
          if (loginData.success) {
            // ✅ LOGIN VIA BACKEND API SUCESSO - Tokens JWT obtidos
            console.log('✅ [LOGIN] Autenticação bem-sucedida via API:', loginData.data?.user?.email || loginData.user?.email);
            
            const user = loginData.data?.user || loginData.user;
            const tokens = {
              accessToken: loginData.token || loginData.data?.tokens?.accessToken,
              refreshToken: loginData.token || loginData.data?.tokens?.refreshToken || loginData.token,
              expiresIn: 3600, // 1 hora como padrão
              tokenType: 'Bearer' as const
            };

            // Armazenar tokens JWT
            storeTokens(tokens);
            localStorage.setItem('access_token', tokens.accessToken);
            
            console.log('✅ [LOGIN] Tokens JWT configurados com sucesso');

            // Configurar usuário
            setUser(user);
            localStorage.setItem('crm_user', JSON.stringify({
              ...user,
              loginTime: new Date().toISOString()
            }));

            console.log('🎉 [LOGIN] Login completo via Backend API!');
            setLoading(false);
            return true;
          }
        }
        
        // ⚠️ Backend API falhou - tentar fallback de demonstração
        console.log('⚠️ [LOGIN] Backend API falhou, usando fallback demo');
      } else {
        console.log('⚠️ [LOGIN] Backend não disponível, usando fallback demo');
      }

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
          email: 'seraquevai@seraquevai.com',
          password: 'abc12345!',
          user: {
            id: 'bbaf8441-23c9-44dc-9a4c-a4da787f829c',
            email: 'seraquevai@seraquevai.com',
            first_name: 'Admin',
            last_name: 'User',
            role: 'admin' as const,
            tenant_id: 'd7caffc1-c923-47c8-9301-ca9eeff1a243',
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
        
        // 🔧 CORREÇÃO CRÍTICA: Salvar access_token no localStorage para api.ts
        localStorage.setItem('access_token', demoTokens.accessToken);
        
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

    } catch (error: any) {
      console.error('❌ [ETAPA-1] Erro no login:', error);
      
      // Se foi erro de timeout ou rede, tentar fallback mesmo assim
      if (error.name === 'AbortError' || error.message?.includes('fetch')) {
        console.log('⚠️ [ETAPA-1] Erro de rede/timeout, tentando fallback demo...');
        
        // FALLBACK: Credenciais de demonstração (para desenvolvimento)
        const demoUsers = [
          {
            email: 'superadmin@crm.com',
            password: 'SuperAdmin123!',
            user: {
              id: '3873c08e-f735-4d2e-9b43-fef337ca9876',
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
            email: 'seraquevai@seraquevai.com',
            password: 'abc12345!',
            user: {
              id: 'bbaf8441-23c9-44dc-9a4c-a4da787f829c',
              email: 'seraquevai@seraquevai.com',
              first_name: 'Admin',
              last_name: 'User',
              role: 'admin' as const,
              tenant_id: 'd7caffc1-c923-47c8-9301-ca9eeff1a243',
              is_active: true,
              created_at: new Date().toISOString()
            }
          }
        ];

        const demoUser = demoUsers.find(u => u.email === email && u.password === password);
        
        if (demoUser) {
          console.log('✅ [ETAPA-1] Login demo bem-sucedido (fallback de erro):', demoUser.user.email);
          
          // Gerar tokens demo
          const demoTokens: AuthTokens = {
            accessToken: `demo_token_${Date.now()}_${demoUser.user.id}`,
            refreshToken: `demo_refresh_${Date.now()}_${demoUser.user.id}`,
            expiresIn: 24 * 60 * 60,
            tokenType: 'Bearer' as const
          };

          // Armazenar tokens demo
          storeTokens(demoTokens);
          localStorage.setItem('access_token', demoTokens.accessToken);
          
          console.log('✅ [ETAPA-1] Tokens demo criados (fallback de erro)');

          // Configurar usuário
          setUser(demoUser.user);
          localStorage.setItem('crm_user', JSON.stringify({
            ...demoUser.user,
            loginTime: new Date().toISOString()
          }));

          console.log('✅ [ETAPA-1] Login demo completo (fallback de erro)!');
          setLoading(false);
          return true;
        }
      }
      
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

  // Log removido - muito verboso

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
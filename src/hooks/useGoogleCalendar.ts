import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { GoogleCalendarAuth, GoogleCalendar } from '../services/googleCalendarAuth';
import { showSuccessToast, showErrorToast, showWarningToast } from '../lib/toast';
import { logOnlyInDevelopment } from './useOptimizedLogging';
import { LogContext, debouncedLog } from '../utils/loggerOptimized';
import { isDevelopment } from '../utils/constants';

// ✅ DEBOUNCE: Função para debounce de chamadas
function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const [debouncedFunc] = useState(() => {
    let timeoutId: NodeJS.Timeout;
    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
  });

  return debouncedFunc;
}

export interface CalendarIntegration {
  id: string;
  provider: string;
  calendar_name: string;
  sync_status: string;
  sync_enabled: boolean;
  created_at: string;
}

export interface UseGoogleCalendarResult {
  // Estados
  hasIntegration: boolean;
  isConnecting: boolean;
  isLoading: boolean;
  activeIntegration: CalendarIntegration | null;
  availableCalendars: GoogleCalendar[];
  
  // Ações
  connectCalendar: (customCredentials?: { clientId: string; clientSecret: string; redirectUri?: string }) => void;
  disconnectCalendar: () => Promise<boolean>;
  refreshIntegration: () => Promise<void>;
  checkIntegrationStatus: () => Promise<boolean>;
  loadCalendars: () => Promise<void>;
}

export function useGoogleCalendar(): UseGoogleCalendarResult {
  const { user } = useAuth();
  
  // ✅ PERFORMANCE LOGGING: Tracking automático de performance
  
  // Estados
  const [hasIntegration, setHasIntegration] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIntegration, setActiveIntegration] = useState<CalendarIntegration | null>(null);
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendar[]>([]);

  /**
   * Verifica status da integração (com debounce)
   */
  const checkIntegrationStatusRaw = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !user.tenant_id) {
      logOnlyInDevelopment('Usuário não logado, pulando verificação', LogContext.API);
      return false;
    }

    try {
      logOnlyInDevelopment('Verificando status da integração Google Calendar', LogContext.API);
      
      const hasActive = await GoogleCalendarAuth.hasActiveIntegration(
        user.id, 
        user.tenant_id
      );

      if (hasActive) {
        const integration = await GoogleCalendarAuth.getActiveIntegration(
          user.id, 
          user.tenant_id
        );
        
        if (integration) {
          setActiveIntegration({
            id: integration.id,
            provider: integration.provider,
            calendar_name: integration.calendar_name || 'Google Calendar',
            sync_status: integration.sync_status,
            sync_enabled: integration.sync_enabled,
            created_at: integration.created_at
          });
          logOnlyInDevelopment('Integração ativa Google Calendar encontrada', LogContext.API);
        }
      }

      setHasIntegration(hasActive);
      return hasActive;
    } catch (error) {
      logOnlyInDevelopment('Erro ao verificar integração Google Calendar', LogContext.API, error);
      setHasIntegration(false);
      return false;
    }
  }, [user?.id, user?.tenant_id]);

  // ✅ DEBOUNCE: Aplicar debounce para evitar múltiplas chamadas
  const checkIntegrationStatus = useDebounce(checkIntegrationStatusRaw, 500);

  /**
   * 🆕 ETAPA 5: Conecta com Google Calendar usando sistema centralizado
   */
  const connectCalendar = useCallback(async (customCredentials?: { clientId: string; clientSecret: string; redirectUri?: string }) => {
    if (!user?.id || !user.tenant_id) {
      showErrorToast('Usuário não logado');
      return;
    }

    setIsConnecting(true);
    
    try {
      logOnlyInDevelopment('Iniciando conexão Google Calendar via sistema centralizado', LogContext.API);
      
      // 🆕 Verificar se a empresa tem Google Calendar habilitado
      const googleAuth = new GoogleCalendarAuth();
      const isEnabled = await googleAuth.isEnabledForTenant();
      if (!isEnabled) {
        showErrorToast('Google Calendar não está habilitado para sua empresa. Entre em contato com o administrador.');
        setIsConnecting(false);
        return;
      }

      // 🆕 Gerar URL de autenticação usando credenciais da plataforma
      const authUrl = await GoogleCalendarAuth.getAuthUrl();
      
      if (authUrl === 'demo_mode') {
        // Modo demo - credenciais da plataforma não configuradas
        logOnlyInDevelopment('Modo demo Google Calendar ativado', LogContext.API);
        
        setTimeout(async () => {
          try {
            const credentials = await GoogleCalendarAuth.exchangeCodeForTokens('demo_code');
            
            const integrationId = await GoogleCalendarAuth.saveIntegration(
              user.id,
              user.tenant_id,
              credentials
            );

            logOnlyInDevelopment('Integração demo Google Calendar salva', LogContext.API, { integrationId });
            
            await checkIntegrationStatus();
            
            showSuccessToast('Google Calendar conectado (modo demo)!');
            setIsConnecting(false);
          } catch (error) {
            logOnlyInDevelopment('Erro na conexão demo Google Calendar', LogContext.API, error);
            showErrorToast('Falha ao conectar Google Calendar');
            setIsConnecting(false);
          }
        }, 2000);
      } else {
        // OAuth2 real usando credenciais da plataforma
        logOnlyInDevelopment('Redirecionando para autenticação Google', LogContext.API);
        
        // Salvar estado para callback
        localStorage.setItem('google_calendar_connecting', 'true');
        localStorage.setItem('google_calendar_user_id', user.id);
        localStorage.setItem('google_calendar_tenant_id', user.tenant_id);
        
        // Redirecionar para Google OAuth usando credenciais centralizadas
        window.location.href = authUrl;
      }
      
    } catch (error) {
      logOnlyInDevelopment('Erro ao iniciar conexão Google Calendar', LogContext.API, error);
      showErrorToast('Erro ao conectar com Google Calendar: ' + (error as Error).message);
      setIsConnecting(false);
    }
  }, [user?.id, user?.tenant_id, checkIntegrationStatus]);

  /**
   * Desconecta Google Calendar
   */
  const disconnectCalendar = useCallback(async (): Promise<boolean> => {
    if (!activeIntegration) {
      showWarningToast('Nenhuma integração ativa encontrada');
      return false;
    }

    try {
      logOnlyInDevelopment('Desconectando integração Google Calendar', LogContext.API, { integrationId: activeIntegration.id });
      
      const success = await GoogleCalendarAuth.removeIntegration(activeIntegration.id);
      
      if (success) {
        setHasIntegration(false);
        setActiveIntegration(null);
        setAvailableCalendars([]);
        showSuccessToast('Google Calendar desconectado');
        return true;
      } else {
        showErrorToast('Falha ao desconectar Google Calendar');
        return false;
      }
    } catch (error) {
      logOnlyInDevelopment('Erro ao desconectar Google Calendar', LogContext.API, error);
      showErrorToast('Erro ao desconectar Google Calendar');
      return false;
    }
  }, [activeIntegration]);

  /**
   * Atualiza status da integração (com debounce)
   */
  /**
   * Carrega calendários disponíveis
   */
  const loadCalendars = useCallback(async (): Promise<void> => {
    if (!activeIntegration?.id) {
      logOnlyInDevelopment('Sem integração ativa para carregar calendários', LogContext.API);
      return;
    }

    try {
      logOnlyInDevelopment('Carregando calendários Google Calendar', LogContext.API);
      
      // Para desenvolvimento/demo, usar calendários mockados
      const calendars = await GoogleCalendarAuth.getCalendars('demo_access_token');
      setAvailableCalendars(calendars);
      
      logOnlyInDevelopment('Calendários Google Calendar carregados', LogContext.API, { count: calendars.length });
    } catch (error) {
      logOnlyInDevelopment('Erro ao carregar calendários Google Calendar', LogContext.API, error);
      setAvailableCalendars([]);
    }
  }, [activeIntegration?.id]);

  const refreshIntegrationRaw = useCallback(async (): Promise<void> => {
    logOnlyInDevelopment('Atualizando integração Google Calendar', LogContext.API);
    setIsLoading(true);
    
    try {
      await checkIntegrationStatusRaw();
      if (hasIntegration) {
        await loadCalendars();
      }
    } catch (error) {
      logOnlyInDevelopment('Erro ao atualizar integração Google Calendar', LogContext.API, error);
    } finally {
      setIsLoading(false);
    }
  }, [checkIntegrationStatusRaw, hasIntegration, loadCalendars]);

  // ✅ DEBOUNCE: Aplicar debounce para evitar múltiplas chamadas
  const refreshIntegration = useDebounce(refreshIntegrationRaw, 1000);

  /**
   * Efeito para carregar integração na inicialização
   * ✅ CORREÇÃO: Remover dependências que causam loop infinito
   */
  useEffect(() => {
    const initializeCalendar = async () => {
      if (!user?.id || !user.tenant_id) {
        setIsLoading(false);
        return;
      }

      logOnlyInDevelopment('Inicializando hook Google Calendar', LogContext.HOOKS);
      
      try {
        // ✅ CORREÇÃO: Usar função raw sem debounce para inicialização
        const hasActive = await checkIntegrationStatusRaw();
        if (hasActive) {
          await loadCalendars();
        }
      } catch (error) {
        logOnlyInDevelopment('Erro na inicialização Google Calendar', LogContext.HOOKS, error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeCalendar();
    // ✅ CORREÇÃO: Apenas user.id e tenant_id como dependências para evitar loops
  }, [user?.id, user?.tenant_id]);

  // ✅ CORREÇÃO: Remover error logging automático que pode causar loops

  // ✅ CORREÇÃO: Otimizar API call tracking para evitar logs excessivos
  // useApiCallLogging('/google-calendar/status', 'GET', !!user?.id);

  // ✅ DEVELOPMENT STATE LOGGING: Log otimizado do estado
  useEffect(() => {
    if (isDevelopment) {
      logOnlyInDevelopment(
        'Google Calendar state updated',
        LogContext.HOOKS,
        {
          hasIntegration,
          isConnecting,
          isLoading,
          activeIntegrationId: activeIntegration?.id ? activeIntegration.id.substring(0, 8) + '...' : 'unknown',
          calendarsCount: availableCalendars.length
        }
      );
    }
  }, [hasIntegration, isConnecting, isLoading, activeIntegration?.id, availableCalendars.length]);

  // ✅ MEMOIZAÇÃO: Memoizar return para evitar re-renders desnecessários
  return useMemo(() => ({
    // Estados
    hasIntegration,
    isConnecting,
    isLoading,
    activeIntegration,
    availableCalendars,
    
    // Ações
    connectCalendar,
    disconnectCalendar,
    refreshIntegration,
    checkIntegrationStatus,
    loadCalendars
  }), [
    hasIntegration,
    isConnecting,
    isLoading,
    activeIntegration,
    availableCalendars,
    connectCalendar,
    disconnectCalendar,
    refreshIntegration,
    checkIntegrationStatus,
    loadCalendars
  ]);
} 
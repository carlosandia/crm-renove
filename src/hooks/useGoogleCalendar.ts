import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleCalendarAuth, GoogleCalendar } from '../services/googleCalendarAuth';
import { showSuccessToast, showErrorToast, showWarningToast } from '../lib/toast';

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
  
  // Estados
  const [hasIntegration, setHasIntegration] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIntegration, setActiveIntegration] = useState<CalendarIntegration | null>(null);
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendar[]>([]);

  /**
   * Verifica status da integração
   */
  const checkIntegrationStatus = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !user.tenant_id) {
      console.log('📅 CALENDAR: Usuário não logado, pulando verificação');
      return false;
    }

    try {
      console.log('🔍 CALENDAR: Verificando status da integração...');
      
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
          console.log('✅ CALENDAR: Integração ativa encontrada');
        }
      }

      setHasIntegration(hasActive);
      return hasActive;
    } catch (error) {
      console.error('❌ CALENDAR: Erro ao verificar integração:', error);
      setHasIntegration(false);
      return false;
    }
  }, [user?.id, user?.tenant_id]);

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
      console.log('🔗 CALENDAR: Iniciando conexão via sistema centralizado...');
      
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
        console.log('🔄 CALENDAR: Modo demo ativado (credenciais da plataforma não configuradas)');
        
        setTimeout(async () => {
          try {
            const credentials = await GoogleCalendarAuth.exchangeCodeForTokens('demo_code');
            
            const integrationId = await GoogleCalendarAuth.saveIntegration(
              user.id,
              user.tenant_id,
              credentials
            );

            console.log('✅ CALENDAR: Integração demo salva via sistema centralizado:', integrationId);
            
            await checkIntegrationStatus();
            
            showSuccessToast('Google Calendar conectado (modo demo)!');
            setIsConnecting(false);
          } catch (error) {
            console.error('❌ CALENDAR: Erro na conexão demo:', error);
            showErrorToast('Falha ao conectar Google Calendar');
            setIsConnecting(false);
          }
        }, 2000);
      } else {
        // OAuth2 real usando credenciais da plataforma
        console.log('🌐 CALENDAR: Redirecionando para autenticação Google (credenciais da plataforma)...');
        
        // Salvar estado para callback
        localStorage.setItem('google_calendar_connecting', 'true');
        localStorage.setItem('google_calendar_user_id', user.id);
        localStorage.setItem('google_calendar_tenant_id', user.tenant_id);
        
        // Redirecionar para Google OAuth usando credenciais centralizadas
        window.location.href = authUrl;
      }
      
    } catch (error) {
      console.error('❌ CALENDAR: Erro ao iniciar conexão:', error);
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
      console.log('🔌 CALENDAR: Desconectando integração:', activeIntegration.id);
      
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
      console.error('❌ CALENDAR: Erro ao desconectar:', error);
      showErrorToast('Erro ao desconectar Google Calendar');
      return false;
    }
  }, [activeIntegration]);

  /**
   * Atualiza status da integração
   */
  const refreshIntegration = useCallback(async (): Promise<void> => {
    console.log('🔄 CALENDAR: Atualizando integração...');
    setIsLoading(true);
    
    try {
      await checkIntegrationStatus();
      if (hasIntegration) {
        await loadCalendars();
      }
    } catch (error) {
      console.error('❌ CALENDAR: Erro ao atualizar:', error);
    } finally {
      setIsLoading(false);
    }
  }, [checkIntegrationStatus, hasIntegration]);

  /**
   * Carrega calendários disponíveis
   */
  const loadCalendars = useCallback(async (): Promise<void> => {
    if (!activeIntegration?.id) {
      console.log('📅 CALENDAR: Sem integração ativa para carregar calendários');
      return;
    }

    try {
      console.log('📅 CALENDAR: Carregando calendários...');
      
      // Para desenvolvimento/demo, usar calendários mockados
      const calendars = await GoogleCalendarAuth.getCalendars('demo_access_token');
      setAvailableCalendars(calendars);
      
      console.log('✅ CALENDAR: Calendários carregados:', calendars.length);
    } catch (error) {
      console.error('❌ CALENDAR: Erro ao carregar calendários:', error);
      setAvailableCalendars([]);
    }
  }, [activeIntegration?.id]);

  /**
   * Efeito para carregar integração na inicialização
   */
  useEffect(() => {
    const initializeCalendar = async () => {
      if (!user?.id || !user.tenant_id) {
        setIsLoading(false);
        return;
      }

      console.log('🚀 CALENDAR: Inicializando hook...');
      
      try {
        const hasActive = await checkIntegrationStatus();
        if (hasActive) {
          await loadCalendars();
        }
      } catch (error) {
        console.error('❌ CALENDAR: Erro na inicialização:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeCalendar();
  }, [user?.id, user?.tenant_id, checkIntegrationStatus, loadCalendars]);

  /**
   * Log do estado atual para debug
   */
  useEffect(() => {
    console.log('📊 CALENDAR STATE:', {
      hasIntegration,
      isConnecting,
      isLoading,
      activeIntegration: activeIntegration?.id,
      calendarsCount: availableCalendars.length,
      userId: user?.id?.substring(0, 8) + '...'
    });
  }, [hasIntegration, isConnecting, isLoading, activeIntegration, availableCalendars.length, user?.id]);

  return {
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
  };
} 
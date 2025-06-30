import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface GoogleCalendarCredentials {
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  calendar_id?: string;
  calendar_name?: string;
}

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  attendees?: string[];
  lead_id?: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole: string;
}

// 🆕 Interface para credenciais da plataforma
export interface PlatformCredentials {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scopes: string[];
  is_active: boolean;
}

interface ApiIntegration {
  provider: string;
  is_active: boolean;
  [key: string]: unknown;
}

interface GoogleCalendarItem {
  id: string;
  summary?: string;
  description?: string;
  primary?: boolean;
  accessRole?: string;
  [key: string]: unknown;
}

export class GoogleCalendarAuth {
  private static readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ].join(' ');

  // 🔧 CREDENCIAIS CENTRALIZADAS DA PLATAFORMA
  private static _platformCredentials: PlatformCredentials | null = null;
  private static _credentialsLoadPromise: Promise<PlatformCredentials | null> | null = null;

  private authenticatedFetch: ((url: string, options?: RequestInit) => Promise<Response>) | null = null;

  constructor() {
    // Inicializar authenticatedFetch se disponível
    const authContext = useAuth();
    this.authenticatedFetch = authContext?.authenticatedFetch || null;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    if (this.authenticatedFetch) {
      return this.authenticatedFetch(endpoint, options);
    } else {
      // Fallback para desenvolvimento
      return fetch(`http://localhost:3001${endpoint}`, options);
    }
  }

  /**
   * 🆕 Carrega credenciais globais da plataforma (configuradas pelo super_admin)
   */
  private static async loadPlatformCredentials(): Promise<PlatformCredentials | null> {
    try {
      console.log('🔄 GOOGLE AUTH: Carregando credenciais globais da plataforma...');
      
      const response = await fetch('/api/platform-integrations/tenant/available', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('⚠️ GOOGLE AUTH: Erro ao carregar credenciais da plataforma:', response.status);
        
        // 🆕 FALLBACK PARA MODO DEMO - Usar credenciais configuradas diretamente
        console.log('🔄 GOOGLE AUTH: Tentando fallback para credenciais diretas...');
        
        const directCredentialsResponse = await fetch('/api/platform-integrations/credentials/google', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!directCredentialsResponse.ok) {
          console.warn('⚠️ GOOGLE AUTH: Credenciais diretas também não disponíveis');
          return null;
        }

        const directCredentialsData = await directCredentialsResponse.json();
        
        const credentials: PlatformCredentials = {
          client_id: directCredentialsData.client_id,
          client_secret: 'configured_by_platform', // Não expor o secret
          redirect_uri: directCredentialsData.redirect_uri || (window.location.origin + '/auth/google/callback'),
          scopes: directCredentialsData.scopes || this.SCOPES.split(' '),
          is_active: true
        };

        console.log('✅ GOOGLE AUTH: Credenciais diretas carregadas via fallback');
        this._platformCredentials = credentials;
        return credentials;
      }

      const result = await response.json();
      const googleIntegration = result.data?.find((integration: ApiIntegration) => 
        integration.provider === 'google' && 
        integration.is_active === true
      );

      if (!googleIntegration) {
        console.warn('⚠️ GOOGLE AUTH: Integração Google não encontrada ou inativa');
        return null;
      }

      // Buscar credenciais detalhadas
      const credentialsResponse = await fetch(`/api/platform-integrations/credentials/google`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!credentialsResponse.ok) {
        console.warn('⚠️ GOOGLE AUTH: Credenciais não disponíveis');
        return null;
      }

      const credentialsData = await credentialsResponse.json();
      
      const credentials: PlatformCredentials = {
        client_id: credentialsData.client_id,
        client_secret: credentialsData.client_secret,
        redirect_uri: credentialsData.redirect_uri || (window.location.origin + '/auth/google/callback'),
        scopes: credentialsData.scopes || this.SCOPES.split(' '),
        is_active: true
      };

      console.log('✅ GOOGLE AUTH: Credenciais globais carregadas:', {
        client_id: credentials.client_id.substring(0, 20) + '...',
        redirect_uri: credentials.redirect_uri,
        scopes_count: credentials.scopes.length
      });

      this._platformCredentials = credentials;
      return credentials;
    } catch (error) {
      console.error('❌ GOOGLE AUTH: Erro ao carregar credenciais da plataforma:', error);
      return null;
    }
  }

  /**
   * 🆕 Obtém credenciais da plataforma (com cache)
   */
  private static async getPlatformCredentials(): Promise<PlatformCredentials | null> {
    // Se já temos credenciais em cache, retornar
    if (this._platformCredentials) {
      return this._platformCredentials;
    }

    // Se já está carregando, aguardar o carregamento atual
    if (this._credentialsLoadPromise) {
      return await this._credentialsLoadPromise;
    }

    // Iniciar novo carregamento
    this._credentialsLoadPromise = this.loadPlatformCredentials();
    const credentials = await this._credentialsLoadPromise;
    this._credentialsLoadPromise = null;

    return credentials;
  }

  /**
   * 🆕 Limpa cache de credenciais (útil para recarregar)
   */
  static clearCredentialsCache(): void {
    this._platformCredentials = null;
    this._credentialsLoadPromise = null;
    console.log('🔄 GOOGLE AUTH: Cache de credenciais limpo');
  }

  // 🔧 COMPATIBILIDADE COM SISTEMA ANTIGO (DEPRECATED)
  static setCredentials(clientId: string, clientSecret: string, redirectUri?: string) {
    console.warn('⚠️ GOOGLE AUTH: setCredentials() está obsoleto. Use credenciais da plataforma.');
    // Manter compatibilidade temporária
  }

  static get CLIENT_ID(): string {
    return this._platformCredentials?.client_id || 
           import.meta.env.VITE_GOOGLE_CLIENT_ID || 
           'demo_client_id';
  }

  static get CLIENT_SECRET(): string {
    return this._platformCredentials?.client_secret || 
           import.meta.env.VITE_GOOGLE_CLIENT_SECRET || 
           '';
  }

  static get REDIRECT_URI(): string {
    return this._platformCredentials?.redirect_uri || 
           import.meta.env.VITE_GOOGLE_REDIRECT_URI || 
           (window.location.origin + '/auth/google/callback');
  }

  /**
   * 🆕 Gera URL de autenticação OAuth2 do Google (CENTRALIZADA)
   */
  static async getAuthUrl(): Promise<string> {
    try {
      console.log('🔄 GOOGLE AUTH: Gerando URL de autenticação...');
      
      // Carregar credenciais da plataforma
      const credentials = await this.getPlatformCredentials();
      
      if (!credentials || !credentials.client_id || credentials.client_id === 'demo_client_id') {
        console.warn('⚠️ GOOGLE AUTH: Credenciais da plataforma não configuradas, usando modo demo');
        return 'demo_mode';
      }

      const state = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('google_oauth_state', state);

      const params = new URLSearchParams({
        client_id: credentials.client_id,
        redirect_uri: credentials.redirect_uri,
        scope: credentials.scopes.join(' '),
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        state: state,
        include_granted_scopes: 'true'
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      console.log('🔗 GOOGLE AUTH: URL de autenticação gerada (credenciais da plataforma)');
      
      return authUrl;
    } catch (error) {
      console.error('❌ GOOGLE AUTH: Erro ao gerar URL de autenticação:', error);
      return 'demo_mode';
    }
  }

  /**
   * 🆕 Troca o código de autorização por tokens de acesso (CENTRALIZADA)
   */
  static async exchangeCodeForTokens(code: string, state?: string): Promise<GoogleCalendarCredentials> {
    try {
      // Verificar state para segurança
      const savedState = localStorage.getItem('google_oauth_state');
      if (state && savedState && state !== savedState) {
        throw new Error('Estado OAuth inválido - possível ataque CSRF');
      }
      
      // Limpar state usado
      localStorage.removeItem('google_oauth_state');

      // Carregar credenciais da plataforma
      const credentials = await this.getPlatformCredentials();
      
      if (!credentials || !credentials.client_id || credentials.client_id === 'demo_client_id') {
        console.log('🔄 GOOGLE AUTH: Modo demo - simulando troca de tokens...');
        
        const mockTokens: GoogleCalendarCredentials = {
          access_token: 'ya29.demo_access_token_' + Math.random().toString(36).substr(2, 32),
          refresh_token: 'demo_refresh_token_' + Math.random().toString(36).substr(2, 32),
          token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          calendar_id: 'primary',
          calendar_name: 'Calendário Principal (Demo)'
        };

        console.log('🔑 GOOGLE AUTH: Tokens demo gerados');
        return mockTokens;
      }

      // Trocar código por tokens usando credenciais da plataforma
      console.log('🔄 GOOGLE AUTH: Trocando código por tokens reais (credenciais da plataforma)...');
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: credentials.client_id,
          client_secret: credentials.client_secret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: credentials.redirect_uri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('❌ GOOGLE AUTH: Erro na resposta:', errorData);
        throw new Error(`Erro HTTP ${tokenResponse.status}: ${errorData}`);
      }

      const tokenData = await tokenResponse.json();
      
      // Obter informações do usuário
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      const userData = userResponse.ok ? await userResponse.json() : {};

      const calendarCredentials: GoogleCalendarCredentials = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
        calendar_id: 'primary',
        calendar_name: userData.email ? `Google Calendar (${userData.email})` : 'Google Calendar'
      };

      console.log('✅ GOOGLE AUTH: Tokens reais obtidos via plataforma:', { 
        user_email: userData.email,
        expires_in: tokenData.expires_in
      });

      return calendarCredentials;
    } catch (error) {
      console.error('❌ GOOGLE AUTH: Erro ao trocar código por tokens:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha na autenticação com Google: ${errorMessage}`);
    }
  }

  /**
   * 🆕 Salva integração usando o novo sistema centralizado
   */
  static async saveIntegration(
    userId: string, 
    tenantId: string, 
    credentials: GoogleCalendarCredentials
  ): Promise<string> {
    try {
      console.log('💾 GOOGLE AUTH: Salvando integração via sistema centralizado...');

      // Usar nova API centralizada
      const response = await fetch('/api/platform-integrations/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: 'google',
          provider_user_id: 'google_user_' + userId.substr(0, 8),
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token,
          calendar_data: {
            calendar_id: credentials.calendar_id || 'primary',
            calendar_name: credentials.calendar_name || 'Google Calendar',
            token_expires_at: credentials.token_expires_at,
            sync_enabled: true,
            sync_direction: 'bidirectional',
            default_calendar: true,
            auto_create_tasks: true,
            notification_preferences: {},
            integration_metadata: {
              connected_at: new Date().toISOString(),
              last_auth_at: new Date().toISOString(),
              connection_source: 'platform_integration'
            }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ GOOGLE AUTH: Erro ao salvar via API centralizada:', errorData);
        throw new Error(errorData.error || 'Falha ao salvar integração');
      }

      const result = await response.json();
      const integrationId = result.data?.calendar_integration_id;

      if (!integrationId) {
        throw new Error('ID da integração não retornado');
      }

      console.log('✅ GOOGLE AUTH: Integração salva via sistema centralizado:', integrationId);
      return integrationId;
    } catch (error) {
      console.error('❌ GOOGLE AUTH: Erro ao salvar integração:', error);
      
      // Fallback para sistema antigo em caso de erro
      console.log('🔄 GOOGLE AUTH: Tentando fallback para sistema antigo...');
      return await this.saveIntegrationLegacy(userId, tenantId, credentials);
    }
  }

  /**
   * 🔧 Fallback para sistema antigo (compatibilidade)
   */
  private static async saveIntegrationLegacy(
    userId: string, 
    tenantId: string, 
    credentials: GoogleCalendarCredentials
  ): Promise<string> {
    try {
      const integrationData = {
        user_id: userId,
        tenant_id: tenantId,
        provider: 'google',
        provider_user_id: 'demo_user_' + userId.substr(0, 8),
        calendar_id: credentials.calendar_id || 'primary',
        calendar_name: credentials.calendar_name || 'Calendário Principal',
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
        token_expires_at: credentials.token_expires_at,
        sync_enabled: true,
        sync_direction: 'bidirectional',
        default_calendar: true,
        auto_create_tasks: true,
        notification_preferences: {},
        integration_metadata: {
          connected_at: new Date().toISOString(),
          last_auth_at: new Date().toISOString(),
          connection_source: 'legacy_fallback'
        }
      };

      const { data, error } = await supabase
        .from('calendar_integrations')
        .insert(integrationData)
        .select()
        .single();

      if (error) {
        console.error('❌ DB: Erro ao salvar integração (fallback):', error);
        throw error;
      }

      console.log('✅ DB: Integração salva via fallback:', data.id);
      return data.id;
    } catch (error) {
      console.error('❌ GOOGLE AUTH: Erro no fallback:', error);
      throw new Error('Falha ao salvar integração');
    }
  }

  /**
   * 🆕 Verifica se empresa tem Google Calendar habilitado
   */
  async isEnabledForTenant(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/platform-integrations/tenant/available', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.data?.google_calendar === true;
    } catch (error) {
      console.warn('[GOOGLE-CALENDAR] Erro ao verificar habilitação:', error);
      return false;
    }
  }

  /**
   * Lista calendários do usuário
   */
  static async getCalendars(accessToken: string): Promise<GoogleCalendar[]> {
    try {
      // Se não temos credenciais reais, usar calendários demo
      if (this.CLIENT_ID === 'demo_client_id' || !this.CLIENT_ID || this.CLIENT_ID === 'your_google_client_id_here') {
        const mockCalendars: GoogleCalendar[] = [
          {
            id: 'primary',
            summary: 'Calendário Principal (Demo)',
            description: 'Seu calendário principal do Google',
            primary: true,
            accessRole: 'owner'
          },
          {
            id: 'work_calendar',
            summary: 'Trabalho (Demo)',
            description: 'Calendário de trabalho',
            primary: false,
            accessRole: 'owner'
          }
        ];

        console.log('📅 GOOGLE CALENDAR: Calendários demo:', mockCalendars.length);
        return mockCalendars;
      }

      // Buscar calendários reais via Google Calendar API
      console.log('📅 GOOGLE CALENDAR: Buscando calendários reais...');
      
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status} ao buscar calendários`);
      }

      const data = await response.json();
      
      const calendars: GoogleCalendar[] = data.items?.map((item: GoogleCalendarItem) => ({
        id: item.id,
        summary: item.summary || 'Calendário sem nome',
        description: item.description || '',
        primary: item.primary || false,
        accessRole: item.accessRole || 'reader'
      })) || [];

      console.log('✅ GOOGLE CALENDAR: Calendários reais obtidos:', calendars.length);
      return calendars;
    } catch (error) {
      console.error('❌ GOOGLE CALENDAR: Erro ao listar calendários:', error);
      throw new Error('Falha ao obter calendários');
    }
  }

  /**
   * Cria evento no Google Calendar
   */
  static async createEvent(
    integrationId: string,
    eventData: CalendarEvent
  ): Promise<string> {
    try {
      // Para desenvolvimento/demo, simulamos a criação do evento
      const mockEventId = 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
      
      console.log('📅 GOOGLE CALENDAR: Criando evento:', {
        integration: integrationId,
        title: eventData.title,
        start: eventData.start_time,
        end: eventData.end_time
      });

      // Salvar evento na tabela calendar_events via backend
      const response = await fetch('/api/member-tools/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        },
        body: JSON.stringify({
          integration_id: integrationId,
          external_event_id: mockEventId,
          title: eventData.title,
          description: eventData.description,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          location: eventData.location,
          lead_id: eventData.lead_id,
          attendees: eventData.attendees || []
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar evento no banco');
      }

      const result = await response.json();
      console.log('✅ GOOGLE CALENDAR: Evento criado com sucesso:', mockEventId);
      
      return mockEventId;
    } catch (error) {
      console.error('❌ GOOGLE CALENDAR: Erro ao criar evento:', error);
      throw new Error('Falha ao criar evento no calendário');
    }
  }

  /**
   * Verifica se o usuário tem integração ativa
   */
  static async hasActiveIntegration(userId: string, tenantId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('id, sync_status')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .eq('provider', 'google')
        .eq('sync_enabled', true)
        .limit(1);

      if (error) {
        console.error('❌ DB: Erro ao verificar integração:', error);
        return false;
      }

      const hasActive = data && data.length > 0 && data[0].sync_status === 'active';
      console.log(`🔍 GOOGLE AUTH: Integração ativa? ${hasActive}`);
      
      return hasActive;
    } catch (error) {
      console.error('❌ GOOGLE AUTH: Erro ao verificar integração:', error);
      return false;
    }
  }

  /**
   * Obtém integração ativa do usuário
   */
  static async getActiveIntegration(userId: string, tenantId: string) {
    try {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .eq('provider', 'google')
        .eq('sync_enabled', true)
        .eq('sync_status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('❌ DB: Erro ao obter integração ativa:', error);
        return null;
      }

      console.log('✅ GOOGLE AUTH: Integração ativa encontrada:', data.id);
      return data;
    } catch (error) {
      console.error('❌ GOOGLE AUTH: Erro ao obter integração:', error);
      return null;
    }
  }

  /**
   * Remove integração
   */
  static async removeIntegration(integrationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('calendar_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) {
        console.error('❌ DB: Erro ao remover integração:', error);
        return false;
      }

      console.log('✅ GOOGLE AUTH: Integração removida:', integrationId);
      return true;
    } catch (error) {
      console.error('❌ GOOGLE AUTH: Erro ao remover integração:', error);
      return false;
    }
  }

  public async getPlatformCredentials(): Promise<PlatformCredentials | null> {
    try {
      const directCredentialsResponse = await this.makeRequest('/platform-integrations/credentials/google', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (directCredentialsResponse.ok) {
        const result = await directCredentialsResponse.json();
        if (result.success && result.data?.client_id) {
          return result.data;
        }
      }

      return null;
    } catch (error) {
      console.warn('[GOOGLE-CALENDAR] Erro ao obter credenciais:', error);
      return null;
    }
  }
} 
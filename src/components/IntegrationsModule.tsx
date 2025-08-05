import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { showSuccessToast, showErrorToast, showWarningToast, showInfoToast } from '../lib/toast';
import { 
  Settings, 
  Eye, 
  EyeOff, 
  Copy, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Globe,
  Key,
  Webhook,
  Facebook,
  Chrome,
  Activity,
  Shield,
  Clock,
  TrendingUp,
  Database,
  AlertTriangle,
  Lock,
  Unlock,
  FileText,
  BarChart3,
  Zap,
  Save,
  Calendar,
  CalendarDays,
  Plus,
  Trash2,
  Users,
  Mail // ➕ NOVO: Ícone para aba E-mail pessoal
} from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';
import ConversionsPanel from './Conversions/ConversionsPanel';
import ConversionConfigPanel from './ConversionConfigPanel';
import GoogleCalendarSetup from './GoogleCalendarSetup';
import EmailPersonalTab from './Integrations/EmailPersonalTab'; // ➕ NOVO: Componente de E-mail pessoal
import { BlurFade } from './ui/blur-fade';
import { ShimmerButton } from './ui/shimmer-button';
import { IconBadge } from './ui/icon-badge';
import { useStatePersistence, MODULE_PERSISTENCE_CONFIGS } from '../lib/statePersistence';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface Integration {
  id: string;
  company_id: string;
  meta_ads_token?: string;
  google_ads_token?: string;
  webhook_url: string;
  webhook_secret?: string;
  api_key_public: string;
  api_key_secret: string;
  webhook_enabled?: boolean;
  rate_limit_per_minute?: number;
  created_at: string;
  updated_at: string;
  last_key_rotation?: string;
}

interface SecurityMetrics {
  last_key_rotation: string;
  failed_webhook_attempts: number;
  rate_limit_hits: number;
  total_requests_today: number;
  security_score: number;
}

interface ValidationError {
  field: string;
  message: string;
}

// 🚀 OTIMIZAÇÃO: Memoização do componente principal
const IntegrationsModule: React.FC = React.memo(() => {
  const { user } = useAuth();
  
  // 🔄 PERSISTÊNCIA: Estados com persistência automática
  const { state: persistedState, updateState: updatePersistedState } = useStatePersistence(
    MODULE_PERSISTENCE_CONFIGS.INTEGRATIONS_MODULE
  );
  
  // 📅 GOOGLE CALENDAR: Hook para integração
  const {
    hasIntegration: hasCalendarIntegration,
    isConnecting: isConnectingCalendar,
    isLoading: isLoadingCalendar,
    activeIntegration: activeCalendarIntegration,
    availableCalendars,
    connectCalendar,
    disconnectCalendar,
    refreshIntegration: refreshCalendarIntegration
  } = useGoogleCalendar();

  // 🔧 GOOGLE CALENDAR: Estados para credenciais dinâmicas
  const [googleCredentials, setGoogleCredentials] = useState<{
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  } | null>(null);

  // 🔧 GOOGLE CALENDAR: Handler para conectar com credenciais
  const handleConnectCalendar = useCallback(() => {
    connectCalendar(googleCredentials || undefined);
  }, [connectCalendar, googleCredentials]);

  // 🔄 CALLBACK: Detectar retorno do OAuth Google
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    
    if (tab === 'calendar') {
      setActiveTab('calendar');
      updatePersistedState({ activeTab: 'calendar' });
      // Atualizar status da integração após callback
      refreshCalendarIntegration();
    }
  }, [refreshCalendarIntegration, updatePersistedState]);
  
  const [activeTab, setActiveTab] = useState<'config' | 'conversions' | 'conversion-config' | 'security' | 'logs' | 'calendar' | 'email' | 'company'>(
    persistedState.activeTab || 'config'
  );
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showSecretKeys, setShowSecretKeys] = useState(false);
  const [formData, setFormData] = useState({
    meta_ads_token: '',
    google_ads_token: ''
  });
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [testResults, setTestResults] = useState({
    meta_ads: null as boolean | null,
    google_ads: null as boolean | null
  });
  const [copySuccess, setCopySuccess] = useState({
    webhook: false,
    webhook_secret: false,
    public_key: false,
    secret_key: false
  });
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  // 🚀 OTIMIZAÇÃO: Memoização de validadores de token
  const validateMetaToken = useCallback((token: string) => {
    return (token.startsWith('EAA') || token.startsWith('EAAG')) && token.length >= 10;
  }, []);

  const validateGoogleToken = useCallback((token: string) => {
    return token.length >= 10;
  }, []);

  // 🚀 OTIMIZAÇÃO: Carregar integração memoizada
  const loadIntegration = useCallback(async () => {
    try {
      setLoading(true);
      
      const savedUser = localStorage.getItem('crm_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        
        if (userData.tenant_id === 'demo') {
          const mockIntegration: Integration = {
            id: 'demo-integration-1',
            company_id: 'demo',
            meta_ads_token: '',
            google_ads_token: '',
            webhook_url: `https://app.crm.com/api/integrations/webhook/${userData.tenant_id}`,
            webhook_secret: 'whsec_demo_' + Math.random().toString(36).substr(2, 32),
            api_key_public: 'pk_demo_1234567890abcdef',
            api_key_secret: 'sk_demo_abcdef1234567890abcdef1234567890',
            webhook_enabled: true,
            rate_limit_per_minute: 60,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_key_rotation: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          };

          const mockSecurityMetrics: SecurityMetrics = {
            last_key_rotation: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            failed_webhook_attempts: 3,
            rate_limit_hits: 12,
            total_requests_today: 847,
            security_score: 85
          };
          
          setIntegration(mockIntegration);
          setSecurityMetrics(mockSecurityMetrics);
          setFormData({
            meta_ads_token: mockIntegration.meta_ads_token || '',
            google_ads_token: mockIntegration.google_ads_token || ''
          });
          
          setLoading(false);
          return;
        }
      }
      
      const mockIntegration: Integration = {
        id: 'fallback-integration-1',
        company_id: user?.tenant_id || 'default',
        meta_ads_token: '',
        google_ads_token: '',
        webhook_url: `https://app.crm.com/api/integrations/webhook/${user?.tenant_id || 'default'}`,
        api_key_public: 'pk_fallback_1234567890abcdef',
        api_key_secret: 'sk_fallback_abcdef1234567890abcdef1234567890',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setIntegration(mockIntegration);
      setFormData({
        meta_ads_token: mockIntegration.meta_ads_token || '',
        google_ads_token: mockIntegration.google_ads_token || ''
      });
      
    } catch (error) {
      console.error('Erro ao carregar integração:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id]);

  // 🚀 OTIMIZAÇÃO: Handler de salvar memoizado
  const handleSave = useCallback(async () => {
    if (!integration) return;

    try {
      setSaving(true);
      
      const savedUser = localStorage.getItem('crm_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        
        if (userData.tenant_id === 'demo') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const updatedIntegration = {
            ...integration,
            meta_ads_token: formData.meta_ads_token.trim() || '',
            google_ads_token: formData.google_ads_token.trim() || '',
            updated_at: new Date().toISOString()
          };
          
          setIntegration(updatedIntegration);
          showSuccessToast('Integrações salvas', 'Configurações salvas com sucesso! (Modo demonstração)');
          setSaving(false);
          return;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedIntegration = {
        ...integration,
        meta_ads_token: formData.meta_ads_token.trim() || '',
        google_ads_token: formData.google_ads_token.trim() || '',
        updated_at: new Date().toISOString()
      };
      
      setIntegration(updatedIntegration);
      showSuccessToast('Integrações salvas', 'Configurações salvas localmente! (Modo demonstração)');
      
    } catch (error) {
      console.error('Erro ao salvar integração:', error);
      showErrorToast('Erro ao salvar', 'Erro ao salvar as integrações');
    } finally {
      setSaving(false);
    }
  }, [integration, formData]);

  // 🚀 OTIMIZAÇÃO: Handler de teste de conexão memoizado
  const handleTestConnection = useCallback(async (platform: 'meta_ads' | 'google_ads') => {
    const token = platform === 'meta_ads' ? formData.meta_ads_token : formData.google_ads_token;
    
    if (!token.trim()) {
      showWarningToast('Token obrigatório', 'Insira o token antes de testar a conexão');
      return;
    }

    try {
      let isValid = false;
      
      if (platform === 'meta_ads') {
        isValid = validateMetaToken(token);
      } else {
        isValid = validateGoogleToken(token);
      }

      setTestResults(prev => ({ ...prev, [platform]: isValid }));
      
      if (isValid) {
        showSuccessToast('Token válido', 'Token válido! (Validação básica)');
      } else {
        showErrorToast('Token inválido', 'Token inválido ou formato incorreto');
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setTestResults(prev => ({ ...prev, [platform]: false }));
      showErrorToast('Erro no teste', 'Erro ao testar a conexão');
    }
  }, [formData.meta_ads_token, formData.google_ads_token, validateMetaToken, validateGoogleToken]);

  // 🚀 OTIMIZAÇÃO: Handler de copiar memoizado
  const handleCopy = useCallback(async (text: string, type: keyof typeof copySuccess) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(prev => ({ ...prev, [type]: true }));
      
      setTimeout(() => {
        setCopySuccess(prev => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      showErrorToast('Erro ao copiar', 'Erro ao copiar para a área de transferência');
    }
  }, []);

  // 🚀 OTIMIZAÇÃO: Handler para abrir confirmação de regenerar chaves
  const handleRegenerateKeysClick = useCallback(() => {
    setShowRegenerateConfirm(true);
  }, []);

  // 🚀 OTIMIZAÇÃO: Handler de regenerar chaves memoizado
  const handleRegenerateKeys = useCallback(async () => {
    try {
      setSaving(true);
      
      const savedUser = localStorage.getItem('crm_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        
        if (userData.tenant_id === 'demo') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const newPublicKey = 'pk_demo_' + Math.random().toString(36).substr(2, 16);
          const newSecretKey = 'sk_demo_' + Math.random().toString(36).substr(2, 32);
          
          const updatedIntegration = {
            ...integration!,
            api_key_public: newPublicKey,
            api_key_secret: newSecretKey,
            updated_at: new Date().toISOString()
          };
          
          setIntegration(updatedIntegration);
          showSuccessToast('Chaves regeneradas', 'Chaves regeneradas com sucesso! (Modo demonstração)');
          setSaving(false);
          return;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newPublicKey = 'pk_fallback_' + Math.random().toString(36).substr(2, 16);
      const newSecretKey = 'sk_fallback_' + Math.random().toString(36).substr(2, 32);
      
      const updatedIntegration = {
        ...integration!,
        api_key_public: newPublicKey,
        api_key_secret: newSecretKey,
        updated_at: new Date().toISOString()
      };
      
      setIntegration(updatedIntegration);
      showSuccessToast('Chaves regeneradas', 'Chaves regeneradas localmente! (Modo demonstração)');
      
    } catch (error) {
      console.error('Erro ao regenerar chaves:', error);
      showErrorToast('Erro ao regenerar', 'Erro ao regenerar as chaves');
    } finally {
      setSaving(false);
    }
  }, [integration]);

  // 🚀 OTIMIZAÇÃO: Handlers de mudança de tab memoizados com persistência
  const handleTabChange = useCallback((tab: 'config' | 'conversions' | 'conversion-config' | 'security' | 'logs' | 'calendar' | 'email' | 'company') => {
    setActiveTab(tab);
    updatePersistedState({ activeTab: tab });
    console.log(`📍 INTEGRATIONS: Tab alterada para '${tab}' e persistida`);
  }, [updatePersistedState]);

  // 🚀 OTIMIZAÇÃO: Handlers de toggle memoizados
  const toggleShowSecret = useCallback(() => {
    setShowSecret(prev => !prev);
  }, []);

  const toggleShowSecretKeys = useCallback(() => {
    setShowSecretKeys(prev => !prev);
  }, []);

  // 🚀 OTIMIZAÇÃO: Memoização de dados formatados
  const formattedSecurityScore = useMemo(() => {
    if (!securityMetrics) return 'N/A';
    return `${securityMetrics.security_score}%`;
  }, [securityMetrics]);

  const formattedLastRotation = useMemo(() => {
    if (!securityMetrics?.last_key_rotation) return 'Nunca';
    return new Date(securityMetrics.last_key_rotation).toLocaleDateString('pt-BR');
  }, [securityMetrics?.last_key_rotation]);

  const securityScoreColor = useMemo(() => {
    if (!securityMetrics) return 'text-gray-500';
    if (securityMetrics.security_score >= 80) return 'text-green-600';
    if (securityMetrics.security_score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }, [securityMetrics]);

  // 🏢 COMPANY MANAGEMENT: Estados para gestão empresarial
  const [tenantIntegration, setTenantIntegration] = useState<{
    google_calendar_enabled: boolean;
    google_calendar_settings?: any;
  } | null>(null);
  const [loadingTenantIntegration, setLoadingTenantIntegration] = useState(false);
  const [savingTenantIntegration, setSavingTenantIntegration] = useState(false);

  // 🏢 COMPANY MANAGEMENT: Carregar configurações da empresa
  const loadTenantIntegration = useCallback(async () => {
    if (!user?.tenant_id) return;
    
    try {
      setLoadingTenantIntegration(true);
      
      // Verificar se é modo demo
      if (user.tenant_id === 'demo') {
        const mockTenantIntegration = {
          google_calendar_enabled: true,
          google_calendar_settings: {
            auto_create_events: true,
            reminder_notifications: true,
            bidirectional_sync: true
          }
        };
        setTenantIntegration(mockTenantIntegration);
        setLoadingTenantIntegration(false);
        return;
      }

      // Buscar configurações reais da empresa
      const { data, error } = await supabase
        .from('tenant_integrations')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .eq('integration_type', 'google_calendar')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar configurações da empresa:', error);
        return;
      }

      setTenantIntegration(data || {
        google_calendar_enabled: false,
        google_calendar_settings: {}
      });
    } catch (error) {
      console.error('Erro ao carregar configurações da empresa:', error);
    } finally {
      setLoadingTenantIntegration(false);
    }
  }, [user]);

  // 🏢 COMPANY MANAGEMENT: Salvar configurações da empresa
  const saveTenantIntegration = useCallback(async (enabled: boolean, settings?: any) => {
    if (!user?.tenant_id || user.role !== 'admin') return;
    
    try {
      setSavingTenantIntegration(true);
      
      // Verificar se é modo demo
      if (user.tenant_id === 'demo') {
        setTenantIntegration({
          google_calendar_enabled: enabled,
          google_calendar_settings: settings || {}
        });
        showSuccessToast('Configurações da empresa atualizadas com sucesso! (Modo Demo)');
        setSavingTenantIntegration(false);
        return;
      }

      // Salvar configurações reais
      const { error } = await supabase
        .from('tenant_integrations')
        .upsert({
          tenant_id: user.tenant_id,
          integration_type: 'google_calendar',
          enabled: enabled,
          settings: settings || {},
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao salvar configurações da empresa:', error);
        showErrorToast('Erro ao salvar configurações da empresa');
        return;
      }

      setTenantIntegration({
        google_calendar_enabled: enabled,
        google_calendar_settings: settings || {}
      });
      
      showSuccessToast('Configurações da empresa atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações da empresa:', error);
      showErrorToast('Erro ao salvar configurações da empresa');
    } finally {
      setSavingTenantIntegration(false);
    }
  }, [user]);

  // 🚀 OTIMIZAÇÃO: useEffect memoizado
  useEffect(() => {
    if (user?.role === 'admin') {
      loadIntegration();
      loadTenantIntegration();
    } else if (user?.role === 'member') {
      // Members só precisam das configurações da empresa para verificar se está habilitado
      loadTenantIntegration();
    }
  }, [user, loadIntegration, loadTenantIntegration]);

  // Verificar permissão de acesso
  if (!user || !['admin', 'member'].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acesso Negado</h3>
          <p className="text-gray-500">Apenas administradores e membros podem acessar as integrações.</p>
        </div>
      </div>
    );
  }

  // Loading state para members
  if (user.role === 'member' && loadingTenantIntegration) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando integrações...</div>
      </div>
    );
  }

  // Loading state para admins
  if (user.role === 'admin' && loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando integrações...</div>
      </div>
    );
  }

  // Error state para admins
  if (user.role === 'admin' && !integration) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erro</h3>
          <p className="text-gray-500">Não foi possível carregar as integrações.</p>
          <button
            onClick={loadIntegration}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // 👤 MEMBER VIEW: Interface simplificada para members
  if (user.role === 'member') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Calendar className="text-white text-lg" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Integrações</h1>
              <p className="text-sm text-gray-500 mt-1">
                Conecte suas ferramentas pessoais para melhorar sua produtividade
              </p>
            </div>
          </div>
        </div>

        {/* Company Integration Status */}
        {!tenantIntegration?.google_calendar_enabled ? (
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
            <div className="flex items-center space-x-3">
              <IconBadge
                icon={<AlertTriangle size={16} />}
                variant="yellow"
                size="md"
              />
              <div>
                <h3 className="text-lg font-medium text-yellow-800">Google Calendar Não Habilitado</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  O administrador da sua empresa ainda não habilitou a integração com Google Calendar. 
                  Entre em contato com o administrador para solicitar a habilitação.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Google Calendar Integration for Members */
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <IconBadge
                  icon={<Calendar size={16} />}
                  variant="blue"
                  size="md"
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Google Calendar</h3>
                  <p className="text-sm text-gray-500">Conecte sua conta pessoal do Google Calendar</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {hasCalendarIntegration && (
                  <button 
                    onClick={refreshCalendarIntegration}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                  >
                    <RefreshCw size={16} />
                    <span>Atualizar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Connection Status */}
            {!hasCalendarIntegration ? (
              <div className="space-y-6">
                {/* Benefits */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <BlurFade delay={0.1}>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-3">
                        <IconBadge
                          icon={<Plus size={16} />}
                          variant="blue"
                          size="md"
                        />
                        <div>
                          <h4 className="font-medium text-blue-900">Criação Automática</h4>
                          <p className="text-sm text-blue-700">Eventos criados automaticamente</p>
                        </div>
                      </div>
                    </div>
                  </BlurFade>

                  <BlurFade delay={0.2}>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-3">
                        <IconBadge
                          icon={<Clock size={16} />}
                          variant="green"
                          size="md"
                        />
                        <div>
                          <h4 className="font-medium text-green-900">Lembretes</h4>
                          <p className="text-sm text-green-700">Notificações automáticas</p>
                        </div>
                      </div>
                    </div>
                  </BlurFade>

                  <BlurFade delay={0.3}>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center space-x-3">
                        <IconBadge
                          icon={<RefreshCw size={16} />}
                          variant="purple"
                          size="md"
                        />
                        <div>
                          <h4 className="font-medium text-purple-900">Sincronização</h4>
                          <p className="text-sm text-purple-700">Bidirecional em tempo real</p>
                        </div>
                      </div>
                    </div>
                  </BlurFade>
                </div>

                {/* Connect Button */}
                <div className="text-center p-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                  <IconBadge
                    icon={<Calendar size={32} />}
                    variant="blue"
                    size="2xl"
                    shape="circle"
                    className="mx-auto mb-4"
                  />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Conectar Google Calendar</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Conecte sua conta pessoal do Google Calendar para criar eventos automaticamente a partir dos seus leads.
                  </p>
                  
                  <ShimmerButton
                    onClick={handleConnectCalendar}
                    disabled={isConnectingCalendar}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-3 mx-auto"
                  >
                    {isConnectingCalendar ? (
                      <>
                        <RefreshCw className="animate-spin" size={20} />
                        <span>Conectando...</span>
                      </>
                    ) : (
                      <>
                        <Calendar size={20} />
                        <span>Conectar Google Calendar</span>
                      </>
                    )}
                  </ShimmerButton>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Como funciona:</h4>
                  <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                    <li>Clique em "Conectar Google Calendar"</li>
                    <li>Autorize o acesso na janela do Google</li>
                    <li>Pronto! Agora você pode criar eventos automaticamente</li>
                    <li>Use o ícone de calendário nos leads para criar eventos</li>
                  </ol>
                </div>
              </div>
            ) : (
              /* Connected State */
              <div className="space-y-6">
                {/* Connection Status */}
                <div className="p-6 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100">
                        <CheckCircle className="text-green-600" size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-green-900">Conectado com Sucesso!</h3>
                        <p className="text-sm text-green-700">
                          Conectado como: {activeCalendarIntegration?.calendar_name || 'Google Calendar'}
                        </p>
                        {activeCalendarIntegration && (
                          <p className="text-xs text-green-600 mt-1">
                            Conectado em: {new Date(activeCalendarIntegration.created_at).toLocaleString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={disconnectCalendar}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                      >
                        <Trash2 size={16} />
                        <span>Desconectar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Calendar Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <BlurFade delay={0.1}>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center space-x-3">
                        <IconBadge
                          icon={<Calendar size={16} />}
                          variant="blue"
                          size="md"
                        />
                        <div>
                          <p className="text-sm text-gray-500">Calendários</p>
                          <p className="text-lg font-semibold text-gray-900">{availableCalendars.length}</p>
                        </div>
                      </div>
                    </div>
                  </BlurFade>

                  <BlurFade delay={0.2}>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center space-x-3">
                        <IconBadge
                          icon={<CheckCircle size={16} />}
                          variant="green"
                          size="md"
                        />
                        <div>
                          <p className="text-sm text-gray-500">Eventos Criados</p>
                          <p className="text-lg font-semibold text-gray-900">47</p>
                        </div>
                      </div>
                    </div>
                  </BlurFade>

                  <BlurFade delay={0.3}>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Activity className="text-purple-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <p className="text-lg font-semibold text-green-600">Ativo</p>
                        </div>
                      </div>
                    </div>
                  </BlurFade>
                </div>

                {/* Available Calendars */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Calendários Disponíveis</h3>
                    <p className="text-sm text-gray-500 mt-1">Calendários que você pode usar para criar eventos</p>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    {availableCalendars.map((calendar, index) => (
                      <BlurFade key={calendar.id} delay={index * 0.1}>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Calendar className="text-blue-600" size={16} />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{calendar.summary}</h4>
                              {calendar.description && (
                                <p className="text-sm text-gray-500">{calendar.description}</p>
                              )}
                              <p className="text-xs text-gray-400">
                                Acesso: {calendar.accessRole} {calendar.primary && '• Principal'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {calendar.primary && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Principal
                              </span>
                            )}
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Disponível
                            </span>
                          </div>
                        </div>
                      </BlurFade>
                    ))}
                  </div>
                </div>

                {/* Personal Settings */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações Pessoais</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">Criação Automática de Eventos</h4>
                        <p className="text-sm text-gray-500">Criar eventos automaticamente quando clicar no ícone do lead</p>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          defaultChecked={tenantIntegration?.google_calendar_settings?.auto_create_events !== false}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">Notificações de Lembrete</h4>
                        <p className="text-sm text-gray-500">Receber notificações 15 minutos antes dos eventos</p>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          defaultChecked={tenantIntegration?.google_calendar_settings?.reminder_notifications !== false}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">Sincronização Bidirecional</h4>
                        <p className="text-sm text-gray-500">Sincronizar eventos entre o CRM e Google Calendar</p>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          defaultChecked={tenantIntegration?.google_calendar_settings?.bidirectional_sync !== false}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="text-blue-600" size={16} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Precisa de Ajuda?</h3>
              <p className="text-sm text-gray-500">Dicas para usar as integrações</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Como Criar Eventos</h4>
              <p className="text-sm text-blue-700">
                Clique no ícone de calendário ao lado de qualquer lead para criar um evento automaticamente.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">Problemas de Conexão</h4>
              <p className="text-sm text-green-700">
                Se tiver problemas, desconecte e conecte novamente. Entre em contato com o suporte se persistir.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Settings className="text-white text-lg" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Integrações</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure suas integrações de marketing e APIs
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => handleTabChange('config')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'config'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings size={16} />
                <span>Configurações</span>
              </div>
            </button>
            <button
              onClick={() => handleTabChange('conversions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'conversions'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Activity size={16} />
                <span>Conversões</span>
              </div>
            </button>
            <button
              onClick={() => handleTabChange('conversion-config')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'conversion-config'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings size={16} />
                <span>Config Avançada</span>
              </div>
            </button>
            <button
              onClick={() => handleTabChange('security')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'security'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Shield size={16} />
                <span>Segurança</span>
                {securityMetrics && securityMetrics.security_score < 80 && (
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                )}
              </div>
            </button>
            <button
              onClick={() => handleTabChange('logs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'logs'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText size={16} />
                <span>Logs</span>
              </div>
            </button>
            <button
              onClick={() => handleTabChange('calendar')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'calendar'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Calendar size={16} />
                <span>Google Calendar</span>
                {hasCalendarIntegration && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </div>
            </button>
            <button
              onClick={() => handleTabChange('email')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'email'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Mail size={16} />
                <span>E-mail pessoal</span>
              </div>
            </button>
            <button
              onClick={() => handleTabChange('company')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'company'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Shield size={16} />
                <span>Gestão da Empresa</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'config' && integration ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Meta Ads Integration */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Facebook className="text-blue-600" size={16} />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Meta Ads</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Token de Acesso
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="password"
                          value={formData.meta_ads_token}
                          onChange={(e) => setFormData(prev => ({ ...prev, meta_ads_token: e.target.value }))}
                          placeholder="Cole seu token do Meta Ads aqui..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <ShimmerButton
                          onClick={() => handleTestConnection('meta_ads')}
                          disabled={testResults.meta_ads === null}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                        >
                          <Globe size={16} />
                          <span>Testar</span>
                        </ShimmerButton>
                      </div>
                      {testResults.meta_ads !== null && (
                        <div className={`mt-2 flex items-center space-x-2 text-sm ${
                          testResults.meta_ads ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {testResults.meta_ads ? (
                            <CheckCircle size={16} />
                          ) : (
                            <AlertCircle size={16} />
                          )}
                          <span>
                            {testResults.meta_ads ? 'Token válido' : 'Token inválido'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      <p>• O token deve começar com "EAA" ou "EAAG"</p>
                      <p>• Obtenha em: Meta for Developers → Aplicativos</p>
                    </div>
                  </div>
                </div>

                {/* Google Ads Integration */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <Chrome className="text-red-600" size={16} />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Google Ads</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Token de Acesso
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="password"
                          value={formData.google_ads_token}
                          onChange={(e) => setFormData(prev => ({ ...prev, google_ads_token: e.target.value }))}
                          placeholder="Cole seu token do Google Ads aqui..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                        <ShimmerButton
                          onClick={() => handleTestConnection('google_ads')}
                          disabled={testResults.google_ads === null}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                        >
                          <Globe size={16} />
                          <span>Testar</span>
                        </ShimmerButton>
                      </div>
                      {testResults.google_ads !== null && (
                        <div className={`mt-2 flex items-center space-x-2 text-sm ${
                          testResults.google_ads ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {testResults.google_ads ? (
                            <CheckCircle size={16} />
                          ) : (
                            <AlertCircle size={16} />
                          )}
                          <span>
                            {testResults.google_ads ? 'Token válido' : 'Token inválido'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      <p>• Token de desenvolvedor do Google Ads</p>
                      <p>• Obtenha em: Google Ads API → Tokens</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Webhook Configuration */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Webhook className="text-green-600" size={16} />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Webhook de Leads</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL do Webhook
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={integration.webhook_url}
                        readOnly
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-600"
                      />
                      <button
                        onClick={() => handleCopy(integration.webhook_url, 'webhook')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                      >
                        {copySuccess.webhook ? (
                          <CheckCircle size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                        <span>{copySuccess.webhook ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    <p>• Use esta URL em integrações N8N, Zapier, Make.com</p>
                    <p>• Configurada automaticamente para sua empresa</p>
                  </div>
                </div>
              </div>

              {/* API Keys */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Key className="text-yellow-600" size={16} />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Chaves de API</h2>
                  </div>
                  <button
                    onClick={handleRegenerateKeysClick}
                    disabled={saving}
                    className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2 text-sm"
                  >
                    <RefreshCw size={14} />
                    <span>Regenerar</span>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chave Pública
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={integration.api_key_public}
                        readOnly
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-600 font-mono text-sm"
                      />
                      <button
                        onClick={() => handleCopy(integration.api_key_public, 'public_key')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                      >
                        {copySuccess.public_key ? (
                          <CheckCircle size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                        <span>{copySuccess.public_key ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chave Secreta
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={integration.api_key_secret}
                        readOnly
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-600 font-mono text-sm"
                      />
                      <button
                        onClick={toggleShowSecret}
                        className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        onClick={() => handleCopy(integration.api_key_secret, 'secret_key')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                      >
                        {copySuccess.secret_key ? (
                          <CheckCircle size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                        <span>{copySuccess.secret_key ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    <p>• Chave pública: Identificação da empresa</p>
                    <p>• Chave secreta: Autenticação de APIs (mantenha segura)</p>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Salvar Configurações</h3>
                    <p className="text-sm text-gray-500">
                      Salve os tokens do Meta Ads e Google Ads
                    </p>
                  </div>
                  <ShimmerButton
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="animate-spin" size={16} />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        <span>Salvar Integrações</span>
                      </>
                    )}
                  </ShimmerButton>
                </div>
              </div>
            </div>
          ) : activeTab === 'conversions' ? (
            <ConversionsPanel />
          ) : activeTab === 'conversion-config' ? (
            <ConversionConfigPanel />
          ) : activeTab === 'security' && integration ? (
            <div className="space-y-6">
              {/* Security Score */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Shield className="text-purple-600" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Score de Segurança</h2>
                      <p className="text-sm text-gray-600">Avaliação da segurança das suas integrações</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${securityScoreColor}`}>
                      {formattedSecurityScore}
                    </div>
                    <div className={`text-sm font-medium ${securityScoreColor}`}>
                      {securityMetrics && securityMetrics.security_score >= 90 ? 'Excelente' :
                       securityMetrics && securityMetrics.security_score >= 80 ? 'Bom' : 'Precisa melhorar'}
                    </div>
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      securityMetrics && securityMetrics.security_score >= 90 ? 'bg-green-500' :
                      securityMetrics && securityMetrics.security_score >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${securityMetrics?.security_score || 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Security Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Clock className="text-blue-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Última Rotação</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formattedLastRotation}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="text-red-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Tentativas Falhadas</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {securityMetrics?.failed_webhook_attempts || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="text-yellow-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Rate Limit Hits</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {securityMetrics?.rate_limit_hits || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="text-green-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Requests Hoje</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {securityMetrics?.total_requests_today || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Settings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Webhook Security */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Webhook className="text-green-600" size={16} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Segurança do Webhook</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Webhook Habilitado</p>
                        <p className="text-sm text-gray-500">Receber leads via webhook</p>
                      </div>
                      <div className={`w-12 h-6 rounded-full ${integration?.webhook_enabled ? 'bg-green-500' : 'bg-gray-300'} relative transition-colors`}>
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${integration?.webhook_enabled ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rate Limit (requests/minuto)
                      </label>
                      <input
                        type="number"
                        value={integration?.rate_limit_per_minute || 60}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Webhook Secret (HMAC)
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type={showSecretKeys ? 'text' : 'password'}
                          value={integration?.webhook_secret || 'whsec_***'}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                        />
                        <button
                          onClick={toggleShowSecretKeys}
                          className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          {showSecretKeys ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => handleCopy(integration?.webhook_secret || '', 'webhook_secret')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                        >
                          {copySuccess.webhook_secret ? (
                            <CheckCircle size={16} />
                          ) : (
                            <Copy size={16} />
                          )}
                          <span>{copySuccess.webhook_secret ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* API Security */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Key className="text-yellow-600" size={16} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Segurança da API</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        integration?.last_key_rotation && 
                        new Date(integration.last_key_rotation) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
                          ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900">Rotação de Chaves</p>
                        <p className="text-sm text-gray-500">
                          Última rotação: {formattedLastRotation}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div>
                        <p className="font-medium text-gray-900">Criptografia</p>
                        <p className="text-sm text-gray-500">Chaves armazenadas com AES-256</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div>
                        <p className="font-medium text-gray-900">HMAC Validation</p>
                        <p className="text-sm text-gray-500">Assinatura SHA-256 ativa</p>
                      </div>
                    </div>

                    <button
                      onClick={handleRegenerateKeysClick}
                      disabled={saving}
                      className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <RefreshCw size={16} />
                      <span>Regenerar Chaves</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Security Recommendations */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="text-blue-600" size={16} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Recomendações de Segurança</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="text-yellow-600 mt-0.5" size={16} />
                    <div>
                      <p className="font-medium text-yellow-800">Rotação de Chaves</p>
                      <p className="text-sm text-yellow-700">
                        Recomendamos regenerar as chaves de API a cada 30 dias para maior segurança.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                    <Lock className="text-blue-600 mt-0.5" size={16} />
                    <div>
                      <p className="font-medium text-blue-800">Monitoramento</p>
                      <p className="text-sm text-blue-700">
                        Monitore regularmente os logs de webhook para detectar atividades suspeitas.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="text-green-600 mt-0.5" size={16} />
                    <div>
                      <p className="font-medium text-green-800">HTTPS Obrigatório</p>
                      <p className="text-sm text-green-700">
                        Todas as comunicações são criptografadas com TLS 1.3.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'logs' ? (
            <div className="space-y-6">
              {/* Logs Header */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <FileText className="text-gray-600" size={16} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Logs de Atividade</h2>
                      <p className="text-sm text-gray-500">Histórico de webhooks e requisições de API</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                      Filtrar
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Exportar
                    </button>
                  </div>
                </div>
              </div>

              {/* Logs Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="text-green-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Sucessos Hoje</p>
                      <p className="text-lg font-semibold text-gray-900">247</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertCircle className="text-red-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Erros Hoje</p>
                      <p className="text-lg font-semibold text-gray-900">3</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Database className="text-blue-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Leads</p>
                      <p className="text-lg font-semibold text-gray-900">1,234</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="text-purple-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Taxa Sucesso</p>
                      <p className="text-lg font-semibold text-gray-900">98.8%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logs Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Logs Recentes</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lead
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          IP
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tempo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                                             {[
                         {
                           id: 1,
                           timestamp: '2024-12-20 15:30:25',
                           event_type: 'Webhook',
                           status: 'success',
                           lead_data: { name: 'João Silva', email: 'joao@email.com' },
                           source_ip: '192.168.1.100',
                           processing_time: '145'
                         },
                         {
                           id: 2,
                           timestamp: '2024-12-20 15:28:12',
                           event_type: 'API',
                           status: 'success',
                           lead_data: { name: 'Maria Santos', email: 'maria@email.com' },
                           source_ip: '10.0.0.50',
                           processing_time: '89'
                         },
                         {
                           id: 3,
                           timestamp: '2024-12-20 15:25:45',
                           event_type: 'Webhook',
                           status: 'error',
                           lead_data: { name: 'Erro Lead', email: 'erro@email.com' },
                           source_ip: '203.0.113.1',
                           processing_time: '2300'
                         }
                       ].map((log, index) => (
                        <BlurFade key={log.id} delay={index * 0.05}>
                          <tr className="hover:bg-gray-50 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(log.timestamp).toLocaleString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {log.event_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                log.status === 'success' ? 'bg-green-100 text-green-800' :
                                log.status === 'error' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {log.status === 'success' ? 'Sucesso' : 
                                 log.status === 'error' ? 'Erro' : 'Processando'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                                             <div className="text-sm text-gray-900">
                                 {log.lead_data?.name || 'N/A'}
                               </div>
                              <div className="text-sm text-gray-500">
                                {log.lead_data?.email || 'Email não informado'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {log.source_ip || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {log.processing_time || '0'}ms
                            </td>
                          </tr>
                        </BlurFade>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Mostrando 1-5 de 1,234 logs
                    </p>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        Anterior
                      </button>
                      <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        Próximo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'calendar' ? (
            <div className="space-y-6">
              {/* Google Calendar Header */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar className="text-blue-600" size={16} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Google Calendar</h2>
                      <p className="text-sm text-gray-500">Configure e conecte com seu Google Calendar para criar eventos automaticamente</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {hasCalendarIntegration && (
                      <button 
                        onClick={refreshCalendarIntegration}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                      >
                        <RefreshCw size={16} />
                        <span>Atualizar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Google Calendar Setup Component */}
              {!hasCalendarIntegration ? (
                <GoogleCalendarSetup
                  onCredentialsChange={setGoogleCredentials}
                  onConnect={handleConnectCalendar}
                  isConnecting={isConnectingCalendar}
                  hasIntegration={hasCalendarIntegration}
                />
              ) : (
                /* Connection Status */
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100">
                        <CheckCircle className="text-green-600" size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Conectado com Sucesso!</h3>
                        <p className="text-sm text-gray-500">
                          Conectado como: {activeCalendarIntegration?.calendar_name || 'Google Calendar'}
                        </p>
                        {activeCalendarIntegration && (
                          <p className="text-xs text-gray-400 mt-1">
                            Conectado em: {new Date(activeCalendarIntegration.created_at).toLocaleString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={disconnectCalendar}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                      >
                        <Trash2 size={16} />
                        <span>Desconectar</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {hasCalendarIntegration && (
                <>
                  {/* Calendar Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <BlurFade delay={0.1}>
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Calendar className="text-blue-600" size={16} />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Calendários</p>
                            <p className="text-lg font-semibold text-gray-900">{availableCalendars.length}</p>
                          </div>
                        </div>
                      </div>
                    </BlurFade>

                    <BlurFade delay={0.2}>
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="text-green-600" size={16} />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Eventos Criados</p>
                            <p className="text-lg font-semibold text-gray-900">47</p>
                          </div>
                        </div>
                      </div>
                    </BlurFade>

                    <BlurFade delay={0.3}>
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Activity className="text-purple-600" size={16} />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <p className="text-lg font-semibold text-green-600">Ativo</p>
                          </div>
                        </div>
                      </div>
                    </BlurFade>
                  </div>

                  {/* Available Calendars */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Calendários Disponíveis</h3>
                      <p className="text-sm text-gray-500 mt-1">Calendários que você pode usar para criar eventos</p>
                    </div>
                    
                    <div className="p-6 space-y-4">
                      {availableCalendars.map((calendar, index) => (
                        <BlurFade key={calendar.id} delay={index * 0.1}>
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Calendar className="text-blue-600" size={16} />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{calendar.summary}</h4>
                                {calendar.description && (
                                  <p className="text-sm text-gray-500">{calendar.description}</p>
                                )}
                                <p className="text-xs text-gray-400">
                                  Acesso: {calendar.accessRole} {calendar.primary && '• Principal'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {calendar.primary && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Principal
                                </span>
                              )}
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Disponível
                              </span>
                            </div>
                          </div>
                        </BlurFade>
                      ))}
                    </div>
                  </div>

                  {/* Integration Settings */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações de Integração</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">Criação Automática de Eventos</h4>
                          <p className="text-sm text-gray-500">Criar eventos automaticamente quando clicar no ícone do lead</p>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            defaultChecked={true}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">Notificações de Lembrete</h4>
                          <p className="text-sm text-gray-500">Receber notificações 15 minutos antes dos eventos</p>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            defaultChecked={true}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">Sincronização Bidirecional</h4>
                          <p className="text-sm text-gray-500">Sincronizar eventos entre o CRM e Google Calendar</p>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            defaultChecked={true}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
                      ) : activeTab === 'email' ? (
                <EmailPersonalTab />
              ) : activeTab === 'company' ? (
                <div className="space-y-6">
                  {/* Company Integration Status */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Shield className="text-purple-600" size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Gestão da Empresa</h2>
                        <p className="text-sm text-gray-500">Configure suas integrações de marketing e APIs</p>
                      </div>
                    </div>

                    {/* Company Policies */}
                    <div className="space-y-4">
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-medium text-gray-900 mb-3">Políticas da Empresa</h4>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div>
                              <h5 className="font-medium text-blue-900">Criação Automática Permitida</h5>
                              <p className="text-sm text-blue-700">Membros podem criar eventos automaticamente</p>
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                defaultChecked={tenantIntegration?.google_calendar_settings?.auto_create_events !== false}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div>
                              <h5 className="font-medium text-blue-900">Notificações Habilitadas</h5>
                              <p className="text-sm text-blue-700">Permitir notificações de lembrete</p>
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                defaultChecked={tenantIntegration?.google_calendar_settings?.reminder_notifications !== false}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div>
                              <h5 className="font-medium text-blue-900">Sincronização Bidirecional</h5>
                              <p className="text-sm text-blue-700">Sincronizar eventos entre CRM e Google Calendar</p>
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                defaultChecked={tenantIntegration?.google_calendar_settings?.bidirectional_sync !== false}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Usage Statistics */}
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-medium text-gray-900 mb-3">Estatísticas de Uso</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <BlurFade delay={0.1}>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <Users className="text-blue-600" size={16} />
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Usuários Conectados</p>
                                  <p className="text-lg font-semibold text-gray-900">12</p>
                                </div>
                              </div>
                            </div>
                          </BlurFade>

                          <BlurFade delay={0.2}>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                  <Calendar className="text-green-600" size={16} />
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Eventos Criados (30d)</p>
                                  <p className="text-lg font-semibold text-gray-900">847</p>
                                </div>
                              </div>
                            </div>
                          </BlurFade>

                          <BlurFade delay={0.3}>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                  <TrendingUp className="text-purple-600" size={16} />
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Taxa de Uso</p>
                                  <p className="text-lg font-semibold text-gray-900">94%</p>
                                </div>
                              </div>
                            </div>
                          </BlurFade>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Company Integrations */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Globe className="text-gray-600" size={16} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Outras Integrações</h3>
                        <p className="text-sm text-gray-500">Configurações adicionais da empresa</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Webhook className="text-gray-600" size={16} />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">Webhooks Empresariais</h4>
                            <p className="text-sm text-gray-500">Em breve - Configuração de webhooks centralizados</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Em Breve
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Database className="text-gray-600" size={16} />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">APIs Externas</h4>
                            <p className="text-sm text-gray-500">Em breve - Integração com CRMs externos</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Em Breve
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar Chaves de API</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja regenerar as chaves de API? As chaves atuais deixarão de funcionar 
              imediatamente e você precisará atualizar todas as integrações que utilizam essas chaves.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowRegenerateConfirm(false);
                await handleRegenerateKeys();
              }}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Regenerar Chaves
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

export default IntegrationsModule; 
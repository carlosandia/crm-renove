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
  Mail, // ➕ NOVO: Ícone para aba E-mail pessoal
  HelpCircle // ➕ NOVO: Ícone para botão de instruções
} from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';
import GoogleCalendarSetup from './GoogleCalendarSetup';
import EmailPersonalTab from './Integrations/EmailPersonalTab'; // ➕ NOVO: Componente de E-mail pessoal
import { WebhookInstructionsModal } from './Integrations/WebhookInstructionsModal'; // ➕ NOVO: Modal de instruções
import { BlurFade } from './ui/blur-fade';
import { ShimmerButton } from './ui/shimmer-button';
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

// ✅ INTEGRAÇÃO: Interface para props do componente
interface IntegrationsModuleProps {
  initialTab?: 'config' | 'calendar' | 'email';
}

// 🚀 OTIMIZAÇÃO: Memoização do componente principal
const IntegrationsModule: React.FC<IntegrationsModuleProps> = React.memo(({ initialTab }) => {
  const { user } = useAuth();
  
  // 🔄 PERSISTÊNCIA: Estados com persistência automática
  const { state: persistedState, updateState: updatePersistedState } = useStatePersistence(
    MODULE_PERSISTENCE_CONFIGS.INTEGRATIONS_MODULE
  );
  
  // Estados principais - MOVIDO PARA ANTES DOS HOOKS QUE OS UTILIZAM
  // ✅ INTEGRAÇÃO: Use initialTab se fornecido, senão use estado persistido ou padrão
  const [activeTab, setActiveTab] = useState<'config' | 'calendar' | 'email'>(
    initialTab || persistedState.activeTab || 'config'
  );
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showSecretKeys, setShowSecretKeys] = useState(false);
  
  // 🎯 NOVO: Estado do modal de instruções e ref do botão trigger
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const instructionsButtonRef = React.useRef<HTMLButtonElement>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [formData, setFormData] = useState({
    meta_ads_token: '',
    google_ads_token: ''
  });
  const [testResults, setTestResults] = useState<{
    meta_ads: boolean | null;
    google_ads: boolean | null;
  }>({
    meta_ads: null,
    google_ads: null
  });
  const [copySuccess, setCopySuccess] = useState<{
    [key: string]: boolean;
  }>({});

  // 📅 GOOGLE CALENDAR: Hook para integração
  const {
    hasIntegration: hasCalendarIntegration,
    isConnecting: isConnectingCalendar,
    connectCalendar,
    refreshIntegration: refreshCalendarIntegration
  } = useGoogleCalendar();

  // 🎯 NOVO: Função do toggle webhook
  const handleToggleWebhook = useCallback(async (enabled: boolean) => {
    const tenantId = user?.tenant_id || (user as any)?.user_metadata?.tenant_id;
    if (!integration || !tenantId) return;
    
    try {
      setIsLoading(true);
      
      // Atualizar estado local imediatamente para UI responsiva
      setIntegration(prev => prev ? { ...prev, webhook_enabled: enabled } : prev);
      
      // ✅ IMPLEMENTAÇÃO: Atualizar status do webhook no banco
      const { error } = await supabase
        .from('integrations')
        .update({ 
          webhook_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', integration.id);

      if (error) {
        console.error('❌ Erro ao atualizar webhook no banco:', error);
        // Reverter estado local em caso de erro
        setIntegration(prev => prev ? { ...prev, webhook_enabled: !enabled } : prev);
        showErrorToast('Erro ao alterar status do webhook no banco');
        return;
      }
      
      showSuccessToast(`Webhook ${enabled ? 'ativado' : 'desativado'} com sucesso!`);
      console.log(`✅ WEBHOOK: ${enabled ? 'Ativado' : 'Desativado'} para tenant ${tenantId} - Salvo no banco`);
      
    } catch (error) {
      console.error('Erro ao alterar status do webhook:', error);
      
      // Reverter estado local em caso de erro
      setIntegration(prev => prev ? { ...prev, webhook_enabled: !enabled } : prev);
      
      showErrorToast('Erro ao alterar status do webhook');
    } finally {
      setIsLoading(false);
    }
  }, [integration, user?.tenant_id]);

  // 🧮 COMPUTADOS: Valores derivados memoizados
  const formattedLastRotation = useMemo(() => {
    if (!integration?.last_key_rotation) return 'Nunca';
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(integration.last_key_rotation));
  }, [integration?.last_key_rotation]);

  // 🗑️ REMOVIDO: handleTabChange (agora o controle é via prop initialTab do header)

  // Carregar integração
  useEffect(() => {
    const fetchIntegration = async () => {
      // Tentar acessar tenant_id de diferentes formas (compatibilidade)
      const tenantId = user?.tenant_id || (user as any)?.user_metadata?.tenant_id;
      
      if (!tenantId) {
        console.log('🚫 [IntegrationsModule] tenant_id não disponível:', { 
          user, 
          tenant_id: user?.tenant_id, 
          user_metadata_tenant_id: (user as any)?.user_metadata?.tenant_id 
        });
        return;
      }

      setIsLoading(true);
      console.log('🔍 [IntegrationsModule] Buscando integração para tenant_id:', tenantId);
      
      try {
        const { data, error } = await supabase
          .from('integrations')
          .select('*')
          .eq('company_id', tenantId);

        console.log('📡 [IntegrationsModule] Resposta da query:', { data, error, dataLength: data?.length });

        if (error) {
          console.error('❌ [IntegrationsModule] Erro ao carregar integração:', error);
          showErrorToast('Erro ao carregar integração');
        } else if (data && data.length > 0) {
          const integration = data[0]; // Pegar o primeiro resultado do array
          setIntegration(integration);
          setFormData({
            meta_ads_token: integration.meta_ads_token || '',
            google_ads_token: integration.google_ads_token || ''
          });
          console.log('✅ [IntegrationsModule] Integração carregada:', { 
            id: integration.id, 
            webhook_url: integration.webhook_url, 
            api_key_public: integration.api_key_public ? 'presente' : 'ausente',
            api_key_secret: integration.api_key_secret ? 'presente' : 'ausente'
          });
        } else {
          console.log('ℹ️ [IntegrationsModule] Nenhuma integração encontrada para tenant:', tenantId);
          
          // Criar integração padrão se não existir
          console.log('🔄 [IntegrationsModule] Criando integração padrão...');
          const newIntegration = {
            id: crypto.randomUUID(),
            company_id: tenantId,
            webhook_url: `https://crm.renovedigital.com.br/api/webhook/${tenantId}`,
            api_key_public: `pk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
            api_key_secret: `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
            webhook_enabled: true, // ✅ Webhook habilitado por padrão
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          setIntegration(newIntegration);
          console.log('✨ [IntegrationsModule] Integração padrão criada localmente:', newIntegration);
        }
      } catch (error) {
        console.error('💥 [IntegrationsModule] Erro inesperado:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntegration();
  }, [user?.tenant_id, (user as any)?.user_metadata?.tenant_id]);

  // 🗑️ REMOVIDO: Sistema de sincronização com subheader (agora o controle é via header dropdown)

  // ✅ INTEGRAÇÃO: Reagir a mudanças da prop initialTab vinda do header dropdown
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      console.log(`🎯 [IntegrationsModule] Aba alterada via prop initialTab: ${initialTab}`);
      setActiveTab(initialTab);
      updatePersistedState({ activeTab: initialTab });
    }
  }, [initialTab, activeTab, updatePersistedState]);

  // Funções de manipulação
  const handleCopy = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(prev => ({ ...prev, [type]: true }));
      showSuccessToast('Copiado para área de transferência!');
      setTimeout(() => {
        setCopySuccess(prev => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (err) {
      showErrorToast('Erro ao copiar para área de transferência');
    }
  }, []);

  const toggleShowSecretKeys = useCallback(() => {
    setShowSecretKeys(prev => !prev);
  }, []);

  const handleTestConnection = useCallback(async (type: 'meta_ads' | 'google_ads') => {
    const token = formData[`${type}_token`];
    if (!token) {
      showWarningToast('Token é obrigatório para teste');
      return;
    }

    try {
      showInfoToast('Testando conexão...');
      
      // Simular validação do token
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const isValid = Math.random() > 0.3; // 70% de chance de sucesso para demo
      
      setTestResults(prev => ({
        ...prev,
        [type]: isValid
      }));

      if (isValid) {
        showSuccessToast('Conexão testada com sucesso!');
      } else {
        showErrorToast('Falha na conexão. Verifique o token.');
      }
    } catch (error) {
      console.error('Erro no teste:', error);
      showErrorToast('Erro no teste de conexão');
    }
  }, [formData]);

  const handleSave = useCallback(async () => {
    const tenantId = user?.tenant_id || (user as any)?.user_metadata?.tenant_id;
    if (!tenantId || !integration) return;

    setSaving(true);
    setValidationErrors([]);

    try {
      const updateData = {
        meta_ads_token: formData.meta_ads_token || null,
        google_ads_token: formData.google_ads_token || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('integrations')
        .update(updateData)
        .eq('id', integration.id);

      if (error) {
        console.error('Erro ao salvar:', error);
        showErrorToast('Erro ao salvar configurações');
      } else {
        showSuccessToast('Configurações salvas com sucesso!');
        setIntegration(prev => prev ? { ...prev, ...updateData } : null);
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
    } finally {
      setSaving(false);
    }
  }, [user?.tenant_id, integration, formData]);

  const handleRegenerateKeysClick = useCallback(() => {
    setShowRegenerateConfirm(true);
  }, []);

  const handleRegenerateKeys = useCallback(async () => {
    if (!integration) return;

    setSaving(true);
    try {
      // Simular regeneração de chaves
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newApiKeyPublic = `pk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      const newApiKeySecret = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      const newWebhookSecret = `whsec_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      
      const updateData = {
        api_key_public: newApiKeyPublic,
        api_key_secret: newApiKeySecret,
        webhook_secret: newWebhookSecret,
        last_key_rotation: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('integrations')
        .update(updateData)
        .eq('id', integration.id);

      if (error) {
        console.error('Erro ao regenerar chaves:', error);
        showErrorToast('Erro ao regenerar chaves');
      } else {
        showSuccessToast('Chaves regeneradas com sucesso!');
        setIntegration(prev => prev ? { ...prev, ...updateData } : null);
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
    } finally {
      setSaving(false);
    }
  }, [integration]);

  if (!user || (!user.tenant_id && !(user as any)?.user_metadata?.tenant_id)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Acesso Restrito</h3>
          <p className="mt-1 text-sm text-gray-500">
            Você precisa estar logado para acessar as integrações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full">
        <div className="p-6 space-y-6">
        {activeTab === 'config' && integration && (
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
                        value={integration?.webhook_url || ''}
                        readOnly
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-600"
                      />
                      <button
                        onClick={() => handleCopy(integration?.webhook_url || '', 'webhook')}
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
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      <p>• Use esta URL em integrações N8N, Zapier, Make.com</p>
                      <p>• Configurada automaticamente para sua empresa</p>
                    </div>
                    
                    <button
                      ref={instructionsButtonRef}
                      onClick={() => {
                        // Remover foco antes de abrir modal
                        if (instructionsButtonRef.current) {
                          instructionsButtonRef.current.blur();
                        }
                        setTimeout(() => setShowInstructionsModal(true), 10);
                      }}
                      aria-label="Abrir modal de instruções para integração webhook"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <HelpCircle size={16} />
                      <span className="font-medium">Ver Instruções</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Webhook Habilitado</p>
                      <p className="text-sm text-gray-500">Receber leads via webhook</p>
                    </div>
                    <button
                      onClick={() => handleToggleWebhook(!integration?.webhook_enabled)}
                      className={`w-12 h-6 rounded-full ${integration?.webhook_enabled ? 'bg-green-500' : 'bg-gray-300'} relative transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                      disabled={isLoading}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 shadow-sm ${integration?.webhook_enabled ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                      {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* API Keys */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Key className="text-yellow-600" size={16} />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Chaves de API</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chave Pública
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type={showSecretKeys ? 'text' : 'password'}
                        value={integration?.api_key_public || ''}
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
                        onClick={() => handleCopy(integration?.api_key_public || '', 'api_key_public')}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2"
                      >
                        {copySuccess.api_key_public ? (
                          <CheckCircle size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                        <span>{copySuccess.api_key_public ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chave Secreta
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type={showSecretKeys ? 'text' : 'password'}
                        value={integration?.api_key_secret || ''}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                      />
                      <button
                        onClick={() => handleCopy(integration?.api_key_secret || '', 'api_key_secret')}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2"
                      >
                        {copySuccess.api_key_secret ? (
                          <CheckCircle size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                        <span>{copySuccess.api_key_secret ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <ShimmerButton
                  onClick={handleSave}
                  disabled={saving}
                  className={`px-6 py-3 bg-purple-600 text-white rounded-lg transition-colors flex items-center space-x-2 ${
                    saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'
                  }`}
                >
                  {saving ? (
                    <RefreshCw className="animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>{saving ? 'Salvando...' : 'Salvar Configurações'}</span>
                </ShimmerButton>
            </div>
          </div>
        )}
        
        {activeTab === 'calendar' && (
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
                    <p className="text-sm text-gray-500">
                      {hasCalendarIntegration 
                        ? 'Integração ativa - sincronizando eventos automaticamente' 
                        : 'Configure a integração com Google Calendar para sincronizar seus eventos'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {hasCalendarIntegration && (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-800">Conectado</span>
                    </div>
                  )}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    hasCalendarIntegration ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Calendar className={`w-4 h-4 ${
                      hasCalendarIntegration ? 'text-green-600' : 'text-gray-600'
                    }`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Google Calendar Setup Component */}
            <GoogleCalendarSetup 
              onCredentialsChange={() => {}}
              onConnect={connectCalendar}
              isConnecting={isConnectingCalendar}
              hasIntegration={hasCalendarIntegration}
            />
          </div>
        )}

        {activeTab === 'email' && (
          <EmailPersonalTab />
        )}
        </div>
      </div>

        {/* Webhook Instructions Modal */}
      <WebhookInstructionsModal
        isOpen={showInstructionsModal}
        onClose={() => setShowInstructionsModal(false)}
        webhookUrl={`https://crm.renovedigital.com.br/api/webhook/${user?.tenant_id || (user as any)?.user_metadata?.tenant_id || 'd7caffc1-c923-47c8-9301-ca9eeff1a243'}`}
        apiKey={integration?.api_key_public || 'pk_test_66608879d1f04d1c9ac7ff104d78b124'}
        tenantId={user?.tenant_id || (user as any)?.user_metadata?.tenant_id || 'd7caffc1-c923-47c8-9301-ca9eeff1a243'}
        triggerButtonRef={instructionsButtonRef}
      />

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
    </>
  );
});

IntegrationsModule.displayName = 'IntegrationsModule';

export default IntegrationsModule;
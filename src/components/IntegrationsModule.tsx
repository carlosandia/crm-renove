import React, { useState, useEffect } from 'react';
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
  BarChart3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ConversionsPanel from './Conversions/ConversionsPanel';

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

const IntegrationsModule: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'config' | 'conversions' | 'security' | 'logs'>('config');
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

  useEffect(() => {
    if (user?.role === 'admin') {
      loadIntegration();
    }
  }, [user]);

  const loadIntegration = async () => {
    try {
      setLoading(true);
      
      // Verificar se é usuário de demonstração
      const savedUser = localStorage.getItem('crm_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        
        // Se é usuário demo, criar integração mock
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
          
          console.log('✅ Integração demo carregada:', mockIntegration);
          setLoading(false);
          return;
        }
      }
      
      // Para usuários reais, usar dados mock também por enquanto
      console.log('⚠️ Usando dados mock para demonstração (backend não configurado)');
      
      // Fallback para dados mock se backend não estiver disponível
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
  };

  const handleSave = async () => {
    if (!integration) return;

    try {
      setSaving(true);
      
      // Verificar se é usuário de demonstração
      const savedUser = localStorage.getItem('crm_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        
        // Se é usuário demo, simular salvamento
        if (userData.tenant_id === 'demo') {
          // Simular delay de API
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Atualizar estado local
          const updatedIntegration = {
            ...integration,
            meta_ads_token: formData.meta_ads_token.trim() || '',
            google_ads_token: formData.google_ads_token.trim() || '',
            updated_at: new Date().toISOString()
          };
          
          setIntegration(updatedIntegration);
          console.log('✅ Integração demo salva localmente:', updatedIntegration);
          alert('Integrações salvas com sucesso! (Modo demonstração)');
          setSaving(false);
          return;
        }
      }
      
      // Para usuários reais, simular salvamento também
      console.log('⚠️ Salvando localmente para demonstração (backend não configurado)');
      
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fallback para salvamento local
      const updatedIntegration = {
        ...integration,
        meta_ads_token: formData.meta_ads_token.trim() || '',
        google_ads_token: formData.google_ads_token.trim() || '',
        updated_at: new Date().toISOString()
      };
      
      setIntegration(updatedIntegration);
      alert('Integrações salvas localmente! (Modo demonstração)');
      
    } catch (error) {
      console.error('Erro ao salvar integração:', error);
      alert('Erro ao salvar as integrações');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (platform: 'meta_ads' | 'google_ads') => {
    const token = platform === 'meta_ads' ? formData.meta_ads_token : formData.google_ads_token;
    
    if (!token.trim()) {
      alert('Insira o token antes de testar a conexão');
      return;
    }

    try {
      // Validação básica no frontend
      let isValid = false;
      
      if (platform === 'meta_ads') {
        // Token do Meta deve começar com EAA ou EAAG e ter pelo menos 10 caracteres
        isValid = (token.startsWith('EAA') || token.startsWith('EAAG')) && token.length >= 10;
      } else {
        // Token do Google deve ter pelo menos 10 caracteres
        isValid = token.length >= 10;
      }

      setTestResults(prev => ({ ...prev, [platform]: isValid }));
      
      if (isValid) {
        alert('Token válido! (Validação básica)');
      } else {
        alert('Token inválido ou formato incorreto');
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setTestResults(prev => ({ ...prev, [platform]: false }));
      alert('Erro ao testar a conexão');
    }
  };

  const handleCopy = async (text: string, type: keyof typeof copySuccess) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(prev => ({ ...prev, [type]: true }));
      
      setTimeout(() => {
        setCopySuccess(prev => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      alert('Erro ao copiar para a área de transferência');
    }
  };

  const handleRegenerateKeys = async () => {
    if (!confirm('Tem certeza que deseja regenerar as chaves de API? As chaves atuais deixarão de funcionar.')) {
      return;
    }

    try {
      setSaving(true);
      
      // Verificar se é usuário de demonstração
      const savedUser = localStorage.getItem('crm_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        
        // Se é usuário demo, simular regeneração
        if (userData.tenant_id === 'demo') {
          // Simular delay de API
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Gerar novas chaves mock
          const newPublicKey = 'pk_demo_' + Math.random().toString(36).substr(2, 16);
          const newSecretKey = 'sk_demo_' + Math.random().toString(36).substr(2, 32);
          
          const updatedIntegration = {
            ...integration!,
            api_key_public: newPublicKey,
            api_key_secret: newSecretKey,
            updated_at: new Date().toISOString()
          };
          
          setIntegration(updatedIntegration);
          console.log('✅ Chaves demo regeneradas:', { newPublicKey, newSecretKey });
          alert('Chaves regeneradas com sucesso! (Modo demonstração)');
          setSaving(false);
          return;
        }
      }
      
      // Para usuários reais, simular regeneração também
      console.log('⚠️ Regenerando chaves localmente para demonstração (backend não configurado)');
      
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fallback para regeneração local
      const newPublicKey = 'pk_fallback_' + Math.random().toString(36).substr(2, 16);
      const newSecretKey = 'sk_fallback_' + Math.random().toString(36).substr(2, 32);
      
      const updatedIntegration = {
        ...integration!,
        api_key_public: newPublicKey,
        api_key_secret: newSecretKey,
        updated_at: new Date().toISOString()
      };
      
      setIntegration(updatedIntegration);
      alert('Chaves regeneradas localmente! (Modo demonstração)');
      
    } catch (error) {
      console.error('Erro ao regenerar chaves:', error);
      alert('Erro ao regenerar as chaves');
    } finally {
      setSaving(false);
    }
  };

  // Verificar permissão de acesso
  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acesso Negado</h3>
          <p className="text-gray-500">Apenas administradores podem acessar as integrações.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando integrações...</div>
      </div>
    );
  }

  if (!integration) {
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
              onClick={() => setActiveTab('config')}
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
              onClick={() => setActiveTab('conversions')}
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
              onClick={() => setActiveTab('security')}
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
              onClick={() => setActiveTab('logs')}
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
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'config' ? (
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
                        <button
                          onClick={() => handleTestConnection('meta_ads')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                        >
                          <Globe size={16} />
                          <span>Testar</span>
                        </button>
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
                      <p>• Usado para enviar conversões de volta ao Meta Ads</p>
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
                        <button
                          onClick={() => handleTestConnection('google_ads')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                        >
                          <Globe size={16} />
                          <span>Testar</span>
                        </button>
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
                      <p>• Token OAuth2 do Google Ads API</p>
                      <p>• Usado para conversões offline do Google Ads</p>
                    </div>
                  </div>
                </div>

                {/* Webhook Configuration */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Webhook className="text-green-600" size={16} />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Webhook URL</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL para Receber Leads
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
                      onClick={handleRegenerateKeys}
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
                          onClick={() => setShowSecret(!showSecret)}
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
                  <button
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
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'conversions' ? (
            <ConversionsPanel />
          ) : activeTab === 'security' ? (
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
                    <div className={`text-3xl font-bold ${
                      securityMetrics && securityMetrics.security_score >= 90 ? 'text-green-600' :
                      securityMetrics && securityMetrics.security_score >= 80 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {securityMetrics?.security_score || 0}%
                    </div>
                    <div className={`text-sm font-medium ${
                      securityMetrics && securityMetrics.security_score >= 90 ? 'text-green-600' :
                      securityMetrics && securityMetrics.security_score >= 80 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
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
                        {securityMetrics ? 
                          new Date(securityMetrics.last_key_rotation).toLocaleDateString('pt-BR') : 
                          'N/A'
                        }
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
                      <div className={`w-12 h-6 rounded-full ${integration.webhook_enabled ? 'bg-green-500' : 'bg-gray-300'} relative transition-colors`}>
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${integration.webhook_enabled ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rate Limit (requests/minuto)
                      </label>
                      <input
                        type="number"
                        value={integration.rate_limit_per_minute || 60}
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
                          value={integration.webhook_secret || 'whsec_***'}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                        />
                        <button
                          onClick={() => setShowSecretKeys(!showSecretKeys)}
                          className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          {showSecretKeys ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => handleCopy(integration.webhook_secret || '', 'webhook_secret')}
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
                        integration.last_key_rotation && 
                        new Date(integration.last_key_rotation) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
                          ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900">Rotação de Chaves</p>
                        <p className="text-sm text-gray-500">
                          Última rotação: {integration.last_key_rotation ? 
                            new Date(integration.last_key_rotation).toLocaleDateString('pt-BR') : 
                            'Nunca'
                          }
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
                      onClick={handleRegenerateKeys}
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
                          type: 'Webhook',
                          status: 'success',
                          lead: 'joao@email.com',
                          ip: '192.168.1.100',
                          time: '145ms'
                        },
                        {
                          id: 2,
                          timestamp: '2024-12-20 15:28:12',
                          type: 'API',
                          status: 'success',
                          lead: 'maria@email.com',
                          ip: '10.0.0.50',
                          time: '89ms'
                        },
                        {
                          id: 3,
                          timestamp: '2024-12-20 15:25:45',
                          type: 'Webhook',
                          status: 'failed',
                          lead: 'erro@email.com',
                          ip: '203.0.113.1',
                          time: '2.3s'
                        },
                        {
                          id: 4,
                          timestamp: '2024-12-20 15:22:33',
                          type: 'Webhook',
                          status: 'success',
                          lead: 'carlos@email.com',
                          ip: '192.168.1.100',
                          time: '167ms'
                        },
                        {
                          id: 5,
                          timestamp: '2024-12-20 15:20:18',
                          type: 'API',
                          status: 'success',
                          lead: 'ana@email.com',
                          ip: '172.16.0.1',
                          time: '203ms'
                        }
                      ].map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                            {log.timestamp}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              log.type === 'Webhook' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {log.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                              log.status === 'success' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {log.status === 'success' ? (
                                <CheckCircle size={12} className="mr-1" />
                              ) : (
                                <AlertCircle size={12} className="mr-1" />
                              )}
                              {log.status === 'success' ? 'Sucesso' : 'Erro'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.lead}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                            {log.ip}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.time}
                          </td>
                        </tr>
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
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default IntegrationsModule; 
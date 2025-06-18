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
  Activity
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
  api_key_public: string;
  api_key_secret: string;
  created_at: string;
  updated_at: string;
}

const IntegrationsModule: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'config' | 'conversions'>('config');
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [formData, setFormData] = useState({
    meta_ads_token: '',
    google_ads_token: ''
  });
  const [testResults, setTestResults] = useState({
    meta_ads: null as boolean | null,
    google_ads: null as boolean | null
  });
  const [copySuccess, setCopySuccess] = useState({
    webhook: false,
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
      
      // Usar função SQL para buscar ou criar integração
      const { data, error } = await supabase
        .rpc('get_or_create_integration', {
          p_company_id: user?.tenant_id
        });

      if (error) {
        console.error('Erro ao carregar integração:', error);
        return;
      }

      if (data && data.length > 0) {
        const integrationData = data[0];
        setIntegration(integrationData);
        setFormData({
          meta_ads_token: integrationData.meta_ads_token || '',
          google_ads_token: integrationData.google_ads_token || ''
        });
      }
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
      
      const { error } = await supabase
        .from('integrations')
        .update({
          meta_ads_token: formData.meta_ads_token.trim() || null,
          google_ads_token: formData.google_ads_token.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', integration.id);

      if (error) {
        console.error('Erro ao salvar integração:', error);
        alert('Erro ao salvar as integrações');
        return;
      }

      // Recarregar dados
      await loadIntegration();
      alert('Integrações salvas com sucesso!');
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
      // Usar função SQL para validação básica
      const { data, error } = await supabase
        .rpc(
          platform === 'meta_ads' ? 'validate_meta_ads_token' : 'validate_google_ads_token',
          { p_token: token }
        );

      if (error) {
        console.error('Erro ao validar token:', error);
        setTestResults(prev => ({ ...prev, [platform]: false }));
        return;
      }

      setTestResults(prev => ({ ...prev, [platform]: data }));
      
      if (data) {
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
      
      const { data, error } = await supabase
        .rpc('regenerate_api_keys', {
          p_company_id: user?.tenant_id
        });

      if (error) {
        console.error('Erro ao regenerar chaves:', error);
        alert('Erro ao regenerar as chaves');
        return;
      }

      // Recarregar dados
      await loadIntegration();
      alert('Chaves regeneradas com sucesso!');
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
          ) : (
            <ConversionsPanel />
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegrationsModule; 
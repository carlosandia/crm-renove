import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';
import { 
  Settings, 
  Save, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Calendar,
  Key,
  Globe,
  Shield,
  RefreshCw
} from 'lucide-react';

interface PlatformIntegration {
  id: string;
  integration_type: string;
  provider_name: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scopes: string[];
  is_active: boolean;
  configuration: any;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface FormData {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scopes: string[];
}

const PlatformIntegrationsManager: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [integration, setIntegration] = useState<PlatformIntegration | null>(null);
  const [formData, setFormData] = useState<FormData>({
    client_id: '',
    client_secret: '',
    redirect_uri: `${import.meta.env.VITE_GOOGLE_REDIRECT_URI || (await import('../config/environment')).environmentConfig.google.redirectUri}/auth/google/callback`,
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ]
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadPlatformIntegration();
    }
  }, [user]);

  const loadPlatformIntegration = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('platform_integrations')
        .select('*')
        .eq('integration_type', 'google_calendar')
        .eq('provider_name', 'Google')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Erro ao carregar integração da plataforma:', error);
        setMessage({ type: 'error', text: 'Erro ao carregar configurações da integração.' });
        return;
      }

      if (data) {
        setIntegration(data);
        setFormData({
          client_id: data.client_id || '',
          client_secret: data.client_secret || '',
          redirect_uri: data.redirect_uri || `${import.meta.env.VITE_GOOGLE_REDIRECT_URI || (await import('../config/environment')).environmentConfig.google.redirectUri}/auth/google/callback`,
          scopes: data.scopes || [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
          ]
        });
      }
    } catch (error) {
      console.error('Erro ao carregar integração da plataforma:', error);
      setMessage({ type: 'error', text: 'Erro inesperado ao carregar configurações.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.client_id.trim() || !formData.client_secret.trim()) {
      setMessage({ type: 'error', text: 'Client ID e Client Secret são obrigatórios.' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      // Chama a função PostgreSQL para configurar a integração da plataforma
      const { data, error } = await supabase.rpc('configure_platform_integration', {
        p_integration_type: 'google_calendar',
        p_provider_name: 'Google',
        p_client_id: formData.client_id.trim(),
        p_client_secret: formData.client_secret.trim(),
        p_redirect_uri: formData.redirect_uri.trim(),
        p_scopes: formData.scopes,
        p_configuration: {
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          userinfo_uri: 'https://www.googleapis.com/oauth2/v1/userinfo'
        }
      });

      if (error) {
        console.error('Erro ao salvar integração:', error);
        setMessage({ type: 'error', text: `Erro ao salvar: ${error.message}` });
        return;
      }

      setMessage({ 
        type: 'success', 
        text: 'Configuração do Google Calendar salva com sucesso! Todas as empresas agora podem usar esta integração.' 
      });

      // Recarrega os dados
      await loadPlatformIntegration();

    } catch (error) {
      console.error('Erro inesperado ao salvar:', error);
      setMessage({ type: 'error', text: 'Erro inesperado ao salvar configurações.' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Acesso Negado</h3>
          <p className="text-gray-600">Apenas Super Administradores podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configurações da Plataforma</h1>
            <p className="text-purple-100">Configure integrações globais para todas as empresas</p>
          </div>
        </div>
        
        <div className="bg-white/10 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-purple-200 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-purple-100">
              <p className="font-medium mb-1">Como funciona a arquitetura enterprise:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Super Admin:</strong> Configura OAuth2 uma vez para toda a plataforma</li>
                <li>• <strong>Admin:</strong> Habilita/desabilita Google Calendar para sua empresa</li>
                <li>• <strong>Usuários:</strong> Conectam suas contas pessoais com um clique</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Status da Integração */}
      {integration && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Status da Integração</h2>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
              integration.is_active 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {integration.is_active ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Ativa</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Inativa</span>
                </>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Integração</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">Google Calendar</p>
              <p className="text-xs text-gray-600">Configurada em {new Date(integration.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Escopo</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">Todas as Empresas</p>
              <p className="text-xs text-gray-600">Disponível para todos os tenants</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Key className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Última Atualização</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(integration.updated_at).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-xs text-gray-600">
                {new Date(integration.updated_at).toLocaleTimeString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Formulário de Configuração */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Configuração do Google Calendar</h2>
          <button
            onClick={loadPlatformIntegration}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
              <span className="text-gray-600">Carregando configurações...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Client ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Client ID *
              </label>
              <input
                type="text"
                value={formData.client_id}
                onChange={(e) => handleInputChange('client_id', e.target.value)}
                placeholder="Ex: 123456789-abcdefghijklmnop.apps.googleusercontent.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Obtenha no Google Cloud Console → APIs & Services → Credentials
              </p>
            </div>

            {/* Client Secret */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Client Secret *
              </label>
              <div className="relative">
                <input
                  type={showClientSecret ? 'text' : 'password'}
                  value={formData.client_secret}
                  onChange={(e) => handleInputChange('client_secret', e.target.value)}
                  placeholder="Ex: GOCSPX-abcdefghijklmnopqrstuvwxyz"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowClientSecret(!showClientSecret)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showClientSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Chave secreta do Google Cloud Console (mantenha segura!)
              </p>
            </div>

            {/* Redirect URI */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Redirect URI
              </label>
              <input
                type="url"
                value={formData.redirect_uri}
                onChange={(e) => handleInputChange('redirect_uri', e.target.value)}
                placeholder="${import.meta.env.VITE_GOOGLE_REDIRECT_URI || (await import('../config/environment')).environmentConfig.google.redirectUri}/auth/google/callback"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL para onde o Google redirecionará após autenticação
              </p>
            </div>

            {/* Scopes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Escopos de Permissão
              </label>
              <div className="space-y-2">
                {formData.scopes.map((scope, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={scope}
                      onChange={(e) => {
                        const newScopes = [...formData.scopes];
                        newScopes[index] = e.target.value;
                        handleInputChange('scopes', newScopes);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Permissões que serão solicitadas aos usuários
              </p>
            </div>

            {/* Message */}
            {message && (
              <div className={`p-4 rounded-lg flex items-start space-x-3 ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200' 
                  : message.type === 'error'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                {message.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />}
                {message.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />}
                {message.type === 'info' && <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />}
                <p className={`text-sm ${
                  message.type === 'success' 
                    ? 'text-green-700' 
                    : message.type === 'error'
                    ? 'text-red-700'
                    : 'text-blue-700'
                }`}>
                  {message.text}
                </p>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Configuração</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Como obter credenciais do Google</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <p>Acesse o <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Google Cloud Console</a></p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <p>Crie um novo projeto ou selecione um existente</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <p>Vá para "APIs & Services" → "Credentials"</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
            <p>Clique em "Create Credentials" → "OAuth 2.0 Client IDs"</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
            <p>Configure o tipo como "Web application" e adicione a Redirect URI</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">6</span>
            <p>Ative a "Google Calendar API" em "APIs & Services" → "Library"</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformIntegrationsManager; 
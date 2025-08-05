import React, { useState, useEffect, useCallback } from 'react';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Globe, 
  Settings, 
  Lock,
  Loader2,
  TestTube
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { showSuccessToast, showErrorToast, showWarningToast } from '../../lib/toast';
import { ShimmerButton } from '../ui/shimmer-button';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

// Presets de provedores de e-mail
const EMAIL_PROVIDERS = {
  'gmail.com': {
    name: 'Gmail',
    smtp: { host: 'smtp.gmail.com', port: 587, secure: false },
    imap: { host: 'imap.gmail.com', port: 993, secure: true },
    instructions: 'Use uma senha de aplicativo do Google para autenticação'
  },
  'outlook.com': {
    name: 'Outlook',
    smtp: { host: 'smtp-mail.outlook.com', port: 587, secure: false },
    imap: { host: 'imap-mail.outlook.com', port: 993, secure: true },
    instructions: 'Use sua senha normal do Outlook'
  },
  'hotmail.com': {
    name: 'Hotmail',
    smtp: { host: 'smtp-mail.outlook.com', port: 587, secure: false },
    imap: { host: 'imap-mail.outlook.com', port: 993, secure: true },
    instructions: 'Use sua senha normal do Hotmail'
  },
  'yahoo.com': {
    name: 'Yahoo',
    smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
    imap: { host: 'imap.mail.yahoo.com', port: 993, secure: true },
    instructions: 'Use uma senha de aplicativo do Yahoo'
  },
  'uol.com.br': {
    name: 'UOL',
    smtp: { host: 'smtps.uol.com.br', port: 587, secure: false },
    imap: { host: 'imap.uol.com.br', port: 993, secure: true },
    instructions: 'Use sua senha normal do UOL'
  },
  'terra.com.br': {
    name: 'Terra',
    smtp: { host: 'smtp.terra.com.br', port: 587, secure: false },
    imap: { host: 'imap.terra.com.br', port: 993, secure: true },
    instructions: 'Use sua senha normal do Terra'
  }
};

interface EmailIntegration {
  id?: string;
  user_id: string;
  tenant_id: string;
  email: string;
  provider: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  is_active: boolean;
  last_tested?: string;
  created_at?: string;
  updated_at?: string;
}

const EmailPersonalTab: React.FC = () => {
  const { user } = useAuth();
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false
  });
  
  // Estados de controle
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [detectedProvider, setDetectedProvider] = useState<string | null>(null);
  const [isManualConfig, setIsManualConfig] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [existingIntegration, setExistingIntegration] = useState<EmailIntegration | null>(null);

  // Detectar provedor automaticamente
  const detectProvider = useCallback((email: string) => {
    if (!email || !email.includes('@')) {
      setDetectedProvider(null);
      setIsManualConfig(false);
      return;
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && EMAIL_PROVIDERS[domain as keyof typeof EMAIL_PROVIDERS]) {
      const provider = EMAIL_PROVIDERS[domain as keyof typeof EMAIL_PROVIDERS];
      setDetectedProvider(domain);
      setFormData(prev => ({
        ...prev,
        smtp_host: provider.smtp.host,
        smtp_port: provider.smtp.port,
        smtp_secure: provider.smtp.secure
      }));
      setIsManualConfig(false);
    } else {
      setDetectedProvider(null);
      setIsManualConfig(true);
    }
  }, []);

  // Carregar integração existente
  useEffect(() => {
    const loadExistingIntegration = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        // Aqui será implementada a busca da integração existente
        // Por enquanto, simular dados demo
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Dados demo para desenvolvimento
        const mockIntegration: EmailIntegration = {
          id: 'demo-email-1',
          user_id: user.id,
          tenant_id: user.tenant_id,
          email: '',
          provider: '',
          smtp_host: '',
          smtp_port: 587,
          smtp_secure: false,
          is_active: false
        };
        
        setExistingIntegration(mockIntegration);
      } catch (error) {
        console.error('Erro ao carregar integração de e-mail:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExistingIntegration();
  }, [user?.id, user?.tenant_id]);

  // Handler para mudança de e-mail
  const handleEmailChange = (email: string) => {
    setFormData(prev => ({ ...prev, email }));
    detectProvider(email);
    setTestResult(null);
  };

  // Testar conexão SMTP
  const handleTestConnection = async () => {
    if (!formData.email || !formData.password || !formData.smtp_host) {
      showWarningToast('Campos obrigatórios', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);

      // Simular teste de conexão
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Por enquanto, simular sucesso
      const success = Math.random() > 0.3; // 70% de chance de sucesso para demo
      
      if (success) {
        setTestResult({ success: true, message: 'Conexão estabelecida com sucesso!' });
        showSuccessToast('Teste bem-sucedido', 'Configuração de e-mail válida');
      } else {
        setTestResult({ success: false, message: 'Falha na autenticação. Verifique suas credenciais.' });
        showErrorToast('Teste falhou', 'Não foi possível conectar com o servidor SMTP');
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setTestResult({ success: false, message: 'Erro interno no teste de conexão' });
      showErrorToast('Erro no teste', 'Erro interno no teste de conexão');
    } finally {
      setTesting(false);
    }
  };

  // Salvar configuração
  const handleSave = async () => {
    if (!testResult?.success) {
      showWarningToast('Teste obrigatório', 'Teste a conexão antes de salvar');
      return;
    }

    try {
      setSaving(true);

      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newIntegration: EmailIntegration = {
        ...existingIntegration,
        user_id: user?.id || '',
        tenant_id: user?.tenant_id || '',
        email: formData.email,
        provider: detectedProvider || 'custom',
        smtp_host: formData.smtp_host,
        smtp_port: formData.smtp_port,
        smtp_secure: formData.smtp_secure,
        is_active: true,
        last_tested: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setExistingIntegration(newIntegration);
      showSuccessToast('Configuração salva', 'E-mail configurado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      showErrorToast('Erro ao salvar', 'Não foi possível salvar a configuração');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Mail className="text-blue-600" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Configuração de E-mail Pessoal</h2>
            <p className="text-sm text-gray-600">
              Configure sua conta de e-mail para envio direto da pipeline
            </p>
          </div>
        </div>

        {existingIntegration?.is_active && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="text-green-600" size={16} />
              <span className="text-green-800 font-medium">
                E-mail configurado: {existingIntegration.email}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Formulário de Configuração */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* E-mail */}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full"
              />
              {detectedProvider && (
                <p className="text-sm text-green-600">
                  ✓ Provedor detectado: {EMAIL_PROVIDERS[detectedProvider as keyof typeof EMAIL_PROVIDERS]?.name}
                </p>
              )}
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Sua senha ou senha de aplicativo"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {detectedProvider && (
                <p className="text-sm text-blue-600">
                  💡 {EMAIL_PROVIDERS[detectedProvider as keyof typeof EMAIL_PROVIDERS]?.instructions}
                </p>
              )}
            </div>
          </div>

          {/* Configurações SMTP (Manual ou Auto-detectado) */}
          {(isManualConfig || detectedProvider) && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Configurações SMTP</h3>
                {!isManualConfig && (
                  <span className="text-sm text-green-600 font-medium">Auto-detectado</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">Servidor SMTP *</Label>
                  <Input
                    id="smtp_host"
                    value={formData.smtp_host}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtp_host: e.target.value }))}
                    placeholder="smtp.exemplo.com"
                    disabled={!isManualConfig}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp_port">Porta *</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    value={formData.smtp_port}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
                    disabled={!isManualConfig}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Segurança</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="smtp_secure"
                      checked={formData.smtp_secure}
                      onChange={(e) => setFormData(prev => ({ ...prev, smtp_secure: e.target.checked }))}
                      disabled={!isManualConfig}
                      className="rounded"
                    />
                    <label htmlFor="smtp_secure" className="text-sm text-gray-700">
                      SSL/TLS
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resultado do Teste */}
          {testResult && (
            <div className={`p-4 rounded-lg border ${
              testResult.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center space-x-2">
                {testResult.success ? (
                  <CheckCircle size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
                <span className="font-medium">
                  {testResult.success ? 'Teste bem-sucedido' : 'Teste falhou'}
                </span>
              </div>
              <p className="text-sm mt-1">{testResult.message}</p>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center space-x-4 pt-6 border-t">
            <Button
              onClick={handleTestConnection}
              disabled={testing || !formData.email || !formData.password || !formData.smtp_host}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              <span>{testing ? 'Testando...' : 'Testar Conexão'}</span>
            </Button>

            <ShimmerButton
              onClick={handleSave}
              disabled={saving || !testResult?.success}
              className="flex items-center space-x-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              <span>{saving ? 'Salvando...' : 'Salvar Configuração'}</span>
            </ShimmerButton>
          </div>
        </div>
      </Card>

      {/* Instruções de Uso */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Como usar após configurar</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="font-medium text-blue-600">1.</span>
            <span>Acesse qualquer lead na pipeline</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-medium text-blue-600">2.</span>
            <span>Clique no ícone de e-mail no card do lead</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-medium text-blue-600">3.</span>
            <span>O modal será aberto diretamente na aba "E-mail"</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-medium text-blue-600">4.</span>
            <span>Escreva sua mensagem e envie diretamente da pipeline</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EmailPersonalTab; 
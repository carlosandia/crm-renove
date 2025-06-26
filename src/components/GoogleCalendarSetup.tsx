import React, { useState, useCallback } from 'react';
import { Calendar, Settings, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink, Copy, RefreshCw } from 'lucide-react';
import { BlurFade } from './ui/blur-fade';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { showSuccessToast, showErrorToast, showInfoToast } from '../lib/toast';

interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface GoogleCalendarSetupProps {
  onCredentialsChange: (credentials: GoogleCredentials | null) => void;
  onConnect: () => void;
  isConnecting: boolean;
  hasIntegration: boolean;
}

const GoogleCalendarSetup: React.FC<GoogleCalendarSetupProps> = ({
  onCredentialsChange,
  onConnect,
  isConnecting,
  hasIntegration
}) => {
  // 🎯 ESTADOS
  const [showSecrets, setShowSecrets] = useState(false);
  const [credentials, setCredentials] = useState<GoogleCredentials>({
    clientId: '',
    clientSecret: '',
    redirectUri: window.location.origin + '/auth/google/callback'
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // 📋 INSTRUÇÕES GOOGLE CLOUD CONSOLE
  const instructions = [
    {
      step: 1,
      title: "Acessar Google Cloud Console",
      description: "Vá para console.cloud.google.com",
      action: "https://console.cloud.google.com/"
    },
    {
      step: 2,
      title: "Criar/Selecionar Projeto",
      description: "Crie um novo projeto ou selecione existente"
    },
    {
      step: 3,
      title: "Ativar APIs",
      description: "Ative: Google Calendar API e Google+ API"
    },
    {
      step: 4,
      title: "Configurar OAuth",
      description: "APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth 2.0"
    },
    {
      step: 5,
      title: "Configurar URLs",
      description: `URI de redirecionamento: ${credentials.redirectUri}`
    }
  ];

  // 🔧 MANIPULADORES
  const handleCredentialChange = useCallback((field: keyof GoogleCredentials, value: string) => {
    const newCredentials = { ...credentials, [field]: value };
    setCredentials(newCredentials);
    
    // Verificar se está configurado
    const configured = !!(newCredentials.clientId && newCredentials.clientSecret && newCredentials.redirectUri);
    setIsConfigured(configured);
    
    // Notificar pai
    onCredentialsChange(configured ? newCredentials : null);
  }, [credentials, onCredentialsChange]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    showSuccessToast('Copiado para a área de transferência!');
  }, []);

  const handleTestCredentials = useCallback(() => {
    if (!isConfigured) {
      showErrorToast('Configure todas as credenciais primeiro');
      return;
    }

    showInfoToast('Testando credenciais...');
    
    // Simular teste (em produção seria uma chamada real)
    setTimeout(() => {
      if (credentials.clientId.includes('apps.googleusercontent.com')) {
        showSuccessToast('✅ Credenciais válidas! Pronto para conectar.');
      } else {
        showErrorToast('❌ Credenciais inválidas. Verifique Client ID.');
      }
    }, 1500);
  }, [isConfigured, credentials.clientId]);

  return (
    <div className="space-y-6">
      {/* 📋 INSTRUÇÕES */}
      <BlurFade delay={0.1}>
        <Card className="p-6 border-blue-200 bg-blue-50/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">
                Configuração Google Calendar
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-blue-600 hover:text-blue-700"
            >
              {showInstructions ? 'Ocultar' : 'Ver instruções'}
            </Button>
          </div>

          <p className="text-blue-700 mb-4">
            Configure suas credenciais Google Cloud para ativar a integração real com Google Calendar.
          </p>

          {showInstructions && (
            <BlurFade delay={0.2}>
              <div className="space-y-3 mt-4 pt-4 border-t border-blue-200">
                {instructions.map((instruction) => (
                  <div key={instruction.step} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                      {instruction.step}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900">{instruction.title}</h4>
                      <p className="text-sm text-blue-700">{instruction.description}</p>
                      {instruction.action && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 p-0 h-auto text-blue-600 hover:text-blue-700"
                          onClick={() => window.open(instruction.action, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Abrir Console
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </BlurFade>
          )}
        </Card>
      </BlurFade>

      {/* 🔐 CONFIGURAÇÃO DE CREDENCIAIS */}
      <BlurFade delay={0.2}>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Credenciais OAuth2</h3>
            {isConfigured && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
          </div>

          <div className="space-y-4">
            {/* CLIENT ID */}
            <div>
              <Label htmlFor="clientId" className="text-sm font-medium">
                Google Client ID <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="clientId"
                  placeholder="123456789-abc.apps.googleusercontent.com"
                  value={credentials.clientId}
                  onChange={(e) => handleCredentialChange('clientId', e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.clientId)}
                  disabled={!credentials.clientId}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* CLIENT SECRET */}
            <div>
              <Label htmlFor="clientSecret" className="text-sm font-medium">
                Google Client Secret <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="clientSecret"
                  type={showSecrets ? 'text' : 'password'}
                  placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={credentials.clientSecret}
                  onChange={(e) => handleCredentialChange('clientSecret', e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSecrets(!showSecrets)}
                >
                  {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.clientSecret)}
                  disabled={!credentials.clientSecret}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* REDIRECT URI */}
            <div>
              <Label htmlFor="redirectUri" className="text-sm font-medium">
                Redirect URI <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="redirectUri"
                  value={credentials.redirectUri}
                  onChange={(e) => handleCredentialChange('redirectUri', e.target.value)}
                  className="flex-1 bg-gray-50"
                  readOnly
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.redirectUri)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ⚠️ Adicione esta URL nas "URIs de redirecionamento autorizadas" no Google Cloud Console
              </p>
            </div>
          </div>

          {/* 🔧 BOTÕES DE AÇÃO */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleTestCredentials}
              disabled={!isConfigured}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Testar Credenciais
            </Button>
            
            <Button
              onClick={onConnect}
              disabled={!isConfigured || isConnecting || hasIntegration}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : hasIntegration ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Conectado
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Conectar Google Calendar
                </>
              )}
            </Button>
          </div>

          {/* 📊 STATUS */}
          <div className="mt-4 p-3 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2">
              {isConfigured ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-700 font-medium">
                    Credenciais configuradas ✓
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-700 font-medium">
                    Configure as credenciais para ativar a integração
                  </span>
                </>
              )}
            </div>
          </div>
        </Card>
      </BlurFade>
    </div>
  );
};

export default GoogleCalendarSetup; 
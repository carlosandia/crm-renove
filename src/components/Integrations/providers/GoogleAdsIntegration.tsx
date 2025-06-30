import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Switch } from '../../ui/switch';
import { AnimatedCard } from '../../ui/animated-card';
import { BlurFade } from '../../ui/blur-fade';
import { 
  Chrome, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff,
  TestTube,
  RefreshCw,
  Save,
  Settings,
  Zap,
  Key,
  Link
} from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../../lib/toast';

interface GoogleAdsConfig {
  token: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  customerId?: string;
  isEnabled: boolean;
  lastTestResult?: boolean;
  lastTestDate?: string;
  accountInfo?: {
    name: string;
    customerId: string;
    currency: string;
    timezone: string;
  };
}

interface UseGoogleAdsIntegrationProps {
  initialConfig?: GoogleAdsConfig;
  onConfigChange?: (config: GoogleAdsConfig) => void;
  companyId?: string;
}

interface UseGoogleAdsIntegrationReturn {
  config: GoogleAdsConfig;
  setConfig: React.Dispatch<React.SetStateAction<GoogleAdsConfig>>;
  isLoading: boolean;
  isTesting: boolean;
  isSaving: boolean;
  showToken: boolean;
  setShowToken: React.Dispatch<React.SetStateAction<boolean>>;
  showClientSecret: boolean;
  setShowClientSecret: React.Dispatch<React.SetStateAction<boolean>>;
  handleTokenChange: (token: string) => void;
  handleTestConnection: () => Promise<void>;
  handleSaveConfig: () => Promise<void>;
  handleToggleEnabled: () => void;
  handleOAuthFlow: () => void;
  validateToken: (token: string) => boolean;
  getTokenStatus: () => { isValid: boolean; message: string; color: string };
}

const DEFAULT_CONFIG: GoogleAdsConfig = {
  token: '',
  isEnabled: false,
  clientId: '',
  clientSecret: '',
  customerId: ''
};

// Hook personalizado para gerenciar Google Ads
export function useGoogleAdsIntegration({
  initialConfig,
  onConfigChange,
  companyId
}: UseGoogleAdsIntegrationProps = {}): UseGoogleAdsIntegrationReturn {
  const [config, setConfig] = useState<GoogleAdsConfig>(initialConfig || DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);

  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(config);
    }
  }, [config, onConfigChange]);

  const validateToken = useCallback((token: string) => {
    return token.length >= 10; // Token Google geralmente tem formato específico
  }, []);

  const getTokenStatus = useCallback(() => {
    if (!config.token) {
      return { isValid: false, message: 'Token não configurado', color: 'text-gray-500' };
    }
    
    if (!validateToken(config.token)) {
      return { isValid: false, message: 'Token inválido', color: 'text-red-500' };
    }

    if (config.lastTestResult === true) {
      return { isValid: true, message: 'Token válido', color: 'text-green-500' };
    }

    if (config.lastTestResult === false) {
      return { isValid: false, message: 'Falha na validação', color: 'text-red-500' };
    }

    return { isValid: true, message: 'Token não testado', color: 'text-yellow-500' };
  }, [config.token, config.lastTestResult, validateToken]);

  const handleTokenChange = useCallback((token: string) => {
    setConfig(prev => ({
      ...prev,
      token,
      lastTestResult: undefined,
      lastTestDate: undefined
    }));
  }, []);

  const handleOAuthFlow = useCallback(() => {
    if (!config.clientId) {
      showErrorToast('Configure o Client ID antes de conectar.');
      return;
    }

    // Simular fluxo OAuth (em produção, redirecionar para Google OAuth)
    const oauthUrl = `https://accounts.google.com/oauth/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(window.location.origin)}&scope=https://www.googleapis.com/auth/adwords&response_type=code`;
    
    showSuccessToast('Redirecionando para autorização Google...');
    // window.location.href = oauthUrl;
  }, [config.clientId]);

  const handleTestConnection = useCallback(async () => {
    if (!config.token || !validateToken(config.token)) {
      showErrorToast('Token inválido. Verifique o formato do token Google Ads.');
      return;
    }

    setIsTesting(true);
    try {
      // Simular teste de conexão
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Mock de validação (em produção, fazer chamada real para API do Google Ads)
      const isValid = Math.random() > 0.2; // 80% de chance de sucesso
      
      setConfig(prev => ({
        ...prev,
        lastTestResult: isValid,
        lastTestDate: new Date().toISOString(),
        accountInfo: isValid ? {
          name: 'Conta Principal Google Ads',
          customerId: '123-456-7890',
          currency: 'BRL',
          timezone: 'America/Sao_Paulo'
        } : undefined
      }));

      if (isValid) {
        showSuccessToast('Conexão com Google Ads estabelecida com sucesso!');
      } else {
        showErrorToast('Falha ao conectar com Google Ads. Verifique as credenciais.');
      }

    } catch (error) {
      console.error('Erro ao testar conexão Google Ads:', error);
      setConfig(prev => ({
        ...prev,
        lastTestResult: false,
        lastTestDate: new Date().toISOString()
      }));
      showErrorToast('Erro ao testar conexão. Tente novamente.');
    } finally {
      setIsTesting(false);
    }
  }, [config.token, validateToken]);

  const handleSaveConfig = useCallback(async () => {
    setIsSaving(true);
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSuccessToast('Configuração Google Ads salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      showErrorToast('Erro ao salvar configuração. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleToggleEnabled = useCallback(() => {
    setConfig(prev => ({ ...prev, isEnabled: !prev.isEnabled }));
  }, []);

  return {
    config,
    setConfig,
    isLoading,
    isTesting,
    isSaving,
    showToken,
    setShowToken,
    showClientSecret,
    setShowClientSecret,
    handleTokenChange,
    handleTestConnection,
    handleSaveConfig,
    handleToggleEnabled,
    handleOAuthFlow,
    validateToken,
    getTokenStatus
  };
}

// Componente de renderização
interface GoogleAdsIntegrationRenderProps {
  googleAdsManager: UseGoogleAdsIntegrationReturn;
}

export function GoogleAdsIntegrationRender({ googleAdsManager }: GoogleAdsIntegrationRenderProps) {
  const {
    config,
    setConfig,
    isTesting,
    isSaving,
    showToken,
    setShowToken,
    showClientSecret,
    setShowClientSecret,
    handleTokenChange,
    handleTestConnection,
    handleSaveConfig,
    handleToggleEnabled,
    handleOAuthFlow,
    getTokenStatus
  } = googleAdsManager;

  const tokenStatus = getTokenStatus();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Chrome className="h-5 w-5 text-blue-500" />
          Google Ads Integration
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure a integração com Google Ads para rastreamento de conversões
        </p>
      </div>

      <BlurFade delay={0.1} inView>
        <AnimatedCard>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Configuração OAuth</CardTitle>
                <CardDescription>
                  Configure as credenciais OAuth do Google Ads
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={config.isEnabled ? "default" : "secondary"}
                  className={config.isEnabled ? "bg-green-500" : ""}
                >
                  {config.isEnabled ? 'Ativo' : 'Inativo'}
                </Badge>
                <Switch
                  checked={config.isEnabled}
                  onCheckedChange={handleToggleEnabled}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  value={config.clientId || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                  placeholder="xxxxx.googleusercontent.com"
                />
              </div>
              <div>
                <Label htmlFor="clientSecret">Client Secret</Label>
                <div className="relative">
                  <Input
                    id="clientSecret"
                    type={showClientSecret ? "text" : "password"}
                    value={config.clientSecret || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                    placeholder="GOCSPX-xxxxxxxxxxxxx"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowClientSecret(!showClientSecret)}
                  >
                    {showClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="customerId">Customer ID (opcional)</Label>
              <Input
                id="customerId"
                value={config.customerId || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, customerId: e.target.value }))}
                placeholder="123-456-7890"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleOAuthFlow}
                disabled={!config.clientId}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Link className="h-4 w-4" />
                Conectar com Google
              </Button>
            </div>
          </CardContent>
        </AnimatedCard>
      </BlurFade>

      <BlurFade delay={0.2} inView>
        <AnimatedCard>
          <CardHeader>
            <CardTitle className="text-base">Token de Acesso</CardTitle>
            <CardDescription>
              Token obtido após autorização OAuth
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="googleToken">Access Token</Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <Input
                    id="googleToken"
                    type={showToken ? "text" : "password"}
                    value={config.token}
                    onChange={(e) => handleTokenChange(e.target.value)}
                    placeholder="ya29.xxxxxxxxxxxxx..."
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  onClick={handleTestConnection}
                  disabled={!config.token || isTesting}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {isTesting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4" />
                  )}
                  Testar
                </Button>
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                {tokenStatus.isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm ${tokenStatus.color}`}>
                  {tokenStatus.message}
                </span>
                {config.lastTestDate && (
                  <span className="text-xs text-muted-foreground">
                    • Testado em {new Date(config.lastTestDate).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {config.accountInfo && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Conta Conectada</h4>
                <div className="space-y-1 text-sm text-green-800">
                  <p>• Nome: {config.accountInfo.name}</p>
                  <p>• Customer ID: {config.accountInfo.customerId}</p>
                  <p>• Moeda: {config.accountInfo.currency}</p>
                  <p>• Fuso Horário: {config.accountInfo.timezone}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-4 border-t">
              <Button
                onClick={handleSaveConfig}
                disabled={isSaving || !config.token}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar Configuração
              </Button>
              
              {config.isEnabled && config.lastTestResult === true && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <Zap className="h-4 w-4" />
                  Integração ativa e funcionando
                </div>
              )}
            </div>
          </CardContent>
        </AnimatedCard>
      </BlurFade>

      {/* Informações de ajuda */}
      <BlurFade delay={0.3} inView>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Como configurar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Para configurar a integração com Google Ads:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Acesse o Google Cloud Console</li>
                <li>Crie um projeto e ative a API Google Ads</li>
                <li>Configure OAuth 2.0 credentials</li>
                <li>Adicione o redirect URI: {window.location.origin}</li>
                <li>Copie Client ID e Client Secret nos campos acima</li>
                <li>Clique em "Conectar com Google" para autorizar</li>
                <li>Teste a conexão para validar</li>
              </ol>
              <p className="pt-2 text-xs">
                <strong>Nota:</strong> Você precisará de uma conta Google Ads ativa e permissões adequadas.
              </p>
            </div>
          </CardContent>
        </Card>
      </BlurFade>
    </div>
  );
}

export default GoogleAdsIntegrationRender; 
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { emailValidationService, SmtpConfig, ValidationResult } from '../../services/emailValidationService';

interface SmartEmailConfigFormProps {
  onConfigSaved?: () => void;
  initialConfig?: Partial<SmtpConfig>;
}

/**
 * 🎯 COMPONENTE MELHORADO DE CONFIGURAÇÃO DE EMAIL
 * - Detecta ambiente automaticamente
 * - Sugere configurações baseadas no ambiente
 * - Trata servidores corporativos especificamente
 * - Interface intuitiva com instruções claras
 */
export const SmartEmailConfigForm: React.FC<SmartEmailConfigFormProps> = ({
  onConfigSaved,
  initialConfig = {}
}) => {
  const [config, setConfig] = useState<SmtpConfig>({
    host: initialConfig.host || '',
    port: initialConfig.port || 587,
    user: initialConfig.user || '',
    password: initialConfig.password || ''
  });

  const [environment, setEnvironment] = useState<string>('development');
  const [suggestedConfig, setSuggestedConfig] = useState<any>(null);
  const [instructions, setInstructions] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [recommendation, setRecommendation] = useState<string>('');

  const [validationState, setValidationState] = useState<{
    status: 'idle' | 'validating' | 'success' | 'error';
    message?: string;
    details?: any;
  }>({ status: 'idle' });

  const [isValidated, setIsValidated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Carregar configurações sugeridas e provedores
  useEffect(() => {
    const loadEnvironmentData = async () => {
      try {
        // Buscar configuração sugerida
        const configData = await emailValidationService.getSuggestedConfig();
        setEnvironment(configData.environment);
        setSuggestedConfig(configData.suggested);
        setInstructions(configData.instructions);

        // Buscar provedores
        const providersData = await emailValidationService.getProvidersWithRecommendations();
        setProviders(providersData.providers);
        setRecommendation(providersData.recommendation);

      } catch (error) {
        console.error('Erro ao carregar dados do ambiente:', error);
        toast.error('Erro ao carregar configurações sugeridas');
      }
    };

    loadEnvironmentData();
  }, []);

  // Detectar se é servidor corporativo
  const isCorporateServer = config.host.includes('uni5.net') || 
                           config.host.includes('renovedigital.com.br') ||
                           config.host.includes('smtpi.');

  const handleValidateConfig = async () => {
    // Validação básica
    if (!config.host || !config.port || !config.user || !config.password) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Aviso específico para servidor corporativo em desenvolvimento
    if (isCorporateServer && environment === 'development') {
      setValidationState({
        status: 'error',
        message: 'Servidor corporativo não funciona em desenvolvimento',
        details: {
          suggestion: 'Use Gmail App Password para desenvolvimento',
          environment: 'development',
          corporateServer: config.host,
          solutions: [
            'Configure Gmail (smtp.gmail.com:587)',
            'Gere App Password no Gmail',
            'Em produção, servidor corporativo funcionará'
          ]
        }
      });
      setIsValidated(false);
      toast.error('❌ Configure Gmail para desenvolvimento');
      return;
    }

    setValidationState({ status: 'validating', message: 'Testando conexão SMTP...', details: null });
    setIsValidated(false);

    try {
      const result = await emailValidationService.validateSmtpConfig(config);
      
      if (result.success) {
        setValidationState({
          status: 'success',
          message: result.message,
          details: result.details
        });
        setIsValidated(true);
        toast.success('✅ Configuração SMTP válida!');
      } else {
        setValidationState({
          status: 'error',
          message: result.error,
          details: result.details
        });
        setIsValidated(false);
        toast.error(`❌ ${result.error}`);
      }
    } catch (error: any) {
      setValidationState({
        status: 'error',
        message: 'Erro na validação',
        details: { suggestion: 'Verifique sua conexão com a internet' }
      });
      setIsValidated(false);
      toast.error('Erro na validação');
    }
  };

  const handleSaveConfig = async () => {
    if (!isValidated) {
      toast.error('Valide a configuração antes de salvar');
      return;
    }

    setIsSaving(true);
    
    try {
      const result = await emailValidationService.saveEmailConfig(config);
      
      if (result.success) {
        toast.success('✅ Configuração salva com sucesso!');
        onConfigSaved?.();
      } else {
        toast.error(`❌ ${result.error}`);
      }
    } catch (error: any) {
      toast.error('Erro ao salvar configuração');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUseSuggestedConfig = () => {
    if (suggestedConfig) {
      setConfig(prev => ({
        ...prev,
        host: suggestedConfig.host,
        port: suggestedConfig.port
      }));
      setIsValidated(false);
      toast.success('Configuração sugerida aplicada');
    }
  };

  const handleCopyInstructions = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para clipboard');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Aviso de Ambiente */}
      <Alert className={environment === 'development' ? 'border-amber-500 bg-amber-50' : 'border-green-500 bg-green-50'}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong>Ambiente: {environment === 'development' ? '🔧 Desenvolvimento' : '🚀 Produção'}</strong>
              <div className="mt-1 text-sm text-gray-600">
                {recommendation}
              </div>
            </div>
            <Badge variant={environment === 'development' ? 'secondary' : 'default'}>
              {environment}
            </Badge>
          </div>
        </AlertDescription>
      </Alert>

      {/* Configuração Sugerida */}
      {suggestedConfig && environment === 'development' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              📧 Configuração Recomendada para Desenvolvimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-white/70 p-3 rounded-md text-sm">
              <div><strong>Host:</strong> {suggestedConfig.host}</div>
              <div><strong>Porta:</strong> {suggestedConfig.port}</div>
              <div className="text-gray-600 mt-1">{suggestedConfig.note}</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleUseSuggestedConfig}
              className="w-full"
            >
              Usar Configuração Recomendada
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instruções Gmail */}
      {instructions?.gmail && environment === 'development' && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              🔑 Como Configurar Gmail App Password
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => window.open('https://myaccount.google.com/apppasswords', '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              {instructions.gmail.map((instruction: string, index: number) => (
                <li key={index} className="flex items-center justify-between">
                  <span>{instruction}</span>
                  {instruction.includes('https://') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => handleCopyInstructions(instruction.match(/https:\/\/[^\s]+/)?.[0] || '')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Formulário de Configuração */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração SMTP</CardTitle>
          <CardDescription>
            Configure seu servidor de email para envio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="host">Servidor SMTP *</Label>
              <Input
                id="host"
                value={config.host}
                onChange={(e) => {
                  setConfig(prev => ({ ...prev, host: e.target.value }));
                  setIsValidated(false);
                }}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Porta *</Label>
              <Input
                id="port"
                type="number"
                value={config.port}
                onChange={(e) => {
                  setConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }));
                  setIsValidated(false);
                }}
                placeholder="587"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user">Email *</Label>
            <Input
              id="user"
              type="email"
              value={config.user}
              onChange={(e) => {
                setConfig(prev => ({ ...prev, user: e.target.value }));
                setIsValidated(false);
              }}
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Senha {environment === 'development' ? '(App Password)' : ''} *
            </Label>
            <Input
              id="password"
              type="password"
              value={config.password}
              onChange={(e) => {
                setConfig(prev => ({ ...prev, password: e.target.value }));
                setIsValidated(false);
              }}
              placeholder={environment === 'development' ? 'Senha de 16 caracteres do Gmail' : 'Sua senha de email'}
            />
          </div>

          {/* Aviso Servidor Corporativo */}
          {isCorporateServer && environment === 'development' && (
            <Alert className="border-orange-500 bg-orange-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>⚠️ Servidor Corporativo Detectado</strong>
                <div className="mt-1 text-sm">
                  Servidores corporativos ({config.host}) não funcionam em desenvolvimento por segurança.
                  Use Gmail para desenvolvimento.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Resultado da Validação */}
          {validationState.status !== 'idle' && (
            <Alert className={
              validationState.status === 'success' 
                ? 'border-green-500 bg-green-50'
                : validationState.status === 'error'
                ? 'border-red-500 bg-red-50'
                : 'border-blue-500 bg-blue-50'
            }>
              {validationState.status === 'validating' && <Loader2 className="h-4 w-4 animate-spin" />}
              {validationState.status === 'success' && <CheckCircle className="h-4 w-4" />}
              {validationState.status === 'error' && <XCircle className="h-4 w-4" />}
              <AlertDescription>
                <div className="font-medium">{validationState.message}</div>
                {validationState.details?.solutions && (
                  <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                    {validationState.details.solutions.map((solution: string, index: number) => (
                      <li key={index}>{solution}</li>
                    ))}
                  </ul>
                )}
                {validationState.details?.suggestion && (
                  <div className="mt-2 text-sm">
                    💡 <strong>Sugestão:</strong> {validationState.details.suggestion}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Botões de Ação */}
          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleValidateConfig}
              disabled={validationState.status === 'validating'}
              variant="outline"
              className="flex-1"
            >
              {validationState.status === 'validating' && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Testar Conexão
            </Button>

            <Button
              onClick={handleSaveConfig}
              disabled={!isValidated || isSaving}
              className="flex-1"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isValidated ? 'Salvar Configuração' : 'Teste Primeiro'}
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            * Campos obrigatórios. A configuração deve ser testada antes de salvar.
          </div>
        </CardContent>
      </Card>

      {/* Lista de Provedores */}
      {providers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provedores Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {providers.map((provider, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded-md border ${
                    provider.recommended ? 'border-green-300 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {provider.name}
                      {provider.recommended && <Badge variant="default" className="text-xs">Recomendado</Badge>}
                    </div>
                    <div className="text-sm text-gray-600">{provider.note}</div>
                    {provider.restrictions && provider.restrictions.length > 0 && (
                      <div className="text-xs text-orange-600 mt-1">
                        {provider.restrictions.join(', ')}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setConfig(prev => ({
                        ...prev,
                        host: provider.host,
                        port: provider.port
                      }));
                      setIsValidated(false);
                    }}
                  >
                    Usar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartEmailConfigForm;
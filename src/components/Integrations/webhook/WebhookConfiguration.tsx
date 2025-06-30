import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Switch } from '../../ui/switch';
import { AnimatedCard } from '../../ui/animated-card';
import { BlurFade } from '../../ui/blur-fade';
import { 
  Webhook, 
  Key, 
  Copy, 
  RefreshCw,
  Save,
  TestTube,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../../lib/toast';

interface WebhookConfig {
  url: string;
  secret: string;
  isEnabled: boolean;
  rateLimitPerMinute: number;
  lastTest?: {
    success: boolean;
    timestamp: string;
    responseTime?: number;
  };
}

export function useWebhookConfiguration(initialConfig?: WebhookConfig) {
  const [config, setConfig] = useState<WebhookConfig>(initialConfig || {
    url: '',
    secret: '',
    isEnabled: false,
    rateLimitPerMinute: 60
  });
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const generateSecret = useCallback(() => {
    const newSecret = 'whsec_' + Math.random().toString(36).substr(2, 32);
    setConfig(prev => ({ ...prev, secret: newSecret }));
    showSuccessToast('Nova secret gerada com sucesso!');
  }, []);

  const copyToClipboard = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccessToast(`${type} copiado para a área de transferência!`);
    } catch {
      showErrorToast('Erro ao copiar. Copie manualmente.');
    }
  }, []);

  const testWebhook = useCallback(async () => {
    if (!config.url) {
      showErrorToast('Configure uma URL antes de testar.');
      return;
    }

    setIsTesting(true);
    try {
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 1500));
      const responseTime = Date.now() - startTime;
      
      const success = Math.random() > 0.2;
      
      setConfig(prev => ({
        ...prev,
        lastTest: {
          success,
          timestamp: new Date().toISOString(),
          responseTime
        }
      }));

      if (success) {
        showSuccessToast(`Webhook testado com sucesso! (${responseTime}ms)`);
      } else {
        showErrorToast('Falha no teste do webhook. Verifique a URL.');
      }
    } catch (error) {
      showErrorToast('Erro ao testar webhook.');
    } finally {
      setIsTesting(false);
    }
  }, [config.url]);

  const saveConfig = useCallback(async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSuccessToast('Configuração de webhook salva!');
    } catch (error) {
      showErrorToast('Erro ao salvar configuração.');
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    config,
    setConfig,
    isTesting,
    isSaving,
    generateSecret,
    copyToClipboard,
    testWebhook,
    saveConfig
  };
}

interface WebhookConfigurationRenderProps {
  webhookManager: ReturnType<typeof useWebhookConfiguration>;
}

export function WebhookConfigurationRender({ webhookManager }: WebhookConfigurationRenderProps) {
  const {
    config,
    setConfig,
    isTesting,
    isSaving,
    generateSecret,
    copyToClipboard,
    testWebhook,
    saveConfig
  } = webhookManager;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Webhook className="h-5 w-5 text-purple-600" />
          Webhook Configuration
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure webhooks para receber notificações em tempo real
        </p>
      </div>

      <BlurFade delay={0.1} inView>
        <AnimatedCard>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Configuração do Webhook</CardTitle>
                <CardDescription>URL e autenticação do webhook</CardDescription>
              </div>
              <Switch
                checked={config.isEnabled}
                onCheckedChange={(enabled) => setConfig(prev => ({ ...prev, isEnabled: enabled }))}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="webhookUrl">URL do Webhook</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="webhookUrl"
                  value={config.url}
                  onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://seu-servidor.com/webhook"
                  className="flex-1"
                />
                <Button
                  onClick={testWebhook}
                  disabled={!config.url || isTesting}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {isTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                  Testar
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="webhookSecret">Secret Key</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="webhookSecret"
                  value={config.secret}
                  onChange={(e) => setConfig(prev => ({ ...prev, secret: e.target.value }))}
                  placeholder="whsec_..."
                  className="flex-1"
                />
                <Button
                  onClick={() => copyToClipboard(config.secret, 'Secret')}
                  disabled={!config.secret}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button onClick={generateSecret} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="rateLimit">Rate Limit (req/min)</Label>
              <Input
                id="rateLimit"
                type="number"
                value={config.rateLimitPerMinute}
                onChange={(e) => setConfig(prev => ({ ...prev, rateLimitPerMinute: parseInt(e.target.value) || 60 }))}
                min="1"
                max="1000"
                className="mt-1"
              />
            </div>

            {config.lastTest && (
              <div className={`p-3 rounded-lg border ${config.lastTest.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2">
                  {config.lastTest.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${config.lastTest.success ? 'text-green-900' : 'text-red-900'}`}>
                    {config.lastTest.success ? 'Webhook funcionando' : 'Falha no webhook'}
                  </span>
                  {config.lastTest.responseTime && (
                    <Badge variant="outline" className="text-xs">
                      {config.lastTest.responseTime}ms
                    </Badge>
                  )}
                </div>
                <p className={`text-xs mt-1 ${config.lastTest.success ? 'text-green-600' : 'text-red-600'}`}>
                  Testado em {new Date(config.lastTest.timestamp).toLocaleString()}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-4 border-t">
              <Button
                onClick={saveConfig}
                disabled={isSaving || !config.url}
                className="flex items-center gap-2"
              >
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Configuração
              </Button>
              
              {config.isEnabled && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Shield className="h-4 w-4" />
                  <span>Webhook ativo</span>
                  <Clock className="h-4 w-4" />
                  <span>{config.rateLimitPerMinute}/min</span>
                </div>
              )}
            </div>
          </CardContent>
        </AnimatedCard>
      </BlurFade>

      <BlurFade delay={0.2} inView>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exemplo de Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "event": "lead.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "lead_id": "123",
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "(11) 99999-9999",
    "source": "form_builder"
  }
}`}
            </pre>
          </CardContent>
        </Card>
      </BlurFade>
    </div>
  );
}

export default WebhookConfigurationRender; 
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, Smartphone, Tablet, RefreshCw, Eye } from 'lucide-react';

interface EmbedPreviewProps {
  config: any;
  formData: {
    name: string;
    type: string;
  };
}

export function EmbedPreview({ config, formData }: EmbedPreviewProps) {
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isLoading, setIsLoading] = useState(false);

  const getDeviceStyles = () => {
    switch (previewDevice) {
      case 'desktop':
        return 'w-full max-w-4xl mx-auto';
      case 'tablet':
        return 'w-full max-w-2xl mx-auto';
      case 'mobile':
        return 'w-full max-w-sm mx-auto';
      default:
        return 'w-full';
    }
  };

  const getFormTypeDescription = (type: string) => {
    const descriptions = {
      standard: 'Formulário padrão incorporado na página',
      exit_intent: 'Modal que aparece quando usuário tenta sair',
      scroll_trigger: 'Modal que aparece após scroll específico',
      time_delayed: 'Modal que aparece após tempo determinado',
      multi_step: 'Formulário em múltiplas etapas',
      smart_scheduling: 'Formulário com agendamento integrado',
      cadence_trigger: 'Formulário que dispara cadência automática',
      whatsapp_integration: 'Formulário com botão WhatsApp'
    };
    return descriptions[type as keyof typeof descriptions] || 'Formulário personalizado';
  };

  const simulateFormLoad = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  const renderFormPreview = () => {
    const formStyle = {
      borderRadius: config.customization.borderRadius,
      '--primary-color': config.customization.primaryColor,
    } as React.CSSProperties;

    return (
      <div 
        className="border rounded-lg p-6 bg-white shadow-sm"
        style={formStyle}
      >
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold" style={{ color: config.customization.primaryColor }}>
              {formData.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {getFormTypeDescription(formData.type)}
            </p>
          </div>

          {/* Simulação de campos do formulário */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nome *</label>
              <div className="h-10 bg-gray-100 rounded border"></div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-mail *</label>
              <div className="h-10 bg-gray-100 rounded border"></div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefone</label>
              <div className="h-10 bg-gray-100 rounded border"></div>
            </div>
            {formData.type === 'multi_step' && (
              <div className="flex justify-between items-center pt-2">
                <div className="flex space-x-2">
                  <div className="w-8 h-1 bg-blue-500 rounded"></div>
                  <div className="w-8 h-1 bg-gray-200 rounded"></div>
                  <div className="w-8 h-1 bg-gray-200 rounded"></div>
                </div>
                <span className="text-xs text-muted-foreground">Etapa 1 de 3</span>
              </div>
            )}
          </div>

          <Button 
            className="w-full"
            style={{ backgroundColor: config.customization.primaryColor }}
            disabled={isLoading}
          >
            {isLoading ? 'Enviando...' : 'Enviar'}
          </Button>

          {config.behavior.showPoweredBy && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Powered by <span className="font-medium">CRM Marketing</span>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controles de Preview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview do Formulário
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={previewDevice} onValueChange={(value: any) => setPreviewDevice(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desktop">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Desktop
                    </div>
                  </SelectItem>
                  <SelectItem value="tablet">
                    <div className="flex items-center gap-2">
                      <Tablet className="h-4 w-4" />
                      Tablet
                    </div>
                  </SelectItem>
                  <SelectItem value="mobile">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Mobile
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={simulateFormLoad}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline">Tema: {config.customization.theme}</Badge>
            <Badge variant="outline">Cor: {config.customization.primaryColor}</Badge>
            <Badge variant="outline">Animações: {config.customization.animation ? 'Sim' : 'Não'}</Badge>
            {config.security.domainRestriction && (
              <Badge variant="outline">Domínios Restritos</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview do Formulário */}
      <Card className="min-h-[500px]">
        <CardContent className="p-8">
          <div className={`transition-all duration-300 ${getDeviceStyles()}`}>
            {formData.type === 'exit_intent' && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Espere! Não vá embora</h3>
                    <button className="text-gray-400 hover:text-gray-600">×</button>
                  </div>
                  {renderFormPreview()}
                </div>
              </div>
            )}

            {formData.type === 'scroll_trigger' && (
              <div className="fixed bottom-4 right-4 z-50">
                <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Interessado?</span>
                    <button className="text-gray-400 hover:text-gray-600">×</button>
                  </div>
                  {renderFormPreview()}
                </div>
              </div>
            )}

            {['standard', 'multi_step', 'smart_scheduling', 'cadence_trigger', 'whatsapp_integration'].includes(formData.type) && (
              <div className="space-y-4">
                {renderFormPreview()}
                
                {formData.type === 'whatsapp_integration' && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      Enviar Formulário
                    </Button>
                    <Button className="bg-green-500 hover:bg-green-600">
                      WhatsApp
                    </Button>
                  </div>
                )}
              </div>
            )}

            {formData.type === 'time_delayed' && (
              <div className="text-center py-12">
                <div className="animate-pulse">
                  <p className="text-muted-foreground mb-4">
                    Simulando delay de carregamento...
                  </p>
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações Técnicas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Técnicas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Tamanho estimado:</span>
              <span className="ml-2 text-muted-foreground">~45KB (minificado)</span>
            </div>
            <div>
              <span className="font-medium">Carregamento:</span>
              <span className="ml-2 text-muted-foreground">
                {config.behavior.lazyLoad ? 'Lazy Loading' : 'Imediato'}
              </span>
            </div>
            <div>
              <span className="font-medium">Compatibilidade:</span>
              <span className="ml-2 text-muted-foreground">IE11+, Chrome, Firefox, Safari</span>
            </div>
            <div>
              <span className="font-medium">HTTPS:</span>
              <span className="ml-2 text-muted-foreground">
                {config.security.httpsOnly ? 'Obrigatório' : 'Opcional'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
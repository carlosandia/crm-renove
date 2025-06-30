import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Copy, Globe, Shield, Zap, Code2, Eye, Settings } from 'lucide-react';
import { BlurFade } from '@/components/ui/blur-fade';
import { EmbedCodeDisplay } from './EmbedCodeDisplay';
import { EmbedPreview } from './EmbedPreview';

interface EmbedConfig {
  formId: string;
  formType: string;
  domain: string;
  security: {
    domainRestriction: boolean;
    allowedDomains: string[];
    httpsOnly: boolean;
  };
  customization: {
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;
    borderRadius: string;
    animation: boolean;
  };
  behavior: {
    autoLoad: boolean;
    lazyLoad: boolean;
    closeOnSuccess: boolean;
    showPoweredBy: boolean;
  };
  tracking: {
    analytics: boolean;
    gtag: string;
    fbPixel: string;
  };
  version: string;
}

interface EmbedGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  formData: {
    name: string;
    type: string;
    config?: any;
  };
}

export function EmbedGenerator({ isOpen, onClose, formId, formData }: EmbedGeneratorProps) {
  const [activeTab, setActiveTab] = useState('code');
  const [embedConfig, setEmbedConfig] = useState<EmbedConfig>({
    formId,
    formType: formData.type,
    domain: window.location.origin,
    security: {
      domainRestriction: false,
      allowedDomains: [],
      httpsOnly: true,
    },
    customization: {
      theme: 'auto',
      primaryColor: '#3b82f6',
      borderRadius: '8px',
      animation: true,
    },
    behavior: {
      autoLoad: true,
      lazyLoad: false,
      closeOnSuccess: true,
      showPoweredBy: true,
    },
    tracking: {
      analytics: false,
      gtag: '',
      fbPixel: '',
    },
    version: '1.0.0',
  });

  const [domainInput, setDomainInput] = useState('');

  // Gerar código de embed baseado na configuração
  const generateEmbedCode = () => {
    const config = JSON.stringify(embedConfig, null, 2);
    
    return `<!-- Form CRM Embed Code -->
<div id="crm-form-${formId}" data-form-id="${formId}"></div>
<script>
  window.crmFormConfig = ${config};
  (function() {
    var script = document.createElement('script');
    script.src = '${embedConfig.domain}/form-embed.js?v=${embedConfig.version}';
    script.async = true;
    script.onload = function() {
      if (window.CRMFormEmbed) {
        window.CRMFormEmbed.init('${formId}', window.crmFormConfig);
      }
    };
    document.head.appendChild(script);
  })();
</script>`;
  };

  // Gerar código React/Next.js
  const generateReactCode = () => {
    return `import { useEffect } from 'react';

export function CRMFormEmbed() {
  useEffect(() => {
    const config = ${JSON.stringify(embedConfig, null, 4)};
    
    const script = document.createElement('script');
    script.src = '${embedConfig.domain}/form-embed.js?v=${embedConfig.version}';
    script.async = true;
    script.onload = () => {
      if (window.CRMFormEmbed) {
        window.CRMFormEmbed.init('${formId}', config);
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (window.CRMFormEmbed) {
        window.CRMFormEmbed.destroy('${formId}');
      }
    };
  }, []);

  return <div id="crm-form-${formId}" data-form-id="${formId}" />;
}`;
  };

  // Adicionar domínio permitido
  const addAllowedDomain = () => {
    if (domainInput && !embedConfig.security.allowedDomains.includes(domainInput)) {
      setEmbedConfig(prev => ({
        ...prev,
        security: {
          ...prev.security,
          allowedDomains: [...prev.security.allowedDomains, domainInput]
        }
      }));
      setDomainInput('');
    }
  };

  // Remover domínio permitido
  const removeAllowedDomain = (domain: string) => {
    setEmbedConfig(prev => ({
      ...prev,
      security: {
        ...prev.security,
        allowedDomains: prev.security.allowedDomains.filter(d => d !== domain)
      }
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Gerar Código de Embed - {formData.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="code" className="flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              Código
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Segurança
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 h-[600px] overflow-y-auto">
            <TabsContent value="code" className="space-y-6">
              <BlurFade delay={0.1}>
                <EmbedCodeDisplay
                  htmlCode={generateEmbedCode()}
                  reactCode={generateReactCode()}
                  config={embedConfig}
                />
              </BlurFade>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <BlurFade delay={0.1}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customização Visual */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Customização Visual
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tema</Label>
                        <Select
                          value={embedConfig.customization.theme}
                          onValueChange={(value: 'light' | 'dark' | 'auto') =>
                            setEmbedConfig(prev => ({
                              ...prev,
                              customization: { ...prev.customization, theme: value }
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Claro</SelectItem>
                            <SelectItem value="dark">Escuro</SelectItem>
                            <SelectItem value="auto">Automático</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Cor Primária</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={embedConfig.customization.primaryColor}
                            onChange={(e) =>
                              setEmbedConfig(prev => ({
                                ...prev,
                                customization: { ...prev.customization, primaryColor: e.target.value }
                              }))
                            }
                            className="w-16 h-10"
                          />
                          <Input
                            value={embedConfig.customization.primaryColor}
                            onChange={(e) =>
                              setEmbedConfig(prev => ({
                                ...prev,
                                customization: { ...prev.customization, primaryColor: e.target.value }
                              }))
                            }
                            placeholder="#3b82f6"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Border Radius</Label>
                        <Select
                          value={embedConfig.customization.borderRadius}
                          onValueChange={(value) =>
                            setEmbedConfig(prev => ({
                              ...prev,
                              customization: { ...prev.customization, borderRadius: value }
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0px">Nenhum</SelectItem>
                            <SelectItem value="4px">Pequeno</SelectItem>
                            <SelectItem value="8px">Médio</SelectItem>
                            <SelectItem value="16px">Grande</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Animações</Label>
                        <Switch
                          checked={embedConfig.customization.animation}
                          onCheckedChange={(checked) =>
                            setEmbedConfig(prev => ({
                              ...prev,
                              customization: { ...prev.customization, animation: checked }
                            }))
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Comportamento */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Comportamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Carregamento Automático</Label>
                          <p className="text-xs text-muted-foreground">
                            Carregar formulário imediatamente
                          </p>
                        </div>
                        <Switch
                          checked={embedConfig.behavior.autoLoad}
                          onCheckedChange={(checked) =>
                            setEmbedConfig(prev => ({
                              ...prev,
                              behavior: { ...prev.behavior, autoLoad: checked }
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Lazy Loading</Label>
                          <p className="text-xs text-muted-foreground">
                            Carregar quando visível
                          </p>
                        </div>
                        <Switch
                          checked={embedConfig.behavior.lazyLoad}
                          onCheckedChange={(checked) =>
                            setEmbedConfig(prev => ({
                              ...prev,
                              behavior: { ...prev.behavior, lazyLoad: checked }
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Fechar ao Enviar</Label>
                          <p className="text-xs text-muted-foreground">
                            Fechar após submissão
                          </p>
                        </div>
                        <Switch
                          checked={embedConfig.behavior.closeOnSuccess}
                          onCheckedChange={(checked) =>
                            setEmbedConfig(prev => ({
                              ...prev,
                              behavior: { ...prev.behavior, closeOnSuccess: checked }
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Powered by CRM</Label>
                          <p className="text-xs text-muted-foreground">
                            Mostrar link de atribuição
                          </p>
                        </div>
                        <Switch
                          checked={embedConfig.behavior.showPoweredBy}
                          onCheckedChange={(checked) =>
                            setEmbedConfig(prev => ({
                              ...prev,
                              behavior: { ...prev.behavior, showPoweredBy: checked }
                            }))
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tracking */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Analytics e Tracking
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Habilitar Analytics</Label>
                        <Switch
                          checked={embedConfig.tracking.analytics}
                          onCheckedChange={(checked) =>
                            setEmbedConfig(prev => ({
                              ...prev,
                              tracking: { ...prev.tracking, analytics: checked }
                            }))
                          }
                        />
                      </div>

                      {embedConfig.tracking.analytics && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Google Analytics ID</Label>
                            <Input
                              placeholder="GA4-XXXXXXXXX"
                              value={embedConfig.tracking.gtag}
                              onChange={(e) =>
                                setEmbedConfig(prev => ({
                                  ...prev,
                                  tracking: { ...prev.tracking, gtag: e.target.value }
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Facebook Pixel ID</Label>
                            <Input
                              placeholder="1234567890"
                              value={embedConfig.tracking.fbPixel}
                              onChange={(e) =>
                                setEmbedConfig(prev => ({
                                  ...prev,
                                  tracking: { ...prev.tracking, fbPixel: e.target.value }
                                }))
                              }
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </BlurFade>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <BlurFade delay={0.1}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Configurações de Segurança
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>HTTPS Obrigatório</Label>
                        <p className="text-xs text-muted-foreground">
                          Permitir apenas sites HTTPS
                        </p>
                      </div>
                      <Switch
                        checked={embedConfig.security.httpsOnly}
                        onCheckedChange={(checked) =>
                          setEmbedConfig(prev => ({
                            ...prev,
                            security: { ...prev.security, httpsOnly: checked }
                          }))
                        }
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Restrição de Domínio</Label>
                          <p className="text-xs text-muted-foreground">
                            Permitir apenas domínios específicos
                          </p>
                        </div>
                        <Switch
                          checked={embedConfig.security.domainRestriction}
                          onCheckedChange={(checked) =>
                            setEmbedConfig(prev => ({
                              ...prev,
                              security: { ...prev.security, domainRestriction: checked }
                            }))
                          }
                        />
                      </div>

                      {embedConfig.security.domainRestriction && (
                        <div className="space-y-4">
                          <div className="flex gap-2">
                            <Input
                              placeholder="exemplo.com"
                              value={domainInput}
                              onChange={(e) => setDomainInput(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && addAllowedDomain()}
                            />
                            <Button onClick={addAllowedDomain} size="sm">
                              Adicionar
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <Label>Domínios Permitidos:</Label>
                            <div className="flex flex-wrap gap-2">
                              {embedConfig.security.allowedDomains.map((domain) => (
                                <Badge
                                  key={domain}
                                  variant="secondary"
                                  className="cursor-pointer"
                                  onClick={() => removeAllowedDomain(domain)}
                                >
                                  {domain} ×
                                </Badge>
                              ))}
                              {embedConfig.security.allowedDomains.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                  Nenhum domínio adicionado
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </BlurFade>
            </TabsContent>

            <TabsContent value="preview" className="space-y-6">
              <BlurFade delay={0.1}>
                <EmbedPreview config={embedConfig} formData={formData} />
              </BlurFade>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Versão {embedConfig.version}</Badge>
            <Badge variant="outline">{formData.type}</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button onClick={() => {
              navigator.clipboard.writeText(generateEmbedCode());
              // Aqui poderia mostrar um toast de sucesso
            }}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar Código
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
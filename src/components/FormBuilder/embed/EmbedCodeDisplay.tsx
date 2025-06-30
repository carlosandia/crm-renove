import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, Code, FileCode, Globe, Smartphone } from 'lucide-react';

interface EmbedCodeDisplayProps {
  htmlCode: string;
  reactCode: string;
  config: any;
}

export function EmbedCodeDisplay({ htmlCode, reactCode, config }: EmbedCodeDisplayProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (code: string, type: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const downloadCode = (code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Gerar código WordPress
  const generateWordPressCode = () => {
    return `<?php
// Adicionar ao functions.php do seu tema WordPress

function crm_form_embed_shortcode($atts) {
    $atts = shortcode_atts(array(
        'id' => '${config.formId}',
        'theme' => '${config.customization.theme}',
        'color' => '${config.customization.primaryColor}'
    ), $atts);
    
    $config = json_encode(${JSON.stringify(config, null, 8)});
    
    return '<div id="crm-form-' . $atts['id'] . '" data-form-id="' . $atts['id'] . '"></div>
    <script>
        window.crmFormConfig = ' . $config . ';
        (function() {
            var script = document.createElement("script");
            script.src = "${config.domain}/form-embed.js?v=${config.version}";
            script.async = true;
            script.onload = function() {
                if (window.CRMFormEmbed) {
                    window.CRMFormEmbed.init("' . $atts['id'] . '", window.crmFormConfig);
                }
            };
            document.head.appendChild(script);
        })();
    </script>';
}
add_shortcode('crm_form', 'crm_form_embed_shortcode');

// Uso: [crm_form id="${config.formId}"]
?>`;
  };

  // Gerar código para Google Tag Manager
  const generateGTMCode = () => {
    return `<!-- Google Tag Manager - Custom HTML Tag -->
<script>
  window.crmFormConfig = ${JSON.stringify(config, null, 2)};
  
  (function() {
    var script = document.createElement('script');
    script.src = '${config.domain}/form-embed.js?v=${config.version}';
    script.async = true;
    script.onload = function() {
      if (window.CRMFormEmbed) {
        window.CRMFormEmbed.init('${config.formId}', window.crmFormConfig);
        
        // Tracking para GTM
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          'event': 'crm_form_loaded',
          'form_id': '${config.formId}',
          'form_type': '${config.formType}'
        });
      }
    };
    document.head.appendChild(script);
  })();
</script>

<div id="crm-form-${config.formId}" data-form-id="${config.formId}"></div>`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-blue-500" />
              <span className="font-medium">HTML/JavaScript</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Para qualquer site ou CMS
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Code className="h-4 w-4 text-green-500" />
              <span className="font-medium">React/Next.js</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Componente React otimizado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="h-4 w-4 text-purple-500" />
              <span className="font-medium">Mobile Ready</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Totalmente responsivo
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="html" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="html">HTML</TabsTrigger>
          <TabsTrigger value="react">React</TabsTrigger>
          <TabsTrigger value="wordpress">WordPress</TabsTrigger>
          <TabsTrigger value="gtm">GTM</TabsTrigger>
        </TabsList>

        <TabsContent value="html" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Código HTML/JavaScript</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(htmlCode, 'html')}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedCode === 'html' ? 'Copiado!' : 'Copiar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadCode(htmlCode, `crm-form-${config.formId}.html`)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{htmlCode}</code>
                </pre>
                <Badge variant="secondary" className="absolute top-2 right-2">
                  HTML
                </Badge>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Instruções:</strong> Cole este código no HTML da sua página onde você quer que o formulário apareça.
                  O script será carregado automaticamente e renderizará o formulário.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="react" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Componente React</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(reactCode, 'react')}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedCode === 'react' ? 'Copiado!' : 'Copiar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadCode(reactCode, `CRMFormEmbed.tsx`)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{reactCode}</code>
                </pre>
                <Badge variant="secondary" className="absolute top-2 right-2">
                  TSX
                </Badge>
              </div>
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Instruções:</strong> Importe e use este componente em qualquer lugar do seu app React ou Next.js.
                  O cleanup é feito automaticamente quando o componente é desmontado.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wordpress" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Plugin WordPress</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generateWordPressCode(), 'wordpress')}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedCode === 'wordpress' ? 'Copiado!' : 'Copiar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadCode(generateWordPressCode(), `crm-form-shortcode.php`)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{generateWordPressCode()}</code>
                </pre>
                <Badge variant="secondary" className="absolute top-2 right-2">
                  PHP
                </Badge>
              </div>
              <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-800">
                  <strong>Instruções:</strong> Adicione este código ao functions.php do seu tema WordPress.
                  Use o shortcode <code>[crm_form id="{config.formId}"]</code> em posts ou páginas.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gtm" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Google Tag Manager</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generateGTMCode(), 'gtm')}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedCode === 'gtm' ? 'Copiado!' : 'Copiar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadCode(generateGTMCode(), `gtm-form-tag.html`)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{generateGTMCode()}</code>
                </pre>
                <Badge variant="secondary" className="absolute top-2 right-2">
                  GTM
                </Badge>
              </div>
              <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>Instruções:</strong> Crie uma tag "Custom HTML" no Google Tag Manager e cole este código.
                  Configure o trigger para disparar onde você quer que o formulário apareça.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <FileCode className="h-8 w-8 mx-auto text-muted-foreground" />
            <h3 className="font-medium">Implementação Personalizada</h3>
            <p className="text-sm text-muted-foreground">
              Precisa de uma implementação específica? Nossa equipe pode ajudar com integrações customizadas.
            </p>
            <Button variant="outline" size="sm">
              Falar com Suporte
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
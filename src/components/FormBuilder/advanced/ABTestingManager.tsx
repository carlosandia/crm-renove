import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Trophy, TrendingUp, Users, Eye } from 'lucide-react';

interface ABVariant {
  id: string;
  name: string;
  config: {
    primaryColor: string;
    buttonText: string;
    title: string;
  };
  trafficPercent: number;
  isControl: boolean;
}

interface ABTestingManagerProps {
  formId: string;
  onSave: (testConfig: any) => void;
}

export function ABTestingManager({ formId, onSave }: ABTestingManagerProps) {
  const [activeTab, setActiveTab] = useState('setup');
  const [testName, setTestName] = useState('');
  const [testStatus, setTestStatus] = useState<'draft' | 'running'>('draft');
  
  const [variants, setVariants] = useState<ABVariant[]>([
    {
      id: 'control',
      name: 'Controle (Original)',
      config: {
        primaryColor: '#3b82f6',
        buttonText: 'Enviar',
        title: 'Formulário de Contato'
      },
      trafficPercent: 50,
      isControl: true
    },
    {
      id: 'variant-a',
      name: 'Variante A',
      config: {
        primaryColor: '#10b981',
        buttonText: 'Quero Receber!',
        title: 'Receba Nossa Proposta Exclusiva'
      },
      trafficPercent: 50,
      isControl: false
    }
  ]);

  // Mock stats
  const stats = [
    { variantId: 'control', views: 2456, conversions: 347, conversionRate: 14.1, confidence: 0, isWinning: false },
    { variantId: 'variant-a', views: 2398, conversions: 425, conversionRate: 17.7, confidence: 87.3, isWinning: true }
  ];

  const addVariant = () => {
    const newVariant: ABVariant = {
      id: `variant-${Date.now()}`,
      name: `Variante ${String.fromCharCode(65 + variants.length - 1)}`,
      config: {
        primaryColor: '#3b82f6',
        buttonText: 'Enviar',
        title: 'Formulário de Contato'
      },
      trafficPercent: 0,
      isControl: false
    };
    setVariants(prev => [...prev, newVariant]);
  };

  const updateVariant = (variantId: string, updates: Partial<ABVariant>) => {
    setVariants(prev => prev.map(v => 
      v.id === variantId ? { ...v, ...updates } : v
    ));
  };

  const startTest = () => {
    if (testName && variants.length >= 2) {
      setTestStatus('running');
      onSave({ name: testName, status: 'running', variants });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">A/B Testing Manager</h2>
          <p className="text-muted-foreground">Teste diferentes versões do formulário</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={testStatus === 'running' ? 'default' : 'secondary'}>
            {testStatus === 'running' ? 'Executando' : 'Rascunho'}
          </Badge>
          {testStatus === 'draft' && (
            <Button onClick={startTest} disabled={!testName || variants.length < 2}>
              <Play className="h-4 w-4 mr-2" />
              Iniciar Teste
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">Configuração</TabsTrigger>
          <TabsTrigger value="variants">Variantes</TabsTrigger>
          <TabsTrigger value="results">Resultados</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Teste</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Teste</Label>
                <Input
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="Ex: Teste de Botão Verde vs Azul"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variants" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Variantes do Teste</h3>
            <Button onClick={addVariant} disabled={variants.length >= 5}>
              Adicionar Variante
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {variants.map((variant) => (
              <Card key={variant.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{variant.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cor Primária</Label>
                    <Input
                      type="color"
                      value={variant.config.primaryColor}
                      onChange={(e) => updateVariant(variant.id, {
                        config: { ...variant.config, primaryColor: e.target.value }
                      })}
                      className="w-16 h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Texto do Botão</Label>
                    <Input
                      value={variant.config.buttonText}
                      onChange={(e) => updateVariant(variant.id, {
                        config: { ...variant.config, buttonText: e.target.value }
                      })}
                    />
                  </div>

                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div 
                      className="inline-block px-4 py-2 rounded text-white font-medium"
                      style={{ backgroundColor: variant.config.primaryColor }}
                    >
                      {variant.config.buttonText}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {stats.find(s => s.isWinning) && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">Variante Vencedora!</h3>
                    <p className="text-green-700">Variante A está performando melhor</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {variants.map((variant) => {
              const variantStats = stats.find(s => s.variantId === variant.id);
              
              return (
                <Card key={variant.id} className={variantStats?.isWinning ? 'border-green-300' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {variant.name}
                        {variantStats?.isWinning && <Trophy className="h-4 w-4 text-green-600" />}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {variantStats && (
                      <>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <Eye className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                            <p className="text-2xl font-bold">{variantStats.views.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Views</p>
                          </div>
                          <div>
                            <Users className="h-4 w-4 mx-auto mb-1 text-green-500" />
                            <p className="text-2xl font-bold">{variantStats.conversions}</p>
                            <p className="text-xs text-muted-foreground">Conversões</p>
                          </div>
                          <div>
                            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                            <p className="text-2xl font-bold">{variantStats.conversionRate.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">Taxa</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Confiança</span>
                            <span>{variantStats.confidence.toFixed(1)}%</span>
                          </div>
                          <Progress value={variantStats.confidence} />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
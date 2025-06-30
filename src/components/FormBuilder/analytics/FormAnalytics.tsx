import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Users, Eye, MousePointer, Smartphone, Monitor, RefreshCw } from 'lucide-react';

interface FormAnalyticsProps {
  formId: string;
  formType: string;
  dateRange: {
    start: Date;
    end: Date;
  };
}

interface AnalyticsData {
  overview: {
    totalViews: number;
    totalSubmissions: number;
    conversionRate: number;
    averageTime: number;
  };
  traffic: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  sources: Array<{
    source: string;
    views: number;
    conversions: number;
    rate: number;
  }>;
  timeline: Array<{
    date: string;
    views: number;
    submissions: number;
  }>;
  heatmap: Array<{
    element: string;
    clicks: number;
    percentage: number;
  }>;
  funnel: Array<{
    step: string;
    count: number;
    dropoff: number;
  }>;
}

export function FormAnalytics({ formId, formType, dateRange }: FormAnalyticsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    overview: {
      totalViews: 2847,
      totalSubmissions: 423,
      conversionRate: 14.9,
      averageTime: 45
    },
    traffic: {
      desktop: 60,
      mobile: 35,
      tablet: 5
    },
    sources: [
      { source: 'Orgânico', views: 1205, conversions: 189, rate: 15.7 },
      { source: 'Redes Sociais', views: 856, conversions: 124, rate: 14.5 },
      { source: 'Email', views: 543, conversions: 78, rate: 14.4 },
      { source: 'Direto', views: 243, conversions: 32, rate: 13.2 }
    ],
    timeline: [
      { date: '2025-01-20', views: 245, submissions: 34 },
      { date: '2025-01-21', views: 289, submissions: 41 },
      { date: '2025-01-22', views: 312, submissions: 52 },
      { date: '2025-01-23', views: 298, submissions: 44 },
      { date: '2025-01-24', views: 356, submissions: 63 },
      { date: '2025-01-25', views: 423, submissions: 71 },
      { date: '2025-01-26', views: 389, submissions: 58 }
    ],
    heatmap: [
      { element: 'Nome', clicks: 847, percentage: 100 },
      { element: 'E-mail', clicks: 823, percentage: 97.2 },
      { element: 'Telefone', clicks: 756, percentage: 89.3 },
      { element: 'Botão Enviar', clicks: 423, percentage: 49.9 }
    ],
    funnel: [
      { step: 'Visualizações', count: 2847, dropoff: 0 },
      { step: 'Interações', count: 1924, dropoff: 32.4 },
      { step: 'Iniciaram', count: 847, dropoff: 56.0 },
      { step: 'Completaram', count: 423, dropoff: 50.1 }
    ]
  });

  const refreshData = async () => {
    setIsLoading(true);
    // Simular carregamento de dados
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatNumber = (value: number) => value.toLocaleString('pt-BR');

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'desktop': return <Monitor className="h-4 w-4" />;
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getTypeSpecificMetrics = () => {
    switch (formType) {
      case 'exit_intent':
        return { trigger: 'Exit Intent', avgTriggerTime: '12s', effectiveness: '18.2%' };
      case 'scroll_trigger':
        return { trigger: 'Scroll 70%', avgTriggerTime: '34s', effectiveness: '16.7%' };
      case 'time_delayed':
        return { trigger: 'Time Delay', avgTriggerTime: '5s', effectiveness: '13.9%' };
      default:
        return { trigger: 'Immediate', avgTriggerTime: '0s', effectiveness: '14.9%' };
    }
  };

  const typeMetrics = getTypeSpecificMetrics();

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics do Formulário</h2>
          <p className="text-muted-foreground">
            Formulário tipo: <Badge variant="outline">{formType}</Badge>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 horas</SelectItem>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="traffic">Tráfego</TabsTrigger>
          <TabsTrigger value="funnel">Funil</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPIs principais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Eye className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Visualizações</p>
                    <p className="text-2xl font-bold">{formatNumber(analyticsData.overview.totalViews)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Conversões</p>
                    <p className="text-2xl font-bold">{formatNumber(analyticsData.overview.totalSubmissions)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Taxa de Conversão</p>
                    <p className="text-2xl font-bold">{formatPercentage(analyticsData.overview.conversionRate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Tempo Médio</p>
                    <p className="text-2xl font-bold">{analyticsData.overview.averageTime}s</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Métricas específicas do tipo */}
          <Card>
            <CardHeader>
              <CardTitle>Métricas Específicas do Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Tipo de Trigger</p>
                  <p className="text-lg font-semibold">{typeMetrics.trigger}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Tempo Médio até Trigger</p>
                  <p className="text-lg font-semibold">{typeMetrics.avgTriggerTime}</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Efetividade do Trigger</p>
                  <p className="text-lg font-semibold">{typeMetrics.effectiveness}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline de performance */}
          <Card>
            <CardHeader>
              <CardTitle>Performance ao Longo do Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.timeline.map((day, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm font-medium">{new Date(day.date).toLocaleDateString('pt-BR')}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {formatNumber(day.views)} views
                      </span>
                      <span className="text-sm font-medium">
                        {formatNumber(day.submissions)} conversões
                      </span>
                      <Badge variant="outline">
                        {formatPercentage((day.submissions / day.views) * 100)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dispositivos */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Dispositivo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span>Desktop</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${analyticsData.traffic.desktop}%` }}></div>
                      </div>
                      <span className="text-sm font-medium">{analyticsData.traffic.desktop}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span>Mobile</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${analyticsData.traffic.mobile}%` }}></div>
                      </div>
                      <span className="text-sm font-medium">{analyticsData.traffic.mobile}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span>Tablet</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${analyticsData.traffic.tablet}%` }}></div>
                      </div>
                      <span className="text-sm font-medium">{analyticsData.traffic.tablet}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fontes de tráfego */}
            <Card>
              <CardHeader>
                <CardTitle>Fontes de Tráfego</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.sources.map((source, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{source.source}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(source.views)} visualizações
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatNumber(source.conversions)}</p>
                        <Badge variant="outline">{formatPercentage(source.rate)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Funil de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {analyticsData.funnel.map((step, index) => (
                  <div key={index} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{step.step}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{formatNumber(step.count)}</span>
                        {step.dropoff > 0 && (
                          <Badge variant="destructive">{formatPercentage(step.dropoff)} dropoff</Badge>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full"
                        style={{ width: `${(step.count / analyticsData.funnel[0].count) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mapa de Calor - Interações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.heatmap.map((element, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium">{element.element}</span>
                    <div className="flex items-center gap-4">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${element.percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">{formatNumber(element.clicks)} clicks</span>
                        <p className="text-xs text-muted-foreground">{formatPercentage(element.percentage)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Métricas de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Tempo de carregamento médio</span>
                    <Badge variant="outline">2.1s</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxa de rejeição</span>
                    <Badge variant="outline">32.4%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Tempo médio na página</span>
                    <Badge variant="outline">1m 45s</Badge>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Score de qualidade</span>
                    <Badge variant="outline">8.7/10</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>ROI estimado</span>
                    <Badge variant="outline">285%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Custo por lead</span>
                    <Badge variant="outline">R$ 12,40</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
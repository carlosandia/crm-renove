/**
 * FASE 3: ANALYTICS & REPORTING SYSTEM
 * Advanced Dashboard - Dashboard executivo enterprise-grade
 * 
 * Dashboard comparável ao:
 * - HubSpot Executive Dashboard
 * - Salesforce Einstein Analytics
 * - Pipedrive Insights Dashboard
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target, 
  DollarSign, 
  Activity,
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDashboard, useRealTimeMetrics, useTimeRange, useExportReport, TimeRange, TeamMember } from '@/hooks/useAnalytics';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils';

// ============================================================================
// INTERFACES E TIPOS
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeDirection?: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  description?: string;
  target?: number;
}

interface ChartData {
  date: string;
  value: number;
  target?: number;
  previous?: number;
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeDirection = 'stable',
  icon,
  description,
  target
}) => {
  const getChangeColor = () => {
    switch (changeDirection) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getChangeIcon = () => {
    switch (changeDirection) {
      case 'up': return <TrendingUp className="h-4 w-4" />;
      case 'down': return <TrendingDown className="h-4 w-4" />;
      default: return null;
    }
  };

  const progressPercentage = target ? Math.min((Number(value) / target) * 100, 100) : undefined;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className="text-gray-400">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        
        {change !== undefined && (
          <div className={`flex items-center text-xs ${getChangeColor()}`}>
            {getChangeIcon()}
            <span className="ml-1">
              {change > 0 ? '+' : ''}{formatPercentage(change)} vs período anterior
            </span>
          </div>
        )}
        
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
        
        {target && progressPercentage !== undefined && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progresso da meta</span>
              <span>{formatPercentage(progressPercentage)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TrendChart: React.FC<{
  data: ChartData[];
  title: string;
  color: string;
  type: 'line' | 'area' | 'bar';
}> = ({ data, title, color, type }) => {
  const ChartComponent = type === 'line' ? RechartsLineChart : type === 'area' ? AreaChart : BarChart;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ChartComponent data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#666"
              fontSize={12}
              tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            />
            <YAxis stroke="#666" fontSize={12} />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
              formatter={(value: number, name: string) => [
                name === 'value' ? formatNumber(value) : value,
                name === 'value' ? 'Valor' : name
              ]}
            />
            <Legend />
            
            {type === 'line' && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={color} 
                  strokeWidth={2}
                  dot={{ fill: color, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
                />
                {data.some(d => d.target) && (
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    stroke="#94a3b8" 
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
              </>
            )}
            
            {type === 'area' && (
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                fill={`${color}20`}
                strokeWidth={2}
              />
            )}
            
            {type === 'bar' && (
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const TeamPerformanceTable: React.FC<{
  teamData: TeamMember[];
}> = ({ teamData }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Performance da Equipe</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">#</th>
                <th className="text-left py-2">Nome</th>
                <th className="text-right py-2">Leads</th>
                <th className="text-right py-2">Conversões</th>
                <th className="text-right py-2">Taxa Conv.</th>
                <th className="text-right py-2">Receita</th>
                <th className="text-right py-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {teamData.map((member, index) => (
                <tr key={member.user_id} className="border-b hover:bg-gray-50">
                  <td className="py-2">
                    <Badge variant={index < 3 ? "default" : "secondary"}>
                      {member.ranking}
                    </Badge>
                  </td>
                  <td className="py-2 font-medium">{member.name}</td>
                  <td className="text-right py-2">{formatNumber(member.metrics.leads_created)}</td>
                  <td className="text-right py-2">{formatNumber(member.metrics.deals_closed)}</td>
                  <td className="text-right py-2">{formatPercentage(member.metrics.conversion_rate)}</td>
                  <td className="text-right py-2">{formatCurrency(member.metrics.revenue_generated)}</td>
                  <td className="text-right py-2">
                    <div className="flex items-center justify-end">
                      <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${member.performance_score}%` }}
                        />
                      </div>
                      <span>{member.performance_score}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const AdvancedDashboard: React.FC = () => {
  const { timeRange, setPresetRange, updateTimeRange } = useTimeRange();
  const [activeTab, setActiveTab] = useState('overview');
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  // Hooks de dados
  const { 
    data: dashboardData, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useDashboard(timeRange);

  const { 
    data: realTimeData,
    isLoading: isRealTimeLoading 
  } = useRealTimeMetrics(realTimeEnabled);

  const exportReport = useExportReport();

  // Processar dados para os gráficos
  const chartData = useMemo(() => {
    if (!dashboardData) return { leads: [], revenue: [], conversion: [], pipeline: [] };

    return {
      leads: dashboardData.trends.leads_trend.map(d => ({
        date: d.date,
        value: d.value,
        target: d.target,
      })),
      revenue: dashboardData.trends.revenue_trend.map(d => ({
        date: d.date,
        value: d.value,
      })),
      conversion: dashboardData.trends.conversion_trend.map(d => ({
        date: d.date,
        value: d.value,
      })),
      pipeline: dashboardData.trends.pipeline_trend.map(d => ({
        date: d.date,
        value: d.value,
      })),
    };
  }, [dashboardData]);

  // Handlers
  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    exportReport.mutate({
      format,
      reportType: 'dashboard',
      filters: { timeRange }
    });
  };

  const handleRefresh = () => {
    refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Carregando analytics...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erro ao carregar dashboard</h3>
          <p className="text-gray-600 mb-4">
            {error?.message || 'Ocorreu um erro inesperado'}
          </p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </Card>
    );
  }

  if (!dashboardData) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Executivo</h1>
          <p className="text-gray-600">
            Visão completa da performance de vendas e marketing
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtro de período */}
          <Select onValueChange={(value) => setPresetRange(value as any)}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">7 dias</SelectItem>
              <SelectItem value="month">30 dias</SelectItem>
              <SelectItem value="quarter">3 meses</SelectItem>
              <SelectItem value="year">1 ano</SelectItem>
            </SelectContent>
          </Select>

          {/* Botões de ação */}
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>

          <Select onValueChange={(value) => handleExport(value as any)}>
            <SelectTrigger className="w-32">
              <Download className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Exportar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Real-time status */}
      {realTimeEnabled && realTimeData && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Dados em tempo real</span>
              </div>
              <div className="text-xs text-gray-600">
                Última atualização: {new Date(realTimeData.last_updated).toLocaleTimeString('pt-BR')}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total de Leads"
          value={formatNumber(dashboardData.kpis.total_leads)}
          change={dashboardData.comparisons.period_over_period.change_percentage}
          changeDirection={dashboardData.comparisons.period_over_period.change_direction}
          icon={<Users className="h-5 w-5" />}
          description="Leads gerados no período"
        />

        <MetricCard
          title="Taxa de Conversão"
          value={formatPercentage(dashboardData.kpis.conversion_rate)}
          change={5.2} // Mock
          changeDirection="up"
          icon={<Target className="h-5 w-5" />}
          description="Leads convertidos em vendas"
          target={20} // Meta de 20%
        />

        <MetricCard
          title="Receita do Mês"
          value={formatCurrency(dashboardData.kpis.monthly_revenue)}
          change={dashboardData.comparisons.year_over_year.change_percentage}
          changeDirection={dashboardData.comparisons.year_over_year.change_direction}
          icon={<DollarSign className="h-5 w-5" />}
          description="Receita gerada no período"
        />

        <MetricCard
          title="Velocidade do Pipeline"
          value={`${dashboardData.kpis.pipeline_velocity} dias`}
          change={-8.5} // Melhoria (menos dias)
          changeDirection="up"
          icon={<Clock className="h-5 w-5" />}
          description="Tempo médio para conversão"
        />
      </div>

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrendChart
              data={chartData.leads}
              title="Leads por Período"
              color="#3b82f6"
              type="area"
            />
            
            <TrendChart
              data={chartData.revenue}
              title="Receita por Período"
              color="#10b981"
              type="bar"
            />
          </div>

          {/* Métricas adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Pipeline Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(dashboardData.kpis.pipeline_value)}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Valor total em negociação
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Ticket Médio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(dashboardData.kpis.avg_deal_value)}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Valor médio por venda
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Leads Qualificados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatNumber(dashboardData.kpis.qualified_leads)}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {formatPercentage((dashboardData.kpis.qualified_leads / dashboardData.kpis.total_leads) * 100)} do total
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Tendências */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrendChart
              data={chartData.conversion}
              title="Taxa de Conversão"
              color="#f59e0b"
              type="line"
            />
            
            <TrendChart
              data={chartData.pipeline}
              title="Valor do Pipeline"
              color="#8b5cf6"
              type="area"
            />
          </div>
        </TabsContent>

        {/* Tab: Equipe */}
        <TabsContent value="team" className="space-y-6">
          <TeamPerformanceTable teamData={dashboardData.team_performance} />
        </TabsContent>

        {/* Tab: Atividades */}
        <TabsContent value="activities" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardData.recent_activities.map((activity, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium capitalize">{activity.type}</p>
                      <p className="text-2xl font-bold">{formatNumber(activity.count)}</p>
                    </div>
                    <Activity className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="flex items-center mt-2">
                    {activity.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : activity.trend === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : null}
                    <span className="text-xs text-gray-600 ml-1">
                      {formatPercentage(activity.change_percentage)} vs anterior
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedDashboard; 
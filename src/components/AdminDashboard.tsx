import React, { useState, useMemo } from 'react';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import { useAuth } from '../contexts/AuthContext';
import { 
  Target, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  DollarSign, 
  Calendar,
  Award,
  Activity,
  Settings,
  RefreshCw,
  Plus,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  LineChart,
  Filter,
  Download,
  Camera
} from 'lucide-react';

// Magic UI and shadcn/ui imports
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { BlurFade } from './ui/blur-fade';
import { ShimmerButton } from './ui/shimmer-button';
import { TabNavigation, TabItem } from './ui/navigation';
import { MotionWrapper, StaggerContainer } from './ui/motion-wrapper';
import ModernStatsCards from './ModernStatsCards';

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { PageContainer, PageHeader, PageTitle, PageActions, PageContent } from './ui/page-container';
import { EmptyState } from './ui/empty-state';
import { LoadingState } from './ui/loading-state';
// ✅ FASE 4: Import do componente de métricas de no-show
import NoShowMetrics from './Pipeline/metrics/NoShowMetrics';

interface AdminDashboardProps {
  className?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ className }) => {
  const { user } = useAuth();
  const {
    dashboardMetrics,
    salesTargets,
    adminAlerts,
    teamPerformance,
    isLoading,
    error,
    refreshDashboard,
    markAlertAsRead,
    batchMarkAlertsAsRead,
    generateTeamSnapshot,
    clearCache
  } = useAdminDashboard();

  // Local states
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedTargetType, setSelectedTargetType] = useState<string>('all');

  // Check permissions
  const canViewDashboard = user?.role === 'admin' || user?.role === 'super_admin';

  // Computed data
  const statsData = useMemo(() => {
    if (!dashboardMetrics) return [];

    return [
      {
        title: 'Receita Total',
        value: `R$ ${dashboardMetrics.overview.total_revenue.toLocaleString()}`,
        subtitle: `${dashboardMetrics.trends.revenue_trend > 0 ? '+' : ''}${dashboardMetrics.trends.revenue_trend.toFixed(1)}% vs mês anterior`,
        color: 'green',
        icon: DollarSign,
        trend: `${dashboardMetrics.trends.revenue_trend > 0 ? '+' : ''}${dashboardMetrics.trends.revenue_trend.toFixed(1)}%`,
        trendType: dashboardMetrics.trends.revenue_trend > 0 ? 'positive' as const : 'negative' as const
      },
      {
        title: 'Total de Leads',
        value: dashboardMetrics.overview.total_leads.toString(),
        subtitle: `${dashboardMetrics.trends.leads_trend > 0 ? '+' : ''}${dashboardMetrics.trends.leads_trend.toFixed(1)}% vs mês anterior`,
        color: 'blue',
        icon: Users,
        trend: `${dashboardMetrics.trends.leads_trend > 0 ? '+' : ''}${dashboardMetrics.trends.leads_trend.toFixed(1)}%`,
        trendType: dashboardMetrics.trends.leads_trend > 0 ? 'positive' as const : 'negative' as const
      },
      {
        title: 'Negócios Fechados',
        value: dashboardMetrics.overview.total_deals.toString(),
        subtitle: `${dashboardMetrics.trends.deals_trend > 0 ? '+' : ''}${dashboardMetrics.trends.deals_trend.toFixed(1)}% vs mês anterior`,
        color: 'purple',
        icon: Target,
        trend: `${dashboardMetrics.trends.deals_trend > 0 ? '+' : ''}${dashboardMetrics.trends.deals_trend.toFixed(1)}%`,
        trendType: dashboardMetrics.trends.deals_trend > 0 ? 'positive' as const : 'negative' as const
      },
      {
        title: 'Taxa de Conversão',
        value: `${dashboardMetrics.overview.conversion_rate.toFixed(1)}%`,
        subtitle: `${dashboardMetrics.trends.conversion_trend > 0 ? '+' : ''}${dashboardMetrics.trends.conversion_trend.toFixed(1)}% vs mês anterior`,
        color: 'orange',
        icon: TrendingUp,
        trend: `${dashboardMetrics.trends.conversion_trend > 0 ? '+' : ''}${dashboardMetrics.trends.conversion_trend.toFixed(1)}%`,
        trendType: dashboardMetrics.trends.conversion_trend > 0 ? 'positive' as const : 'negative' as const
      }
    ];
  }, [dashboardMetrics]);

  const filteredAlerts = useMemo(() => {
    if (!showUnreadOnly) return adminAlerts;
    return adminAlerts.filter(alert => alert.status === 'unread');
  }, [adminAlerts, showUnreadOnly]);

  const filteredTargets = useMemo(() => {
    if (selectedTargetType === 'all') return salesTargets;
    return salesTargets.filter(target => target.target_type === selectedTargetType);
  }, [salesTargets, selectedTargetType]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'high': return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
      case 'medium': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'low': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const getTargetStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'active': return 'text-blue-600 bg-blue-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPerformanceGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800 hover:bg-green-100';
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
    return 'bg-red-100 text-red-800 hover:bg-red-100';
  };

  const handleMarkAllAlertsAsRead = async () => {
    const unreadAlertIds = adminAlerts
      .filter(alert => alert.status === 'unread')
      .map(alert => alert.id);
    
    if (unreadAlertIds.length > 0) {
      await batchMarkAlertsAsRead(unreadAlertIds);
    }
  };

  if (!canViewDashboard) {
    return (
      <PageContainer>
        <PageContent>
          <EmptyState
            variant="generic"
            title="Acesso Restrito"
            description="Você não tem permissão para visualizar o dashboard administrativo."
          />
        </PageContent>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <PageContent>
          <EmptyState
            variant="generic"
            title="Erro ao carregar dashboard"
            description={error}
            actionLabel="Tentar Novamente"
            onAction={refreshDashboard}
          />
        </PageContent>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader>
          <PageTitle>Dashboard Admin</PageTitle>
        </PageHeader>
        <PageContent>
          <LoadingState />
        </PageContent>
      </PageContainer>
    );
  }

  return (
    <PageContainer className={className}>
      <PageHeader>
        <PageTitle>Dashboard Admin</PageTitle>
        <PageActions>
          <Button onClick={refreshDashboard} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={clearCache} variant="outline" size="sm">
            Limpar Cache
          </Button>
        </PageActions>
      </PageHeader>

      <PageContent>
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="targets" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Metas
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Alertas
              {adminAlerts.filter(a => a.status === 'unread').length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                  {adminAlerts.filter(a => a.status === 'unread').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Equipe
            </TabsTrigger>
          </TabsList>

                     {/* Overview Tab */}
           <TabsContent value="overview" className="space-y-6">
             {/* Stats Cards */}
             <ModernStatsCards stats={statsData} />
             
             {/* ✅ FASE 4: Métricas de No-Show e Conversão */}
             <NoShowMetrics 
               leads={[]} // TODO: Passar leads reais do dashboard
               stages={[]} // TODO: Passar stages reais do dashboard
               className="mt-6"
             />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Resumo da Equipe
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total de Membros:</span>
                    <span className="font-semibold">{dashboardMetrics?.team_summary.total_members || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Membros Ativos:</span>
                    <span className="font-semibold text-green-600">{dashboardMetrics?.team_summary.active_members || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Top Performer:</span>
                    <span className="font-semibold text-blue-600">{dashboardMetrics?.team_summary.top_performer || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Score Médio:</span>
                    <span className="font-semibold">{dashboardMetrics?.team_summary.avg_performance_score?.toFixed(1) || '0.0'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Targets Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Resumo das Metas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total de Metas:</span>
                    <span className="font-semibold">{dashboardMetrics?.targets_summary.total_targets || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Metas Ativas:</span>
                    <span className="font-semibold text-blue-600">{dashboardMetrics?.targets_summary.active_targets || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Metas Concluídas:</span>
                    <span className="font-semibold text-green-600">{dashboardMetrics?.targets_summary.completed_targets || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">No Caminho Certo:</span>
                    <span className="font-semibold text-orange-600">{dashboardMetrics?.targets_summary.on_track_targets || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Targets Tab */}
          <TabsContent value="targets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Metas de Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredTargets.length === 0 ? (
                  <EmptyState
                    variant="generic"
                    title="Nenhuma meta encontrada"
                    description="Configure metas de vendas para acompanhar o progresso da equipe"
                  />
                ) : (
                  <div className="space-y-4">
                                         {filteredTargets.map((target) => (
                       <div key={target.id} className="border rounded-lg p-4">
                         <div className="flex items-center justify-between mb-2">
                           <h4 className="font-semibold">{target.target_name}</h4>
                           <Badge variant="secondary">
                             {target.target_type}
                           </Badge>
                         </div>
                         <p className="text-sm text-gray-600 mb-4">
                           {target.status} • {target.period_type}
                         </p>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                           <div>
                             <span className="text-gray-600">Meta:</span>
                             <p className="font-medium">{target.target_value}</p>
                           </div>
                           <div>
                             <span className="text-gray-600">Atual:</span>
                             <p className="font-medium">{target.current_value}</p>
                           </div>
                           <div>
                             <span className="text-gray-600">Progresso:</span>
                             <p className="font-medium">{target.progress_percentage.toFixed(1)}%</p>
                           </div>
                           <div>
                             <span className="text-gray-600">Prazo:</span>
                             <p className="font-medium">{new Date(target.period_end).toLocaleDateString('pt-BR')}</p>
                           </div>
                         </div>
                       </div>
                     ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle>Alertas Administrativos</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                      variant="outline"
                      size="sm"
                    >
                      {showUnreadOnly ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                      {showUnreadOnly ? 'Mostrar Todos' : 'Apenas Não Lidos'}
                    </Button>
                    {filteredAlerts.filter(a => a.status === 'unread').length > 0 && (
                      <Button onClick={handleMarkAllAlertsAsRead} size="sm">
                        Marcar Todos como Lidos
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredAlerts.length === 0 ? (
                  <EmptyState
                    variant="generic"
                    title="Nenhum alerta encontrado"
                    description="Quando houver alertas administrativos, eles aparecerão aqui"
                  />
                ) : (
                  <div className="space-y-4">
                    {filteredAlerts.map((alert) => (
                      <div 
                        key={alert.id} 
                        className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                          alert.status === 'unread' ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                              <Badge variant="secondary" className={getPriorityColor(alert.priority)}>
                                {alert.priority}
                              </Badge>
                              {alert.action_required && (
                                <Badge variant="destructive">
                                  Ação Necessária
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>{new Date(alert.created_at).toLocaleString('pt-BR')}</span>
                              <span className="capitalize">{alert.alert_type.replace('_', ' ')}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {alert.status === 'unread' && (
                              <Button
                                onClick={() => markAlertAsRead(alert.id)}
                                size="sm"
                                variant="outline"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {alert.action_url && (
                              <Button size="sm">
                                Ver Detalhes
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Performance Tab */}
          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle>Performance da Equipe</CardTitle>
                  <Button 
                    onClick={() => generateTeamSnapshot('monthly')}
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Gerar Snapshot
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {teamPerformance.length === 0 ? (
                  <EmptyState
                    variant="generic"
                    title="Nenhuma métrica encontrada"
                    description="As métricas de performance da equipe aparecerão aqui quando disponíveis"
                    actionLabel="Carregar Métricas"
                    onAction={refreshDashboard}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teamPerformance.map((member) => (
                      <Card key={member.member_id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">{member.member_name}</h4>
                            <Badge variant="secondary" className={getPerformanceGradeColor(member.performance_grade)}>
                              {member.performance_grade}
                            </Badge>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Leads:</span>
                              <span className="font-medium">{member.total_leads}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Negócios Fechados:</span>
                              <span className="font-medium">{member.deals_closed}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Taxa de Conversão:</span>
                              <span className="font-medium">{member.conversion_rate.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Receita Gerada:</span>
                              <span className="font-medium">R$ {member.revenue_generated.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Score:</span>
                              <span className="font-medium">{member.performance_score.toFixed(1)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageContent>
    </PageContainer>
  );
};

export default AdminDashboard; 
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
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { BlurFade } from './ui/blur-fade';
import { ShimmerButton } from './ui/shimmer-button';
import { TabNavigation, TabItem } from './ui/navigation';
import { MotionWrapper, StaggerContainer } from './ui/motion-wrapper';
import ModernStatsCards from './ModernStatsCards';

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
  const [activeTab, setActiveTab] = useState('overview');
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
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
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
    if (grade.startsWith('A')) return 'text-green-600 bg-green-100';
    if (grade.startsWith('B')) return 'text-blue-600 bg-blue-100';
    if (grade.startsWith('C')) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const handleMarkAllAlertsAsRead = async () => {
    const unreadAlertIds = adminAlerts
      .filter(alert => alert.status === 'unread')
      .map(alert => alert.id);
    
    if (unreadAlertIds.length > 0) {
      await batchMarkAlertsAsRead(unreadAlertIds);
    }
  };

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'targets', label: 'Metas de Vendas', icon: Target },
    { id: 'alerts', label: 'Alertas', icon: AlertTriangle },
    { id: 'team', label: 'Performance da Equipe', icon: Users }
  ];

  if (!canViewDashboard) {
    return (
      <div className="p-6">
        <Card className="p-6 border-yellow-200 bg-yellow-50">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Acesso Restrito
          </h3>
          <p className="text-yellow-600">
            Você não tem permissão para visualizar o dashboard administrativo.
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-200 bg-red-50">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Erro ao carregar dashboard
          </h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={refreshDashboard} variant="outline">
            Tentar Novamente
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <MotionWrapper className={`space-y-6 ${className}`}>
      {/* Header */}
      <BlurFade delay={0.1}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Dashboard Administrativo
            </h1>
            <p className="text-gray-600">
              Visão completa da performance de vendas e equipe
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={clearCache} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Limpar Cache
            </Button>
            <Button onClick={refreshDashboard} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </BlurFade>

      {/* Stats Cards */}
      {dashboardMetrics && (
        <BlurFade delay={0.2}>
          <ModernStatsCards stats={statsData} />
        </BlurFade>
      )}

      {/* Navigation Tabs */}
      <BlurFade delay={0.3}>
        <TabNavigation 
          tabs={tabs} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
      </BlurFade>

      {/* Overview Tab */}
      {activeTab === 'overview' && dashboardMetrics && (
        <BlurFade delay={0.4}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Summary */}
            <Card className="p-6">
              <CardHeader className="pb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Resumo da Equipe
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total de Membros:</span>
                  <span className="font-semibold">{dashboardMetrics.team_summary.total_members}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Membros Ativos:</span>
                  <span className="font-semibold text-green-600">{dashboardMetrics.team_summary.active_members}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Top Performer:</span>
                  <span className="font-semibold text-blue-600">{dashboardMetrics.team_summary.top_performer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Score Médio:</span>
                  <span className="font-semibold">{dashboardMetrics.team_summary.avg_performance_score.toFixed(1)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Targets Summary */}
            <Card className="p-6">
              <CardHeader className="pb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Resumo das Metas
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total de Metas:</span>
                  <span className="font-semibold">{dashboardMetrics.targets_summary.total_targets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Metas Ativas:</span>
                  <span className="font-semibold text-blue-600">{dashboardMetrics.targets_summary.active_targets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Metas Concluídas:</span>
                  <span className="font-semibold text-green-600">{dashboardMetrics.targets_summary.completed_targets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">No Caminho Certo:</span>
                  <span className="font-semibold text-orange-600">{dashboardMetrics.targets_summary.on_track_targets}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </BlurFade>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <BlurFade delay={0.4}>
          <Card className="p-6">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Alertas Administrativos
                </h3>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                    variant="outline"
                    size="sm"
                  >
                    {showUnreadOnly ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                    {showUnreadOnly ? 'Mostrar Todos' : 'Apenas Não Lidos'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(alert.priority)}`}>
                            {alert.priority}
                          </span>
                          {alert.action_required && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                              Ação Necessária
                            </span>
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
                {filteredAlerts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {showUnreadOnly ? 'Nenhum alerta não lido.' : 'Nenhum alerta encontrado.'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      )}

      {/* Team Performance Tab */}
      {activeTab === 'team' && (
        <BlurFade delay={0.4}>
          <Card className="p-6">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Performance da Equipe
                </h3>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamPerformance.map((member) => (
                  <div key={member.member_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{member.member_name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPerformanceGradeColor(member.performance_grade)}`}>
                        {member.performance_grade}
                      </span>
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
                  </div>
                ))}
                {teamPerformance.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    Nenhum dado de performance disponível. Gere um snapshot para ver os dados.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      )}

      {/* Other tabs content would go here */}
      {activeTab !== 'overview' && (
        <BlurFade delay={0.4}>
          <Card className="p-6">
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Conteúdo da aba "{activeTab}" será implementado em breve.
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      )}
    </MotionWrapper>
  );
};

export default AdminDashboard; 
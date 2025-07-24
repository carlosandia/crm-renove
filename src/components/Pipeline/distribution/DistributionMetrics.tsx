import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { AnimatedCard } from '../../ui/animated-card';
import { BlurFade } from '../../ui/blur-fade';
import { 
  BarChart,
  Activity,
  Users,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Loader2
} from 'lucide-react';
import { useDistributionStats } from '../../../hooks/useDistributionApi';
import type { DistributionStats, AssignmentHistory } from '../../../services/distributionApi';

// ================================================================================
// INTERFACES E TIPOS
// ================================================================================
interface DistributionMetricsProps {
  pipelineId: string;
  showDetailed?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
}

interface AssignmentItemProps {
  assignment: AssignmentHistory;
}

// ================================================================================
// COMPONENTES AUXILIARES
// ================================================================================
function MetricCard({ title, value, description, icon: Icon, color, trend }: MetricCardProps) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50'
  };

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    stable: 'text-gray-600'
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
          {trend && (
            <div className={`text-right ${trendColors[trend.direction]}`}>
              <TrendingUp className={`h-4 w-4 ${trend.direction === 'down' ? 'rotate-180' : ''}`} />
              <p className="text-xs">{trend.value}%</p>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{description}</p>
      </CardContent>
    </Card>
  );
}

function AssignmentItem({ assignment }: AssignmentItemProps) {
  const statusIcons = {
    success: <CheckCircle className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-red-500" />,
    pending: <Clock className="h-4 w-4 text-amber-500" />
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        {statusIcons[assignment.status as keyof typeof statusIcons] || 
         <AlertCircle className="h-4 w-4 text-gray-500" />}
        <div>
          <p className="text-sm font-medium">
            {assignment.users ? 
              `${assignment.users.first_name} ${assignment.users.last_name}` : 
              'Usuário desconhecido'
            }
          </p>
          <p className="text-xs text-muted-foreground">
            {assignment.assignment_method === 'round_robin' ? 'Rodízio' : 'Manual'}
            {assignment.round_robin_position !== undefined && 
              ` • Posição ${assignment.round_robin_position}/${assignment.total_eligible_members}`
            }
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">
          {formatDate(assignment.created_at)}
        </p>
        <Badge 
          variant={assignment.status === 'success' ? 'default' : 'secondary'}
          className="text-xs"
        >
          {assignment.status}
        </Badge>
      </div>
    </div>
  );
}

// ================================================================================
// COMPONENTE PRINCIPAL
// ================================================================================
export function DistributionMetrics({ pipelineId, showDetailed = false }: DistributionMetricsProps) {
  const { 
    data: stats, 
    isLoading, 
    error,
    refetch 
  } = useDistributionStats(pipelineId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <h3 className="text-lg font-semibold">Carregando métricas...</h3>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Erro ao carregar métricas de distribuição
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calcular métricas derivadas
  const averageAssignmentsPerDay = stats.total_assignments > 0 ? 
    Math.round(stats.total_assignments / 7) : 0; // Assumindo últimos 7 dias

  const recentFailures = stats.recent_assignments.filter(a => a.status === 'failed').length;
  const lastAssignmentDate = stats.last_assignment_at ? 
    new Date(stats.last_assignment_at) : null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart className="h-5 w-5 text-purple-500" />
          Métricas de Distribuição
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Estatísticas de desempenho da distribuição de leads
        </p>
      </div>

      {/* Métricas principais */}
      <BlurFade delay={0.1} inView>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total de Atribuições"
            value={stats.total_assignments}
            description="Leads distribuídos automaticamente"
            icon={Activity}
            color="blue"
          />
          
          <MetricCard
            title="Taxa de Sucesso"
            value={`${stats.assignment_success_rate}%`}
            description="Distribuições bem-sucedidas"
            icon={Target}
            color="green"
          />
          
          <MetricCard
            title="Média Diária"
            value={averageAssignmentsPerDay}
            description="Distribuições por dia (últimos 7 dias)"
            icon={Calendar}
            color="purple"
          />
          
          <MetricCard
            title="Falhas Recentes"
            value={recentFailures}
            description="Distribuições que falharam"
            icon={XCircle}
            color={recentFailures > 0 ? "red" : "green"}
          />
        </div>
      </BlurFade>

      {/* Informações da regra atual */}
      {stats.rule && (
        <BlurFade delay={0.2} inView>
          <AnimatedCard>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Configuração Atual
              </CardTitle>
              <CardDescription>
                Status da regra de distribuição ativa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={stats.rule.mode === 'rodizio' ? 'default' : 'secondary'}>
                    {stats.rule.mode === 'rodizio' ? 'Rodízio Automático' : 'Manual'}
                  </Badge>
                  <Badge variant={stats.rule.is_active ? 'default' : 'destructive'}>
                    {stats.rule.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                {lastAssignmentDate && (
                  <p className="text-xs text-muted-foreground">
                    Última atribuição: {lastAssignmentDate.toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
              
              {stats.rule.mode === 'rodizio' && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center">
                    <p className="text-sm font-medium">Horário Comercial</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.rule.working_hours_only ? 'Apenas horário comercial' : 'Qualquer horário'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Membros Inativos</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.rule.skip_inactive_members ? 'Pular inativos' : 'Incluir todos'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </AnimatedCard>
        </BlurFade>
      )}

      {/* Histórico de atribuições recentes */}
      {showDetailed && stats.recent_assignments.length > 0 && (
        <BlurFade delay={0.3} inView>
          <AnimatedCard>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Atribuições Recentes
              </CardTitle>
              <CardDescription>
                Últimas {stats.recent_assignments.length} distribuições de leads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.recent_assignments.slice(0, 10).map((assignment) => (
                <AssignmentItem 
                  key={assignment.id} 
                  assignment={assignment} 
                />
              ))}
              
              {stats.recent_assignments.length > 10 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Mostrando as 10 mais recentes de {stats.recent_assignments.length} atribuições
                </p>
              )}
            </CardContent>
          </AnimatedCard>
        </BlurFade>
      )}

      {/* Ações rápidas */}
      <BlurFade delay={0.4} inView>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Última atualização: {new Date().toLocaleTimeString('pt-BR')}
              </p>
              <button
                onClick={() => refetch()}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Atualizar métricas
              </button>
            </div>
          </CardContent>
        </Card>
      </BlurFade>
    </div>
  );
}

export default DistributionMetrics;
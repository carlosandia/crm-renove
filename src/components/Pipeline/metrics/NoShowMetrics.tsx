import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  Users, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react';
import { useMeetingMetrics } from '../../../hooks/useMeetings';

// ✅ FASE 4: Interfaces para métricas de no-show e conversão
interface Lead {
  id: string;
  stage_name: string;
  custom_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
}

interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  color: string;
  is_system_stage?: boolean;
}

interface NoShowMetricsProps {
  leads: Lead[];
  stages: PipelineStage[];
  className?: string;
}

interface MetricData {
  totalMeetings: number;
  scheduledMeetings: number;
  completedMeetings: number;
  noShowMeetings: number;
  noShowRate: number;
  showRate: number;
  conversionRates: Record<string, number>;
  stageMetrics: Record<string, { count: number; percentage: number }>;
}

// ✅ FASE 4: Componente principal de métricas
export const NoShowMetrics: React.FC<NoShowMetricsProps> = ({ 
  leads, 
  stages, 
  className 
}) => {
  
  // ✅ AIDEV-NOTE: Buscar métricas reais da API de reuniões
  const { data: meetingMetricsData, isLoading, error } = useMeetingMetrics();
  
  // ✅ Calcular métricas de no-show (dados reais da API + fallback para leads legacy)
  const metrics = useMemo((): MetricData => {
    // Usar dados reais da API se disponíveis
    if (meetingMetricsData?.aggregated) {
      const apiMetrics = meetingMetricsData.aggregated;
      return {
        totalMeetings: apiMetrics.total_meetings || 0,
        scheduledMeetings: apiMetrics.scheduled_count || 0,
        completedMeetings: apiMetrics.attended_count || 0,
        noShowMeetings: apiMetrics.no_show_count || 0,
        noShowRate: apiMetrics.no_show_rate || 0,
        showRate: apiMetrics.attend_rate || 0,
        conversionRates: {},
        stageMetrics: {}
      };
    }

    // Fallback: calcular com base nos leads (sistema legacy)
    const leadsWithMeetings = leads.filter(lead => 
      lead.custom_data?.status_reuniao && 
      ['Agendada', 'Realizada', 'No-Show', 'Reagendada'].includes(lead.custom_data.status_reuniao)
    );

    const scheduledMeetings = leadsWithMeetings.filter(lead => 
      lead.custom_data?.status_reuniao === 'Agendada'
    ).length;

    const completedMeetings = leadsWithMeetings.filter(lead => 
      lead.custom_data?.status_reuniao === 'Realizada'
    ).length;

    const noShowMeetings = leadsWithMeetings.filter(lead => 
      lead.custom_data?.status_reuniao === 'No-Show'
    ).length;

    const totalMeetings = scheduledMeetings + completedMeetings + noShowMeetings;
    const noShowRate = totalMeetings > 0 ? (noShowMeetings / totalMeetings) * 100 : 0;
    const showRate = totalMeetings > 0 ? (completedMeetings / totalMeetings) * 100 : 0;

    // ✅ Calcular conversão entre etapas
    const conversionRates: Record<string, number> = {};
    const stageMetrics: Record<string, { count: number; percentage: number }> = {};
    
    stages.forEach((stage, index) => {
      const stageLeads = leads.filter(lead => lead.stage_name === stage.name);
      const stageCount = stageLeads.length;
      
      stageMetrics[stage.name] = {
        count: stageCount,
        percentage: leads.length > 0 ? (stageCount / leads.length) * 100 : 0
      };

      // Calcular conversão para próxima etapa
      if (index < stages.length - 1) {
        const nextStage = stages[index + 1];
        const nextStageLeads = leads.filter(lead => lead.stage_name === nextStage.name);
        conversionRates[`${stage.name} → ${nextStage.name}`] = 
          stageCount > 0 ? (nextStageLeads.length / stageCount) * 100 : 0;
      }
    });

    return {
      totalMeetings,
      scheduledMeetings,
      completedMeetings,
      noShowMeetings,
      noShowRate,
      showRate,
      conversionRates,
      stageMetrics
    };
  }, [meetingMetricsData, leads, stages]);

  // ✅ Função para determinar cor do alerta baseado no no-show rate
  const getNoShowAlertLevel = (rate: number) => {
    if (rate >= 30) return { color: 'destructive', icon: AlertTriangle, label: 'Crítico' };
    if (rate >= 20) return { color: 'warning', icon: TrendingUp, label: 'Atenção' };
    return { color: 'success', icon: CheckCircle, label: 'Bom' };
  };

  const alertLevel = getNoShowAlertLevel(metrics.noShowRate);

  // ✅ Loading state
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium animate-pulse bg-gray-200 h-4 w-20 rounded"></CardTitle>
              </CardHeader>
              <CardContent>
                <div className="animate-pulse bg-gray-300 h-8 w-16 rounded mb-2"></div>
                <div className="animate-pulse bg-gray-200 h-3 w-32 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ✅ Métricas principais de no-show */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Reuniões</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalMeetings}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.scheduledMeetings} agendadas + {metrics.completedMeetings} realizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No-Show Rate</CardTitle>
            <alertLevel.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.noShowRate.toFixed(1)}%
            </div>
            <div className="flex items-center space-x-1">
              <Badge variant={alertLevel.color as any} className="text-xs">
                {alertLevel.label}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {metrics.noShowMeetings} de {metrics.totalMeetings}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Show Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.showRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.completedMeetings} reuniões realizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Benchmark</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15-25%</div>
            <p className="text-xs text-muted-foreground">
              No-show rate ideal do mercado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Métricas de conversão entre etapas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Conversão Entre Etapas
          </CardTitle>
          <CardDescription>
            Taxa de conversão e distribuição de leads por etapa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Distribuição por etapa */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Distribuição por Etapa</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(metrics.stageMetrics).map(([stageName, data]) => (
                  <div key={stageName} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{stageName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{data.count}</span>
                      <Badge variant="outline" className="text-xs">
                        {data.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Taxas de conversão */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Taxas de Conversão</h4>
              <div className="space-y-1">
                {Object.entries(metrics.conversionRates).map(([transition, rate]) => (
                  <div key={transition} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{transition}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{rate.toFixed(1)}%</span>
                      {rate >= 50 ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : rate >= 25 ? (
                        <Clock className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ Alertas e recomendações */}
      {metrics.noShowRate >= 25 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Alerta: No-Show Rate Alto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-700 mb-3">
              Seu no-show rate de {metrics.noShowRate.toFixed(1)}% está acima do ideal (15-25%). 
              Considere as seguintes ações:
            </p>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Implementar lembretes automáticos 24h e 2h antes da reunião</li>
              <li>• Melhorar qualificação antes de agendar (score BANT &gt;= 70)</li>
              <li>• Facilitar reagendamento com link direto</li>
              <li>• Confirmar interesse real do lead antes do agendamento</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NoShowMetrics;
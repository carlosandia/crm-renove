import React from 'react';
import { TrendingUp, Users, DollarSign, Target, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

interface ConsolidatedMetrics {
  total_companies: number;
  total_leads: number;
  total_mqls: number;
  total_sales: number;
  avg_conversion_rate: number;
  global_avg_ticket: number;
  total_revenue: number;
}

interface ReportsMetricsProps {
  metrics: ConsolidatedMetrics | null;
  loading: boolean;
}

const ReportsMetrics: React.FC<ReportsMetricsProps> = ({ metrics, loading }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const metricCards = [
    {
      title: 'Total de Empresas',
      value: formatNumber(metrics.total_companies),
      icon: BarChart3,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      description: 'Empresas cadastradas'
    },
    {
      title: 'Leads Gerados',
      value: formatNumber(metrics.total_leads),
      icon: Users,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      description: `${formatNumber(metrics.total_mqls)} MQLs`
    },
    {
      title: 'Vendas Fechadas',
      value: formatNumber(metrics.total_sales),
      icon: Target,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      description: `${formatPercentage(metrics.avg_conversion_rate)} taxa média`
    },
    {
      title: 'Receita Total',
      value: formatCurrency(metrics.total_revenue),
      icon: DollarSign,
      bgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      description: `${formatCurrency(metrics.global_avg_ticket)} ticket médio`
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 ${metric.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${metric.iconColor}`} />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                  <div className="text-sm font-medium text-gray-700">{metric.title}</div>
                  <div className="text-xs text-gray-500">{metric.description}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ReportsMetrics; 
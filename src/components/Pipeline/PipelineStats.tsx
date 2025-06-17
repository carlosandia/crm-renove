
import React from 'react';
import { Users, DollarSign, CheckCircle, TrendingUp, Target, Clock } from 'lucide-react';

interface PipelineStatsProps {
  totalLeads: number;
  totalRevenue: number;
  closedDeals: number;
  conversionRate?: number;
  averageDealSize?: number;
  averageCycleTime?: number;
}

const PipelineStats: React.FC<PipelineStatsProps> = ({
  totalLeads,
  totalRevenue,
  closedDeals,
  conversionRate = 0,
  averageDealSize = 0,
  averageCycleTime = 0
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const stats = [
    {
      icon: Users,
      label: 'Total de Leads',
      value: totalLeads.toString(),
      color: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      icon: DollarSign,
      label: 'Receita Total',
      value: formatCurrency(totalRevenue),
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    {
      icon: CheckCircle,
      label: 'Negócios Fechados',
      value: closedDeals.toString(),
      color: 'text-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      icon: TrendingUp,
      label: 'Taxa de Conversão',
      value: formatPercentage(conversionRate),
      color: 'text-orange-500',
      bgColor: 'bg-orange-50'
    },
    {
      icon: Target,
      label: 'Ticket Médio',
      value: formatCurrency(averageDealSize),
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50'
    },
    {
      icon: Clock,
      label: 'Ciclo Médio',
      value: `${averageCycleTime}d`,
      color: 'text-red-500',
      bgColor: 'bg-red-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PipelineStats;

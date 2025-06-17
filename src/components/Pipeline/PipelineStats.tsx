import React from 'react';
import { Users, DollarSign, TrendingUp, Clock, Target, Award } from 'lucide-react';

interface PipelineStatsProps {
  totalLeads: number;
  totalRevenue: number;
  closedDeals: number;
  conversionRate: number;
  averageDealSize: number;
  averageCycleTime: string;
  loading?: boolean;
}

const PipelineStats: React.FC<PipelineStatsProps> = ({
  totalLeads,
  totalRevenue,
  closedDeals,
  conversionRate,
  averageDealSize,
  averageCycleTime,
  loading = false
}) => {
  const stats = [
    {
      icon: Users,
      label: 'Total de Leads',
      value: loading ? '...' : totalLeads.toString(),
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: DollarSign,
      label: 'Receita Total',
      value: loading ? '...' : totalRevenue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }),
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: Award,
      label: 'Negócios Fechados',
      value: loading ? '...' : closedDeals.toString(),
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: TrendingUp,
      label: 'Taxa de Conversão',
      value: loading ? '...' : `${conversionRate.toFixed(1)}%`,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      icon: Target,
      label: 'Ticket Médio',
      value: loading ? '...' : averageDealSize.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }),
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      icon: Clock,
      label: 'Ciclo Médio',
      value: loading ? '...' : averageCycleTime,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  return (
    <div className="flex flex-wrap gap-4 justify-between">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div
            key={index}
            className={`${stat.bgColor} rounded-lg p-3 flex items-center space-x-3 min-w-0 flex-1 transition-all duration-150 hover:shadow-sm`}
          >
            <div className={`${stat.iconColor} ${stat.bgColor} p-2 rounded-lg`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold text-gray-900 truncate">
                {stat.value}
              </div>
              <div className="text-xs font-medium text-gray-600 truncate">
                {stat.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PipelineStats;

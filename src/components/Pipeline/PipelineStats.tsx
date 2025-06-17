
import React from 'react';
import { Users, DollarSign, TrendingUp, Clock, Target, Award } from 'lucide-react';

interface PipelineStatsProps {
  totalLeads: number;
  totalRevenue: number;
  closedDeals: number;
  conversionRate: number;
  averageDealSize: number;
  averageCycleTime: number;
}

const PipelineStats: React.FC<PipelineStatsProps> = ({
  totalLeads,
  totalRevenue,
  closedDeals,
  conversionRate,
  averageDealSize,
  averageCycleTime
}) => {
  const stats = [
    {
      icon: Users,
      label: 'Total de Leads',
      value: totalLeads.toString(),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      icon: DollarSign,
      label: 'Receita Total',
      value: totalRevenue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      icon: Award,
      label: 'Negócios Fechados',
      value: closedDeals.toString(),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      icon: TrendingUp,
      label: 'Taxa de Conversão',
      value: `${conversionRate.toFixed(1)}%`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      icon: Target,
      label: 'Ticket Médio',
      value: averageDealSize.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      icon: Clock,
      label: 'Ciclo Médio (dias)',
      value: averageCycleTime.toString(),
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div
            key={index}
            className={`${stat.bgColor} ${stat.borderColor} border rounded-xl p-4 text-center transition-all duration-200 hover:shadow-md hover:scale-105`}
          >
            <div className={`${stat.color} flex justify-center mb-2`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div className="text-lg font-bold text-gray-900 mb-1">
              {stat.value}
            </div>
            <div className="text-xs font-medium text-gray-600">
              {stat.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PipelineStats;

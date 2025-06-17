
import React from 'react';
import { Users, DollarSign, Trophy, TrendingUp, Clock, Target } from 'lucide-react';

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
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const stats = [
    {
      id: 'leads',
      title: 'Total de Leads',
      value: totalLeads.toString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconBgColor: 'bg-blue-100'
    },
    {
      id: 'revenue',
      title: 'Receita Total',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      iconBgColor: 'bg-green-100'
    },
    {
      id: 'deals',
      title: 'Negócios Fechados',
      value: closedDeals.toString(),
      icon: Trophy,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      iconBgColor: 'bg-purple-100'
    },
    {
      id: 'conversion',
      title: 'Taxa de Conversão',
      value: `${conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      iconBgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="w-full">
      {/* Container com alinhamento específico - primeira métrica alinhada à esquerda, última à direita */}
      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          
          return (
            <div
              key={stat.id}
              className={`rounded-xl border border-gray-200 p-6 transition-all duration-200 hover:shadow-md hover:border-gray-300 ${stat.bgColor} ${
                index === 0 ? 'justify-self-start' : index === stats.length - 1 ? 'justify-self-end' : ''
              }`}
              style={{ backgroundColor: 'transparent', border: '1px solid #e5e7eb' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg ${stat.iconBgColor} flex items-center justify-center ml-4`}>
                  <IconComponent className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineStats;

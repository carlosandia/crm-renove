import React from 'react';
import { DollarSign, TrendingUp, Target, BarChart3 } from 'lucide-react';
import { BlurFade } from '../ui/blur-fade';

interface DealStats {
  totalValue: number;
  totalDeals: number;
  wonDeals: number;
  conversionRate: number;
  averageDealSize: number;
  monthlyGrowth: number;
}

interface DealStatsCardsProps {
  stats?: DealStats;
  loading?: boolean;
}

export const DealStatsCards: React.FC<DealStatsCardsProps> = ({
  stats,
  loading = false
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const cards = [
    {
      title: 'Valor Total',
      value: stats ? formatCurrency(stats.totalValue) : 'R$ 0',
      subtitle: `${stats?.totalDeals || 0} deals ativos`,
      icon: DollarSign,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      delay: 0.1
    },
    {
      title: 'Deals Fechados',
      value: stats?.wonDeals?.toString() || '0',
      subtitle: `${formatPercentage(stats?.conversionRate || 0)} taxa de conversão`,
      icon: Target,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      delay: 0.15
    },
    {
      title: 'Ticket Médio',
      value: stats ? formatCurrency(stats.averageDealSize) : 'R$ 0',
      subtitle: `${formatPercentage(stats?.monthlyGrowth || 0)} vs mês anterior`,
      icon: BarChart3,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      delay: 0.2
    },
    {
      title: 'Crescimento',
      value: formatPercentage(stats?.monthlyGrowth || 0),
      subtitle: 'Comparado ao mês anterior',
      icon: TrendingUp,
      iconBg: stats?.monthlyGrowth && stats.monthlyGrowth >= 0 ? 'bg-emerald-100' : 'bg-red-100',
      iconColor: stats?.monthlyGrowth && stats.monthlyGrowth >= 0 ? 'text-emerald-600' : 'text-red-600',
      delay: 0.25
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-20"></div>
                <div className="h-6 bg-slate-200 rounded w-16"></div>
                <div className="h-3 bg-slate-200 rounded w-24"></div>
              </div>
              <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <BlurFade key={card.title} delay={card.delay} inView>
            <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-500">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {card.value}
                  </p>
                  <p className="text-xs text-slate-500">
                    {card.subtitle}
                  </p>
                </div>
                <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          </BlurFade>
        );
      })}
    </div>
  );
}; 
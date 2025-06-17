
import React from 'react';
import { TrendingUp, TrendingDown, Target, Users, DollarSign, Activity } from 'lucide-react';

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  trend: string;
  trendType: 'positive' | 'negative' | 'neutral';
  description: string;
}

const ModernStatsCards: React.FC = () => {
  const stats: StatCard[] = [
    {
      title: 'Total de Leads',
      value: 156,
      icon: Users,
      trend: '+12%',
      trendType: 'positive',
      description: 'vs. último mês'
    },
    {
      title: 'Vendas Fechadas',
      value: 23,
      icon: Target,
      trend: '+8%',
      trendType: 'positive',
      description: 'este mês'
    },
    {
      title: 'Taxa de Conversão',
      value: '14.7%',
      icon: Activity,
      trend: '+2.3%',
      trendType: 'positive',
      description: 'média mensal'
    },
    {
      title: 'Faturamento',
      value: 'R$ 125k',
      icon: DollarSign,
      trend: '+22%',
      trendType: 'positive',
      description: 'crescimento'
    }
  ];

  const getTrendIcon = (type: 'positive' | 'negative' | 'neutral') => {
    if (type === 'positive') return TrendingUp;
    if (type === 'negative') return TrendingDown;
    return Activity;
  };

  const getTrendColor = (type: 'positive' | 'negative' | 'neutral') => {
    if (type === 'positive') return 'text-green-600';
    if (type === 'negative') return 'text-red-600';
    return 'text-blue-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        const TrendIcon = getTrendIcon(stat.trendType);
        const trendColor = getTrendColor(stat.trendType);
        
        return (
          <div key={index} className="stat-card-modern group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors duration-200">
                <IconComponent className="w-6 h-6 text-primary" />
              </div>
              <div className={`flex items-center gap-1 ${trendColor}`}>
                <TrendIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{stat.trend}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-foreground">
                {stat.value}
              </h3>
              <p className="text-sm font-medium text-foreground">
                {stat.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4 w-full bg-muted rounded-full h-1.5">
              <div 
                className="bg-gradient-to-r from-primary to-primary/80 h-1.5 rounded-full transition-all duration-700 group-hover:from-primary/80 group-hover:to-primary"
                style={{ width: `${Math.random() * 30 + 60}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ModernStatsCards;

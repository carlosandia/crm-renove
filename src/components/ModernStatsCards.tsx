import React from 'react';
import { TrendingUp, TrendingDown, Target, Users, DollarSign, Activity, LucideIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { BlurFade } from './ui/blur-fade';
import { cn } from '../lib/utils';

interface StatCardData {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  icon?: LucideIcon;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  description?: string;
}

interface ModernStatsCardsProps {
  stats?: StatCardData[];
}

const ModernStatsCards: React.FC<ModernStatsCardsProps> = ({ stats }) => {
  // Default stats if none provided
  const defaultStats: StatCardData[] = [
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

  const statsToRender = stats || defaultStats;

  const getTrendIcon = (type: 'positive' | 'negative' | 'neutral' = 'neutral') => {
    if (type === 'positive') return TrendingUp;
    if (type === 'negative') return TrendingDown;
    return Activity;
  };

  const getTrendColor = (type: 'positive' | 'negative' | 'neutral' = 'neutral') => {
    if (type === 'positive') return 'text-green-600 bg-green-50 border-green-200';
    if (type === 'negative') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const getIconBackground = (index: number, color?: string) => {
    if (color) {
      const colorMap = {
        'blue': 'bg-blue-100 text-blue-600',
        'green': 'bg-green-100 text-green-600',
        'purple': 'bg-purple-100 text-purple-600',
        'orange': 'bg-orange-100 text-orange-600',
        'red': 'bg-red-100 text-red-600',
        'yellow': 'bg-yellow-100 text-yellow-600',
      };
      return colorMap[color as keyof typeof colorMap] || 'bg-gray-100 text-gray-600';
    }
    
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-green-100 text-green-600', 
      'bg-purple-100 text-purple-600',
      'bg-orange-100 text-orange-600'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      {statsToRender.map((stat, index) => {
        const IconComponent = stat.icon || Target;
        const TrendIcon = getTrendIcon(stat.trendType);
        const trendColor = getTrendColor(stat.trendType);
        const iconBg = getIconBackground(index, stat.color);
        
        return (
          <BlurFade key={index} delay={index * 0.1} inView>
            <Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 hover:border-primary/30 relative overflow-hidden">
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn(
                    "p-3 rounded-xl transition-all duration-300 group-hover:scale-110",
                    iconBg
                  )}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  {stat.trend && (
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium border transition-all duration-300",
                      trendColor
                    )}>
                      <TrendIcon className="w-4 h-4" />
                      <span>{stat.trend}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold text-foreground transition-colors duration-300 group-hover:text-primary">
                    {stat.value}
                  </h3>
                  <p className="text-sm font-medium text-foreground">
                    {stat.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stat.subtitle || stat.description}
                  </p>
                </div>
                
                {/* Animated progress bar */}
                <div className="mt-4 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-1000 ease-out",
                      "bg-gradient-to-r group-hover:shadow-sm",
                      index === 0 && "from-blue-400 to-blue-600",
                      index === 1 && "from-green-400 to-green-600", 
                      index === 2 && "from-purple-400 to-purple-600",
                      index === 3 && "from-orange-400 to-orange-600"
                    )}
                    style={{ 
                      width: `${Math.random() * 30 + 60}%`,
                      animationDelay: `${index * 200}ms`
                    }}
                  />
                </div>

                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </CardContent>
            </Card>
          </BlurFade>
        );
      })}
    </div>
  );
};

export default ModernStatsCards;

import React from 'react';
import { Users, DollarSign, TrendingUp, Clock, Target, Award } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { BlurFade } from '../ui/blur-fade';
import { cn } from '../../lib/utils';

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
      bgColor: 'bg-blue-100',
      gradientFrom: 'from-blue-400',
      gradientTo: 'to-blue-600'
    },
    {
      icon: DollarSign,
      label: 'Receita Total',
      value: loading ? '...' : totalRevenue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }),
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100',
      gradientFrom: 'from-green-400',
      gradientTo: 'to-green-600'
    },
    {
      icon: Award,
      label: 'Negócios Fechados',
      value: loading ? '...' : closedDeals.toString(),
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-100',
      gradientFrom: 'from-purple-400',
      gradientTo: 'to-purple-600'
    },
    {
      icon: TrendingUp,
      label: 'Taxa de Conversão',
      value: loading ? '...' : `${conversionRate.toFixed(1)}%`,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-100',
      gradientFrom: 'from-orange-400',
      gradientTo: 'to-orange-600'
    },
    {
      icon: Target,
      label: 'Ticket Médio',
      value: loading ? '...' : averageDealSize.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }),
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      gradientFrom: 'from-indigo-400',
      gradientTo: 'to-indigo-600'
    },
    {
      icon: Clock,
      label: 'Ciclo Médio',
      value: loading ? '...' : averageCycleTime,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-100',
      gradientFrom: 'from-red-400',
      gradientTo: 'to-red-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <BlurFade key={index} delay={index * 0.05} inView>
            <Card className="group cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-1 border-border/50 hover:border-primary/30 relative overflow-hidden">
              {/* Gradient background on hover */}
              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300",
                "bg-gradient-to-br", stat.gradientFrom, stat.gradientTo
              )} />
              
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "p-2 rounded-lg transition-all duration-300 group-hover:scale-110",
                    stat.bgColor
                  )}>
                    <IconComponent className={cn("w-5 h-5", stat.iconColor)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cn(
                      "text-lg font-bold transition-colors duration-300 truncate",
                      loading ? "text-muted-foreground animate-pulse" : "text-foreground group-hover:text-primary"
                    )}>
                      {stat.value}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground truncate">
                      {stat.label}
                    </div>
                  </div>
                </div>

                {/* Loading skeleton */}
                {loading && (
                  <div className="mt-2 w-full bg-muted rounded-full h-1">
                    <div className="bg-primary/30 h-1 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                )}

                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </CardContent>
            </Card>
          </BlurFade>
        );
      })}
    </div>
  );
};

export default PipelineStats;

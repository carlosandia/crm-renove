import React from 'react';
import { Users, UserCheck, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { BlurFade } from '../ui/blur-fade';

interface ContactStatsCardsProps {
  stats: {
    totalContacts: number;
    activeContacts: number;
    newThisMonth: number;
    conversionRate: number;
  };
}

export function ContactStatsCards({ stats }: ContactStatsCardsProps) {
  const statsData = [
    {
      title: 'Total de Contatos',
      value: stats.totalContacts.toLocaleString('pt-BR'),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Todos os contatos'
    },
    {
      title: 'Contatos Ativos',
      value: stats.activeContacts.toLocaleString('pt-BR'),
      icon: UserCheck,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      description: 'Contatos engajados'
    },
    {
      title: 'Novos este Mês',
      value: stats.newThisMonth.toLocaleString('pt-BR'),
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'Adicionados recentemente'
    },
    {
      title: 'Taxa de Conversão',
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Leads para clientes'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <BlurFade key={stat.title} delay={index * 0.1}>
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mb-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-slate-400">
                    {stat.description}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      ))}
    </div>
  );
}

export default ContactStatsCards;

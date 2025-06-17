
import React from 'react';
import ModernStatsCards from './ModernStatsCards';
import { Clock, Phone, Mail, Handshake, CheckCircle, Target, TrendingUp, Users, Award } from 'lucide-react';

const ModernDashboard: React.FC = () => {
  const recentActivities = [
    {
      icon: Phone,
      title: 'Ligação realizada para João Silva',
      time: '2 horas atrás',
      type: 'call'
    },
    {
      icon: Mail,
      title: 'Email de proposta enviado para Maria Santos',
      time: '4 horas atrás',
      type: 'email'
    },
    {
      icon: Handshake,
      title: 'Reunião agendada com Carlos Pereira',
      time: '6 horas atrás',
      type: 'meeting'
    },
    {
      icon: CheckCircle,
      title: 'Venda fechada - R$ 15.500',
      time: '8 horas atrás',
      type: 'sale'
    }
  ];

  const pipelineStages = [
    { name: 'Novos Leads', count: 12, color: 'from-blue-500 to-blue-600' },
    { name: 'Em Contato', count: 8, color: 'from-yellow-500 to-yellow-600' },
    { name: 'Proposta Enviada', count: 5, color: 'from-orange-500 to-orange-600' },
    { name: 'Negociação', count: 3, color: 'from-purple-500 to-purple-600' },
    { name: 'Fechamento', count: 2, color: 'from-green-500 to-green-600' }
  ];

  const monthlyGoals = [
    {
      title: 'Vendas Realizadas',
      current: 17,
      target: 20,
      percentage: 85,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Faturamento',
      current: 'R$ 460k',
      target: 'R$ 500k',
      percentage: 92,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Novos Leads',
      current: 132,
      target: 120,
      percentage: 110,
      color: 'from-orange-500 to-orange-600'
    }
  ];

  const topSellers = [
    { name: 'Ana Silva', value: 'R$ 125k', position: 1, color: 'from-yellow-400 to-yellow-500' },
    { name: 'Carlos Santos', value: 'R$ 98k', position: 2, color: 'from-gray-400 to-gray-500' },
    { name: 'Maria Costa', value: 'R$ 87k', position: 3, color: 'from-orange-400 to-orange-500' }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard CRM</h1>
        <p className="text-muted-foreground">Visão geral completa do seu sistema de vendas</p>
      </div>
      
      {/* Stats Cards */}
      <ModernStatsCards />
      
      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="xl:col-span-1">
          <div className="card-modern p-6 h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Atividades Recentes</h3>
            </div>
            
            <div className="space-y-4">
              {recentActivities.map((activity, index) => {
                const IconComponent = activity.icon;
                return (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="p-2 bg-primary/10 rounded-full flex-shrink-0">
                      <IconComponent className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-5">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pipeline Overview */}
        <div className="xl:col-span-1">
          <div className="card-modern p-6 h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Visão do Pipeline</h3>
            </div>
            
            <div className="space-y-3">
              {pipelineStages.map((stage, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${stage.color}`} />
                    <span className="text-sm font-medium text-foreground">{stage.name}</span>
                  </div>
                  <span className="text-sm font-bold text-foreground bg-muted px-2 py-1 rounded-full">
                    {stage.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Goals */}
        <div className="xl:col-span-1">
          <div className="card-modern p-6 h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Metas do Mês</h3>
            </div>
            
            <div className="space-y-4">
              {monthlyGoals.map((goal, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-foreground">{goal.title}</p>
                      <p className="text-xs text-muted-foreground">{goal.percentage}% da meta atingida</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">{goal.current}</div>
                      <div className="text-xs text-muted-foreground">de {goal.target}</div>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`bg-gradient-to-r ${goal.color} h-2 rounded-full transition-all duration-700`}
                      style={{ width: `${Math.min(goal.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Sellers */}
      <div className="card-modern p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Award className="w-5 h-5 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Top Vendedores</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topSellers.map((seller, index) => (
            <div key={index} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
              <div className={`w-12 h-12 bg-gradient-to-br ${seller.color} rounded-full flex items-center justify-center text-white font-bold shadow-md`}>
                {seller.position}
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground">{seller.name}</div>
                <div className="text-sm text-muted-foreground">{seller.value}</div>
              </div>
              {seller.position === 1 && (
                <Award className="w-5 h-5 text-yellow-500" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;

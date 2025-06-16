
import React from 'react';

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  trend: string;
  trendType: 'positive' | 'negative' | 'neutral';
  bgGradient: string;
}

const ModernStatsCards: React.FC = () => {
  const stats: StatCard[] = [
    {
      title: 'Total de Leads',
      value: 156,
      icon: '🎯',
      trend: '+12%',
      trendType: 'positive',
      bgGradient: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Vendas Fechadas',
      value: 23,
      icon: '💰',
      trend: '+8%',
      trendType: 'positive',
      bgGradient: 'from-green-500 to-green-600'
    },
    {
      title: 'Taxa de Conversão',
      value: '14.7%',
      icon: '📈',
      trend: '+2.3%',
      trendType: 'positive',
      bgGradient: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Faturamento',
      value: 'R$ 125k',
      icon: '💵',
      trend: '+22%',
      trendType: 'positive',
      bgGradient: 'from-orange-500 to-orange-600'
    }
  ];

  return (
    <div className="modern-stats-cards">
      {stats.map((stat, index) => (
        <div key={index} className="stat-card modern">
          <div className="stat-header">
            <div className={`stat-icon bg-gradient-to-br ${stat.bgGradient} text-white`}>
              {stat.icon}
            </div>
            <span className={`stat-trend ${stat.trendType}`}>
              {stat.trend}
            </span>
          </div>
          <div className="stat-body">
            <h3 className="stat-value">{stat.value}</h3>
            <p className="stat-title">{stat.title}</p>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`bg-gradient-to-r ${stat.bgGradient} h-2 rounded-full transition-all duration-700`}
              style={{ width: `${Math.random() * 40 + 60}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ModernStatsCards;

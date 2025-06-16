import React from 'react';

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  trend: string;
  trendType: 'positive' | 'negative' | 'neutral';
}

const ModernStatsCards: React.FC = () => {
  const stats: StatCard[] = [
    {
      title: 'Total de Leads',
      value: 156,
      icon: '👥',
      trend: '+12%',
      trendType: 'positive'
    },
    {
      title: 'Vendas Fechadas',
      value: 23,
      icon: '💰',
      trend: '+8%',
      trendType: 'positive'
    },
    {
      title: 'Taxa de Conversão',
      value: '14.7%',
      icon: '📈',
      trend: '+2.3%',
      trendType: 'positive'
    },
    {
      title: 'Faturamento',
      value: 'R$ 125k',
      icon: '💵',
      trend: '+22%',
      trendType: 'positive'
    }
  ];

  return (
    <div className="modern-stats-cards">
      {stats.map((stat, index) => (
        <div key={index} className="stat-card modern">
          <div className="stat-header">
            <span className="stat-icon">{stat.icon}</span>
            <span className={`stat-trend ${stat.trendType}`}>
              {stat.trend}
            </span>
          </div>
          <div className="stat-body">
            <h3 className="stat-value">{stat.value}</h3>
            <p className="stat-title">{stat.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ModernStatsCards; 
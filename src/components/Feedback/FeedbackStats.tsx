import React from 'react';
import { ThumbsUp, ThumbsDown, User, Building } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

interface FeedbackStatsProps {
  stats: {
    total: number;
    positive: number;
    negative: number;
    companies: number;
    vendors: number;
  };
}

const FeedbackStats: React.FC<FeedbackStatsProps> = ({ stats }) => {
  const satisfactionRate = stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0;

  const statCards = [
    {
      icon: ThumbsUp,
      value: stats.positive,
      label: 'Feedbacks Positivos',
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      icon: ThumbsDown,
      value: stats.negative,
      label: 'Feedbacks Negativos',
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600'
    },
    {
      icon: User,
      value: stats.vendors,
      label: 'Vendedores Ativos',
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      icon: Building,
      value: `${satisfactionRate}%`,
      label: 'Taxa de Satisfação',
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default FeedbackStats; 
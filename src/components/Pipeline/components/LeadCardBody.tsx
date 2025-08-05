import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Badge } from '../../ui/badge';

interface LeadCardBodyProps {
  leadCreatedAt: string;
  daysInCard: number;
  temperatureBadge: {
    icon: React.ReactNode;
    label: string;
    color: string;
    tooltip: string;
  };
}

export const LeadCardBody: React.FC<LeadCardBodyProps> = ({
  leadCreatedAt,
  daysInCard,
  temperatureBadge
}) => {
  // Função para formatação de data
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('pt-BR', { month: 'short' });
    return `${day}/${month}`;
  };

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">
            {formatDate(leadCreatedAt)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">
            {daysInCard}d
          </span>
        </div>
      </div>
      
      <Badge 
        variant="outline" 
        className={`text-xs ${temperatureBadge.color} flex-shrink-0 flex items-center gap-1`}
        title={temperatureBadge.tooltip}
      >
        {temperatureBadge.icon}
        <span className="text-xs font-medium">{temperatureBadge.label}</span>
      </Badge>
    </div>
  );
};

export default LeadCardBody;
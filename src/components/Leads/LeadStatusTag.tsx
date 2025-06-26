import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface LeadStatusTagProps {
  hasOpportunity: boolean;
  className?: string;
}

const LeadStatusTag: React.FC<LeadStatusTagProps> = ({ hasOpportunity, className = '' }) => {
  if (hasOpportunity) {
    return null; // Não mostra tag se já tem oportunidade
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200 ${className}`}>
      <AlertTriangle size={12} className="mr-1" />
      Nunca registrou oportunidade
    </span>
  );
};

export default LeadStatusTag; 
import React, { useRef } from 'react';
import { 
  Mail, 
  Phone, 
  CalendarPlus,
  Wifi,
  WifiOff,
  RotateCcw
} from 'lucide-react';
import { Lead } from '../../../types/Pipeline';
import { logLeadCard } from '../../../utils/optimizedLogger';

interface LeadCardFooterProps {
  lead: Lead;
  leadValue: number;
  leadEmail: string;
  leadPhone: string;
  connectionIndicator: {
    icon: React.ReactNode;
    tooltip: string;
    show: boolean;
  };
  connectionStatus: string;
  forceRefresh: () => void;
  onEmailClick: (e: React.MouseEvent) => void;
  onScheduleMeetingClick: (e: React.MouseEvent) => void;
}

export const LeadCardFooter: React.FC<LeadCardFooterProps> = ({
  lead,
  leadValue,
  leadEmail,
  leadPhone,
  connectionIndicator,
  connectionStatus,
  forceRefresh,
  onEmailClick,
  onScheduleMeetingClick  
}) => {
  // ✅ OPTIMIZED LOGGING: Logger centralizado com batch e deduplicação
  const loggedLeadsRef = useRef(new Set<string>());
  const lastLogTimeRef = useRef(0);
  
  if (process.env.NODE_ENV === 'development') {
    const leadId = lead.id?.substring(0, 8) || 'unknown';
    const currentTime = Date.now();
    const shouldLog = !loggedLeadsRef.current.has(leadId) || currentTime - lastLogTimeRef.current > 5000;
    
    if (shouldLog) {
      logLeadCard(`Footer renderizado - ${leadId}`, {
        leadId,
        leadValue,
        leadValue_type: typeof leadValue,
        display_logic: Number(leadValue) > 0 ? 'show_currency' : 'show_sem_valor'
      });
      loggedLeadsRef.current.add(leadId);
      lastLogTimeRef.current = currentTime;
    }
  }
  return (
    <div className="flex items-center justify-between">
      {/* Valor à esquerda */}
      <div className="flex-1">
        {/* ✅ CORREÇÃO: Mostrar valor ou "sem valor" de forma consistente */}
        {Number(leadValue) > 0 ? (
          <span className="text-xs font-medium text-gray-900">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(Number(leadValue))}
          </span>
        ) : (
          <span className="text-xs font-light text-gray-500">
            sem valor
          </span>
        )}
      </div>
      
      {/* Ícones de ação à direita */}
      <div className="flex items-center gap-2">
        {/* Indicador de Status Real-time */}
        {connectionIndicator.show && (
          <div 
            title={connectionIndicator.tooltip}
            onClick={(e) => {
              e.stopPropagation();
              if (connectionStatus === 'error' || connectionStatus === 'fallback') {
                forceRefresh();
              }
            }}
            className={`${connectionStatus === 'error' || connectionStatus === 'fallback' ? 'cursor-pointer' : ''}`}
          >
            {connectionIndicator.icon}
          </div>
        )}
        
        {/* Telefone */}
        {leadPhone && (
          <div 
            title={`Ligar para ${leadPhone}`}
            onClick={(e) => e.stopPropagation()}
            className="cursor-pointer"
          >
            <Phone className="h-3 w-3 text-gray-400 hover:text-blue-500 transition-colors" />
          </div>
        )}
        
        {/* E-mail */}
        {leadEmail && (
          <div 
            title={`Compor e-mail para ${leadEmail}`}
            onClick={onEmailClick}
            className="cursor-pointer"
          >
            <Mail className="h-3 w-3 text-gray-400 hover:text-green-500 transition-colors" />
          </div>
        )}
        
        {/* Agendar Reunião */}
        <div 
          title="Agendar reunião"
          onClick={onScheduleMeetingClick}
          className="cursor-pointer"
        >
          <CalendarPlus className="h-3 w-3 text-gray-400 hover:text-purple-500 transition-colors" />
        </div>
      </div>
    </div>
  );
};

export default LeadCardFooter;
import React from 'react';
import { Lead } from '../../types/Pipeline';
import { 
  Calendar, 
  Clock, 
  Mail, 
  Phone, 
  Building2, 
  User as UserIcon,
  Bell,
  Flame,
  Snowflake,
  Sun
} from 'lucide-react';
import { Badge } from '../ui/badge';

interface LeadCardOverlayProps {
  lead: Lead;
}

/**
 * ✅ COMPONENTE DEDICADO PARA DRAGOVERLAY
 * 
 * Este componente é usado EXCLUSIVAMENTE no DragOverlay do @dnd-kit.
 * - NÃO possui funcionalidade de drag (sem useDraggable)
 * - NÃO possui event handlers (onClick, etc.)
 * - NÃO possui activator nodes
 * - Renderização limpa e otimizada para cursor tracking preciso
 */
const LeadCardOverlay: React.FC<LeadCardOverlayProps> = ({ lead }) => {
  
  // Função para calcular dias totais do card (desde criação)
  const getDaysInCard = (lead: Lead): number => {
    const now = new Date();
    const createDate = new Date(lead.created_at);
    const diffTime = Math.abs(now.getTime() - createDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Função para formatação de data
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('pt-BR', { month: 'short' });
    return `${day}/${month}`;
  };

  // Função para cor da temperatura baseada nos dias
  const getTemperatureColor = (days: number): string => {
    if (days <= 1) return 'border-red-500 text-red-700 bg-red-50';
    if (days <= 3) return 'border-yellow-500 text-yellow-700 bg-yellow-50';
    return 'border-blue-500 text-blue-700 bg-blue-50';
  };

  // Função para label da temperatura
  const getTemperatureLabel = (days: number): string => {
    if (days <= 1) return 'Quente';
    if (days <= 3) return 'Morno';
    return 'Frio';
  };

  // Função para ícone da temperatura
  const getTemperatureIcon = (days: number) => {
    if (days <= 1) return <Flame className="h-3 w-3" />;
    if (days <= 3) return <Sun className="h-3 w-3" />;
    return <Snowflake className="h-3 w-3" />;
  };

  // Extrair dados do lead
  const opportunityName = lead.custom_data?.nome_oportunidade || lead.custom_data?.titulo || 
    (lead.first_name && lead.last_name ? `Proposta - ${lead.first_name} ${lead.last_name}`.trim() : 'Oportunidade sem nome');
  
  const leadName = lead.first_name && lead.last_name ? 
    `${lead.first_name} ${lead.last_name}`.trim() : 
    lead.custom_data?.nome_lead || 'Lead sem nome';
  
  const leadEmail = lead.email || lead.custom_data?.email || '';
  const leadPhone = lead.phone || lead.custom_data?.telefone || '';
  const leadCompany = lead.company || lead.custom_data?.empresa || '';
  const leadValue = lead.estimated_value || lead.custom_data?.valor || 0;
  const daysInCard = getDaysInCard(lead);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-xl">
      {/* Conteúdo Principal - SEM event handlers */}
      <div className="p-4 pb-2">
        {/* LINHA 1: Nome da Oportunidade + Sino de Notificação */}
        <div className="flex items-center justify-between mb-2">
          <h4 
            className="font-medium text-gray-900 truncate flex-1"
            title={opportunityName}
          >
            {opportunityName}
          </h4>
          
          {/* Sino de Notificação para Cadências */}
          <div title="Notificações de cadência">
            <Bell className="h-4 w-4 text-amber-500 flex-shrink-0" />
          </div>
        </div>

        {/* LINHA 2: Nome do Lead + Valor */}
        <div className="flex items-center justify-between" style={{ marginBottom: '0.1rem' }}>
          <div className="flex items-center gap-1 flex-1">
            <UserIcon className="h-3 w-3 text-gray-400" />
            <span className="text-sm text-gray-700 truncate">
              {leadName}
            </span>
          </div>
          {leadValue && (
            <span className="text-sm font-medium text-green-600 flex-shrink-0 ml-2">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(Number(leadValue))}
            </span>
          )}
        </div>

        {/* LINHA 3: Data + Tempo no Card + Temperatura */}
        <div className="flex items-center justify-between" style={{ marginBottom: '0.1rem' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">
                {formatDate(lead.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">
                {daysInCard}d
              </span>
            </div>
          </div>
          
          <Badge 
            variant="outline" 
            className={`text-xs ${getTemperatureColor(daysInCard)} flex-shrink-0 flex items-center gap-1`}
          >
            {getTemperatureIcon(daysInCard)}
            {getTemperatureLabel(daysInCard)}
          </Badge>
        </div>

        {/* LINHA 4: Ícones de Contato - SEM funcionalidade */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Ícones de Contato - Apenas visuais durante drag */}
            {leadPhone && (
              <div title={leadPhone}>
                <Phone className="h-3 w-3 text-gray-400" />
              </div>
            )}
            {leadEmail && (
              <div title={`E-mail: ${leadEmail}`}>
                <Mail className="h-3 w-3 text-gray-400" />
              </div>
            )}
            {leadCompany && (
              <div title={leadCompany}>
                <Building2 className="h-3 w-3 text-gray-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadCardOverlay;
import React, { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  Calendar, 
  Clock, 
  Mail, 
  Phone, 
  Building2, 
  DollarSign, 
  MoreVertical, 
  Edit, 
  Trash2, 
  UserX, 
  Eye,
  User as UserIcon,
  Bell,
  Flame,
  Snowflake,
  Sun,
  CalendarDays,
  Loader2
} from 'lucide-react';
import { Lead } from '../../types/Pipeline';
import { User } from '../../types/User';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import CalendarEventModal from '../Calendar/CalendarEventModal';
import { useLeadMaster } from '../../hooks/useLeadMaster';

interface DraggableLeadCardProps {
  lead: Lead;
  userRole: 'admin' | 'member' | 'super_admin';
  assignedMember?: User;
  
  // Permissões condicionais
  canEdit?: boolean;
  canTransfer?: boolean;
  canDelete?: boolean;
  canView?: boolean;
  canDrag?: boolean;
  
  // Callbacks
  onEdit?: (lead: Lead) => void;
  onTransfer?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
  onView?: (lead: Lead) => void;
  onViewDetails?: (lead: Lead) => void;
  onEmailClick?: (lead: Lead) => void;
  
  // Configurações visuais
  showVendorInfo?: boolean;
  showTemperature?: boolean;
  showActions?: boolean;
}

const DraggableLeadCard: React.FC<DraggableLeadCardProps> = ({
  lead,
  userRole,
  assignedMember,
  canEdit = true,
  canTransfer = false,
  canDelete = false,
  canView = true,
  canDrag = false,
  onEdit,
  onTransfer,
  onDelete,
  onView,
  onViewDetails,
  onEmailClick,
  showVendorInfo = true,
  showTemperature = true,
  showActions = true
}) => {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // ✅ SOLUÇÃO CORRETA: Buscar dados do lead_master dinamicamente
  const { leadMaster, loading: leadMasterLoading, error: leadMasterError } = useLeadMaster(lead.lead_master_id || null);

  // Hook do @dnd-kit para drag and drop com ID hierárquico
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `lead-${lead.id}`,
    disabled: !canDrag,
  });

  // ✅ CORREÇÃO: Style com opacity e pointer-events para ocultar durante drag
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
    pointerEvents: isDragging ? 'none' : 'auto',
  } as React.CSSProperties;

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
    if (days <= 1) return 'border-red-500 text-red-700 bg-red-50'; // Quente = Vermelho
    if (days <= 3) return 'border-yellow-500 text-yellow-700 bg-yellow-50'; // Morno = Amarelo
    return 'border-blue-500 text-blue-700 bg-blue-50'; // Frio = Azul
  };

  // Função para label da temperatura
  const getTemperatureLabel = (days: number): string => {
    if (days <= 1) return 'Quente';
    if (days <= 3) return 'Morno';
    return 'Frio';
  };

  // Função para ícone da temperatura
  const getTemperatureIcon = (days: number) => {
    if (days <= 1) return <Flame className="h-3 w-3" />; // Quente = Fogo
    if (days <= 3) return <Sun className="h-3 w-3" />; // Morno = Sol
    return <Snowflake className="h-3 w-3" />; // Frio = Gelo
  };

  // ✅ SOLUÇÃO CORRETA: Extrair dados sempre atualizados do lead_master
  const opportunityName = lead.custom_data?.nome_oportunidade || lead.custom_data?.titulo || 
    (leadMaster ? `Proposta - ${leadMaster.first_name} ${leadMaster.last_name}`.trim() : 'Oportunidade sem nome');
  
  const leadName = leadMaster ? 
    `${leadMaster.first_name} ${leadMaster.last_name}`.trim() : 
    lead.custom_data?.nome_lead || 'Lead sem nome';
  
  const leadEmail = leadMaster?.email || lead.custom_data?.email || '';
  const leadPhone = leadMaster?.phone || lead.custom_data?.telefone || '';
  const leadCompany = leadMaster?.company || lead.custom_data?.empresa || '';
  const leadValue = leadMaster?.estimated_value || lead.custom_data?.valor || 0;
  const daysInCard = getDaysInCard(lead);

  // ✅ Estado de loading para mostrar indicador
  const isLoadingData = leadMasterLoading && !leadMaster;

  // ✅ Handler para cliques nos botões (previne drag)
  const handleButtonClick = (e: React.MouseEvent, callback?: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    if (callback) callback();
  };

  // ✅ Mostrar indicador de loading se necessário
  if (isLoadingData) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-center"
      >
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Carregando...</span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(canDrag ? { ...attributes, ...listeners } : {})}
      className={`
        bg-white rounded-lg border border-gray-200 transition-all duration-200 group relative
        ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
        ${isDragging 
          ? 'scale-95'
          : 'hover:shadow-lg hover:-translate-y-1'
        }
      `}
    >
      {/* Conteúdo Principal */}
      <div className="p-4 pb-2">
        {/* LINHA 1: Nome da Oportunidade + Sino de Notificação */}
        <div className="flex items-center justify-between mb-2">
          <h4 
            className="font-medium text-gray-900 truncate flex-1 hover:text-blue-600 transition-colors cursor-pointer"
            onClick={(e) => handleButtonClick(e, () => {
              console.log('🖱️ CARD: Clique detectado na oportunidade:', opportunityName, lead.id);
              if (onViewDetails) {
                onViewDetails(lead);
              }
            })}
            title={opportunityName}
          >
            {opportunityName}
          </h4>
          
          {/* Sino de Notificação para Cadências */}
          <div title="Notificações de cadência">
            <Bell 
              className="h-4 w-4 text-amber-500 cursor-pointer hover:text-amber-600 transition-colors flex-shrink-0" 
              onClick={(e) => handleButtonClick(e, () => {
                console.log('🔔 Sino clicado para lead:', lead.id);
                // Aqui será implementada a lógica de notificações de cadência
              })}
            />
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
          
          {showTemperature && (
            <Badge 
              variant="outline" 
              className={`text-xs ${getTemperatureColor(daysInCard)} flex-shrink-0 flex items-center gap-1`}
            >
              {getTemperatureIcon(daysInCard)}
              {getTemperatureLabel(daysInCard)}
            </Badge>
          )}
        </div>

        {/* LINHA 4: Ícones de Contato + Olhinho sempre visíveis */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Ícones de Contato - Sempre Visíveis */}
            {leadPhone && (
              <div title={leadPhone}>
                <Phone className="h-3 w-3 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors" />
              </div>
            )}
            {leadEmail && (
              <div 
                title={`Enviar e-mail para ${leadEmail}`}
                onClick={(e) => handleButtonClick(e, () => {
                  console.log('📧 EMAIL: Abrindo modal de e-mail para lead:', lead.id);
                  if (onEmailClick) {
                    onEmailClick(lead);
                  }
                })}
              >
                <Mail className="h-3 w-3 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors" />
              </div>
            )}
            <div 
              title="Agendar reunião"
              onClick={(e) => handleButtonClick(e, () => {
                console.log('📅 CALENDAR: Abrindo modal para lead:', lead.id);
                setShowCalendarModal(true);
              })}
            >
              <CalendarDays className="h-3 w-3 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors" />
            </div>
            {leadCompany && (
              <div title={leadCompany}>
                <Building2 className="h-3 w-3 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors" />
              </div>
            )}
          </div>
          
          {/* Botão do Olhinho - Sempre Visível */}
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all border border-blue-200 hover:border-blue-300"
              onClick={(e) => handleButtonClick(e, () => onViewDetails(lead))}
              title="Ver detalhes completos do lead"
            >
              <Eye className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Vendedor Responsável (Opcional) */}
        {showVendorInfo && assignedMember && (
          <div className="flex items-center gap-2 mt-2 text-xs border-t border-gray-100 pt-2">
            <UserIcon className="h-3 w-3 text-gray-400" />
            <span className="text-gray-600">
              {assignedMember.first_name} {assignedMember.last_name}
            </span>
            <Badge variant="outline" className="text-xs px-1 py-0">
              {assignedMember.role === 'member' ? 'Vendedor' : 'Admin'}
            </Badge>
          </div>
        )}
      </div>

      {/* Modal de Evento do Calendário */}
      <CalendarEventModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        leadData={{
          id: lead.id,
          name: leadName,
          email: leadEmail,
          phone: leadPhone,
          company: leadCompany
        }}
      />
    </div>
  );
};

export default DraggableLeadCard;

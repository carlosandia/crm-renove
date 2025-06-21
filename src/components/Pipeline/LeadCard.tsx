import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Phone, Bell, Mail, MessageCircle, ThumbsUp, Thermometer, Clock, Calendar } from 'lucide-react';
import { useModalContext } from '../../contexts/ModalContext';
import { Lead, CustomField } from '../../types/Pipeline';
import { usePendingTasks } from '../../hooks/usePendingTasks';
import { useAuth } from '../../contexts/AuthContext';

interface LeadCardProps {
  lead: Lead;
  customFields: CustomField[];
  index: number; // Necessário para react-beautiful-dnd
  isDragging?: boolean;
  onEdit?: (lead: Lead) => void;
  onUpdate?: (leadId: string, updatedData: any) => void;
  onDelete?: (leadId: string) => void;
}

const LeadCard: React.FC<LeadCardProps> = memo(({
  lead,
  customFields,
  index,
  isDragging = false,
  onEdit,
  onUpdate,
  onDelete
}) => {
  const { openModal } = useModalContext();
  const { user } = useAuth();
  const { checkPendingTasksForLead } = usePendingTasks();
  
  // Estados para tarefas pendentes
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [tasksLoading, setTasksLoading] = useState(false);

  // 🚀 MEMOIZAÇÃO DE DADOS DO LEAD
  const leadData = useMemo(() => {
    return lead.custom_data || {};
  }, [lead.custom_data]);

  // 🚀 MEMOIZAÇÃO DE VALORES FORMATADOS
  const displayValues = useMemo(() => {
    const nomeOportunidade = leadData.nome_oportunidade || leadData.titulo_oportunidade || leadData.titulo || 'Oportunidade';
    const nomeLead = leadData.nome_lead || leadData.nome_contato || leadData.contato || leadData.nome || 'Lead sem nome';
    const temperatura = leadData.temperatura || leadData.lead_temperature || 'frio';
    
    const valor = leadData.valor || leadData.valor_oportunidade || leadData.valor_proposta || 0;
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(valor.toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0);

    // Data de criação (formato: 19 Jun)
    const dataCriacao = lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    }) : '';

    // Calcular tempo na etapa atual com precisão de minutos/horas/dias
    const dataMovimentacao = lead.updated_at || lead.created_at;
    const tempoNaEtapa = dataMovimentacao ? (() => {
      const agora = new Date();
      const dataMove = new Date(dataMovimentacao);
      const diffMs = agora.getTime() - dataMove.getTime();
      const diffMinutos = Math.floor(diffMs / (1000 * 60));
      const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMinutos < 60) return `${diffMinutos}min`;
      if (diffHoras < 24) return `${diffHoras}h`;
      if (diffDias === 1) return '1 dia';
      return `${diffDias} dias`;
    })() : '';

    return {
      nomeOportunidade,
      nomeLead,
      temperatura,
      valorFormatado,
      dataCriacao,
      tempoNaEtapa
    };
  }, [leadData, lead.created_at, lead.updated_at]);

  // 🚀 MEMOIZAÇÃO DE TAG DE TEMPERATURA
  const getTemperatureTag = useMemo(() => {
    switch (displayValues.temperatura) {
      case 'quente':
      case 'hot':
        return { label: 'Quente', color: 'bg-red-100 text-red-700', icon: '🔥' };
      case 'morno':
      case 'warm':
        return { label: 'Morno', color: 'bg-yellow-100 text-yellow-700', icon: '🌡️' };
      case 'frio':
      case 'cold':
      default:
        return { label: 'Frio', color: 'bg-blue-100 text-blue-700', icon: '❄️' };
    }
  }, [displayValues.temperatura]);

  // 🚀 MEMOIZAÇÃO DE HANDLERS
  const handleOpenModal = useCallback(() => {
    openModal(lead.id, lead, customFields, 'dados');
  }, [openModal, lead.id, lead, customFields]);

  const handlePhoneClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const telefone = leadData.telefone || leadData.telefone_contato || leadData.celular;
    if (telefone) {
      window.open(`tel:${telefone}`, '_self');
    }
  }, [leadData]);

  const handleEmailClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const email = leadData.email || leadData.email_contato;
    if (email) {
      window.open(`mailto:${email}`, '_blank');
    }
  }, [leadData]);

  const handleCommentsClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    openModal(lead.id, lead, customFields, 'comentarios');
  }, [openModal, lead.id, lead, customFields]);

  const handleFeedbackClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    openModal(lead.id, lead, customFields, 'feedback');
  }, [openModal, lead.id, lead, customFields]);

  const handleAgendaClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Aqui você pode implementar a funcionalidade de agenda
    console.log('Agenda clicada para lead:', lead.id);
  }, [lead.id]);

  // Verificar tarefas pendentes quando o componente montar
  useEffect(() => {
    const checkTasks = async () => {
      if (!user?.id || !lead.id) return;
      
      setTasksLoading(true);
      try {
        const count = await checkPendingTasksForLead(lead.id);
        setPendingTasksCount(count);
      } catch (error) {
        console.error('Erro ao verificar tarefas pendentes:', error);
      } finally {
        setTasksLoading(false);
      }
    };

    checkTasks();
  }, [lead.id, user?.id, checkPendingTasksForLead]);

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <>
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={handleOpenModal}
            className={`lead-card group cursor-pointer ${snapshot.isDragging ? 'dragging' : ''}`}
            style={{
              ...provided.draggableProps.style,
              opacity: snapshot.isDragging ? 0.7 : 1,
              transform: snapshot.isDragging 
                ? `${provided.draggableProps.style?.transform} rotate(3deg) scale(1.02)`
                : provided.draggableProps.style?.transform,
              padding: '10px', // Reduzir padding para deixar mais compacto
              marginBottom: '6px' // Reduzir margem entre cards
            }}
          >
            {/* Header: Nome da Oportunidade + Sino */}
            <div className="flex items-start justify-between mb-0.5">
              <h4 className="text-sm font-semibold text-gray-700 truncate flex-1">
                {displayValues.nomeOportunidade}
              </h4>
              
              {/* Sino de Notificação */}
              {pendingTasksCount > 0 && (
                <div className="relative ml-1 flex-shrink-0">
                  <Bell className="w-4 h-4 text-orange-500" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center font-bold text-[10px]">
                    {pendingTasksCount}
                  </span>
                </div>
              )}
            </div>

            {/* Nome do Lead + Valor */}
            <div className="flex items-center mb-0.5">
              <span className="text-sm text-gray-500">
                {displayValues.nomeLead}
              </span>
              <span className="text-xs text-gray-500 ml-1">
                {displayValues.valorFormatado}
              </span>
            </div>

            {/* Data + Tempo na Etapa + Temperatura */}
            <div className="flex items-center mb-1.5">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>{displayValues.dataCriacao}</span>
                <span>•</span>
                <span>{displayValues.tempoNaEtapa}</span>
              </div>
              
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${getTemperatureTag.color}`}>
                <span className="mr-1">{getTemperatureTag.icon}</span>
                {getTemperatureTag.label}
              </div>
            </div>

            {/* Ícones do Rodapé - Alinhados à Esquerda */}
            <div className="flex items-center space-x-2 pt-1 border-t border-gray-100">
              {/* Telefone */}
              <button
                onClick={handlePhoneClick}
                className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-full transition-colors"
                title="Ligar"
              >
                <Phone className="w-3.5 h-3.5" />
              </button>

              {/* Email */}
              <button
                onClick={handleEmailClick}
                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                title="Enviar email"
              >
                <Mail className="w-3.5 h-3.5" />
              </button>

              {/* Agenda */}
              <button
                onClick={handleAgendaClick}
                className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors"
                title="Agenda"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>

              {/* Comentários */}
              <button
                onClick={handleCommentsClick}
                className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-full transition-colors"
                title="Comentários"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </button>

              {/* Feedback */}
              <button
                onClick={handleFeedbackClick}
                className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors"
                title="Feedback"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </Draggable>
  );
});

LeadCard.displayName = 'LeadCard';

export default LeadCard;

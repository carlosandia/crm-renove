import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Phone, Bell, Mail, MessageCircle, ThumbsUp, Thermometer, Clock, Calendar } from 'lucide-react';
import { useModalContext } from '../../contexts/ModalContext';
import { Lead, CustomField } from '../../types/Pipeline';
import { usePendingTasks } from '../../hooks/usePendingTasks';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent } from '../ui/card';
import { BlurFade } from '../ui/blur-fade';
import { cn } from '../../lib/utils';

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
    
    // 🌡️ NOVO SISTEMA DE TEMPERATURA AUTOMÁTICO
    const temperatura = lead.temperature_level || leadData.temperatura || leadData.lead_temperature || 'hot';
    
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

    // 🆕 TEMPO NA ETAPA INICIAL (para temperatura automática)
    const tempoNaEtapaInicial = lead.initial_stage_entry_time ? (() => {
      const agora = new Date();
      const dataEntrada = new Date(lead.initial_stage_entry_time);
      const diffMs = agora.getTime() - dataEntrada.getTime();
      const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffHoras < 24) return `${diffHoras}h na inicial`;
      if (diffDias === 1) return '1 dia na inicial';
      return `${diffDias} dias na inicial`;
    })() : '';

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
      tempoNaEtapa,
      tempoNaEtapaInicial
    };
  }, [leadData, lead.created_at, lead.updated_at, lead.temperature_level, lead.initial_stage_entry_time]);

  // 🆕 MEMOIZAÇÃO DE DADOS DE ORIGEM
  const originData = useMemo(() => {
    const origem = leadData.origem || leadData.traffic_source || 'Website';
    const sourceType = leadData.source_type || 'unknown';
    const campaignName = leadData.campaign_name || '';
    
    // Escolher ícone baseado na origem
    const getOriginIcon = (origem: string) => {
      const source = origem.toLowerCase();
      if (source.includes('google')) return '🔍';
      if (source.includes('meta') || source.includes('facebook')) return '📘';
      if (source.includes('instagram')) return '📸';
      if (source.includes('youtube')) return '📺';
      if (source.includes('linkedin')) return '💼';
      if (source.includes('tiktok')) return '🎵';
      if (source.includes('email')) return '📧';
      if (source.includes('ebook') || source.includes('e-book')) return '📚';
      if (source.includes('webinar')) return '🎥';
      return '🌐';
    };

    return {
      origem,
      sourceType,
      campaignName,
      icon: getOriginIcon(origem),
      isCustom: sourceType === 'custom_defined',
      isUTM: sourceType === 'utm_automatic'
    };
  }, [leadData]);

  // 🚀 MEMOIZAÇÃO DE TAG DE TEMPERATURA AUTOMÁTICA
  const getTemperatureTag = useMemo(() => {
    switch (displayValues.temperatura) {
      case 'hot':
        return { 
          label: 'Quente', 
          color: 'bg-red-100 text-red-700 border-red-200', 
          icon: '🔥',
          tooltip: 'Lead recente na etapa inicial'
        };
      case 'warm':
        return { 
          label: 'Morno', 
          color: 'bg-orange-100 text-orange-700 border-orange-200', 
          icon: '🌡️',
          tooltip: 'Lead há algumas horas na etapa inicial'
        };
      case 'cold':
        return { 
          label: 'Frio', 
          color: 'bg-blue-100 text-blue-700 border-blue-200', 
          icon: '❄️',
          tooltip: 'Lead há alguns dias na etapa inicial'
        };
      case 'frozen':
        return { 
          label: 'Gelado', 
          color: 'bg-gray-100 text-gray-700 border-gray-200', 
          icon: '🧊',
          tooltip: 'Lead há muito tempo na etapa inicial'
        };
      // Fallback para temperaturas antigas
      case 'quente':
        return { label: 'Quente', color: 'bg-red-100 text-red-700 border-red-200', icon: '🔥', tooltip: 'Lead quente' };
      case 'morno':
        return { label: 'Morno', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🌡️', tooltip: 'Lead morno' };
      case 'frio':
      default:
        return { label: 'Frio', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '❄️', tooltip: 'Lead frio' };
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
    // Abrir modal de criação de evento no Google Calendar
    openModal(lead.id, lead, customFields, 'google-calendar');
  }, [openModal, lead.id, lead, customFields]);

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
        <BlurFade delay={index * 0.05} inView>
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={handleOpenModal}
            className={cn(
              "group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 mb-3",
              "bg-white border border-border/50 hover:border-primary/30",
              "relative overflow-hidden",
              snapshot.isDragging && "shadow-xl rotate-2 scale-105 z-50"
            )}
            style={{
              ...provided.draggableProps.style,
              opacity: snapshot.isDragging ? 0.9 : 1,
            }}
          >
            {/* Borda superior colorida baseada na temperatura */}
            <div className={cn(
              "absolute top-0 left-0 right-0 h-1",
              displayValues.temperatura === 'quente' || displayValues.temperatura === 'hot' 
                ? "bg-gradient-to-r from-red-400 to-red-600"
                : displayValues.temperatura === 'morno' || displayValues.temperatura === 'warm'
                ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                : "bg-gradient-to-r from-blue-400 to-blue-600"
            )} />

            <CardContent className="p-3 space-y-2">
              {/* Header: Nome da Oportunidade + Sino */}
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-foreground truncate flex-1 leading-tight">
                  {displayValues.nomeOportunidade}
                </h4>
                
                {/* Sino de Notificação */}
                {pendingTasksCount > 0 && (
                  <div className="relative ml-2 flex-shrink-0">
                    <Bell className="w-4 h-4 text-orange-500 animate-pulse" />
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-3 h-3 flex items-center justify-center font-bold text-[10px]">
                      {pendingTasksCount}
                    </span>
                  </div>
                )}
              </div>

              {/* Nome do Lead + Valor */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground truncate flex-1">
                  {displayValues.nomeLead}
                </span>
                <span className="text-xs font-medium text-primary ml-2">
                  {displayValues.valorFormatado}
                </span>
              </div>

              {/* Origem/Fonte de Captação */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <span className="text-xs">{originData.icon}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={originData.origem}>
                    {originData.origem}
                  </span>
                  {originData.isUTM && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md font-medium border border-green-200" title="Rastreamento automático por UTMs">
                      UTM
                    </span>
                  )}
                  {originData.isCustom && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md font-medium border border-purple-200" title="Origem personalizada">
                      Custom
                    </span>
                  )}
                </div>
                
                {/* Data de criação */}
                <span className="text-xs text-muted-foreground">
                  {displayValues.dataCriacao}
                </span>
              </div>

              {/* Campanha (se houver) */}
              {originData.campaignName && originData.campaignName !== originData.origem && (
                <div className="text-xs text-muted-foreground truncate bg-muted/30 px-2 py-1 rounded-md" title={originData.campaignName}>
                  📢 {originData.campaignName}
                </div>
              )}

              {/* Tempo na Etapa + Temperatura */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{displayValues.tempoNaEtapa}</span>
                </div>
                
                <div className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border",
                  getTemperatureTag.color
                )}>
                  <span className="mr-1">{getTemperatureTag.icon}</span>
                  {getTemperatureTag.label}
                </div>
              </div>

              {/* Ações do Rodapé */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center space-x-1">
                  {/* Telefone */}
                  <button
                    onClick={handlePhoneClick}
                    className="p-1.5 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded-md transition-all duration-200 hover:scale-110"
                    title="Ligar"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>

                  {/* Email */}
                  <button
                    onClick={handleEmailClick}
                    className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200 hover:scale-110"
                    title="Enviar email"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </button>

                  {/* Agenda */}
                  <button
                    onClick={handleAgendaClick}
                    className="p-1.5 text-muted-foreground hover:text-orange-600 hover:bg-orange-50 rounded-md transition-all duration-200 hover:scale-110"
                    title="Agenda"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                  </button>

                  {/* Comentários */}
                  <button
                    onClick={handleCommentsClick}
                    className="p-1.5 text-muted-foreground hover:text-purple-600 hover:bg-purple-50 rounded-md transition-all duration-200 hover:scale-110"
                    title="Comentários"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>

                  {/* Feedback */}
                  <button
                    onClick={handleFeedbackClick}
                    className="p-1.5 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all duration-200 hover:scale-110"
                    title="Feedback"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Indicador de temperatura visual */}
                <div className="flex items-center">
                  <Thermometer className={cn(
                    "w-3 h-3",
                    displayValues.temperatura === 'quente' || displayValues.temperatura === 'hot' 
                      ? "text-red-500"
                      : displayValues.temperatura === 'morno' || displayValues.temperatura === 'warm'
                      ? "text-yellow-500"
                      : "text-blue-500"
                  )} />
                </div>
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      )}
    </Draggable>
  );
});

LeadCard.displayName = 'LeadCard';

export default LeadCard;

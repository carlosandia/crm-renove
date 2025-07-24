import React, { useMemo } from 'react';
import { Lead } from '../../types/Pipeline';
import { 
  Calendar, 
  Clock, 
  Mail, 
  Phone, 
  Building2, 
  Eye,
  User as UserIcon,
  Bell,
  Flame,
  Snowflake,
  Sun,
  GripVertical,
  CheckCircle,
  XCircle,
  Thermometer
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useLeadOutcomeStatus } from '../../hooks/useLeadOutcomeStatus';
import { useTemperatureAPI } from '../../hooks/useTemperatureAPI';
import { generateTemperatureBadge } from '../../utils/temperatureUtils';

interface LeadCardPresentationProps {
  lead: Lead;
  pipelineId: string;
  onViewDetails?: (lead: Lead) => void;
  showDragHandle?: boolean;
  isDragging?: boolean;
  dragListeners?: any;
  dragAttributes?: any;
  setActivatorNodeRef?: (element: HTMLElement | null) => void; // ✅ CORREÇÃO: Adicionar activator ref
}

/**
 * Componente apresentacional puro para o card de lead
 * NÃO usa hooks do dnd-kit - apenas renderização
 * ✅ FASE 3: React.memo para otimização de performance
 */
const LeadCardPresentation: React.FC<LeadCardPresentationProps> = React.memo(({
  lead,
  pipelineId,
  onViewDetails,
  showDragHandle = true,
  isDragging = false,
  dragListeners,
  dragAttributes,
  setActivatorNodeRef // ✅ CORREÇÃO: Receber activator ref
}) => {
  
  // ✅ OUTCOME REASONS: Hook para verificar se lead tem motivos aplicados
  const { data: outcomeStatus, isLoading: isLoadingOutcome } = useLeadOutcomeStatus(lead.id);
  
  // 🌡️ Hook para configuração de temperatura personalizada
  const { config: temperatureConfig } = useTemperatureAPI({ 
    pipelineId: pipelineId || lead.pipeline_id || '', 
    autoLoad: true 
  });
  
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

  // 🚀 MEMOIZAÇÃO DE TAG DE TEMPERATURA COM CONFIGURAÇÃO PERSONALIZADA
  const temperatureBadge = useMemo(() => {
    // Determinar nível de temperatura baseado no lead
    const temperatureLevel = lead.temperature_level || 'hot'; // fallback para 'hot' se não definido
    
    const badge = generateTemperatureBadge(temperatureLevel, temperatureConfig ?? null);
    
    // Converter ícones emoji para componentes React
    let iconComponent;
    switch (badge.icon) {
      case '🔥':
        iconComponent = <Flame className="h-3 w-3" />;
        break;
      case '🌡️':
        iconComponent = <Thermometer className="h-3 w-3" />;
        break;
      case '☀️':
        iconComponent = <Sun className="h-3 w-3" />;
        break;
      case '❄️':
        iconComponent = <Snowflake className="h-3 w-3" />;
        break;
      default:
        iconComponent = <Thermometer className="h-3 w-3" />;
    }
    
    return {
      ...badge,
      icon: iconComponent
    };
  }, [lead.temperature_level, temperatureConfig]);

  // Dados do lead
  const opportunityName = lead.custom_data?.nome_oportunidade || lead.custom_data?.titulo || 
    (lead.first_name && lead.last_name ? `Proposta - ${lead.first_name} ${lead.last_name}`.trim() : 'Oportunidade sem nome');
  
  const leadName = lead.first_name ? 
    `${lead.first_name} ${lead.last_name || ''}`.trim() : 
    lead.custom_data?.nome_lead || 'Lead sem nome';
  
  const leadEmail = lead.email || lead.custom_data?.email || '';
  const leadPhone = lead.phone || lead.custom_data?.telefone || '';
  const leadCompany = lead.company || lead.custom_data?.empresa || '';
  // ✅ CORREÇÃO: Melhor tratamento de tipos para valor
  const rawValue = lead.custom_data?.valor || lead.estimated_value || 0;
  const leadValue = typeof rawValue === 'string' ? parseFloat(rawValue) || 0 : Number(rawValue) || 0;
  const daysInCard = getDaysInCard(lead);

  // ✨ OPTIMISTIC UPDATES: Identificar se é lead otimista com debug
  const isOptimistic = Boolean((lead as any).isOptimistic);
  const isCreating = Boolean((lead as any).isCreating);
  const tempId = (lead as any).tempId;
  
  // 🐛 DEBUG: Log para identificar cards com estado otimista incorreto
  if (isOptimistic && import.meta.env.DEV) {
    console.log(`🐛 [LeadCard] Card otimista detectado:`, {
      id: lead.id.substring(0, 8),
      nome: opportunityName,
      isOptimistic,
      isCreating,
      tempId,
      hasTimestamp: !!(lead as any).__timestamp,
      hasMoved: !!(lead as any).__moved
    });
  }

  return (
    <div
      className={`
        rounded-md transition-all duration-200 group min-h-[100px] mb-2
        ${isOptimistic 
          ? 'bg-green-50 ring-1 ring-green-200' 
          : 'bg-white hover:ring-1 ring-gray-300'
        }
        ${isCreating 
          ? 'opacity-80 animate-pulse' 
          : ''
        }
        ${isDragging ? 'shadow-xl ring-2 ring-blue-400' : 'shadow-sm'}
      `}
      style={{
        // ✅ CORREÇÃO ESPAÇAMENTO: margem removida - deixar CSS controlar (.kanban-card)
      }}
    >
      {/* Conteúdo Principal - Sem área de drag handle */}
      <div className="w-full p-2">
          {/* LINHA 1: Nome da Oportunidade + Sino de Notificação */}
          <div className="flex items-center justify-between mb-1">
            <h4 
              className="font-medium text-gray-900 truncate flex-1 hover:text-blue-600 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation(); // ✅ IMPORTANTE: Prevenir propagação para não interferir com drag
                onViewDetails?.(lead);
              }}
              title={opportunityName}
            >
              {opportunityName}
            </h4>
            
            <div className="flex items-center gap-2">
              {/* ✨ OPTIMISTIC UPDATES: Indicador de criação */}
              {isCreating && (
                <div 
                  title="Criando oportunidade..."
                  className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full"
                >
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-700">Criando...</span>
                </div>
              )}
              
              {/* ✅ OUTCOME REASONS: Badge quando há motivos aplicados */}
              {outcomeStatus?.hasOutcome && !isCreating && (
                <div 
                  title={`Motivo de ${outcomeStatus.lastOutcome?.outcome_type === 'ganho' || outcomeStatus.lastOutcome?.outcome_type === 'won' ? 'Ganho' : 'Perda'}: ${outcomeStatus.lastOutcome?.reason_text}`}
                  className="flex-shrink-0"
                >
                  {(outcomeStatus.lastOutcome?.outcome_type === 'ganho' || outcomeStatus.lastOutcome?.outcome_type === 'won') ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              )}
              
              {/* Sino de Notificação para Cadências */}
              <div title="Notificações de cadência">
                <Bell 
                  className="h-4 w-4 text-amber-500 cursor-pointer hover:text-amber-600 transition-colors flex-shrink-0" 
                />
              </div>
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
            <div className="flex items-center gap-2">
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
              className={`text-xs ${temperatureBadge.color} flex-shrink-0 flex items-center gap-1`}
              title={temperatureBadge.tooltip}
            >
              {temperatureBadge.icon}
              {temperatureBadge.label}
            </Badge>
          </div>

          {/* LINHA 4: Ícones de Contato + Olhinho */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Ícones de Contato */}
              {leadPhone && (
                <div title={leadPhone}>
                  <Phone className="h-3 w-3 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors" />
                </div>
              )}
              {leadEmail && (
                <div title={`Enviar e-mail para ${leadEmail}`}>
                  <Mail className="h-3 w-3 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors" />
                </div>
              )}
              {leadCompany && (
                <div title={leadCompany}>
                  <Building2 className="h-3 w-3 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors" />
                </div>
              )}
            </div>
            
            {/* Botão do Olhinho */}
            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all border border-blue-200 hover:border-blue-300 relative z-10"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation(); // ✅ IMPORTANTE: Prevenir propagação para não interferir com drag
                  onViewDetails?.(lead);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation(); // ✅ CORREÇÃO: Prevenir mouse down event de iniciar drag
                }}
                onPointerDown={(e) => {
                  e.stopPropagation(); // ✅ CORREÇÃO: Prevenir pointer down event de iniciar drag
                }}
                title="Ver detalhes completos do lead"
                style={{ pointerEvents: 'auto' }}
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
          </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // ✅ FASE 3: Comparação customizada para React.memo - apenas re-renderizar quando necessário
  return (
    prevProps.lead.id === nextProps.lead.id &&
    (prevProps.lead.first_name || '') + ' ' + (prevProps.lead.last_name || '') === (nextProps.lead.first_name || '') + ' ' + (nextProps.lead.last_name || '') &&
    prevProps.lead.email === nextProps.lead.email &&
    prevProps.lead.lead_temperature === nextProps.lead.lead_temperature &&
    prevProps.lead.stage_id === nextProps.lead.stage_id &&
    prevProps.pipelineId === nextProps.pipelineId &&
    prevProps.showDragHandle === nextProps.showDragHandle &&
    prevProps.isDragging === nextProps.isDragging &&
    // ✅ CORREÇÃO: Comparar valor para re-renderizar quando mudar
    prevProps.lead.custom_data?.valor === nextProps.lead.custom_data?.valor &&
    // Comparar apenas propriedades críticas para evitar comparações custosas
    prevProps.lead.created_at === nextProps.lead.created_at
  );
});

// Definir displayName para debugging
LeadCardPresentation.displayName = 'LeadCardPresentation';

export default LeadCardPresentation;
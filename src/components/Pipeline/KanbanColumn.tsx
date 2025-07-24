import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { 
  Eye
} from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import SortableLeadCard from './SortableLeadCard';
import { CustomField, PipelineStage, Lead } from '../../types/Pipeline';
import { Badge } from '../ui/badge';
import { DropZoneIndicator } from './DropZoneIndicator';

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  customFields: CustomField[];
  userRole: 'admin' | 'member' | 'super_admin';
  pipelineId?: string; // Pipeline ID para fallback do card
  onAddLead?: (stageId: string) => void;
  onUpdateLead?: (leadId: string, updatedData: any) => void;
  onViewDetails?: (lead: Lead) => void;
  loading?: boolean;
  isDropDisabled?: boolean;
  showMetrics?: boolean;
  sortBy?: 'created_at' | 'updated_at' | 'value' | 'name';
  sortOrder?: 'asc' | 'desc';
  onSort?: (stageId: string, sortBy: string, sortOrder: string) => void;
  renderCard?: (lead: Lead) => React.ReactNode; // ✅ CORREÇÃO: Renderização vem do pai
  parentLoading?: boolean; // ✅ NOVO: Indica se parent já está em loading
  isDragging?: boolean; // ✅ CORREÇÃO 1: Indica se há drag ativo
}

const KanbanColumn: React.FC<KanbanColumnProps> = memo(({
  stage,
  leads,
  customFields,
  userRole,
  pipelineId,
  onAddLead,
  onUpdateLead,
  onViewDetails,
  loading = false,
  isDropDisabled = false,
  showMetrics = true,
  sortBy = 'updated_at',
  sortOrder = 'desc',
  onSort,
  renderCard, // ✅ CORREÇÃO: Função de renderização vem do pai
  parentLoading = false, // ✅ NOVO: Detecta se parent está carregando
  isDragging = false // ✅ CORREÇÃO 1: Estado de drag ativo
}) => {
  
  // ============================================
  // ESTADO PARA CONTROLE DE FEEDBACK VISUAL
  // ============================================
  
  const [recentlyDropped, setRecentlyDropped] = useState(false);
  const [visualFeedbackTimeout, setVisualFeedbackTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // ============================================
  // DND-KIT DROPPABLE HOOK
  // ============================================
  
  const { isOver, setNodeRef } = useDroppable({
    id: `stage-${stage.id}`,
    disabled: isDropDisabled
  });
  

  // ============================================
  // CLEANUP AUTOMÁTICO DO FEEDBACK VISUAL
  // ============================================
  
  useEffect(() => {
    // Quando isOver passa de true para false, ativar timeout de limpeza
    if (!isOver && recentlyDropped && !visualFeedbackTimeout) {
      const timeout = setTimeout(() => {
        setRecentlyDropped(false);
      }, 3000); // 3 segundos para o feedback visual desaparecer
      
      setVisualFeedbackTimeout(timeout);
    } else if (isOver && !recentlyDropped) {
      // Se entrar em isOver pela primeira vez, marcar como recentemente dropado
      setRecentlyDropped(true);
    }
    
    // Cleanup quando o componente não está mais em estado de drop
    if (!isOver && !recentlyDropped && visualFeedbackTimeout) {
      clearTimeout(visualFeedbackTimeout);
      setVisualFeedbackTimeout(null);
    }
    
    // Cleanup no unmount
    return () => {
      if (visualFeedbackTimeout) {
        clearTimeout(visualFeedbackTimeout);
      }
    };
  }, [isOver, recentlyDropped, visualFeedbackTimeout]);

  // ============================================
  // LEADS ORDENADOS
  // ============================================
  
  const sortedLeads = useMemo(() => {
    if (!leads || leads.length === 0) return [];
    
    const sorted = [...leads].sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (sortBy) {
        case 'created_at':
          valueA = new Date(a.created_at);
          valueB = new Date(b.created_at);
          break;
        case 'updated_at':
          valueA = new Date(a.updated_at || a.created_at);
          valueB = new Date(b.updated_at || b.created_at);
          break;
        case 'value':
          valueA = Number(a.custom_data?.valor || 0);
          valueB = Number(b.custom_data?.valor || 0);
          break;
        case 'name':
          valueA = (a.custom_data?.nome_oportunidade || '').toLowerCase();
          valueB = (b.custom_data?.nome_oportunidade || '').toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      } else {
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      }
    });
    
    return sorted;
  }, [leads, sortBy, sortOrder]);

  // ============================================
  // MÉTRICAS DA COLUNA
  // ============================================
  
  const columnMetrics = useMemo(() => {
    if (!leads || leads.length === 0) {
      return {
        totalCount: 0,
        totalValue: 0,
        averageValue: 0,
        uniqueLeads: 0
      };
    }
    
    const totalValue = leads.reduce((sum, lead) => {
      return sum + (Number(lead.custom_data?.valor || 0));
    }, 0);
    
    const uniqueLeadIds = new Set(
      leads
        .map(lead => lead.lead_master_id)
        .filter(Boolean)
    );
    
    return {
      totalCount: leads.length,
      totalValue,
      averageValue: leads.length > 0 ? totalValue / leads.length : 0,
      uniqueLeads: uniqueLeadIds.size
    };
  }, [leads]);

  // Cálculo de altura dinâmica baseada no conteúdo
  const calculateDynamicHeight = useCallback(() => {
    const cardCount = sortedLeads.length;
    const minHeight = 500;
    const cardHeight = 120;
    const headerHeight = 80;
    const padding = 20;
    
    const contentBasedHeight = (cardCount * cardHeight) + headerHeight + padding;
    const viewportBasedHeight = window.innerHeight - 120;
    
    return Math.max(minHeight, Math.min(contentBasedHeight, viewportBasedHeight));
  }, [sortedLeads.length]);
  
  const dynamicMaxHeight = useMemo(() => {
    return `${calculateDynamicHeight()}px`;
  }, [calculateDynamicHeight]);

  // ============================================
  // FORMATAÇÃO
  // ============================================
  
  const formatCurrency = (value: number): string => {
    if (value === 0) return 'R$ 0';
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // ============================================
  // HANDLERS
  // ============================================

  // ============================================
  // RENDERIZAÇÃO DOS CARDS
  // ============================================
  
  // ✅ CORREÇÃO: Usar renderCard do pai ou fallback para renderização sortable local
  const renderLeadCard = (lead: Lead) => {
    if (renderCard) {
      // Usar renderização do pai (PipelineKanbanView)
      return renderCard(lead);
    }
    
    // ✅ SORTABLE: Fallback para renderização sortable local (compatibilidade)
    return (
      <SortableLeadCard
        key={lead.id}
        lead={lead}
        pipelineId={pipelineId || lead.pipeline_id || ''}
        canDrag={!loading && !isDropDisabled}
        onViewDetails={onViewDetails}
      />
    );
  };

  // ✅ CORREÇÃO: Cores específicas para etapas de sistema (Ganho e Perdido)
  const getStageColors = () => {
    const stageType = stage.stage_type || '';
    const stageName = stage.name || '';
    
    // Determinar se deve mostrar feedback visual (isOver ou recentemente dropado)
    const shouldShowFeedback = isOver || recentlyDropped;
    
    // Para etapas de sistema "Ganho" e "Perdido", usar cores mais visíveis
    if (stageType === 'ganho' || stageName === 'Ganho') {
      return {
        borderTopColor: '#10B981', // Verde mais vibrante
        backgroundColor: shouldShowFeedback ? '#10B98110' : '#10B98105', // Opacidade reduzida
        headerBackground: 'transparent', // ✅ CORREÇÃO: Header sem background
        transition: 'all 0.4s ease-out' // Transição suave
      };
    }
    
    if (stageType === 'perdido' || stageName === 'Perdido') {
      return {
        borderTopColor: '#EF4444', // Vermelho mais vibrante  
        backgroundColor: shouldShowFeedback ? '#EF444410' : '#EF444405', // Opacidade reduzida
        headerBackground: 'transparent', // ✅ CORREÇÃO: Header sem background
        transition: 'all 0.4s ease-out' // Transição suave
      };
    }
    
    // Para outras etapas, usar cor padrão
    return {
      borderTopColor: stage.color || '#64748b',
      backgroundColor: shouldShowFeedback ? `${stage.color || '#64748b'}08` : 'white',
      headerBackground: 'transparent', // ✅ CORREÇÃO: Header sem background
      transition: 'all 0.4s ease-out' // Transição suave
    };
  };

  const stageColors = getStageColors();

  return (
    <div 
      ref={setNodeRef}
      className={`kanban-stage flex-shrink-0 rounded-md transition-all duration-200 ${
        isOver 
          ? 'ring-2 ring-blue-400' 
          : ''
      }`}
      data-stage-id={stage.id} // ✅ PRECISE INSERT: Atributo para querySelector
      style={{
        backgroundColor: isOver || recentlyDropped ? stageColors.backgroundColor : 'transparent',
        width: '280px',
        minWidth: '280px',
        maxWidth: '280px',
        overflowX: 'hidden'
      }}
    >
      {/* ✅ HEADER LIMPO: Sem backgrounds, padding otimizado */}
      <div className="px-2 py-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2 flex-1">
            <h3 className="font-semibold text-gray-900 text-sm" title={stage.name}>
              {stage.name}
            </h3>
            <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5">
              {columnMetrics.totalCount}
            </Badge>
            <span className="text-xs font-medium text-gray-600">
              {formatCurrency(columnMetrics.totalValue)}
            </span>
          </div>
        </div>
      </div>

      {/* ÁREA DE DROP + LISTA DE CARDS */}
      <div 
        className={`stage-content relative p-1 space-y-1 transition-all duration-200 ${
          isOver ? 'bg-blue-50/50' : ''
        }`}
        style={{ 
          minHeight: '500px', // ✅ FASE 2: Área maior para drop
          maxHeight: dynamicMaxHeight, // ✅ CORREÇÃO 4: Altura dinâmica baseada no conteúdo
          overflowX: 'hidden',
          overflowY: 'auto', // ✅ CORREÇÃO ALTURA: Mudado de hidden para auto (permitir scroll)
          width: '100%',
          boxSizing: 'border-box',
          // ✅ FASE 2: Garantir que toda área seja clicável
          position: 'relative',
          zIndex: 1,
          // ✅ CORREÇÃO ALTURA: Scroll suave e responsivo
          scrollBehavior: 'smooth',
          // ✅ CORREÇÃO ALTURA: Scrollbar invisível mas funcional
          scrollbarWidth: 'none',
          scrollbarColor: 'transparent transparent',
          // ✅ CORREÇÃO 4: Transição suave quando altura muda
          transition: 'max-height 0.3s ease-in-out'
        }}
        data-droppable-over={isOver}
      >
        {loading && !parentLoading ? (
          /* ✅ CORREÇÃO: Só mostra loading se parent não está controlando */
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Carregando...</p>
          </div>
        ) : sortedLeads.length === 0 ? (
          /* ✅ CORREÇÃO CIRÚRGICA: Condições mais restritivas para DropZoneIndicator */
          <DropZoneIndicator
            isActive={false} // ✅ DESATIVADO: Remover feedback problemático
            stageName={stage.name}
            position="empty"
            variant={stage.name === 'Ganho' ? 'success' : stage.name === 'Perdido' ? 'warning' : 'default'}
            animated={false} // ✅ DESATIVADO: Sem animações problemáticas
          />
        ) : (
          <>
            {sortedLeads.map(renderLeadCard)}
          </>
        )}
      </div>
    </div>
  );
});

KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn;

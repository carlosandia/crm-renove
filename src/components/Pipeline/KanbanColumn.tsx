import React, { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { CustomField, PipelineStage, Lead, DroppableId } from '../../types/Pipeline';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import type { 
  DroppableProvided, 
  DroppableStateSnapshot,
  DraggableProvided,
  DraggableStateSnapshot
} from '@hello-pangea/dnd';
import { Badge } from '../ui/badge';
import { DropZoneIndicator } from './DropZoneIndicator';
import LeadCardPresentation from './LeadCardPresentation';
import { LeadCardErrorBoundary } from '../ErrorBoundaries';

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  customFields: CustomField[];
  userRole: 'admin' | 'member' | 'super_admin';
  pipelineId?: string; // Pipeline ID para o LeadCardPresentation
  onAddLead?: (stageId: string) => void;
  onUpdateLead?: (leadId: string, updatedData: any) => void;
  onViewDetails?: (lead: Lead) => void;
  loading?: boolean;
  isDropDisabled?: boolean;
  showMetrics?: boolean;
  sortBy?: 'created_at' | 'updated_at' | 'value' | 'name';
  sortOrder?: 'asc' | 'desc';
  onSort?: (stageId: string, sortBy: string, sortOrder: string) => void;
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
  parentLoading = false, // ✅ NOVO: Detecta se parent está carregando
  isDragging = false // ✅ CORREÇÃO 1: Estado de drag ativo
}) => {
  
  // ============================================
  // SCROLL DETECTION REMOVIDA - ELIMINAR @hello-pangea/dnd WARNING
  // ============================================
  
  // ✅ CORREÇÃO CRÍTICA: Removida toda lógica de scroll detection que fazia
  // @hello-pangea/dnd detectar este elemento como scroll container

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  // ✅ HELPER: Validação consolidada de index para evitar duplicação
  const getValidIndex = useCallback((index: number): number => {
    return typeof index === 'number' && Number.isInteger(index) && index >= 0 ? index : 0;
  }, []);

  // ============================================
  // MEMO E DADOS PROCESSADOS
  // ============================================

  // FASE 4: Leads em ordem sequencial (já organizados pelo parent)
  // AIDEV-NOTE: Não reordenar - usar ordem do PipelineKanbanView
  const sortedLeads = useMemo(() => {
    if (!leads || leads.length === 0) return [];
    
    // Usar leads na ordem original do parent - já reordenados corretamente pelo drag & drop
    // Isso garante que índices Hello Pangea DnD (0,1,2,3...) correspondam à ordem visual
    return [...leads];
  }, [leads]);

  // Métricas da coluna
  
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
      // ✅ CORREÇÃO CRÍTICA: Tratar valores monetários brasileiros corretamente
      const valorRaw = lead.custom_data?.valor;
      
      // Se não tem valor, contribui com 0
      if (!valorRaw || valorRaw === '' || valorRaw === null || valorRaw === undefined) {
        return sum;
      }
      
      // Converter string formatada (R$ 0,12) para número
      let numericValue = 0;
      if (typeof valorRaw === 'string') {
        // Remover símbolos monetários e converter vírgula para ponto
        const cleanValue = valorRaw.replace(/[R$\s]/g, '').replace(',', '.');
        numericValue = parseFloat(cleanValue) || 0;
      } else {
        numericValue = Number(valorRaw) || 0;
      }
      
      return sum + numericValue;
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

  // CORREÇÃO: Remover altura dinâmica limitada para permitir altura total da etapa

  // Formatação
  
  const formatCurrency = (value: number): string => {
    // ✅ CORREÇÃO: Tratar NaN e mostrar precisão decimal quando necessário
    if (!value || isNaN(value)) return 'R$ 0';
    if (value === 0) return 'R$ 0';
    
    // Para valores menores que R$ 10, mostrar sempre 2 decimais
    // Para valores maiores, mostrar sem decimais se for valor inteiro
    const shouldShowDecimals = value < 10 || (value % 1 !== 0);
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: shouldShowDecimals ? 2 : 0,
      maximumFractionDigits: 2
    }).format(value);
  };


  // Renderização dos cards
  
  // FASE 3: Renderização simplificada dos cards
  const renderLeadCard = useCallback((lead: Lead, index: number) => {
    const validIndex = getValidIndex(index);
    
    return (
      <Draggable key={lead.id} draggableId={lead.id} index={validIndex}>
        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`${snapshot.isDragging ? 'opacity-75 transform rotate-2' : ''}`}
            data-dragging={snapshot.isDragging}
            style={provided.draggableProps.style} // ✅ CORREÇÃO: Usar apenas styles fornecidos pela biblioteca
          >
            <LeadCardErrorBoundary
              leadId={lead.id}
              leadName={lead.first_name || lead.email || 'Lead'}
              fallbackMode="minimal"
            >
              <LeadCardPresentation
                lead={lead}
                pipelineId={pipelineId || ''}
                onViewDetails={onViewDetails}
                onViewDetailsWithTab={onViewDetails ? (lead, tab) => onViewDetails(lead) : undefined}
              />
            </LeadCardErrorBoundary>
          </div>
        )}
      </Draggable>
    );
  }, [getValidIndex, pipelineId, onViewDetails]);

  // Cores específicas para etapas de sistema
  const getStageColors = () => {
    const stageType = stage.stage_type || '';
    const stageName = stage.name || '';
    
    // Etapas de sistema com cores visíveis
    if (stageType === 'ganho' || stageName === 'Ganho') {
      return {
        borderTopColor: '#10B981',
        backgroundColor: '#10B98105',
        headerBackground: 'transparent',
        transition: 'all 0.4s ease-out'
      };
    }
    
    if (stageType === 'perdido' || stageName === 'Perdido') {
      return {
        borderTopColor: '#EF4444',
        backgroundColor: '#EF444405',
        headerBackground: 'transparent',
        transition: 'all 0.4s ease-out'
      };
    }
    
    // Outras etapas com cor padrão
    return {
      borderTopColor: stage.color || '#64748b',
      backgroundColor: 'white',
      headerBackground: 'transparent',
      transition: 'all 0.4s ease-out'
    };
  };

  const stageColors = getStageColors();

  return (
    <Droppable 
      droppableId={stage.id || 'unknown-stage'}
      direction="vertical"
      isDropDisabled={isDropDisabled}
      type="LEAD"
    >
      {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
        <div 
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`kanban-stage flex-shrink-0 flex flex-col rounded-md transition-all duration-200 h-full scrollbar-hidden ${
            snapshot.isDraggingOver ? 'ring-2 ring-blue-400' : ''
          }`}
          data-stage-id={stage.id}
          style={{
            backgroundColor: snapshot.isDraggingOver ? stageColors.backgroundColor : 'transparent',
            width: '280px',
            minWidth: '280px',
            maxWidth: '280px',
            height: '100%', // ✅ CORREÇÃO: Altura fixa sem override de overflow
            // ✅ FORÇAR: Eliminar scrollbars no container principal também
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            overflow: 'visible'
          }}
        >
      {/* Header da coluna */}
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

          {/* ÁREA DE DROP = ÁREA DE CARDS - SEM SCROLL DETECTION */}
          <div className="relative flex-1">
            {/* ✅ CORREÇÃO DEFINITIVA: Container simples conforme @hello-pangea/dnd */}
            <div 
              className={`stage-content-enhanced flex-1 p-2 space-y-2 transition-all duration-200 scrollbar-hidden overflow-visible ${
                snapshot.isDraggingOver ? 'bg-blue-50/50' : ''
              }`}
              data-droppable-over={snapshot.isDraggingOver}
              style={{
                // ✅ FORÇAR: Eliminar scrollbars através de inline styles
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                overflowX: 'visible',
                overflowY: 'visible'
              }}
            >
            {loading && !parentLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Carregando...</p>
              </div>
            ) : sortedLeads.length === 0 ? (
              <DropZoneIndicator
                isOver={snapshot.isDraggingOver}
                isDragging={isDragging}
                position="empty"
                className="mx-4 my-2"
              />
            ) : (
              <>
                {sortedLeads.map((lead, index) => {
                  return renderLeadCard(lead, getValidIndex(index));
                })}
              </>
            )}
            {provided.placeholder}
            </div>
          </div>
        </div>
      )}
    </Droppable>
  );
}, (prevProps, nextProps) => {
  // ✅ CORREÇÃO FASE 2: Função de comparação customizada para React.memo evitar warning "Expected static flag was missing"
  return (
    prevProps.stage.id === nextProps.stage.id &&
    prevProps.leads.length === nextProps.leads.length &&
    prevProps.pipelineId === nextProps.pipelineId &&
    prevProps.userRole === nextProps.userRole &&
    prevProps.loading === nextProps.loading &&
    prevProps.isDropDisabled === nextProps.isDropDisabled &&
    prevProps.showMetrics === nextProps.showMetrics &&
    prevProps.sortBy === nextProps.sortBy &&
    prevProps.sortOrder === nextProps.sortOrder &&
    prevProps.parentLoading === nextProps.parentLoading &&
    prevProps.isDragging === nextProps.isDragging &&
    // Comparação superficial dos leads para detectar mudanças
    prevProps.leads.every((lead, index) => 
      nextProps.leads[index] && lead.id === nextProps.leads[index].id && 
      lead.updated_at === nextProps.leads[index].updated_at
    ) &&
    // Comparação dos customFields (array)
    JSON.stringify(prevProps.customFields) === JSON.stringify(nextProps.customFields)
  );
});

KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn;

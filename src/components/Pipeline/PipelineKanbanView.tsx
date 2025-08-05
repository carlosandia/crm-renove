import React, { useCallback, useMemo, useDebugValue, useRef } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Lead, PipelineStage } from '../../types/Pipeline';
import { usePipelineKanban } from '../../hooks/usePipelineKanban';
import KanbanColumn from './KanbanColumn';
import PipelineMetricsDisplay from './metrics/PipelineMetricsDisplay';


// ============================================
// INTERFACES E TIPOS
// ============================================

interface PipelineKanbanViewProps {
  pipelineId: string;
  userRole: 'admin' | 'member' | 'super_admin';
  enableMetrics?: boolean;
  autoRefresh?: boolean;
  onViewDetails?: (lead: Lead) => void; // ✅ NOVO: Callback para abrir modal de detalhes
}


// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const PipelineKanbanView: React.FC<PipelineKanbanViewProps> = ({
  pipelineId,
  userRole,  
  enableMetrics = true,
  autoRefresh = true,
  onViewDetails // ✅ NOVO: Callback externo para modal
}) => {
  // 🎯 REMOÇÃO: Estado local removido - usar apenas optimistic updates do React Query
  
  // ============================================
  // HOOK CENTRALIZADO
  // ============================================
  
  const kanban = usePipelineKanban({
    pipelineId,
    autoRefresh,
    enableMetrics
  });
  
  // Desestruturar dados do kanban ANTES de usar em outros hooks
  const {
    pipeline,
    stages,
    leadsByStage,
    customFields,
    isLoading,
    openDetailsModal,
    handleLeadMove,
    totalLeads,
    filteredCount,
    error
  } = kanban;
  
  // ✅ REACT DEVTOOLS: Debug value para monitoring do Kanban View
  const debugState = useMemo(() => ({
    pipelineId: pipelineId.substring(0, 8),
    pipelineName: pipeline?.name || 'N/A',
    stagesCount: stages?.length || 0,
    totalLeads: totalLeads || 0,
    filteredCount: filteredCount || 0,
    isLoading: isLoading || false,
    hasError: !!error
  }), [pipelineId, pipeline?.name, stages?.length, totalLeads, filteredCount, isLoading, error]);
  
  useDebugValue(debugState);
  
  // Estados visuais simplificados - removidos pois não são mais necessários
  
  
  // ✅ REF SIMPLES: Container do kanban
  const kanbanContainerRef = useRef<HTMLDivElement>(null);
  
  // ============================================
  // ✅ @hello-pangea/dnd: Drag and Drop Handlers
  // ============================================
  
  // ✅ CURSOR MANAGEMENT: Gerenciar estado global de cursor
  const handleDragStart = useCallback(() => {
    // Aplicar classe global para cursor grabbing
    document.body.classList.add('dragging-active');
  }, []);
  
  const handleDragUpdate = useCallback(() => {
    // Manter estado de cursor durante drag
    if (!document.body.classList.contains('dragging-active')) {
      document.body.classList.add('dragging-active');
    }
  }, []);
  
  // 🎯 FUNÇÃO: Cálculo de posição baseado no contexto real dos leads
  const calculateRealPosition = useCallback((leads: Lead[], destinationIndex: number, draggedLeadId: string) => {
    // Filtrar o lead sendo arrastado para obter a lista correta
    const filteredLeads = leads.filter(lead => lead.id !== draggedLeadId);
    
    if (destinationIndex === 0) {
      // Inserir antes do primeiro lead
      const firstLead = filteredLeads[0];
      return firstLead ? Math.max(firstLead.position - 100, 50) : 100;
    }
    
    if (destinationIndex >= filteredLeads.length) {
      // Inserir após o último lead
      const lastLead = filteredLeads[filteredLeads.length - 1];
      return lastLead ? lastLead.position + 100 : 100;
    }
    
    // Inserir entre dois leads
    const prevLead = filteredLeads[destinationIndex - 1];
    const nextLead = filteredLeads[destinationIndex];
    
    if (prevLead && nextLead) {
      // Calcular posição média, garantindo espaço suficiente
      const avgPosition = Math.floor((prevLead.position + nextLead.position) / 2);
      
      // Se não há espaço suficiente, usar incremento baseado na posição anterior
      if (nextLead.position - prevLead.position <= 1) {
        return prevLead.position + 50;
      }
      
      return avgPosition;
    }
    
    // Fallback para cálculo sequencial
    return (destinationIndex + 1) * 100;
  }, []);

  // 🎯 DRAG END HANDLER: Posicionamento preciso baseado em contexto real
  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    // ✅ CURSOR CLEANUP: Sempre remover estado global
    document.body.classList.remove('dragging-active');
    
    // Cancelar se não há destino ou se não houve movimento
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      if (import.meta.env.DEV) {
        console.log('🔄 [DRAG END] Drop cancelado - sem movimento');
      }
      return;
    }
    
    // ✅ POSICIONAMENTO CONTEXTUAL: Calcular posição baseada nos leads reais
    const destinationLeads = leadsByStage[destination.droppableId] || [];
    const sourceLeads = leadsByStage[source.droppableId] || [];
    const draggedLead = sourceLeads.find(lead => lead.id === draggableId);
    
    const calculatedPosition = calculateRealPosition(
      destinationLeads, 
      destination.index, 
      draggableId
    );
    
    // 🔍 DEBUG: Log detalhado para análise de posicionamento
    if (import.meta.env.DEV) {
      const destLeadsInfo = destinationLeads.map(l => ({ 
        id: l.id.substring(0, 8), 
        position: l.position 
      }));
      
      console.log('🎯 [DRAG END] Posicionamento contextual:', {
        leadId: draggableId.substring(0, 8),
        draggedLeadPosition: draggedLead?.position,
        from: `${source.droppableId.substring(0, 8)}[${source.index}]`,
        to: `${destination.droppableId.substring(0, 8)}[${destination.index}]`,
        destinationLeads: destLeadsInfo,
        calculatedPosition,
        positionMapping: `visual_index_${destination.index} → real_position_${calculatedPosition}`,
        reasoning: destination.index === 0 ? 'inserir_antes_primeiro' : 
                  destination.index >= destinationLeads.length ? 'inserir_apos_ultimo' : 'inserir_entre_leads'
      });
    }
    
    // Executar optimistic update com posição contextual
    try {
      await handleLeadMove?.(
        draggableId, 
        destination.droppableId, 
        calculatedPosition,
        source.droppableId,
        destination.index
      );
      if (import.meta.env.DEV) {
        console.log('✅ [DRAG END] Optimistic update concluído com posição contextual:', calculatedPosition);
      }
    } catch (error) {
      console.error('❌ [DRAG END] Erro no optimistic update:', error);
    }
  }, [handleLeadMove, leadsByStage, calculateRealPosition]);
  
  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  // ============================================
  // RENDERIZAÇÃO PRINCIPAL
  // ============================================

  return (
    <DragDropContext 
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      onDragUpdate={handleDragUpdate}
    >
      <div className="flex flex-col h-full w-full bg-transparent">
        {/* HEADER COM MÉTRICAS CUSTOMIZÁVEIS */}
        {enableMetrics && (
          <div className="border-b border-gray-200 bg-transparent">
            <div className="px-4 py-3">
              <PipelineMetricsDisplay 
                pipelineId={pipelineId}
                size="sm"
              />
            </div>
          </div>
        )}

        {/* KANBAN BOARD COM @hello-pangea/dnd - CORREÇÃO DEFINITIVA: CONTAINER ÚNICO */}
        <div 
          ref={kanbanContainerRef}
          className="flex-1 h-full overflow-visible kanban-container"
          style={{ 
            // ✅ CORREÇÃO DEFINITIVA: Container único elimina nested scroll containers
            overflowAnchor: 'none', // Previne conflitos de scroll anchoring
            scrollBehavior: 'smooth' // Melhora experiência de navegação
          }}
        >
            <div className="flex px-0 py-2 min-w-max gap-2">
              {isLoading ? (
                <div className="flex items-center justify-center w-full py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500 ml-3">Carregando pipeline...</p>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center w-full py-8">
                  <p className="text-sm text-red-500">Erro ao carregar pipeline: {error.message}</p>
                </div>
              ) : !stages || stages.length === 0 ? (
                <div className="flex items-center justify-center w-full py-8">
                  <p className="text-sm text-gray-500">Nenhuma etapa encontrada</p>
                </div>
              ) : (
                stages.map(stage => {
                  const stageLeads = leadsByStage[stage.id] || [];
                  
                  return (
                    <KanbanColumn
                      key={stage.id}
                      stage={stage as PipelineStage}
                      leads={stageLeads}
                      customFields={customFields || []}
                      userRole={userRole}
                      pipelineId={pipelineId}
                      onViewDetails={onViewDetails || openDetailsModal}
                      loading={isLoading}
                      showMetrics={enableMetrics}
                      isDragging={false}
                    />
                  );
                })
              )}
            </div>
        </div>
      </div>
    </DragDropContext>
  );
};

export default PipelineKanbanView;
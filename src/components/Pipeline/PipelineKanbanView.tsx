import React, { useCallback, useMemo, useDebugValue, useRef, useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Lead, PipelineStage } from '../../types/Pipeline';
import { usePipelineKanban } from '../../hooks/usePipelineKanban';
import KanbanColumn from './KanbanColumn';
import PipelineMetricsDisplay from './metrics/PipelineMetricsDisplay';
import OutcomeReasonModal from '../../modules/outcome-reasons/components/OutcomeReasonModal';


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
  // ESTADO PARA OUTCOME MODAL OBRIGATÓRIO
  // ============================================
  
  const [pendingMove, setPendingMove] = useState<{
    leadId: string;
    destinationStageId: string;
    calculatedPosition: number;
    sourceStageId: string;
    destinationIndex: number;
    outcomeType: 'won' | 'lost';
  } | null>(null);
  
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
  // HELPER FUNCTIONS
  // ============================================
  
  // Helper para detectar se uma stage é de ganho/perdido
  const getStageOutcomeType = useCallback((stageId: string): 'won' | 'lost' | null => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return null;
    
    if (stage.stage_type === 'ganho' || stage.name === 'Ganho') {
      return 'won';
    }
    
    if (stage.stage_type === 'perdido' || stage.name === 'Perdido') {
      return 'lost';
    }
    
    return null;
  }, [stages]);
  
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

  // 🎯 DRAG END HANDLER COM INTERCEPTAÇÃO OBRIGATÓRIA PARA GANHO/PERDIDO
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
    
    // ✅ INTERCEPTAÇÃO OBRIGATÓRIA: Verificar se destino é ganho/perdido
    const outcomeType = getStageOutcomeType(destination.droppableId);
    
    if (outcomeType) {
      // 🛑 INTERCEPTAR: Destino é ganho/perdido - abrir modal ANTES de mover
      console.log('🛑 [OUTCOME REQUIRED] Movimento interceptado para stage de outcome:', {
        leadId: draggableId.substring(0, 8),
        destinationStage: destination.droppableId.substring(0, 8),
        outcomeType,
        message: 'Modal de motivo será exibido antes da movimentação'
      });
      
      // Armazenar dados da movimentação pendente
      setPendingMove({
        leadId: draggableId,
        destinationStageId: destination.droppableId,
        calculatedPosition,
        sourceStageId: source.droppableId,
        destinationIndex: destination.index,
        outcomeType
      });
      
      // Modal será aberto automaticamente pela renderização
      return;
    }
    
    // ✅ MOVIMENTAÇÃO NORMAL: Executar diretamente se não for ganho/perdido
    try {
      await handleLeadMove?.(
        draggableId, 
        destination.droppableId, 
        calculatedPosition,
        source.droppableId,
        destination.index
      );
      if (import.meta.env.DEV) {
        console.log('✅ [DRAG END] Movimentação normal concluída:', calculatedPosition);
      }
    } catch (error) {
      console.error('❌ [DRAG END] Erro na movimentação normal:', error);
    }
  }, [handleLeadMove, leadsByStage, calculateRealPosition, getStageOutcomeType]);
  
  // ============================================
  // HANDLERS DO OUTCOME MODAL
  // ============================================
  
  // Handler para quando o modal é fechado (cancelado)
  const handleOutcomeModalClose = useCallback(() => {
    console.log('❌ [OUTCOME MODAL] Cancelado pelo usuário - movimento não executado');
    setPendingMove(null);
  }, []);
  
  // Handler para quando o motivo é aplicado com sucesso
  const handleOutcomeSuccess = useCallback(async () => {
    if (!pendingMove) {
      console.warn('⚠️ [OUTCOME MODAL] Sucesso sem movimento pendente');
      return;
    }
    
    console.log('✅ [OUTCOME MODAL] Motivo aplicado - executando movimento:', {
      leadId: pendingMove.leadId.substring(0, 8),
      destinationStage: pendingMove.destinationStageId.substring(0, 8),
      outcomeType: pendingMove.outcomeType
    });
    
    try {
      // Executar a movimentação que estava pendente
      await handleLeadMove?.(
        pendingMove.leadId,
        pendingMove.destinationStageId,
        pendingMove.calculatedPosition,
        pendingMove.sourceStageId,
        pendingMove.destinationIndex
      );
      
      console.log('🎉 [OUTCOME MODAL] Movimento concluído com sucesso após aplicar motivo');
    } catch (error) {
      console.error('❌ [OUTCOME MODAL] Erro ao executar movimento após motivo:', error);
    } finally {
      // Limpar movimento pendente
      setPendingMove(null);
    }
  }, [pendingMove, handleLeadMove]);
  
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
                // ✅ CORREÇÃO: Em desenvolvimento, não mostrar loading intrusivo
                import.meta.env.DEV ? (
                  <div className="flex items-center justify-center w-full py-8">
                    <p className="text-sm text-gray-500">Carregando pipeline...</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                )
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
      
      {/* ============================================ */}
      {/* OUTCOME MODAL OBRIGATÓRIO PARA GANHO/PERDIDO */}
      {/* ============================================ */}
      
      {pendingMove && (
        <OutcomeReasonModal
          isOpen={true}
          onClose={handleOutcomeModalClose}
          leadId={pendingMove.leadId}
          outcomeType={pendingMove.outcomeType}
          pipelineId={pipelineId}
          onSuccess={handleOutcomeSuccess}
        />
      )}
    </DragDropContext>
  );
};

export default PipelineKanbanView;
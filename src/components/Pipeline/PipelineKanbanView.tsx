import React, { useState, useCallback, useEffect, useMemo, useDebugValue, useRef } from 'react';
import { 
  DragStartEvent, 
  DragEndEvent, 
  DragMoveEvent, 
  DragOverEvent, 
  CollisionDetection,
  closestCenter,
  closestCorners,
  rectIntersection
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { logger, LogContext } from '../../utils/loggerOptimized';
import { useAuth } from '../../contexts/AuthContext';
import { Lead, Pipeline } from '../../types/Pipeline';
import { usePipelineKanban } from '../../hooks/usePipelineKanban';
import SortableLeadCard from './SortableLeadCard';
import LeadCardPresentation from './LeadCardPresentation';
import KanbanColumn from './KanbanColumn';
import PipelineMetricsDisplay from './metrics/PipelineMetricsDisplay';
import StepLeadModal from './StepLeadModal';
import LeadDetailsModal from './LeadDetailsModal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { OutcomeReasonModal } from '../../modules/outcome-reasons';


// ============================================
// INTERFACES E TIPOS
// ============================================

interface PipelineKanbanViewProps {
  pipelineId: string;
  userRole: 'admin' | 'member' | 'super_admin';
  enableMetrics?: boolean;
  autoRefresh?: boolean;
}


// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const PipelineKanbanView: React.FC<PipelineKanbanViewProps> = ({
  pipelineId,
  userRole,
  enableMetrics = true,
  autoRefresh = true
}) => {
  const { user } = useAuth();
  
  // ============================================
  // HOOK CENTRALIZADO
  // ============================================
  
  const kanban = usePipelineKanban({
    pipelineId,
    autoRefresh,
    enableMetrics
  });
  
  // ✅ REACT DEVTOOLS: Debug value para monitoring do Kanban View
  const debugState = useMemo(() => ({
    pipelineId: pipelineId.substring(0, 8),
    pipelineName: kanban.pipeline?.name || 'N/A',
    stagesCount: kanban.stages.length,
    totalLeads: kanban.totalLeads,
    filteredCount: kanban.filteredCount,
    isLoading: kanban.isLoading,
    hasError: !!kanban.error
  }), [pipelineId, kanban.pipeline?.name, kanban.stages.length, kanban.totalLeads, kanban.filteredCount, kanban.isLoading, kanban.error]);
  
  useDebugValue(debugState, (state) => 
    `${state.pipelineName} | ${state.totalLeads}L | ${state.isLoading ? 'Loading' : 'Ready'}`
  );
  
  // Desestruturar após o log
  const {
    // Dados
    pipeline,
    stages,
    leadsByStage,
    customFields,
    metrics,
    
    // Estados
    isLoading,
    isUpdatingStage,
    showCreateModal,
    showDetailsModal,
    selectedLead,
    filters,
    
    // Actions
    updateFilters,
    openCreateModal,
    closeCreateModal,
    openDetailsModal,
    closeDetailsModal,
    handleLeadMove,
    handleCreateLead,
    refreshData,
    totalLeads,
    filteredCount,
    error
  } = kanban;
  
  // ============================================
  // ✅ FASE 3: LISTENERS DE EVENTOS OTIMIZADOS COM useCallback
  // ============================================
  
  const handleSearchChanged = useCallback((event: CustomEvent) => {
    updateFilters({ searchTerm: event.detail.searchTerm });
  }, [updateFilters]);

  const handleDateFilterChanged = useCallback((event: CustomEvent) => {
    kanban.updateDateRange(event.detail.dateRange);
  }, [kanban.updateDateRange]);

  const handleCreateOpportunityRequested = useCallback((event: CustomEvent) => {
    openCreateModal();
  }, [openCreateModal]);
  
  // ✅ CORREÇÃO 7: Estados visuais declarados ANTES dos useEffect
  // ✅ CORREÇÃO 4: Estado visual otimista melhorado para posicionamento preciso
  const [visualMoveState, setVisualMoveState] = useState<{
    leadId: string;
    newStageId: string;
    timestamp: number;
    isReorder?: boolean;
    newOrder?: string[];
    insertAtIndex?: number;
    previousStageId?: string; // ✅ NOVO: Guardar stage anterior para rollback
  } | null>(null);
  
  // ✅ CORREÇÃO 7: Timeout para auto-limpeza - MOVIDO ANTES DOS useEffect
  const [visualStateTimeout, setVisualStateTimeout] = useState<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Registrar listeners apenas uma vez
    window.addEventListener('pipeline-search-changed', handleSearchChanged as EventListener);
    window.addEventListener('pipeline-date-filter-changed', handleDateFilterChanged as EventListener);
    window.addEventListener('create-opportunity-requested', handleCreateOpportunityRequested as EventListener);

    return () => {
      window.removeEventListener('pipeline-search-changed', handleSearchChanged as EventListener);
      window.removeEventListener('pipeline-date-filter-changed', handleDateFilterChanged as EventListener);
      window.removeEventListener('create-opportunity-requested', handleCreateOpportunityRequested as EventListener);
      
      // ✅ CORREÇÃO 7: Cleanup de estados visuais no unmount
      if (visualStateTimeout) {
        clearTimeout(visualStateTimeout);
      }
    };
  }, [visualStateTimeout]);
  
  
  // ============================================
  // COLLISION DETECTION ROBUSTA HÍBRIDA
  // ============================================
  
  // ✅ FASE 2: Collision detection ultra-otimizada (padrão profissional)
  const professionalCollisionDetection: CollisionDetection = useCallback((args) => {
    // ✅ KEYBOARD: Fallback para navegação por teclado
    if (!args.pointerCoordinates) {
      return closestCenter(args);
    }

    // ✅ FASE 2: Strategy híbrida profissional - closestCorners como base
    const cornerCollisions = closestCorners(args);
    
    // ✅ DEBOUNCE: Implementar throttling implícito via limitação
    if (cornerCollisions.length > 2) {
      // ✅ FASE 2: Máximo 2 colisões simultâneas para performance 60fps
      const prioritizedCollisions = cornerCollisions
        .sort((a, b) => {
          // Priorizar elementos droppable (stages) sobre sortable (leads) para cross-container
          const aIsStage = a.data?.current?.type === 'stage';
          const bIsStage = b.data?.current?.type === 'stage';
          
          if (aIsStage && !bIsStage) return -1;
          if (!aIsStage && bIsStage) return 1;
          
          // Se ambos são do mesmo tipo, usar distância (mais próximo primeiro)
          return 0;
        })
        .slice(0, 2);
        
      return prioritizedCollisions;
    }

    // ✅ FASE 2: Se há poucas colisões, verificar rectIntersection para precisão adicional
    if (cornerCollisions.length <= 1) {
      const rectCollisions = rectIntersection(args);
      if (rectCollisions.length > 0) {
        // Combinar resultados mantendo máximo de 2
        const combined = [...cornerCollisions, ...rectCollisions];
        return combined.slice(0, 2);
      }
    }

    return cornerCollisions.slice(0, 2);
  }, []);

  // ============================================
  // ESTADO DRAG AND DROP NATIVO + FORCE RENDER
  // ============================================
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  // ✅ FORÇA RE-RENDER: State local para trigger manual de re-render
  // ✅ CURSOR POSITION: Coordenadas do cursor para cálculo preciso de inserção
  const [cursorPosition, setCursorPosition] = useState<{x: number, y: number} | null>(null);
  const isDragging = activeId !== null;
  
  // ============================================
  // ✅ REMOÇÃO TOTAL: DRAG-TO-SCROLL REMOVIDO (CONFLITAVA COM DND-KIT)
  // ============================================
  
  // ✅ REF SIMPLES: Container do kanban para substituir dragToScroll.ref
  const kanbanContainerRef = useRef<HTMLDivElement>(null);
  
  // ✅ OUTCOME REASONS: Estado para modal de motivos
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [pendingOutcome, setPendingOutcome] = useState<{
    leadId: string;
    stageId: string;
    outcomeType: 'won' | 'lost';
  } | null>(null);

  // ✅ CORREÇÃO 7: Estados já movidos para antes dos useEffect acima
  
  // ✅ CORREÇÃO 4: Helper para gerenciar estado visual de forma segura
  const setVisualMoveStateSafe = useCallback((newState: typeof visualMoveState) => {
    // Limpar timeout anterior se existir
    if (visualStateTimeout) {
      clearTimeout(visualStateTimeout);
      setVisualStateTimeout(null);
    }
    
    // Definir novo estado
    setVisualMoveState(newState);
    
    // ✅ AUTO-CLEANUP: Definir timeout para limpeza automática (fallback)
    if (newState) {
      const timeout = setTimeout(() => {
        setVisualMoveState(null);
        setVisualStateTimeout(null);
      }, 5000); // 5 segundos como fallback
      
      setVisualStateTimeout(timeout);
    }
  }, [visualStateTimeout]);

  // ✅ CORREÇÃO 4: Estado visual sincronizado com posicionamento preciso
  // MOVIDO PARA ANTES DOS HANDLERS PARA EVITAR REFERROR
  const getVisualLeadsByStage = useMemo(() => {
    if (!visualMoveState) {
      return leadsByStage; // Usar dados normais do cache
    }

    // ✅ ESTADO VISUAL ATIVO: Mostrar lead na nova posição ou ordem imediatamente
    const { leadId, newStageId, isReorder, newOrder, insertAtIndex, previousStageId } = visualMoveState;
    const updatedLeadsByStage = JSON.parse(JSON.stringify(leadsByStage)); // Deep clone para mutações seguras

    if (isReorder && newOrder) {
      // ✅ SORTABLE: Reordenação dentro da mesma coluna com validação
      const originalLeads = updatedLeadsByStage[newStageId] || [];
      const reorderedLeads = newOrder
        .map(id => originalLeads.find((lead: any) => lead.id === id))
        .filter(Boolean) as Lead[];
      
      // ✅ VALIDAÇÃO: Garantir que todos os leads originais estão presentes
      if (reorderedLeads.length === originalLeads.length) {
        updatedLeadsByStage[newStageId] = reorderedLeads;
      }
    } else {
      // ✅ MOVIMENTO ENTRE STAGES: Mostrar lead na nova posição imediatamente
      let movedLead: Lead | null = null;
      
      // Primeiro, encontrar o lead e remover da stage atual
      Object.keys(updatedLeadsByStage).forEach(stageId => {
        const stageLeads = updatedLeadsByStage[stageId] || [];
        const leadIndex = stageLeads.findIndex((lead: any) => lead.id === leadId);
        
        if (leadIndex !== -1) {
          movedLead = { ...stageLeads[leadIndex], stage_id: newStageId };
          updatedLeadsByStage[stageId] = stageLeads.filter((_: any, index: number) => index !== leadIndex);
        }
      });

      // ✅ INSERÇÃO PRECISA: Adicionar lead na posição correta
      if (movedLead) {
        if (!updatedLeadsByStage[newStageId]) {
          updatedLeadsByStage[newStageId] = [];
        }
        
        const targetStageLeads = [...updatedLeadsByStage[newStageId]];
        
        if (insertAtIndex !== undefined && insertAtIndex >= 0 && insertAtIndex <= targetStageLeads.length) {
          // ✅ VALIDAÇÃO: Inserir na posição específica apenas se válida
          targetStageLeads.splice(insertAtIndex, 0, movedLead);
        } else {
          // ✅ FALLBACK: Inserir no final se posição inválida
          targetStageLeads.push(movedLead);
        }
        
        updatedLeadsByStage[newStageId] = targetStageLeads;
      }
    }

    return updatedLeadsByStage;
  }, [leadsByStage, visualMoveState]);

  // ============================================
  // OTIMIZADO: Logs removidos para evitar HMR excessivo
  // ============================================

  // ============================================
  // FUNÇÃO PARA CÁLCULO PRECISO DA POSIÇÃO DE INSERÇÃO
  // ============================================
  
  // ✅ FASE 2 + 6: Cálculo intuitivo de inserção (20px margin vs 50% split)
  const calculateIntuitiveInsertIndex = useCallback((
    targetStageId: string, 
    cursorY: number, 
    leadsByStage: Record<string, Lead[]>
  ): number => {
    const targetLeads = leadsByStage[targetStageId] || [];
    if (targetLeads.length === 0) return 0;

    // ✅ FASE 6: Melhor seletor para container da coluna
    const stageContainer = document.querySelector(`[data-stage-id="${targetStageId}"] .stage-content`);
    if (!stageContainer) {
      if (import.meta.env.DEV) {
        logger.warn('🎯 [INTUITIVE INSERT] Container não encontrado:', LogContext.PIPELINE, { targetStageId });
      }
      return targetLeads.length;
    }

    // ✅ FASE 6: Seletor otimizado para cards
    const cardElements = stageContainer.querySelectorAll('[data-id].kanban-card');
    
    if (cardElements.length === 0) {
      return 0;
    }
    
    // ✅ FASE 6: Algoritmo intuitivo - 20px margin (não 50% split)
    for (let i = 0; i < cardElements.length; i++) {
      const cardElement = cardElements[i] as HTMLElement;
      const cardRect = cardElement.getBoundingClientRect();
      
      // ✅ FASE 6: Margem de 20px do topo do card (mais intuitivo que 50%)
      const insertionMargin = 20;
      const insertionThreshold = cardRect.top + insertionMargin;
      
      // ✅ FASE 6: Se cursor está nos primeiros 20px do card, inserir antes
      if (cursorY < insertionThreshold) {
        return i;
      }
      
      // ✅ FASE 6: Se cursor está nos últimos 20px do card, inserir depois
      const bottomThreshold = cardRect.bottom - insertionMargin;
      if (cursorY > bottomThreshold && i === cardElements.length - 1) {
        return i + 1;
      }
    }
    
    // ✅ FASE 6: Cursor no meio de algum card - inserir no final como fallback
    return targetLeads.length;
  }, []);

  // ============================================
  // HANDLERS NATIVOS DO DND-KIT
  // ============================================
  
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const leadId = active.id as string;
    
    setActiveId(leadId);
    // ✅ CURSOR TRACKING: Reset coordenadas no início do drag
    setCursorPosition(null);
    
    // ✅ CORREÇÃO 4: Limpar estados visuais órfãos no início do drag
    setVisualMoveStateSafe(null);
    
    // ✅ USAR DADOS VISUAIS: Encontrar lead com estado visual aplicado
    const allLeads = Object.values(getVisualLeadsByStage).flat();
    const lead = allLeads.find(l => l.id === leadId);
    setDraggedLead(lead ? lead as any : null);
    
    // ✅ CURSOR: Definir cursor grabbing no body
    document.body.style.setProperty('cursor', 'grabbing', 'important');
    
    // ✅ CORREÇÃO: Prevenir scroll horizontal durante drag
    const stageElements = document.querySelectorAll('.kanban-stage');
    stageElements.forEach(stage => {
      stage.classList.add('stage-dragging');
    });
    
    // ✅ FASE 4: Debug otimizado - removido para produção
  }, [getVisualLeadsByStage, setVisualMoveStateSafe]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Reset estado visual imediatamente
    setActiveId(null);
    setDraggedLead(null);
    // ✅ CURSOR TRACKING: Salvar coordenadas finais antes de resetar
    const finalCursorPosition = cursorPosition;
    
    // ✅ CURSOR: Resetar cursor do body
    document.body.style.removeProperty('cursor');
    
    // ✅ CURSOR TRACKING: Reset coordenadas após salvar
    setCursorPosition(null);
    
    // ✅ CORREÇÃO: Restaurar overflow normal
    const stageElements = document.querySelectorAll('.kanban-stage');
    stageElements.forEach(stage => {
      stage.classList.remove('stage-dragging');
    });
    
    // Se não há destino, cancela
    if (!over) {
      return;
    }
    
    const leadId = active.id as string;
    const overId = over.id as string;
    
    // ✅ MULTIPLE CONTAINERS: Melhor detecção de cross-container vs same-container
    const draggedLeadData = Object.values(getVisualLeadsByStage).flat().find(l => l.id === leadId);
    const overLeadData = Object.values(getVisualLeadsByStage).flat().find(l => l.id === overId);
    
    // ✅ CROSS-CONTAINER DETECTION: Determinar tipo de drop
    let targetStageId: string;
    let insertIndex: number | undefined;
    let isWithinStage = false;
    
    if (overLeadData) {
      // Solto sobre outro lead - calcular posição precisa baseada em coordenadas Y
      targetStageId = (overLeadData as any)?.stage_id;
      isWithinStage = (draggedLeadData as any)?.stage_id === targetStageId;
      
      // ✅ CÁLCULO INTUITIVO: Usar coordenadas do cursor com margem de 20px
      if (finalCursorPosition && finalCursorPosition.y) {
        insertIndex = calculateIntuitiveInsertIndex(
          targetStageId,
          finalCursorPosition.y,
          getVisualLeadsByStage
        );
        // ✅ DEBUG REMOVED: Log de drop sobre lead removido para produção
      } else {
        // Fallback para método antigo se não houver coordenadas
        const targetStageLeads = getVisualLeadsByStage[targetStageId] || [];
        insertIndex = targetStageLeads.findIndex((lead: any) => lead.id === overId);
      }
    } else {
      // Solto sobre stage vazia ou área da stage
      targetStageId = overId; // Assumir que overId é stageId
      isWithinStage = (draggedLeadData as any)?.stage_id === targetStageId;
      
      // ✅ CÁLCULO INTUITIVO: Mesmo para área da stage, usar coordenadas se disponível
      if (finalCursorPosition && finalCursorPosition.y) {
        insertIndex = calculateIntuitiveInsertIndex(
          targetStageId,
          finalCursorPosition.y,
          getVisualLeadsByStage
        );
        // ✅ DEBUG REMOVED: Log de drop sobre área de stage removido para produção
      } else {
        insertIndex = undefined; // Adicionar ao final como fallback
      }
    }
    
    // ✅ SAME-CONTAINER REORDERING: Se é reordenação dentro da mesma coluna
    if (isWithinStage && insertIndex !== undefined) {
      const stageLeads = getVisualLeadsByStage[targetStageId] || [];
      const oldIndex = stageLeads.findIndex((lead: any) => lead.id === leadId);
      
      if (oldIndex !== insertIndex && oldIndex !== -1) {
        // ✅ PRECISÃO: Calcular nova posição considerando direção do movimento
        const finalIndex = oldIndex < insertIndex ? insertIndex : insertIndex;
        const reorderedLeads = arrayMove(stageLeads, oldIndex, finalIndex);
        
        // ✅ VISUAL: Atualizar estado visual para mostrar nova ordem imediatamente
        setVisualMoveStateSafe({
          leadId,
          newStageId: targetStageId,
          timestamp: Date.now(),
          isReorder: true,
          newOrder: reorderedLeads.map(lead => lead.id),
          previousStageId: targetStageId // Mesma stage para reordenação
        });
        
        // TODO: Implementar persistência da ordem no backend se necessário
      }
      return;
    }
    
    // ✅ USAR DADOS VISUAIS: Verificar mudança de stage com estado visual
    if ((draggedLeadData as any)?.stage_id === targetStageId && !insertIndex) {
      // Mesmo stage, mesma posição - nada a fazer
      return;
    }
    
    // ✅ OUTCOME REASONS: Verificar se é movimento para stage final
    const targetStage = stages.find(s => s.id === targetStageId);
    if (targetStage && (targetStage.name === 'Ganho' || targetStage.name === 'Perdido')) {
      // Determinar tipo de outcome baseado no nome da stage  
      const outcomeType: 'won' | 'lost' = targetStage.name === 'Ganho' ? 'won' : 'lost';
      
      // Armazenar dados para o modal e abrir
      setPendingOutcome({ leadId, stageId: targetStageId, outcomeType });
      setShowOutcomeModal(true);
      return; // Não fazer movimentação ainda
    }
    
    // ✨ OPTIMISTIC UI: Mover card imediatamente (sem await)
    const previousStageId = (draggedLeadData as any)?.stage_id;
    
    if (insertIndex !== undefined && !isWithinStage) {
      // ✅ INSERÇÃO PRECISA: Inserir na posição específica entre cards
      setVisualMoveStateSafe({
        leadId,
        newStageId: targetStageId,
        timestamp: Date.now(),
        isReorder: false, // É cross-container, não reordenação
        insertAtIndex: insertIndex,
        previousStageId
      });
    } else {
      // ✅ INSERÇÃO NO FINAL: Adicionar ao final da coluna de destino
      setVisualMoveStateSafe({
        leadId,
        newStageId: targetStageId,
        timestamp: Date.now(),
        isReorder: false,
        previousStageId
      });
    }
    
    // ✅ CORREÇÃO: Removido forceRenderKey - TanStack Query invalidará automaticamente
    
    // 🎯 POSIÇÃO PRECISA: Passar insertIndex para persistir no backend se disponível
    const finalPosition = insertIndex !== undefined && insertIndex >= 0 ? insertIndex : undefined;
    
    handleLeadMove(leadId, targetStageId, finalPosition)
      .then(() => {
        // ✅ CORREÇÃO 4: Limpar estado visual após sucesso
        setVisualMoveStateSafe(null);
      })
      .catch((error) => {
        // ✅ CORREÇÃO 4: Rollback visual em caso de erro
        const currentVisualState = visualMoveState;
        setVisualMoveStateSafe(null);
        
        // ✅ ROLLBACK: Restaurar visualmente o lead na posição original se houve erro
        if (currentVisualState && currentVisualState.previousStageId) {
          setTimeout(() => {
            // Mostrar brevemente o lead na posição original para feedback visual
            setVisualMoveStateSafe({
              leadId: currentVisualState.leadId,
              newStageId: currentVisualState.previousStageId!,
              timestamp: Date.now(),
              isReorder: false,
              previousStageId: currentVisualState.newStageId
            });
            
            // Limpar após 1 segundo
            setTimeout(() => setVisualMoveStateSafe(null), 1000);
          }, 100);
        }
        
        // ✅ CORREÇÃO 3: Log de erro com throttling
        const now = Date.now();
        const lastErrorLog = (window as any).lastMoveErrorLog || 0;
        
        if (now - lastErrorLog > 2000) { // Log erro apenas a cada 2 segundos
          logger.error('Erro ao mover lead:', error, LogContext.PIPELINE);
          (window as any).lastMoveErrorLog = now;
        }
        // TODO: Implementar toast notification para erro
      });
    
    // ✅ ELIMINADO: Não mais await refreshData() - causa "refresh feeling"
    // O TanStack Query invalidará automaticamente apenas o necessário
  }, [handleLeadMove, stages, getVisualLeadsByStage, calculateIntuitiveInsertIndex, cursorPosition, setVisualMoveStateSafe, visualMoveState]);

  const handleDragCancel = useCallback(() => {
    // Reset estado
    setActiveId(null);
    setDraggedLead(null);
    // ✅ CURSOR TRACKING: Reset coordenadas no cancel
    setCursorPosition(null);
    
    // ✅ CURSOR: Resetar cursor do body
    document.body.style.removeProperty('cursor');
    
    // ✅ CORREÇÃO: Restaurar overflow normal
    const stageElements = document.querySelectorAll('.kanban-stage');
    stageElements.forEach(stage => {
      stage.classList.remove('stage-dragging');
    });
  }, []);

  // ✅ REMOÇÃO TOTAL: AUTO-SCROLL MANUAL REMOVIDO (DEIXAR NATIVO DO BROWSER/DNDKit)
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    // Usar coordenadas do elemento para posicionamento
    if (event.active?.rect?.current?.translated) {
      const rect = event.active.rect.current.translated;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      setCursorPosition({ x: centerX, y: centerY });
      
      // ✅ AUTO-SCROLL NATIVO: Deixar browser/DNDKit gerenciar auto-scroll
      // Removido auto-scroll manual que conflitava com DNDKit
    }
  }, []);

  // ✅ CORREÇÃO 2: Collision monitoring otimizado com throttling
  const handleDragOver = useCallback((event: DragOverEvent) => {
    // ✅ THRESHOLD REDUZIDO: De 10 para 5 colisões
    if (import.meta.env.DEV && event.collisions && event.collisions.length > 5) {
      // ✅ THROTTLING: Log apenas a cada 1 segundo para evitar spam
      const now = Date.now();
      const lastWarning = (window as any).lastCollisionWarning || 0;
      
      if (now - lastWarning > 1000) {
        logger.warn(`⚠️ COLLISION ALERT: ${event.collisions.length} simultaneous collisions (target: ≤2)`, LogContext.PERFORMANCE);
        (window as any).lastCollisionWarning = now;
      }
    }
  }, []);

  // ============================================
  // OUTCOME REASONS HANDLERS
  // ============================================

  const handleOutcomeSuccess = useCallback(async () => {
    if (!pendingOutcome) return;

    try {
      // Agora fazer a movimentação do lead
      await handleLeadMove(pendingOutcome.leadId, pendingOutcome.stageId);
      
      // Refresh para sincronizar
      await refreshData();
    } catch (error) {
      // ✅ CORREÇÃO 3: Log único e throttled para erro de finalização
      const now = Date.now();
      const lastOutcomeErrorLog = (window as any).lastOutcomeErrorLog || 0;
      
      if (now - lastOutcomeErrorLog > 3000) { // Log erro apenas a cada 3 segundos
        logger.error('Erro ao finalizar movimentação do lead:', error, LogContext.PIPELINE);
        (window as any).lastOutcomeErrorLog = now;
      }
    } finally {
      // Limpar estado
      setPendingOutcome(null);
      setShowOutcomeModal(false);
    }
  }, [pendingOutcome, handleLeadMove, refreshData]);

  const handleOutcomeCancel = useCallback(() => {
    // Simplesmente fechar modal sem mover lead
    setPendingOutcome(null);
    setShowOutcomeModal(false);
  }, []);


  // Renderização dos cards
  const renderLeadCard = useCallback((lead: Lead) => {
    return (
      <SortableLeadCard
        key={lead.id}
        lead={lead}
        pipelineId={pipelineId}
        canDrag={false}
        onViewDetails={openDetailsModal}
      />
    );
  }, [
    pipelineId,
    openDetailsModal
  ]);

  // ============================================
  // RENDERIZAÇÃO PRINCIPAL
  // ============================================

  return (
    <div className="flex flex-col h-full w-full bg-transparent">
      {/* HEADER COM MÉTRICAS CUSTOMIZÁVEIS */}
      {enableMetrics && (
        <div className="border-b border-gray-200 bg-transparent">
          <div className="px-4 py-3">
            
            <PipelineMetricsDisplay
              pipelineId={pipelineId}
              enableRealTime={autoRefresh}
              size="md"
              className="w-full"
            />
          </div>
        </div>
      )}


      {/* KANBAN BOARD */}
      <div className="flex-1 overflow-hidden">
        <div 
          ref={kanbanContainerRef}
          className={`h-full overflow-x-auto kanban-container`}
        >
          <div className="flex px-0 py-2 min-w-max gap-2">
            {stages.map(stage => {
              const stageLeads = leadsByStage[stage.id] || [];
              
              return (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  leads={stageLeads}
                  customFields={customFields}
                  userRole={userRole}
                  pipelineId={pipelineId}
                  onAddLead={openCreateModal}
                  onViewDetails={openDetailsModal}
                  loading={isLoading}
                  showMetrics={true}
                  renderCard={renderLeadCard}
                />
              );
            })}
          </div>
        </div>
      </div>
      {/* MODALS */}
      {showCreateModal && pipeline && (
        <StepLeadModal
          isOpen={showCreateModal}
          onClose={closeCreateModal}
          pipeline={pipeline}
          onSubmit={handleCreateLead}
          currentUser={user}
        />
      )}

      {showDetailsModal && selectedLead && (
        <LeadDetailsModal
          isOpen={showDetailsModal}
          onClose={closeDetailsModal}
          lead={selectedLead}
          customFields={customFields}
          pipelineId={pipelineId}
          isUpdatingStage={isUpdatingStage}
          onForceClose={() => {
            closeDetailsModal();
          }}
        />
      )}

      {/* OUTCOME REASONS MODAL */}
      {showOutcomeModal && pendingOutcome && (
        <OutcomeReasonModal
          isOpen={showOutcomeModal}
          onClose={handleOutcomeCancel}
          leadId={pendingOutcome.leadId}
          outcomeType={pendingOutcome.outcomeType}
          pipelineId={pipelineId}
          onSuccess={handleOutcomeSuccess}
        />
      )}

      {/* DEBUG: Indicador removido - cursor tracking corrigido */}
    </div>
  );
};

export default PipelineKanbanView;
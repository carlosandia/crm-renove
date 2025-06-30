import { useState, useCallback } from 'react';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { Lead, Pipeline } from '../../../types/Pipeline';

export interface DragDropState {
  isDragging: boolean;
  activeId: string | null;
  draggedLead: Lead | null;
}

export interface DragDropManagerProps {
  viewingPipeline: Pipeline | null;
  leads: Lead[];
  onLeadMove: (leadId: string, stageId: string) => Promise<void>;
  onRefreshLeads: () => Promise<void>;
}

export interface DragDropManagerReturn {
  // Estado do drag and drop
  isDragging: boolean;
  activeId: string | null;
  draggedLead: Lead | null;
  
  // Handlers
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
  
  // Estado completo
  dragDropState: DragDropState;
}

export const useDragDropManager = ({
  viewingPipeline,
  leads,
  onLeadMove,
  onRefreshLeads
}: DragDropManagerProps): DragDropManagerReturn => {
  
  const [dragDropState, setDragDropState] = useState<DragDropState>({
    isDragging: false,
    activeId: null,
    draggedLead: null
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const activeId = event.active.id as string;
    const leadId = activeId.startsWith('lead-') ? activeId.replace('lead-', '') : activeId;
    const draggedLead = leads.find(lead => lead.id === leadId) || null;
    
    setDragDropState({
      isDragging: true,
      activeId: activeId,
      draggedLead
    });
    
    console.log('🚀 [DragDropManager] Drag iniciado:', {
      activeId,
      leadId,
      leadName: draggedLead?.custom_data?.nome_lead || 'Lead'
    });
  }, [leads]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Reset drag state immediately
    setDragDropState({
      isDragging: false,
      activeId: null,
      draggedLead: null
    });
    
    // Se não há destino ou pipeline, cancela
    if (!over || !viewingPipeline) {
      console.log('🚫 [DragDropManager] Drag cancelado: sem destino ou pipeline');
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Extrair IDs reais dos IDs hierárquicos
    const leadId = activeId.startsWith('lead-') ? activeId.replace('lead-', '') : activeId;
    const stageId = overId.startsWith('stage-') ? overId.replace('stage-', '') : overId;

    // Se moveu para a mesma posição, cancela
    if (leadId === stageId) {
      console.log('🚫 [DragDropManager] Drag cancelado: mesma posição');
      return;
    }

    // Encontrar o lead sendo movido
    const activeLead = leads.find(lead => lead.id === leadId);
    if (!activeLead) {
      console.log('🚫 [DragDropManager] Lead não encontrado:', leadId);
      return;
    }

    // Se já está na mesma etapa, cancela
    if (activeLead.stage_id === stageId) {
      console.log('🚫 [DragDropManager] Lead já está nesta etapa');
      return;
    }

    console.log('🎯 [DragDropManager] Iniciando movimentação:', {
      leadId,
      fromStage: activeLead.stage_id,
      toStage: stageId,
      leadName: activeLead.custom_data?.nome_lead || 'Lead'
    });

    try {
      // Fazer a atualização no servidor
      await onLeadMove(leadId, stageId);
      
      console.log('✅ [DragDropManager] Lead movido com sucesso para etapa:', stageId);
      
      // Fazer refresh dos leads para garantir sincronização
      await onRefreshLeads();
      
    } catch (error) {
      console.error('❌ [DragDropManager] Erro ao mover lead:', error);
      
      // Em caso de erro, garantir refresh para voltar ao estado correto
      await onRefreshLeads();
      
      // Mostrar erro para o usuário
      alert('Erro ao mover lead. Tente novamente.');
    }
  }, [viewingPipeline, leads, onLeadMove, onRefreshLeads]);

  return {
    isDragging: dragDropState.isDragging,
    activeId: dragDropState.activeId,
    draggedLead: dragDropState.draggedLead,
    handleDragStart,
    handleDragEnd,
    dragDropState
  };
};

// Componente wrapper opcional para usar o hook
export interface DragDropManagerComponentProps extends DragDropManagerProps {
  children: (dragDropManager: DragDropManagerReturn) => React.ReactNode;
}

export const DragDropManager: React.FC<DragDropManagerComponentProps> = ({ 
  children, 
  ...props 
}) => {
  const dragDropManager = useDragDropManager(props);
  return <>{children(dragDropManager)}</>;
};

export default useDragDropManager; 
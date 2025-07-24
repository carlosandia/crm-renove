import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Lead } from '../../types/Pipeline';
import LeadCardPresentation from './LeadCardPresentation';

interface DraggableLeadCardSimpleProps {
  lead: Lead;
  canDrag?: boolean;
  onViewDetails?: (lead: Lead) => void;
}

const DraggableLeadCardSimple: React.FC<DraggableLeadCardSimpleProps> = ({
  lead,
  canDrag = true,
  onViewDetails
}) => {
  
  // ✅ IMPLEMENTAÇÃO CORRETA: Usando hooks do dnd-kit com setActivatorNodeRef
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef, // ✅ CORREÇÃO: Adicionar activator ref conforme documentação
    transform,
    isDragging,
  } = useDraggable({
    id: lead.id,
    disabled: !canDrag,
    data: {
      type: 'lead',
      leadId: lead.id,
      currentStageId: lead.stage_id,
      lead: lead
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1, // ✅ OCULTAR completamente durante drag
    cursor: isDragging ? 'grabbing' : 'grab',
    maxWidth: '100%', // ✅ CORREÇÃO: Nunca exceder largura da stage
    width: '100%',
    boxSizing: 'border-box',
    position: 'relative' as const, // Evitar position fixed/absolute indevido
    touchAction: 'none', // ✅ CORREÇÃO: Permitir drag em mobile
  } as React.CSSProperties;

  // Função para prevenir propagação de eventos no botão
  const handleViewDetails = (lead: Lead) => {
    if (onViewDetails) {
      onViewDetails(lead);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="kanban-card"
      {...listeners} // ✅ CORREÇÃO: Aplicar listeners no card inteiro
      {...attributes}
    >
      <LeadCardPresentation 
        lead={lead}
        onViewDetails={handleViewDetails}
        showDragHandle={false} // ✅ CORREÇÃO: Desabilitar drag handle específico
        isDragging={isDragging}
        dragListeners={null} // ✅ CORREÇÃO: Não passar listeners para o handle
        dragAttributes={null}
        setActivatorNodeRef={null} // ✅ CORREÇÃO: Não usar activator ref específico
      />
    </div>
  );
};

export default DraggableLeadCardSimple;
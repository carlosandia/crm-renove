import React from 'react';
// ❌ REMOVIDO @dnd-kit
// import { /* useDraggable */ } from '@dnd-kit/core';
// ❌ REMOVIDO @dnd-kit
// import { CSS } from '@dnd-kit/utilities';
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
  
  // ❌ REMOVIDO @dnd-kit - BACKUP: Ver BACKUP_DND_KIT_LOGIC.md
  // const {
  //   attributes,
  //   listeners,
  //   setNodeRef,
  //   setActivatorNodeRef, // ✅ CORREÇÃO: Adicionar activator ref conforme documentação
  //   transform,
  //   isDragging,
  // } = /* useDraggable */({
  //   id: lead.id,
  //   disabled: !canDrag,
  //   data: {
  //     type: 'lead',
  //     leadId: lead.id,
  //     currentStageId: lead.stage_id,
  //     lead: lead
  //   }
  // });

  // ❌ REMOVIDO @dnd-kit - BACKUP: Ver BACKUP_DND_KIT_LOGIC.md
  // const style = {
  //   transform: CSS.Translate.toString(transform),
  //   opacity: isDragging ? 0 : 1, // ✅ OCULTAR completamente durante drag
  //   cursor: isDragging ? 'grabbing' : 'grab',
  //   maxWidth: '100%', // ✅ CORREÇÃO: Nunca exceder largura da stage
  //   width: '100%',
  //   boxSizing: 'border-box',
  //   position: 'relative' as const, // Evitar position fixed/absolute indevido
  //   touchAction: 'none', // ✅ CORREÇÃO: Permitir drag em mobile
  // } as React.CSSProperties;

  // Função para prevenir propagação de eventos no botão
  const handleViewDetails = (lead: Lead) => {
    if (onViewDetails) {
      onViewDetails(lead);
    }
  };

  return (
    <div>
      {/* ❌ DRAG AND DROP TEMPORARIAMENTE DESABILITADO */}
      <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-2 mb-2 text-center">
        <span className="text-sm text-yellow-800">Drag and Drop temporariamente desabilitado</span>
      </div>
      
      <LeadCardPresentation 
        lead={lead}
        pipelineId={lead.pipeline_id}
        onViewDetails={handleViewDetails}
      />
    </div>
  );
};

export default DraggableLeadCardSimple;
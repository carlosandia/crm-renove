import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import type { 
  DraggableProvided, 
  DraggableStateSnapshot 
} from '@hello-pangea/dnd';
import { Lead } from '../../types/Pipeline';
import LeadCardPresentation from './LeadCardPresentation';

interface DraggableLeadCardProps {
  lead: Lead;
  index: number;
  pipelineId: string;
  onViewDetails?: (lead: Lead) => void;
  onViewDetailsWithTab?: (lead: Lead, tab: string) => void;
}

/**
 * Wrapper para tornar LeadCardPresentation draggable usando @hello-pangea/dnd
 */
const DraggableLeadCard: React.FC<DraggableLeadCardProps> = ({
  lead,
  index,
  pipelineId,
  onViewDetails,
  onViewDetailsWithTab
}) => {
  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            // Manter estilo do card durante drag
            opacity: snapshot.isDragging ? 0.8 : 1,
            transform: snapshot.isDragging 
              ? `${provided.draggableProps.style?.transform} rotate(2deg)` 
              : provided.draggableProps.style?.transform
          }}
        >
          <LeadCardPresentation
            lead={lead}
            pipelineId={pipelineId}
            onViewDetails={onViewDetails}
            onViewDetailsWithTab={onViewDetailsWithTab}
          />
        </div>
      )}
    </Draggable>
  );
};

export default DraggableLeadCard;
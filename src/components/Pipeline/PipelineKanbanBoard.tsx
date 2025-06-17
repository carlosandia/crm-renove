
import React from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from '@dnd-kit/core';
import KanbanColumn from './KanbanColumn';
import LeadCard from './LeadCard';

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';
  field_options?: string[];
  is_required: boolean;
  field_order: number;
  placeholder?: string;
}

interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  temperature_score: number;
  max_days_allowed: number;
  color: string;
  is_system_stage?: boolean;
}

interface Lead {
  id: string;
  pipeline_id: string;
  stage_id: string;
  custom_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  status?: 'active' | 'won' | 'lost';
}

interface PipelineKanbanBoardProps {
  stages: PipelineStage[];
  leads: Lead[];
  customFields: CustomField[];
  activeLead: Lead | null;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onAddLead: (stageId?: string) => void;
}

const PipelineKanbanBoard: React.FC<PipelineKanbanBoardProps> = ({
  stages,
  leads,
  customFields,
  activeLead,
  onDragStart,
  onDragEnd,
  onAddLead
}) => {
  const getLeadsByStage = (stageId: string) => {
    return leads.filter(lead => lead.stage_id === stageId);
  };

  return (
    <div className="flex-1 overflow-hidden">
      {/* Container centralizado e organizado */}
      <div className="h-full flex flex-col">
        <DndContext
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          {/* Board com padding uniforme e centralização */}
          <div className="flex-1 px-8 py-6">
            <div className="h-full flex justify-center">
              <div className="flex gap-6 overflow-x-auto pb-4 max-w-full">
                {stages.map((stage) => (
                  <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    leads={getLeadsByStage(stage.id)}
                    customFields={customFields}
                    onAddLead={onAddLead}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <DragOverlay>
            {activeLead ? (
              <LeadCard 
                lead={activeLead} 
                customFields={customFields}
                isDragging
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

export default PipelineKanbanBoard;

import React, { memo, useRef, useCallback, useMemo } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import KanbanColumn from './KanbanColumn';

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
  onAddLead: (stageId?: string) => void;
  onUpdateLead?: (leadId: string, updatedData: any) => void;
  onEditLead?: (lead: Lead) => void;
  onDragEnd: (result: DropResult) => void;
  stageMetrics?: any;
}

const PipelineKanbanBoard: React.FC<PipelineKanbanBoardProps> = memo(({
  stages,
  leads,
  customFields,
  onAddLead,
  onUpdateLead,
  onEditLead,
  onDragEnd,
  stageMetrics
}) => {
  // Ref para evitar re-renders desnecessários
  const dragContextRef = useRef<HTMLDivElement>(null);
  
  // 🚀 MEMOIZAÇÃO OTIMIZADA - Agrupar leads por stage uma única vez
  const leadsByStage = useMemo(() => {
    const grouped: Record<string, Lead[]> = {};
    
    // Inicializar todos os stages com array vazio
    stages.forEach(stage => {
      grouped[stage.id] = [];
    });
    
    // Agrupar leads por stage
    leads.forEach(lead => {
      if (grouped[lead.stage_id]) {
        grouped[lead.stage_id].push(lead);
      }
    });
    
    return grouped;
  }, [leads, stages]);

  // 🚀 CALLBACK OTIMIZADO - Sem logs desnecessários
  const getLeadsByStage = useCallback((stageId: string) => {
    return leadsByStage[stageId] || [];
  }, [leadsByStage]);

  // 🚀 CALLBACK OTIMIZADO - Handler mais direto
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    
    if (result.source.droppableId === result.destination.droppableId && 
        result.source.index === result.destination.index) {
      return;
    }

    onDragEnd(result);
  }, [onDragEnd]);

  // Verificar se há dados suficientes para renderizar
  if (stages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Carregando stages...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Container Kanban com altura flexível e scroll horizontal */}
        <div 
          ref={dragContextRef}
          className="flex-1 flex overflow-x-auto overflow-y-hidden p-6 gap-4 min-h-0"
        >
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={getLeadsByStage(stage.id)}
              customFields={customFields}
              onAddLead={onAddLead}
              onUpdateLead={onUpdateLead}
              onEditLead={onEditLead}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
});

PipelineKanbanBoard.displayName = 'PipelineKanbanBoard';

export default PipelineKanbanBoard; 
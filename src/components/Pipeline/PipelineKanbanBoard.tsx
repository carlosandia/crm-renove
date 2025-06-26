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
  // Additional fields for compatibility
  owner_id?: string;
  assigned_to?: string;
  created_by?: string;
}

interface Pipeline {
  id: string;
  name: string;
  pipeline_stages?: PipelineStage[];
  stages?: PipelineStage[];
  pipeline_custom_fields?: CustomField[];
  custom_fields?: CustomField[];
}

interface LeadFilters {
  owner_id?: string;
  team_id?: string;
  stage_id?: string;
  pipeline_id?: string;
  temperature?: 'cold' | 'warm' | 'hot';
  date_from?: string;
  date_to?: string;
  search?: string;
}

interface PipelineKanbanBoardProps {
  // Core props
  stages: PipelineStage[];
  leads: Lead[];
  customFields: CustomField[];
  onAddLead: (stageId?: string) => void;
  onDragEnd: (result: DropResult) => void;
  
  // Optional props for backward compatibility
  onUpdateLead?: (leadId: string, updatedData: any) => void;
  onEditLead?: (lead: Lead) => void;
  stageMetrics?: any;
  
  // New props for V2 components
  pipeline?: Pipeline;
  filters?: LeadFilters;
  onLeadUpdate?: (leadId: string, data: any) => Promise<void>;
  onLeadMove?: (leadId: string, stageId: string) => Promise<void>;
  onLeadCreate?: (data: any) => Promise<void>;
  canEdit?: boolean;
}

const PipelineKanbanBoard: React.FC<PipelineKanbanBoardProps> = memo(({
  stages,
  leads,
  customFields,
  onAddLead,
  onUpdateLead,
  onEditLead,
  onDragEnd,
  stageMetrics,
  // V2 props
  pipeline,
  filters,
  onLeadUpdate,
  onLeadMove,
  onLeadCreate,
  canEdit = true
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

    // Call onLeadMove if available (V2 components)
    if (onLeadMove && result.destination) {
      const leadId = result.draggableId;
      const newStageId = result.destination.droppableId;
      onLeadMove(leadId, newStageId);
    }

    // Call legacy onDragEnd
    onDragEnd(result);
  }, [onDragEnd, onLeadMove]);

  // ✅ HANDLER ATUALIZAR LEAD UNIFICADO
  const handleUpdateLead = useCallback((leadId: string, data: any) => {
    console.log('📝 PipelineKanbanBoard: Atualizando lead', { leadId: leadId.substring(0, 8) + '...', data });
    if (onLeadUpdate) {
      onLeadUpdate(leadId, data);
    } else if (onUpdateLead) {
      onUpdateLead(leadId, data);
    }
  }, [onLeadUpdate, onUpdateLead]);

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
              onUpdateLead={handleUpdateLead}
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
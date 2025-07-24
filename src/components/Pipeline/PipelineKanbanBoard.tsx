import React, { memo, useCallback, useMemo, useState, useDebugValue } from 'react';
import { logger, LogContext } from '../../utils/loggerOptimized';
import KanbanColumn from './KanbanColumn';
import { Pipeline, PipelineStage, Lead } from '../../types/Pipeline';

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
  
  // Optional props for backward compatibility
  onUpdateLead?: (leadId: string, updatedData: any) => void;
  onEditLead?: (lead: Lead) => void;
  onViewDetails?: (lead: Lead) => void;
  stageMetrics?: any;
  userRole?: 'admin' | 'member' | 'super_admin';
  
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
  onViewDetails,
  stageMetrics,
  userRole,
  // V2 props
  pipeline,
  filters,
  onLeadUpdate,
  onLeadMove,
  onLeadCreate,
  canEdit = true
}) => {
  
  // ✅ OTIMIZAÇÃO: Agrupar leads por stage sem logs verbosos
  const leadsByStage = useMemo(() => {
    const grouped: Record<string, Lead[]> = {};
    
    // Inicializar todos os stages com array vazio
    if (stages?.length > 0) {
      stages.forEach(stage => {
        grouped[stage.id] = [];
      });
    }
    
    // Agrupar leads por stage com validação otimizada
    if (leads?.length > 0) {
      leads.forEach(lead => {
        if (grouped[lead.stage_id]) {
          grouped[lead.stage_id].push(lead);
        }
      });
    }
    
    return grouped;
  }, [leads, stages]);

  // 🚀 CALLBACK OTIMIZADO - Sem logs desnecessários
  const getLeadsByStage = useCallback((stageId: string) => {
    return leadsByStage[stageId] || [];
  }, [leadsByStage]);

  // Debug value para monitoramento do componente
  const debugValue = useMemo(() => ({
    stagesCount: stages?.length || 0,
    totalLeads: leads?.length || 0,
    leadsDistribution: Object.entries(leadsByStage).map(([stageId, stageLeads]) => ({
      stageId: stageId.substring(0, 8),
      count: stageLeads.length
    }))
  }), [stages?.length, leads?.length, leadsByStage]);

  useDebugValue(debugValue, (state) => 
    `Kanban: ${state.stagesCount}S ${state.totalLeads}L`
  );


  // ✅ HANDLER ATUALIZAR LEAD UNIFICADO - Debounced para evitar spam
  const handleUpdateLead = useCallback((leadId: string, data: any) => {
    if (onLeadUpdate) {
      onLeadUpdate(leadId, data);
    } else if (onUpdateLead) {
      onUpdateLead(leadId, data);
    }
  }, [onLeadUpdate, onUpdateLead]);

  // ✅ CORREÇÃO: Não mostrar loading se parent já está controlando
  // Parent (UnifiedPipelineManager) já controla loading principal
  if (stages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Nenhuma etapa configurada</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#F1F1FA' }}>
      {/* Container Kanban com altura flexível e scroll horizontal */}
      <div 
        className="flex-1 flex overflow-x-auto overflow-y-hidden p-2 gap-2 min-h-0"
        style={{ backgroundColor: '#F1F1FA' }}
      >
        {stages && stages.length > 0 ? (
          stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={getLeadsByStage(stage.id)}
              customFields={customFields}
              userRole={userRole || 'member'}
              onAddLead={onAddLead}
              onUpdateLead={handleUpdateLead}
              onViewDetails={onViewDetails}
            />
          ))
        ) : (
          <div className="flex items-center justify-center w-full h-64">
            <p className="text-muted-foreground">Nenhuma etapa configurada para esta pipeline.</p>
          </div>
        )}
      </div>
    </div>
  );
});

PipelineKanbanBoard.displayName = 'PipelineKanbanBoard';

export default PipelineKanbanBoard; 
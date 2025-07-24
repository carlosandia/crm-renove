import React, { memo, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import DraggableLeadCard from './DraggableLeadCard';
import { CustomField, PipelineStage, Lead } from '../../types/Pipeline';

// Componente auxiliar para área droppable
interface DroppableAreaProps {
  droppableId: string;
  leads: Lead[];
  customFields: CustomField[];
  onUpdateLead?: (leadId: string, updatedData: any) => void;
  onEditLead?: (lead: Lead) => void;
}

const DroppableArea: React.FC<DroppableAreaProps> = ({ 
  droppableId, 
  leads, 
  customFields, 
  onUpdateLead, 
  onEditLead 
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: droppableId
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 min-h-0 ${
        isOver ? 'bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg' : ''
      }`}
    >
      {leads.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Nenhum lead nesta etapa</p>
        </div>
      ) : (
        leads.map((lead, index) => (
          <DraggableLeadCard
            key={lead.id}
            lead={lead}
            userRole="admin"
            canEdit={true}
            canDrag={true}
            onEdit={onEditLead}
            showVendorInfo={true}
            showTemperature={true}
            showActions={true}
          />
        ))
      )}
    </div>
  );
};

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  customFields: CustomField[];
  onAddLead: (stageId: string) => void;
  onUpdateLead?: (leadId: string, updatedData: any) => void;
  onEditLead?: (lead: Lead) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = memo(({
  stage,
  leads,
  customFields,
  onAddLead,
  onUpdateLead,
  onEditLead
}) => {
  // 🚀 MEMOIZAÇÃO OTIMIZADA - Calcular valor total apenas quando leads mudam
  const totalValue = useMemo(() => {
    return leads.reduce((sum, lead) => {
      const value = lead.custom_data?.valor || lead.custom_data?.valor_proposta || '0';
      const numericValue = parseFloat(value.toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      return sum + numericValue;
    }, 0);
  }, [leads]);

  // 🚀 FORMATAÇÃO MEMOIZADA
  const formattedValue = useMemo(() => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(totalValue);
  }, [totalValue]);

  // 🚀 DROPPABLE ID MEMOIZADO
  const droppableId = useMemo(() => stage.id, [stage.id]);

  return (
    <div className="flex-shrink-0 w-80 h-full flex flex-col bg-gray-50 rounded-lg border border-gray-200">
      {/* Header da coluna - fixo no topo */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white rounded-t-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{stage.name}</h3>
          <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
            {leads.length}
          </span>
        </div>
        
        {/* Valor total da coluna */}
        <div className="text-sm font-bold text-green-600">
          {formattedValue}
        </div>
      </div>
      
      {/* Área de conteúdo com scroll */}
      <DroppableArea
        droppableId={droppableId}
        leads={leads}
        customFields={customFields}
        onUpdateLead={onUpdateLead}
        onEditLead={onEditLead}
      />
    </div>
  );
});

KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn;

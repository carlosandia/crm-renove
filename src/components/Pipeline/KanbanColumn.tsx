import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import LeadCard from './LeadCard';

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  field_order: number;
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
}

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  customFields: CustomField[];
  onAddLead: (stageId: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  leads,
  customFields,
  onAddLead
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id
  });

  const totalValue = leads.reduce((sum, lead) => {
    const value = parseFloat(lead.custom_data?.valor_proposta || '0');
    return sum + (isNaN(value) ? 0 : value);
  }, 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-64 bg-gray-50 border border-gray-200 rounded-lg transition-all duration-300 ${
        isOver ? 'border-green-300 bg-green-50 shadow-lg' : ''
      }`}
      style={{ minHeight: '500px' }}
    >
      {/* Header da Coluna */}
      <div className="p-3 bg-white border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900 text-sm">{stage.name}</h3>
          <div className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {leads.length}
          </div>
        </div>

        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            R$ {totalValue.toLocaleString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Conteúdo da Coluna */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              customFields={customFields}
            />
          ))}
        </SortableContext>
      </div>

      {/* Botão Adicionar Lead */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => onAddLead(stage.id)}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 hover:border-green-300"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Lead</span>
        </button>
      </div>
    </div>
  );
};

export default KanbanColumn;

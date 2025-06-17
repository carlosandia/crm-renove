
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
      className={`flex flex-col w-80 bg-white border border-gray-200 rounded-xl shadow-sm transition-all duration-300 ${
        isOver ? 'border-green-300 bg-green-50 shadow-lg transform scale-105' : 'hover:shadow-md'
      }`}
      style={{ minHeight: '600px' }}
    >
      {/* Header da Coluna - melhor organização */}
      <div className="px-4 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 rounded-t-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 text-base flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: stage.color }}
            ></div>
            {stage.name}
          </h3>
          <div className="text-xs font-semibold text-white bg-gray-500 px-2.5 py-1 rounded-full min-w-[24px] text-center">
            {leads.length}
          </div>
        </div>

        {/* Valor total centralizado */}
        <div className="text-center py-2 px-3 bg-white rounded-lg border border-gray-100">
          <div className="text-xs text-gray-500 font-medium mb-1">Total</div>
          <div className="text-lg font-bold text-gray-900">
            {totalValue.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo da Coluna - melhor espaçamento */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm font-medium">Nenhum lead</p>
            </div>
          ) : (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                customFields={customFields}
              />
            ))
          )}
        </SortableContext>
      </div>

      {/* Botão Adicionar Lead - melhor estilo */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
        <button
          onClick={() => onAddLead(stage.id)}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 text-green-700 bg-green-50 border-2 border-green-200 hover:bg-green-100 hover:border-green-300 hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Lead</span>
        </button>
      </div>
    </div>
  );
};

export default KanbanColumn;

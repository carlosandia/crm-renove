
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

  // Função para obter cor da etapa baseada no nome
  const getStageBackgroundColor = () => {
    const stageName = stage.name.toLowerCase();
    if (stageName.includes('ganho') || stageName.includes('fechado') || stageName.includes('won')) {
      return 'from-green-50 to-green-100 border-green-200';
    }
    if (stageName.includes('perdido') || stageName.includes('lost')) {
      return 'from-red-50 to-red-100 border-red-200';
    }
    return 'from-gray-50 to-gray-100 border-gray-200';
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-80 bg-gradient-to-b ${getStageBackgroundColor()} border border-opacity-50 rounded-xl shadow-sm transition-all duration-300 ${
        isOver ? 'border-blue-300 bg-blue-50 shadow-lg transform scale-105' : 'hover:shadow-md'
      }`}
      style={{ minHeight: '600px' }}
    >
      {/* Header da Coluna */}
      <div className={`px-4 py-4 bg-gradient-to-r ${getStageBackgroundColor()} border-b border-gray-200 rounded-t-xl`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 text-base flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: stage.color }}
            ></div>
            {stage.name}
          </h3>
          <div className="text-xs font-semibold text-white bg-gray-600 px-2.5 py-1 rounded-full min-w-[24px] text-center">
            {leads.length}
          </div>
        </div>

        {/* Valor total */}
        <div className="text-center py-2 px-3 bg-white/70 backdrop-blur-sm rounded-lg border border-white/50">
          <div className="text-xs text-gray-600 font-medium mb-1">Total</div>
          <div className="text-lg font-bold text-gray-900">
            {totalValue.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo da Coluna */}
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

      {/* Botão Adicionar Lead */}
      <div className="p-4 border-t border-gray-200 bg-white/50 backdrop-blur-sm rounded-b-xl">
        <button
          onClick={() => onAddLead(stage.id)}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 text-blue-700 bg-blue-50 border-2 border-blue-200 hover:bg-blue-100 hover:border-blue-300 hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Lead</span>
        </button>
      </div>
    </div>
  );
};

export default KanbanColumn;


import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
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

  const getStageIcon = () => {
    if (stage.name.toLowerCase().includes('novo')) return '🆕';
    if (stage.name.toLowerCase().includes('qualificad')) return '✅';
    if (stage.name.toLowerCase().includes('proposta')) return '📋';
    if (stage.name.toLowerCase().includes('negoci')) return '🤝';
    if (stage.name.toLowerCase().includes('ganho')) return '🏆';
    return '📋';
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-80 bg-white rounded-xl border-2 transition-all duration-200 ${
        isOver ? 'border-green-300 bg-green-50' : 'border-gray-200'
      }`}
      style={{ minHeight: '600px' }}
    >
      {/* Header da Coluna */}
      <div className="p-4 border-b border-gray-200">
        <div
          className="h-1 w-full rounded-full mb-3"
          style={{ backgroundColor: stage.color }}
        />
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getStageIcon()}</span>
            <h3 className="font-semibold text-gray-900">{stage.name}</h3>
          </div>
          <div className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {leads.length}
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1">
            <span>🌡️</span>
            <span className="text-gray-600">{stage.temperature_score}%</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>⏰</span>
            <span className="text-gray-600">{stage.max_days_allowed} dias</span>
          </div>
        </div>

        {/* Valor total da etapa */}
        <div className="mt-3 p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500">Valor total</div>
          <div className="text-lg font-bold text-gray-900">
            R$ {leads.reduce((sum, lead) => {
              const value = parseFloat(lead.custom_data?.valor_proposta || '0');
              return sum + (isNaN(value) ? 0 : value);
            }, 0).toLocaleString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Conteúdo da Coluna */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              customFields={customFields}
            />
          ))}
        </SortableContext>
        
        {leads.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm">Nenhum lead nesta etapa</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;

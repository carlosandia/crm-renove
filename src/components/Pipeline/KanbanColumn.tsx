import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Clipboard } from 'lucide-react';
import LeadCard from './LeadCard';
import { CustomField, PipelineStage, Lead } from '../../types/Pipeline';

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  customFields: CustomField[];
  onAddLead: (stageId: string) => void;
  onUpdateLead?: (leadId: string, updatedData: any) => void;
  onEditLead?: (lead: Lead) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  leads,
  customFields,
  onAddLead,
  onUpdateLead,
  onEditLead
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id
  });

  const totalValue = leads.reduce((sum, lead) => {
    const value = lead.custom_data?.valor || lead.custom_data?.valor_proposta || '0';
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) : value;
    return sum + (isNaN(numValue) ? 0 : numValue);
  }, 0);

  // Função para formatar valor monetário
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para obter cor da etapa baseada no nome
  const getStageBackgroundColor = () => {
    const stageName = stage.name.toLowerCase();
    if (stageName.includes('ganho') || stageName.includes('fechado') || stageName.includes('won')) {
      return 'border-green-200';
    }
    if (stageName.includes('perdido') || stageName.includes('lost')) {
      return 'border-red-200';
    }
    return 'border-gray-200';
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-80 border border-opacity-50 rounded-xl transition-all duration-300 ${getStageBackgroundColor()} ${
        isOver ? 'border-blue-300 bg-blue-50 shadow-lg transform scale-105' : 'hover:shadow-md'
      }`}
      style={{ minHeight: '600px' }}
    >
      {/* Header da Coluna */}
      <div className={`px-4 py-4 border-b border-gray-200 rounded-t-xl`}>
        <div className="flex items-center justify-between mb-2">
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

        {/* Valor total - logo abaixo do título */}
        <div className="text-sm font-bold text-green-600">
          {formatCurrency(totalValue)}
        </div>
      </div>

      {/* Conteúdo da Coluna */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto bg-white">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Clipboard className="w-8 h-8 mb-2" />
              <p className="text-sm font-medium">Nenhum Lead</p>
            </div>
          ) : (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                customFields={customFields}
                onEdit={onEditLead}
                onUpdate={onUpdateLead}
              />
            ))
          )}
        </SortableContext>
      </div>

      {/* Botão Criar Oportunidade - apenas na primeira etapa */}
      {stage.order_index === 0 && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => onAddLead(stage.id)}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 text-blue-700 bg-blue-50 border-2 border-blue-200 hover:bg-blue-100 hover:border-blue-300 hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Oportunidade</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default KanbanColumn;

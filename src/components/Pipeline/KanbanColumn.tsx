
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

  const totalValue = leads.reduce((sum, lead) => {
    const value = parseFloat(lead.custom_data?.valor_proposta || '0');
    return sum + (isNaN(value) ? 0 : value);
  }, 0);

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column ${isOver ? 'drag-over' : ''}`}
    >
      {/* Header da Coluna */}
      <div className="column-header">
        <div
          className="stage-indicator"
          style={{ backgroundColor: stage.color }}
        />
        
        <div className="stage-title">
          <div className="stage-name">
            <span>{getStageIcon()}</span>
            <span>{stage.name}</span>
          </div>
          <div className="stage-count">
            {leads.length}
          </div>
        </div>

        <div className="stage-stats">
          <div className="stage-stat">
            <span>🌡️</span>
            <span>{stage.temperature_score}%</span>
          </div>
          <div className="stage-stat">
            <span>⏰</span>
            <span>{stage.max_days_allowed}d</span>
          </div>
        </div>

        <div className="stage-value">
          <div className="stage-value-label">Valor total</div>
          <div className="stage-value-amount">
            R$ {totalValue.toLocaleString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Conteúdo da Coluna */}
      <div className="column-content">
        <div className="leads-container">
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
        
        {leads.length === 0 && (
          <div className="empty-column">
            <div className="empty-column-icon">📭</div>
            <p className="empty-column-text">Nenhum lead</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
